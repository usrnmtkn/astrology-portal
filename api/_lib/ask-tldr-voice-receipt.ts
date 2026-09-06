import { createHash } from "node:crypto";
import fs from "node:fs";
import type { AskTldrGovernedFactor } from "./ask-tldr-governed-evidence.ts";

type FactRecord = Record<string, unknown>;

type OwnerVoicePassage = {
  id: string;
  text: string;
  sourcePath: string;
  passageSha256: string;
  surface: string;
  planet: string | null;
  sign: string | null;
  register: "second_person" | "collective";
  relevanceScore: number;
};

type OwnerCorrection = {
  before: string;
  after: string;
  ownerReason: string;
  category: string;
  family: string;
  rule: string | null;
  sourcePath: string;
  relevanceScore: number;
};

export type AskTldrVoiceEvidenceReceipt = {
  schema: "ask-tldr-voice-evidence-receipt.v1";
  surface: "ask-tldr";
  register: "second_person_answer";
  question: Record<string, unknown>;
  semanticSources: Array<Record<string, unknown>>;
  ownerPassages: OwnerVoicePassage[];
  ownerCorrections: OwnerCorrection[];
  doNotUse: {
    sourcePath: string;
    sourceFileSha256: string;
    sectionSha256: string;
    text: string;
  };
  generationAllowed: boolean;
  generationBlockReason: string | null;
  receiptSha256: string;
};

const VOICE_INDEX_URL = new URL(
  "../../packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json",
  import.meta.url
);
const CORRECTIONS_URLS = [
  new URL("../../data/writing/owner-corrections.jsonl", import.meta.url),
  new URL("../../data/writing/owner-feedback-corpus.jsonl", import.meta.url)
];
const WRITING_STANDARD_URL = new URL("../../tldr-astro-phrasebank/WRITING-STANDARD.md", import.meta.url);
const MIN_OWNER_PASSAGES = 3;
const MAX_OWNER_PASSAGES = 5;
const MAX_PASSAGES_PER_SOURCE = 2;
const MAX_CORRECTIONS = 8;
const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "been", "before", "being", "between", "both", "but",
  "can", "could", "does", "from", "have", "into", "just", "more", "most", "much", "need", "right",
  "should", "that", "their", "them", "then", "there", "these", "they", "this", "through", "what", "when",
  "where", "which", "while", "with", "would", "your", "you"
]);
const GENERALLY_RELEVANT_CORRECTION_CATEGORIES = new Set([
  "natural_language", "voice_match", "observable_behavior", "abstraction_over_consequence",
  "metaphor_requires_translation", "invented_motive", "unearned_assumption", "constructed_sentence",
  "clinical_shorthand", "epigram_without_mechanism", "vague_outcome_clause", "wrong_word"
]);

let cachedVoiceEntries: FactRecord[] | null = null;
let cachedCorrections: Array<FactRecord & { sourcePath: string }> | null = null;
let cachedDoNotUse: AskTldrVoiceEvidenceReceipt["doNotUse"] | null = null;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value: unknown) {
  return sha256(JSON.stringify(value));
}

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function inferredRegister(text: string): "second_person" | "collective" {
  return /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text) ? "second_person" : "collective";
}

function normalizedTokens(value: unknown) {
  return new Set(
    String(value ?? "")
      .toLowerCase()
      .replace(/_/gu, " ")
      .match(/[a-z][a-z'-]{2,}/gu)
      ?.map((token) => token.replace(/'s$/u, ""))
      .filter((token) => !STOP_WORDS.has(token)) ?? []
  );
}

function overlapCount(left: Set<string>, right: Set<string>) {
  let count = 0;
  for (const token of left) if (right.has(token)) count += 1;
  return count;
}

function readJsonl(url: URL, sourcePath: string) {
  return fs.readFileSync(url, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ ...(JSON.parse(line) as FactRecord), sourcePath }));
}

function voiceEntries() {
  if (cachedVoiceEntries) return cachedVoiceEntries;
  const parsed = JSON.parse(fs.readFileSync(VOICE_INDEX_URL, "utf8")) as FactRecord;
  cachedVoiceEntries = Array.isArray(parsed.entries)
    ? parsed.entries.filter((entry): entry is FactRecord => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
  return cachedVoiceEntries;
}

function correctionEntries() {
  if (cachedCorrections) return cachedCorrections;
  cachedCorrections = [
    ...readJsonl(CORRECTIONS_URLS[0], "data/writing/owner-corrections.jsonl"),
    ...readJsonl(CORRECTIONS_URLS[1], "data/writing/owner-feedback-corpus.jsonl")
  ];
  return cachedCorrections;
}

function doNotUseEvidence() {
  if (cachedDoNotUse) return cachedDoNotUse;
  const source = fs.readFileSync(WRITING_STANDARD_URL, "utf8");
  const match = source.match(/\n## Do not use\n([\s\S]*?)(?=\n## )/u);
  if (!match?.[1]?.trim()) throw new Error("ASK_TLDR_DO_NOT_USE_SECTION_MISSING");
  const text = match[1].trim();
  cachedDoNotUse = {
    sourcePath: "tldr-astro-phrasebank/WRITING-STANDARD.md",
    sourceFileSha256: sha256(source),
    sectionSha256: sha256(text),
    text
  };
  return cachedDoNotUse;
}

function queryTokens(question: Record<string, unknown>, evidence: AskTldrGovernedFactor[]) {
  const parts: unknown[] = [
    question.text,
    question.pillarId,
    question.primaryIntent,
    ...(Array.isArray(question.secondaryIntents) ? question.secondaryIntents : []),
    ...(Array.isArray(question.questionTypes) ? question.questionTypes : [])
  ];
  for (const factor of evidence) {
    parts.push(
      factor.label,
      factor.factorKey,
      ...(factor.themes ?? []),
      ...(factor.points ?? []),
      ...(factor.angles ?? []),
      ...Object.values(factor.facts ?? {}).filter((value) => typeof value === "string")
    );
  }
  return normalizedTokens(parts.join(" "));
}

function factorPlanetsAndSigns(evidence: AskTldrGovernedFactor[]) {
  const planets = new Set<string>();
  const signs = new Set<string>();
  for (const factor of evidence) {
    for (const value of [factor.facts?.transitPlanet, factor.facts?.point, factor.facts?.planet]) {
      const normalized = words(value).toLowerCase();
      if (normalized) planets.add(normalized);
    }
    for (const value of [factor.facts?.sign, factor.facts?.transitSign, factor.facts?.natalSign]) {
      const normalized = words(value).toLowerCase();
      if (normalized) signs.add(normalized);
    }
  }
  return { planets, signs };
}

function eligibleOwnerPassage(entry: FactRecord) {
  const text = words(entry.text);
  if (entry.authorityClass !== "owner_authored_final"
    || entry.ownerAuthored !== true
    || entry.ownerApproved !== true
    || entry.useAsPositiveVoiceEvidence !== true
    || !words(entry.sourcePath)
    || text.length < 80
    || /^\s*(?:jump to horoscopes|horoscopes for)\b/iu.test(text)) {
    return false;
  }
  const expected = words(entry.sourceSha256);
  if (!expected || sha256(text) !== expected) {
    throw new Error(`ASK_TLDR_OWNER_PASSAGE_HASH_MISMATCH: ${words(entry.sourceId) || "unknown"}`);
  }
  return true;
}

function selectOwnerPassages(question: Record<string, unknown>, evidence: AskTldrGovernedFactor[]) {
  const query = queryTokens(question, evidence);
  const { planets, signs } = factorPlanetsAndSigns(evidence);
  const scored = voiceEntries()
    .filter(eligibleOwnerPassage)
    .map((entry, index) => {
      const text = words(entry.text);
      const entryTokens = normalizedTokens([
        text,
        entry.planet,
        entry.sign,
        entry.surface,
        entry.articleBeat,
        entry.structuralFunction
      ].join(" "));
      let score = overlapCount(query, entryTokens) * 6;
      const planet = words(entry.planet).toLowerCase();
      const sign = words(entry.sign).toLowerCase();
      if (planet && planets.has(planet)) score += 28;
      if (sign && signs.has(sign)) score += 18;
      if (inferredRegister(text) === "second_person") score += 10;
      if (["sky-article-longform", "sky-article-reference", "weekly-astrology", "relationship-astrology"].includes(words(entry.surface))) score += 4;
      return { entry, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const selected: OwnerVoicePassage[] = [];
  const perSource = new Map<string, number>();
  for (const { entry, score } of scored) {
    const sourcePath = words(entry.sourcePath);
    const count = perSource.get(sourcePath) ?? 0;
    if (count >= MAX_PASSAGES_PER_SOURCE) continue;
    const text = words(entry.text);
    selected.push({
      id: words(entry.sourceId),
      text,
      sourcePath,
      passageSha256: words(entry.sourceSha256),
      surface: words(entry.surface),
      planet: words(entry.planet) || null,
      sign: words(entry.sign) || null,
      register: inferredRegister(text),
      relevanceScore: score
    });
    perSource.set(sourcePath, count + 1);
    if (selected.length >= MAX_OWNER_PASSAGES) break;
  }
  return selected;
}

function selectOwnerCorrections(question: Record<string, unknown>, evidence: AskTldrGovernedFactor[]) {
  const query = queryTokens(question, evidence);
  const deduped = new Map<string, FactRecord & { sourcePath: string }>();
  for (const entry of correctionEntries()) {
    const bad = words(entry.bad);
    const corrected = words(entry.corrected);
    if (!bad || !corrected) continue;
    const key = bad.toLowerCase();
    const prior = deduped.get(key);
    if (!prior || (!words(prior.owner_reason ?? prior.why) && words(entry.owner_reason ?? entry.why))) deduped.set(key, entry);
  }
  return [...deduped.values()]
    .map((entry, index) => {
      const correctionTokens = normalizedTokens([
        entry.bad,
        entry.corrected,
        entry.owner_reason,
        entry.why,
        entry.category,
        entry.family,
        entry.rule
      ].join(" "));
      let score = overlapCount(query, correctionTokens) * 5;
      if (GENERALLY_RELEVANT_CORRECTION_CATEGORIES.has(words(entry.category).toLowerCase())) score += 5;
      if (words(entry.family).toLowerCase() === "any") score += 3;
      return { entry, index, score };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, MAX_CORRECTIONS)
    .map(({ entry, score }): OwnerCorrection => ({
      before: words(entry.bad),
      after: words(entry.corrected),
      ownerReason: words(entry.owner_reason ?? entry.why),
      category: words(entry.category),
      family: words(entry.family),
      rule: words(entry.rule) || null,
      sourcePath: entry.sourcePath,
      relevanceScore: score
    }));
}

function semanticReceipt(evidence: AskTldrGovernedFactor[]) {
  return evidence.map((factor) => ({
    evidenceId: factor.id,
    factorKey: factor.factorKey ?? null,
    role: factor.role,
    kind: factor.kind,
    temporalState: factor.temporalState,
    calculator: factor.provenance.calculator,
    calculatorSourceId: factor.provenance.sourceId,
    calculatedFactsSha256: sha256Json(factor.facts),
    governedStatus: factor.governedMeaning.status,
    governedSourceKind: factor.governedMeaning.sourceKind,
    canonicalIds: factor.governedMeaning.canonicalIds,
    packetSha256: factor.governedMeaning.packetSha256,
    governanceSourceSha256: factor.governedMeaning.governanceSourceSha256
  }));
}

export function buildAskTldrVoiceEvidenceReceipt(input: {
  question: Record<string, unknown>;
  evidence: AskTldrGovernedFactor[];
  governedGenerationAllowed: boolean;
  governedGenerationBlockReason?: string | null;
}): AskTldrVoiceEvidenceReceipt {
  const semanticSources = semanticReceipt(input.evidence);
  const ownerPassages = selectOwnerPassages(input.question, input.evidence);
  const ownerCorrections = selectOwnerCorrections(input.question, input.evidence);
  const doNotUse = doNotUseEvidence();
  const primary = input.evidence.find((factor) => factor.role === "primary");

  let generationBlockReason: string | null = null;
  if (!input.governedGenerationAllowed || primary?.governedMeaning.status !== "full") {
    generationBlockReason = input.governedGenerationBlockReason ?? "PRIMARY_GOVERNED_INTERPRETATION_INCOMPLETE";
  } else if (ownerPassages.length < MIN_OWNER_PASSAGES) {
    generationBlockReason = "OWNER_PASSAGE_EVIDENCE_BELOW_FLOOR";
  } else if (!ownerCorrections.length) {
    generationBlockReason = "OWNER_CORRECTION_EVIDENCE_MISSING";
  } else if (!doNotUse.text) {
    generationBlockReason = "DO_NOT_USE_EVIDENCE_MISSING";
  }

  const receiptWithoutHash = {
    schema: "ask-tldr-voice-evidence-receipt.v1" as const,
    surface: "ask-tldr" as const,
    register: "second_person_answer" as const,
    question: input.question,
    semanticSources,
    ownerPassages,
    ownerCorrections,
    doNotUse,
    generationAllowed: generationBlockReason === null,
    generationBlockReason
  };
  return { ...receiptWithoutHash, receiptSha256: sha256Json(receiptWithoutHash) };
}

export function assertAskTldrVoiceEvidenceReceipt(receipt: AskTldrVoiceEvidenceReceipt) {
  if (receipt.schema !== "ask-tldr-voice-evidence-receipt.v1"
    || receipt.surface !== "ask-tldr"
    || receipt.register !== "second_person_answer") {
    throw new Error("ASK_TLDR_VOICE_RECEIPT_TARGET_INVALID");
  }
  if (receipt.ownerPassages.length < MIN_OWNER_PASSAGES) {
    throw new Error("ASK_TLDR_OWNER_PASSAGE_EVIDENCE_BELOW_FLOOR");
  }
  for (const passage of receipt.ownerPassages) {
    if (!passage.sourcePath || !passage.text || sha256(passage.text) !== passage.passageSha256) {
      throw new Error(`ASK_TLDR_OWNER_PASSAGE_EVIDENCE_INVALID: ${passage.id}`);
    }
  }
  if (!receipt.ownerCorrections.length) throw new Error("ASK_TLDR_OWNER_CORRECTION_EVIDENCE_MISSING");
  if (!receipt.doNotUse.text || sha256(receipt.doNotUse.text) !== receipt.doNotUse.sectionSha256) {
    throw new Error("ASK_TLDR_DO_NOT_USE_EVIDENCE_INVALID");
  }
  const expectedHash = sha256Json(Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== "receiptSha256")));
  if (expectedHash !== receipt.receiptSha256) throw new Error("ASK_TLDR_VOICE_RECEIPT_TAMPERED");
  if (!receipt.generationAllowed) {
    throw new Error(`ASK_TLDR_VOICE_RECEIPT_BLOCKED: ${receipt.generationBlockReason ?? "unknown"}`);
  }
  return receipt;
}

export const ASK_TLDR_OWNER_PASSAGE_MINIMUM = MIN_OWNER_PASSAGES;
