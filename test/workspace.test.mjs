import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { root, sourceCommit, sourceOverrides, sourcePath, verifyProvenance } from "../scripts/provenance.mjs";

test("the copied baseline retains its exact upstream source hashes", async () => {
  assert.equal(await verifyProvenance(), 289);
});

test("provenance records the common-only refresh separately from the base source", async () => {
  const metadata = JSON.parse(await readFile(resolve(root, "upstream-source.json"), "utf8"));
  assert.equal(metadata.commit, sourceCommit);
  assert.equal(metadata.path, sourcePath);
  assert.deepEqual(metadata.overrides, sourceOverrides);
  assert.deepEqual(metadata.overrides.map(({ path }) => path), ["src/common"]);
});

test("the full spec adopts the package ruleset without globally disabling casing", async () => {
  const { parse } = await import("yaml");
  const config = parse(await readFile(resolve(root, "specs/migrated/Foundry/tspconfig.yaml"), "utf8"));
  assert.deepEqual(config.linter.extends, ["@timotheeguerin/foundry-core/recommended"]);
  assert.equal(config.linter.disable["@azure-tools/typespec-azure-core/casing-style"], undefined);
  assert.deepEqual(
    config.linter.enable["@timotheeguerin/foundry-core/use-standard-operations"].includeInterfaces,
    ["Azure.AI.Projects.DataGenerationJobs", "Azure.AI.Projects.AgentOptimizationJobs"],
  );
});
