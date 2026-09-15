import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
// @ts-ignore Canonical dependency-free Memory Map source index.
import { buildMemoryIndex, recallMemory } from "./agent-memory.mjs";
// @ts-ignore Canonical owner-authorship / surface eligibility, not lexical memory similarity.
import { ownerRelevantEvidenceFromVoiceIndex } from "../../src/astro-writing/ownerPositiveEvidence.mjs";
import { activeStudioFeedback, studioFeedbackEnabled } from "./studio-memory-feedback.js";
import type { MonthlyFacts, MonthlySelection } from "../../src/content-studio/monthlyComposition.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const voicePath = "packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json";
let memoryIndex: any;
let voiceIndex: any;
import type { CalendarMemoryReceipt, CalendarMemoryReference } from "../../src/content-studio/calendarWritingTypes.js";
export type { CalendarMemoryReceipt } from "../../src/content-studio/calendarWritingTypes.js";

/** Map retrieval supplies evidence, never new approval or cross-family correction scope.
 * Historical owner text is register evidence only. It never supplies moving facts.
 */
export async function calendarWritingMemory(facts: MonthlyFacts, selection: MonthlySelection) {
  if (!memoryIndex || process.env.NODE_ENV !== "production") memoryIndex = buildMemoryIndex({ root, revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
  if (!voiceIndex || process.env.NODE_ENV !== "production") voiceIndex = JSON.parse(fs.readFileSync(path.join(root, voicePath), "utf8"));
  const selectedEvents = facts.events.filter(event => event.id === selection.leadEventId || selection.supportingEventIds.includes(event.id));
  const query = `monthly collective Sun ${facts.openingSeasonSign} ${facts.closingSeasonSign} ${selectedEvents.map(event => event.title).join(" ")}`.slice(0, 500);
  const recalled = recallMemory(memoryIndex, query, { limit: 4 });
  const rules = recalled.requiredContext.filter((entry: any) => entry.status === "current" && entry.kind === "rule");
  if (!rules.length) throw new Error("Memory Map's required writing rulings are unavailable. No paid writing request was made.");
  const targets = [{ planet: "sun", sign: facts.openingSeasonSign }, ...(facts.closingSeasonSign ? [{ planet: "sun", sign: facts.closingSeasonSign }] : []),
    ...selectedEvents.flatMap(event => (event.planets ?? [event.planet]).filter(Boolean).map(planet => ({ planet, sign: event.sign ?? event.toSign ?? "" })))];
  const candidates = new Map<string, any>();
  // Round-robin among targets prevents the opening season from consuming all voice examples.
  const pools = targets.map(target => ownerRelevantEvidenceFromVoiceIndex(voiceIndex, target).selected);
  const sourceCounts = new Map<string, number>();
  for (let rank = 0; rank < 100 && candidates.size < 6; rank++) for (const pool of pools) {
    const entry = pool[rank];
    if (!entry || candidates.has(entry.id) || (sourceCounts.get(entry.sourcePath) ?? 0) >= 2) continue;
    if (hash(entry.text.trim()) !== entry.sourceRecordSha256) throw new Error("Owner voice evidence failed its recorded hash check. No draft was generated.");
    if (entry.text.length > 12_000) continue; // Select a complete alternative, never truncate a protected passage.
    candidates.set(entry.id, entry);
    sourceCounts.set(entry.sourcePath, (sourceCounts.get(entry.sourcePath) ?? 0) + 1);
    if (candidates.size === 6) break;
  }
  if (candidates.size < 3) throw new Error("Not enough eligible owner voice evidence for this monthly draft. No provider call was made.");
  const ownerPassages = [...candidates.values()];
  // Existing active feedback is scoped to Sky cards/articles, not this new monthly-phrase family.
  // Read it when enabled so an outage cannot masquerade as a current empty memory snapshot.
  // Do not silently promote family- or passage-specific replacements into monthly prose.
  const live = studioFeedbackEnabled();
  const feedback = live ? await activeStudioFeedback() : [];
  const references: CalendarMemoryReference[] = [
    ...rules.map((entry: any) => ({ id: entry.id, role: "required-owner-ruling", path: entry.path, sha256: entry.bodySha256, title: entry.title })),
    ...ownerPassages.map(entry => ({ id: entry.id, role: "owner-authored-register-only", path: entry.sourcePath, sha256: entry.sourceRecordSha256, title: entry.contentKey }))
  ];
  const receipt: CalendarMemoryReceipt = { schema: "calendar-writing-memory/v1", revision: memoryIndex.revision,
    fingerprint: memoryIndex.fingerprint, checkedAt: new Date().toISOString(), references,
    privateFeedback: live ? "checked-scope-excluded" : "not-enabled", excludedPrivateCorrections: feedback.length };
  const prompt = [
    "MEMORY MAP: REQUIRED CURRENT OWNER RULINGS",
    ...rules.map((entry: any) => entry.body),
    "EXACT OWNER-PUBLISHED REGISTER EVIDENCE: preserve source attribution. These are historical style examples, NOT facts for the selected month and NOT phrases licensed for automatic copying.",
    ...ownerPassages.map(entry => JSON.stringify({ id: entry.id, role: "register-only", sourcePath: entry.sourcePath, text: entry.text })),
    "Graph proximity does not authorize reuse. Superseded notes, rejected examples, unverified task memories, and out-of-scope private corrections are excluded. Never turn generated writing into owner evidence."
  ].join("\n\n");
  return { receipt, prompt };
}
