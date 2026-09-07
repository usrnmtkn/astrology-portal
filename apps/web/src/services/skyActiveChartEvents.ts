export type SkyActiveChartAspect = {
  key: string;
  heading: string;
  body: string | null;
};

export type SkyActiveChartEvent = {
  key: string;
  type: "single" | "nodal-axis";
  heading: string;
  body: string | null;
  dateLabel: string | null;
  memberKeys: string[];
  memberHeadings: string[];
};

type ParsedNodeHeading = {
  transit: string;
  aspect: "conjunction" | "opposition" | "square" | "trine" | "sextile";
  node: "north" | "south";
};

const mirrorNodeAspect: Record<ParsedNodeHeading["aspect"], ParsedNodeHeading["aspect"]> = {
  conjunction: "opposition",
  opposition: "conjunction",
  square: "square",
  trine: "sextile",
  sextile: "trine"
};

const monthPattern = "January|February|March|April|May|June|July|August|September|October|November|December";
const timingPattern = new RegExp(`\\b(?:until|through)\\s+((?:${monthPattern})\\s+\\d{1,2}(?:,\\s+\\d{4})?)`, "iu");
const houseFramePattern = /^While\s+.+?\s+(?:is\s+in|moves\s+through)\s+your\s+\d+(?:st|nd|rd|th)\s+house,\s+it\s+is\s+also\s+/iu;

function canonicalAspect(value: string): ParsedNodeHeading["aspect"] | null {
  const normalized = value.toLowerCase();
  if (normalized === "conjunction" || normalized === "conjunct") return "conjunction";
  if (normalized === "opposition" || normalized === "opposite") return "opposition";
  if (normalized === "square" || normalized === "squaring") return "square";
  if (normalized === "trine" || normalized === "trining") return "trine";
  if (normalized === "sextile" || normalized === "sextiling") return "sextile";
  return null;
}

function parseNodeHeading(heading: string): ParsedNodeHeading | null {
  const match = heading.trim().match(
    /^(.+?)\s+(conjunction|conjunct|opposition|opposite|square|squaring|trine|trining|sextile|sextiling)\s+(?:your\s+)?(?:natal\s+)?(north|south)\s+node$/iu
  );
  if (!match) return null;

  const aspect = canonicalAspect(match[2]);
  if (!aspect) return null;

  return {
    transit: match[1].trim().toLowerCase().replace(/\s+/gu, " "),
    aspect,
    node: match[3].toLowerCase() as "north" | "south"
  };
}

function firstSentence(value: string) {
  const match = value.match(/^.*?[.!?](?:\s+|$)/u);
  return match?.[0]?.trim() ?? "";
}

export function compactSkyActiveChartBody(body: string | null) {
  if (!body?.trim()) return null;

  const trimmed = body.trim();
  const openingSentence = firstSentence(trimmed);
  if (!openingSentence || !houseFramePattern.test(openingSentence)) {
    return trimmed;
  }

  const compact = trimmed.slice(openingSentence.length).trimStart();
  return compact || trimmed;
}

export function skyActiveChartDateLabel(body: string | null) {
  if (!body) return null;
  const match = body.match(timingPattern);
  return match ? `Through ${match[1]}` : null;
}

function normalizeClause(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
}

function capitalizeFirst(value: string) {
  const trimmed = value.trim();
  return trimmed ? `${trimmed[0].toUpperCase()}${trimmed.slice(1)}` : "";
}

function sentenceFromClause(value: string) {
  const trimmed = value.trim().replace(/[;,]+$/u, "");
  if (!trimmed) return "";
  return /[.!?]$/u.test(trimmed) ? capitalizeFirst(trimmed) : `${capitalizeFirst(trimmed)}.`;
}

function combineNodalBodies(first: string | null, second: string | null) {
  const firstBody = compactSkyActiveChartBody(first);
  const secondBody = compactSkyActiveChartBody(second);
  if (!firstBody) return secondBody;
  if (!secondBody) return firstBody;
  if (normalizeClause(firstBody) === normalizeClause(secondBody)) return firstBody;

  const firstBreak = firstBody.indexOf(";");
  const secondBreak = secondBody.indexOf(";");
  if (firstBreak > 0 && secondBreak > 0) {
    const firstLead = firstBody.slice(0, firstBreak);
    const secondLead = secondBody.slice(0, secondBreak);
    if (normalizeClause(firstLead) === normalizeClause(secondLead)) {
      const sharedLead = sentenceFromClause(firstLead);
      const firstRest = capitalizeFirst(firstBody.slice(firstBreak + 1));
      const secondRest = capitalizeFirst(secondBody.slice(secondBreak + 1));
      return [
        [sharedLead, firstRest].filter(Boolean).join(" "),
        secondRest
      ].filter(Boolean).join("\n\n");
    }
  }

  return `${firstBody}\n\n${secondBody}`;
}

function sharedDateLabel(aspects: SkyActiveChartAspect[]) {
  const labels = [...new Set(aspects.map((aspect) => skyActiveChartDateLabel(aspect.body)).filter(Boolean))];
  return labels.length === 1 ? labels[0] ?? null : null;
}

function singleEvent(aspect: SkyActiveChartAspect): SkyActiveChartEvent {
  return {
    key: aspect.key,
    type: "single",
    heading: aspect.heading,
    body: compactSkyActiveChartBody(aspect.body),
    dateLabel: skyActiveChartDateLabel(aspect.body),
    memberKeys: [aspect.key],
    memberHeadings: [aspect.heading]
  };
}

export function skyActiveChartEvents(aspects: SkyActiveChartAspect[]): SkyActiveChartEvent[] {
  const consumed = new Set<number>();
  const events: SkyActiveChartEvent[] = [];

  for (let index = 0; index < aspects.length; index += 1) {
    if (consumed.has(index)) continue;

    const aspect = aspects[index];
    const parsed = parseNodeHeading(aspect.heading);
    if (!parsed) {
      events.push(singleEvent(aspect));
      continue;
    }

    const counterpartIndex = aspects.findIndex((candidate, candidateIndex) => {
      if (candidateIndex === index || consumed.has(candidateIndex)) return false;
      const counterpart = parseNodeHeading(candidate.heading);
      return Boolean(
        counterpart
        && counterpart.transit === parsed.transit
        && counterpart.node !== parsed.node
        && counterpart.aspect === mirrorNodeAspect[parsed.aspect]
      );
    });

    if (counterpartIndex < 0) {
      events.push(singleEvent(aspect));
      continue;
    }

    consumed.add(counterpartIndex);
    const counterpart = aspects[counterpartIndex];
    const orderedMembers = parsed.node === "north"
      ? [aspect, counterpart]
      : [counterpart, aspect];

    events.push({
      key: `nodal-axis:${orderedMembers.map((member) => member.key).join(":")}`,
      type: "nodal-axis",
      heading: orderedMembers.map((member) => member.heading).join(" · "),
      body: combineNodalBodies(orderedMembers[0].body, orderedMembers[1].body),
      dateLabel: sharedDateLabel(orderedMembers),
      memberKeys: orderedMembers.map((member) => member.key),
      memberHeadings: orderedMembers.map((member) => member.heading)
    });
  }

  return events;
}
