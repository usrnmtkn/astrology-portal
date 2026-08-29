type FallbackHookEditorGuidanceInput = {
  contentKey: string;
  grammarFrame?: string;
  bodyYou?: string;
  displayTitle?: string;
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
  audienceLabel?: string;
  audienceHint?: string;
};

const titleCase = (value: string) => value
  .replace(/[-_]/gu, " ")
  .replace(/\b\w/gu, (match) => match.toUpperCase());

const houseLabel = (value: string) => {
  const house = Number(value.replace(/^house-/u, ""));
  if (!Number.isInteger(house) || house < 1 || house > 12) return titleCase(value);
  const suffix = house >= 11 && house <= 13
    ? "th"
    : house % 10 === 1
      ? "st"
      : house % 10 === 2
        ? "nd"
        : house % 10 === 3
          ? "rd"
          : "th";
  return `${house}${suffix} House`;
};

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
  bodyYou = "",
  displayTitle
}: FallbackHookEditorGuidanceInput): FallbackHookEditorGuidance {
  const keyParts = contentKey.split("/");
  const isFallbackHookNamespace = keyParts[0] === "fallback-hook";
  const family = (isFallbackHookNamespace ? keyParts[1] : keyParts[0]) || "fallback";
  const subjectKey = (isFallbackHookNamespace ? keyParts[2] : keyParts[1]) || "this item";
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

  if (family === "daily-headline" || family === "daily-body") {
    const isHeadline = family === "daily-headline";
    const context = keyParts[2] || "daily driver";
    const subjectKey = keyParts[3] || "source";
    const selector = context === "house"
      ? `${houseLabel(subjectKey)} fallback`
      : `${titleCase(subjectKey)} ${titleCase(context)} Moon contact`;

    return {
      ...shared,
      area: `Daily At-a-Glance · ${isHeadline ? "headline" : "passage"}`,
      title: displayTitle ?? `${selector} · Daily At-a-Glance`,
      description: `Shown on You > Daily At-a-Glance and on a selected friend’s Daily card. The app first chooses the Moon’s tightest applying contact to a natal point; when none qualifies, it uses the Moon’s current house. This row is the ${isHeadline ? "headline" : "passage"} for the ${selector.toLowerCase()}.`,
      writingRule: isHeadline
        ? "Write one short, complete headline in plain language. Do not name the Moon, aspect, point, or house—the reader sees guidance, not the selection rule."
        : "Write one complete, concrete daily passage in plain language. Do not name the Moon, aspect, point, or house—the reader sees guidance, not the selection rule.",
      example: bodyYou.trim() || undefined,
      summaryLabel: "Internal history",
      summaryHint: "Package provenance and review history. Readers never see it; leave it unchanged unless you are documenting editorial provenance.",
      bodyYouLabel: `${isHeadline ? "Headline" : "Passage"} · You`,
      bodyYouHint: "Used on the signed-in reader’s Daily At-a-Glance card.",
      bodyTheyLabel: `${isHeadline ? "Headline" : "Passage"} · Friend`,
      bodyTheyHint: "Used for the selected person’s Daily card. Keep the meaning parallel to You; person-name variables are filled by the app.",
      audienceLabel: "Assembly",
      audienceHint: `Moon-driven selector → this ${isHeadline ? "headline" : "passage"} → Daily At-a-Glance card. The headline and passage are selected as a matching pair.`
    };
  }

  if (family === "pair-daily") {
    const piece = keyParts[2] || "source";
    const pieceGuidance: Record<string, { area: string; description: string; writingRule: string; assembly: string; you: string; they: string }> = {
      clause: {
        area: "Today between you two · personal clause",
        description: "One Moon-driven ingredient for Friends > selected person > Today between you two. The app selects one clause for you and one for your friend, then inserts both into an opening frame.",
        writingRule: "Write a short clause that fits inside a larger sentence. Keep You and Friend parallel; do not add dates, transit windows, or a standalone headline.",
        assembly: "Your daily driver + friend’s daily driver → two personal clauses → opening frame.",
        you: "Inserted as your side of the shared daily sentence.",
        they: "Inserted as the selected friend’s side of the shared daily sentence."
      },
      opener: {
        area: "Today between you two · opening frame",
        description: "The main sentence frame for the shared daily reading. The app fills it with the selected You and Friend clauses and, for some frames, a shared clause.",
        writingRule: "Write a complete frame and preserve every {{slot}}. The app replaces the handles and clauses; removing a slot removes that part of the reading.",
        assembly: "Selected personal clauses → this opening frame → optional shared bridge → optional closing advice.",
        you: "Primary frame used for the reader-facing shared daily passage.",
        they: "Parallel reference where supplied; the pair surface normally assembles one shared passage."
      },
      "shared-bond": {
        area: "Today between you two · shared bond bridge",
        description: "Optional shared context chosen when a current bond transit is the strongest shared signal between both charts.",
        writingRule: "Write a complete bridge and preserve {{bondClause}}. It must follow the opening naturally and work without a date or transit-window explanation.",
        assembly: "Strongest shared bond transit → this bridge + matching bond detail.",
        you: "Shared bridge in the combined reading.",
        they: "Parallel shared bridge where supplied."
      },
      "bond-clause": {
        area: "Today between you two · bond detail",
        description: "A planet-specific detail inserted into the matching soft or hard shared-bond bridge.",
        writingRule: "Write a short phrase or clause that fits inside the shared bridge. Do not repeat the opening or add a date.",
        assembly: "Strongest bond planet + soft/hard family → this detail → shared-bond bridge.",
        you: "Inserted into the shared bridge.",
        they: "Parallel detail where supplied."
      },
      "shared-moon": {
        area: "Today between you two · shared Moon bridge",
        description: "Optional shared context used when the current Moon contacts both charts and no stronger bond-transit bridge is selected.",
        writingRule: "Write one complete shared sentence. Keep it relational and concrete; do not explain the underlying calculation.",
        assembly: "Shared Moon element → this bridge after the opening.",
        you: "Shared bridge in the combined reading.",
        they: "Parallel shared bridge where supplied."
      },
      close: {
        area: "Today between you two · closing advice",
        description: "Optional final advice used only for a hard shared Saturn or Mercury bond signal.",
        writingRule: "Write one concise, actionable closing sentence that can follow the shared bridge.",
        assembly: "Hard Saturn or Mercury shared signal → this final sentence.",
        you: "Closing advice in the combined reading.",
        they: "Parallel closing advice where supplied."
      }
    };
    const guidance = pieceGuidance[piece] ?? pieceGuidance.clause;

    return {
      ...shared,
      area: guidance.area,
      title: displayTitle ?? "Today between you two source",
      description: guidance.description,
      writingRule: guidance.writingRule,
      example: bodyYou.trim() || undefined,
      summaryLabel: "Internal history",
      summaryHint: "Package provenance and review history. Readers never see it; leave it unchanged unless you are documenting editorial provenance.",
      bodyYouLabel: piece === "clause" ? "Clause · You" : "Shared copy · You",
      bodyYouHint: guidance.you,
      bodyTheyLabel: piece === "clause" ? "Clause · Friend" : "Shared copy · Friend",
      bodyTheyHint: guidance.they,
      audienceLabel: "Assembly",
      audienceHint: guidance.assembly
    };
  }

  if (family === "house-horoscope-core") {
    const [, planetKey = "planet", signKey = "sign", houseKey = "house"] = keyParts;
    const planet = titleCase(planetKey);
    const sign = titleCase(signKey);
    const house = houseLabel(houseKey);

    return {
      ...shared,
      area: "Current Sky · personal house horoscope",
      title: `${planet} in ${sign} · ${house}`,
      description: "This saved passage appears when this Sky placement activates the matching house in the signed-in reader’s chart.",
      writingRule: "Write one complete second-person passage. Speak directly to the reader as “you” and make the house topic concrete.",
      example: bodyYou.trim() || undefined,
      bodyYouLabel: "Reader passage · You",
      bodyYouHint: "Shown in the personal Sky feed after the app calculates which house this placement activates for the reader.",
      bodyTheyLabel: "Not used for this source",
      bodyTheyHint: "Friend and relationship readings use separate source families.",
      audienceLabel: "Current source: You",
      audienceHint: "This exact Current Sky record speaks to the signed-in reader. Friends also has horoscope content, but it uses separate They-facing transit-house and relationship sources; those records are edited separately."
    };
  }

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
