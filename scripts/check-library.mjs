import assert from "node:assert/strict";
import { compile, formatDiagnostic, NodeHost } from "@typespec/compiler";
import { resolve } from "node:path";
import { root } from "./provenance.mjs";

const program = await compile(NodeHost, resolve(root, "packages/foundry-core/lib/main.tsp"), {
  noEmit: true,
  linterRuleSet: {
    extends: ["@timotheeguerin/foundry-core/recommended"],
  },
});
assert.equal(
  program.diagnostics.length,
  0,
  `Library-source diagnostics must not be hidden by package-import filtering:\n${program.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)).join("\n")}`,
);
console.log("The library source passes its preset in project context, without imported-library filtering.");
