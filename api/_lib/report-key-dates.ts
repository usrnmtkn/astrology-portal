import type { ReportDomain, ReportDraft, ReportHorizon } from "./report-generation.ts";

export type ReportKeyDateSourceUnit = {
  unitId: string;
  draft: ReportDraft;
};

export function filterReportKeyDateAssemblyEligibility(input: {
  sourceUnits: ReportKeyDateSourceUnit[];
  eligibleEventIds: Iterable<string>;
  interpretedEventIds: Iterable<string>;
  canonicalEligibleEventIds: Iterable<string>;
}) {
  const canonical = new Set(input.canonicalEligibleEventIds);
  return {
    sourceUnits: input.sourceUnits.map((unit) => ({
      ...unit,
      draft: {
        ...unit.draft,
        keyDates: (unit.draft.keyDates ?? []).filter((entry) => canonical.has(entry.eventId))
      }
    })),
    eligibleEventIds: [...new Set(input.eligibleEventIds)].filter((eventId) => canonical.has(eventId)),
    interpretedEventIds: [...new Set(input.interpretedEventIds)].filter((eventId) => canonical.has(eventId))
  };
}

export type ReportKeyDateEventManifestEntry = {
  eventId: string;
  factorId: string;
  occursAt: string;
  dateLabel: string;
  attribution: string;
  sourceUnitId: string | null;
};

type FactRecord = Record<string, unknown>;

type LocatedSentence = {
  unitId: string;
  title: string;
  text: string;
  sentences: string[];
  sentenceIndex: number;
};

type KeyDateEvent = {
  id: string;
  factorId: string;
  occursAt: string;
  sortAt: number;
  attribution: string;
  priority: number;
  matches: (sentence: string) => boolean;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

const SOURCE_UNIT_IDS: Record<ReportHorizon, readonly string[]> = {
  "1_month": ["what-matters-most", "domain:main"],
  "4_months": ["development:1", "development:2", "closing-synthesis"],
  "6_months": ["phase-1", "phase-2", "review"],
  "12_months": ["winter-current", "spring", "summer", "autumn", "winter-next"]
};

// Calibrated only to the owner-authored General Year Ahead benchmark. Focused
// deep-dive products retain their own Key Date behavior until separately
// calibrated against their owner references.
const TWELVE_MONTH_GENERAL_KEY_DATE_UNIT_CAPS: Record<string, number> = {
  "winter-current": 3,
  spring: 4,
  summer: 5,
  autumn: 4,
  "winter-next": 3
};

function record(value: unknown): FactRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as FactRecord : null;
}

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
}

function hasTerm(value: string, term: string) {
  const haystack = ` ${normalized(value)} `;
  const needle = ` ${normalized(term)} `;
  return haystack.includes(needle);
}

function sentenceList(value: string) {
  return value.match(/[^.!?]+[.!?]?/gu)?.map((entry) => entry.trim()).filter(Boolean) ?? [];
}

function titleFromHeading(value: string) {
  const stripped = value.trim().replace(/^(?:winter|spring|summer|autumn)(?:\s+\d{4})?\s*:\s*/iu, "").trim();
  return stripped || value.trim();
}

function locatedSentences(unit: ReportKeyDateSourceUnit): LocatedSentence[] {
  const fields = [
    { title: titleFromHeading(unit.draft.headline ?? unit.unitId), text: unit.draft.body ?? "" },
    ...(unit.draft.sections ?? []).map((section) => ({
      title: titleFromHeading(section.heading ?? unit.draft.headline ?? unit.unitId),
      text: section.body ?? ""
    }))
  ];
  return fields.flatMap((field) => field.text.split(/\n\s*\n/gu).flatMap((paragraph) => {
    const sentences = sentenceList(paragraph);
    return sentences.map((text, sentenceIndex) => ({ unitId: unit.unitId, ...field, text, sentences, sentenceIndex }));
  }));
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function passOrdinal(index: number, count: number) {
  if (index === count - 1) return "final";
  return ["first", "second", "third", "fourth", "fifth"][index] ?? ordinal(index + 1);
}

function dateLabel(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error(`REPORT_KEY_DATES_INVALID_DATE: ${iso}`);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function aspectWords(aspect: string) {
  const values: Record<string, string[]> = {
    conjunction: ["conjoin", "conjoins", "conjunction"],
    opposition: ["oppose", "opposes", "opposition"],
    square: ["square", "squares"],
    trine: ["trine", "trines"],
    sextile: ["sextile", "sextiles"]
  };
  return values[aspect.toLowerCase()] ?? [aspect];
}

function aspectVerb(aspect: string) {
  const values: Record<string, string> = {
    conjunction: "conjoins",
    opposition: "opposes",
    square: "squares",
    trine: "trines",
    sextile: "sextiles"
  };
  return values[aspect.toLowerCase()] ?? aspect;
}

function slowTransitPriority(input: {
  aspect: string;
  isReturn: boolean;
  natalPoint: string;
  passCount: number;
}) {
  if (input.isReturn) return 100;
  if (input.passCount > 1) return 95;
  if (["conjunction", "opposition", "square"].includes(input.aspect.toLowerCase())) return 90;
  if (["ascendant", "midheaven", "descendant", "ic"].includes(input.natalPoint.toLowerCase())) return 75;
  return 80;
}

function slowTransitEvents(root: FactRecord): KeyDateEvent[] {
  const arcs = Array.isArray(root.slowTransitArcs) ? root.slowTransitArcs.map(record).filter(Boolean) as FactRecord[] : [];
  return arcs.flatMap((arc) => {
    const planet = words(arc.transitPlanet);
    const natalPoint = words(arc.natalPoint);
    const aspect = words(arc.aspect);
    const isReturn = arc.isReturn === true;
    const passes = Array.isArray(arc.passes) ? arc.passes.map(record).filter(Boolean) as FactRecord[] : [];
    const priority = slowTransitPriority({ aspect, isReturn, natalPoint, passCount: passes.length });
    return passes.flatMap((pass, passIndex) => {
      const exactAt = words(pass.exactAt);
      if (!planet || !natalPoint || !exactAt) return [];
      const motion = words(pass.motion).toLowerCase();
      const passClause = passes.length > 1 ? `, the ${passOrdinal(passIndex, passes.length)} of ${passes.length} passes` : "";
      const attribution = isReturn
        ? `${planet}${motion === "retrograde" ? " retrograde" : ""} returns to your natal ${natalPoint}${passClause}.`
        : `${planet}${motion === "retrograde" ? " retrograde" : ""} ${aspectVerb(aspect)} your natal ${natalPoint}${passClause}.`;
      return [{
        id: `${words(arc.id) || `${planet}-${aspect}-${natalPoint}`}:${passIndex}`,
        factorId: words(arc.id) || `${planet}-${aspect}-${natalPoint}`,
        occursAt: exactAt,
        sortAt: Date.parse(exactAt),
        attribution,
        priority,
        matches: (sentence: string) => {
          if (!hasTerm(sentence, planet)) return false;
          if (isReturn) return /\breturn(?:s|ed|ing)?\b/iu.test(sentence)
            && (hasTerm(sentence, natalPoint) || /\bnatal position\b/iu.test(sentence));
          return hasTerm(sentence, natalPoint) && aspectWords(aspect).some((term) => hasTerm(sentence, term));
        }
      } satisfies KeyDateEvent];
    });
  });
}

function eclipseEvents(root: FactRecord): KeyDateEvent[] {
  const lunarEvents = Array.isArray(root.lunarEvents) ? root.lunarEvents.map(record).filter(Boolean) as FactRecord[] : [];
  return lunarEvents.flatMap((event) => {
    const kind = words(event.kind);
    const occursAt = words(event.occursAt);
    if (!/_eclipse$/u.test(kind) || !occursAt) return [];
    const eclipseKind = kind.replace("_eclipse", "");
    const contacts = Array.isArray(event.natalContacts) ? event.natalContacts.map(record).filter(Boolean) as FactRecord[] : [];
    const conjunction = contacts.find((contact) => words(contact.aspect).toLowerCase() === "conjunction" && words(contact.natalPoint));
    const natalPoint = conjunction ? words(conjunction.natalPoint) : "";
    const house = Number(event.natalHouse);
    const attribution = natalPoint
      ? `A ${eclipseKind} eclipse conjoins your natal ${natalPoint}.`
      : `A ${eclipseKind} eclipse falls in your natal ${ordinal(house)} house.`;
    return [{
      id: words(event.id) || `${kind}:${occursAt}`,
      factorId: words(event.id) || `${kind}:${occursAt}`,
      occursAt,
      sortAt: Date.parse(occursAt),
      attribution,
      priority: 100,
      matches: (sentence: string) => {
        if (!hasTerm(sentence, "eclipse") || !hasTerm(sentence, eclipseKind)) return false;
        if (natalPoint && hasTerm(sentence, natalPoint)) return true;
        return Number.isFinite(house) && new RegExp(`\\b${house}(?:st|nd|rd|th)?[ -]?house\\b`, "iu").test(sentence);
      }
    } satisfies KeyDateEvent];
  });
}

function allKeyDateEvents(root: FactRecord) {
  return [...slowTransitEvents(root), ...eclipseEvents(root)];
}

function readerSentence(located: LocatedSentence) {
  for (const next of located.sentences.slice(located.sentenceIndex + 1)) {
    if (!/\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|eclipse|profection|solar return|ascendant|midheaven)\b/iu.test(next)) {
      return next;
    }
  }
  return located.text;
}

export function reportKeyDateSourceUnitIds(horizon: ReportHorizon) {
  return SOURCE_UNIT_IDS[horizon];
}

function eventSourceUnitId(root: FactRecord, horizon: ReportHorizon, sortAt: number) {
  const sourceIds = reportKeyDateSourceUnitIds(horizon);
  const periods = Array.isArray(root.periods) ? root.periods.map(record).filter(Boolean) as FactRecord[] : [];
  if (periods.length >= sourceIds.length) {
    const index = periods.slice(0, sourceIds.length).findIndex((period) => {
      const startsAt = Date.parse(words(period.startsAt));
      const endsAt = Date.parse(words(period.endsAt));
      return Number.isFinite(startsAt) && Number.isFinite(endsAt) && sortAt >= startsAt && sortAt < endsAt;
    });
    if (index >= 0) return sourceIds[index];
  }
  const startsAt = Date.parse(words(root.startsAt));
  const endsAt = Date.parse(words(root.endsAt));
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || sortAt < startsAt || sortAt > endsAt) return null;
  if (horizon === "12_months") {
    const startYear = new Date(startsAt).getUTCFullYear();
    const endYear = new Date(endsAt).getUTCFullYear();
    const ranges = [
      [startsAt, Date.UTC(startYear, 2, 31, 23, 59, 59, 999)],
      [Date.UTC(startYear, 3, 1), Date.UTC(startYear, 5, 30, 23, 59, 59, 999)],
      [Date.UTC(startYear, 6, 1), Date.UTC(startYear, 8, 30, 23, 59, 59, 999)],
      [Date.UTC(startYear, 9, 1), Date.UTC(startYear, 11, 31, 23, 59, 59, 999)],
      [Date.UTC(endYear, 0, 1), endsAt]
    ];
    const index = ranges.findIndex(([start, end]) => sortAt >= start && sortAt <= end);
    return index >= 0 ? sourceIds[index] : null;
  }
  const progress = Math.min(0.999999, Math.max(0, (sortAt - startsAt) / Math.max(1, endsAt - startsAt)));
  return sourceIds[Math.floor(progress * sourceIds.length)] ?? null;
}

export function reportKeyDateEventManifest(
  frozenFacts: Record<string, unknown>,
  reportHorizon: ReportHorizon,
  eligibleFactorIds?: Iterable<string>
): ReportKeyDateEventManifestEntry[] {
  const root = record(frozenFacts.reportWindow) ?? frozenFacts;
  const eligible = eligibleFactorIds ? new Set(eligibleFactorIds) : null;
  return allKeyDateEvents(root)
    .filter((event) => Number.isFinite(event.sortAt))
    .filter((event) => !eligible || eligible.has(event.factorId)
      || [...eligible].some((factorId) => factorId.startsWith(`${event.factorId}-`)))
    .sort((left, right) => left.sortAt - right.sortAt || left.id.localeCompare(right.id))
    .map((event) => ({
      eventId: event.id,
      factorId: event.factorId,
      occursAt: event.occursAt,
      dateLabel: dateLabel(event.occursAt),
      attribution: event.attribution,
      sourceUnitId: eventSourceUnitId(root, reportHorizon, event.sortAt)
    }));
}

function selectExpectedKeyDateEvents(input: {
  horizon: ReportHorizon;
  reportDomain: ReportDomain;
  events: ReportKeyDateEventManifestEntry[];
  priorityByEventId: Map<string, number>;
}) {
  if (input.horizon !== "12_months" || input.reportDomain !== "general") return input.events;
  const retained = new Set<string>();
  for (const unitId of SOURCE_UNIT_IDS["12_months"]) {
    const cap = TWELVE_MONTH_GENERAL_KEY_DATE_UNIT_CAPS[unitId] ?? Number.MAX_SAFE_INTEGER;
    input.events
      .filter((event) => event.sourceUnitId === unitId)
      .sort((left, right) => {
        const priority = (input.priorityByEventId.get(right.eventId) ?? 0) - (input.priorityByEventId.get(left.eventId) ?? 0);
        if (priority) return priority;
        const recency = Date.parse(right.occursAt) - Date.parse(left.occursAt);
        return recency || left.eventId.localeCompare(right.eventId);
      })
      .slice(0, cap)
      .forEach((event) => retained.add(event.eventId));
  }
  return input.events.filter((event) => !event.sourceUnitId || retained.has(event.eventId));
}

export function assembleDeterministicReportKeyDates(input: {
  reportHorizon: ReportHorizon;
  reportDomain?: ReportDomain;
  frozenFacts: Record<string, unknown>;
  sourceUnits: ReportKeyDateSourceUnit[];
  eligibleEventIds: Iterable<string>;
  interpretedEventIds: Iterable<string>;
}): ReportDraft {
  const allowedSourceIds = new Set(reportKeyDateSourceUnitIds(input.reportHorizon));
  const root = record(input.frozenFacts.reportWindow) ?? input.frozenFacts;
  const rawEvents = allKeyDateEvents(root);
  const priorityByEventId = new Map(rawEvents.map((event) => [event.id, event.priority]));
  const allEvents = reportKeyDateEventManifest(input.frozenFacts, input.reportHorizon);
  const allEventById = new Map(allEvents.map((event) => [event.eventId, event]));
  const eligibleEventIds = new Set(input.eligibleEventIds);
  const interpretedEventIds = new Set(input.interpretedEventIds);
  for (const eventId of eligibleEventIds) {
    if (!allEventById.has(eventId)) throw new Error(`REPORT_KEY_DATES_FACT_GAP: unknown eligible event '${eventId}'.`);
  }
  for (const eventId of interpretedEventIds) {
    if (!eligibleEventIds.has(eventId)) throw new Error(`REPORT_KEY_DATES_INELIGIBLE_INTERPRETATION: '${eventId}'.`);
  }
  const interpretedEvents = allEvents.filter((event) => interpretedEventIds.has(event.eventId));
  const events = selectExpectedKeyDateEvents({
    horizon: input.reportHorizon,
    reportDomain: input.reportDomain ?? "general",
    events: interpretedEvents,
    priorityByEventId
  });
  const eventById = new Map(events.map((event) => [event.eventId, event]));
  const selectedRaw = input.sourceUnits
    .filter((unit) => allowedSourceIds.has(unit.unitId))
    .flatMap((unit) => (unit.draft.keyDates ?? []).map((entry) => ({ ...entry, unitId: unit.unitId })));
  for (const entry of selectedRaw) {
    if (!allEventById.has(entry.eventId)) throw new Error(`REPORT_KEY_DATES_UNINTERPRETED_EVENT: '${entry.eventId}' is not an eligible interpreted factor.`);
  }
  const selected = selectedRaw.filter((entry) => eventById.has(entry.eventId));
  if (!selected.length) {
    throw new Error("REPORT_KEY_DATES_SOURCE_GAP: source units emitted no structured key-date entries.");
  }
  const records: string[] = [];
  const seenEvents = new Set<string>();
  for (const entry of selected.sort((left, right) => {
    const leftEvent = eventById.get(left.eventId);
    const rightEvent = eventById.get(right.eventId);
    return (leftEvent ? Date.parse(leftEvent.occursAt) : Number.MAX_SAFE_INTEGER)
      - (rightEvent ? Date.parse(rightEvent.occursAt) : Number.MAX_SAFE_INTEGER)
      || left.eventId.localeCompare(right.eventId);
  })) {
    const event = eventById.get(entry.eventId);
    if (!event) throw new Error(`REPORT_KEY_DATES_UNINTERPRETED_EVENT: '${entry.eventId}' is not an eligible interpreted factor.`);
    if (event.sourceUnitId && event.sourceUnitId !== entry.unitId) {
      throw new Error(`REPORT_KEY_DATES_UNIT_MISMATCH: '${entry.eventId}' belongs to ${event.sourceUnitId}, not ${entry.unitId}.`);
    }
    if (seenEvents.has(entry.eventId)) throw new Error(`REPORT_KEY_DATES_DUPLICATE_EVENT: '${entry.eventId}'.`);
    seenEvents.add(entry.eventId);
    const title = entry.title.trim();
    const sentence = entry.sentence.trim();
    if (!title || !sentence) throw new Error(`REPORT_KEY_DATES_EMPTY_COPY: '${entry.eventId}'.`);
    records.push(`**${event.dateLabel} · ${title}** · ${sentence} · *${event.attribution}*`);
  }
  const missingEvents = events.filter((event) => event.sourceUnitId && !seenEvents.has(event.eventId));
  if (missingEvents.length) {
    throw new Error(`REPORT_KEY_DATES_MISSING_EVENTS: ${missingEvents.map((event) => `${event.dateLabel}:${event.eventId}`).join(", ")}`);
  }
  return {
    headline: "KEY DATES",
    summary: "",
    body: records.join("\n\n"),
    sections: []
  };
}
