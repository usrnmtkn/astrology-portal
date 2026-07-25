type ArticleSectionWithHeading = {
  heading: string;
};

function normalizedHeading(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[’']/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}

export function articleHeadingComparisonVariants(value: string) {
  const normalized = normalizedHeading(value);

  if (!normalized) {
    return [];
  }

  const withoutMovementVerb = normalized
    .replace(/\b(?:is\s+)?(?:currently\s+)?(?:moving|transiting)\b/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const withoutTrailingHouse = withoutMovementVerb
    .replace(/\s+(?:in\s+)?(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\s+house$/u, "")
    .trim();

  return Array.from(new Set([
    normalized,
    withoutMovementVerb,
    withoutTrailingHouse
  ].filter(Boolean)));
}

export function dedupeArticleSectionHeadings<T extends ArticleSectionWithHeading>(
  sections: T[],
  existingHeadings: string | string[]
) {
  const seen = new Set(
    (Array.isArray(existingHeadings) ? existingHeadings : [existingHeadings])
      .flatMap(articleHeadingComparisonVariants)
  );

  return sections.map((section) => {
    const variants = articleHeadingComparisonVariants(section.heading);
    const isDuplicate = variants.some((variant) => seen.has(variant));

    for (const variant of variants) {
      seen.add(variant);
    }

    return isDuplicate && section.heading
      ? { ...section, heading: "" }
      : section;
  });
}
