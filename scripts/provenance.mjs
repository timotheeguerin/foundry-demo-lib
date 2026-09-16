import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";
import { isDeepStrictEqual } from "node:util";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const sourcePath = "specification/ai-foundry/data-plane/Foundry";
export const sourceCommit = "73972b766e47d15a5342c90913a738bb7809ccee";
export const sourceOverrides = [
  {
    path: "src/common",
    commit: "cbf8f4d42b13bd8108374e438af21224b1daaa0c",
  },
];

export async function fileHashes(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name))
    .sort();
  return Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        relative(directory, file).replaceAll("\\", "/"),
        createHash("sha256").update(await readFile(file)).digest("hex"),
      ]),
    ),
  );
}

export async function verifyProvenance() {
  const expected = JSON.parse(await readFile(resolve(root, "upstream-source.json"), "utf8"));
  const actual = await fileHashes(resolve(root, "specs/baseline/Foundry"));
  if (!isDeepStrictEqual(actual, expected.files)) {
    const changed = [...new Set([...Object.keys(actual), ...Object.keys(expected.files)])]
      .filter((name) => actual[name] !== expected.files[name]);
    throw new Error(`Baseline differs from the pinned source: ${changed.join(", ")}`);
  }
  return Object.keys(actual).length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--record")) {
    const files = await fileHashes(resolve(root, "specs/baseline/Foundry"));
    await writeFile(
      resolve(root, "upstream-source.json"),
      `${JSON.stringify({
        repository: "https://github.com/Azure/azure-rest-api-specs",
        commit: sourceCommit,
        path: sourcePath,
        overrides: sourceOverrides,
        license: "MIT; Copyright (c) 2017 Microsoft",
        excluded: [{ path: "openapi3/", reason: "Generated output; regenerated for comparison." }],
        files,
      }, null, 2)}\n`,
    );
  }
  console.log(`Verified ${await verifyProvenance()} unchanged Foundry source files.`);
}
