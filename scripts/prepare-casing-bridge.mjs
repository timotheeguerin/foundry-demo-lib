import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { root } from "./provenance.mjs";

const [upstreamArgument, stagingArgument] = process.argv.slice(2);
assert(upstreamArgument && stagingArgument,
  "Usage: node scripts/prepare-casing-bridge.mjs <upstream-worktree> <pnpm-patch-edit-dir>");
const upstream = resolve(upstreamArgument);
const staging = resolve(stagingArgument);
const packagePath = "packages/typespec-azure-core";
const stagedPackage = JSON.parse(await readFile(resolve(staging, "package.json"), "utf8"));
assert.equal(stagedPackage.name, "@azure-tools/typespec-azure-core");
assert.equal(stagedPackage.version, "0.71.0");
const files = [
  ...["casing-style", "utils"].flatMap((name) =>
    ["js", "js.map", "d.ts", "d.ts.map"].map((extension) => `dist/src/rules/${name}.${extension}`)),
];
const hashes = {};
const upstreamHashes = {};
for (const name of files) {
  const source = resolve(upstream, packagePath, name);
  const destination = resolve(staging, name);
  await mkdir(dirname(destination), { recursive: true });
  const original = await readFile(source);
  const copied = name.endsWith(".map")
    ? Buffer.from(`${original.toString("utf8").trimEnd()}\n`)
    : original;
  await writeFile(destination, copied);
  upstreamHashes[name] = createHash("sha256").update(original).digest("hex");
  hashes[name] = createHash("sha256").update(copied).digest("hex");
}
const sourceFiles = [
  "src/rules/casing-style.ts",
  "src/rules/utils.ts",
  "src/rules/casing-style.md",
  "test/rules/casing-style.test.ts",
].map((name) => `${packagePath}/${name}`);
const baseCommit = execFileSync("git", ["-C", upstream, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sourceDiff = execFileSync("git", ["-C", upstream, "diff", "--no-ext-diff", "HEAD", "--", ...sourceFiles]);
assert(sourceDiff.length > 0, "Expected the separate upstream casing implementation");
await mkdir(resolve(root, "patches"), { recursive: true });
await writeFile(resolve(root, "patches/upstream-casing.diff"), sourceDiff);
await writeFile(resolve(root, "patches/upstream-source.json"), `${JSON.stringify({
  repository: "https://github.com/Azure/typespec-azure",
  baseCommit,
  sourceFiles,
  sourceDiff: "upstream-casing.diff",
  sourceDiffSha256: createHash("sha256").update(sourceDiff).digest("hex"),
  package: "@azure-tools/typespec-azure-core",
  patchedVersion: "0.71.0",
  upstreamFilesSha256: upstreamHashes,
  copiedFilesSha256: hashes,
  normalization: "Source maps have one trailing newline for stable pnpm patch application; runtime code is copied unchanged.",
  note: "Derived from the accompanying uncommitted upstream source change. No PR or published release is claimed.",
}, null, 2)}\n`);
console.log("Copied the built upstream casing implementation into the isolated pnpm patch directory.");
