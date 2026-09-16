import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertYouTransitReadingBrief, youTransitReadingPrompt } from "../api/_lib/you-transit-reading.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
assert.match(weekPrompt, /Reader-facing meaning must come from APPROVED READER TEXT/u);
assert.match(weekPrompt, /TECHNICAL EVIDENCE may confirm names, dates, houses, aspects, and timing/u);
assert.match(weekPrompt, /does not authorize a new behavioral interpretation/u);
assert.match(weekPrompt, /If the evidence is thin, write shorter rather than padding the report/u);
assert.match(weekPrompt, /one meaningful reader-safe source, 140-220 words is enough/u);
assert.match(weekPrompt, /Do not use report-scaffolding phrases/u);
assert.match(weekPrompt, /do not invent a day, progression across the week, or consequence in the following week/iu);
assert.match(weekPrompt, /summary: return the same text as tldr/u);

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
assert.match(dayPrompt, /If a technical transit has no reader-safe meaning in APPROVED READER TEXT, omit its interpretation/u);

const revisionSource = fs.readFileSync(path.join(repoRoot, "api/_lib/transit-reading-revision.ts"), "utf8");
assert.match(revisionSource, /Before returning JSON, scan all four fields and replace every em dash/u);

console.log("You report quality floor keeps source-thin reports concise, evidence-bounded, and free of common abstract scaffolding.");
