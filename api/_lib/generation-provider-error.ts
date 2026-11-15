export class GenerationProviderError extends Error {
  constructor(
    readonly provider: "claude" | "openai",
    readonly status: number,
    readonly detail?: { message?: string; type?: string; code?: string }
  ) {
    super(detail?.message ?? `${provider} request failed with ${status}.`);
    this.name = "GenerationProviderError";
  }
}

export function generationProviderFailure(error: GenerationProviderError) {
  const billing = error.status === 402 || /credit balance|insufficient[_ ](?:credits?|quota)|billing|spend limit/iu
    .test(`${error.detail?.type ?? ""} ${error.detail?.code ?? ""} ${error.message}`);
  if (billing) return {
    status: 503, errorType: "provider_billing_error", retryable: false,
    error: "Generation is unavailable because the writing provider requires billing attention."
  };
  if (error.status === 401 || error.status === 403) return {
    status: 503, errorType: "provider_configuration_error", retryable: false,
    error: "Generation is unavailable because the writing provider could not authorize this service."
  };
  if (error.status === 429) return {
    status: 429, errorType: "provider_rate_limited", retryable: true,
    error: "The writing provider is busy. Please try again later."
  };
  return {
    status: 502,
    errorType: error.status >= 500 ? "provider_unavailable" : "provider_request_error",
    retryable: error.status >= 500,
    error: "The writing provider could not complete this request."
  };
}
