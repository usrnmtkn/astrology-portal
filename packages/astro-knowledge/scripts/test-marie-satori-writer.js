#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..", "..");
const skillRoot = path.join(repoRoot, ".agents", "skills", "marie-satori-writer");
const { buildIndex } = require(path.join(skillRoot, "scripts", "build-voice-index.js"));
const { assertPacketQuotablesPassOutputBans, buildPacket, factStatusAllowsWriting, passageSupportsTargetDomain, passageUsesUnsupportedDomain, renderModelInput } = require(path.join(skillRoot, "scripts", "compile-writing-packet.js"));
const { assertRoutingMatch } = require("./sky-placement-writer-runtime.js");
const { auditRecords } = require("./audit-sky-placement-writer-fixtures.js");
const { audit } = require(path.join(skillRoot, "scripts", "audit-authorship.js"));
const { approvalLevel, proposalFor, validatePayload } = require(path.join(skillRoot, "scripts", "record-owner-feedback.js"));
const { lintArticle } = require(path.join(packageRoot, "scripts", "lint-placement-voice.js"));
const { buildJudgePrompt } = require(path.join(packageRoot, "scripts", "judge-placement-voice.js"));
const { buildReadinessReport } = require(path.join(packageRoot, "scripts", "audit-sky-placement-fallback-readiness.js"));
const { candidateRow, deterministicChecks, judgeShape, lintShape, parseArticle } = require(path.join(packageRoot, "scripts", "run-sky-placement-writer-sample.js"));

function main() {
  const index = buildIndex();
  assert(index.entries.length > 3000, "the owner corpus must be indexed at paragraph level");
  assert(index.summary.positiveVoiceEvidenceCount > 2500);
  assert(index.entries.filter((entry) => entry.useAsPositiveVoiceEvidence).every((entry) =>
    ["owner_authored_final", "exact_owner_approved"].includes(entry.authorityClass)
  ));
  assert(index.entries.filter((entry) => entry.authorityClass === "ai_candidate_unreviewed").every((entry) => !entry.useAsPositiveVoiceEvidence));
  assert(index.entries.filter((entry) => entry.authorityClass === "third_party_source").every((entry) => !entry.useAsPositiveVoiceEvidence));
  const calibrationV3 = index.entries.filter((entry) => entry.sourceId.startsWith("sky-placement-uranus-cancer-collective-owner-approval-candidate-v3:"));
  assert(calibrationV3.length >= 5);
  assert(calibrationV3.every((entry) => entry.authorityClass === "exact_owner_approved" && entry.ownerApproved && !entry.useAsPositiveVoiceEvidence));
  for (const id of ["mercury-pisces", "mars-libra", "uranus-gemini"]) {
    const recordId = `contrastive:sky-placement-pilot-${id}-owner-line-edit-v1-exact-approval`;
    assert(!index.entries.some((entry) => entry.sourceId === `${recordId}:before`));
    const approvedFallback = index.entries.find((entry) => entry.sourceId === `${recordId}:after`);
    assert(approvedFallback);
    assert.strictEqual(approvedFallback.authorityClass, "exact_owner_approved");
    assert.strictEqual(approvedFallback.ownerApproved, true);
    assert.strictEqual(approvedFallback.useAsPositiveVoiceEvidence, false);
    assert.strictEqual(approvedFallback.useAsContextualEvidence, false);
  }

  const batch2Approved = require(path.join("..", "review", "sky-placement-writer-batch-2-owner-edited-approved-v1.json"));
  assert.strictEqual(batch2Approved.articles.length, 7);
  assert.strictEqual(batch2Approved.ownerApproved, true);
  assert.strictEqual(batch2Approved.servingAuthorized, false);
  assert.strictEqual(batch2Approved.servingStatus, "staged_pending_batch_2_serving_diff");
  assert.strictEqual(batch2Approved.generationEvidence, false);
  assert(batch2Approved.articles.every((entry) => (
    entry.authorityClass === "exact_owner_approved"
    && entry.reviewStatus === "approved"
    && entry.ownerApproved === true
    && entry.renderEligible === false
    && entry.servingStatus === "staged_pending_batch_2_serving_diff"
    && entry.generationEvidence === false
    && entry.promotionAuthorized === false
    && entry.canonical === false
  )));
  assert(batch2Approved.articles.every((entry) => deterministicChecks(entry.article, {
    planet: entry.planet,
    sign: entry.sign
  }).surfaceLint.score === 3));
  assert(!/\b(?:leverage|reveals?)\b/iu.test(JSON.stringify(batch2Approved.articles.map((entry) => entry.article))));
  const batch2Taurus = batch2Approved.articles.find((entry) => entry.sign === "taurus").article;
  assert.strictEqual(batch2Taurus.close, "Before {{exitDate}}, the facts may have changed while the old answer still sounds certain.");
  assert.strictEqual(batch2Taurus.try_this[0], "We can ask what has changed since we last looked at one thing we consider settled.");

  const taxonomy = require(path.join("..", "voice", "tldr-astro", "marie-satori-writer", "failure-tags.json"));
  const requiredTags = [
    "polished_but_flat", "abstract_hook", "abstract_consequence", "requires_interpretation",
    "unnatural_personification", "behavior_missing", "generic_coverage_sentence",
    "explanatory_before_observable", "administrative_move", "category_inventory", "repeated_beat",
    "stacked_ending", "second_conclusion", "unsupported_domain_drift", "collective_second_person",
    "generic_new_age", "swappable_astrology", "overbalanced_structure", "generic_collective_opener",
    "harsh_register", "dated_communication_object", "generic_tagline"
  ];
  assert(requiredTags.every((tag) => Object.hasOwn(taxonomy.tags, tag)));

  const packet = buildPacket({
    planet: "jupiter",
    sign: "libra",
    requestedBeat: "full_article",
    emphasisBeat: "turn",
    task: "Write one complete Current Sky article for Jupiter in Libra."
  });
  const invalidatedPool = require(path.join("..", "voice", "tldr-astro", "marie-satori-writer", "surface-qualified-positive-exemplars.json"));
  assert.strictEqual(invalidatedPool.poolStatus, "invalidated_by_owner_feedback");
  assert(invalidatedPool.records.every((entry) => entry.generationEvidenceAuthorized === false));
  assert(invalidatedPool.records.every((entry) => entry.ownerVoiceVerified === false));
  assert.strictEqual(invalidatedPool.records.find((entry) => entry.sourceId.includes("venus-virgo"))?.provenanceStatus, "owner_rejected_as_positive_voice_evidence");
  assert.strictEqual(invalidatedPool.records.find((entry) => entry.sourceId.includes("moon-scorpio"))?.provenanceStatus, "owner_rejected_as_positive_voice_evidence");
  const pool = require(path.join("..", "voice", "tldr-astro", "marie-satori-writer", "surface-qualified-positive-exemplars-v2.json"));
  assert.strictEqual(pool.poolStatus, "active");
  assert(pool.records.every((entry) => entry.generationEvidenceAuthorized === true));
  assert(pool.records.every((entry) => entry.ownerVoiceVerified === true));
  assert(pool.records.every((entry) => entry.provenanceStatus === "verified_owner_published_source"));

  const formatDataset = require(path.join("..", "voice", "tldr-astro", "marie-satori-writer", "sky-placement-format-exemplars-v4.json"));
  assert.strictEqual(formatDataset.approvalScope, "voice_format_generation_evidence_only");
  assert.strictEqual(formatDataset.cards.length, 4);
  assert(formatDataset.cards.every((entry) => entry.ownerApproved && entry.generationEvidenceAuthorized));
  assert(formatDataset.cards.every((entry) => entry.reviewStatus === "needs_review" && !entry.promotionAuthorized && !entry.canonical));
  assert(formatDataset.cards.every((entry) => lintArticle({ ...entry.article, planet: entry.planet, sign: entry.sign }).score === 3));
  assert(!/\b(?:you|your|yours|yourself|yourselves|people)\b/iu.test(JSON.stringify(formatDataset.cards.map((entry) => entry.article))));
  assert.strictEqual(formatDataset.cards.find((entry) => entry.planet === "neptune").article.hook.startsWith("A relationship can look calm while someone disappears inside it."), true);
  assert.deepStrictEqual(formatDataset.movesExemplar.items, formatDataset.cards.find((entry) => entry.planet === "saturn").article.moves);

  assert(packet.ownerPassages.length >= 4 && packet.ownerPassages.length <= 6);
  assert.strictEqual(packet.positiveEvidencePoolId, "sky-placement-owner-affinity-v1");
  assert(packet.ownerPassages.every((entry) => entry.authorityClass === "owner_authored_final"));
  assert(packet.ownerPassages.every((entry) => !/\b(?:people|tilt(?:s|ed|ing)?|leak|leaks|leaked|leaking)\b/i.test(entry.text)));
  assert(packet.ownerPassages.every((entry) => !/\b(?:you|your|yours|yourself|yourselves)\b/i.test(entry.text)));
  assert(new Set(packet.ownerPassages.map((entry) => entry.sourceArticleId || entry.sourcePath)).size >= 3);
  assert(new Set(packet.ownerPassages.map((entry) => entry.paragraphStructure)).size >= 3);
  assert(packet.ownerPassages.filter((entry) => entry.matchesRequestedOperation).length >= 2);
  assert(packet.ownerPassages.some((entry) => entry.affinity === "same_sign" && entry.sourcePath.includes("libra-season-autumn-equinox")));
  assert(packet.ownerPassages.some((entry) => entry.affinity === "same_planet" && /Jupiter/i.test(entry.sourcePath)));
  assert(packet.ownerPassages.some((entry) => entry.affinity === "archetypal_adjacent"));
  assert(packet.ownerPassages.filter((entry) => entry.affinity === "archetypal_adjacent").every((entry) => !passageUsesUnsupportedDomain(entry, packet.verifiedAstrology.unsupportedDomainWarnings)));
  assert(packet.ownerPassages.filter((entry) => entry.affinity === "archetypal_adjacent").every((entry) => passageSupportsTargetDomain(entry, packet.verifiedAstrology.supportedDomains)));
  assert.strictEqual(packet.preferredVocabulary.sourceBankId, "owner-vocabulary-bank-v1");
  assert.strictEqual(packet.preferredVocabulary.use, "optional_menu_not_quota");
  assert(packet.preferredVocabulary.words.length >= 1 && packet.preferredVocabulary.words.length <= 12);
  assert(packet.preferredVocabulary.phrases.length <= 3);
  assert(packet.preferredVocabulary.words.some((entry) => entry.term === "relationships"));
  assert(packet.preferredVocabulary.words.some((entry) => entry.term === "balance"));
  assert(packet.preferredVocabulary.words.every((entry) => !/^(?:people|tilt|tilts|tilted|tilting|leak|leaks|leaked|leaking|letter|letters)$/iu.test(entry.term)));
  assert(packet.preferredVocabulary.phrases.every((entry) => !/\b(?:people|you|your|yours|yourself|yourselves)\b/iu.test(entry.phrase)));
  assert.strictEqual(packet.structuralSlots.fallbackOutputShapeUnchanged, true);
  const cycleFacts = require(path.join(packageRoot, "data", "modifiers", "planet-cycle-facts.json"));
  assert.strictEqual(packet.structuralSlots.active.some((entry) => entry.id === "cycle-line"), factStatusAllowsWriting(cycleFacts.status));
  assert.match(packet.structuralSlots.active.find((entry) => entry.id === "cycle-line").rule, /Write 'all twelve signs'; the word 'zodiac' is banned/u);
  assert(packet.structuralSlots.inactive.some((entry) => entry.id === "prior-sign-handoff"));
  assert(packet.structuralSlots.inactive.some((entry) => entry.id === "concurrent-events"));
  assert(!/PRIOR-SIGN-HANDOFF\n/u.test(renderModelInput(packet)));
  assert(!/CONCURRENT-EVENTS\n/u.test(renderModelInput(packet)));
  assert.strictEqual(packet.formatExemplars.length, 4);
  assert(packet.formatExemplars.every((entry) => entry.authorityClass === "exact_owner_approved"));
  assert(packet.formatExemplars.every((entry) => entry.approvalScope === "voice_format_generation_evidence_only"));
  assert.strictEqual(packet.formatExemplarStatus, "owner_approved_voice_format_evidence");
  assert.strictEqual(packet.ownerReferenceArticles.length, 1);
  assert.strictEqual(packet.ownerReferenceArticles[0].id, "sky-placement-jupiter-libra-owner-merged-candidate-v1");
  assert.strictEqual(packet.ownerReferenceArticles[0].authorityClass, "exact_owner_approved");
  assert.strictEqual(packet.ownerReferenceArticles[0].approvalScope, "owner_reference_fallback_and_generation_evidence_for_sky_placement");
  assert.match(packet.ownerReferenceArticles[0].article.tension, /being agreeable starts doing the work that honesty should be doing/u);
  assert.match(renderModelInput(packet), /OWNER-APPROVED PLACEMENT REFERENCE/u);
  assert.strictEqual(packet.ownerSelectedBenchmarks.length, 1);
  assert.strictEqual(packet.ownerSelectedBenchmarks[0].id, "sky-placement-mars-aries-owner-selected-generation-benchmark-v1");
  assert.strictEqual(packet.ownerSelectedBenchmarks[0].authorship, "assistant_generated_owner_selected");
  assert.match(packet.ownerSelectedBenchmarks[0].benchmarkText, /waiting starts to feel worse than whatever happens next/u);
  assert.match(renderModelInput(packet), /OWNER-SELECTED WRITING BENCHMARK/u);
  assert.strictEqual(packet.ownerCorpusWarmthEvidence.id, "warmth-foundation-jupiter-libra-v1");
  assert.strictEqual(packet.ownerCorpusWarmthEvidence.harvest_mode, "matched");
  assert.strictEqual(packet.ownerCorpusWarmthEvidence.authorityClass, "owner_corpus_derived_foundation");
  assert.strictEqual(packet.ownerCorpusWarmthEvidence.maxWarmthBeats, 1);
  assert.deepStrictEqual(packet.ownerCorpusWarmthEvidence.sourceIds, ["owner-article:weekly-horoscopes-sept-7-14-2020:p032"]);
  assert.match(renderModelInput(packet), /OWNER-CORPUS WARMTH HARVEST/u);
  assert.match(renderModelInput(packet), /Keeping the peace can cost us our voice/u);
  const noWarmthPacket = buildPacket({
    planet: "mercury",
    sign: "aries",
    requestedBeat: "full_article",
    emphasisBeat: "turn",
    task: "Write one complete Current Sky article for Mercury in Aries."
  });
  assert.strictEqual(noWarmthPacket.ownerCorpusWarmthEvidence.harvest_mode, "none_found");
  assert.strictEqual(noWarmthPacket.ownerCorpusWarmthEvidence.maxWarmthBeats, 0);
  assert.deepStrictEqual(noWarmthPacket.ownerCorpusWarmthEvidence.sourceIds, []);
  assert.strictEqual(noWarmthPacket.ownerCorpusWarmthEvidence.editorial_flags[0].blocking, false);
  assert.match(renderModelInput(noWarmthPacket), /Missing warmth is acceptable|plain register is correct|Keep the register plain/iu);
  assert.match(buildJudgePrompt({ hook: "Mercury in Aries names the answer.", lived: "The reply comes quickly.", turn: "The cost is a rushed decision." }, {
    planet: "mercury",
    sign: "aries",
    deterministicResults: { ownerCorpusWarmthEvidence: noWarmthPacket.ownerCorpusWarmthEvidence }
  }), /harvest_mode=none_found[\s\S]*Do not require or penalize the absence/iu);
  assert(packet.voiceDevices.selected.length <= 2);
  assert.strictEqual(packet.voiceDevices.maxPerArticle, 2);
  assert.strictEqual(packet.movesExemplar.status, "owner_approved_voice_format_evidence");
  assert.strictEqual(packet.movesExemplar.ownerApproved, true);
  assert.strictEqual(packet.movesExemplar.generationEvidenceAuthorized, true);
  assert.strictEqual(packet.movesExemplar.id, "sky-placement-format-v4-saturn-capricorn:moves");
  assert.strictEqual(packet.surfaceRequirements.requestedBeat, "full_article");
  assert.strictEqual(packet.surfaceRequirements.emphasisBeat, "turn");
  assert.deepStrictEqual(packet.surfaceRequirements.generatedSlots, ["opening", "tension", "development", "close", "try_this"]);
  assert.deepStrictEqual(packet.surfaceRequirements.engineOwnedSlots, [
    "headline",
    "fact_line",
    "cycle_fact_line",
    "aspect_insert",
    "entryDate",
    "exitDate",
    "priorSign",
    "priorSignEntryDate",
    "priorSignExitDate",
    "previousResidencyEntryDate",
    "previousResidencyExitDate"
  ]);
  assert.match(packet.surfaceRequirements.slotRequirements.opening, /ordinary evidence/);
  assert.match(packet.surfaceRequirements.slotRequirements.tension, /central tension/);
  assert.match(packet.surfaceRequirements.slotRequirements.development, /transit's pressure/);
  assert.match(packet.surfaceRequirements.slotRequirements.close, /lands inside the consequence/);
  assert.match(packet.surfaceRequirements.slotRequirements.try_this, /Two actions/);
  assert.strictEqual(packet.verifiedAstrology.validation.complete, true);
  assert.strictEqual(packet.verifiedAstrology.validation.failures.length, 0);
  assert(packet.verifiedAstrology.supportedDomains.includes("fairness"));
  assert(packet.verifiedAstrology.supportedDomains.includes("connections"));
  assert(packet.verifiedAstrology.supportedDomains.includes("friendships"));
  assert(packet.verifiedAstrology.supportedDomains.includes("collaborations"));
  assert(packet.verifiedAstrology.supportedDomains.includes("alliances"));
  assert(packet.verifiedAstrology.supportedDomains.includes("agreements"));
  assert.match(packet.verifiedAstrology.collectiveGift, /Romantic partnership is one expression[^.]*not its default subject/u);
  assert.match(packet.verifiedAstrology.scenarioPolicy, /Do not default to a romantic couple/u);
  assert(packet.verifiedAstrology.unsupportedDomainWarnings.some((warning) => /career/u.test(warning)));
  assert.match(packet.verifiedAstrology.sourceRegisterBoundary, /Never reproduce their person/u);
  assert(packet.verifiedAstrology.sourcePassages.every((entry) => /Do not reproduce second-person/u.test(entry.personBoundary)));
  assert.match(packet.verifiedAstrology.scenarioPolicy, /no single invented scenario may carry the whole card/i);
  assert.match(packet.verifiedAstrology.scenarioPolicy, /moments may be invented; the astrology may not/i);
  assert.strictEqual(packet.routing.laneId, "writer:sky-placement");
  assert.strictEqual(packet.routing.requestedModel, "gpt-5.6-sol");
  assert.strictEqual(packet.routing.requestedReasoningEffort, "xhigh");
  assert.doesNotMatch(JSON.stringify(packet), /contrastiveEdits|negativeExamples|failureTags|currentCandidate|centralContradiction|candidateLanguageRanking/);
  assert.match(packet.writerPrompt, /attached owner-authored Marie Satori passages/);
  assert.match(packet.writerPrompt, /selected by placement affinity/);
  assert.match(packet.writerPrompt, /Keep the transit as the subject/);
  assert.match(packet.writerPrompt, /one invented scenario must not carry the whole card/);
  assert.match(packet.writerPrompt, /verified astrology establishes the placement's meaning and limits/);
  assert.match(packet.writerPrompt, /Name the pressure, what someone does, and what changes because of it/);
  assert.match(packet.writerPrompt, /continuous article/);
  assert.match(packet.writerPrompt, /first sentence of the opening must stand alone as a clear, sendable recognition line/u);
  assert.match(packet.writerPrompt, /Name both the planet and the sign in the opening/u);
  assert.match(packet.writerPrompt, /cycle fact line uses "all twelve signs"/u);
  assert.match(packet.writerPrompt, /word "zodiac" remains banned/u);
  assert.match(packet.writerPrompt, /Do not repeat planet-cycle length or sign-stay facts in the article body/u);
  assert.match(packet.writerPrompt, /Do not use coaching scaffolds/u);
  assert.match(packet.writerPrompt, /read first thing in the morning/u);
  assert.match(packet.writerPrompt, /one tired read/u);
  assert.match(packet.writerPrompt, /Do not make every opening start the same way/u);
  assert.match(packet.writerPrompt, /Do not default to beginning a sentence with "From \{\{entryDate\}\},"/u);
  assert.match(packet.writerPrompt, /at most one article may use a try_this action about holding back/u);
  assert.match(packet.writerPrompt, /opening, tension, development, close, try_this/);
  assert.match(packet.writerPrompt, /Stop after the final action/);
  assert.match(packet.writerPrompt, /Use collective language/);
  assert.match(packet.writerPrompt, /Do not use people/);
  assert.doesNotMatch(packet.writerPrompt, /fair counteroffer|failure tags|negative examples|judge scores/i);
  assert(packet.surfaceRequirements.universalHardConstraints.some((entry) => entry.id === "CF-001"));
  assert(!packet.surfaceRequirements.universalHardConstraints.some((entry) => entry.id === "CF-006"));
  assert(!packet.surfaceRequirements.universalHardConstraints.some((entry) => entry.id === "ED-015"));
  assert(packet.surfaceRequirements.universalHardConstraints.some((entry) => entry.id === "CF-018"));
  assert.strictEqual(packet.routing.promptVersion, "sky-placement-writer-v14:owner-corpus-warmth-none-found-v1");
  assert.strictEqual(packet.packetVersion, "sky-placement-writer-packet-v3:affinity-ov039-vocab-structural-v3:self-lint-v1:connection-domain-v1:owner-reference-v1:owner-benchmark-v1:engine-cycle-fact-v1:corpus-warmth-v2-none-found");
  assert.match(packet.writerPrompt, /Some verified astrology source rows use natal or second-person register/u);
  assert.deepStrictEqual(
    assertPacketQuotablesPassOutputBans({
      verifiedAstrology: packet.verifiedAstrology,
      structuralSlots: packet.structuralSlots,
      surface: require(path.join(packageRoot, "voice", "tldr-astro", "sky-placement.json"))
    }).passed,
    true
  );
  assert.throws(() => assertPacketQuotablesPassOutputBans({
    verifiedAstrology: { timing: "Jupiter moves through the zodiac.", observableShadowBehaviors: [], sourcePassages: [] },
    structuralSlots: { active: [] },
    surface: { outputBans: { fail: [{ term: "\\bzodiac\\b", reason: "encyclopedia register" }], warn: [] } }
  }), /Packet self-lint failed before prompt render: verifiedAstrology\.timing matched fail outputBan/u);
  assert.throws(() => assertPacketQuotablesPassOutputBans({
    verifiedAstrology: { observableShadowBehaviors: [], sourcePassages: [] },
    structuralSlots: { active: [] },
    surface: {
      articleStructure: { factGatedSlots: [{ houseExample: "This energy changes the answer." }] },
      outputBans: { fail: [{ term: "this energy", reason: "name the behavior" }], warn: [] }
    }
  }), /surface\.articleStructure\.factGatedSlots\.0\.houseExample matched fail outputBan/u);
  const mercuryTaurusPacket = buildPacket({
    planet: "mercury",
    sign: "taurus",
    requestedBeat: "full_article",
    emphasisBeat: "turn",
    task: "Compile the approved Mercury in Taurus fact boundary."
  });
  assert.match(mercuryTaurusPacket.verifiedAstrology.combinedMeaning, /settle into something useful and real/u);
  assert.strictEqual(
    assertPacketQuotablesPassOutputBans({
      verifiedAstrology: mercuryTaurusPacket.verifiedAstrology,
      structuralSlots: mercuryTaurusPacket.structuralSlots,
      surface: require(path.join(packageRoot, "voice", "tldr-astro", "sky-placement.json"))
    }).passed,
    true,
    "the exact owner-approved Mercury in Taurus settle-into fact sentence must pass packet-source self-lint"
  );
  const chironPlanetary = require(path.join(packageRoot, "data", "planetary", "chiron.json"));
  const lunarNodesPlanetary = require(path.join(packageRoot, "data", "planetary", "lunar-nodes.json"));
  assert.strictEqual(chironPlanetary.status, "REVIEWED");
  assert.strictEqual(chironPlanetary.signs.length, 12);
  assert(chironPlanetary.provenance.length >= 9);
  assert.strictEqual(lunarNodesPlanetary.status, "REVIEWED");
  assert.strictEqual(lunarNodesPlanetary.signs.length, 24);
  assert(lunarNodesPlanetary.provenance.length >= 10);
  assert.match(buildPacket({
    planet: "north-node",
    sign: "aquarius",
    requestedBeat: "full_article",
    emphasisBeat: "turn",
    task: "Compile the approved North Node in Aquarius fact boundary."
  }).verifiedAstrology.signExpression, /North Node in Aquarius/u);
  assert.match(buildPacket({
    planet: "south-node",
    sign: "leo",
    requestedBeat: "full_article",
    emphasisBeat: "turn",
    task: "Compile the approved South Node in Leo fact boundary."
  }).verifiedAstrology.signExpression, /need for applause/u);
  assert.doesNotMatch(renderModelInput(packet), /evidence shortfall|owner article about the exact placement|prewritten owner scenario/i);
  assert.match(renderModelInput(packet), /establish register and beat movement only/);
  assert.match(renderModelInput(packet), /not the continuous fallback structure/);
  assert.match(renderModelInput(packet), /APPROVED OWNER VOCABULARY \(optional menu, never a quota\)/);
  assert.match(renderModelInput(packet), /Use only what fits naturally\. Do not force, stack, or repeat them\./);
  const renderedPacket = renderModelInput(packet);
  if (factStatusAllowsWriting(cycleFacts.status)) {
    assert.match(renderedPacket, /CYCLE-LINE[\s\S]*?planet-cycle-facts/u);
    assert.match(renderedPacket, /engine renders this block; do not add a new output key or restate it elsewhere/u);
  }
  else assert.doesNotMatch(renderedPacket, /CYCLE-LINE[\s\S]*?planet-cycle-facts/u);
  assert.doesNotMatch(renderModelInput(packet), /exact owner approval for generation evidence is still pending|Pending owner input/);
  const routing = assertRoutingMatch({ packet, actualModel: "gpt-5.6-sol", actualReasoningEffort: "xhigh", actualLaneId: "writer:sky-placement" });
  assert.strictEqual(routing.routingMatchStatus, "matched");
  assert.strictEqual(routing.retrievedOwnerSourceIds.length, packet.ownerPassages.length);
  assert.deepStrictEqual(routing.warmthOwnerSourceIds, packet.ownerCorpusWarmthEvidence.sourceIds);
  assert.throws(() => assertRoutingMatch({ packet, actualModel: "gpt-5.6-terra", actualReasoningEffort: "xhigh", actualLaneId: "writer:sky-placement" }), /model/);
  assert.throws(() => assertRoutingMatch({ packet, actualModel: "gpt-5.6-sol", actualReasoningEffort: "low", actualLaneId: "writer:sky-placement" }), /reasoningEffort/);
  assert.throws(() => assertRoutingMatch({ packet, actualModel: "gpt-5.6-sol", actualReasoningEffort: "xhigh", actualLaneId: "generation:default" }), /laneId/);

  const reviewedFactRows = [
    ...["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"].map((sign) => `mercury-${sign}`),
    ...["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"].map((sign) => `mars-${sign}`),
    "jupiter-leo", "saturn-aries", "uranus-gemini", "neptune-aries", "pluto-aquarius",
    "chiron-aries", "north-node-aquarius", "south-node-leo"
  ].map((id) => require(path.join(packageRoot, "data", "placements", "sign", `${id}.json`)));
  assert(reviewedFactRows.every((entry) => entry.status === "REVIEWED"));
  assert.match(reviewedFactRows.find((entry) => entry.id === "saturn-aries").body, /Saturn is in fall/u);
  assert.strictEqual(reviewedFactRows.find((entry) => entry.id === "mercury-leo").tldr, "Mercury in Leo: the mind is expressive, warm, and built for confident delivery.");
  assert.match(reviewedFactRows.find((entry) => entry.id === "mercury-libra").challenge, /approval-seeking/u);
  assert.doesNotMatch(reviewedFactRows.find((entry) => entry.id === "mercury-libra").challenge, /people-pleasing/u);
  assert.match(reviewedFactRows.find((entry) => entry.id === "mars-leo").gift, /stamina when the pressure is on/u);
  assert.doesNotMatch(reviewedFactRows.find((entry) => entry.id === "mars-pisces").challenge, /leak/iu);
  assert.match(reviewedFactRows.find((entry) => entry.id === "jupiter-leo").gift, /included in the win/u);
  assert.match(reviewedFactRows.find((entry) => entry.id === "neptune-aries").tldr, /imagination and idealism attach to action/u);
  assert.match(reviewedFactRows.find((entry) => entry.id === "pluto-aquarius").tldr, /power transforms through networks/u);

  const readiness = buildReadinessReport();
  assert.strictEqual(readiness.totals.placements, 168);
  assert.strictEqual(readiness.totals.writerReady, 43);
  assert.deepStrictEqual(readiness.writer.ready, [
    "mercury-aries", "mercury-taurus", "mercury-gemini", "mercury-cancer", "mercury-leo",
    "mercury-virgo", "mercury-libra", "mercury-scorpio", "mercury-sagittarius", "mercury-capricorn",
    "mercury-aquarius", "mercury-pisces",
    "mars-aries", "mars-taurus", "mars-gemini", "mars-cancer", "mars-leo", "mars-virgo",
    "mars-libra", "mars-scorpio", "mars-sagittarius", "mars-capricorn",
    "mars-aquarius", "mars-pisces",
    "jupiter-aries", "jupiter-taurus", "jupiter-gemini", "jupiter-cancer",
    "jupiter-leo", "jupiter-virgo", "jupiter-libra", "jupiter-scorpio",
    "jupiter-sagittarius", "jupiter-capricorn", "jupiter-aquarius", "jupiter-pisces",
    "saturn-aries", "uranus-gemini", "neptune-aries", "pluto-aquarius",
    "chiron-aries", "north-node-aquarius", "south-node-leo"
  ]);
  assert.strictEqual(readiness.writer.blockedByReason.other, undefined);
  assert.strictEqual(readiness.totals.runtimeRenderReady, 60);
  assert.strictEqual(readiness.totals.continuousRowsReady, 1);
  assert.strictEqual(readiness.totals.standaloneHookRowsReady, 36);
  assert.strictEqual(readiness.totals.retiredPairCoreAvailable, 168);
  assert.strictEqual(readiness.totals.retiredPairFullFiveAvailable, 168);
  assert.deepStrictEqual(readiness.runtime.quarantinedRows, []);

  const continuousCandidate = {
    opening: "Jupiter moves into Libra on {{entryDate}}, and a shared decision can no longer stay vague.",
    tension: "Agreement helps until one voice makes every choice and calls the result fair.",
    development: "Name the preference before the plan is final. Let disagreement arrive while there is still time to change the answer.",
    close: "Before {{exitDate}}, settle one choice that has stayed open because nobody wanted to disagree.",
    try_this: ["Name one preference before agreeing.", "Ask what changes if the first answer is no."]
  };
  assert.deepStrictEqual(parseArticle(JSON.stringify(continuousCandidate)), continuousCandidate);
  assert.deepStrictEqual(Object.keys(judgeShape(continuousCandidate)), ["hook", "lived", "turn", "moves"]);
  assert.deepStrictEqual(Object.keys(lintShape(continuousCandidate)), ["hook", "lived", "turn", "close", "moves"]);
  const continuousChecks = deterministicChecks(continuousCandidate, { planet: "jupiter", sign: "libra" });
  assert.strictEqual(continuousChecks.engineSlots.passed, true);
  const continuousRow = candidateRow(continuousCandidate, { planet: "jupiter", sign: "libra", runId: "test-run" });
  assert.strictEqual(continuousRow.contentKey, "fallback-hook/sky-sign-copy/jupiter/libra");
  assert.strictEqual(continuousRow.render_policy, "sky-placement-continuous-v2");
  assert.strictEqual(continuousRow.review_status, "needs_review");
  assert.strictEqual(continuousRow.render_eligible, false);
  assert.strictEqual(continuousRow.ownerApproved, false);

  const target = {
    sourceId: "writer-reset-test",
    planet: "saturn",
    sign: "capricorn",
    article: {
      tagline: "Work fails when the manager can never rest.",
      hook: "Ambition stops looking impressive when the manager holding everything together cannot take a day off. Saturn in Capricorn exposes work that depends on the same manager staying late.",
      lived: "Saturn spends about two and a half years in a sign. A deadline gets met because the manager catches every mistake and gives up another weekend.",
      turn: "The work does not hold its value if exhaustion is part of the plan.",
      moves: ["Move one deadline before it costs another weekend.", "Name who can catch the next mistake."]
    }
  };
  const cleanAudit = audit(target);
  assert.strictEqual(cleanAudit.gate, "authorship_review_required", "semantic authorship review cannot be skipped even when deterministic checks pass");
  const badAudit = audit({
    sourceId: "bad",
    planet: "venus",
    sign: "virgo",
    article: {
      tagline: "Trust the process",
      hook: "The banished want refuses to stay reasonable. Venus in Virgo creates change.",
      lived: "This transit brings growth and transformation for everyone.",
      turn: "Embrace the change and trust the process. Wishing you a beautiful transit.",
      moves: ["Trust the process.", "Step into your power."]
    }
  });
  assert.strictEqual(badAudit.gate, "rewrite_required");
  assert(badAudit.deterministicFindings.some((finding) => finding.rule === "known-negative-exact-match"));

  const directional = {
    feedbackKind: "directional_approval",
    surface: "sky-placement",
    articleBeat: "hook",
    after: "A preferred line.",
    ownerStatement: "This is better.",
    sourcePaths: ["review/example.json"]
  };
  assert.doesNotThrow(() => validatePayload(directional, { confirmExact: false }));
  assert.throws(() => validatePayload({ ...directional, feedbackKind: "exact_wording_approval" }, { confirmExact: false }), /confirm-exact-approval/);
  assert.throws(() => validatePayload({ ...directional, feedbackKind: "governed_content_promotion_approval" }, { confirmExact: false }), /cannot promote/);
  assert.strictEqual(approvalLevel("rejection"), "owner_rejected");
  assert.strictEqual(approvalLevel("exact_wording_approval"), "exact_owner_approved");
  const scopedApproval = proposalFor({
    ...directional,
    feedbackKind: "exact_wording_approval",
    ownerStatement: "I explicitly approve this exact fallback wording.",
    approvalScope: "owner_approved_fallback_article_for_placement_page_serving_and_wiring_separate",
    beforeIsRejected: false
  });
  assert.strictEqual(scopedApproval.beforeIsRejected, false);
  assert.strictEqual(scopedApproval.exactApprovalScope, "owner_approved_fallback_article_for_placement_page_serving_and_wiring_separate");

  const v7 = require(path.join("..", "review", "sky-placement-voice-pass-v7-writer-candidates.json"));
  const attestations = require(path.join("..", "review", "sky-placement-voice-pass-v7-authorship-attestations.json"));
  assert.strictEqual(v7.candidates.length, 3);
  assert.strictEqual(attestations.status, "superseded_by_owner_feedback_2026-08-03");
  for (const candidate of v7.candidates) {
    assert.strictEqual(candidate.status, "needs_review");
    assert.strictEqual(candidate.ownerApproved, false);
    assert.strictEqual(candidate.promotionAuthorized, false);
    assert.strictEqual(candidate.canonical, false);
    const report = audit({
      sourceId: candidate.candidateId,
      planet: candidate.planet,
      sign: candidate.sign,
      article: candidate.article
    }, attestations.attestations[candidate.candidateId]);
    assert.strictEqual(report.gate, "rewrite_required", "August 3 owner feedback invalidates every V7 candidate");
  }

  const peopleOpener = lintArticle({
    planet: "uranus", sign: "pisces", tagline: "Change the answer",
    hook: "People can care deeply and still leave the rule untouched. Uranus in Pisces changes the response.",
    lived: "Over roughly seven years, the same request returns. Friends answer it again.",
    turn: "The response stays temporary. The request returns.",
    moves: ["Name the repeated request.", "Change the next response."]
  });
  assert(peopleOpener.findings.some((finding) => finding.severity === "fail" && /People/.test(finding.match || "")));
  const peopleMidSentence = lintArticle({
    planet: "jupiter", sign: "libra", tagline: "Name the choice",
    hook: "We keep saying either is fine until one voice takes over. Jupiter in Libra changes how people make a shared choice.",
    lived: "For about a year, someone names what they want before the plan is final. We hear the disagreement sooner.",
    turn: "The choice is not shared when one person decides and everyone else goes along with it.",
    moves: ["Name one preference before agreeing.", "Ask who has not answered yet."]
  });
  assert(peopleMidSentence.findings.some((finding) => finding.severity === "fail" && /^people$/i.test(finding.match || "")));
  const reviewedEditorialShorthand = lintArticle({
    planet: "jupiter", sign: "libra", tagline: "Name the choice",
    hook: "We keep saying either is fine until one voice takes over. Jupiter in Libra offers a fair counteroffer and a thoughtful compromise.",
    lived: "For about a year, a dinner plan starts to tilt before anyone names the disagreement. Someone finally says no.",
    turn: "The plan changes when both sides get a real say.",
    moves: ["Name one preference before agreeing.", "Ask who has not answered yet."]
  });
  for (const term of ["fair counteroffer", "thoughtful compromise", "tilt", "both sides get a real say"]) {
    assert(reviewedEditorialShorthand.findings.some((finding) => finding.severity === "fail" && new RegExp(term, "i").test(finding.match || "")));
  }
  const libraInvitationScheduling = lintArticle({
    planet: "jupiter", sign: "libra", tagline: "Name the choice",
    hook: "Jupiter in Libra changes which connections can hold an honest answer.",
    lived: "By the third invitation of the week, the answer is still yes. When a date does not work, we call it fine and rearrange everything else around it.",
    turn: "The connection becomes another obligation. The honest answer arrives too late.",
    moves: ["Answer the invitation.", "Keep the answer."]
  });
  assert(libraInvitationScheduling.findings.some((finding) => finding.decisionId === "ED-022" && finding.source === "sign-conditional-meme-scene"));
  const virgoMeme = lintArticle({
    planet: "mercury", sign: "virgo", tagline: "The details become visible",
    hook: "A color-coded spreadsheet takes over the week. Mercury in Virgo changes how the work is sorted.",
    lived: "For a few weeks, the same detail returns. Someone checks it again.",
    turn: "The checking becomes the delay. The answer arrives late.",
    moves: ["Name the missing detail.", "Send the answer."]
  });
  assert(virgoMeme.findings.some((finding) => finding.decisionId === "ED-022" && /color-coded spreadsheet/i.test(finding.match || "")));
  const datedLetters = lintArticle({
    planet: "uranus", sign: "pisces", tagline: "Change the answer",
    hook: "Three families receive the same reply. Uranus in Pisces changes the response.",
    lived: "Over roughly seven years, three families compare letters. The same delay returns.",
    turn: "The answer stays temporary. The request returns.",
    moves: ["Compare the messages.", "Change the next response."]
  });
  assert(datedLetters.findings.some((finding) => finding.severity === "fail" && /letters/i.test(finding.match || "")));
  const ordinaryMessages = lintArticle({
    planet: "uranus", sign: "pisces", tagline: "Change the answer",
    hook: "Three families receive the same rejection message. Uranus in Pisces changes the response.",
    lived: "Over roughly seven years, three families compare the messages they received. The same answer returns.",
    turn: "The response stays temporary. The request returns.",
    moves: ["Compare the messages.", "Change the next response."]
  });
  assert(!ordinaryMessages.findings.some((finding) => finding.severity === "fail" && /communication|letter|message/i.test(finding.reason || "")));
  const leakAiTell = lintArticle({
    planet: "moon", sign: "scorpio", tagline: "Someone says what happened before resentment takes over.",
    hook: "A disagreement stays hidden until someone stops pretending it is fine. The Moon in Scorpio makes the silence harder to ignore.",
    lived: "For about two and a half days, the same argument returns in smaller comments. Someone goes quiet and waits to see who notices.",
    turn: "Say the raw thing and it clears. Hold it in and it leaks out sideways, aimed at whoever is closest.",
    moves: ["Name the disagreement.", "Say what changed."]
  });
  assert(leakAiTell.findings.some((finding) => finding.severity === "fail" && /leaks/i.test(finding.match || "")));
  const technicalReplacement = lintArticle({
    planet: "uranus", sign: "pisces", tagline: "Change the answer",
    hook: "Three families receive the same portal notification. Uranus in Pisces changes the response.",
    lived: "Over roughly seven years, the same automated communication returns. The delay continues.",
    turn: "The response stays temporary. The request returns.",
    moves: ["Name the repeated reply.", "Change the next response."]
  });
  assert(technicalReplacement.findings.some((finding) => finding.severity === "fail" && /technical substitute/i.test(finding.reason || "")));
  const physicalMail = lintArticle({
    planet: "mercury", sign: "cancer", tagline: "Read what arrived",
    hook: "A handwritten letter arrives in the mail after years of silence. Mercury in Cancer returns to what was never said.",
    lived: "The paper letter names the memory everyone avoided. The conversation starts again.",
    turn: "The words were delayed, but the answer is no longer missing.",
    moves: ["Read the letter together.", "Name what changed after it was mailed."]
  });
  assert(!physicalMail.findings.some((finding) => finding.reason === "default to message or response unless the scene specifically depends on physical mail"));
  const harshWord = lintArticle({
    planet: "uranus", sign: "pisces", tagline: "Change the answer",
    hook: "Friends recognize the request. Uranus in Pisces changes the response.",
    lived: "Over roughly seven years, the same harm returns. Friends stop calling it unusual.",
    turn: "The answer stays temporary. The request returns.",
    moves: ["Name the repeated request.", "Change the next response."]
  });
  assert(!harshWord.findings.some((finding) => /harm/i.test(finding.match || "")), "harm is a contextual judge decision, not a blanket mechanical ban");

  const registry = require(path.join("..", "config", "editorial-model-registry.json"));
  assert.strictEqual(registry.lanes["writer:sky-placement"].active, null);
  assert.strictEqual(registry.lanes["writer:sky-placement"].candidate.model, "gpt-5.6-sol");
  assert.strictEqual(registry.lanes["writer:sky-placement"].candidate.reasoningEffort, "xhigh");
  assert.strictEqual(registry.lanes["judge:sky-placement"].active.model, "gpt-5.6-terra");
  assert.strictEqual(registry.lanes["judge:sky-placement"].active.reasoningEffort, "low");

  const writerPolicy = require(path.join("..", "config", "marie-satori-writer-policy-v1.json"));
  assert.match(writerPolicy.voiceTarget.permanentRule, /Chani-adjacent cadence is acceptable/);
  assert.strictEqual(writerPolicy.voiceTarget.advocacySubjectsRequireAstrologyAndOwnerSupport, true);
  assert(writerPolicy.voiceTarget.ownerRecurringConcerns.includes("gatekeeping"));
  assert(writerPolicy.voiceTarget.advocacyDefaultSubjects.includes("policy reform"));
  assert.strictEqual(writerPolicy.voiceTarget.thirdPartyProseIsVoiceEvidence, false);
  const judgePrompt = buildJudgePrompt(target.article, { tier: "social", planet: "jupiter", sign: "libra", deterministicResults: { score: 3, fails: 0 } });
  assert.match(judgePrompt, /COMPACT FINAL-ACCEPTABILITY RUBRIC/);
  assert.match(judgePrompt, /\[CF-016\].*Chani-adjacent warmth/);
  assert.match(judgePrompt, /\[CF-007\].*does not default to campaigns/);
  assert.match(judgePrompt, /\[CF-005\].*Reserve harm and self-harm for literal harm/);
  assert.match(judgePrompt, /DETERMINISTIC CHECK RESULTS/);
  assert.match(judgePrompt, /A Jupiter year is not a dinner/);
  assert.match(judgePrompt, /Generic product copy/);
  assert.match(judgePrompt, /cite three lines/i);
  assert.match(judgePrompt, /facilitation-register hit in moves is score 1/i);
  assert.match(judgePrompt, /"fails": 0/);
  assert.doesNotMatch(judgePrompt, /OWNER VOCABULARY PALETTE|DIRECTIONAL BEAT EVIDENCE|failure tags/i);

  const agents = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
  assert.match(agents, /\.agents\/skills\/marie-satori-writer\/SKILL\.md/);
  const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  assert.doesNotMatch(skill, /\[TODO/);
  assert.match(skill, /name: marie-satori-writer/);
  assert.match(skill, /Terra only at the end/);
  assert.match(skill, /Chani can influence the softness of the delivery; Marie determines what the article notices/);
  const fixtureAudit = auditRecords();
  assert.strictEqual(fixtureAudit.sourceRecordCount, 28);
  assert.strictEqual(fixtureAudit.validFixtureCount, 6);
  assert.strictEqual(fixtureAudit.exactShortfall, 14);
  console.log(`Marie Satori writer environment passed: ${index.entries.length} indexed excerpts, governed retrieval, authorship gate, feedback safety, and separated writer/judge roles.`);
}

try { main(); } catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
