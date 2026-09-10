import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { root } from "../scripts/provenance.mjs";

const metadata = JSON.parse(await readFile(resolve(root, "patches/upstream-source.json"), "utf8"));
const sha256 = (content) => createHash("sha256").update(content).digest("hex");

test("the installed casing bridge exactly matches the recorded upstream build", async () => {
  const packageRoot = fileURLToPath(new URL("../../", import.meta.resolve("@azure-tools/typespec-azure-core")));
  const packageJson = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
  assert.equal(packageJson.name, metadata.package);
  assert.equal(packageJson.version, metadata.patchedVersion);
  for (const [file, hash] of Object.entries(metadata.copiedFilesSha256)) {
    assert.equal(sha256(await readFile(resolve(packageRoot, file))), hash, `Bridge drifted: ${file}`);
  }
});

test("the accompanying upstream source diff retains its recorded provenance", async () => {
  const patch = await readFile(resolve(root, "patches", metadata.sourceDiff));
  assert.equal(sha256(patch), metadata.sourceDiffSha256);
  assert.match(metadata.baseCommit, /^[0-9a-f]{40}$/);
});
