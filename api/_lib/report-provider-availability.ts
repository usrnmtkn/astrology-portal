const PROVIDER_UNAVAILABLE_PREFIX = "Report provider unavailable:";

export const REPORT_PROVIDER_UNAVAILABLE_MESSAGE =
  "Report writing is temporarily unavailable. Please try again after the service is restored.";

/** Account failures need an operator action, not another paid attempt or a
 * source compilation presented as a successfully written report. */
export class ReportProviderUnavailableError extends Error {
  readonly code = "REPORT_PROVIDER_UNAVAILABLE";
  constructor(readonly provider: string, readonly reason: "credits" | "credentials") {
    super(`${PROVIDER_UNAVAILABLE_PREFIX} ${provider} ${reason === "credits" ? "API credits are unavailable" : "API credentials are unavailable"}.`);
    this.name = "ReportProviderUnavailableError";
  }
}

export function reportProviderResponseError(provider: string, status: number,
  error?: { message?: string; code?: string; type?: string }): Error {
  if (status === 401 || status === 403) return new ReportProviderUnavailableError(provider, "credentials");
  if (status === 402 || error?.code === "insufficient_quota" || error?.type === "insufficient_quota"
    || (provider === "claude" && status === 400 && /credit balance is too low/iu.test(error?.message ?? ""))) {
    return new ReportProviderUnavailableError(provider, "credits");
  }
  return new Error(error?.message ?? `${provider} report call failed with ${status}.`);
}

export function reportProviderUnavailableCause(error: unknown): ReportProviderUnavailableError | null {
  const seen = new Set<unknown>();
  for (let cause = error; cause instanceof Error && !seen.has(cause); cause = cause.cause) {
    if (cause instanceof ReportProviderUnavailableError) return cause;
    seen.add(cause);
  }
  return null;
}

export function isReportProviderUnavailableMessage(message: string | null | undefined): boolean {
  return Boolean(message?.startsWith(PROVIDER_UNAVAILABLE_PREFIX));
}
