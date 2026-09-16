# Foundry: shared TypeSpec patterns and lint policy

Foundry already shares job and pagination templates inside its service source, but those reusable conventions are mixed with service-specific versions, feature flags, and OpenAI adaptations. Its Azure lint configuration also disables casing because one fixed naming convention cannot describe the API.

This demo separates the reusable patterns into **`@timotheeguerin/foundry-core`**, together with a ruleset that configures Azure Core's casing checks and guides authors toward Foundry's standard operations. The full service is retained beside an unchanged upstream copy so that a smaller source definition does not come at the cost of a changed API.

## Run

Use Node **24.14.1 or newer** and **pnpm 10.30.2**.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm demo:good
pnpm demo:bad
```

`demo:bad` is intentionally unsuccessful: it shows diagnostics for invalid casing and an operation that bypasses the Foundry templates. Do not treat its nonzero exit as an installation failure.

The remaining commands provide different evidence:

| Command | Purpose |
| --- | --- |
| `pnpm provenance` | Check every baseline file against the recorded upstream hashes. |
| `pnpm test` | Exercise rules, configuration, library consumers, and workspace invariants. |
| `pnpm check:library` | Check library declarations as project source, excluding the consumer casing policy. |
| `pnpm lint` | Check that the full migrated spec has no unreviewed diagnostic changes. |
| `pnpm compare` | Recompile both full specs and compare every versioned OpenAPI document. |
| `pnpm check:sdk` | Check the six working SDK entrypoints and preserve the known internal-contracts failure. |
| `pnpm compile:baseline` | Emit the unchanged full Foundry spec. |
| `pnpm compile:migrated` | Emit the full spec using the shared library. |

Generated output and full diagnostics are written to `output/`, not into the source copies.

## Before and after

`specs/baseline/Foundry` is the original source. Its `src/common/servicepatterns.tsp` contains the implementation of job creation, polling, listing, cancellation, deletion, pagination, and job model shapes. These are reused across multiple API areas but live inside the service namespace.

`specs/migrated/Foundry` is the full working copy. Its data-generation and agent-optimization APIs use the workspace library. Other consumers retain thin service-level adapters where needed to preserve existing names and contracts; the reusable implementation belongs to the library.

```tsp
import "@timotheeguerin/foundry-core";

// With Job defined by the service:
/** List jobs using Foundry's API-version and cursor-pagination conventions. */
@TypeSpec.Http.route("/jobs")
op list is Foundry.Core.StandardOperations.ListJobs<
  Job,
  Azure.Core.Foundations.ErrorResponse
>;
```

The [runnable lint demos](demos/lint) include the complete service and model definitions. The real migrated job APIs additionally supply their feature-header and error-response policy.

The dependency direction is deliberately one-way:

```text
Foundry service: concrete models, feature values, API versions, error policy
       |
       v
Foundry.Core: reusable job and pagination models
Foundry.Core.StandardOperations: approved public job templates
Foundry.Core.Foundations: lower-level building blocks
       |
       v
TypeSpec HTTP and Azure Core
```

Service-specific OpenAI error adaptations stay in the service. Error responses are supplied to the library so REST entrypoints retain range errors while SDK entrypoints retain their default-error behavior. Feature values and their versioning decorators likewise stay outside the library.

`pnpm compare` compares complete parsed JSON and YAML documents for both `v1` and `virtual-public-preview`. Only object-key ordering is insignificant: component names, `$ref`s, operation IDs, defaults, requiredness, headers, status codes, polling metadata, and extensions are all part of the comparison.

## One ruleset for Foundry authors

```yaml
linter:
  extends:
    - "@timotheeguerin/foundry-core/recommended"
```

The preset extends Azure's data-plane and client-SDK policies, then configures **Azure Core's existing `casing-style` rule**, rather than providing a competing casing implementation:

| Declaration | Foundry convention |
| --- | --- |
| Model properties and operation parameters | `snake_case` |
| Named union variants and enum members | `snake_case` |
| Named types, interfaces, namespaces, operation templates | `PascalCase` |
| Concrete operations | `camelCase` |

For example, `created_at` follows Foundry's configured policy; `createdAt` produces an **`@azure-tools/typespec-azure-core/casing-style`** diagnostic. The setting applies to TypeSpec identifiers, not explicitly encoded HTTP names or string-literal values. Correct enum-member casing does not override Azure's separate `no-enum` policy.

The library retains the `apiVersion` identifier because Azure's API-version rule requires that exact property name. Casing policy applies to consumer-authored declarations, not library internals, so library-owned names do not need casing suppressions. Its wire binding remains the original **`api-version` query parameter**, not a header.

### Foundry standard operations

The preset intentionally replaces Azure's `use-standard-operations` rule with **`@timotheeguerin/foundry-core/use-standard-operations`**. Foundry's custom job signatures are not Azure's standard resource signatures; claiming otherwise would hide a real policy distinction.

The Foundry rule follows operation ancestry through approved library templates. Renaming a raw operation, placing it in a Foundry-looking namespace, or deriving directly from an Azure operation is not sufficient. Generic intermediate wrappers are supported, and diagnostics belong to the consuming service declaration.

The reusable preset checks all project operations by default. The copied legacy service narrows the initial rollout to its two spotlight interfaces:

```yaml
linter:
  extends:
    - "@timotheeguerin/foundry-core/recommended"
  enable:
    "@timotheeguerin/foundry-core/use-standard-operations":
      includeInterfaces:
        - Azure.AI.Projects.DataGenerationJobs
        - Azure.AI.Projects.AgentOptimizationJobs
```

This selector limits only the new Foundry operation requirement, not the remaining Azure checks. Existing service exceptions remain visible in its own configuration instead of becoming blanket exceptions in the reusable preset.

SDK entrypoints use the same operation-policy substitution while retaining their existing naming exceptions. The library's `data-plane` preset supplies the same Foundry policy without adding client-SDK checks to entrypoints that did not previously enable them. Configured casing is demonstrated by the full REST entrypoint and strict standalone fixtures.

## Upstream casing change and temporary bridge

Compiler 1.15 already supports rule options and option schemas. Azure Core 0.71 does not yet expose them for casing. The accompanying upstream change extends that existing rule with per-declaration casing options and opt-in union, enum, scalar, and member coverage, while preserving the default Azure behavior.

Until an official release contains the change, this repository uses an exact-version **pnpm patch** derived from the upstream implementation. The patch is a distribution bridge, not a separate implementation or a dependency on another local worktree. [Provenance metadata](patches/upstream-source.json) identifies the source base and hashes of the built files; [the source diff](patches/upstream-casing.diff) includes the implementation, upstream tests, and documentation.

The installed patched files are checked against those hashes. Runtime code is copied unchanged; source maps receive a trailing newline for stable pnpm patch application, with both original and copied hashes recorded. Maintainers can regenerate the bridge from a built upstream checkout with `scripts/prepare-casing-bridge.mjs <upstream-worktree> <pnpm-patch-edit-dir>`, then `pnpm patch-commit <pnpm-patch-edit-dir>`. That pnpm command records a dependency patch; it does not create a Git commit.

Keep the compiler/Azure dependency train compatible when replacing the patch with an official release. Merely supplying option objects to unpatched Azure Core can silently leave its old behavior unchanged; the diagnostic examples and tests guard against that mistake.

Compiler 1.15 has a separate limitation reporting invalid options inside nested inherited presets. The demo tests schema validation directly and executes its valid exported preset; it does not include an unrelated compiler backport.

## Explicit limits

- This is a representative extraction, not a redesign of Foundry or a migration of every service pattern.
- The full copied service is not newly lint-clean. `test/expected-legacy-diagnostics.json` records **748** remaining casing warnings. `pnpm lint` detects changes to that reviewed set rather than hiding those warnings or renaming API fields.
- Imported-library declarations are excluded from consumer casing diagnostics. The library-source check likewise excludes casing while retaining the other recommended checks; concrete consumer fixtures verify that the casing policy remains enforced on service code.
- The pinned **internal C# contracts** entrypoint already produces **4,327 compiler errors** because it mixes the base and client-emitter OpenAI model views. The source remains unchanged. `pnpm check:sdk` explicitly reports this known failure and compares its diagnostics; it does not claim that entrypoint compiles. The other six SDK entrypoints are checked normally.
- No SDK code generation, Azure deployment, or npm publication is required.

## Source and licensing

The full Foundry source, examples, configuration, and supporting documentation were copied from [Azure/azure-rest-api-specs](https://github.com/Azure/azure-rest-api-specs/tree/73972b766e47d15a5342c90913a738bb7809ccee/specification/ai-foundry/data-plane/Foundry), commit **`73972b766e47d15a5342c90913a738bb7809ccee`**. Only generated `openapi3/` output was excluded. `upstream-source.json` records all 289 retained files and their hashes.

The baseline's [`src/common`](https://github.com/Azure/azure-rest-api-specs/tree/cbf8f4d42b13bd8108374e438af21224b1daaa0c/specification/ai-foundry/data-plane/Foundry/src/common) matches upstream byte-for-byte at **`cbf8f4d42b13bd8108374e438af21224b1daaa0c`**. This common-only refresh changes formatting, not definitions or API behavior; the migrated adapters mirror it, and the rest of the copied source stays at the base revision above. The separate revision is recorded under `overrides` in `upstream-source.json`.

Microsoft's MIT license is preserved in [LICENSE](LICENSE). Upstream READMEs and tooling remain in the source copies for provenance; use this README's pnpm commands for the demo. This is a personal demonstration, not an official Azure package.
