import "./models.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.Core;

namespace Azure.AI.Projects;

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "OpenAI-based operations are not conventionally versioned"
@tag("DataGenerationJobs")
interface DataGenerationJobs {
  /**
   * Retrieves the specified data generation job and its current status.
   */
  @summary("Get a data generation job")
  @route("data_generation_jobs/{jobId}")
  @extension("x-ms-foundry-meta", DataGenerationJobsRequiredPreviews)
  get is Foundry.Core.StandardOperations.QueryJobStatusPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.data_generation_jobs_v1_preview>,
    DataGenerationJob,
    AzureRangeErrorResponse<ApiErrorResponse>
  >;

  /**
   * Returns a list of data generation jobs.
   */
  @summary("List data generation jobs")
  @route("data_generation_jobs")
  @extension("x-ms-foundry-meta", DataGenerationJobsRequiredPreviews)
  list is Foundry.Core.StandardOperations.ListJobsPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.data_generation_jobs_v1_preview>,
    DataGenerationJob,
    AzureRangeErrorResponse<ApiErrorResponse>,
    {},
    AgentsPagedResult<DataGenerationJob>
  >;

  /**
   * Submits a new data generation job for asynchronous execution.
   */
  @summary("Create a data generation job")
  @route("data_generation_jobs")
  @extension("x-ms-foundry-meta", DataGenerationJobsRequiredPreviews)
  @pollingOperation(DataGenerationJobs.get)
  create is Foundry.Core.StandardOperations.PostJobPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.data_generation_jobs_v1_preview>,
    DataGenerationJob,
    AzureRangeErrorResponse<ApiErrorResponse>
  >;

  /**
   * Cancels the specified data generation job if it is still in progress.
   */
  @summary("Cancel a data generation job")
  @route("data_generation_jobs/{jobId}:cancel")
  @extension("x-ms-foundry-meta", DataGenerationJobsRequiredPreviews)
  cancel is Foundry.Core.StandardOperations.CancelJobPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.data_generation_jobs_v1_preview>,
    DataGenerationJob,
    AzureRangeErrorResponse<ApiErrorResponse>
  >;

  /**
   * Removes the specified data generation job and its associated output.
   */
  @summary("Delete a data generation job")
  @route("data_generation_jobs/{jobId}")
  @extension("x-ms-foundry-meta", DataGenerationJobsRequiredPreviews)
  delete is Foundry.Core.StandardOperations.DeleteJobPreview<
    WithConditionalFoundryPreviewHeader<FoundryFeaturesOptInKeys.data_generation_jobs_v1_preview>,
    AzureRangeErrorResponse<ApiErrorResponse>
  >;
}
