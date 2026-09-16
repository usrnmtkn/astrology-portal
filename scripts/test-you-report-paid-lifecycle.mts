import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertYouTransitReadingBrief,
  youTransitReadingPrompt,
  youTransitReadingRequestLock,
  validateYouTransitReadingDraft
} from "../api/_lib/you-transit-reading.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative: string) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

const dayBrief = assertYouTransitReadingBrief({
  schema: "tldr.you-transit-reading-brief.v1",
  window: "day",
  targetDate: "2026-09-07",
  periodEnd: "2026-09-07",
  dateLabel: "September 7",
  approvedReaderText: {
    dailySummary: { summary: "A deadline is competing with the time you already promised elsewhere." }
  },
  technicalEvidence: {
    qualifyingTransits: [{ transitPlanet: "Sun", natalPoint: "Moon", aspect: "opposition", house: 6 }]
  }
});
const dayLock = youTransitReadingRequestLock({ brief: dayBrief });
assert.equal(dayLock.subjectType, "you_day_reading");
assert.equal(dayLock.subjectId, "self:day");
assert.equal(dayLock.contentKey, "you-transit-reading/day/2026-09-07");
assert.equal(dayLock.sourceSnapshot.subjectLabel, "You");
assert.equal(dayLock.sourceSnapshot.periodEnd, "2026-09-07");

const weekBrief = assertYouTransitReadingBrief({
  schema: "tldr.you-transit-reading-brief.v1",
  window: "week",
  targetDate: "2026-09-07",
  periodEnd: "2026-09-13",
  dateLabel: "September 7 through September 13",
  approvedReaderText: {
    macro: { headline: "A week with competing demands", body: "The week asks you to decide what gets your time first." },
    horoscope: { body: "The weekly source names your 4th House of Home and Family." },
    aspects: [{ dayLabel: "Thursday", body: "A conversation can make the tradeoff clearer." }]
  },
  technicalEvidence: {
    weekStart: "2026-09-07",
    weekEnd: "2026-09-13",
    readings: [{ driverLabel: "Sun opposite Moon", source: "personal-transit", house: 6 }]
  }
});
const weekLock = youTransitReadingRequestLock({ brief: weekBrief });
assert.equal(weekLock.subjectType, "you_week_reading");
assert.equal(weekLock.subjectId, "self:week");
assert.equal(weekLock.sourceSnapshot.periodEnd, "2026-09-13");

const prompt = youTransitReadingPrompt({ brief: dayBrief, headline: dayLock.headline });
assert.match(prompt, /same synthesis standard as the governed Friends transit reading/u);
assert.match(prompt, /second person using you\/your/u);
assert.match(prompt, /Do not calculate astrology/u);
assert.match(prompt, /Do not invent texting, workplace, money, family, health, dating, shopping, travel/u);
assert.match(prompt, /Reader-facing meaning must come from APPROVED READER TEXT/u);
assert.match(prompt, /do not copy the TLDR sentence-for-sentence/u);
assert.match(prompt, /write shorter rather than padding the report/u);
assert.match(prompt, /do not make it sit, become a door, point, carry weight/u);

const validDraft = {
  headline: dayLock.headline,
  tldr: "The pressure is about what gets your time first.",
  summary: "The pressure is about what gets your time first, not about doing everything at once.",
  body: "The Sun opposite your Moon puts the conflict into view. With the 6th house named in the source, the pressure can center on the work and routines already filling the day. The useful distinction is which demand actually belongs at the top of the list."
};
assert.equal(validateYouTransitReadingDraft({ draft: validDraft, brief: dayBrief, expectedHeadline: dayLock.headline }).passed, true);

const governedReaderHouse = validateYouTransitReadingDraft({
  draft: {
    headline: weekLock.headline,
    summary: "Home and family are clearly named in the approved weekly material.",
    body: "Your 4th House of Home and Family is named directly in the approved reader text, so the weekly synthesis can carry that life area forward."
  },
  brief: weekBrief,
  expectedHeadline: weekLock.headline
});
assert.equal(governedReaderHouse.passed, true, "A house explicitly present in approved reader text must pass even when it is absent from numeric technical evidence.");

const inventedHouse = validateYouTransitReadingDraft({
  draft: {
    headline: weekLock.headline,
    summary: "This summary is long enough to exercise the weekly house fact lock.",
    body: "Your 5th House becomes the center of the week."
  },
  brief: weekBrief,
  expectedHeadline: weekLock.headline
});
assert.equal(inventedHouse.passed, false);
assert.ok(inventedHouse.issues.some((issue) => issue.code === "untraceable_house"));

const inventedAspect = validateYouTransitReadingDraft({
  draft: { ...validDraft, body: "The Sun trine your Moon makes everything easier." },
  brief: dayBrief,
  expectedHeadline: dayLock.headline
});
assert.equal(inventedAspect.passed, false);
assert.ok(inventedAspect.issues.some((issue) => issue.code === "untraceable_aspect"));

const moonOnlyBrief = assertYouTransitReadingBrief({
  schema: "tldr.you-transit-reading-brief.v1",
  window: "week",
  targetDate: "2026-09-14",
  periodEnd: "2026-09-20",
  dateLabel: "September 14 through September 20",
  approvedReaderText: {
    horoscope: { body: "The Moon in Scorpio makes the feelings below the pleasant surface harder to ignore." }
  },
  technicalEvidence: {
    weekStart: "2026-09-14",
    weekEnd: "2026-09-20",
    readings: [{ driverLabel: "Moon in Scorpio", source: "weekly-moon", house: null }]
  }
});
const moonOnlyLock = youTransitReadingRequestLock({ brief: moonOnlyBrief });
const ordinaryOpposite = validateYouTransitReadingDraft({
  draft: {
    headline: moonOnlyLock.headline,
    summary: "The approved weekly source keeps the focus on feelings that have been kept below the surface.",
    body: "Looking directly at the feeling is the opposite of pretending it is not there. The Moon in Scorpio is already named in the approved weekly text."
  },
  brief: moonOnlyBrief,
  expectedHeadline: moonOnlyLock.headline
});
assert.equal(ordinaryOpposite.passed, true, "Ordinary-language 'opposite of' must not be mistaken for an invented astrological opposition.");

const inventedMoonOnlyAspect = validateYouTransitReadingDraft({
  draft: {
    headline: moonOnlyLock.headline,
    summary: "This summary is long enough to exercise the Moon-only aspect fact lock.",
    body: "The Moon opposite your Sun makes the week more intense."
  },
  brief: moonOnlyBrief,
  expectedHeadline: moonOnlyLock.headline
});
assert.equal(inventedMoonOnlyAspect.passed, false);
assert.ok(inventedMoonOnlyAspect.issues.some((issue) => issue.code === "untraceable_aspect"), "A true invented aspect must still fail closed.");

const standingTrait = validateYouTransitReadingDraft({
  draft: { ...validDraft, body: "You always take on too much when the Sun opposes your Moon." },
  brief: dayBrief,
  expectedHeadline: dayLock.headline
});
assert.equal(standingTrait.passed, false);
assert.ok(standingTrait.issues.some((issue) => issue.code === "standing_trait_language"));

const friendGenerator = read("api/_lib/friend-transit-reading-generation.ts");
const youGenerator = read("api/_lib/you-transit-reading-generation.ts");
const sharedGenerator = read("api/_lib/transit-reading-generation.ts");
const lifecycle = read("api/_lib/you-report-lifecycle.ts");
const requestApi = read("api/you-report-request.ts");
const client = read("apps/web/src/features/you/youTransitReports.ts");
const actions = read("apps/web/src/features/you/YouReportActions.tsx");
const actionStyles = read("apps/web/src/styles/you-reports.css");
const youPage = read("apps/web/src/features/you/YouPage.tsx");
const library = read("apps/web/src/services/reportLibrary.ts");
const sharing = read("api/report-share.ts");
const migration = read("apps/web/supabase/migrations/20260907133521_you_report_paid_lifecycle.sql");
const vercel = read("vercel.json");

assert.match(friendGenerator, /generateGovernedTransitReading/u, "Friends must use the shared governed transit writer core.");
assert.match(youGenerator, /generateGovernedTransitReading/u, "You reports must use the shared governed transit writer core.");
assert.match(sharedGenerator, /for \(let attempt = 0; attempt < 2; attempt \+= 1\)/u);
assert.match(sharedGenerator, /compactBriefForRecovery/u);
assert.match(sharedGenerator, /contentGenerationProvider/u);

assert.match(lifecycle, /you_transit_day/u);
assert.match(lifecycle, /you_transit_week/u);
assert.match(lifecycle, /ensurePlaceholder/u);
assert.match(lifecycle, /claim_you_report_jobs/u);
assert.match(lifecycle, /YOU_REPORT_JOB_ATTEMPT_CAP/u);
assert.match(lifecycle, /attempt: 0/u, "A user retry must receive a fresh bounded attempt budget.");
assert.match(lifecycle, /\{ status: "DRAFT", error: null \}/u, "A user retry must restore the placeholder to generating state.");
assert.match(requestApi, /waitUntil\(runYouReportJobs/u);
assert.match(client, /\/api\/you-report-request/u);
assert.match(actions, /Create \$\{label\} report/u);
assert.match(actions, /Read \$\{label\} report/u);
assert.match(actions, /listReportLibrary/u, "You report CTAs must restore persisted report state after reload.");
assert.match(actions, /findPersistedReport/u);
assert.match(actions, /item\.status === "ready"/u);
assert.match(actions, /item\.status === "generating"/u);
assert.match(actions, /you-report-actions__loading-dots/u);
assert.match(actions, /window\.location\.assign\(action\.route\)/u);
assert.match(actions, /import "\.\.\/\.\.\/styles\/you-reports\.css"/u, "You report CTA styles must stay route-local instead of joining startup CSS.");
assert.doesNotMatch(actions, /Open Reports →/u, "The per-report Read CTA replaces the generic Reports CTA.");
assert.match(actionStyles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/u, "Day and week CTAs must stay side by side.");
assert.match(actionStyles, /\.you-report-actions__button\.is-ready[\s\S]*border:[\s\S]*background: transparent/u, "Ready report CTAs must be outlined, not solid.");
assert.match(actionStyles, /\.you-report-actions__loading-dots > span:nth-child\(3\)/u, "Loading state must render three dots.");
assert.match(youPage, /<YouReportActions/u);

assert.match(library, /you_day_reading/u);
assert.match(library, /you_week_reading/u);
assert.match(library, /you_report_entitlement_id/u);
assert.match(sharing, /you_day_reading/u);
assert.match(sharing, /you_week_reading/u);

assert.match(migration, /create table if not exists public\.you_report_entitlements/u);
assert.match(migration, /create table if not exists public\.you_report_jobs/u);
assert.match(migration, /add column if not exists you_report_entitlement_id/u);
assert.match(migration, /revoke insert, update, delete, truncate, references, trigger[\s\S]*you_report_entitlements[\s\S]*from anon, authenticated/u);
assert.match(migration, /revoke all on function public\.claim_you_report_jobs\(text, integer, uuid\)[\s\S]*from public, anon, authenticated/u);
assert.match(migration, /grant execute on function public\.claim_you_report_jobs\(text, integer, uuid\)[\s\S]*to service_role/u);
assert.match(vercel, /\/api\/cron\/run-you-report-jobs/u);

console.log("You day/week reports share the Friends writer core, persist CTA state, and stay server-governed.");
