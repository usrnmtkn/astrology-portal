type ArticleSectionWithHeading = {
  heading: string;
};

const aspectPoint = "sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north node|south node|ascendant|descendant|midheaven|imum coeli";
const personalAspectHeading = new RegExp(
  `^(?:your )?(${aspectPoint}) (conjunct(?:ion)?|sextile|square|trine|opposit(?:e|ion)|quincunx|inconjunct) (?:your )?(${aspectPoint})$`,
  "u"
);
const placementHeadingPrefix = new RegExp(`^(?:the )?(${aspectPoint})(?: (?:rx|retrograde))?(?= (?:in|through) )`, "u");

export function articleHeadingComparisonKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[’']/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase()
    .replace(/\b(?:is )?(?:currently )?(?:moving|transiting)\b/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    // Compare only complete aspect labels; named owners and prose stay distinct.
    .replace(personalAspectHeading, (_heading, first: string, aspect: string, last: string) =>
      `${first} ${aspect.replace("conjunction", "conjunct").replace("opposition", "opposite").replace("inconjunct", "quincunx")} ${last}`)
    // Motion and house context can qualify the page title without adding a section.
    .replace(placementHeadingPrefix, "$1")
    .replace(/ (?:in )?(?:(?:the|your) )?\d{1,2}(?:st|nd|rd|th)? house$/u, "");
}

export function dedupeArticleSectionHeadings<T extends ArticleSectionWithHeading>(
  sections: T[],
  existingHeadings: string | string[]
) {
  const seen = new Set(
    [existingHeadings].flat()
      .map(articleHeadingComparisonKey)
  );

  return sections.map((section) => {
    const key = articleHeadingComparisonKey(section.heading);
    const isDuplicate = seen.has(key);
    seen.add(key);

    return key && isDuplicate
      ? { ...section, heading: "" }
      : section;
  });
}
