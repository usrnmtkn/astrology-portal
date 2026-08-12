#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  renderNatalAngle,
  renderNatalPlacement,
  SourceGapError
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import {
  createFallbackRenderer,
  SourceGapError as BrowserSourceGapError
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";
import plainLanguageDefects from "../packages/astro-knowledge/scripts/plain-language-defects.js";
import skyVoiceLint from "../packages/astro-knowledge/scripts/lint-sky-voice.js";
import skyVoiceJudge from "../packages/astro-knowledge/scripts/judge-sky-voice.js";
import placementVoiceJudge from "../packages/astro-knowledge/scripts/judge-placement-voice.js";
import articleVoiceJudge from "../packages/astro-knowledge/scripts/judge-article-voice.js";
import { findPronounGrammarIssues } from "../apps/web/src/services/personReferences.ts";

const { findRealFiller, findTranslationRequired } = plainLanguageDefects;
const { lintCard } = skyVoiceLint;
const packageRoot = "apps/web/src/content/fallbackArchitectureV3";
const readJson = (relativePath) => JSON.parse(fs.readFileSync(`${packageRoot}/${relativePath}`, "utf8"));
const source = readJson("source-rows/fallback-source-rows-v3.json");
const templates = readJson("templates/fallback-templates-v3.json");
const interim = readJson("source-rows/placement-interim-fixes-v1.json");
const theyCandidates = readJson("source-rows/friend-natal-vocabulary-they-candidates-v1.json");
const rowCandidates = readJson("source-rows/friend-natal-row-level-candidates-v1.json");
const auditArtifactPath = "packages/astro-knowledge/review/friend-natal-voice-audit-v1.json";
const writeAuditArtifact = process.argv.includes("--write-audit");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const SECOND_PERSON = /\b(?:you|your|yours|yourself|yourselves|you're|you've|you'll)\b/iu;
const DISGUISED_FRIEND_ADVICE = /(?:\b(?:they (?:should|need to|have to|must|would benefit from)|it is important for them to|the (?:lesson|goal) is|their best ideas deserve|what they need to learn is)\b|(?:^|[.!?]\s+)the work is\b)/iu;
const stripSlots = (text) => String(text ?? "").replace(/\{\{[^}]+\}\}/gu, "");
const hasSecondPerson = (text) => SECOND_PERSON.test(stripSlots(text));

const sourceSecondPersonVocabulary = source.vocabularyRows.filter((row) => hasSecondPerson(row.body));
assert.equal(sourceSecondPersonVocabulary.length, 41, "The post-repair source baseline must contain exactly 41 second-person vocabulary rows.");
const inScopeSecondPersonVocabulary = sourceSecondPersonVocabulary.filter((row) => (
  !row.contentKey.startsWith("fallback-vocab/dodont-")
  && !row.contentKey.startsWith("fallback-vocab/sky-planet-function/")
  && !row.contentKey.startsWith("fallback-vocab/empty-house-ruler-jurisdiction/")
));
const outOfScopeSecondPersonVocabulary = sourceSecondPersonVocabulary.filter((row) => !inScopeSecondPersonVocabulary.includes(row));
assert.equal(inScopeSecondPersonVocabulary.length, 26, "The friend-natal vocabulary scope must contain 26 rows.");
assert.equal(outOfScopeSecondPersonVocabulary.length, 15, "Daily, Current Sky, and the separately governed V14 empty-house row must retain their own person-contract scope.");
assert.equal(theyCandidates.vocabularyRows.length, 26, "Every in-scope friend-natal vocabulary row needs one they-voice candidate.");
assert.deepEqual(
  [...new Set(theyCandidates.vocabularyRows.map((row) => row.contentKey))].sort(),
  inScopeSecondPersonVocabulary.map((row) => row.contentKey).sort(),
  "The candidate set must cover the audited keys exactly, without additions or omissions."
);

const ownerApprovedCandidateKeys = new Set([
  "fallback-vocab/planet-function/moon",
  "fallback-vocab/planet-function/venus"
]);
for (const candidate of [...theyCandidates.vocabularyRows, ...rowCandidates.vocabularyRows, ...rowCandidates.hookRows]) {
  const ownerApprovedCandidate = ownerApprovedCandidateKeys.has(candidate.contentKey);
  assert.equal(
    candidate.review_status,
    ownerApprovedCandidate ? "owner_approved_candidate" : "discarded",
    `${candidate.contentKey} must carry its imported owner-verdict state.`
  );
  assert.equal(candidate.ownerApproved, ownerApprovedCandidate, `${candidate.contentKey} owner approval drifted.`);
  assert.equal(candidate.promotionAuthorized, false, `${candidate.contentKey} must not claim promotion authority.`);
}
for (const candidate of theyCandidates.vocabularyRows) {
  assert.equal(hasSecondPerson(candidate.body_they), false, `${candidate.contentKey} body_they still contains second person.`);
}
for (const candidate of rowCandidates.hookRows) {
  assert.equal(hasSecondPerson(candidate.body_they), false, `${candidate.contentKey} body_they still contains second person.`);
  assert.equal(DISGUISED_FRIEND_ADVICE.test(candidate.body_they), false, `${candidate.contentKey} body_they still contains disguised advice.`);
  assert.deepEqual(findRealFiller(candidate.body_they), [], `${candidate.contentKey} body_they still contains real-filler.`);
  assert.deepEqual(findTranslationRequired(candidate.body_they), [], `${candidate.contentKey} body_they still contains translation-required phrasing.`);
}
for (const row of sourceSecondPersonVocabulary) {
  assert.equal(Object.hasOwn(row, "body_they"), false, `${row.contentKey} was mutated instead of being preserved as approved source.`);
}

const nonSynastryTheyLeaks = source.hookRows.filter((row) => (
  row.body_they
  && hasSecondPerson(row.body_they)
  && !/(?:synastry|compat|bond)/iu.test(row.contentKey)
));
assert.ok(nonSynastryTheyLeaks.length <= 769, `The all-hook body_they baseline regressed from 769 to ${nonSynastryTheyLeaks.length}.`);
const disguisedAdviceRows = source.hookRows.filter((row) => DISGUISED_FRIEND_ADVICE.test(row.body_they ?? ""));
assert.ok(disguisedAdviceRows.length <= 37, `The post-repair all-hook disguised-advice baseline regressed from 37 to ${disguisedAdviceRows.length}.`);

const mercuryAries = source.hookRows.find((row) => row.contentKey === "fallback-hook/placement-sentence/mercury/aries");
const mercuryCandidate = rowCandidates.hookRows.find((row) => row.contentKey === mercuryAries.contentKey);
assert.ok(findRealFiller(mercuryAries.body_they).length, "The real-filler detector must catch the audited Mercury-in-Aries row.");
assert.ok(findTranslationRequired(mercuryAries.body_they).length, "The translation-required detector must catch the audited Mercury-in-Aries row.");
assert.deepEqual(findRealFiller(mercuryCandidate.body_they), [], "The Mercury-in-Aries candidate must clear real-filler.");
assert.deepEqual(findTranslationRequired(mercuryCandidate.body_they), [], "The Mercury-in-Aries candidate must clear translation-required.");

const realLint = lintCard("We make a choice, and the opportunity becomes real.\n\nWe deal with the result together.");
const translationLint = lintCard("We wait until the door opens.\n\nWe deal with the result together.");
assert.ok(realLint.findings.some((finding) => finding.term === "real-filler" && finding.severity === "fail"));
assert.ok(translationLint.findings.some((finding) => finding.term === "translation-required" && finding.severity === "fail"));
for (const prompt of [
  skyVoiceJudge.buildJudgePrompt("We make a choice.\n\nWe deal with the result."),
  placementVoiceJudge.buildJudgePrompt({ hook: "Hook.", lived: "Lived.", turn: "Turn." }),
  articleVoiceJudge.buildJudgePrompt("Article body.")
]) {
  assert.match(prompt, /REAL-FILLER/u);
  assert.match(prompt, /TRANSLATION-REQUIRED/u);
}

const browserRenderer = createFallbackRenderer(
  { templates: [...templates.templates, ...interim.templates] },
  {
    vocabularyRows: [
      ...source.vocabularyRows,
      ...interim.vocabularyRows,
      ...theyCandidates.vocabularyRows,
      ...rowCandidates.vocabularyRows
    ],
    hookRows: [...source.hookRows, ...rowCandidates.hookRows]
  }
);

const sunFacts = { planet: "sun", sign: "leo", house: 1, voice: "Evergreen" };
assert.throws(() => renderNatalPlacement(sunFacts), SourceGapError, "Serving friend copy must fail closed when only an unsafe approved vocabulary body exists.");
assert.throws(() => browserRenderer.renderNatalPlacement(sunFacts), BrowserSourceGapError, "Browser serving resolver must match the Node fail-closed contract.");

const sunPreview = renderNatalPlacement(sunFacts, { allowUnreviewed: true });
assert.equal(hasSecondPerson(sunPreview.body), false);
assert.match(sunPreview.body, /needing attention to feel important/u);
assert.deepEqual(browserRenderer.renderNatalPlacement(sunFacts, { allowUnreviewed: true }), sunPreview, "Browser and Node preview renders must stay in lockstep.");

const youSun = renderNatalPlacement({ ...sunFacts, voice: "you" });
assert.match(youSun.body, /spotlight to feel like you matter/u, "The existing You voice must remain intact.");

const chironPreview = renderNatalPlacement({ planet: "chiron", sign: "aries", house: 1, voice: "Evergreen" }, { allowUnreviewed: true });
assert.match(chironPreview.body, /learning to accept themselves as they are/u);
assert.equal(hasSecondPerson(chironPreview.body), false);

const cancerProduction = renderNatalPlacement({ planet: "moon", sign: "cancer", house: 6, voice: "Evergreen" });
const cancerPreview = renderNatalPlacement({ planet: "moon", sign: "cancer", house: 6, voice: "Evergreen" }, { allowUnreviewed: true });
assert.match(cancerProduction.body, /protectively, tenderly, and by feel/u, "The unapproved Cancer wording must remain serving copy.");
assert.match(cancerPreview.body, /protectively, tenderly, and on instinct/u, "Admin preview must expose the review candidate.");

const mercuryProduction = renderNatalPlacement({ planet: "mercury", sign: "aries", house: 3, voice: "Evergreen" });
const mercuryPreviewRender = renderNatalPlacement({ planet: "mercury", sign: "aries", house: 3, voice: "Evergreen" }, { allowUnreviewed: true });
assert.match(mercuryProduction.body, /their best ideas deserve/u, "Historically approved Mercury copy must remain serving until its replacement is approved.");
assert.match(mercuryPreviewRender.body, /Their wit is quick/u, "Admin preview must expose the Mercury candidate.");
assert.match(mercuryPreviewRender.body, /drop in irritation today/u, "Admin preview must use the owner-ruling worked example.");

const piscesProduction = renderNatalAngle({ angle: "ascendant", sign: "pisces", voice: "Evergreen" });
const piscesPreview = renderNatalAngle({ angle: "ascendant", sign: "pisces", voice: "Evergreen" }, { allowUnreviewed: true });
assert.match(piscesProduction.body, /keeps the gift from draining them/u, "The unapproved Pisces correction must remain out of serving copy.");
assert.match(piscesPreview.body, /keeps this gift from emotionally draining them/u, "Admin preview must expose the Pisces candidate.");

const unsafeHookRenderer = createFallbackRenderer(
  templates,
  {
    vocabularyRows: source.vocabularyRows,
    hookRows: [
      ...source.hookRows,
      {
        contentKey: "fallback-hook/angle-sign/ascendant/pisces",
        content_role: "fallback_hook",
        body_you: "You are safe.",
        body_they: "You are not safe in a they-voice slot.",
        review_status: "approved"
      }
    ]
  }
);
assert.throws(
  () => unsafeHookRenderer.renderNatalAngle({ angle: "ascendant", sign: "pisces", voice: "Evergreen" }),
  BrowserSourceGapError,
  "An unsafe approved body_they hook must fail closed."
);

const adviceHookRenderer = createFallbackRenderer(
  templates,
  {
    vocabularyRows: source.vocabularyRows,
    hookRows: [
      ...source.hookRows,
      {
        contentKey: "fallback-hook/angle-sign/ascendant/pisces",
        content_role: "fallback_hook",
        body_you: "Give yourself time.",
        body_they: "They should give themselves time.",
        review_status: "approved"
      }
    ]
  }
);
assert.match(
  adviceHookRenderer.renderNatalAngle({ angle: "ascendant", sign: "pisces", voice: "Evergreen" }).body,
  /They should give themselves time/u,
  "Historically approved advice remains serving until an exact replacement is approved; the build-time baseline prevents new additions."
);

const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const placementPlanets = [...new Set(source.vocabularyRows
  .filter((row) => row.contentKey.startsWith("fallback-vocab/planet-verb/"))
  .map((row) => row.contentKey.split("/").at(-1)))];
const composedFriendOutputs = [];
const addComposedOutput = (id, render) => {
  const output = render();
  assert.equal(hasSecondPerson(output.body), false, `${id}: composed output contains second person.`);
  assert.equal(DISGUISED_FRIEND_ADVICE.test(output.body), false, `${id}: composed output contains disguised advice.`);
  composedFriendOutputs.push({ id, body: output.body });
};

for (const planet of placementPlanets) {
  for (const sign of signs) {
    addComposedOutput(`placement:${planet}/${sign}`, () => renderNatalPlacement({
      planet,
      sign,
      house: signs.indexOf(sign) + 1,
      voice: "Evergreen"
    }, { allowUnreviewed: true }));
  }
}
for (const angle of ["ascendant", "midheaven", "descendant", "imum-coeli"]) {
  for (const sign of signs) {
    addComposedOutput(`angle:${angle}/${sign}`, () => renderNatalAngle({ angle, sign, voice: "Evergreen" }, { allowUnreviewed: true }));
  }
}
for (const row of source.hookRows.filter((candidate) => candidate.contentKey.startsWith("fallback-hook/aspect-pair/"))) {
  const [, , planetA, planetB, group] = row.contentKey.split("/");
  const aspects = group === "soft" ? ["trine", "sextile"] : group === "hard" ? ["square", "opposition"] : ["conjunction"];
  for (const aspect of aspects) {
    addComposedOutput(`aspect:${planetA}/${aspect}/${planetB}`, () => browserRenderer.renderNatalAspect({
      planetA,
      planetB,
      aspect,
      voice: "Evergreen"
    }, { allowUnreviewed: true }));
  }
}
for (const type of ["t_square", "grand_square", "grand_trine", "kite", "yod", "mystic_rectangle"]) {
  addComposedOutput(`aspect-pattern:${type}`, () => browserRenderer.renderAspectPattern({
    type,
    apexTitle: "Mars",
    mode: "cardinal",
    voice: "Evergreen"
  }));
}
for (let house = 1; house <= 12; house += 1) {
  addComposedOutput(`glossary:${house}`, () => browserRenderer.renderHouseGlossary({ house, voice: "Evergreen" }));
  for (const sign of signs) {
    addComposedOutput(`empty:${house}/${sign}`, () => browserRenderer.renderNatalEmptyHouse({
      house,
      sign,
      rulerSign: signs[(house + 2) % 12],
      rulerHouse: (house % 12) + 1,
      voice: "Evergreen"
    }, { allowUnreviewed: true }));
  }
}

assert.equal(composedFriendOutputs.length, 793, "The composed friend-natal matrix changed; review coverage before updating this contract.");
assert.ok(
  source.hookRows.some((row) => row.contentKey.startsWith("fallback-hook/profection-year/")),
  "Annual profection rows must remain present but outside this natal-only friend-voice pass."
);
assert.equal(
  rowCandidates.hookRows.some((row) => row.contentKey.startsWith("fallback-hook/profection-year/")),
  false,
  "Forecast/profection copy must not receive a friend-natal candidate under this owner ruling."
);
const grammarHeuristicAllowlist = [
  /rewards they fully earned/u,
  /settles them is/u,
  /use them is/u,
  /love them would/u,
  /delights them is/u,
  /change them is/u,
  /tasks they resent and the help they/u,
  /push-pull they run/u,
  /stretches them is/u,
  /pull they cannot explain/u,
  /wall they live behind/u
];
const grammarFlags = composedFriendOutputs.flatMap(({ id, body }) => (
  findPronounGrammarIssues(body).map((issue) => ({ id, ...issue }))
));
assert.ok(grammarFlags.length <= 14, `The composed pronoun-grammar heuristic regressed from 14 to ${grammarFlags.length} flags.`);
for (const issue of grammarFlags) {
  assert.ok(
    grammarHeuristicAllowlist.some((pattern) => pattern.test(issue.sentence)),
    `${issue.id}: unreviewed pronoun-grammar flag (${issue.pattern}): ${issue.sentence}`
  );
}

const uniqueMatches = (text, pattern) => {
  pattern.lastIndex = 0;
  return [...new Set([...String(text ?? "").matchAll(pattern)].map((match) => match[0]))];
};
const auditText = (body) => {
  const text = stripSlots(body);
  const findings = [];
  const add = (code, matches) => {
    const values = [...new Set(matches.filter(Boolean))];
    if (values.length) findings.push({ code, matches: values });
  };

  add("second-person", uniqueMatches(text, /\b(?:you|your|yours|yourself|yourselves|you're|you've|you'll)\b/giu));
  add("disguised-advice", uniqueMatches(text, /(?:\b(?:they (?:should|need to|have to|must|would benefit from)|it is important for them to|the (?:lesson|goal) is|their best ideas deserve|what they need to learn is)\b|(?:^|[.!?]\s+)the work is\b)/gimu));
  add("reader-management", uniqueMatches(text, /(?:^|[.!?]\s+)(?:give them|be patient with them|do not take it personally|let them come to you|make sure they know|remember that|try not to|you can help by|the best way to deal with them is|they respond best when you)\b[^.!?]*/gimu));
  add("translation-required", findTranslationRequired(text));
  add("real-filler", findRealFiller(text));
  add("repeating-skeleton", uniqueMatches(text, /\b(?:They are someone who|At their best|At their worst|Pushed too far|This can make them|What they want most is|The lesson is|The challenge is)\b/giu));
  add("source-facing-language", uniqueMatches(text, /(?:\b(?:the source says|according to the source|this placement means|in astrology)\b|(?:^|[.!?]\s+)Timing:)/gimu));
  add("referent-ambiguity", uniqueMatches(text, /\btheir best ideas?\b[^.!?]{0,96}\b(?:it|them)\b/giu));
  add("duplicate-word", uniqueMatches(text, /\b([a-z][a-z'-]*)\s+\1\b/giu));
  add("composition-repetition", uniqueMatches(text, /\bfeel(?:s|ing)?\b[^.!?]{0,64}\bby feel\b/giu));

  const bannedPatterns = [
    /—/gu,
    /\bwhether\b/giu,
    /\bthings\b/giu,
    /\balignment\b/giu,
    /\bactivation\b/giu,
    /\breal\b/giu,
    /\bon paper\b/giu,
    /\bshared trust\b/giu,
    /\bkeep shrinking\b/giu,
    /\b(?:it|this|pattern|astrology|placement|planet|aspect|house) asks\b/giu,
    /\bpermission to\b/giu,
    /\b(?:judge|judges|judged|judging|grade|grades|graded|grading)\b/giu
  ];
  add("banned-vocabulary", bannedPatterns.flatMap((pattern) => uniqueMatches(text, pattern)));
  add("therapist-language", uniqueMatches(text, /\b(?:safe space|inner child|self-regulat(?:e|es|ed|ing|ion)|trauma response|attachment style)\b/giu));

  const reviewedGrammarIssues = findPronounGrammarIssues(text).filter((issue) => (
    !grammarHeuristicAllowlist.some((pattern) => pattern.test(issue.sentence))
  ));
  add("pronoun-grammar", reviewedGrammarIssues.map((issue) => `${issue.pattern}: ${issue.sentence}`));

  const rewriteCodes = new Set([
    "second-person",
    "disguised-advice",
    "reader-management",
    "translation-required",
    "repeating-skeleton",
    "source-facing-language",
    "referent-ambiguity",
    "therapist-language"
  ]);
  const triage = findings.some((finding) => rewriteCodes.has(finding.code))
    ? "REWRITE"
    : findings.length
      ? "LIGHT EDIT"
      : "AS IS";
  return { triage, findings };
};

const composedAudit = composedFriendOutputs.map(({ id, body }) => ({
  id,
  family: id.split(":", 1)[0],
  ...auditText(body)
}));
const composedByTriage = Object.fromEntries(["AS IS", "LIGHT EDIT", "REWRITE"].map((triage) => [
  triage,
  composedAudit.filter((item) => item.triage === triage).map(({ id, family, findings }) => ({ id, family, findings }))
]));
const findingCounts = {};
for (const item of composedAudit) {
  for (const finding of item.findings) findingCounts[finding.code] = (findingCounts[finding.code] ?? 0) + 1;
}

const canonicalRows = new Map([
  ...source.vocabularyRows.map((row) => [row.contentKey, row]),
  ...source.hookRows.map((row) => [row.contentKey, row])
]);
const candidateRows = [
  ...theyCandidates.vocabularyRows.map((row) => ({ ...row, candidateKind: "vocabulary" })),
  ...rowCandidates.vocabularyRows.map((row) => ({ ...row, candidateKind: "vocabulary" })),
  ...rowCandidates.hookRows.map((row) => ({ ...row, candidateKind: "hook" }))
];
const copyFields = new Set(["body", "body_you", "body_they"]);
const oppositionSample = browserRenderer.renderNatalAspect({
  planetA: "sun",
  planetB: "mercury",
  aspect: "opposition",
  voice: "Evergreen"
}, { allowUnreviewed: true });
const candidateSampleOverrides = new Map([
  [
    "fallback-hook/aspect-type/opposition",
    { id: "aspect:sun/opposition/mercury", body: oppositionSample.body }
  ],
  [
    "fallback-hook/house-cusp/virgo",
    composedFriendOutputs.find(({ id }) => id === "empty:1/virgo")
  ]
]);
assert.ok(candidateSampleOverrides.get("fallback-hook/house-cusp/virgo"), "Virgo house-cusp sample render is missing.");

const candidateReviewItems = candidateRows.map((candidate) => {
  const canonical = canonicalRows.get(candidate.contentKey);
  assert.ok(canonical, `${candidate.contentKey}: candidate has no canonical source row.`);
  const field = Object.hasOwn(candidate, "body_they") ? "body_they" : "body";
  const proposedFriendCopy = candidate[field];
  const anchor = stripSlots(proposedFriendCopy).trim().split(/\s+/u).slice(0, 5).join(" ");
  const rendered = candidateSampleOverrides.get(candidate.contentKey)
    ?? composedFriendOutputs.find(({ body }) => body.includes(anchor))
    ?? null;
  const originalFriendCopy = canonical.body_they ?? canonical.body ?? null;
  const originalAudit = auditText(originalFriendCopy);
  const metadata = Object.fromEntries(Object.entries(canonical).filter(([key]) => !copyFields.has(key)));
  const stableRenderContract = rendered ? null : {
    schemaVersion: 1,
    renderKey: `friend-natal-slot-v1:${candidate.contentKey}:${field}`,
    contentKey: candidate.contentKey,
    field,
    contentRole: candidate.content_role,
    grammarFrame: candidate.grammar_frame ?? canonical.grammar_frame ?? null,
    renderedValue: proposedFriendCopy
  };
  const sampleKey = rendered?.id ?? stableRenderContract.renderKey;
  const sampleSha256 = sha256(rendered?.body ?? JSON.stringify(stableRenderContract));
  const lightEdit = candidate.contentKey === "fallback-vocab/sign-adverb/cancer"
    || candidate.contentKey === "fallback-hook/angle-sign/ascendant/pisces";
  return {
    family: candidate.contentKey.split("/").slice(0, -1).join("/"),
    key: candidate.contentKey,
    field,
    originalSelfCopy: canonical.body_you ?? canonical.body ?? null,
    originalFriendCopy,
    proposedFriendCopy,
    triage: lightEdit ? "LIGHT EDIT" : "REWRITE",
    reasonForChange: originalAudit.findings.length
      ? originalAudit.findings.map((finding) => finding.code)
      : ["governed friend variant required"],
    compositionDependencies: [sampleKey],
    sampleKind: rendered ? "composed-output" : "stable-render-contract",
    renderedComposedSample: rendered ? rendered.body : null,
    renderedComposedSampleKey: sampleKey,
    renderedComposedSampleSha256: sampleSha256,
    stableRenderContract,
    qaResult: auditText(proposedFriendCopy).findings,
    canonicalMetadataSha256: sha256(JSON.stringify(metadata))
  };
});
assert.equal(candidateReviewItems.length, 43, "The governed friend-natal candidate packet must contain exactly 43 rows.");
assert.equal(
  candidateReviewItems.filter((item) => item.renderedComposedSample || (
    item.renderedComposedSampleKey && item.renderedComposedSampleSha256
  )).length,
  43,
  "Every friend-natal candidate needs composed output or a stable render key plus hash."
);
assert.equal(
  candidateReviewItems.filter((item) => item.sampleKind === "stable-render-contract").length,
  9,
  "Only the nine currently unconsumed vocabulary slots may use stable render contracts."
);

const sampleSeed = "friend-natal-owner-review-2026-08-11";
const sampleFamilies = ["placement", "angle", "aspect", "aspect-pattern", "empty", "glossary"];
const representativeSample = sampleFamilies.map((family) => {
  const candidates = composedFriendOutputs
    .filter(({ id }) => id.startsWith(`${family}:`))
    .map((item) => ({ ...item, randomRank: sha256(`${sampleSeed}:${item.id}`) }))
    .sort((a, b) => a.randomRank.localeCompare(b.randomRank));
  const selected = candidates[0];
  assert.ok(selected, `${family}: no composed output available for representative sample.`);
  return {
    id: selected.id,
    body: selected.body,
    ...auditText(selected.body)
  };
});

const auditArtifact = {
  schemaVersion: 2,
  audit: "friend-natal-voice-audit-v1",
  generatedOn: "2026-08-11",
  ownerRuling: "tldr-astro-phrasebank/TLDR-FRIEND-NATAL-VOICE-RULING-OWNER.md",
  status: "ROUND 1 OWNER REVIEW RECORDED; PASS 2 BLOCKED",
  servingChangesAuthorized: false,
  autoPublish: false,
  writerPromotionAuthorized: false,
  ownerRound1Verdict: {
    record: "packages/astro-knowledge/review/friend-natal-candidates-owner-review-2026-08-11.md",
    flagged: 41,
    passedButNotApproved: [
      "fallback-vocab/planet-function/moon",
      "fallback-vocab/planet-function/venus"
    ],
    allCandidatesRemainNeedsReview: true,
    pass2Authorized: false
  },
  scope: {
    composedRenderCount: composedFriendOutputs.length,
    includedFamilies: [
      "natal planet-in-sign and planet-in-house",
      "natal angle-sign",
      "natal planet aspect",
      "natal aspect pattern",
      "natal empty house",
      "natal house glossary"
    ],
    ambiguousPersonContract: source.hookRows
      .filter((row) => row.contentKey.startsWith("fallback-hook/element-pattern/"))
      .map((row) => row.contentKey),
    explicitExclusions: [
      { family: "fallback-hook/profection-*", reason: "annual forecast surface" },
      { family: "fallback-hook/aspect-pattern-activation/*", reason: "transit activation surface" },
      { family: "fallback-vocab/dodont-*", reason: "daily/action-item surface" },
      { family: "fallback-vocab/sky-planet-function/*", reason: "Current Sky surface" }
    ]
  },
  byteDriftEvidence: {
    canonicalSourceSha256: sha256(fs.readFileSync(`${packageRoot}/source-rows/fallback-source-rows-v3.json`, "utf8")),
    canonicalTemplatesSha256: sha256(fs.readFileSync(`${packageRoot}/templates/fallback-templates-v3.json`, "utf8")),
    friendVocabularyCandidatesSha256: sha256(fs.readFileSync(`${packageRoot}/source-rows/friend-natal-vocabulary-they-candidates-v1.json`, "utf8")),
    friendRowCandidatesSha256: sha256(fs.readFileSync(`${packageRoot}/source-rows/friend-natal-row-level-candidates-v1.json`, "utf8"))
  },
  candidateReviewItems,
  composedTriage: {
    summary: {
      asIs: composedByTriage["AS IS"].length,
      lightEdit: composedByTriage["LIGHT EDIT"].length,
      rewrite: composedByTriage.REWRITE.length,
      findingCounts
    },
    items: composedByTriage
  },
  representativeRandomSample: {
    method: `lowest SHA-256 rank per family using seed ${sampleSeed}`,
    items: representativeSample
  }
};
const serializedAuditArtifact = `${JSON.stringify(auditArtifact, null, 2)}\n`;
if (writeAuditArtifact) {
  fs.writeFileSync(auditArtifactPath, serializedAuditArtifact);
} else {
  assert.equal(
    fs.readFileSync(auditArtifactPath, "utf8"),
    serializedAuditArtifact,
    `Friend natal voice audit artifact drifted. Review the diff, then regenerate with node --experimental-strip-types scripts/test-friend-natal-pronoun-contract.mjs --write-audit.`
  );
}

console.log(`friend natal pronoun contract: ok (26 friend-natal vocabulary candidates; 14 rows held outside scope; ${rowCandidates.hookRows.length} review-only hook candidates; ${composedFriendOutputs.length} composed renders; ${nonSynastryTheyLeaks.length}/769 pronoun baseline; ${disguisedAdviceRows.length}/29 advice baseline)`);
