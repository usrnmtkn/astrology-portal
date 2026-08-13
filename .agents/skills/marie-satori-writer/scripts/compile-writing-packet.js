#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { buildIndex, repoRoot } = require("./build-voice-index.js");
const { readRegistry, resolveCandidateRelease } = require(path.join(repoRoot, "packages", "astro-knowledge", "scripts", "editorial-model-registry.js"));

const packageRoot = path.join(repoRoot, "packages", "astro-knowledge");
const PACKET_VERSION = "sky-placement-writer-packet-v3:affinity-ov039-vocab-structural-v3:self-lint-v1:connection-domain-v1:owner-reference-v1:owner-benchmark-v1:engine-cycle-fact-v1:corpus-warmth-v2-none-found:node-axis-v1";
const RELEASE_ID = "sky-placement-writer-openai-gpt-5.6-sol-candidate-v2";
const promptConfig = require(path.join(packageRoot, "config", "sky-placement-writer-prompt-v5.json"));
const compiledWriterPolicy = require(path.join(packageRoot, "voice", "tldr-astro", "writer-policy.generated.json"));
const compiledVocabularyPolicy = require(path.join(packageRoot, "voice", "tldr-astro", "vocabulary-policy.generated.json"));
const retrievalExclusions = require(path.join(packageRoot, "voice", "tldr-astro", "marie-satori-writer", "retrieval-exclusions.json"));
const formatExemplarDataset = require(path.join(packageRoot, "voice", "tldr-astro", "marie-satori-writer", "sky-placement-format-exemplars-v4.json"));
const ownerCorpusWarmthFoundations = require(path.join(packageRoot, "voice", "tldr-astro", "marie-satori-writer", "owner-corpus-warmth-foundations-v1.json"));
const ownerReferenceArticle = require(path.join(packageRoot, "review", "sky-placement-jupiter-libra-owner-merged-candidate-v1.json"));
const ownerSelectedBenchmark = require(path.join(packageRoot, "review", "sky-placement-mars-aries-owner-selected-generation-benchmark-v1.json"));
const planetCycleFacts = require(path.join(packageRoot, "data", "modifiers", "planet-cycle-facts.json"));
const { lintArticle } = require(path.join(packageRoot, "scripts", "lint-placement-voice.js"));
const { renderOwnerVocabularySelection, selectOwnerVocabulary } = require(path.join(packageRoot, "scripts", "owner-vocabulary-prompt.js"));
const AFFINITY_POOL_ID = "sky-placement-owner-affinity-v1";
const ACTIVE_FACT_STATUSES = new Set(["REVIEWED", "LIVE", "APPROVED"]);
const UNSUPPORTED_DOMAIN_PATTERNS = {
  career: /\b(?:career|careers|professional|professionally|promotion|promotions)\b/iu,
  work: /\b(?:work|works|worked|working|workplace|workplaces|job|jobs|employment|office|offices|paycheck|paychecks)\b/iu,
  money: /\b(?:money|financial|finances|financially|debt|debts|investment|investments|income|earnings|banking|scarcity|rent|housing)\b/iu,
  credit: /\b(?:credit|credits|loan|loans|lender|lenders|borrowing)\b/iu,
  spending: /\b(?:spend|spends|spending|spent|purchase|purchases|buy|buying|bought)\b/iu,
  technology: /\b(?:technology|technologies|digital|internet|platform|platforms|algorithm|algorithms|social networks?|search engines?|artificial intelligence|\bAI\b)\b/iu,
  politics: /\b(?:politics|political|government|governments|president|presidents|leader|leaders|policy|policies)\b/iu,
  political: /\b(?:politics|political|government|governments|president|presidents|leader|leaders|policy|policies)\b/iu,
  war: /\b(?:war|wars|warfare|bomb|bombs|bombed|bombing|military|invasion|invasions|bunker|bunkers|defense)\b/iu,
  health: /\b(?:health|medical|medicine|diagnosis|diagnoses|disease|illness|treatment|symptom|symptoms)\b/iu,
  medical: /\b(?:health|medical|medicine|diagnosis|diagnoses|disease|illness|treatment|symptom|symptoms)\b/iu,
  romance: /\b(?:romance|romantic|dating|date|dates|lover|lovers)\b/iu,
  prediction: /\b(?:predict|predicts|predicted|prediction|predictions|will happen|is going to happen)\b/iu,
  travel: /\b(?:travel|travels|traveling|travelling|trip|trips|journey|journeys|abroad)\b/iu,
  "higher education": /\b(?:higher education|college|colleges|university|universities|degree|degrees|academic|academia)\b/iu,
  law: /\b(?:law|laws|legal|court|courts|lawsuit|lawsuits)\b/iu,
  houses: /\b(?:houses?|first house|second house|third house|fourth house|fifth house|sixth house|seventh house|eighth house|ninth house|tenth house|eleventh house|twelfth house)\b/iu,
  natal: /\b(?:natal|birth chart|birth charts)\b/iu
};
const SUPPORTED_DOMAIN_PATTERNS = {
  connections: /\b(?:connection|connections|relationship|relationships|friend|friends|friendship|friendships|collaborator|collaborators|collaboration|collaborations|ally|allies|alliance|alliances|agreement|agreements|social ties?)\b/iu,
  relationships: /\b(?:relationship|relationships|relational|partner|partners|partnership|partnerships|couple|couples|friend|friends|friendship|friendships)\b/iu,
  partnerships: /\b(?:partner|partners|partnership|partnerships|collaborate|collaboration|collaborations)\b/iu,
  friendships: /\b(?:friend|friends|friendship|friendships)\b/iu,
  collaborations: /\b(?:collaborate|collaborates|collaborated|collaborating|collaboration|collaborations|collaborator|collaborators)\b/iu,
  alliances: /\b(?:ally|allies|alliance|alliances)\b/iu,
  agreements: /\b(?:agreement|agreements|agree|agrees|agreed|agreeing)\b/iu,
  "romantic relationships": /\b(?:romantic|romance|dating|date|dates|couple|couples|partner|partners)\b/iu,
  "social settings": /\b(?:group|groups|meeting|meetings|conversation|conversations|gathering|gatherings|social)\b/iu,
  fairness: /\b(?:fair|fairness|unfair|equal|equality|balance|balanced|scales?)\b/iu,
  diplomacy: /\b(?:diplomacy|diplomatic|agreement|agreements|disagreement|disagreements|conflict|conflicts)\b/iu,
  compromise: /\b(?:compromise|compromises|compromised|compromising)\b/iu,
  negotiation: /\b(?:negotiate|negotiates|negotiated|negotiating|negotiation|negotiations)\b/iu,
  "artistic judgment": /\b(?:art|artist|artists|artistic|creative|creativity|design|taste)\b/iu,
  beauty: /\b(?:beauty|beautiful|attractive|attraction|aesthetic|aesthetics)\b/iu,
  ideals: /\b(?:ideal|ideals|idealism|idealistic|principle|principles)\b/iu,
  imagination: /\b(?:imagination|imagine|imagines|imagined|imagining|dream|dreams|vision|visions|visionary)\b/iu,
  inspiration: /\b(?:inspiration|inspire|inspires|inspired|inspiring)\b/iu,
  belief: /\b(?:belief|beliefs|believe|believes|believed|believing|faith)\b/iu,
  courage: /\b(?:courage|courageous|brave|bravery|bold|boldly)\b/iu,
  "new beginnings": /\b(?:new beginning|new beginnings|begin|begins|beginning|beginnings|start|starts|starting|initiate|initiative)\b/iu,
  "uncertainty around action": /\b(?:uncertain|uncertainty|hesitate|hesitation|action|act|acting|decision|decide)\b/iu,
  power: /\b(?:power|powers|powerful|control|controls|authority|influence)\b/iu,
  systems: /\b(?:system|systems|structure|structures|institution|institutions|organize|organization)\b/iu,
  "groups and networks": /\b(?:group|groups|network|networks|community|communities|collective|collectives)\b/iu,
  "technology's effect on both": /\b(?:technology|technologies|digital|internet|platform|platforms|algorithm|algorithms|network|networks)\b/iu,
  "generational change": /\b(?:generation|generational|era|change|changes|changing|transform|transformation)\b/iu,
  identity: /\b(?:identity|self|sense of self|who .* (?:is|are))\b/iu,
  assertion: /\b(?:assert|asserts|assertion|assertive|speak up|stand up|say no)\b/iu,
  "self-worth": /\b(?:self-worth|self worth|worth|worthy|deserve|deserving)\b/iu,
  "taking up space": /\b(?:take up space|taking up space|room|presence|visible|visibility)\b/iu,
  "healing and repair (wound language is literal here and licensed)": /\b(?:heal|heals|healing|repair|repairs|wound|wounds|hurt|tender)\b/iu,
  "growth direction and release": /\b(?:growth|develop|development|direction|release|letting go|move toward|moves toward)\b/iu,
  "personal spotlight versus community": /\b(?:spotlight|center stage|community|collective|group|groups|shared)\b/iu,
  "attention and applause": /\b(?:attention|applause|approval|recognition|seen|visibility)\b/iu,
  "shared projects": /\b(?:shared project|shared projects|project|projects|build together|work together)\b/iu,
  collaboration: /\b(?:collaborate|collaborates|collaborated|collaborating|collaboration|collaborations|collaborator|collaborators)\b/iu
};
const OUTPUT_BAN_META = /[\\^$.*+?()[\]{}|]/u;
const NON_QUOTABLE_FACT_KEYS = new Set([
  "body", "date", "dateIso", "eventType", "id", "meaningSource", "rank",
  "renderTokens", "sourceId", "sourcePath", "sourceStatus", "status"
]);

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function factStatusAllowsWriting(status) {
  return ACTIVE_FACT_STATUSES.has(String(status || "").trim().toUpperCase());
}

function passageUsesUnsupportedDomain(entry, warnings = []) {
  const warningText = warnings.join(" ").toLowerCase();
  return Object.entries(UNSUPPORTED_DOMAIN_PATTERNS).some(([domain, pattern]) =>
    warningText.includes(domain) && pattern.test(String(entry?.text || ""))
  );
}

function passageSupportsTargetDomain(entry, supportedDomains = []) {
  const text = String(entry?.text || "");
  return supportedDomains.some((domain) => SUPPORTED_DOMAIN_PATTERNS[domain]?.test(text));
}

function outputBanRegex(term) {
  if (term === "—") return /—/u;
  if (OUTPUT_BAN_META.test(term.replace(/ /gu, ""))) return new RegExp(term, "iu");
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu");
}

function collectHouseExamples(value, pathParts = [], records = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectHouseExamples(entry, [...pathParts, String(index)], records));
    return records;
  }
  if (!value || typeof value !== "object") return records;
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    if (key === "houseExample" && typeof child === "string") {
      records.push({ path: childPath.join("."), text: child });
    }
    collectHouseExamples(child, childPath, records);
  }
  return records;
}

function collectFactValueStrings(value, pathParts = [], records = []) {
  if (typeof value === "string") {
    records.push({ path: pathParts.join("."), text: value });
    return records;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectFactValueStrings(entry, [...pathParts, String(index)], records));
    return records;
  }
  if (!value || typeof value !== "object") return records;
  for (const [key, child] of Object.entries(value)) {
    if (NON_QUOTABLE_FACT_KEYS.has(key)) continue;
    collectFactValueStrings(child, [...pathParts, key], records);
  }
  return records;
}

function collectPacketQuotables({ verifiedAstrology, structuralSlots, surface }) {
  const records = [];
  for (const key of ["planetFunction", "signExpression", "combinedMeaning", "collectiveGift", "timing"]) {
    if (typeof verifiedAstrology?.[key] === "string") records.push({ path: `verifiedAstrology.${key}`, text: verifiedAstrology[key] });
  }
  (verifiedAstrology?.observableShadowBehaviors || []).forEach((text, index) => {
    if (typeof text === "string") records.push({ path: `verifiedAstrology.observableShadowBehaviors.${index}`, text });
  });
  (verifiedAstrology?.sourcePassages || []).forEach((source, index) => {
    if (typeof source?.text === "string") records.push({ path: `verifiedAstrology.sourcePassages.${index}.text`, text: source.text });
  });
  for (const [index, slot] of (structuralSlots?.active || []).entries()) {
    collectFactValueStrings(slot.facts, ["structuralSlots", "active", String(index), "facts"], records);
  }
  collectHouseExamples(surface, ["surface"], records);
  return records;
}

function assertPacketQuotablesPassOutputBans({ verifiedAstrology, structuralSlots, surface }) {
  const quotables = collectPacketQuotables({ verifiedAstrology, structuralSlots, surface });
  const bans = [
    ...(surface.outputBans?.fail || []).map((entry) => ({ ...entry, level: "fail" })),
    ...(surface.outputBans?.warn || []).filter((entry) => entry.packetSourceAllowed !== true).map((entry) => ({ ...entry, level: "warn" }))
  ];
  const findings = [];
  for (const record of quotables) {
    for (const ban of bans) {
      const match = record.text.match(outputBanRegex(ban.term));
      if (!match) continue;
      const waived = (surface.packetSourceWaivers || []).some((waiver) => (
        waiver.term === ban.term
        && typeof waiver.exactText === "string"
        && record.text.includes(waiver.exactText)
      ));
      if (!waived) findings.push({ path: record.path, level: ban.level, term: ban.term, match: match[0], reason: ban.reason });
    }
  }
  if (findings.length) {
    const detail = findings.map((finding) => `${finding.path} matched ${finding.level} outputBan ${JSON.stringify(finding.term)} with ${JSON.stringify(finding.match)}`).join("; ");
    throw new Error(`Packet self-lint failed before prompt render: ${detail}.`);
  }
  return { passed: true, scanned: quotables.length, policy: "sky-placement.outputBans.fail+blocking-warn" };
}

function matchesAffinityOperation(entry, target) {
  if (matchesRequestedOperation(entry, target.beat || "turn")) return true;
  if ((target.beat || "turn") !== "turn" || !passageSupportsTargetDomain(entry, target.supportedDomains)) return false;
  return /\b(?:but|instead|limiting|heavy|clarif(?:y|ies|ied|ying)|unfair|conflict|disagreement|doesn['’]t|isn['’]t|cannot|can['’]t|no longer|too much)\b/iu.test(String(entry?.text || ""));
}

function buildFactGatedStructure({ planet, surface, engineFacts = {} }) {
  const definitions = new Map((surface.articleStructure?.factGatedSlots || []).map((entry) => [entry.id, entry]));
  const active = [];
  const inactive = [];
  const add = (id, facts, ready, extra = {}) => {
    const definition = definitions.get(id);
    if (!definition) throw new Error(`Missing Sky Placement structural-slot definition: ${id}.`);
    const record = {
      id,
      rule: definition.rule,
      requiresFact: definition.requiresFact,
      maxOccurrences: definition.maxOccurrences,
      continuousFallbackTarget: definition.continuousFallbackTarget,
      ...extra
    };
    if (ready) active.push({ ...record, facts });
    else inactive.push({ id, reason: extra.reason || "required backing fact was not supplied" });
  };

  const priorReady = nonempty(engineFacts.priorSign)
    && nonempty(engineFacts.priorSignEntryDate)
    && nonempty(engineFacts.priorSignExitDate)
    && planet !== "moon";
  add("prior-sign-handoff", priorReady ? {
    priorSign: engineFacts.priorSign,
    priorSignEntryDate: engineFacts.priorSignEntryDate,
    priorSignExitDate: engineFacts.priorSignExitDate,
    renderTokens: {
      priorSign: "{{priorSign}}",
      priorSignEntryDate: "{{priorSignEntryDate}}",
      priorSignExitDate: "{{priorSignExitDate}}"
    }
  } : null, priorReady, { renderOwner: "writer" });

  const cycleFact = planetCycleFacts.planets?.[planet] || null;
  const cycleStatusReady = factStatusAllowsWriting(planetCycleFacts.status);
  const cycleReady = Boolean(cycleFact) && planet !== "moon" && cycleStatusReady;
  add("cycle-line", cycleReady ? {
    sourceId: planetCycleFacts.id,
    sourcePath: "packages/astro-knowledge/data/modifiers/planet-cycle-facts.json",
    sourceStatus: planetCycleFacts.status,
    ...cycleFact
  } : null, cycleReady, {
    renderOwner: "engine",
    reviewState: planetCycleFacts.status,
    reason: cycleReady
      ? undefined
      : planet === "moon"
        ? "Moon ingress cycle lines are excluded"
        : !cycleFact
          ? "the planet has no cycle fact"
          : `planet-cycle-facts status ${planetCycleFacts.status || "missing"} is not REVIEWED, LIVE, or APPROVED`
  });

  const suppliedEvents = Array.isArray(engineFacts.eventsDuringTransit) ? engineFacts.eventsDuringTransit : [];
  const rankedEvents = suppliedEvents
    .filter((event) => event
      && nonempty(event.id)
      && nonempty(event.date)
      && nonempty(event.meaning)
      && nonempty(event.meaningSource)
      && /^(?:packages\/astro-knowledge\/|data\/)/u.test(event.meaningSource))
    .slice(0, definitions.get("concurrent-events")?.maxEvents || 2)
    .map((event) => ({
      id: event.id,
      date: event.date,
      body: nonempty(event.body) ? event.body : null,
      eventType: nonempty(event.eventType) ? event.eventType : null,
      meaning: event.meaning,
      meaningSource: event.meaningSource
    }));
  add("concurrent-events", rankedEvents.length ? { eventsDuringTransit: rankedEvents } : null, rankedEvents.length > 0, {
    renderOwner: "engine",
    maxEvents: definitions.get("concurrent-events")?.maxEvents || 2,
    reason: rankedEvents.length
      ? undefined
      : suppliedEvents.length
        ? "supplied events lacked a date, meaning, or astrology-library source"
        : "eventsDuringTransit was empty"
  });

  const previousResidency = engineFacts.previousResidency || {};
  const cycleLocationDefinition = (surface.timingDevices?.devices || []).find((entry) => entry.id === "cycle-location");
  const cycleLocationReady = cycleLocationDefinition
    && nonempty(previousResidency.entryDate)
    && nonempty(previousResidency.exitDate);
  if (cycleLocationReady) {
    active.push({
      id: "cycle-location",
      rule: cycleLocationDefinition.rule,
      requiresFact: cycleLocationDefinition.requiresFact,
      maxOccurrences: cycleLocationDefinition.maxOccurrences,
      continuousFallbackTarget: cycleLocationDefinition.continuousFallbackTarget || "development",
      renderOwner: "writer",
      facts: {
        sign: nonempty(previousResidency.sign) ? previousResidency.sign : null,
        entryDate: previousResidency.entryDate,
        exitDate: previousResidency.exitDate,
        renderTokens: {
          entryDate: "{{previousResidencyEntryDate}}",
          exitDate: "{{previousResidencyExitDate}}"
        }
      }
    });
  } else {
    inactive.push({ id: "cycle-location", reason: "previous residency entry and exit dates were not both supplied" });
  }

  return {
    sourceStatus: planetCycleFacts.status,
    fallbackOutputShapeUnchanged: true,
    active,
    inactive
  };
}

const currentSkyExcludedSourceIds = new Set(
  (retrievalExclusions.records || [])
    .filter((record) => record.writerRetrievalScope === "sky-placement-current-sky" && record.useAsWriterRetrieval === false)
    .flatMap((record) => record.excludedSourceIds || [])
);

const ownerEvidenceExclusions = (compiledVocabularyPolicy.exclusions || [])
  .filter((entry) => [...(entry.scope?.surfaces || []), ...(entry.scope?.prohibited || [])].some((label) => ["sky-placement", "all-reader-copy", "all-editorial-copy", "all-generated-copy"].includes(label)))
  .map((entry) => entry.term)
  .filter((term) => /^[a-z]+$/iu.test(term));
const ownerEvidenceExclusionPattern = ownerEvidenceExclusions.length
  ? new RegExp(`\\b(?:${ownerEvidenceExclusions.join("|")})\\b`, "iu")
  : null;
const incompatibleCurrentSkyEvidencePattern = /\b(?:shadow work|rewrite the script|reflect on patterns|usefulness addiction|weaponiz(?:e|es|ed|ing)|battlefields?|archetypes?|warrior|peacemaker|freedom fighter|scent-memory|fiery voyage|liminal|tide|fog|elemental tension|cardinal waters|builds? walls?|break through those walls|what was carried|bombs?|radical act|world hell-bent)\b/iu;
const chironLicensedWoundEvidencePattern = /\b(?:heal|heals|healed|healing|wound|wounds|wounded)\b/iu;

function passageUsesIncompatibleCurrentSkyEvidence(entry, target) {
  const text = String(entry?.text || "");
  if (incompatibleCurrentSkyEvidencePattern.test(text)) return true;
  return target?.planet !== "chiron" && chironLicensedWoundEvidencePattern.test(text);
}

function structureFor(entry) {
  if (entry.articleBeat === "hook") return "opening";
  if (entry.articleBeat === "turn") return "turn";
  if (entry.articleBeat === "moves") return "moves";
  const sentences = String(entry.text).match(/[^.!?]+[.!?]+|[^.!?]+$/gu) || [];
  const practicalStarts = sentences.filter((sentence) => /^\s*(?:set|create|block|say|name|choose|update|give|stop|ask|write|move|change)\b/iu.test(sentence)).length;
  if (practicalStarts >= 2) return "practical moves";
  if (/\?/u.test(entry.text)) return "question-led development";
  if (/\bbut\b|\bhowever\b|\binstead\b/iu.test(entry.text)) return "contrast development";
  return "narrative development";
}

function exactSentenceWindows(entry) {
  const sentences = String(entry.text).match(/[^.!?]+[.!?]+|[^.!?]+$/gu) || [];
  const windows = [];
  for (let size = 2; size <= 4; size += 1) {
    for (let start = 0; start + size <= sentences.length; start += 1) {
      const text = sentences.slice(start, start + size).map((sentence) => sentence.trim()).join(" ");
      if (text === entry.text || text.length < 120 || text.length > 700) continue;
      windows.push({
        ...entry,
        sourceId: `${entry.sourceId}:window-${start + 1}-${size}`,
        parentSourceId: entry.sourceId,
        exactOwnerExcerpt: true,
        text
      });
    }
  }
  return windows;
}

function passagePassesCurrentSkySurface(entry, target) {
  const lint = lintArticle({
    planet: target.planet,
    sign: target.sign,
    tagline: "The pressure changes after someone names what happened.",
    hook: "The same problem returns until someone names it. The placement changes how the response develops.",
    lived: entry.text,
    turn: "The cost becomes clear after the decision. The response changes because the pressure was named.",
    moves: ["Name what changed before deciding.", "Choose the next action after the answer arrives."]
  });
  if (lint.findings.some((finding) => finding.severity === "fail" || finding.severity === "warn")) return false;
  if (/\b(?:campaigns?|organizers?|organizing|polic(?:y|ies|y reform)|federal aid|government structures?|public complaints?|social movements?|collective healing|community care|systemic harm|land back|domestic issues|headlines?)\b/iu.test(entry.text)) return false;
  if (passageUsesIncompatibleCurrentSkyEvidence(entry, target)) return false;
  return true;
}

function operationSignals(entry) {
  const text = entry.text;
  return {
    recognizableEvidence: /\b(?:birthday|spare key|guest room|office|job|paycheck|money|bill|deadline|schedule|meeting|message|email|text|dinner|holiday|rent|application|account|price|internet|cryptocurrency|banking|gig economy|social media|AI|algorithms?|data|media|social networks?|search engines?|supply chains?|housing|food|conversation|words?|decision|answer|proposal|choice)\b/iu.test(text),
    namedAction: /\b(?:stops?|starts?|calls?|answers?|chooses?|changes?|cancels?|asks?|says?|refuses?|leaves?|pays?|works?|waits?|keeps?|takes?|gives?|finds?|returns?|turns?|loses?|misses?|decides?|agrees?|expects?|remembers?|handles?|fixes?|earns?|spends?|saves?|adopts?|challenges?|delivers?|communicates?|manipulates?|controls?|limits?|blocks?|replaces?)\b/iu.test(text),
    pressureOrConsequence: /\b(?:until|when|because|but|instead|costs?|delays?|late|exhaust(?:ed|ion)?|trust|refus(?:e|es|ed|al)|cannot|can['’]t|doesn['’]t|isn['’]t|aren['’]t|wasn['’]t|weren['’]t|no longer|too much|again|still|obsolete|collapse|isolation|manipulation|scarcity|unstable|risky|risk|left out|kept out)\b/iu.test(text)
  };
}

function matchesRequestedOperation(entry, beat) {
  const signals = operationSignals(entry);
  if (beat === "turn") return signals.recognizableEvidence && signals.namedAction && signals.pressureOrConsequence;
  if (beat === "hook") return signals.recognizableEvidence && signals.namedAction;
  if (beat === "moves") return signals.namedAction && signals.pressureOrConsequence;
  return Object.values(signals).filter(Boolean).length >= 2;
}

function eligibleEntries(index, target) {
  return index.entries.flatMap((entry) => [entry, ...exactSentenceWindows(entry)]).filter((entry) =>
    entry.authorityClass === "owner_authored_final"
    && entry.ownerAuthored === true
    && entry.ownerApproved === true
    && !currentSkyExcludedSourceIds.has(entry.parentSourceId || entry.sourceId)
    && entry.text.length >= 120
    && entry.text.length <= 1200
    && !/\b(?:20\d{2}|19\d{2})\b/u.test(entry.text)
    && !/\b\d{1,2}:\d{2}\b/u.test(entry.text)
    && !/\b(?:you|your|yours|yourself|yourselves|you(?:'|’)?re|you(?:'|’)?ve|you(?:'|’)?ll|you(?:'|’)?d)\b/iu.test(entry.text)
    && !/\b(?:I|I'm|I've|I'll|I'd|me|my|mine|myself)\b/u.test(entry.text)
    && !/\b(?:magick|rituals?|energetic|spiritual bypassing|divine timing|highest self)\b/iu.test(entry.text)
    && (!ownerEvidenceExclusionPattern || !ownerEvidenceExclusionPattern.test(entry.text))
    && passagePassesCurrentSkySurface(entry, target)
  );
}

function rank(entry, target) {
  let score = 0;
  const signals = operationSignals(entry);
  if (matchesRequestedOperation(entry, target.beat)) score += 100;
  if (entry.exactOwnerExcerpt) score += 8;
  if (entry.articleBeat === target.beat) score += 24;
  score += Object.values(signals).filter(Boolean).length * 10;
  const ordinaryDetails = entry.text.match(/\b(?:day-to-day|message|project at work|job loss|work instability|anxiety about money|debts?|investments?|meeting|walk|request|rent|earning|spending|saving|social networks?|search engines?)\b/giu) || [];
  score += Math.min(ordinaryDetails.length, 4) * 12;
  if (entry.sign === target.sign) score += 80;
  if (entry.planet === target.planet) score += 55;
  if (entry.surface === "sky-article-longform") score += 6;
  score += Math.max(0, 8 - Math.abs(420 - entry.text.length) / 80);
  return score;
}

function verifyOwnerPassage(entry, index) {
  const sourceId = entry.parentSourceId || entry.sourceId;
  const sourceEntry = index.entries.find((candidate) => candidate.sourceId === sourceId);
  if (!sourceEntry) throw new Error(`Missing indexed owner source for ${entry.sourceId}.`);
  if (!["owner-published-site", "owner-published-active-fixture", "owner-published-register-gold"].includes(sourceEntry.origin)) {
    throw new Error(`Affinity passage is not directly owner-published: ${entry.sourceId}.`);
  }
  if (sourceEntry.authorityClass !== "owner_authored_final" || sourceEntry.ownerAuthored !== true || sourceEntry.ownerApproved !== true) {
    throw new Error(`Affinity passage lacks owner-authored-final authority: ${entry.sourceId}.`);
  }
  const sourceHash = crypto.createHash("sha256").update(sourceEntry.text).digest("hex");
  if (sourceHash !== sourceEntry.sourceSha256) throw new Error(`Indexed source SHA changed: ${sourceId}.`);
  const directPath = path.join(repoRoot, sourceEntry.sourcePath);
  if (!fs.existsSync(directPath)) throw new Error(`Checked-in owner source is missing: ${sourceEntry.sourcePath}.`);
  const normalizedFile = fs.readFileSync(directPath, "utf8").replace(/\s+/gu, " ").trim();
  const normalizedExcerpt = entry.text.replace(/\s+/gu, " ").trim();
  if (!normalizedFile.includes(normalizedExcerpt)) throw new Error(`Affinity passage is not verbatim in its checked-in owner source: ${entry.sourceId}.`);
  return true;
}

function selectAffinitySix(target, index = buildIndex()) {
  const entries = eligibleEntries(index, target);
  const sorted = [...entries].sort((a, b) => rank(b, target) - rank(a, target) || a.sourceId.localeCompare(b.sourceId));
  const adjacentEligible = sorted.filter((entry) =>
    !passageUsesUnsupportedDomain(entry, target.unsupportedDomainWarnings)
    && (!target.supportedDomains?.length || passageSupportsTargetDomain(entry, target.supportedDomains))
  );
  const selected = [];
  const usedArticles = new Set();
  const add = (entry, affinity) => {
    if (!entry) return false;
    const articleId = sourceArticleIdFor(entry.parentSourceId || entry.sourceId);
    if (usedArticles.has(articleId)) return false;
    verifyOwnerPassage(entry, index);
    selected.push({ ...entry, affinity, matchesRequestedOperation: matchesAffinityOperation(entry, target) });
    usedArticles.add(articleId);
    return true;
  };

  const sameSign = sorted.filter((entry) => entry.sign === target.sign);
  const seasonNeedle = `${target.sign}-season`;
  add(sameSign.find((entry) => entry.sourcePath.includes(seasonNeedle)), "same_sign");
  add(sameSign.find((entry) => !usedArticles.has(sourceArticleIdFor(entry.parentSourceId || entry.sourceId))), "same_sign");

  const samePlanet = sorted.filter((entry) => entry.planet === target.planet).sort((a, b) => {
    const activeDelta = Number(b.origin === "owner-published-active-fixture") - Number(a.origin === "owner-published-active-fixture");
    return activeDelta || rank(b, target) - rank(a, target) || a.sourceId.localeCompare(b.sourceId);
  });
  add(samePlanet.find((entry) => !usedArticles.has(sourceArticleIdFor(entry.parentSourceId || entry.sourceId))), "same_planet");
  add(samePlanet.find((entry) => !usedArticles.has(sourceArticleIdFor(entry.parentSourceId || entry.sourceId))), "same_planet");

  while (selected.filter((entry) => entry.matchesRequestedOperation).length < 2 && selected.length < 6) {
    const operationMatch = adjacentEligible.find((entry) =>
      matchesAffinityOperation(entry, target)
      && !usedArticles.has(sourceArticleIdFor(entry.parentSourceId || entry.sourceId))
    );
    if (!add(operationMatch, "archetypal_adjacent")) break;
  }

  for (const desired of ["practical moves", "question-led development", "contrast development"]) {
    if (selected.length >= 6) break;
    add(adjacentEligible.find((entry) => structureFor(entry) === desired && !usedArticles.has(sourceArticleIdFor(entry.parentSourceId || entry.sourceId))), "archetypal_adjacent");
  }
  for (const entry of adjacentEligible) {
    if (selected.length >= 6) break;
    add(entry, "archetypal_adjacent");
  }
  if (selected.length < 4 || selected.length > 6) {
    throw new Error(`Affinity packet requires four to six verified owner passages; found ${selected.length}.`);
  }
  return selected;
}

function selectVoiceDevices(surface, target) {
  const devices = surface.voiceDevices?.devices || [];
  const cap = Math.min(surface.voiceDevices?.maxPerArticle || 0, 2);
  if (cap === 0 || devices.length === 0) return [];
  const seed = [...`${target.planet}:${target.sign}`].reduce((total, character) => total + character.codePointAt(0), 0);
  return Array.from({ length: Math.min(cap, devices.length) }, (_, offset) => devices[(seed + offset) % devices.length]);
}

function selectSix(entries, target) {
  const ranked = [...entries].sort((a, b) => rank(b, target) - rank(a, target) || a.sourceId.localeCompare(b.sourceId));
  const selected = [];
  const sourceCounts = new Map();
  const add = (entry) => {
    if (!entry || selected.some((item) => item.sourceId === entry.sourceId || item.text.trim().toLowerCase() === entry.text.trim().toLowerCase())) return false;
    const count = sourceCounts.get(entry.sourcePath) || 0;
    if (count >= 1) return false;
    selected.push(entry);
    sourceCounts.set(entry.sourcePath, count + 1);
    return true;
  };

  for (const entry of ranked.filter((item) => matchesRequestedOperation(item, target.beat))) {
    add(entry);
    if (selected.filter((item) => matchesRequestedOperation(item, target.beat)).length === 2) break;
  }
  for (const desired of ["opening", "turn", "moves", "question-led development", "contrast development", "narrative development"]) {
    if (new Set(selected.map(structureFor)).size >= 3) break;
    add(ranked.find((entry) => structureFor(entry) === desired && !selected.some((item) => item.sourceId === entry.sourceId)));
  }
  for (const entry of ranked) {
    if (selected.length === 6) break;
    add(entry);
  }
  for (const entry of ranked) {
    if (selected.length === 6) break;
    add(entry);
  }

  const articleCount = new Set(selected.map((entry) => entry.sourcePath)).size;
  const structureCount = new Set(selected.map(structureFor)).size;
  const beatCount = selected.filter((entry) => matchesRequestedOperation(entry, target.beat)).length;
  if (selected.length !== 6 || articleCount < 3 || structureCount < 3 || beatCount !== 6) {
    throw new Error(`Six-passage packet constraints failed (passages=${selected.length}, articles=${articleCount}, structures=${structureCount}, beatMatches=${beatCount}).`);
  }
  return selected;
}

function sourceArticleIdFor(sourceRecordId) {
  return String(sourceRecordId || "")
    .replace(/:p\d+.*$/u, "")
    .replace(/:e\d+.*$/u, "");
}

function sourceEntriesForWarmthRecord(record) {
  return [record.primary, ...(record.supporting || []), ...(record.alternates || [])].filter(Boolean);
}

function selectOwnerCorpusWarmthEvidence({ planet, sign, voiceIndex }) {
  const record = ownerCorpusWarmthFoundations.records.find((entry) => entry.planet === planet && entry.sign === sign) || null;
  if (!record) {
    return {
      id: `owner-corpus-warmth-none-found:${planet}-${sign}`,
      planet,
      sign,
      harvest_mode: "none_found",
      emotionalCore: null,
      searchTerms: [],
      primary: null,
      supporting: [],
      alternates: [],
      authorityClass: "owner_corpus_no_match",
      maxWarmthBeats: 0,
      method: ownerCorpusWarmthFoundations.method,
      sourceIds: [],
      editorial_flags: [{
        id: "owner-corpus-warmth-none-found",
        severity: "info",
        blocking: false,
        reason: "No qualifying owner-corpus warmth line is available for this core. Revisit if future owner writing covers it; do not invent imitation warmth."
      }]
    };
  }
  const sourceIndex = new Map(voiceIndex.entries.map((entry) => [entry.sourceId, entry]));
  for (const source of sourceEntriesForWarmthRecord(record)) {
    const indexed = sourceIndex.get(source.sourceId);
    if (!indexed) throw new Error(`Warmth foundation ${record.id} references missing owner source ${source.sourceId}.`);
    if (indexed.sourcePath !== source.sourcePath) throw new Error(`Warmth foundation ${record.id} source path does not match ${source.sourceId}.`);
    if (!indexed.text.includes(source.sourceExcerpt)) throw new Error(`Warmth foundation ${record.id} excerpt is not exact owner-corpus text for ${source.sourceId}.`);
    if (indexed.authorityClass !== "owner_authored_final" || indexed.ownerAuthored !== true || indexed.ownerApproved !== true) {
      throw new Error(`Warmth foundation ${record.id} source ${source.sourceId} is not eligible owner-authored final evidence.`);
    }
    if (passageUsesIncompatibleCurrentSkyEvidence({ text: source.sourceExcerpt }, { planet, sign })) {
      throw new Error(`Warmth foundation ${record.id} source ${source.sourceId} is incompatible with the Current Sky target.`);
    }
  }
  return {
    ...record,
    harvest_mode: "matched",
    authorityClass: "owner_corpus_derived_foundation",
    maxWarmthBeats: ownerCorpusWarmthFoundations.authorityPolicy.maxWarmthBeatsPerArticle,
    method: ownerCorpusWarmthFoundations.method,
    sourceIds: [...new Set(sourceEntriesForWarmthRecord(record).map((entry) => entry.sourceId))],
    editorial_flags: []
  };
}

function nodeAxisDescriptor(planet, sign) {
  if (planet !== "nodes") return null;
  const [northSign, southSign, extra] = String(sign || "").split("-");
  if (!northSign || !southSign || extra) {
    throw new Error("Combined Nodes packet mode requires --planet nodes --sign <north-sign>-<south-sign>.");
  }
  const northPath = path.join(packageRoot, "data", "placements", "sign", `north-node-${northSign}.json`);
  const southPath = path.join(packageRoot, "data", "placements", "sign", `south-node-${southSign}.json`);
  if (!fs.existsSync(northPath) || !fs.existsSync(southPath)) {
    throw new Error(`Missing combined Nodes placement facts for ${northSign}/${southSign}.`);
  }
  const north = JSON.parse(fs.readFileSync(northPath, "utf8"));
  const south = JSON.parse(fs.readFileSync(southPath, "utf8"));
  const axisId = `nodes-${northSign}-${southSign}`;
  const reciprocal = north.axisPair?.axisId === axisId
    && south.axisPair?.axisId === axisId
    && north.axisPair?.role === "growth-direction"
    && south.axisPair?.role === "release"
    && north.axisPair?.pairedPlacementId === south.id
    && south.axisPair?.pairedPlacementId === north.id
    && north.axisPair?.pairedPlanet === "south-node"
    && south.axisPair?.pairedPlanet === "north-node"
    && north.axisPair?.pairedSign === southSign
    && south.axisPair?.pairedSign === northSign;
  if (!reciprocal) throw new Error(`Combined Nodes placement pair ${axisId} lacks an explicit reciprocal pair link.`);
  if (north.runtimeEligible !== south.runtimeEligible) {
    throw new Error(`Combined Nodes placement pair ${axisId} must share one runtimeEligible status.`);
  }
  for (const field of ["supportedDomains", "unsupportedDomainWarnings", "scenarioPolicy"]) {
    if (JSON.stringify(north[field]) !== JSON.stringify(south[field])) {
      throw new Error(`Combined Nodes placement pair ${axisId} has mismatched ${field}.`);
    }
  }
  return { axisId, northSign, southSign, northPath, southPath, north, south };
}

function astrologyEvidence(planet, sign, surface) {
  const axis = nodeAxisDescriptor(planet, sign);
  if (axis) {
    const planetaryPath = path.join(packageRoot, "data", "planetary", "lunar-nodes.json");
    const planetary = JSON.parse(fs.readFileSync(planetaryPath, "utf8"));
    const northExpression = planetary.signs?.find((entry) => entry.sign === `north-node-${axis.northSign}`)?.body || null;
    const southExpression = planetary.signs?.find((entry) => entry.sign === `south-node-${axis.southSign}`)?.body || null;
    const failures = [
      ...(!planetary.overview ? ["node-axis function is missing"] : []),
      ...(!northExpression ? ["North Node sign expression is missing"] : []),
      ...(!southExpression ? ["South Node sign expression is missing"] : []),
      ...(!axis.north.body || !axis.south.body ? ["combined node-axis placement meaning is missing"] : []),
      ...(!planetary.cycle ? ["node-axis timing is missing"] : [])
    ];
    return {
      axisMode: "combined-node-axis",
      axisPair: {
        axisId: axis.axisId,
        pairLink: `${axis.north.id}<->${axis.south.id}`,
        reciprocal: true,
        northNode: { placementId: axis.north.id, sign: axis.northSign, role: "growth-direction" },
        southNode: { placementId: axis.south.id, sign: axis.southSign, role: "release" }
      },
      planetFunction: planetary.overview || null,
      signExpression: [northExpression, southExpression].filter(Boolean).join(" "),
      combinedMeaning: [axis.north.body, axis.south.body].filter(Boolean).join(" "),
      collectiveGift: [axis.north.tldr, axis.south.tldr].filter(Boolean).join(" "),
      observableShadowBehaviors: [axis.north.challenge, axis.south.challenge].filter(Boolean),
      timing: planetary.cycle || surface.pace.labels["north-node"] || null,
      supportedDomains: axis.north.supportedDomains || [],
      unsupportedDomainWarnings: axis.north.unsupportedDomainWarnings || [],
      sourceRegisterBoundary: "The source passages below may use natal or second-person register. Extract their astrology only. Never reproduce their person, address the reader, or treat natal wording as Current Sky voice evidence.",
      scenarioPolicy: [
        "The writer may create related lived moments only inside the supported domains. The transit remains the subject, and no single invented scenario may carry the whole card. The moments may be invented; the astrology may not.",
        axis.north.scenarioPolicy
      ].filter(Boolean).join(" "),
      sourcePassages: [
        {
          sourcePath: path.relative(repoRoot, axis.northPath).replaceAll(path.sep, "/"),
          status: axis.north.status,
          register: "source_meaning_only_may_be_natal",
          personBoundary: "Do not reproduce second-person or natal address from this source.",
          text: axis.north.body
        },
        {
          sourcePath: path.relative(repoRoot, axis.southPath).replaceAll(path.sep, "/"),
          status: axis.south.status,
          register: "source_meaning_only_may_be_natal",
          personBoundary: "Do not reproduce second-person or natal address from this source.",
          text: axis.south.body
        },
        {
          sourcePath: path.relative(repoRoot, planetaryPath).replaceAll(path.sep, "/"),
          status: planetary.status,
          register: "source_meaning_only_may_be_natal",
          personBoundary: "Do not reproduce second-person or natal address from this source.",
          text: [planetary.overview, planetary.cycle, northExpression, southExpression].filter(Boolean).join(" ")
        }
      ],
      validation: { complete: failures.length === 0, failures }
    };
  }
  const placementPath = path.join(packageRoot, "data", "placements", "sign", `${planet}-${sign}.json`);
  const planetaryId = planet === "north-node" || planet === "south-node" ? "lunar-nodes" : planet;
  const planetarySign = planetaryId === "lunar-nodes" ? `${planet}-${sign}` : sign;
  const planetaryPath = path.join(packageRoot, "data", "planetary", `${planetaryId}.json`);
  const placement = JSON.parse(fs.readFileSync(placementPath, "utf8"));
  const planetary = fs.existsSync(planetaryPath) ? JSON.parse(fs.readFileSync(planetaryPath, "utf8")) : null;
  const signSpecific = planetary?.signs?.find((entry) => entry.sign === planetarySign)?.body || null;
  const failures = [
    ...(!planetary?.overview ? ["planet function is missing"] : []),
    ...(!signSpecific ? ["sign expression is missing"] : []),
    ...(!placement.body ? ["combined placement meaning is missing"] : []),
    ...(!planetary?.cycle && !surface.pace.labels[planet] ? ["timing is missing"] : [])
  ];
  return {
    planetFunction: planetary?.overview || null,
    signExpression: signSpecific,
    combinedMeaning: placement.body || null,
    collectiveGift: placement.collectiveGift || placement.tldr || null,
    observableShadowBehaviors: String(placement.challenge || "").replace(/[.]$/u, "").split(/,|\band\b/u).map((item) => item.trim()).filter(Boolean),
    timing: planetary?.cycle || surface.pace.labels[planet] || null,
    supportedDomains: placement.supportedDomains || [],
    unsupportedDomainWarnings: placement.unsupportedDomainWarnings
      || ["Do not introduce a domain or consequence that is absent from the verified sources."],
    sourceRegisterBoundary: "The source passages below may use natal or second-person register. Extract their astrology only. Never reproduce their person, address the reader, or treat natal wording as Current Sky voice evidence.",
    scenarioPolicy: [
      "The writer may create related lived moments by combining the governed planet and sign meanings inside the supported domains. The transit remains the subject, and no single invented scenario may carry the whole card. The moments may be invented; the astrology may not.",
      placement.scenarioPolicy || null
    ].filter(Boolean).join(" "),
    sourcePassages: [
      {
        sourcePath: path.relative(repoRoot, placementPath).replaceAll(path.sep, "/"),
        status: placement.status,
        register: "source_meaning_only_may_be_natal",
        personBoundary: "Do not reproduce second-person or natal address from this source.",
        text: placement.body
      },
      ...(planetary ? [{
        sourcePath: path.relative(repoRoot, planetaryPath).replaceAll(path.sep, "/"),
        status: planetary.status,
        register: "source_meaning_only_may_be_natal",
        personBoundary: "Do not reproduce second-person or natal address from this source.",
        text: [planetary.overview, planetary.cycle, signSpecific].filter(Boolean).join(" ")
      }] : [])
    ],
    validation: {
      complete: failures.length === 0,
      failures
    }
  };
}

function buildPacket({ planet, sign, requestedBeat, emphasisBeat = null, beat, task, inputText = "", currentSky = true, engineFacts = {}, registry = readRegistry() }) {
  const resolvedBeat = requestedBeat || beat;
  if (!planet || !sign || !resolvedBeat || !task) throw new Error("planet, sign, requestedBeat, and task are required.");
  const release = resolveCandidateRelease({ role: "writer", surface: "sky-placement", releaseId: RELEASE_ID, registry });
  const axis = nodeAxisDescriptor(planet, sign);
  const factRows = axis ? [axis.north, axis.south] : (() => {
    const factPath = path.join(packageRoot, "data", "placements", "sign", `${planet}-${sign}.json`);
    if (!fs.existsSync(factPath)) throw new Error(`Missing placement fact boundary: ${planet}-${sign}.json`);
    return [JSON.parse(fs.readFileSync(factPath, "utf8"))];
  })();
  const unverified = factRows.find((facts) => !["REVIEWED", "LIVE", "APPROVED"].includes(facts.status));
  if (unverified) throw new Error(`Placement facts are not verified: ${unverified.status || "missing status"}.`);
  const selectionPlanet = axis ? "north-node" : planet;
  const selectionSign = axis ? axis.northSign : sign;
  const surface = JSON.parse(fs.readFileSync(path.join(packageRoot, "voice", "tldr-astro", "sky-placement.json"), "utf8"));
  const selectionBeat = resolvedBeat === "full_article" ? (emphasisBeat || "turn") : resolvedBeat;
  const verifiedAstrology = astrologyEvidence(planet, sign, surface);
  if (!verifiedAstrology.validation.complete) {
    throw new Error(`Verified astrology is incomplete: ${verifiedAstrology.validation.failures.join("; ")}.`);
  }
  const voiceIndex = buildIndex();
  const ownerCorpusWarmthEvidence = selectOwnerCorpusWarmthEvidence({
    planet,
    sign,
    voiceIndex
  });
  const selectedOwnerPassages = currentSky && resolvedBeat === "full_article"
    ? selectAffinitySix({
      planet: selectionPlanet,
      sign: selectionSign,
      beat: selectionBeat,
      supportedDomains: verifiedAstrology.supportedDomains,
      unsupportedDomainWarnings: verifiedAstrology.unsupportedDomainWarnings
    }, voiceIndex)
    : selectSix(eligibleEntries(voiceIndex, { planet: selectionPlanet, sign: selectionSign }), { planet: selectionPlanet, sign: selectionSign, beat: selectionBeat });
  const ownerPassages = selectedOwnerPassages.map((entry) => ({
    sourceId: entry.sourceId,
    sourceArticleId: entry.sourceRecordId ? sourceArticleIdFor(entry.sourceRecordId) : entry.sourceId,
    sourcePath: entry.sourcePath,
    articleBeat: entry.articleBeat,
    assignedFunction: entry.assignedFunction || null,
    paragraphStructure: entry.paragraphStructure || structureFor(entry),
    affinity: entry.affinity || null,
    authorityClass: entry.authorityClass,
    text: entry.text,
    matchesRequestedOperation: entry.matchesRequestedOperation ?? matchesRequestedOperation(entry, selectionBeat)
  }));
  const affinityEntries = voiceIndex.entries.filter((entry) =>
    entry.authorityClass === "owner_authored_final"
    && entry.ownerAuthored === true
    && entry.ownerApproved === true
    && (entry.sign === selectionSign || entry.planet === selectionPlanet)
  );
  const preferredVocabulary = selectOwnerVocabulary({
    surface: "planet-article",
    planet: selectionPlanet,
    sign: selectionSign,
    verifiedAstrology,
    ownerPassages,
    affinityEntries,
    currentSky
  });
  const structuralSlots = buildFactGatedStructure({ planet: selectionPlanet, surface, engineFacts });
  assertPacketQuotablesPassOutputBans({ verifiedAstrology, structuralSlots, surface });
  const eligibleFormatExemplarIds = new Set(surface.formatExemplarPolicy?.eligible || []);
  const formatExemplars = formatExemplarDataset.cards
    .filter((entry) => eligibleFormatExemplarIds.has(entry.id)
      && entry.authorityClass === "exact_owner_approved"
      && entry.ownerApproved === true
      && entry.generationEvidenceAuthorized === true)
    .map((entry) => ({
      id: entry.id,
      planet: entry.planet,
      sign: entry.sign,
      authorityClass: entry.authorityClass,
      approvalScope: formatExemplarDataset.approvalScope,
      article: entry.article
    }));
  const ownerReferenceArticles = [ownerReferenceArticle]
    .filter((entry) => entry.authorityClass === "exact_owner_approved"
      && entry.ownerApproved === true
      && entry.generationEvidenceAuthorized === true)
    .map((entry) => ({
      id: entry.id,
      planet: entry.planet,
      sign: entry.sign,
      authorityClass: entry.authorityClass,
      approvalScope: entry.approvalScope,
      article: entry.article
    }));
  const ownerSelectedBenchmarks = [ownerSelectedBenchmark]
    .filter((entry) => entry.authorityClass === "exact_owner_approved"
      && entry.ownerApproved === true
      && entry.generationEvidenceAuthorized === true)
    .map((entry) => ({
      id: entry.id,
      planet: entry.planet,
      sign: entry.sign,
      authorityClass: entry.authorityClass,
      authorship: entry.authorship,
      approvalScope: entry.approvalScope,
      benchmarkText: entry.benchmarkText,
      benchmarkRules: entry.benchmarkRules
    }));
  const axisAppendix = axis
    ? `\n\nCOMBINED NODE-AXIS MODE\nWrite the North Node in ${axis.northSign} and South Node in ${axis.southSign} as one inseparable axis story. Every scene must show both the growth direction and the release. Name both Nodes and both signs in the opening. Do not split the result into two articles.`
    : "";
  const ownerDirectiveAppendix = surface.ownerWriterDirective?.text
    ? `\n\nPERMANENT SKY PLACEMENT OWNER WRITER DIRECTIVE (${surface.ownerWriterDirective.id})\n${surface.ownerWriterDirective.text}`
    : "";
  const writerPrompt = `${currentSky ? `${promptConfig.basePrompt}\n\n${promptConfig.currentSkyAppendix}` : promptConfig.basePrompt}${ownerDirectiveAppendix}${axisAppendix}`;
  return {
    schemaVersion: 2,
    packetVersion: PACKET_VERSION,
    positiveEvidencePoolId: currentSky && resolvedBeat === "full_article" ? AFFINITY_POOL_ID : null,
    formatExemplars,
    formatExemplarStatus: surface.formatExemplarPolicy?.status || "blocked_pending_exact_owner_approval",
    ownerReferenceArticles,
    ownerSelectedBenchmarks,
    ownerCorpusWarmthEvidence,
    routing: {
      laneId: release.laneId,
      releaseId: release.releaseId,
      registryState: release.registryState,
      requestedModel: release.model,
      requestedReasoningEffort: release.reasoningEffort,
      promptVersion: release.promptVersion
    },
    verifiedAstrology,
    surfaceRequirements: {
      contractId: surface.id,
      ownerWriterDirectiveId: surface.ownerWriterDirective?.id || null,
      runtimeContractId: "sky-placement-continuous-v2",
      axisMode: axis ? {
        mode: "combined-node-axis",
        axisId: axis.axisId,
        pairLink: `${axis.north.id}<->${axis.south.id}`,
        fallbackContentKey: `fallback-hook/sky-sign-copy/nodes/${sign}`
      } : null,
      compiledPolicySource: compiledWriterPolicy.decisionSource,
      compiledPolicySha256: compiledWriterPolicy.decisionSourceSha256,
      universalHardConstraints: compiledWriterPolicy.firstCallConstraints.filter((entry) => !["CF-006", "ED-015"].includes(entry.id)),
      person: surface.person,
      secondPersonAllowed: surface.secondPersonAllowed,
      generatedSlots: ["opening", "tension", "development", "close", "try_this"],
      engineOwnedSlots: [
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
      ],
      slotRequirements: {
        opening: "One paragraph showing recognizable ordinary evidence. Include the literal {{entryDate}} slot once. Do not define the planet or sign generically.",
        tension: "One paragraph naming one central tension and showing how the same useful behavior creates a cost when pushed too far.",
        development: "Continue the transit's pressure through related lived moments and consequence. Do not announce advice with a coaching scaffold, introduce a new theme, or let one invented scenario carry the card.",
        close: "One sentence that lands inside the consequence. Include the literal {{exitDate}} slot once. Do not assign a task, add reassurance, or stack a second conclusion.",
        try_this: "Two actions by default, or three only when the third adds something different. Each action must be possible this week and specific to the placement."
      },
      assembly: {
        dateRange: "{{entryDate}} to {{exitDate}}",
        cycleFactLine: "engine-rendered from reviewed planet-cycle-facts.json directly under the date range",
        aspectInsert: "{{aspectInsert}}",
        bodyOrder: ["opening", "tension", "development", "aspect_insert", "close", "try_this"],
        targetWordsWithoutAspect: "220-350"
      },
      requestedBeat: resolvedBeat,
      emphasisBeat,
      beatRequirement: [...surface.shape.beats, ...surface.shape.extendedSlots].find((item) => item.beat === resolvedBeat || item.slot.includes(`-${resolvedBeat}/`))?.does || "Follow the complete Sky Placement article contract.",
      pace: surface.pace.labels[selectionPlanet]
    },
    voiceDevices: {
      maxPerArticle: Math.min(surface.voiceDevices?.maxPerArticle || 0, 2),
      selected: selectVoiceDevices(surface, { planet, sign })
    },
    movesExemplar: surface.movesExemplar,
    task: { exactInstruction: task, inputText },
    ownerPassages,
    preferredVocabulary,
    structuralSlots,
    writerPrompt
  };
}

function renderModelInput(packet) {
  const passages = packet.ownerPassages.map((entry, index) => `OWNER PASSAGE ${index + 1}\n${entry.text}`).join("\n\n");
  const devices = (packet.voiceDevices?.selected || []).map((entry) => `- ${entry.id}: ${entry.rule}\n  Owner example: ${entry.example}`).join("\n");
  const formatExemplars = (packet.formatExemplars || []).map((entry, index) => `FORMAT EXEMPLAR ${index + 1}: ${entry.planet} in ${entry.sign}\n${JSON.stringify(entry.article, null, 2)}`).join("\n\n");
  const ownerReferenceArticles = (packet.ownerReferenceArticles || []).map((entry, index) => `OWNER REFERENCE ${index + 1}: ${entry.planet} in ${entry.sign}\n${JSON.stringify(entry.article, null, 2)}`).join("\n\n");
  const ownerSelectedBenchmarks = (packet.ownerSelectedBenchmarks || []).map((entry, index) => `WRITING BENCHMARK ${index + 1}: ${entry.planet} in ${entry.sign}\nAuthorship: ${entry.authorship}\n${entry.benchmarkText}\n\nBenchmark rules:\n${(entry.benchmarkRules || []).map((rule) => `- ${rule}`).join("\n")}`).join("\n\n");
  const ownerCorpusWarmthEvidence = packet.ownerCorpusWarmthEvidence.harvest_mode === "matched"
    ? `harvest_mode: matched\nEmotional core: ${packet.ownerCorpusWarmthEvidence.emotionalCore}\nPrimary foundation: ${packet.ownerCorpusWarmthEvidence.primary.foundationText}\n${(packet.ownerCorpusWarmthEvidence.supporting || []).map((entry) => `Supporting foundation: ${entry.foundationText}`).join("\n")}\n${(packet.ownerCorpusWarmthEvidence.alternates || []).map((entry) => `Alternate foundation: ${entry.foundationText}`).join("\n")}`
    : `harvest_mode: none_found\nNo qualifying owner-corpus foundation was found. This is non-blocking. Keep the register plain and do not invent permission, reassurance, benediction, or a turn-toward-the-reader line.`;
  const movesExemplar = packet.movesExemplar?.generationEvidenceAuthorized
    ? JSON.stringify(packet.movesExemplar.items, null, 2)
    : "Pending owner input. Do not infer or fabricate an exemplar; write ordinary actions and avoid facilitation language.";
  const preferredVocabulary = renderOwnerVocabularySelection(packet.preferredVocabulary);
  const activeStructuralSlots = (packet.structuralSlots?.active || []).map((entry) => {
    const ownership = entry.renderOwner === "engine"
      ? "The engine renders this block; do not add a new output key or restate it elsewhere."
      : `Write it once inside ${entry.continuousFallbackTarget}; do not add a new output key.`;
    return `${entry.id.toUpperCase()}\n${entry.rule}\n${ownership}\nBACKING FACTS\n${JSON.stringify(entry.facts, null, 2)}`;
  }).join("\n\n");
  const structuralBlock = activeStructuralSlots
    ? `ACTIVE FACT-GATED STRUCTURAL SLOTS\nOnly the slots below have backing facts. Use each at most once. The required output remains opening, tension, development, close, and try_this.\n\n${activeStructuralSlots}`
    : "ACTIVE FACT-GATED STRUCTURAL SLOTS\nNone supplied. Do not invent a handoff, cycle number, prior residency, or concurrent event.";
  return `${packet.writerPrompt}\n\nVERIFIED ASTROLOGY\n${JSON.stringify(packet.verifiedAstrology, null, 2)}\n\nSURFACE REQUIREMENTS\n${JSON.stringify(packet.surfaceRequirements, null, 2)}\n\n${structuralBlock}\n\nOWNER VOICE MOVES - USE AT MOST ${packet.voiceDevices?.maxPerArticle || 0} PER ARTICLE\n${devices || "None selected."}\n\nFORMAT EXEMPLARS\nThese exact owner-approved cards establish register and beat movement only. Their tagline, hook, lived, turn, and moves fields are not the continuous fallback structure. Do not copy their astrology, scenarios, phrases, or date-token names; follow the supplied continuous output contract.\n\n${formatExemplars || "None supplied."}\n\nOWNER-APPROVED PLACEMENT REFERENCE\nThis exact owner-approved continuous article demonstrates the finished writing operation and natural register. Use its clarity, pressure-and-consequence movement, and stopping point as the standard. Do not copy its placement-specific astrology, scenario, phrases, or timing tokens.\n\n${ownerReferenceArticles || "None supplied."}\n\nOWNER-SELECTED WRITING BENCHMARK\nThis benchmark establishes the new surface standard: the transit remains the subject, lived moments illustrate it, coaching scaffolds are absent, and the ending lands inside the consequence. Use the writing operation, not the placement-specific wording.\n\n${ownerSelectedBenchmarks || "None supplied."}\n\nOWNER-CORPUS WARMTH HARVEST\nWhen harvest_mode is matched, use at most one supplied foundation near the end of development and preserve its meaning without forcing the words. When harvest_mode is none_found, add no imitation warmth; plain register is correct.\n${ownerCorpusWarmthEvidence}\n\nMOVES EXEMPLAR\nThis exact owner-approved list establishes the register for practical actions only. Do not copy its placement-specific actions.\n${movesExemplar}\n\n${preferredVocabulary}\n\nEXACT TASK\n${packet.task.exactInstruction}${packet.task.inputText ? `\n\nTEXT TO REVISE\n${packet.task.inputText}` : ""}\n\n${passages}\n`;
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 2) result[argv[i].replace(/^--/u, "")] = argv[i + 1];
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out) throw new Error("--out is required.");
  const engineFacts = args["engine-facts"] ? JSON.parse(fs.readFileSync(path.resolve(args["engine-facts"]), "utf8")) : {};
  const packet = buildPacket({ planet: args.planet, sign: args.sign, requestedBeat: args["requested-beat"] || args.beat, emphasisBeat: args["emphasis-beat"] || null, task: args.task, inputText: args.input || "", currentSky: args["current-sky"] !== "false", engineFacts });
  fs.mkdirSync(args.out, { recursive: true });
  fs.writeFileSync(path.join(args.out, "packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(args.out, "model-input.md"), renderModelInput(packet));
  console.log(`Compiled four-to-six-passage affinity packet at ${args.out}. No model call was made.`);
}

module.exports = { ACTIVE_FACT_STATUSES, AFFINITY_POOL_ID, PACKET_VERSION, RELEASE_ID, SUPPORTED_DOMAIN_PATTERNS, UNSUPPORTED_DOMAIN_PATTERNS, assertPacketQuotablesPassOutputBans, astrologyEvidence, buildFactGatedStructure, buildPacket, collectPacketQuotables, eligibleEntries, factStatusAllowsWriting, matchesRequestedOperation, operationSignals, passageSupportsTargetDomain, passageUsesIncompatibleCurrentSkyEvidence, passageUsesUnsupportedDomain, renderModelInput, selectAffinitySix, selectOwnerCorpusWarmthEvidence, selectSix, selectVoiceDevices, structureFor };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
