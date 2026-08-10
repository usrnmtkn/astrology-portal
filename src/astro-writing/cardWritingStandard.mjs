import fs from "node:fs";

const CARD_STANDARD_URL = new URL("../../tldr-astro-phrasebank/TLDR-CARD-TRANSIT-WRITING-STANDARD-OWNER.md", import.meta.url);
const REGISTER_RULING_URL = new URL("../../tldr-astro-phrasebank/TLDR-REGISTER-PER-SURFACE-RULING-OWNER.md", import.meta.url);
const CRITIQUE_CHECKLIST_URL = new URL("../../tldr-astro-phrasebank/TLDR-CARD-CRITIQUE-CHECKLIST-V3-DRAFT.md", import.meta.url);

export const CARD_TRANSIT_WRITING_STANDARD_VERSION = "card-transit-writing-standard-owner-2026-08-09";
export const CARD_CRITIQUE_CHECKLIST_VERSION = "card-critique-checklist-v3";

export const cardTransitWritingStandard = fs.readFileSync(CARD_STANDARD_URL, "utf8");
export const registerPerSurfaceRuling = fs.readFileSync(REGISTER_RULING_URL, "utf8");
export const cardCritiqueChecklist = fs.readFileSync(CRITIQUE_CHECKLIST_URL, "utf8");

function sectionText(source, start, end) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) throw new Error(`Owner card standard omitted ${start}.`);
  const endIndex = end ? source.indexOf(end, startIndex + start.length) : source.length;
  if (end && endIndex < 0) throw new Error(`Owner card standard omitted ${end}.`);
  return source.slice(startIndex, endIndex).trim();
}

export const cardTransitTopLevelDirection = sectionText(
  cardTransitWritingStandard,
  "23. Compact instruction to give Codex",
  "\n```"
);

export const CARD_WRITER_SEVEN_PASS_LOOP = Object.freeze([
  Object.freeze({ id: "astrology_integrity", pass: 1, label: "Astrology integrity", instruction: "Confirm planet function, natal target function, and aspect distinction. Do not draft beautifully yet." }),
  Object.freeze({ id: "remove_doctrine_prose", pass: 2, label: "Remove doctrine prose", instruction: "Replace aspect definitions, keywords, and generic transit framing with an observable circumstance." }),
  Object.freeze({ id: "voice", pass: 3, label: "Voice pass", instruction: "Add thesis, cadence, point of view, warmth, and an occasional memorable line without flattening good factual material." }),
  Object.freeze({ id: "lived_consequence", pass: 4, label: "Lived-consequence pass", instruction: "Replace abstract consequences with actual effects on time, money, sleep, work, home, access, credit, travel, appointments, responsibility, decisions, or relationships." }),
  Object.freeze({ id: "cut", pass: 5, label: "Cut", instruction: "Remove explanation after observation, keyword stacks, generic coaching, redundant astrology explanation, and manufactured closing wisdom." }),
  Object.freeze({ id: "full_family_comparison", pass: 6, label: "Full-family comparison", instruction: "Compare all five aspects and confirm each remains identifiable without its label." }),
  Object.freeze({ id: "full_file_consistency", pass: 7, label: "Full-file consistency", instruction: "Do not approve isolated good rows while the rest of the planetary file remains in an older register." })
]);

export function isCardWritingSurface({ surface = "card", family = "" } = {}) {
  if (surface != null) return surface === "card";
  return /(?:card|transit|placement|aspect|compatibility)/iu.test(String(family));
}

export function buildCardWriterInstructions(baseInstructions) {
  return [
    cardTransitTopLevelDirection,
    "REGISTER-PER-SURFACE RULING (verbatim; owner-approved and active in the harness)",
    registerPerSurfaceRuling,
    "CARD-REGISTER TRANSIT WRITING STANDARD (owner ruling, verbatim)",
    cardTransitWritingStandard,
    "SHARED ASTROLOGY WRITING CONTRACT",
    String(baseInstructions ?? "").trim()
  ].join("\n\n");
}

export function buildCardWriterChain({ familyContext = null } = {}) {
  return CARD_WRITER_SEVEN_PASS_LOOP.map((entry) => ({
    ...entry,
    scope: entry.pass <= 5 ? "current_card" : "planetary_family",
    availableContext: entry.pass <= 5 || familyContext ? "supplied" : "not_supplied_fail_closed"
  }));
}
