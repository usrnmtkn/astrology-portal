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
};

type NodeHeading = [transit: string, aspect: string, node: "north" | "south"];

const nodePattern = /^(.+?)\s+(conjunction|conjunct|opposition|opposite|square|trine|sextile)\s+(?:your\s+)?(?:natal\s+)?(north|south)\s+node$/iu;
const datePattern = /\b(?:until|through)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?)/iu;
const framePattern = /^While\s+.+?\s+(?:is\s+in|moves\s+through)\s+your\s+\d+(?:st|nd|rd|th)\s+house,\s+it\s+is\s+also\s+.*?[.!?]\s*/iu;

function parseNode(heading: string): NodeHeading | null {
  const match = heading.trim().match(nodePattern);
  if (!match) return null;
  const raw = match[2].toLowerCase();
  const aspect = raw === "conjunct" ? "conjunction" : raw === "opposite" ? "opposition" : raw;
  return [match[1].trim().toLowerCase(), aspect, match[3].toLowerCase() as "north" | "south"];
}

function mirrored(first: string, second: string) {
  return first === second && first === "square"
    || first === "conjunction" && second === "opposition"
    || first === "opposition" && second === "conjunction"
    || first === "trine" && second === "sextile"
    || first === "sextile" && second === "trine";
}

function compact(body: string | null) {
  if (!body?.trim()) return { body: null, dateLabel: null };
  const source = body.trim();
  const date = source.match(datePattern)?.[1] ?? null;
  const shortened = source.replace(framePattern, "").trim();
  return { body: shortened || source, dateLabel: date ? `Through ${date}` : null };
}

function combine(first: string | null, second: string | null) {
  if (!first) return second;
  if (!second || first === second) return first;
  const firstBreak = first.indexOf(";");
  const secondBreak = second.indexOf(";");
  if (firstBreak > 0 && first.slice(0, firstBreak) === second.slice(0, secondBreak)) {
    return `${first.slice(0, firstBreak)}. ${first.slice(firstBreak + 1).trim()}\n\n${second.slice(secondBreak + 1).trim()}`;
  }
  return `${first}\n\n${second}`;
}

function single(aspect: SkyActiveChartAspect): SkyActiveChartEvent {
  const copy = compact(aspect.body);
  return { key: aspect.key, type: "single", heading: aspect.heading, ...copy, memberKeys: [aspect.key] };
}

export function skyActiveChartEvents(aspects: SkyActiveChartAspect[]): SkyActiveChartEvent[] {
  const used = new Set<number>();
  const events: SkyActiveChartEvent[] = [];

  aspects.forEach((aspect, index) => {
    if (used.has(index)) return;
    const parsed = parseNode(aspect.heading);
    const matchIndex = parsed ? aspects.findIndex((candidate, candidateIndex) => {
      if (candidateIndex === index || used.has(candidateIndex)) return false;
      const other = parseNode(candidate.heading);
      return Boolean(other && parsed[0] === other[0] && parsed[2] !== other[2] && mirrored(parsed[1], other[1]));
    }) : -1;

    if (matchIndex < 0 || !parsed) {
      events.push(single(aspect));
      return;
    }

    used.add(matchIndex);
    const match = aspects[matchIndex];
    const ordered = parsed[2] === "north" ? [aspect, match] : [match, aspect];
    const first = compact(ordered[0].body);
    const second = compact(ordered[1].body);
    events.push({
      key: `nodal-axis:${ordered.map((member) => member.key).join(":")}`,
      type: "nodal-axis",
      heading: ordered.map((member) => member.heading).join(" · "),
      body: combine(first.body, second.body),
      dateLabel: first.dateLabel === second.dateLabel ? first.dateLabel : null,
      memberKeys: ordered.map((member) => member.key)
    });
  });

  return events;
}
