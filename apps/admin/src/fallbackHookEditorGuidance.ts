type FallbackHookEditorGuidanceInput = {
  contentKey: string;
  grammarFrame?: string;
  bodyYou?: string;
};

export type FallbackHookEditorGuidance = {
  area: string;
  title: string;
  description: string;
  writingRule: string;
  example?: string;
  headlineLabel: string;
  headlineHint: string;
  summaryLabel: string;
  summaryHint: string;
  bodyLabel: string;
  bodyHint: string;
  bodyYouLabel: string;
  bodyYouHint: string;
  bodyTheyLabel: string;
  bodyTheyHint: string;
};

const titleCase = (value: string) => value
  .replace(/[-_]/gu, " ")
  .replace(/\b\w/gu, (match) => match.toUpperCase());

const grammarRule = (grammarFrame: string | undefined) => {
  if (grammarFrame === "noun_phrase") {
    return "Write a lowercase phrase that can sit inside a larger sentence. Do not add a final period.";
  }
  if (grammarFrame === "complete_sentence") {
    return "Write a complete reader-facing sentence with normal capitalization and punctuation.";
  }
  return "Write copy that fits naturally into the surrounding sentence. Reader Preview shows the full result.";
};

/** Explains a fallback hook in the language an editor needs while changing its atomic copy. */
export function fallbackHookEditorGuidance({
  contentKey,
  grammarFrame,
  bodyYou = ""
}: FallbackHookEditorGuidanceInput): FallbackHookEditorGuidance {
  const [, family = "fallback", subjectKey = "this item"] = contentKey.split("/");
  const subject = titleCase(subjectKey);
  const shared = {
    headlineLabel: "Editor label",
    headlineHint: "Used to identify this source in Content Studio. Readers do not see this label.",
    summaryLabel: "Purpose (editors only)",
    summaryHint: "Describe where this source belongs. Readers do not see this note.",
    bodyLabel: "Reader copy",
    bodyHint: "This is the exact saved copy the fallback system can insert into a reader-facing result.",
    bodyYouLabel: "Reader phrase · You",
    bodyTheyLabel: "Reader phrase · They"
  };

  if (family === "transit-retro-article") {
    return {
      ...shared,
      area: "Current Sky · planet retrograde article",
      title: `${subject} retrograde article source`,
      description: "This is the complete saved source used by the planet retrograde article resolver. Reader Preview fills the date window and planet-in-sign reference so you can review the exact assembled result.",
      writingRule: "Write a complete headline and passage. Keep {{timeOpen}} and {{transitRef}} in the passage; the app replaces them with the live retrograde dates and planet-in-sign reference.",
      example: bodyYou.trim() || undefined,
      headlineLabel: "Reader headline",
      headlineHint: "Shown as the headline of the retrograde article.",
      bodyYouLabel: "Reader passage",
      bodyYouHint: "This is the passage the current retrograde article resolver renders.",
      bodyTheyLabel: "Reference mirror · not rendered",
      bodyTheyHint: "The current article resolver does not read this field. Keep it aligned only as a reference copy."
    };
  }

  if (family === "planet-mode") {
    return {
      ...shared,
      area: "Compatibility and relationship readings",
      title: `What ${subject} represents for each person`,
      description: `The app inserts this short ${subject} phrase into a larger sentence that compares two planets. The phrase is never shown by itself.`,
      writingRule: `${grammarRule(grammarFrame)} Keep the You and They versions parallel.`,
      example: bodyYou.trim()
        ? `…an intense connection between ${bodyYou.trim()} and the other planet’s role.`
        : undefined,
      bodyYouHint: "Used when the reading speaks directly to the person viewing their own chart.",
      bodyTheyHint: "Used for the other person in the same relationship sentence."
    };
  }

  const relationshipPurpose: Record<string, { title: string; description: string }> = {
    "planet-ask": {
      title: `What ${subject} needs from a relationship`,
      description: "The app inserts this phrase into a larger compatibility passage when it describes what one person needs from the connection."
    },
    "planet-grates": {
      title: `What can frustrate ${subject}`,
      description: "The app inserts this phrase into a larger compatibility passage when it describes relationship friction."
    },
    "planet-scene": {
      title: `How ${subject} can appear in daily life`,
      description: "The app inserts this example into a larger compatibility passage to make the relationship dynamic concrete."
    }
  };
  const relationship = relationshipPurpose[family];
  if (relationship) {
    return {
      ...shared,
      area: "Compatibility and relationship readings",
      ...relationship,
      writingRule: `${grammarRule(grammarFrame)} Keep the You and They versions parallel.`,
      example: bodyYou.trim() || undefined,
      bodyYouHint: "Used when the reading speaks directly to the person viewing their own chart.",
      bodyTheyHint: "Used when the same idea describes the other person."
    };
  }

  const isCurrentSky = family.startsWith("transit-") || family.startsWith("sky-");
  const isNatal = family.startsWith("natal-") || family.startsWith("placement-");
  const area = isCurrentSky ? "Current Sky readings" : isNatal ? "Natal chart readings" : "Fallback reader copy";

  return {
    ...shared,
    area,
    title: `${subject} · ${titleCase(family)}`,
    description: `The app uses this saved source when it assembles ${area.toLowerCase()}. Read the complete result in Reader Preview before editing this atomic source.`,
    writingRule: grammarRule(grammarFrame),
    example: bodyYou.trim() || undefined,
    bodyYouHint: "Used when the app speaks directly to the reader.",
    bodyTheyHint: "Used when the app describes another person."
  };
}
