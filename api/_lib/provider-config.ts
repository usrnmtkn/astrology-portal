export type GenerationProvider = "openai" | "claude";

const providerEnvByContentType: Record<string, string> = {
  sky_article: "CONTENT_GENERATION_PROVIDER_SKY_ARTICLE",
  sky_aspect: "CONTENT_GENERATION_PROVIDER_SKY_ASPECT",
  natal_placement: "CONTENT_GENERATION_PROVIDER_NATAL_PLACEMENT",
  natal_aspect: "CONTENT_GENERATION_PROVIDER_NATAL_ASPECT",
  transit_to_natal: "CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL",
  transit_natal: "CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL",
  friend_transit_reading: "CONTENT_GENERATION_PROVIDER_TRANSIT_TO_NATAL",
  relationship: "CONTENT_GENERATION_PROVIDER_RELATIONSHIP",
  synastry: "CONTENT_GENERATION_PROVIDER_RELATIONSHIP",
  composite: "CONTENT_GENERATION_PROVIDER_RELATIONSHIP",
  relationship_report_section: "CONTENT_GENERATION_PROVIDER_RELATIONSHIP"
};

function normalizeProvider(provider: string | undefined | null): GenerationProvider | null {
  const normalized = provider?.trim().toLowerCase();

  if (normalized === "openai") {
    return "openai";
  }

  if (normalized === "claude" || normalized === "anthropic") {
    return "claude";
  }

  return null;
}

export function contentGenerationProvider(options: {
  requestedProvider?: string | null;
  contentType?: string | null;
  blockType?: string | null;
} = {}): GenerationProvider {
  const requested = normalizeProvider(options.requestedProvider);

  if (requested) {
    return requested;
  }

  const contentType = options.contentType?.trim().toLowerCase() || options.blockType?.trim().toLowerCase() || "";
  const typeSpecificEnv = providerEnvByContentType[contentType];
  const typeSpecificProvider = typeSpecificEnv ? normalizeProvider(process.env[typeSpecificEnv]) : null;

  if (typeSpecificProvider) {
    return typeSpecificProvider;
  }

  return normalizeProvider(process.env.CONTENT_GENERATION_PROVIDER) ?? "openai";
}
