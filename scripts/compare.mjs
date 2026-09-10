import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { compileSpec } from "./compile.mjs";
import { root, verifyProvenance } from "./provenance.mjs";

const expectedFiles = [
  "v1/microsoft-foundry-openapi3.json",
  "v1/microsoft-foundry-openapi3.yaml",
  "virtual-public-preview/microsoft-foundry-openapi3.json",
  "virtual-public-preview/microsoft-foundry-openapi3.yaml",
];

export async function compareOutputs() {
  const baselineDir = resolve(root, "output/baseline/openapi3");
  const migratedDir = resolve(root, "output/migrated/openapi3");
  for (const directory of [baselineDir, migratedDir]) {
    const entries = await readdir(directory, { recursive: true, withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile())
      .map((entry) => resolve(entry.parentPath, entry.name).slice(directory.length + 1).replaceAll("\\", "/"))
      .sort();
    assert.deepEqual(files, expectedFiles, `Unexpected emitted file set in ${directory}`);
  }
  for (const name of expectedFiles) {
    const readDocument = async (directory) => {
      const text = await readFile(resolve(directory, name), "utf8");
      return name.endsWith(".json") ? JSON.parse(text) : parse(text);
    };
    assert.deepEqual(
      await readDocument(migratedDir),
      await readDocument(baselineDir),
      `Wire contract changed in ${name}`,
    );
  }
  console.log("All four versioned OpenAPI documents match (including schemas, names, references, and metadata).");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyProvenance();
  await compileSpec("baseline");
  await compileSpec("migrated");
  await compareOutputs();
}
