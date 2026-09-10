import { defineLinter, type LinterRuleSet } from "@typespec/compiler";
import { useStandardOperationsRule } from "./rules/use-standard-operations.js";

const foundryPolicy = {
  enable: {
    "@azure-tools/typespec-azure-core/casing-style": {
      model: "PascalCase",
      modelProperty: "snake_case",
      operation: "camelCase",
      operationTemplate: "PascalCase",
      interface: "PascalCase",
      namespace: "PascalCase",
      union: "PascalCase",
      unionVariant: "snake_case",
      enum: "PascalCase",
      enumMember: "snake_case",
      scalar: "PascalCase",
    },
    "@timotheeguerin/foundry-core/use-standard-operations": true,
  },
  disable: {
    "@azure-tools/typespec-azure-core/use-standard-operations":
      "Foundry has its own standard job signatures; the Foundry ancestry rule replaces this policy.",
  },
} satisfies LinterRuleSet;

export const $linter = defineLinter({
  rules: [useStandardOperationsRule],
  ruleSets: {
    "data-plane": {
      extends: ["@azure-tools/typespec-azure-rulesets/data-plane"],
      ...foundryPolicy,
    },
    recommended: {
      extends: [
        "@azure-tools/typespec-azure-rulesets/data-plane",
        "@azure-tools/typespec-azure-rulesets/client-sdk",
      ],
      ...foundryPolicy,
    },
  },
});
