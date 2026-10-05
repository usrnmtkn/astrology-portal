type ArticleSectionWithHeading = {
  heading: string;
};

const aspectPoint = "(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north node|south node|ascendant|descendant|midheaven|imum coeli)";
const personalAspectHeading = new RegExp(
  `^(?:your )?(${aspectPoint}) (conjunct(?:ion)?|sextile|square|trine|opposit(?:e|ion)|quincunx|inconjunct) (?:your )?(${aspectPoint})$`,
  "u"
);
const placementHeadingPrefix = new RegExp(`^(?:the )?(${aspectPoint})(?: (?:rx|retrograde))?(?= (?:in|through) )`, "u");

function normalizedHeading(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[’']/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
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
    .trim()
    // Compare only complete aspect labels; named owners and prose stay distinct.
    .replace(personalAspectHeading, (_heading, first: string, aspect: string, last: string) =>
      `${first} ${aspect.replace(/^conjunct$/u, "conjunction").replace(/^opposite$/u, "opposition").replace(/^inconjunct$/u, "quincunx")} ${last}`);
  // Motion belongs in the page title; a generic placement section repeats it.
  const withoutPlacementQualifiers = withoutMovementVerb.replace(placementHeadingPrefix, "$1");
  const withoutTrailingHouse = withoutPlacementQualifiers
    .replace(/\s+(?:in\s+)?(?:(?:the|your)\s+)?\d{1,2}(?:st|nd|rd|th)?\s+house$/u, "")
    .trim();

  return Array.from(new Set([
    normalized,
    withoutMovementVerb,
    withoutPlacementQualifiers,
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
