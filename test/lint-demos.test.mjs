import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  assertApiVersionQuery,
  assertDiagnostics,
  casingRule,
  compileCode,
  compileDemo,
  foundryRule,
  recommended,
  root,
} from "./helpers/lint.mjs";

function assertDemoApiVersion(result, operationName) {
  const operation = result.program.getGlobalNamespaceType()
    .namespaces.get("FoundryJobs").interfaces.get("Jobs").operations.get(operationName);
  assertApiVersionQuery(result.program, operation);
}

test("good service compiles cleanly with the configured recommended preset", async () => {
  const result = await compileDemo("good");
  assertDemoApiVersion(result, "list");
  assertDiagnostics(result);
});

test("bad-casing has exactly the original Azure casing diagnostic at the consumer property", async () => {
  const result = await compileDemo("bad-casing");
  assertDemoApiVersion(result, "list");
  assertDiagnostics(result, [
    { code: casingRule, target: "displayName" },
  ]);
});

test("bad-operation has exactly the Foundry diagnostic at the consumer operation", async () => {
  const result = await compileDemo("bad-operation");
  assertDemoApiVersion(result, "get");
  assertDiagnostics(result, [
    { code: foundryRule, target: "get", marker: "get(" },
  ]);
});

test("recommended can narrow the Foundry rule without relaxing unrelated casing policy", async () => {
  const source = await readFile(resolve(root, "demos/lint/bad-operation/main.tsp"), "utf8");
  const rules = {
    ...recommended,
    enable: { [foundryRule]: { includeInterfaces: ["FoundryJobs.OtherJobs"] } },
  };
  assertDiagnostics(await compileCode(source, rules));
  assertDiagnostics(await compileCode(source.replace("display_name", "displayName"), rules), [
    { code: casingRule, target: "displayName" },
  ]);
});

test("demo runner exits zero for good and nonzero after printing both negative diagnostics", () => {
  const run = (...names) =>
    spawnSync(process.execPath, ["scripts/demo.mjs", ...names], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    });
  const good = run("good");
  assert.ifError(good.error);
  assert.equal(good.signal, null);
  assert.equal(good.status, 0, good.stdout + good.stderr);

  const bad = run("bad-casing", "bad-operation");
  assert.ifError(bad.error);
  assert.equal(bad.signal, null);
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  const output = bad.stdout + bad.stderr;
  assert.ok(output.includes(`error ${casingRule}`), output);
  assert.ok(output.includes(`error ${foundryRule}`), output);
  assert.ok(output.includes("=== bad-casing ==="), output);
  assert.ok(output.includes("=== bad-operation ==="), output);
  assert.equal((output.match(/Found 1 error\./g) ?? []).length, 2, output);
});
