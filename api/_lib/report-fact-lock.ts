import type { ReportDraft } from "./report-generation.ts";
import { canonicalReportEvents, type CanonicalReportEvent } from "./report-events.ts";

export type ReportFactLockIssue = { code: "untraceable_date" | "untraceable_degree" | "untraceable_attribution" | "unresolved_event_tuple"; value: string; message: string };

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(strings);
  return [];
}

function draftText(draft: ReportDraft, omitTiming = false) {
  return [draft.headline, draft.tldr, draft.summary, draft.body, draft.action, omitTiming ? "" : draft.timing, ...(draft.sections ?? []).flatMap((section) => [section.heading, section.body])].filter(Boolean).join("\n");
}

function eventDateLabels(event: CanonicalReportEvent) {
  const date = new Date(`${event.date}T00:00:00Z`);
  return new Set([
    event.date.toLowerCase(),
    date.toLocaleString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).toLowerCase(),
    date.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toLowerCase()
  ]);
}

function tupleCandidates(line: string, attribution: string, facts: Record<string, unknown>) {
  const normalized = attribution.toLowerCase();
  const aliases: Record<string, string> = { conjunct: "conjunction", conjoins: "conjunction", conjuncts: "conjunction", opposes: "opposition", square: "square", squares: "square", trine: "trine", trines: "trine", sextile: "sextile", sextiles: "sextile", returns: "return" };
  const aspectWord = normalized.match(/\b(conjunction|conjuncts?|conjoins|opposition|opposes|squares?|trines?|sextiles?|returns?)\b/u)?.[1];
  const aspect = aspectWord ? aliases[aspectWord] ?? aspectWord : normalized.includes("eclipse") ? null : "";
  const pass = normalized.match(/\bpass\s+(\d+)\s+of\s+(\d+)\b/u);
  const house = normalized.match(/\b(?:natal\s+)?(\d+)(?:st|nd|rd|th)?\s+house\b/u);
  const explicitMotion = /\bretrograde\b/u.test(normalized) ? "retrograde" : /\bdirect\b/u.test(normalized) ? "direct" : null;
  return canonicalReportEvents(facts).filter((event) => {
    const lineLower = line.toLowerCase();
    const claimedDates = lineLower.match(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}\b/gu) ?? [];
    if (claimedDates.length && ![...eventDateLabels(event)].some((label) => lineLower.includes(label))) return false;
    if (!normalized.includes(event.movingBody.toLowerCase()) && !normalized.includes("eclipse")) return false;
    const eclipseHouseClaim = normalized.includes("eclipse") && Boolean(house);
    if (!eclipseHouseClaim && event.natalBody !== "house cusp" && !normalized.includes(event.natalBody.toLowerCase())) return false;
    if (aspect && event.aspect !== aspect) return false;
    if (pass && (event.passNumber !== Number(pass[1]) || event.passCount !== Number(pass[2]))) return false;
    if (house && event.natalHouse !== Number(house[1])) return false;
    if (explicitMotion && event.motion !== explicitMotion) return false;
    return true;
  });
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
  const issues: ReportFactLockIssue[] = [];
  const dates = text.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/giu) ?? [];
  for (const date of dates) if (!allowedDates.has(date.toLowerCase())) issues.push({ code: "untraceable_date", value: date, message: `${date} is not present in the scoped frozen facts.` });
  const degrees = text.match(/\b\d{1,3}(?:\.\d+)?°/gu) ?? [];
  for (const degree of degrees) {
    const numeric = degree.slice(0, -1);
    if (!factsText.includes(numeric)) issues.push({ code: "untraceable_degree", value: degree, message: `${degree} is not traceable to the scoped frozen facts.` });
  }
  const attributionLines = text.split("\n").filter((line) => line.includes("·") && /\*[^*]+\*/u.test(line));
  for (const line of attributionLines) {
    const attribution = line.match(/\*([^*]+)\*\s*$/u)?.[1] ?? "";
    const candidates = tupleCandidates(line, attribution, facts);
    if (candidates.length !== 1) {
      issues.push({
        code: "unresolved_event_tuple",
        value: attribution,
        message: candidates.length === 0
          ? "The date, aspect, bodies, house, motion, and pass claim do not resolve to one calculated event ID."
          : `The technical claim is ambiguous across ${candidates.length} calculated event IDs.`
      });
    }
  }
  const technicalSentences = text.match(/[^.!?]+[.!?]?/gu)?.map((sentence) => sentence.trim()).filter((sentence) => (
    /\b(?:conjuncts?|conjoins|opposes?|squares?|trines?|sextiles?|returns?)\b/iu.test(sentence)
    && /\b(?:natal|eclipse)\b/iu.test(sentence)
    && !attributionLines.some((line) => line.includes(sentence))
  )) ?? [];
  for (const sentence of technicalSentences) {
    const candidates = tupleCandidates(sentence, sentence, facts);
    const bodies = [...new Set(candidates.map((event) => event.movingBody.toLowerCase()).filter((body) => sentence.toLowerCase().includes(body)))];
    const resolvesMultipleExplicitClaims = bodies.length > 1
      && candidates.length === bodies.length
      && bodies.every((body) => candidates.filter((event) => event.movingBody.toLowerCase() === body).length === 1);
    if (candidates.length !== 1 && !resolvesMultipleExplicitClaims) issues.push({
      code: "unresolved_event_tuple",
      value: sentence,
      message: candidates.length === 0
        ? "The technical sentence does not resolve to a calculated event ID. Use a runtime-rendered technical attribution."
        : `The technical sentence is ambiguous across ${candidates.length} calculated event IDs; include the runtime-rendered date, motion, house, and pass.`
    });
  }
  return { passed: issues.length === 0, issues };
}
