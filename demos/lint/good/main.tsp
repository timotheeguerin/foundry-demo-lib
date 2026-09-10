import "@typespec/http";
import "@typespec/versioning";
import "@timotheeguerin/foundry-core";

using TypeSpec.Http;
using TypeSpec.Versioning;

@service(#{ title: "Foundry Jobs" })
@server("https://example.com", "Foundry Jobs endpoint")
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@versioned(Versions)
namespace FoundryJobs;

/** Supported service versions. */
enum Versions {
  v1: "2026-09-01",
}

/** A submitted job. */
model Job {
  /** The display name of the job. */
  display_name: string;
}

/** Job lifecycle operations. */
@route("/jobs")
interface Jobs {
  /** List submitted jobs. */
  list is Foundry.Core.StandardOperations.ListJobs<
    Job,
    Azure.Core.Foundations.ErrorResponse
  >;
}
