import {
  compile,
  formatDiagnostic,
  getSourceLocation,
  NodeHost,
  resolveCompilerOptions,
} from "@typespec/compiler";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { root, verifyProvenance } from "./provenance.mjs";

export function serializeDiagnostics(diagnostics, projectRoot) {
  return diagnostics.map((diagnostic) => {
    const location = getSourceLocation(diagnostic.target);
    const position = location?.file.getLineAndCharacterOfPosition(location.pos);
    return {
      severity: diagnostic.severity,
      code: diagnostic.code,
      message: diagnostic.message.replaceAll(root, "<repo>/"),
      file: location ? relative(projectRoot, location.file.path).replaceAll("\\", "/") : null,
      line: position ? position.line + 1 : null,
      column: position ? position.character + 1 : null,
    };
  }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

export async function compileSpec(variant, { sdk, emit = !sdk, captureErrors = false } = {}) {
  if (!["baseline", "migrated"].includes(variant)) {
    throw new Error(`Unknown spec variant: ${variant}`);
  }
  const projectRoot = resolve(root, "specs", variant, "Foundry");
  const entrypoint = resolve(projectRoot, sdk ? `src/${sdk}/client.tsp` : "main.tsp");
  const outputDir = resolve(root, "output", variant);
  if (emit) await rm(resolve(outputDir, "openapi3"), { recursive: true, force: true });
  const [resolvedOptions, configDiagnostics] = await resolveCompilerOptions(NodeHost, {
    entrypoint,
    cwd: projectRoot,
  });
  if (configDiagnostics.length) {
    throw new Error(configDiagnostics.map((diagnostic) => formatDiagnostic(diagnostic)).join("\n"));
  }
  const program = await compile(NodeHost, entrypoint, {
    ...resolvedOptions,
    outputDir,
    noEmit: !emit,
    options: {
      ...resolvedOptions.options,
      "@typespec/openapi3": {
        ...resolvedOptions.options?.["@typespec/openapi3"],
        "emitter-output-dir": outputDir,
      },
    },
  });
  const diagnostics = serializeDiagnostics(program.diagnostics, projectRoot);
  const diagnosticFile = resolve(outputDir, "diagnostics", `${sdk ?? "main"}.json`);
  await mkdir(dirname(diagnosticFile), { recursive: true });
  await writeFile(diagnosticFile, `${JSON.stringify(diagnostics, null, 2)}\n`);
  const errors = program.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  if (errors.length && !captureErrors) {
    throw new Error(
      `${variant}/${sdk ?? "main"} failed with ${errors.length} errors:\n` +
      errors.slice(0, 20).map((diagnostic) => formatDiagnostic(diagnostic)).join("\n") +
      `\nFull diagnostics: ${diagnosticFile}`,
    );
  }
  console.log(`${variant}/${sdk ?? "main"}: ${errors.length ? `FAILED (${errors.length} errors), ` : ""}${diagnostics.length} diagnostics; ${relative(root, diagnosticFile)}`);
  return { program, diagnostics, hasErrors: errors.length > 0 };
}

export async function sdkEntrypoints() {
  const directory = resolve(root, "specs/baseline/Foundry/src");
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith("sdk-")) {
      const files = await readdir(resolve(directory, entry.name));
      if (files.includes("client.tsp")) result.push(entry.name);
    }
  }
  return result.sort();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyProvenance();
  const variant = process.argv[2];
  if (process.argv.includes("--sdk")) {
    for (const sdk of await sdkEntrypoints()) await compileSpec(variant, { sdk });
  } else {
    await compileSpec(variant);
  }
}
