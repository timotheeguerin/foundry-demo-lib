import assert from "node:assert/strict";
import { test } from "node:test";
import { $linter } from "@timotheeguerin/foundry-core";
import {
  assertDiagnostics,
  assertInvalidOptions,
  casingRule,
  compileCode,
  recommended,
} from "./helpers/lint.mjs";

const options = {
  model: "PascalCase",
  modelProperty: "snake_case",
  operation: "camelCase",
  operationTemplate: "PascalCase",
  interface: "PascalCase",
  namespace: "PascalCase",
  union: "PascalCase",
  unionVariant: "snake_case",
  enum: "PascalCase",
  enumMember: "snake_case",
  scalar: "PascalCase",
};

test("recommended extends both Azure policies and configures the original casing rule", () => {
  const preset = $linter.ruleSets.recommended;
  assert.deepEqual(preset.extends, [
    "@azure-tools/typespec-azure-rulesets/data-plane",
    "@azure-tools/typespec-azure-rulesets/client-sdk",
  ]);
  assert.deepEqual(preset.enable[casingRule], options);
  assert.equal(preset.enable["@timotheeguerin/foundry-core/use-standard-operations"], true);
  assert.deepEqual(Object.keys(preset.disable), [
    "@azure-tools/typespec-azure-core/use-standard-operations",
  ]);
});

test("the default Azure casing rule still rejects snake_case", async () => {
  const result = await compileCode("model Job { display_name: string; }", {
    enable: { [casingRule]: true },
  });
  assertDiagnostics(result, [{ code: casingRule, target: "display_name" }]);
});

test("Foundry accepts snake_case with the complete recommended preset", async () => {
  assertDiagnostics(
    await compileCode(
      '/** A job. */ model Job { /** Display name. */ display_name: string; }',
      recommended,
    ),
  );
});

test("Foundry rejects camelCase properties using the ORIGINAL Azure diagnostic ID", async () => {
  assertDiagnostics(
    await compileCode(
      '/** A job. */ model Job { /** Display name. */ displayName: string; }',
      recommended,
    ),
    [{ code: casingRule, target: "displayName" }],
  );
});

test("imported library parameter names need no consumer casing suppressions", async () => {
  const result = await compileCode(`
    import "@timotheeguerin/foundry-core";
    model Job { display_name: string; }
    op cancelJob is Foundry.Core.StandardOperations.CancelJob<
      Job,
      Azure.Core.Foundations.ErrorResponse
    >;
  `, { enable: { [casingRule]: options } });
  assertDiagnostics(result);
  const operation = result.program.getGlobalNamespaceType().operations.get("cancelJob");
  assert.ok(operation);
  assert.ok(operation.parameters.properties.has("apiVersion"));
  assert.ok(operation.parameters.properties.has("jobId"));
});

test("one compilation's casing options do not change a subsequent default compilation", async () => {
  const source = "model Job { display_name: string; }";
  assertDiagnostics(await compileCode(source, { enable: { [casingRule]: options } }));
  assertDiagnostics(await compileCode(source, { enable: { [casingRule]: true } }), [
    { code: casingRule, target: "display_name" },
  ]);
});

const cases = [
  ["model", "model GoodModel {}", "model bad_model {}", "bad_model"],
  ["modelProperty", "model Job { good_name: string; }", "model Job { badName: string; }", "badName"],
  ["operation parameter", "op runJob(good_name: string): void;", "op runJob(badName: string): void;", "badName"],
  ["operation", "op runJob(): void;", "op RunJob(): void;", "RunJob"],
  [
    "operationTemplate",
    "op RunJob<T>(item: T): T; op run is RunJob<string>;",
    "op runJob<T>(item: T): T; op run is runJob<string>;",
    "runJob",
  ],
  ["interface", "interface GoodJobs {}", "interface bad_jobs {}", "bad_jobs"],
  ["namespace", "namespace GoodNamespace {}", "namespace bad_namespace {}", "bad_namespace"],
  ["union", "union GoodChoice { string }", "union bad_choice { string }", "bad_choice"],
  ["unionVariant", 'union Choice { good_choice: "good", string }', 'union Choice { badChoice: "bad", string }', "badChoice"],
  ["enum", 'enum GoodChoice { good_choice: "good" }', 'enum bad_choice { good_choice: "good" }', "bad_choice"],
  ["enumMember", 'enum Choice { good_choice: "good" }', 'enum Choice { badChoice: "bad" }', "badChoice"],
  ["scalar", "scalar GoodValue extends string;", "scalar bad_value extends string;", "bad_value"],
];

for (const [kind, good, bad, target] of cases) {
  test(`configured Azure casing accepts and rejects ${kind} independently`, async () => {
    const rules = { enable: { [casingRule]: options } };
    assertDiagnostics(await compileCode(good, rules));
    assertDiagnostics(await compileCode(bad, rules), [
      { code: casingRule, target, marker: kind === "operationTemplate" ? `op ${target}<` : target },
    ]);
  });
}

test("snake_case enum members do not disable the independent data-plane no-enum policy", async () => {
  const result = await compileCode(
    '/** Job state. */ enum JobState { /** Running. */ in_progress: "running" }',
    recommended,
  );
  assertDiagnostics(result, [
    { code: "@azure-tools/typespec-azure-core/no-enum", target: "JobState" },
  ]);
});

test("recommended keeps the data-plane documentation policy active", async () => {
  assertDiagnostics(await compileCode("model Job {}", recommended), [
    { code: "@azure-tools/typespec-azure-core/documentation-required", target: "Job" },
  ]);
});

test("recommended keeps the client-sdk C# model suffix policy active", async () => {
  assertDiagnostics(await compileCode("/** Job input. */ model JobRequest {}", recommended), [
    { code: "@azure-tools/typespec-client-generator-core/csharp-model-suffix", target: "JobRequest" },
  ]);
});

for (const [name, value, detail] of [
  ["unknown option", { modelProperties: "snake_case" }, /additional|modelProperties/i],
  ["unknown casing", { modelProperty: "kebab-case" }, /allowed|enum|kebab-case/i],
  ["numeric casing", { operation: 42 }, /allowed values|allowedValues/i],
]) {
  test(`Azure casing rejects ${name} through real compiler options`, async () => {
    assertInvalidOptions(
      await compileCode("", { enable: { [casingRule]: value } }),
      casingRule,
      detail,
    );
  });
}
