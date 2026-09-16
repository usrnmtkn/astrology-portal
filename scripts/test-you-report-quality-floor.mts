import assert from "node:assert/strict";
import { assertYouTransitReadingBrief, youTransitReadingPrompt } from "../api/_lib/you-transit-reading.ts";
import { transitReadingRevisionPrompt } from "../api/_lib/transit-reading-revision.ts";

const weekBrief = assertYouTransitReadingBrief({
  schema: "tldr.you-transit-reading-brief.v1",
  window: "week",
  targetDate: "2026-09-14",
  periodEnd: "2026-09-20",
  dateLabel: "September 14 through September 20",
  approvedReaderText: {
    horoscope: {
      body: "The surface feels fake and you're too tired to pretend otherwise. Emotional intensity demands attention. Good for research and deep conversations. You're allowed to let things die."
    }
  },
  technicalEvidence: {
    weekStart: "2026-09-14",
    weekEnd: "2026-09-20",
    readings: [{ driverLabel: "Moon in Scorpio", source: "weekly-moon", house: null }]
  }
});

const weekPrompt = youTransitReadingPrompt({ brief: weekBrief, headline: "Your week, in depth" });
assert.match(weekPrompt, /APPROVED READER TEXT below is the only evidence available to the writer/u);
assert.match(weekPrompt, /raw technical evidence is intentionally withheld/u);
assert.match(weekPrompt, /If the evidence is thin, write shorter rather than padding the report/u);
assert.match(weekPrompt, /one meaningful reader-safe source, 140-220 words is enough/u);
assert.match(weekPrompt, /Do not use report-scaffolding phrases/u);
assert.match(weekPrompt, /do not invent a day, progression across the week, or consequence in the following week/iu);
assert.match(weekPrompt, /summary: return the same text as tldr/u);
assert.doesNotMatch(weekPrompt, /weekStart/u, "Raw weekly timing fields must stay out of the writer prompt.");
assert.doesNotMatch(weekPrompt, /driverLabel/u, "Technical driver labels must stay out of the writer prompt.");

const dayBrief = assertYouTransitReadingBrief({
  schema: "tldr.you-transit-reading-brief.v1",
  window: "day",
  targetDate: "2026-09-16",
  periodEnd: "2026-09-16",
  dateLabel: "September 16",
  approvedReaderText: {
    dailySummary: {
      summary: "An opening just appeared. Use it while it is here. Send the application, make the appointment, or move the project forward."
    }
  },
  technicalEvidence: {
    qualifyingTransits: [{ transitPlanet: "North Node", natalPoint: "Sun", aspect: "conjunction", house: 9 }]
  }
});
const dayPrompt = youTransitReadingPrompt({ brief: dayBrief, headline: "Your day, in depth" });
assert.match(dayPrompt, /begin with the next supported consequence, distinction, or action/u);
assert.match(dayPrompt, /do not make it sit, become a door, point, carry weight, form a longer arc/u);
assert.doesNotMatch(dayPrompt, /North Node/u, "A technical-only transit must not become writer evidence.");
assert.doesNotMatch(dayPrompt, /qualifyingTransits/u);

const revisionPrompt = transitReadingRevisionPrompt({
  brief: dayBrief,
  headline: "Your day, in depth",
  surface: "you",
  task: "revision",
  feedback: "Remove the unsupported North Node interpretation from the rejected draft.",
  minSummaryLength: 40,
  minBodyLength: 180,
  maxBodyLength: 2200
});
assert.match(revisionPrompt, /WRITER-SAFE GOVERNED BRIEF/u);
assert.match(revisionPrompt, /only APPROVED READER TEXT below is writer evidence/u);
const governedSection = revisionPrompt.split("WRITER-SAFE GOVERNED BRIEF (approved reader evidence only)")[1]?.split("DRAFT AND FINDINGS TO ADDRESS")[0] ?? "";
assert.doesNotMatch(governedSection, /technicalEvidence/u);
assert.doesNotMatch(governedSection, /North Node/u);
assert.match(revisionPrompt, /Before returning JSON, scan all four fields and replace every em dash/u);

console.log("You report writers and revision writers stay inside approved reader evidence while deterministic fact locks retain technical evidence separately.");
