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
  displayName: string;

  /** Token usage */
  token_usage: int64;
}

/** Job lifecycle operations. */
@route("/jobs")
interface Jobs {
  /** Get a job without an approved standard template. */
  @get
  get(
    ...Foundry.Core.FoundryDataPlaneApiVersionParameter,

    /** The ID of the job. */
    @path("jobId") job_id: string,
  ): Job | Azure.Core.Foundations.ErrorResponse;

  // test is Foundry.Core.StandardOperations.CancelJob<
  //   Job,
  //   Azure.Core.Foundations.ErrorResponse
  // >;
}
