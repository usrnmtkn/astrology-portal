import fs from "node:fs";
import path from "node:path";

export type ReportHorizon = "1_month" | "4_months" | "6_months" | "12_months";

export type ReportUnitContract = {
  horizon: ReportHorizon;
  unitId: string;
  allowedUnitIds: string[];
};

export type ManifestationSetRecord = {
  id: string;
  factorType: "eclipse-on-natal-point" | "slow-transit-to-natal" | "return" | "profection-year" | "sr-overlay";
  match: {
    house?: number;
    natalPoint?: string;
    transitPlanet?: string;
    aspect?: string;
    overlayPoint?: string;
  };
  domain: string[];
  possibleLivedManifestations: string[];
  doNotAssume: string[];
  copyClaim: { text: null; review_status: "needs_review" };
  provenance: string;
  review_status: "needs_review";
};

export type ReportFactor = {
  id: string;
  factorType: ManifestationSetRecord["factorType"];
  house?: number;
  natalPoint?: string;
  transitPlanet?: string;
  aspect?: string;
  overlayPoint?: string;
  source: Record<string, unknown>;
};

export type ResolvedManifestationSet = {
  factor: ReportFactor;
  record: ManifestationSetRecord;
};

export type ReportSourceGap = {
  factorId: string;
  requestedKey: string;
  reason: "SOURCE_GAP";
};

export type ReportGenerationPayload = {
  schemaVersion: "report-generation-v1";
  reportId: string;
  reportHorizon: ReportHorizon;
  unit: ReportUnitContract;
  canonicalOwnerPrompt: {
    sourcePath: string;
    text: string;
  };
  generationStandard: {
    sourcePath: string;
    text: string;
  };
  frozenFacts: Record<string, unknown>;
  factors: ReportFactor[];
  manifestationSets: ResolvedManifestationSet[];
  sourceGaps: ReportSourceGap[];
  writingQueue: ReportSourceGap[];
  voiceEvidence: Array<{
    sourcePath: string;
    sourceType: "owner_authored_final";
    surface: "report";
    eligible: true;
    text: string;
  }>;
  outputGovernance: {
    status: "DRAFT";
    review_status: "needs_review";
    promotionAllowed: false;
  };
};

export type AssembleReportPayloadInput = {
  reportId: string;
  reportHorizon: ReportHorizon;
  unitId: string;
  frozenFacts: Record<string, unknown>;
};

export type ReportDraft = {
  headline?: string;
  tldr?: string;
  summary?: string;
  body?: string;
  action?: string;
  timing?: string;
  sections?: Array<{ heading?: string; body?: string }>;
};

export type ReportValidationIssue = {
  code: string;
  message: string;
};

export type ReportValidatorOptions = {
  signatureNouns?: string[];
  signatureNounCap?: number;
};

const CANONICAL_PROMPT_PATH = "tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-OWNER.md";
const GENERATION_STANDARD_PATH = "tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md";
const VOICE_EVIDENCE_PATH = "artifacts/marie-satori-year-ahead-2026-FINAL.md";
const MANIFESTATION_SETS_PATH = "packages/astro-knowledge/data/manifestation-sets/year-ahead-v1.json";

const UNIT_IDS: Record<ReportHorizon, string[]> = {
  "1_month": ["overview", "what-matters-most", "domain:*", "key-dates"],
  "4_months": ["overview", "period-theme", "development:*", "key-dates", "closing-synthesis"],
  "6_months": ["overview", "period-theme", "phase-1", "phase-2", "key-dates", "review"],
  "12_months": [
    "overview",
    "year-theme",
    "domain:*",
    "winter-current",
    "spring",
    "summer",
    "autumn",
    "review-current-year",
    "winter-next"
  ]
};

const RETURN_ELIGIBLE = new Set([
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Chiron",
  "Uranus",
  "North Node"
]);

function readRepoText(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function reportWindowFacts(facts: Record<string, unknown>) {
  return recordValue(facts.reportWindow) ?? facts;
}

function unitIdAllowed(horizon: ReportHorizon, unitId: string) {
  return UNIT_IDS[horizon].some((allowed) => (
    allowed.endsWith(":*") ? unitId.startsWith(allowed.slice(0, -1)) : unitId === allowed
  ));
}

function validateFrozenWindow(horizon: ReportHorizon, facts: Record<string, unknown>) {
  const windowFacts = reportWindowFacts(facts);
  const factsHorizon = stringValue(windowFacts.reportHorizon);
  if (factsHorizon && factsHorizon !== horizon) {
    throw new Error(`Frozen report-window horizon '${factsHorizon}' does not match '${horizon}'.`);
  }
  const startsAt = Date.parse(stringValue(windowFacts.startsAt));
  const endsAt = Date.parse(stringValue(windowFacts.endsAt));
  const maxDays: Record<ReportHorizon, number> = {
    "1_month": 40,
    "4_months": 140,
    "6_months": 200,
    "12_months": 380
  };
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
    throw new Error("Frozen report-window facts require valid startsAt and endsAt values.");
  }
  if ((endsAt - startsAt) / 86_400_000 > maxDays[horizon]) {
    throw new Error(`Frozen report-window facts exceed the ${horizon} time-distance contract.`);
  }

  const eventTimes = [
    ...arrayValue(windowFacts.fastTransitKeyDates).map((value) => stringValue(recordValue(value)?.exactAt)),
    ...arrayValue(windowFacts.lunarEvents).map((value) => stringValue(recordValue(value)?.occursAt)),
    ...arrayValue(windowFacts.stations).map((value) => stringValue(recordValue(value)?.occursAt)),
    ...arrayValue(windowFacts.ingresses).map((value) => stringValue(recordValue(value)?.occursAt)),
    ...arrayValue(windowFacts.slowTransitArcs).flatMap((value) => (
      arrayValue(recordValue(value)?.passes).map((reportPass) => stringValue(recordValue(reportPass)?.exactAt))
    ))
  ].filter(Boolean);
  if (eventTimes.some((value) => Date.parse(value) < startsAt || Date.parse(value) > endsAt)) {
    throw new Error(`Frozen report-window facts contain an event outside the ${horizon} window.`);
  }
}

export function reportUnitContract(horizon: ReportHorizon, unitId: string): ReportUnitContract {
  if (!unitIdAllowed(horizon, unitId)) {
    throw new Error(`Unit '${unitId}' is not part of the ${horizon} report contract.`);
  }
  return { horizon, unitId, allowedUnitIds: [...UNIT_IDS[horizon]] };
}

function loadManifestationRecords() {
  const collection = JSON.parse(readRepoText(MANIFESTATION_SETS_PATH)) as {
    records: Record<string, Omit<ManifestationSetRecord, "id">>;
  };
  return Object.entries(collection.records).map(([id, record]) => ({ id, ...record }));
}

function factorKey(factor: ReportFactor) {
  return [
    factor.factorType,
    factor.transitPlanet,
    factor.aspect,
    factor.natalPoint,
    factor.overlayPoint,
    factor.house
  ].filter((value) => value !== undefined).join("/").toLowerCase().replaceAll(" ", "-");
}

function profectionFactors(facts: Record<string, unknown>): ReportFactor[] {
  const profections = recordValue(facts.profections);
  const annual = recordValue(profections?.annual);
  const house = numberValue(annual?.house);
  if (!annual || house === undefined) return [];
  return [{
    id: `profection-year-house-${house}`,
    factorType: "profection-year",
    house,
    source: annual
  }];
}

function solarReturnFactors(facts: Record<string, unknown>): ReportFactor[] {
  const solarReturn = recordValue(facts.solarReturn);
  const analysis = recordValue(solarReturn?.analysis);
  return arrayValue(analysis?.solarReturnToNatalOverlays).flatMap((value) => {
    const overlay = recordValue(value);
    const house = numberValue(overlay?.house);
    const overlayPoint = stringValue(overlay?.point);
    if (!overlay || house === undefined || !overlayPoint) return [];
    return [{
      id: `sr-overlay-${overlayPoint.toLowerCase().replaceAll(" ", "-")}-house-${house}`,
      factorType: "sr-overlay" as const,
      house,
      overlayPoint,
      source: overlay
    }];
  });
}

function transitFactors(facts: Record<string, unknown>): ReportFactor[] {
  return arrayValue(facts.slowTransitArcs).flatMap((value) => {
    const arc = recordValue(value);
    if (!arc) return [];
    const transitPlanet = stringValue(arc.transitPlanet);
    const natalPoint = stringValue(arc.natalPoint);
    const aspect = stringValue(arc.aspect);
    const house = numberValue(arc.natalHouse);
    const selfConjunction = transitPlanet === natalPoint && aspect === "conjunction";
    if (selfConjunction && !RETURN_ELIGIBLE.has(transitPlanet)) return [];
    const returnEligible = selfConjunction && RETURN_ELIGIBLE.has(transitPlanet);
    const factorType = returnEligible ? "return" : "slow-transit-to-natal";
    return [{
      id: stringValue(arc.id) || `${factorType}-${transitPlanet}-${aspect}-${natalPoint}`,
      factorType,
      house,
      natalPoint,
      transitPlanet,
      aspect,
      source: arc
    }];
  });
}

function eclipseFactors(facts: Record<string, unknown>): ReportFactor[] {
  const natal = recordValue(facts.natal);
  const natalHouses = new Map<string, number>();
  for (const value of arrayValue(natal?.positions)) {
    const position = recordValue(value);
    const point = stringValue(position?.point);
    const house = numberValue(position?.house);
    if (point && house !== undefined) natalHouses.set(point, house);
  }
  const angles = recordValue(natal?.angles);
  for (const [point, value] of Object.entries(angles ?? {})) {
    const house = numberValue(recordValue(value)?.house);
    if (house !== undefined) natalHouses.set(point, house);
  }
  return arrayValue(facts.lunarEvents).flatMap((value) => {
    const event = recordValue(value);
    const kind = stringValue(event?.kind);
    if (!event || !kind.includes("eclipse")) return [];
    return arrayValue(event.natalContacts).flatMap((contactValue) => {
      const contact = recordValue(contactValue);
      const natalPoint = stringValue(contact?.natalPoint);
      if (!contact || !natalPoint) return [];
      return [{
        id: `${stringValue(event.id)}-${natalPoint.toLowerCase().replaceAll(" ", "-")}`,
        factorType: "eclipse-on-natal-point" as const,
        house: natalHouses.get(natalPoint),
        natalPoint,
        aspect: stringValue(contact.aspect),
        source: { ...event, contact }
      }];
    });
  });
}

export function reportFactors(facts: Record<string, unknown>) {
  const windowFacts = reportWindowFacts(facts);
  const factors = [
    ...profectionFactors(windowFacts),
    ...solarReturnFactors(windowFacts),
    ...transitFactors(windowFacts),
    ...eclipseFactors(windowFacts)
  ];
  const seen = new Set<string>();
  return factors.filter((factor) => {
    const key = `${factor.id}:${factor.factorType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recordMatchScore(record: ManifestationSetRecord, factor: ReportFactor) {
  if (record.factorType !== factor.factorType) return -1;
  let score = 0;
  for (const field of ["house", "natalPoint", "transitPlanet", "aspect", "overlayPoint"] as const) {
    const expected = record.match[field];
    if (expected === undefined) continue;
    if (expected !== factor[field]) return -1;
    score += 1;
  }
  return score;
}

export function resolveManifestationSets(factors: ReportFactor[]) {
  const records = loadManifestationRecords();
  const resolved: ResolvedManifestationSet[] = [];
  const gaps: ReportSourceGap[] = [];

  for (const factor of factors) {
    const candidates = records
      .map((record) => ({ record, score: recordMatchScore(record, factor) }))
      .filter((candidate) => candidate.score >= 0)
      .sort((left, right) => right.score - left.score || left.record.id.localeCompare(right.record.id));
    const record = candidates[0]?.record;
    if (record) {
      resolved.push({ factor, record });
    } else {
      gaps.push({ factorId: factor.id, requestedKey: factorKey(factor), reason: "SOURCE_GAP" });
    }
  }

  return { resolved, gaps };
}

export function assembleReportGenerationPayload(
  input: AssembleReportPayloadInput
): ReportGenerationPayload {
  validateFrozenWindow(input.reportHorizon, input.frozenFacts);
  const factors = reportFactors(input.frozenFacts);
  const { resolved, gaps } = resolveManifestationSets(factors);
  return {
    schemaVersion: "report-generation-v1",
    reportId: input.reportId,
    reportHorizon: input.reportHorizon,
    unit: reportUnitContract(input.reportHorizon, input.unitId),
    canonicalOwnerPrompt: {
      sourcePath: CANONICAL_PROMPT_PATH,
      text: readRepoText(CANONICAL_PROMPT_PATH)
    },
    generationStandard: {
      sourcePath: GENERATION_STANDARD_PATH,
      text: readRepoText(GENERATION_STANDARD_PATH)
    },
    frozenFacts: JSON.parse(JSON.stringify(input.frozenFacts)) as Record<string, unknown>,
    factors,
    manifestationSets: resolved,
    sourceGaps: gaps,
    writingQueue: [...gaps],
    voiceEvidence: [{
      sourcePath: VOICE_EVIDENCE_PATH,
      sourceType: "owner_authored_final",
      surface: "report",
      eligible: true,
      text: readRepoText(VOICE_EVIDENCE_PATH)
    }],
    outputGovernance: {
      status: "DRAFT",
      review_status: "needs_review",
      promotionAllowed: false
    }
  };
}

export function reportPromptFromPayload(payload: ReportGenerationPayload) {
  const { canonicalOwnerPrompt, ...taskPayload } = payload;
  return `${canonicalOwnerPrompt.text}\n\nREPORT_GENERATION_PAYLOAD\n${JSON.stringify(taskPayload, null, 2)}`;
}

function draftText(draft: ReportDraft) {
  return [
    draft.headline,
    draft.tldr,
    draft.summary,
    draft.body,
    draft.action,
    draft.timing,
    ...(draft.sections ?? []).flatMap((section) => [section.heading, section.body])
  ].filter(Boolean).join("\n");
}

function blocks(draft: ReportDraft) {
  return [draft.body ?? "", ...(draft.sections ?? []).map((section) => section.body ?? "")]
    .flatMap((value) => value.split(/\n\s*\n/u))
    .map((value) => value.trim())
    .filter(Boolean);
}

function sentences(block: string) {
  return block.match(/[^.!?]+[.!?]?/gu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function phrasePresent(sentence: string, phrase: string) {
  return new RegExp(`(^|[^a-z0-9])${escaped(phrase)}([^a-z0-9]|$)`, "iu").test(sentence);
}

function hedged(sentence: string) {
  return /\b(?:may|can|could|might)\b/iu.test(sentence);
}

function hasActualSaturnReturn(facts: Record<string, unknown>) {
  return arrayValue(reportWindowFacts(facts).slowTransitArcs).some((value) => {
    const arc = recordValue(value);
    return arc?.transitPlanet === "Saturn" && arc?.natalPoint === "Saturn"
      && arc?.aspect === "conjunction" && arc?.isReturn === true;
  });
}

export function validateReportDraft(
  draft: ReportDraft,
  payload: ReportGenerationPayload,
  options: ReportValidatorOptions = {}
) {
  const issues: ReportValidationIssue[] = [];
  const text = draftText(draft);
  const normalized = text.toLowerCase();
  const signatureNouns = options.signatureNouns ?? ["application"];
  const signatureNounCap = options.signatureNounCap ?? 3;

  if (text.includes("—")) issues.push({ code: "em_dash", message: "Report output contains an em dash." });
  if (/\bwhether\b/iu.test(text)) issues.push({ code: "whether", message: "Report output contains whether." });
  if (/\b(?:i think|i'm watching|i am watching|this makes me think)\b/iu.test(text)) {
    issues.push({ code: "astrologer_persona", message: "Report output uses astrologer persona." });
  }

  for (const noun of signatureNouns) {
    const count = normalized.match(new RegExp(`\\b${escaped(noun.toLowerCase())}s?\\b`, "gu"))?.length ?? 0;
    if (count > signatureNounCap) {
      issues.push({ code: "lexical_budget", message: `${noun} exceeds the configured lexical budget.` });
    }
  }

  const manifestationRecords = payload.manifestationSets.map((item) => item.record);
  for (const block of blocks(draft)) {
    const blockSentences = sentences(block);
    let shortManifestationRun = 0;
    for (const [index, sentence] of blockSentences.entries()) {
      const manifestations = manifestationRecords.flatMap((record) => record.possibleLivedManifestations)
        .filter((manifestation) => phrasePresent(sentence, manifestation));
      const exclusions = manifestationRecords.flatMap((record) => record.doNotAssume)
        .filter((exclusion) => phrasePresent(sentence, exclusion));
      const framed = hedged(sentence) || (index > 0 && hedged(blockSentences[index - 1]));
      if (manifestations.length > 0 && !framed) {
        issues.push({ code: "possibility_language", message: `Manifestation is asserted without may/can/could/might framing: ${sentence}` });
      }
      if (exclusions.length > 0 && !framed && !/\b(?:not|never|without|avoid|do not)\b/iu.test(sentence)) {
        issues.push({ code: "do_not_assume", message: `DO NOT ASSUME item is asserted as fact: ${sentence}` });
      }
      if (manifestations.length > 5) {
        issues.push({ code: "menu_size", message: `Manifestation menu exceeds five items: ${sentence}` });
      }
      shortManifestationRun = manifestations.length > 0 && sentence.split(/\s+/u).length <= 12
        ? shortManifestationRun + 1
        : 0;
      if (shortManifestationRun > 4) {
        issues.push({ code: "menu_size", message: "Manifestation menu exceeds four short sentences." });
      }
    }
  }

  if (/\bsaturn return\b/iu.test(text) && !hasActualSaturnReturn(payload.frozenFacts)) {
    issues.push({ code: "saturn_return_non_return_year", message: "Saturn Return copy appears outside an actual Saturn Return year." });
  }

  if (payload.reportHorizon === "1_month") {
    for (const section of draft.sections ?? []) {
      if (/^(work|love|health|home|money|family|relationships?|career)$/iu.test(section.heading?.trim() ?? "")
        && !(section.body ?? "").trim()) {
        issues.push({ code: "empty_domain_section", message: `Empty one-month domain section: ${section.heading}` });
      }
    }
  }

  if (payload.reportHorizon === "12_months") {
    const startYear = Number(stringValue(reportWindowFacts(payload.frozenFacts).startsAt).slice(0, 4));
    const nextYear = Number.isFinite(startYear) ? startYear + 1 : 0;
    for (const section of draft.sections ?? []) {
      if (/\bin review\b/iu.test(section.heading ?? "") && nextYear
        && new RegExp(`\\b${nextYear}\\b`, "u").test(section.body ?? "")) {
        issues.push({ code: "next_year_in_current_review", message: "Current-year review contains a next-year event." });
      }
    }
  }

  return issues;
}
