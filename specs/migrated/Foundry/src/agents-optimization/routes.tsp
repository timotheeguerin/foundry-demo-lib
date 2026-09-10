// Routes for the AgentsOptimization data-plane surface.
// Uses the library's approved job templates with service-specific preview/error bindings.

import "./models.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

using Azure.Core;

namespace Azure.AI.Projects;

// ---------------------------------------------------------------------------
// Job CRUD operations (shared templates from @timotheeguerin/foundry-core)
// ---------------------------------------------------------------------------

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "OpenAI-based operations are not conventionally versioned"
@tag("AgentOptimizationJobs")
interface AgentOptimizationJobs {
  /**
   * Creates an optimization job and returns the queued job. Honors `Operation-Id` for idempotent retry.
   */
  @summary("Create an agent optimization job")
  @route("agent_optimization_jobs")
  @extension("x-ms-foundry-meta", AgentOptimizationRequiredPreviews)
  @pollingOperation(AgentOptimizationJobs.get)
  create is Foundry.Core.StandardOperations.PostJobPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.agents_optimization_v2_preview>,
    AgentOptimizationJob,
    AzureRangeErrorResponse<ApiErrorResponse>
  >;

  /**
   * Retrieves an optimization job by its identifier.
   */
  @summary("Get an agent optimization job")
  @route("agent_optimization_jobs/{jobId}")
  @extension("x-ms-foundry-meta", AgentOptimizationRequiredPreviews)
  get is Foundry.Core.StandardOperations.QueryJobStatusPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.agents_optimization_v2_preview>,
    AgentOptimizationJob,
    AzureRangeErrorResponse<ApiErrorResponse>
  >;

  /**
   * Lists optimization jobs with cursor pagination and optional status or agent name filters.
   */
  @summary("List agent optimization jobs")
  @route("agent_optimization_jobs")
  @extension("x-ms-foundry-meta", AgentOptimizationRequiredPreviews)
  list is Foundry.Core.StandardOperations.ListJobsPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.agents_optimization_v2_preview>,
    AgentOptimizationJobListItem,
    AzureRangeErrorResponse<ApiErrorResponse>,
    {
      @doc("Filter to jobs in this lifecycle state.")
      @query
      status?: JobStatus;

      @doc("Filter to jobs targeting this agent name.")
      @query
      agent_name?: string;
    },
    AgentsPagedResult<AgentOptimizationJobListItem>
  >;

  /**
   * Requests cancellation of a running or queued job and returns an error if the job is already in a terminal state.
   */
  @summary("Cancel an agent optimization job")
  @route("agent_optimization_jobs/{jobId}:cancel")
  @extension("x-ms-foundry-meta", AgentOptimizationRequiredPreviews)
  cancel is Foundry.Core.StandardOperations.CancelJobPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.agents_optimization_v2_preview>,
    AgentOptimizationJob,
    AzureRangeErrorResponse<ApiErrorResponse>
  >;

  /**
   * Deletes the job and its candidate artifacts, canceling the job first if it is non-terminal.
   */
  @summary("Delete an agent optimization job")
  @route("agent_optimization_jobs/{jobId}")
  @extension("x-ms-foundry-meta", AgentOptimizationRequiredPreviews)
  delete is Foundry.Core.StandardOperations.DeleteJobPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.agents_optimization_v2_preview>,
    AzureRangeErrorResponse<ApiErrorResponse>
  >;
}
