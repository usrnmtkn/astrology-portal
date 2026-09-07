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

const validDraft = {
  headline: dayLock.headline,
  tldr: "The pressure is about what gets your time first.",
  summary: "The pressure is about what gets your time first, not about doing everything at once.",
  body: "The Sun opposite your Moon puts the conflict into view. With the 6th house named in the source, the pressure can center on the work and routines already filling the day. The useful distinction is which demand actually belongs at the top of the list."
};
assert.equal(validateYouTransitReadingDraft({ draft: validDraft, brief: dayBrief, expectedHeadline: dayLock.headline }).passed, true);

const inventedAspect = validateYouTransitReadingDraft({
  draft: { ...validDraft, body: "The Sun trine your Moon makes everything easier." },
  brief: dayBrief,
  expectedHeadline: dayLock.headline
});
assert.equal(inventedAspect.passed, false);
assert.ok(inventedAspect.issues.some((issue) => issue.code === "untraceable_aspect"));

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
const styles = read("apps/web/src/styles.css");
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
assert.doesNotMatch(actions, /Open Reports →/u, "The per-report Read CTA replaces the generic Reports CTA.");
assert.match(actionStyles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/u, "Day and week CTAs must stay side by side.");
assert.match(actionStyles, /\.you-report-actions__button\.is-ready[\s\S]*border:[\s\S]*background: transparent/u, "Ready report CTAs must be outlined, not solid.");
assert.match(actionStyles, /\.you-report-actions__loading-dots > span:nth-child\(3\)/u, "Loading state must render three dots.");
assert.match(styles, /\.\/styles\/you-reports\.css/u);
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
