import type { ReportDraft, ReportHorizon } from "./report-generation.ts";

export type ReportKeyDateSourceUnit = {
  unitId: string;
  draft: ReportDraft;
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
  occursAt: string;
  sortAt: number;
  attribution: string;
  matches: (sentence: string) => boolean;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

const SOURCE_UNIT_IDS: Record<ReportHorizon, readonly string[]> = {
  "1_month": ["what-matters-most", "domain:main"],
  "4_months": ["development:1", "development:2", "closing-synthesis"],
  "6_months": ["phase-1", "phase-2", "review"],
  "12_months": ["winter-current", "spring", "summer", "autumn", "winter-next"]
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

function slowTransitEvents(root: FactRecord): KeyDateEvent[] {
  const arcs = Array.isArray(root.slowTransitArcs) ? root.slowTransitArcs.map(record).filter(Boolean) as FactRecord[] : [];
  return arcs.flatMap((arc) => {
    const planet = words(arc.transitPlanet);
    const natalPoint = words(arc.natalPoint);
    const aspect = words(arc.aspect);
    const isReturn = arc.isReturn === true;
    const passes = Array.isArray(arc.passes) ? arc.passes.map(record).filter(Boolean) as FactRecord[] : [];
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
        occursAt: exactAt,
        sortAt: Date.parse(exactAt),
        attribution,
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
      occursAt,
      sortAt: Date.parse(occursAt),
      attribution,
      matches: (sentence: string) => {
        if (!hasTerm(sentence, "eclipse") || !hasTerm(sentence, eclipseKind)) return false;
        if (natalPoint && hasTerm(sentence, natalPoint)) return true;
        return Number.isFinite(house) && new RegExp(`\\b${house}(?:st|nd|rd|th)?[ -]?house\\b`, "iu").test(sentence);
      }
    } satisfies KeyDateEvent];
  });
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

export function assembleDeterministicReportKeyDates(input: {
  reportHorizon: ReportHorizon;
  frozenFacts: Record<string, unknown>;
  sourceUnits: ReportKeyDateSourceUnit[];
}): ReportDraft {
  const root = record(input.frozenFacts.reportWindow) ?? input.frozenFacts;
  const allowedSourceIds = new Set(reportKeyDateSourceUnitIds(input.reportHorizon));
  const orderedSourceIds = reportKeyDateSourceUnitIds(input.reportHorizon);
  const sourceSentences = input.sourceUnits
    .filter((unit) => allowedSourceIds.has(unit.unitId))
    .flatMap(locatedSentences);
  const events = [...slowTransitEvents(root), ...eclipseEvents(root)]
    .filter((event) => Number.isFinite(event.sortAt))
    .sort((left, right) => left.sortAt - right.sortAt || left.id.localeCompare(right.id));
  const records: string[] = [];
  const seenEvents = new Set<string>();
  const periods = Array.isArray(root.periods) ? root.periods.map(record).filter(Boolean) as FactRecord[] : [];
  const periodSourceUnitId = periods.length >= orderedSourceIds.length
    ? (sortAt: number) => {
      const index = periods.slice(0, orderedSourceIds.length).findIndex((period) => {
        const startsAt = Date.parse(words(period.startsAt));
        const endsAt = Date.parse(words(period.endsAt));
        return Number.isFinite(startsAt) && Number.isFinite(endsAt) && sortAt >= startsAt && sortAt < endsAt;
      });
      return index >= 0 ? orderedSourceIds[index] : null;
    }
    : () => null;
  for (const event of events) {
    const seasonalSourceId = periodSourceUnitId(event.sortAt);
    const source = sourceSentences.find((sentence) => (
      (!seasonalSourceId || sentence.unitId === seasonalSourceId) && event.matches(sentence.text)
    ));
    if (!source || seenEvents.has(event.id)) continue;
    seenEvents.add(event.id);
    records.push(`**${dateLabel(event.occursAt)} · ${source.title}** · ${readerSentence(source)} · *${event.attribution}*`);
  }
  if (!records.length) {
    throw new Error("REPORT_KEY_DATES_SOURCE_GAP: no frozen event could be matched to an approved source-unit entry.");
  }
  return {
    headline: "KEY DATES",
    summary: "",
    body: records.join("\n\n"),
    sections: []
  };
}
