import "@typespec/http";

import "@azure-tools/typespec-azure-core";
import "@timotheeguerin/foundry-core";

using Azure.ClientGenerator.Core;
using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.Core;

namespace Azure.AI.Projects;

// ============================================================================
// Foundry Data Plane Operation Infrastructure
// ============================================================================

alias FoundryDataPlaneApiVersionParameter = Foundry.Core.FoundryDataPlaneApiVersionParameter;

alias FoundryDataPlaneAzureTraits = Azure.Core.Traits.SupportsClientRequestId &
  Azure.Core.Traits.NoRepeatableRequests &
  Azure.Core.Traits.NoConditionalRequests &
  FoundryDataPlaneApiVersionParameter;

alias FoundryAzureOperations<ExtraTraits> = Azure.Core.ResourceOperations<
  ExtraTraits & FoundryDataPlaneAzureTraits,
  AzureRangeErrorResponse
>;

alias FoundryStandardResourceOperations = Azure.Core.ResourceOperations<
  Azure.Core.Traits.NoConditionalRequests &
    Azure.Core.Traits.NoRepeatableRequests &
    Azure.Core.Traits.NoClientRequestId,
  AzureRangeErrorResponse
>;

op FoundryOperation<
  Params extends Reflection.Model,
  Response,
  Traits extends Reflection.Model = {}
> is Azure.Core.Foundations.Operation<
  Params,
  Response,
  Traits,
  AzureRangeErrorResponse
>;

#suppress "@azure-tools/typespec-azure-core/no-response-body" ""
op FoundryResourceOperation<
  Resource extends Reflection.Model,
  Params extends Reflection.Model,
  Response,
  Traits extends Reflection.Model = {}
> is Azure.Core.Foundations.ResourceOperation<
  Resource,
  Params,
  Response,
  Traits,
  AzureRangeErrorResponse
>;

op FoundryResourceList<
  Resource extends Reflection.Model,
  Params extends Reflection.Model,
  Response extends Reflection.Model,
  Traits extends Reflection.Model = {}
> is Azure.Core.Foundations.ResourceList<
  Resource,
  Params,
  Response,
  Traits,
  AzureRangeErrorResponse
>;

#suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" ""
#suppress "@azure-tools/typespec-azure-core/no-response-body" ""
op FoundryDataPlaneOperation<
  Params extends Reflection.Model,
  Response,
  ErrorResponse = ApiErrorResponse
> is Foundry.Core.Foundations.Operation<
  Params,
  Response,
  AzureRangeErrorResponse<ErrorResponse>
>;

// ---- Feature opt-in keys & preview headers ----

/** Feature opt-in keys for agent definition operations supporting hosted or workflow agents. */
union AgentDefinitionOptInKeys {
  workflow_agents_v1_preview: "WorkflowAgents=V1Preview",
  external_agents_v1_preview: "ExternalAgents=V1Preview",
  draft_agents_v1_preview: "DraftAgents=V1Preview",
  voice_agents_v1_preview: "VoiceAgents=V1Preview",
  digital_worker_v1_preview: "DigitalWorker=V1Preview",

  @removed(Versions.v1)
  hosted_agents_v1_preview: "HostedAgents=V1Preview",

  @removed(Versions.v1)
  container_agents_v1_preview: "ContainerAgents=V1Preview",
}

union FoundryFeaturesOptInKeys {
  evaluations_v1_preview: "Evaluations=V1Preview",
  schedules_v1_preview: "Schedules=V1Preview",
  red_teams_v1_preview: "RedTeams=V1Preview",
  insights_v1_preview: "Insights=V1Preview",
  agent_insights_v1_preview: "AgentInsights=V1Preview",
  memory_stores_v1_preview: "MemoryStores=V1Preview",
  routines_v2_preview: "Routines=V2Preview",
  skills_v1_preview: "Skills=V1Preview",
  data_generation_jobs_v1_preview: "DataGenerationJobs=V1Preview",
  models_v1_preview: "Models=V1Preview",
  agents_optimization_v2_preview: "AgentsOptimization=V2Preview",
  model_router_controls_v1_preview: "ModelRouterControls=V1Preview",
}

alias WithRequiredFoundryPreviewHeader<RequiredPreviewOptInHeader extends
  | FoundryFeaturesOptInKeys
  | AgentDefinitionOptInKeys> = Foundry.Core.WithRequiredFoundryPreviewHeader<RequiredPreviewOptInHeader>;

alias WithConditionalFoundryPreviewHeader<OptionalPreviewOptInHeader extends
  | FoundryFeaturesOptInKeys
  | AgentDefinitionOptInKeys> = Foundry.Core.WithConditionalFoundryPreviewHeader<OptionalPreviewOptInHeader>;

#suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" ""
#suppress "@azure-tools/typespec-azure-core/no-response-body" ""
op FoundryDataPlanePreviewOperation<
  AreaPreviewLabel extends FoundryFeaturesOptInKeys | AgentDefinitionOptInKeys,
  Params extends Reflection.Model,
  Response,
  ErrorResponse = ApiErrorResponse
> is Foundry.Core.Foundations.PreviewOperation<
  WithConditionalFoundryPreviewHeader<AreaPreviewLabel>,
  Params,
  Response,
  AzureRangeErrorResponse<ErrorResponse>
>;

#suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" ""
#suppress "@azure-tools/typespec-azure-core/no-response-body" ""
op FoundryDataPlaneRequiredPreviewOperation<
  AreaPreviewLabel extends FoundryFeaturesOptInKeys | AgentDefinitionOptInKeys,
  Params extends Reflection.Model,
  Response,
  ErrorResponse = ApiErrorResponse
> is Foundry.Core.Foundations.PreviewOperation<
  WithRequiredFoundryPreviewHeader<AreaPreviewLabel>,
  Params,
  Response,
  AzureRangeErrorResponse<ErrorResponse>
>;

// ============================================================================
// Pagination
// ============================================================================

// Named service adapters preserve existing component names and SDK customizations.
#suppress "@azure-tools/typespec-client-generator-core/csharp-model-suffix" "Name kept for backward compatibility"
model AgentsPagedResult<T> is Foundry.Core.AgentsPagedResult<T>;

model PagedResultWithNextLink<T> is Foundry.Core.PagedResultWithNextLink<T>;

alias PageLimitQueryParameter = Foundry.Core.PageLimitQueryParameter;
alias PageOrder = Foundry.Core.PageOrder;
@@friendlyName(Foundry.Core.PageOrder, "PageOrder");
alias PageOrderQueryParameter = Foundry.Core.PageOrderQueryParameter<PageOrder>;
alias PageAfterQueryParameter = Foundry.Core.PageAfterQueryParameter;
alias PageBeforeQueryParameter = Foundry.Core.PageBeforeQueryParameter;
alias CommonPageQueryParameters = Foundry.Core.CommonPageQueryParameters<PageOrder>;

// ============================================================================
// Versioned Resource Operations
// ============================================================================

@doc("Defines the request parameters for the createOrUpdateVersion operations.")
model InputParameters<
  TEntityType extends Reflection.Model,
  TBodyName extends valueof string = "body"
> {
  @doc("The {name} to create or update.", TEntityType)
  @bodyRoot
  @clientName(TBodyName)
  body: TEntityType;

  @doc("Content type for patch")
  @header("Content-Type")
  contentType: "application/merge-patch+json";

  @doc(
    "The specific version id of the {name} to create or update.",
    TEntityType
  )
  @Rest.segment("versions")
  @path
  version: string;
}

@Rest.autoRoute
interface VersionedOperations<
  TEntityType extends Reflection.Model,
  TInputParameters extends Reflection.Model,
  TListLatestParameters extends Reflection.Model = {},
  TListVersionsParameters extends Reflection.Model = {}
> {
  #suppress "@azure-tools/typespec-azure-core/verb-conflict" "We are using the resource action as a building block."
  @summary("List versions")
  @doc("List all versions of the given {name}", TEntityType)
  @Rest.action("versions")
  @Rest.actionSeparator("/")
  @get
  @list
  listVersions is FoundryStandardResourceOperations.ResourceAction<
    TEntityType,
    TListVersionsParameters,
    Azure.Core.Page<TEntityType>
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Suppress `Operation should be defined using a signature from the Azure.Core namespace.`"
  @summary("List latest versions")
  @doc("List the latest version of each {name}", TEntityType)
  @Rest.listsResource(TEntityType)
  listLatest is FoundryResourceList<
    TEntityType,
    TListLatestParameters,
    Azure.Core.Page<TEntityType>
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Suppress `Operation should be defined using a signature from the Azure.Core namespace.`"
  @summary("Get a version")
  @doc(
    "Get the specific version of the {name}. The service returns 404 Not Found error if the {name} does not exist.",
    TEntityType
  )
  getVersion is FoundryResourceOperation<
    TEntityType,
    {
      @doc("The specific version id of the {name} to retrieve.", TEntityType)
      @Rest.segment("versions")
      @path
      version: string;
    },
    Azure.Core.Foundations.ResourceOkResponse<TEntityType>
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Suppress `Operation should be defined using a signature from the Azure.Core namespace.`"
  @summary("Delete a version")
  @doc(
    "Delete the specific version of the {name}. The service returns 204 No Content if the {name} was deleted successfully or if the {name} does not exist.",
    TEntityType
  )
  @delete
  deleteVersion is FoundryResourceOperation<
    TEntityType,
    {
      @doc("The version of the {name} to delete.", TEntityType)
      @Rest.segment("versions")
      @path
      version: string;
    },
    NoContentResponse
  >;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Suppress `Operation should be defined using a signature from the Azure.Core namespace.`"
  @summary("Create or update a version")
  @doc(
    "Create a new or update an existing {name} with the given version id",
    TEntityType
  )
  @patch
  createOrUpdateVersion is FoundryResourceOperation<
    TEntityType,
    TInputParameters,
    Azure.Core.Foundations.ResourceCreatedOrOkResponse<TEntityType>
  >;
}

// ============================================================================
// Long-Running Job Infrastructure
// ============================================================================

alias JobStatus = Foundry.Core.JobStatus;
@@friendlyName(Foundry.Core.JobStatus, "JobStatus");

// The service owns OpenAI error identity; the library only consumes its type.
alias JobLike<
  TResult = never,
  TInputs = never,
  TStatus extends string = JobStatus
> = Foundry.Core.JobLike<ApiError, TResult, TInputs, TStatus>;

alias JobCreatedResponse<TJob extends TypeSpec.Reflection.Model> = Foundry.Core.JobCreatedResponse<TJob>;
alias JobStatusResponse<TJob extends TypeSpec.Reflection.Model> = Foundry.Core.JobStatusResponse<TJob>;
alias WithOperationId = Foundry.Core.WithOperationId;

// Compatibility signatures bind the entrypoint-selected error response.
#suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "LRO polling is handled by the client via Operation-Location"
op postJob<TJob extends TypeSpec.Reflection.Model> is Foundry.Core.StandardOperations.PostJob<
  TJob,
  AzureRangeErrorResponse<ApiErrorResponse>
>;

op queryJobStatus<TJob extends TypeSpec.Reflection.Model> is Foundry.Core.StandardOperations.QueryJobStatus<
  TJob,
  AzureRangeErrorResponse<ApiErrorResponse>
>;

op listJobs<
  TJob extends TypeSpec.Reflection.Model,
  TFilterParams extends TypeSpec.Reflection.Model = {}
> is Foundry.Core.StandardOperations.ListJobs<
  TJob,
  AzureRangeErrorResponse<ApiErrorResponse>,
  TFilterParams,
  AgentsPagedResult<TJob>
>;

op cancelJob<TJob extends TypeSpec.Reflection.Model> is Foundry.Core.StandardOperations.CancelJob<
  TJob,
  AzureRangeErrorResponse<ApiErrorResponse>
>;

op deleteJob<TJob extends TypeSpec.Reflection.Model> is Foundry.Core.StandardOperations.DeleteJob<
  AzureRangeErrorResponse<ApiErrorResponse>
>;

#suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "LRO polling is handled by the client via Operation-Location"
op postJobPreview<
  AreaPreviewLabel extends FoundryFeaturesOptInKeys | AgentDefinitionOptInKeys,
  TJob extends TypeSpec.Reflection.Model
> is Foundry.Core.StandardOperations.PostJobPreview<
  WithConditionalFoundryPreviewHeader<AreaPreviewLabel>,
  TJob,
  AzureRangeErrorResponse<ApiErrorResponse>
>;

op queryJobStatusPreview<
  AreaPreviewLabel extends FoundryFeaturesOptInKeys | AgentDefinitionOptInKeys,
  TJob extends TypeSpec.Reflection.Model
> is Foundry.Core.StandardOperations.QueryJobStatusPreview<
  WithConditionalFoundryPreviewHeader<AreaPreviewLabel>,
  TJob,
  AzureRangeErrorResponse<ApiErrorResponse>
>;

op listJobsPreview<
  AreaPreviewLabel extends FoundryFeaturesOptInKeys | AgentDefinitionOptInKeys,
  TJob extends TypeSpec.Reflection.Model,
  TFilterParams extends TypeSpec.Reflection.Model = {}
> is Foundry.Core.StandardOperations.ListJobsPreview<
  WithConditionalFoundryPreviewHeader<AreaPreviewLabel>,
  TJob,
  AzureRangeErrorResponse<ApiErrorResponse>,
  TFilterParams,
  AgentsPagedResult<TJob>
>;

op cancelJobPreview<
  AreaPreviewLabel extends FoundryFeaturesOptInKeys | AgentDefinitionOptInKeys,
  TJob extends TypeSpec.Reflection.Model
> is Foundry.Core.StandardOperations.CancelJobPreview<
  WithConditionalFoundryPreviewHeader<AreaPreviewLabel>,
  TJob,
  AzureRangeErrorResponse<ApiErrorResponse>
>;

op deleteJobPreview<AreaPreviewLabel extends
  | FoundryFeaturesOptInKeys
  | AgentDefinitionOptInKeys> is Foundry.Core.StandardOperations.DeleteJobPreview<
  WithConditionalFoundryPreviewHeader<AreaPreviewLabel>,
  AzureRangeErrorResponse<ApiErrorResponse>
>;

// ============================================================================
// Types and traits shared by multiple service patterns
// ============================================================================

scalar FoundryTimestamp extends Foundry.Core.FoundryTimestamp;

scalar FoundryDurationMilliseconds extends Foundry.Core.FoundryDurationMilliseconds;
