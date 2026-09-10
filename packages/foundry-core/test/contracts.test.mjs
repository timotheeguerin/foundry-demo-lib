import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  compile,
  createSourceFile,
  formatDiagnostic,
  getEncode,
  NodeHost,
} from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";

const fixturePath = fileURLToPath(new URL("./contract-fixture.tsp", import.meta.url));

async function compileContract(errorResponse, preview = false) {
  const source = `
    import "../lib/main.tsp";
    using TypeSpec.Http;
    using Foundry.Core;

    @service namespace Contract;

    model Failure { message: string; }
    @error model ErrorResponse { error: Failure; }
    alias SelectedErrorResponse = ${errorResponse};

    union Features { jobs_preview: "Jobs=Preview" }
    alias Preview = WithConditionalFoundryPreviewHeader<Features.jobs_preview>;
    model Inputs { prompt: string; }
    model Result { answer: string; }
    model Job is JobLike<Failure, Result, Inputs> {
      @visibility(Lifecycle.Read) created_at: FoundryTimestamp;
    }
    model EmptyJob is JobLike<Failure>;
    model ServicePage is AgentsPagedResult<Job>;

    interface Jobs {
      @route("/jobs")
      @Azure.Core.pollingOperation(Jobs.get)
      create is StandardOperations.${preview ? "PostJobPreview<Preview," : "PostJob<"}
        Job, SelectedErrorResponse>;
      @route("/jobs/{jobId}")
      get is StandardOperations.${preview ? "QueryJobStatusPreview<Preview," : "QueryJobStatus<"}
        Job, SelectedErrorResponse>;
      @route("/jobs")
      list is StandardOperations.${preview ? "ListJobsPreview<Preview," : "ListJobs<"}
        Job, SelectedErrorResponse, { @query status?: JobStatus; }, ServicePage>;
      @route("/jobs/{jobId}:cancel")
      cancel is StandardOperations.${preview ? "CancelJobPreview<Preview," : "CancelJob<"}
        Job, SelectedErrorResponse>;
      @route("/jobs/{jobId}")
      delete is StandardOperations.${preview ? "DeleteJobPreview<Preview," : "DeleteJob<"}
        SelectedErrorResponse>;
    }

    @route("/required/{jobId}")
    op requiredPreview is StandardOperations.QueryJobStatusPreview<
      WithRequiredFoundryPreviewHeader<Features.jobs_preview>,
      Job,
      SelectedErrorResponse
    >;
  `;
  const host = {
    ...NodeHost,
    readFile: (path) =>
      path === fixturePath
        ? Promise.resolve(createSourceFile(source, path))
        : NodeHost.readFile(path),
    stat: (path) =>
      path === fixturePath
        ? Promise.resolve({ isFile: () => true, isDirectory: () => false })
        : NodeHost.stat(path),
  };
  const program = await compile(host, fixturePath, { noEmit: true });
  assert.deepEqual(
    program.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)),
    [],
  );
  const [services, diagnostics] = getAllHttpServices(program);
  assert.deepEqual(diagnostics, []);
  const service = services.find((service) => service.namespace.name === "Contract");
  assert.ok(service);
  return {
    program,
    namespace: service.namespace,
    operations: Object.fromEntries(
      service.operations.map((operation) => [operation.operation.name, operation]),
    ),
  };
}

function parameter(operation, name) {
  const result = operation.parameters.parameters.find((parameter) => parameter.name === name);
  assert.ok(result, `${operation.operation.name} must declare ${name}`);
  return result;
}

function response(operation, status) {
  const result = operation.responses.find((response) => response.statusCodes === status);
  assert.ok(result, `${operation.operation.name} must return ${status}`);
  return result.responses[0];
}

function assertApiVersionQuery(operations) {
  for (const operation of Object.values(operations)) {
    const apiVersion = parameter(operation, "api-version");
    assert.equal(apiVersion.type, "query");
    assert.equal(apiVersion.param.name, "apiVersion");
    assert.equal(apiVersion.param.type.name, "string");
    assert.equal(apiVersion.param.optional, false);
    assert.equal(
      operation.parameters.parameters.some(
        (parameter) =>
          parameter.type === "header" && parameter.name.toLowerCase() === "api-version",
      ),
      false,
    );
  }
}

test("stable job templates retain lifecycle headers, cursors, and service-owned model shapes", async () => {
  const { program, namespace, operations } = await compileContract("ErrorResponse");
  assertApiVersionQuery(operations);
  const { create, get, list, cancel, delete: remove } = operations;
  assert.deepEqual(
    [create, get, list, cancel, remove].map((operation) => operation.verb),
    ["post", "get", "get", "post", "delete"],
  );
  assert.equal(create.parameters.body.property.name, "body");
  assert.equal(parameter(create, "Operation-Id").param.optional, true);
  assert.equal(parameter(create, "api-version").param.optional, false);
  assert.equal(parameter(get, "jobId").param.optional, false);
  assert.deepEqual(Object.keys(response(create, 201).headers), ["Operation-Location", "Location"]);
  assert.equal(response(get, 200).headers["Retry-After"].optional, true);
  assert.equal(response(remove, 204).body, undefined);
  assert.equal(response(cancel, 200).body.type.properties.get("error").type.name, "Failure");
  assert.equal(parameter(list, "limit").param.defaultValue.value.asNumber(), 20);
  assert.deepEqual(
    list.parameters.parameters.map((parameter) => parameter.name),
    ["limit", "order", "after", "before", "status", "api-version"],
  );
  assert.equal(response(list, 200).body.type.name, "ServicePage");
  assert.deepEqual(
    [...response(list, 200).body.type.properties.keys()],
    ["data", "first_id", "last_id", "has_more"],
  );
  const job = namespace.models.get("Job");
  assert.equal(job.properties.get("error").type, namespace.models.get("Failure"));
  assert.equal(job.properties.get("result").type, namespace.models.get("Result"));
  assert.equal(job.properties.get("inputs").type, namespace.models.get("Inputs"));
  assert.equal(getEncode(program, job.properties.get("created_at").type).encoding, "unixTimestamp");
  const emptyJob = namespace.models.get("EmptyJob");
  assert.equal(emptyJob.properties.get("result").type.name, "never");
  assert.equal(emptyJob.properties.get("inputs").type.name, "never");
  assert.equal(program.getGlobalNamespaceType().namespaces.get("Azure").namespaces.has("AI"), false);
});

test("preview templates accept service feature unions and preserve optional versus required headers", async () => {
  const { operations } = await compileContract("ErrorResponse", true);
  assertApiVersionQuery(operations);
  for (const name of ["create", "get", "list", "cancel", "delete"]) {
    const preview = parameter(operations[name], "Foundry-Features");
    assert.equal(preview.param.optional, true);
    assert.equal(preview.param.type.kind, "UnionVariant");
    assert.equal(preview.param.type.type.value, "Jobs=Preview");
  }
  assert.equal(operations.create.parameters.body.property.name, "job");
  assert.equal(parameter(operations.requiredPreview, "Foundry-Features").param.optional, false);
});

test("templates use the selected error response without converting SDK defaults to REST ranges", async () => {
  const defaultContract = await compileContract("ErrorResponse");
  const rangeContract = await compileContract(`{
    ...ErrorResponse;
    @minValue(400) @maxValue(499) @statusCode status_code: int32;
  } | {
    ...ErrorResponse;
    @minValue(500) @maxValue(599) @statusCode status_code: int32;
  }`);
  for (const name of ["create", "get", "list", "cancel", "delete"]) {
    assert.deepEqual(
      defaultContract.operations[name].responses.slice(1).map((response) => response.statusCodes),
      ["*"],
    );
    assert.deepEqual(
      rangeContract.operations[name].responses.slice(1).map((response) => response.statusCodes),
      [{ start: 400, end: 499 }, { start: 500, end: 599 }],
    );
  }
});
