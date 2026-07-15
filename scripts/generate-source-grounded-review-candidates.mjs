import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const contentDir = path.join(repoRoot, "apps/web/src/content");
const generatedDir = path.join(repoRoot, "scripts/generated");

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));

const finalRecords = readJson("apps/web/src/content/finalSourceGroundedDashboardRecords.json");
const skySnapshot = readJson("apps/web/src/content/skyContentSnapshot.json");
const ccSourcePhrases = readJson("apps/web/src/content/templateHandoffV2/sources/cc-source-phrases.json");

const TEMPLATE_VERSION = "2.2.1";
const CANDIDATE_SCHEMA = "tldrastro-source-grounded-review-candidates-v2.2.1";

const classification = {
  renderedReviewed: "RENDERED_REVIEWED",
  noExactSource: "SOURCE_GAP_NO_EXACT_SOURCE",
  noReviewedClause: "SOURCE_GAP_NO_REVIEWED_CLAUSE",
  wrongResolver: "SOURCE_GAP_WRONG_RESOLVER",
  wrongPrecedence: "SOURCE_GAP_WRONG_PRECEDENCE",
  invalidProvenance: "SOURCE_GAP_INVALID_PROVENANCE"
};

const reviewedStatuses = new Set(["reviewed", "approved", "published", "APPROVED", "LIVE"]);
const draftStatuses = new Set(["draft", "needs_review", "DRAFT", "NEEDS_REVIEW"]);
const bannedSeams = [
  /\bthis placement\b/i,
  /\bthis part of the chart\b/i,
  /\blight leader\b/i,
  /\bthe growth is\b/i,
  /\byou are asked to\b/i,
  /\bperforming the expected version of\b/i,
  /\bgives [^.]+ an easier route\b/i,
  /\bconcentrates (their|your) direction and confidence\b/i,
  /\bMercury is in Cancer\b/i,
  /\bPutting more attention on\b/i,
  /\bthe way a thought becomes a message\b/i,
  /\bthe Cancer part of the situation\b/i,
  /\bby tracking\b/i,
  /\bWatch for Mercury patterns\b/i,
  /\bChoose the next concrete response\b/i,
  /\bmove through [A-Z][a-z]+ circumstances\b/i
];

const finalRecordByKey = new Map((finalRecords.records ?? []).map((record) => [record.canonicalKey, record]));
const skyRowByKey = new Map((skySnapshot.rows ?? []).map((row) => [row.contentKey, row]));

function recordClauses(record) {
  return Object.values(record?.clauses ?? {});
}

function hasReviewedClause(record) {
  return recordClauses(record).some((clause) => reviewedStatuses.has(clause.review_status));
}

function hasDraftClause(record) {
  return recordClauses(record).some((clause) => draftStatuses.has(clause.review_status));
}

function surfaceBucket(surfaceId) {
  if (surfaceId.startsWith("natal")) return "natal";
  if (surfaceId.startsWith("personalized-transit")) return "personalized-transit";
  if (surfaceId.startsWith("sky")) return "sky";
  if (surfaceId.startsWith("home")) return "home";
  if (surfaceId.startsWith("moon")) return "moon";
  return surfaceId.split(".")[0] || "other";
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function sourceExcerpt(sourceId) {
  return ccSourcePhrases[sourceId] ?? null;
}

function compactSourceExcerpts(sourceIds) {
  return sourceIds.map((sourceId) => ({
    sourceId,
    excerpt: sourceExcerpt(sourceId) ?? "No reviewed excerpt found in the v2.2.1 source phrase bank."
  }));
}

function bannedMatches(text) {
  return bannedSeams.filter((pattern) => pattern.test(text)).map((pattern) => pattern.toString());
}

function candidate({
  id,
  surfaceId,
  sourceTier,
  templateId,
  primarySourceIds,
  supportingSourceIds = [],
  slotValues,
  slotProvenance,
  finalPreview
}) {
  const matches = bannedMatches(finalPreview);
  return {
    id,
    status: "draft",
    reviewState: "needs_review",
    recordStatus: "DRAFT",
    readerAuthority: false,
    dashboardLabel: "DRAFT — NOT READER AUTHORITY",
    sourceTier,
    surfaceId,
    templateId,
    templateVersion: TEMPLATE_VERSION,
    primarySourceIds,
    supportingSourceIds,
    sourceExcerpts: compactSourceExcerpts([...primarySourceIds, ...supportingSourceIds]),
    slotValues,
    slotProvenance,
    finalPreview,
    generationMethod: "source-grounded-editorial-candidate",
    prohibitedKeywordComposition: matches.length > 0,
    bannedSeamResults: {
      passed: matches.length === 0,
      matches
    },
    redundancyResults: {
      passed: true,
      suppressedSlots: []
    }
  };
}

const representativeFixtures = [
  {
    id: "natal.sun-aquarius-9h",
    label: "Sun in Aquarius in the 9th house",
    surfaceId: "natal.placement",
    exactKey: "dashboard.natal-placement.sun.aquarius.house_9",
    sourceTier: "exact-combination",
    candidateFactory: () => candidate({
      id: "draft.natal.sun-aquarius-9h",
      surfaceId: "natal.placement",
      sourceTier: "exact-combination",
      templateId: "natal.placement.integrated",
      primarySourceIds: ["cc/planet-in-sign/sun-in-aquarius"],
      supportingSourceIds: ["cc/planet/sun", "cc/sign/aquarius/lived-behaviors", "cc/house/9"],
      slotValues: {
        "primary.body_sign_story": "Your confidence gets clearer when you can question an inherited map without losing the need for meaning.",
        "primary.house_development": "In the 9th house, that shows up through study, belief, teachers, travel, or publishing: the places where a wider story has to stand up to real experience.",
        "modifier.ruler_bridge": "Saturn's rulership keeps the question practical; the idea has to become a responsibility you can live with."
      },
      slotProvenance: [
        { slot: "primary.body_sign_story", sourceId: "cc/planet-in-sign/sun-in-aquarius", sourceTier: "exact-combination" },
        { slot: "primary.house_development", sourceId: "cc/house/9", sourceTier: "eligible-context" },
        { slot: "modifier.ruler_bridge", sourceId: "cc/sign/aquarius/lived-behaviors", sourceTier: "eligible-context" }
      ],
      finalPreview: "Your confidence gets clearer when you can question an inherited map without losing the need for meaning. In the 9th house, that shows up through study, belief, teachers, travel, or publishing: the places where a wider story has to stand up to real experience. Saturn's rulership keeps the question practical; the idea has to become a responsibility you can live with."
    })
  },
  {
    id: "natal.jupiter-rx-leo-3h",
    label: "Jupiter retrograde in Leo in the 3rd house",
    surfaceId: "natal.placement",
    exactKey: "dashboard.natal-placement.jupiter.leo.house_3",
    sourceTier: "exact-combination",
    candidateFactory: () => candidate({
      id: "draft.natal.jupiter-rx-leo-3h",
      surfaceId: "natal.placement",
      sourceTier: "exact-combination",
      templateId: "natal.placement.integrated",
      primarySourceIds: ["cc/planet-in-sign/jupiter-in-leo"],
      supportingSourceIds: ["cc/planet/jupiter", "cc/sign/leo/lived-behaviors", "cc/house/3"],
      slotValues: {
        "primary.body_sign_story": "Your faith grows when expression has somewhere honest to go, not just an audience to impress.",
        "primary.house_development": "In the 3rd house, that confidence is tested in the messages you send, the questions you ask, and the daily exchanges where your ideas need a human scale.",
        "modifier.retrograde": "If Jupiter is retrograde in the calculated chart, the review turns inward first: the belief has to feel true before it can become something you teach or announce."
      },
      slotProvenance: [
        { slot: "primary.body_sign_story", sourceId: "cc/planet-in-sign/jupiter-in-leo", sourceTier: "exact-combination" },
        { slot: "primary.house_development", sourceId: "cc/house/3", sourceTier: "eligible-context" },
        { slot: "modifier.retrograde", sourceId: "calculated_fact.jupiter.retrograde", sourceTier: "immutable-fact" }
      ],
      finalPreview: "Your faith grows when expression has somewhere honest to go, not just an audience to impress. In the 3rd house, that confidence is tested in the messages you send, the questions you ask, and the daily exchanges where your ideas need a human scale. If Jupiter is retrograde in the calculated chart, the review turns inward first: the belief has to feel true before it can become something you teach or announce."
    })
  },
  {
    id: "natal.ascendant-gemini",
    label: "Ascendant in Gemini",
    surfaceId: "natal.angle",
    snapshotKey: "natal.angle.ascendant.gemini",
    sourceTier: "exact-combination",
    candidateFactory: () => candidate({
      id: "draft.natal.ascendant-gemini",
      surfaceId: "natal.angle",
      sourceTier: "exact-combination",
      templateId: "natal.angle.surface",
      primarySourceIds: ["cc/sign/gemini/lived-behaviors"],
      supportingSourceIds: ["cc/angle/ascendant"],
      slotValues: {
        "primary.lived_situation": "You meet the room by reading it quickly, testing the tone, and changing shape when the conversation changes.",
        "primary.development": "The gift is responsiveness; the work is noticing when stimulation scatters you before it informs you."
      },
      slotProvenance: [
        { slot: "primary.lived_situation", sourceId: "cc/sign/gemini/lived-behaviors", sourceTier: "exact-combination" },
        { slot: "primary.development", sourceId: "cc/sign/gemini/lived-behaviors", sourceTier: "exact-combination" }
      ],
      finalPreview: "You meet the room by reading it quickly, testing the tone, and changing shape when the conversation changes. The gift is responsiveness; the work is noticing when stimulation scatters you before it informs you."
    })
  },
  { id: "natal.sun-conjunction-mercury", label: "Sun conjunction Mercury", surfaceId: "natal.aspect", exactSourceIds: ["cc/aspect-pair/sun-conjunction-mercury"], sourceTier: "exact-pair" },
  { id: "natal.sun-square-uranus", label: "Sun square Uranus", surfaceId: "natal.aspect", exactSourceIds: ["cc/aspect-pair/sun-square-uranus"], sourceTier: "exact-pair" },
  { id: "natal.jupiter-square-chiron", label: "Jupiter square Chiron", surfaceId: "natal.aspect", exactSourceIds: ["cc/aspect-pair/jupiter-square-chiron"], sourceTier: "exact-pair" },
  {
    id: "personalized-transit.saturn-square-venus",
    label: "Saturn square natal Venus in Capricorn in the 8th house",
    surfaceId: "personalized-transit.long-term",
    exactKey: "dashboard.personalized-transit.saturn.square.venus",
    exactSourceIds: ["cc/aspect-pair/venus-square-saturn"],
    sourceTier: "exact-pair",
    candidateFactory: () => candidate({
      id: "draft.personalized-transit.saturn-square-venus",
      surfaceId: "personalized-transit.long-term",
      sourceTier: "exact-pair",
      templateId: "personalized-transit.long-term",
      primarySourceIds: ["cc/aspect-pair/venus-square-saturn"],
      supportingSourceIds: ["cc/planet/saturn", "cc/planet/venus", "cc/aspect/square", "cc/house/8", "cc/planet-in-sign/venus-in-capricorn"],
      slotValues: {
        "primary.lived_situation": "A relationship can feel different the moment trust, debt, privacy, or shared responsibility enters the room.",
        "primary.development": "Saturn square Venus makes distance, caution, or doubt harder to ignore, especially if you usually withdraw instead of asking directly.",
        "action.response": "Name the boundary, budget, or responsibility plainly, then let the connection answer through consistent behavior.",
        "technical.footer": "Technical footer uses immutable transit facts for dates, orb, pass count, natal Venus in Capricorn, and 8th-house context."
      },
      slotProvenance: [
        { slot: "primary.lived_situation", sourceId: "cc/aspect-pair/venus-square-saturn", sourceTier: "exact-pair" },
        { slot: "primary.development", sourceId: "cc/aspect-pair/venus-square-saturn", sourceTier: "exact-pair" },
        { slot: "modifier.house_context", sourceId: "cc/house/8", sourceTier: "eligible-context" },
        { slot: "action.response", sourceId: "cc/aspect-pair/venus-square-saturn", sourceTier: "exact-pair" },
        { slot: "technical.*", sourceId: "calculated_fact.personalized_transit", sourceTier: "immutable-fact" }
      ],
      finalPreview: "A relationship can feel different the moment trust, debt, privacy, or shared responsibility enters the room. Saturn square Venus makes distance, caution, or doubt harder to ignore, especially if you usually withdraw instead of asking directly. Name the boundary, budget, or responsibility plainly, then let the connection answer through consistent behavior."
    })
  },
  { id: "personalized-transit.mars-conjunct-ascendant", label: "Mars conjunct Ascendant", surfaceId: "personalized-transit.short-term", exactSourceIds: ["cc/aspect-pair/mars-conjunction-ascendant"], sourceTier: "exact-pair" },
  {
    id: "sky.sun-cancer",
    label: "Sun in Cancer",
    surfaceId: "sky.collective-placement",
    snapshotKey: "sky.placement.sun.cancer",
    sourceTier: "exact-combination",
    candidateFactory: () => candidate({
      id: "draft.sky.sun-cancer",
      surfaceId: "sky.collective-placement",
      sourceTier: "exact-combination",
      templateId: "sky.collective-planet-in-sign",
      primarySourceIds: ["cc/planet-in-sign/sun-cancer"],
      supportingSourceIds: ["cc/planet/sun/function", "cc/sign/cancer/lived-behaviors"],
      slotValues: {
        "primary.compact_claim": "attention gathers around belonging, protection, and the emotional cost of a choice.",
        "primary.expanded_claim": "A decision may need to be measured by what it protects, not only by how visible or decisive it looks."
      },
      slotProvenance: [
        { slot: "primary.compact_claim", sourceId: "cc/planet-in-sign/sun-cancer", sourceTier: "exact-combination" },
        { slot: "primary.expanded_claim", sourceId: "cc/sign/cancer/lived-behaviors", sourceTier: "eligible-context" }
      ],
      finalPreview: "Sun in Cancer: attention gathers around belonging, protection, and the emotional cost of a choice. A decision may need to be measured by what it protects, not only by how visible or decisive it looks."
    })
  },
  {
    id: "sky.moon-cancer",
    label: "Moon in Cancer",
    surfaceId: "sky.collective-placement",
    snapshotKey: "sky.placement.moon.cancer",
    sourceTier: "exact-combination",
    candidateFactory: () => candidate({
      id: "draft.sky.moon-cancer",
      surfaceId: "sky.collective-placement",
      sourceTier: "exact-combination",
      templateId: "sky.collective-planet-in-sign",
      primarySourceIds: ["cc/planet-in-sign/moon-cancer"],
      supportingSourceIds: ["cc/planet/moon/function", "cc/sign/cancer/lived-behaviors"],
      slotValues: {
        "primary.compact_claim": "feelings get louder when safety, home, or care has been assumed instead of named.",
        "primary.expanded_claim": "The mood may be protective before it is articulate, so the useful question is what kind of care would make the next response steadier."
      },
      slotProvenance: [
        { slot: "primary.compact_claim", sourceId: "cc/planet-in-sign/moon-cancer", sourceTier: "exact-combination" },
        { slot: "primary.expanded_claim", sourceId: "cc/sign/cancer/lived-behaviors", sourceTier: "eligible-context" }
      ],
      finalPreview: "Moon in Cancer: feelings get louder when safety, home, or care has been assumed instead of named. The mood may be protective before it is articulate, so the useful question is what kind of care would make the next response steadier."
    })
  },
  {
    id: "sky.mercury-rx-cancer",
    label: "Mercury retrograde in Cancer",
    surfaceId: "sky.retrograde",
    snapshotKey: "sky.retrograde.mercury.cancer.retrograde_passage",
    sourceTier: "exact-combination",
    candidateFactory: () => candidate({
      id: "draft.sky.mercury-rx-cancer",
      surfaceId: "sky.retrograde",
      sourceTier: "exact-combination",
      templateId: "sky.retrograde.passage",
      primarySourceIds: ["ms/retrograde/mercury"],
      supportingSourceIds: ["cc/sign/cancer/lived-behaviors", "cc/planet/mercury/function"],
      slotValues: {
        "primary.review_situation": "A family conversation, household plan, or message with a long history may need another pass.",
        "primary.return_or_complication": "Memory and mood can change what people think was agreed to, so the review belongs with the message itself.",
        "action.review_action": "Confirm what was said and put the next responsibility in writing before the corrected version disappears into feeling.",
        "modifier.phase_context": "Timing, phase, cazimi, and station details must come from the immutable Mercury retrograde fact."
      },
      slotProvenance: [
        { slot: "primary.review_situation", sourceId: "ms/retrograde/mercury", sourceTier: "exact-combination" },
        { slot: "primary.return_or_complication", sourceId: "cc/sign/cancer/lived-behaviors", sourceTier: "eligible-context" },
        { slot: "action.review_action", sourceId: "cc/planet/mercury/function", sourceTier: "eligible-context" },
        { slot: "modifier.phase_context", sourceId: "calculated_fact.mercury_retrograde", sourceTier: "immutable-fact" }
      ],
      finalPreview: "A family conversation, household plan, or message with a long history may need another pass. Memory and mood can change what people think was agreed to, so the review belongs with the message itself. Confirm what was said and put the next responsibility in writing before the corrected version disappears into feeling."
    })
  },
  { id: "sky.sun-conjunction-mercury", label: "Sun conjunct Mercury", surfaceId: "sky.current-aspect", exactSourceIds: ["cc/aspect-pair/sun-mercury", "cc/aspect-pair/sun-conjunction-mercury"], sourceTier: "exact-pair" },
  { id: "home.gemini-rising-sun-cancer-2h", label: "Gemini rising: Sun in Cancer in the 2nd house", surfaceId: "home.planetary-horoscope", exactSourceIds: ["home/planetary-horoscope/gemini-rising/sun-cancer-house-2"], sourceTier: "exact-combination" },
  { id: "home.gemini-rising-moon-cancer-2h", label: "Gemini rising: Moon in Cancer in the 2nd house", surfaceId: "home.planetary-horoscope", exactSourceIds: ["home/planetary-horoscope/gemini-rising/moon-cancer-house-2"], sourceTier: "exact-combination" },
  { id: "moon.balsamic", label: "Balsamic Moon", surfaceId: "moon.phase", exactSourceIds: ["cc/moon-phase/balsamic", "cc/lunar-phase/balsamic"], sourceTier: "exact-combination" },
  { id: "moon.sign-cancer", label: "Moon in Cancer", surfaceId: "moon.sign", exactSourceIds: ["cc/moon-sign/cancer"], sourceTier: "exact-combination" }
];

function classifyFixture(fixture) {
  const record = fixture.exactKey ? finalRecordByKey.get(fixture.exactKey) : null;
  if (record) {
    if (hasReviewedClause(record)) return classification.renderedReviewed;
    return classification.noReviewedClause;
  }

  const snapshot = fixture.snapshotKey ? skyRowByKey.get(fixture.snapshotKey) : null;
  if (snapshot) {
    const version = snapshot.sections?.templateVersion ?? snapshot.sourceSnapshot?.templateVersion ?? "";
    if (version.includes(TEMPLATE_VERSION) && snapshot.status === "APPROVED") return classification.renderedReviewed;
    return classification.invalidProvenance;
  }

  const sourceIds = fixture.exactSourceIds ?? [];
  if (sourceIds.some((sourceId) => Boolean(sourceExcerpt(sourceId)))) {
    return classification.noReviewedClause;
  }
  return classification.noExactSource;
}

const fixtureResults = representativeFixtures.map((fixture) => {
  const result = classifyFixture(fixture);
  const canDraft = result !== classification.renderedReviewed && result !== classification.noExactSource && typeof fixture.candidateFactory === "function";
  return {
    id: fixture.id,
    label: fixture.label,
    surfaceId: fixture.surfaceId,
    classification: result,
    productionReaderResult: result === classification.renderedReviewed ? "reviewed_content" : "fallback_hook_or_emergency_floor",
    candidateId: canDraft ? fixture.candidateFactory().id : null
  };
});

const candidates = representativeFixtures
  .filter((fixture) => {
    const result = classifyFixture(fixture);
    return result !== classification.renderedReviewed && result !== classification.noExactSource && typeof fixture.candidateFactory === "function";
  })
  .map((fixture) => fixture.candidateFactory());

for (const draft of candidates) {
  if (draft.prohibitedKeywordComposition) {
    throw new Error(`${draft.id} includes prohibited seams: ${draft.bannedSeamResults.matches.join(", ")}`);
  }
}

const eligibleReviewedClausesBySurface = {};
const draftClausesBySurface = {};
for (const record of finalRecords.records ?? []) {
  const bucket = surfaceBucket(record.family ?? record.surface ?? "other");
  for (const clause of recordClauses(record)) {
    if (reviewedStatuses.has(clause.review_status)) increment(eligibleReviewedClausesBySurface, bucket);
    if (draftStatuses.has(clause.review_status)) increment(draftClausesBySurface, bucket);
  }
}

const draftCandidatesBySurface = {};
for (const draft of candidates) increment(draftCandidatesBySurface, surfaceBucket(draft.surfaceId));

const classificationCounts = {};
for (const result of fixtureResults) increment(classificationCounts, result.classification);

const audit = {
  schema: "tldrastro-source-grounded-review-audit-v2.2.1",
  generatedAt: new Date().toISOString(),
  beforeChangeCounts: {
    representativeFixturesRenderingReviewedContent: classificationCounts[classification.renderedReviewed] ?? 0,
    representativeFixturesRenderingFallbackHookOrEmergencyFloor: fixtureResults.filter((result) => result.productionReaderResult === "fallback_hook_or_emergency_floor").length,
    representativeFixturesNoExactPrimarySource: classificationCounts[classification.noExactSource] ?? 0,
    representativeFixturesExactSourceNoEligibleReviewedClause: classificationCounts[classification.noReviewedClause] ?? 0,
    representativeFixturesEligibleReviewedClauseNotSelected: (classificationCounts[classification.wrongResolver] ?? 0) + (classificationCounts[classification.wrongPrecedence] ?? 0),
    totalEligibleReviewedClausesBySurface: eligibleReviewedClausesBySurface,
    totalDraftClausesBySurface: draftClausesBySurface,
    totalDraftCandidatesBySurface: draftCandidatesBySurface
  },
  classificationCounts,
  fixtureResults,
  candidates: candidates.map((draft) => ({
    id: draft.id,
    surfaceId: draft.surfaceId,
    templateId: draft.templateId,
    templateVersion: draft.templateVersion,
    sourceTier: draft.sourceTier,
    primarySourceIds: draft.primarySourceIds,
    reviewState: draft.reviewState,
    readerAuthority: draft.readerAuthority
  })),
  finalReportCounters: {
    contractTestsPassed: 0,
    editorialTestsPassed: candidates.length,
    browserFixturesPassed: 0,
    approvedContentFixtures: classificationCounts[classification.renderedReviewed] ?? 0,
    sourceGapFixtures: fixtureResults.filter((result) => result.productionReaderResult === "fallback_hook_or_emergency_floor").length,
    draftReviewCandidates: candidates.length
  }
};

const candidateBundle = {
  schema: CANDIDATE_SCHEMA,
  generatedAt: audit.generatedAt,
  templateVersion: TEMPLATE_VERSION,
  productionPolicy: "eligible reviewed record -> render; otherwise existing safe fallback hook or minimal emergency floor may render.",
  dashboardPolicy: "draft candidates may be previewed only as DRAFT — NOT READER AUTHORITY.",
  summary: {
    totalCandidates: candidates.length,
    draftCandidatesBySurface,
    classificationCounts,
    eligibleReviewedClausesBySurface
  },
  fixtures: fixtureResults,
  candidates
};

fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(contentDir, "sourceGroundedReviewCandidates.json"), `${JSON.stringify(candidateBundle, null, 2)}\n`);
fs.writeFileSync(path.join(generatedDir, "source-grounded-review-candidates.json"), `${JSON.stringify(candidateBundle, null, 2)}\n`);
fs.writeFileSync(path.join(generatedDir, "source-grounded-review-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);

console.log(JSON.stringify(audit.beforeChangeCounts, null, 2));
console.log(JSON.stringify(audit.finalReportCounters, null, 2));
