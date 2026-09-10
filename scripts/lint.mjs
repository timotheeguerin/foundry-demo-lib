import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compileSpec } from "./compile.mjs";
import { root, verifyProvenance } from "./provenance.mjs";

await verifyProvenance();
const { diagnostics } = await compileSpec("migrated", { emit: false });
const expectedFile = resolve(root, "test/expected-legacy-diagnostics.json");
if (process.argv.includes("--record")) {
  assert(
    diagnostics.every((diagnostic) =>
      diagnostic.severity === "warning" &&
      diagnostic.code === "@azure-tools/typespec-azure-core/casing-style"),
    "Only reviewed legacy casing warnings may be recorded; other diagnostics must be fixed.",
  );
  await writeFile(expectedFile, `${JSON.stringify(diagnostics, null, 2)}\n`);
}
const expected = JSON.parse(await readFile(expectedFile, "utf8"));
assert.deepEqual(diagnostics, expected,
  "Legacy lint diagnostics changed. Inspect output/migrated/diagnostics/main.json; do not blindly update the baseline.");
console.log(`No new full-spec diagnostics. ${diagnostics.length} legacy casing warnings remain explicitly recorded in test/expected-legacy-diagnostics.json.`);
