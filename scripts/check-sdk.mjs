import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { compileSpec, sdkEntrypoints } from "./compile.mjs";
import { verifyProvenance } from "./provenance.mjs";

export const knownBrokenEntrypoint = "sdk-csharp-azure-ai-agent-contracts";
export const knownErrorCount = 4327;

function diagnosticSignatures(diagnostics) {
  return diagnostics.map(({ code, severity, message, file }) =>
    JSON.stringify({ code, severity, message, file })).sort();
}

export async function checkSdkEntrypoints() {
  await verifyProvenance();
  const entrypoints = await sdkEntrypoints();
  assert.equal(entrypoints.length, 7, "Expected all seven copied SDK entrypoints");
  for (const sdk of entrypoints) {
    const baseline = await compileSpec("baseline", { sdk, captureErrors: true });
    const migrated = await compileSpec("migrated", { sdk, captureErrors: true });
    if (sdk === knownBrokenEntrypoint) {
      assert.equal(
        baseline.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
        knownErrorCount,
        "The pinned internal contracts failure changed; investigate rather than accept a new baseline.",
      );
      assert.deepEqual(diagnosticSignatures(migrated.diagnostics), diagnosticSignatures(baseline.diagnostics),
        "Internal contracts diagnostics regressed");
      console.log(`KNOWN UPSTREAM FAILURE: ${sdk} retains ${knownErrorCount} errors from mixed OpenAI views; not repaired by this demo.`);
    } else {
      assert.equal(baseline.hasErrors, false, `Baseline SDK entrypoint failed: ${sdk}`);
      assert.equal(migrated.hasErrors, false, `Migrated SDK entrypoint failed: ${sdk}`);
      assert.deepEqual(diagnosticSignatures(migrated.diagnostics), diagnosticSignatures(baseline.diagnostics),
        `SDK diagnostics changed: ${sdk}`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkSdkEntrypoints();
}
