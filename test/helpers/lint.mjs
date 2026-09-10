import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compile,
  createSourceFile,
  getSourceLocation,
  NodeHost,
  resolveCompilerOptions,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const foundryRule = "@timotheeguerin/foundry-core/use-standard-operations";
export const casingRule = "@azure-tools/typespec-azure-core/casing-style";
export const recommended = { extends: ["@timotheeguerin/foundry-core/recommended"] };

// Only the consumer source is virtual; package resolution, library metadata,
// compiler option validation, and linter execution use the real installed packages.
export async function compileCode(source, linterRuleSet, filename = "consumer.tsp") {
  const path = resolve(root, "test", filename);
  const host = {
    ...NodeHost,
    readFile: async (requested) =>
      requested === path ? createSourceFile(source, path) : NodeHost.readFile(requested),
    stat: async (requested) =>
      requested === path
        ? { isFile: () => true, isDirectory: () => false }
        : NodeHost.stat(requested),
  };
  const program = await compile(host, path, { noEmit: true, linterRuleSet });
  return { program, source, path };
}

export async function compileDemo(name) {
  const path = resolve(root, "demos/lint", name, "main.tsp");
  const [options, diagnostics] = await resolveCompilerOptions(NodeHost, {
    entrypoint: path,
    cwd: root,
  });
  assert.deepEqual(diagnostics, [], "The demo configuration must be valid.");
  const program = await compile(NodeHost, path, { ...options, noEmit: true });
  return { program, source: await readFile(path, "utf8"), path };
}

export function assertDiagnostics(result, expected = []) {
  const actual = result.program.diagnostics.map((diagnostic) => {
    const location = getSourceLocation(diagnostic.target, { locateId: true });
    const position = location?.file.getLineAndCharacterOfPosition(location.pos);
    return {
      code: diagnostic.code,
      severity: diagnostic.severity,
      file: location?.file.path,
      line: position && position.line + 1,
      column: position && position.character + 1,
      text: location?.file.text.slice(location.pos, location.end),
    };
  });
  const wanted = expected.map(({ code, target, marker = target, severity = "warning" }) => {
    const start = result.source.indexOf(marker);
    assert.notEqual(start, -1, `Missing diagnostic marker ${JSON.stringify(marker)}`);
    assert.equal(result.source.indexOf(marker, start + 1), -1, `Ambiguous marker ${marker}`);
    assert.ok(marker.includes(target), `Marker must contain target ${target}`);
    const offset = start + marker.indexOf(target);
    const before = result.source.slice(0, offset).split("\n");
    return {
      code,
      severity,
      file: result.path,
      line: before.length,
      column: before.at(-1).length + 1,
      text: target,
    };
  });
  const sort = (values) =>
    values.toSorted((a, b) => a.line - b.line || a.column - b.column || a.code.localeCompare(b.code));
  assert.deepEqual(
    sort(actual),
    sort(wanted),
    result.program.diagnostics.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`).join("\n"),
  );
}

export function assertInvalidOptions(result, rule, detail) {
  assert.deepEqual(
    result.program.diagnostics.map(({ code, severity }) => ({ code, severity })),
    [{ code: "invalid-rule-options", severity: "error" }],
    result.program.diagnostics.map(({ message }) => message).join("\n"),
  );
  const diagnostic = result.program.diagnostics[0];
  assert.ok(diagnostic.message.includes(rule), diagnostic.message);
  assert.match(diagnostic.message, detail);
  assert.equal(getSourceLocation(diagnostic.target), undefined);
}

export function assertApiVersionQuery(program, operation) {
  assert.ok(operation, "The consumer operation must exist.");
  const [httpOperation, diagnostics] = getHttpOperation(program, operation);
  assert.deepEqual(diagnostics, [], "The operation must have a valid HTTP contract.");
  const parameters = httpOperation.parameters.parameters.filter(
    (parameter) => parameter.name.toLowerCase() === "api-version",
  );
  assert.deepEqual(
    parameters.map(({ type, name, param }) => ({
      binding: type,
      name,
      identifier: param.name,
      optional: param.optional,
      valueType: param.type.name,
    })),
    [{
      binding: "query",
      name: "api-version",
      identifier: "apiVersion",
      optional: false,
      valueType: "string",
    }],
    "Preserve exactly one required api-version query parameter, never an API-version header.",
  );
  return httpOperation;
}
