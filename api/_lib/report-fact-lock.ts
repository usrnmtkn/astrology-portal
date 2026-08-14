import type { ReportDraft } from "./report-generation.ts";

export type ReportFactLockIssue = { code: "untraceable_date" | "untraceable_degree" | "untraceable_attribution"; value: string; message: string };

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(strings);
  return [];
}

function draftText(draft: ReportDraft, omitTiming = false) {
  return [draft.headline, draft.tldr, draft.summary, draft.body, draft.action, omitTiming ? "" : draft.timing, ...(draft.sections ?? []).flatMap((section) => [section.heading, section.body])].filter(Boolean).join("\n");
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function attributionMatchesFacts(attribution: string, facts: Record<string, unknown>) {
  const root = recordValue(facts.reportWindow) ?? facts;
  const arcs = Array.isArray(root.slowTransitArcs) ? root.slowTransitArcs.map(recordValue).filter(Boolean) as Record<string, unknown>[] : [];
  const events = Array.isArray(root.lunarEvents) ? root.lunarEvents.map(recordValue).filter(Boolean) as Record<string, unknown>[] : [];
  const transit = attribution.match(/\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron)\s+(?:retrograde\s+)?(conjuncts?|opposes?|squares?|trines?|sextiles?|returns?)\s+(?:to\s+)?(?:your\s+)?natal\s+(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|ascendant|midheaven)\b/iu);
  if (transit) {
    const [, planet, rawAspect, natalPoint] = transit;
    const aspect = ({ conjunct: "conjunction", conjuncts: "conjunction", opposes: "opposition", square: "square", squares: "square", trine: "trine", trines: "trine", sextile: "sextile", sextiles: "sextile", return: "return", returns: "return" } as Record<string, string>)[rawAspect.toLowerCase()] ?? rawAspect.toLowerCase();
    return arcs.some((arc) => String(arc.transitPlanet).toLowerCase() === planet.toLowerCase()
      && String(arc.natalPoint).toLowerCase() === natalPoint.toLowerCase()
      && (aspect === "return" ? arc.isReturn === true : String(arc.aspect).toLowerCase() === aspect));
  }
  const eclipsePoint = attribution.match(/\b(solar|lunar)\s+eclipse\b.*\bnatal\s+(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|ascendant|midheaven)\b/iu);
  if (eclipsePoint) {
    const [, kind, point] = eclipsePoint;
    return events.some((event) => String(event.kind).toLowerCase() === `${kind.toLowerCase()}_eclipse`
      && (Array.isArray(event.natalContacts) ? event.natalContacts : []).some((contact) => String(recordValue(contact)?.natalPoint).toLowerCase() === point.toLowerCase()));
  }
  return null;
}

function dateTokens(facts: Record<string, unknown>) {
  const tokens = new Set<string>();
  const monthLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (const value of strings(facts)) {
    const date = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}/u.test(value) || !Number.isFinite(date.getTime())) continue;
    const day = date.getUTCDate();
    tokens.add(`${monthLong[date.getUTCMonth()]} ${day}`.toLowerCase());
    tokens.add(`${monthShort[date.getUTCMonth()]} ${day}`.toLowerCase());
    tokens.add(value.slice(0, 10).toLowerCase());
  }
  return tokens;
}

export function verifyReportFactLock(
  draft: ReportDraft,
  facts: Record<string, unknown>,
  options: { trustedTiming?: string } = {}
) {
  const timingIsGoverned = typeof options.trustedTiming === "string"
    && draft.timing?.trim() === options.trustedTiming;
  const text = draftText(draft, timingIsGoverned);
  const allowedDates = dateTokens(facts);
  const factsText = JSON.stringify(facts);
  const normalizedFacts = factsText.toLowerCase().replace(/[^a-z0-9]+/gu, " ");
  const issues: ReportFactLockIssue[] = [];
  const dates = text.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/giu) ?? [];
  for (const date of dates) if (!allowedDates.has(date.toLowerCase())) issues.push({ code: "untraceable_date", value: date, message: `${date} is not present in the scoped frozen facts.` });
  const degrees = text.match(/\b\d{1,3}(?:\.\d+)?°/gu) ?? [];
  for (const degree of degrees) {
    const numeric = degree.slice(0, -1);
    if (!factsText.includes(numeric)) issues.push({ code: "untraceable_degree", value: degree, message: `${degree} is not traceable to the scoped frozen facts.` });
  }
  const attributionTerms = new Set([
    "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron",
    "ascendant", "midheaven", "eclipse", "retrograde", "conjunction", "opposition", "square", "trine", "sextile", "return"
  ]);
  const aliases: Record<string, string> = {
    conjunct: "conjunction", conjuncts: "conjunction", opposes: "opposition", opposed: "opposition",
    squares: "square", trines: "trine", sextiles: "sextile", returns: "return"
  };
  const attributionLines = text.split("\n").filter((line) => line.includes("·") && /\*[^*]+\*/u.test(line));
  for (const line of attributionLines) {
    const attribution = line.match(/\*([^*]+)\*\s*$/u)?.[1] ?? "";
    const structuredMatch = attributionMatchesFacts(attribution, facts);
    const required = attribution.toLowerCase().match(/[a-z]+/gu)?.map((term) => aliases[term] ?? term)
      .filter((term) => attributionTerms.has(term)) ?? [];
    const missing = [...new Set(required.filter((term) => !normalizedFacts.includes(term)))];
    if (structuredMatch === false || missing.length) {
      issues.push({
        code: "untraceable_attribution",
        value: attribution,
        message: structuredMatch === false
          ? "The attribution does not match a transit or eclipse in the scoped frozen facts."
          : `Attribution terms are not traceable to the scoped frozen facts: ${missing.join(", ")}.`
      });
    }
  }
  return { passed: issues.length === 0, issues };
}
