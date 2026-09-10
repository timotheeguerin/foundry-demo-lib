# Foundry authoring policy demos

From the workspace root, run `pnpm install` and `pnpm build`, then:

```sh
pnpm demo:good # exit 0, no diagnostics
pnpm demo:bad  # runs both negative fixtures, then exits 1
```

The demos use the installed package and its full `recommended` preset, without
disabling unrelated rules. Each bad fixture has exactly one intended diagnostic:

- `bad-casing`: `displayName` violates
  `@azure-tools/typespec-azure-core/casing-style`; use `display_name`.
- `bad-operation`: the raw `get` operation violates
  `@timotheeguerin/foundry-core/use-standard-operations`; derive it from
  `Foundry.Core.StandardOperations.QueryJobStatus` instead.

To run any fixture directly:

```sh
pnpm exec tsp compile demos/lint/good --no-emit --warn-as-error
pnpm exec tsp compile demos/lint/bad-casing --no-emit --warn-as-error
pnpm exec tsp compile demos/lint/bad-operation --no-emit --warn-as-error
```

The good demo uses `ListJobs<Job, Azure.Core.Foundations.ErrorResponse>`. Its
template parameters select the job model and the service's error response. It
supplies the required **`api-version` query parameter** (not an API-version
header), optional `limit`, `order`, `after`, and `before` query parameters, and a
cursor-paginated response containing `data`, `first_id`, `last_id`, and `has_more`.

`QueryJobStatus<Job, Azure.Core.Foundations.ErrorResponse>` takes the same two
template parameters. It supplies the `api-version` query parameter, a required
`jobId` path parameter, and an optional **`Retry-After` response header**. The raw
negative fixture spreads `FoundryDataPlaneApiVersionParameter` to preserve the
API-version contract while demonstrating missing standard-operation ancestry.
The service's separate `api-key` header is authentication, not API versioning.

The inherited TypeSpec identifier `apiVersion` is a compatibility exception to
snake_case: it preserves the existing SDK parameter name and satisfies Azure's
`operation-missing-api-version` rule, which requires that exact identifier. The
library's `FoundryDataPlaneApiVersionParameter` declaration has a narrowly scoped,
documented casing suppression for this parameter only. This is not an omission
of versioning or a reliance on linter library filtering: the demos remain
`@versioned`, and tests verify the required query binding and absence of an
`api-version` header.

For preview operations, pass the service-owned preview parameter model first,
for example `QueryJobStatusPreview<WithRequiredFoundryPreviewHeader<"jobs-preview">,
Job, Azure.Core.Foundations.ErrorResponse>`. That adds the `Foundry-Features`
request header. `PostJob` also accepts an optional `Operation-Id` request header
and returns `Operation-Location` and `Location` response headers.
