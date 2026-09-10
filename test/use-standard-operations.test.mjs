import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertApiVersionQuery,
  assertDiagnostics,
  assertInvalidOptions,
  compileCode,
  foundryRule,
} from "./helpers/lint.mjs";

const imports = 'import "@timotheeguerin/foundry-core";';
const setup = `${imports}
namespace Demo;
model Job { id: string; }
alias ErrorResult = Azure.Core.Foundations.ErrorResponse;
alias Preview = Foundry.Core.WithRequiredFoundryPreviewHeader<"jobs-preview">;
`;
const standard = "Foundry.Core.StandardOperations";
const enabled = { enable: { [foundryRule]: true } };
const scoped = (...includeInterfaces) => ({
  enable: { [foundryRule]: { includeInterfaces } },
});

test("a bare library import does not automatically enable optional lint policy", async () => {
  assertDiagnostics(await compileCode(`${setup}op raw_operation(): string;`));
});

for (const [name, parameters] of [
  ["PostJob", "Job, ErrorResult"],
  ["QueryJobStatus", "Job, ErrorResult"],
  ["ListJobs", "Job, ErrorResult"],
  ["CancelJob", "Job, ErrorResult"],
  ["DeleteJob", "ErrorResult"],
  ["PostJobPreview", "Preview, Job, ErrorResult"],
  ["QueryJobStatusPreview", "Preview, Job, ErrorResult"],
  ["ListJobsPreview", "Preview, Job, ErrorResult"],
  ["CancelJobPreview", "Preview, Job, ErrorResult"],
  ["DeleteJobPreview", "Preview, ErrorResult"],
]) {
  test(`accepts actual exported ${name} ancestry`, async () => {
    const result = await compileCode(
      `${setup}op runJob is ${standard}.${name}<${parameters}>;`,
      enabled,
    );
    assertDiagnostics(result);
    const operation = result.program.getGlobalNamespaceType().namespaces.get("Demo").operations.get("runJob");
    const httpOperation = assertApiVersionQuery(result.program, operation);
    const headers = httpOperation.parameters.parameters
      .filter((parameter) => parameter.type === "header")
      .map((parameter) => parameter.name.toLowerCase());
    assert.equal(headers.includes("foundry-features"), name.endsWith("Preview"));
    assert.equal(headers.includes("operation-id"), name.startsWith("PostJob"));
  });
}

test("follows multiple generic intermediates and concrete aliases", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}
op ReadBase<T extends TypeSpec.Reflection.Model> is ${standard}.QueryJobStatus<T, ErrorResult>;
op ReadAgain<T extends TypeSpec.Reflection.Model> is ReadBase<T>;
op getJob is ReadAgain<Job>;
op getJobAlias is getJob;
interface Jobs { get is ReadAgain<Job>; }
`,
      enabled,
    ),
  );
});

test("accepts standard ancestry through generic interface inheritance", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}
interface Base<T extends TypeSpec.Reflection.Model> {
  get is ${standard}.QueryJobStatus<T, ErrorResult>;
}
interface Jobs extends Base<Job> {}
interface MoreJobs extends Jobs {}
`,
      enabled,
    ),
  );
});

test("default scope warns on every raw project operation, including top-level operations", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}
op loose(): string;
interface Jobs { raw(): Job; }
namespace Nested { interface Others { custom(): void; } }
`,
      enabled,
    ),
    [
      { code: foundryRule, target: "loose" },
      { code: foundryRule, target: "raw" },
      { code: foundryRule, target: "custom" },
    ],
  );
});

test("an empty options object retains the default all-project scope", async () => {
  assertDiagnostics(
    await compileCode(`${setup}op loose(): void;`, { enable: { [foundryRule]: {} } }),
    [{ code: foundryRule, target: "loose" }],
  );
});

test("direct Azure operations are not approved Foundry operations", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}op getJob is Azure.Core.Foundations.Operation<{}, Job>;`,
      enabled,
    ),
    [{ code: foundryRule, target: "getJob" }],
  );
});

test("custom Foundry foundation operations are not approved standard operations", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}op customJob is Foundry.Core.Foundations.Operation<{}, Job, ErrorResult>;`,
      enabled,
    ),
    [{ code: foundryRule, target: "customJob" }],
  );
});

test("template declarations and instances are skipped, but their bad concrete uses warn", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}
op Custom<T>(item: T): T;
op Another<T> is Custom<T>;
alias Instantiated = Another<Job>;
op concrete is Another<Job>;
`,
      enabled,
    ),
    [{ code: foundryRule, target: "concrete" }],
  );
});

test("generic interface declarations and instances are not concrete operations", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}
interface Custom<T> { read(item: T): T; }
alias Instance = Custom<Job>;
`,
      enabled,
    ),
  );
});

test("matching the full exported namespace and operation name does not impersonate the package", async () => {
  assertDiagnostics(
    await compileCode(
      `namespace Foundry.Core.StandardOperations {
  op PostJob<T>(item: T): T;
}
namespace Consumer {
  op impostor is Foundry.Core.StandardOperations.PostJob<string>;
}`,
      enabled,
    ),
    [{ code: foundryRule, target: "impostor" }],
  );
});

test("a nested same-name namespace cannot impersonate an imported standard operation", async () => {
  assertDiagnostics(
    await compileCode(
      `${imports}
namespace Consumer.Foundry.Core.StandardOperations {
  op QueryJobStatus<T>(): T;
}
namespace Consumer {
  op impostor is Foundry.Core.StandardOperations.QueryJobStatus<string>;
}`,
      enabled,
    ),
    [{ code: foundryRule, target: "impostor" }],
  );
});

test("adding a custom template to the real library namespace does not approve it", async () => {
  assertDiagnostics(
    await compileCode(
      `${imports}
namespace Foundry.Core.StandardOperations {
  op Custom<T>(): T;
}
namespace Consumer {
  op customJob is Foundry.Core.StandardOperations.Custom<string>;
}`,
      enabled,
    ),
    [{ code: foundryRule, target: "customJob" }],
  );
});

test("includeInterfaces uses exact fully qualified names and leaves other operations alone", async () => {
  assertDiagnostics(
    await compileCode(
      `${imports}
namespace Selected {
  op loose(): void;
  interface Jobs { selected(): void; }
  interface JobsExtra { excluded(): void; }
}
namespace Other { interface Jobs { excluded(): void; } }
interface GlobalJobs { globalSelected(): void; }
`,
      scoped("Selected.Jobs", "GlobalJobs"),
    ),
    [
      { code: foundryRule, target: "selected", marker: "selected()" },
      { code: foundryRule, target: "globalSelected" },
    ],
  );
});

test("includeInterfaces does not act as a suffix or namespace-prefix filter", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}
interface Jobs { raw(): void; }
namespace Nested { interface Jobs { other(): void; } }
`,
      scoped("Jobs", "Demo"),
    ),
  );
});

test("includeInterfaces accepts approved operations in selected interfaces", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}
interface Jobs { get is ${standard}.QueryJobStatus<Job, ErrorResult>; }
interface Others { ignored(): void; }
`,
      scoped("Demo.Jobs"),
    ),
  );
});

test("a bad generic inherited operation warns at the consuming interface", async () => {
  assertDiagnostics(
    await compileCode(
      `${imports}
namespace Shared { interface Base<T> { read(item: T): T; } }
namespace Consumer { interface Jobs extends Shared.Base<string> {} }
`,
      scoped("Consumer.Jobs"),
    ),
    [{ code: foundryRule, target: "Jobs" }],
  );
});

test("same-namespace bad interface inheritance warns at the selected consumer", async () => {
  assertDiagnostics(
    await compileCode(
      `${setup}
interface Base { raw(): void; }
interface Jobs extends Base {}
`,
      scoped("Demo.Jobs"),
    ),
    [{ code: foundryRule, target: "Jobs" }],
  );
});

for (const [name, value, detail] of [
  ["unknown key", { interfaces: ["Demo.Jobs"] }, /additional|interfaces/i],
  ["empty interface list", { includeInterfaces: [] }, /fewer|items|minItems/i],
  ["duplicate interface names", { includeInterfaces: ["Demo.Jobs", "Demo.Jobs"] }, /duplicate|unique/i],
  ["non-array interface list", { includeInterfaces: "Demo.Jobs" }, /array/i],
  ["null interface list", { includeInterfaces: null }, /array/i],
  ["non-string interface name", { includeInterfaces: [12] }, /string/i],
  ["empty interface name", { includeInterfaces: [""] }, /pattern/i],
  ["wildcard interface name", { includeInterfaces: ["Demo.*"] }, /pattern/i],
  ["malformed qualified name", { includeInterfaces: ["Demo..Jobs"] }, /pattern/i],
  ["whitespace in interface name", { includeInterfaces: ["Demo. Jobs"] }, /pattern/i],
]) {
  test(`rejects ${name} through real compiler options`, async () => {
    assertInvalidOptions(
      await compileCode("", { enable: { [foundryRule]: value } }),
      foundryRule,
      detail,
    );
  });
}
