import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMeaningPlan } from './buildMeaningPlan.mjs';
import { buildArgumentOutline } from './argumentGate.mjs';
import { retrieveOwnerContext } from './retrieveOwnerContext.mjs';
import { assertPositiveOwnerEvidenceContext } from './ownerEvidencePolicy.mjs';
import { withoutOwnerRejectedEvidence } from './ownerEvidenceRejections.mjs';
import { ownerApprovedMatrixRoleEvidenceForTarget } from './ownerPositiveEvidence.mjs';
import { sceneEvidenceForTarget } from './sceneEvidence.mjs';
import { matrixSceneNounLexicon } from './matrixEvidenceIndex.mjs';
import { loadPhraseEvidenceIndex } from './phraseEvidence.mjs';
import { assertLunationWritingFacts, lunationDigest } from './lunationWritingFacts.mjs';
import { LUNATION_EDITORIAL_AUTHORITY } from './lunationEditorialConstraints.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const lunationWritingVersion = 'calendar-lunation-writer/v2';
export const lunationWritingTarget = Object.freeze({ surface: 'calendar-lunation', route: 'calendar',
  renderer: 'renderLunationMacro', contentKeyFamily: 'authored/sky-lunation-macro', temporality: 'current_sky', voiceMode: 'second_person' });

/** Pure preparation: repository reads only; no approval, writer call, or serving write. */
export function prepareLunationWriting({ engineFacts, argumentInput, preferredOwnerSourceIds = [], privateCorrections = [] }) {
  const hashes = [];
  const read = name => {
    const text = fs.readFileSync(path.join(root, name), 'utf8');
    hashes.push({ path: name, sha256: lunationDigest(text) });
    return text;
  };
  const lines = name => read(name).split(/\r?\n/u).filter(Boolean).map(JSON.parse);
  const phase = engineFacts?.event?.kind, sign = engineFacts?.event?.sign;
  const meaningPath = 'tldr-astro-phrasebank/phrasebank/cc-moon-reviewed.json';
  const doctrine = JSON.parse(read(meaningPath)).reviewed;
  const phaseMeaning = doctrine.find(e => e.kind === 'moon_phase' && e.phase === phase && e.status === 'REVIEWED_CLAUSE');
  const signMeaning = doctrine.find(e => e.kind === 'moon_sign' && e.sign === sign && e.status === 'REVIEWED_CLAUSE');
  if (!phaseMeaning || !signMeaning) throw new Error('LUNATION_REVIEWED_MEANING_REQUIRED');
  const meaningInput = { contentType: 'lunation', object: 'moon', sign, eventType: phase,
    calculatedFactsHash: lunationDigest(engineFacts), objectFunction: phaseMeaning.slots.cycle_role,
    signMechanics: signMeaning.slots.embodied_guidance, coreTension: signMeaning.slots.care_prompt,
    likelyObservableBehaviors: [phaseMeaning.slots.phase_action, signMeaning.slots.embodied_guidance],
    likelyConsequences: [signMeaning.slots.care_prompt],
    DO_NOT_ASSUME: ['a partner or a beginning that requires another person', 'a prior intention, ritual or remembered experience',
      'a guaranteed result at a later lunar phase', 'historical dates or transits from source articles'] };
  const plan = buildMeaningPlan(meaningInput);
  assertLunationWritingFacts(engineFacts, { plan, target: lunationWritingTarget });
  for (const correction of privateCorrections) {
    if (correction.contentKey !== engineFacts.contentKey || !correction.owner_reason || !correction.bad
      || correction.positive_evidence_revoked !== true || correction.originalSha256 !== lunationDigest(correction.bad)) {
      throw new Error('LUNATION_PRIVATE_CORRECTION_INVALID');
    }
  }
  const corrections = [...privateCorrections,
    ...lines('data/writing/owner-corrections.jsonl'), ...lines('data/writing/owner-feedback-corpus.jsonl')];
  const voice = JSON.parse(read('packages/astro-knowledge/voice/tldr-astro/satori-writer/voice-index.json'));
  const phasePattern = phase === 'new-moon' ? /new[-_ ]moon/iu : /full[-_ ]moon/iu;
  const examples = withoutOwnerRejectedEvidence(voice.entries, corrections)
    .filter(e => e.surface === 'sky-lunation' && e.authorityClass === 'owner_authored_final'
      && e.ownerApproved === true && e.ownerAuthored === true && e.useAsPositiveVoiceEvidence === true
      && e.structuralFunction === 'article paragraph' && e.text?.length >= 80 && phasePattern.test(e.sourceId))
    .map(e => {
      if (e.sourceSha256 !== lunationDigest(e.text)) throw new Error(`LUNATION_OWNER_PASSAGE_DRIFT:${e.sourceId}`);
      return { ...e, id: e.sourceId, contentKey: e.sourceId, family: 'sky-lunation',
        register: /\b(?:you|your)\b/iu.test(e.text) ? 'second_person' : 'collective' };
    });
  const preferred = preferredOwnerSourceIds.map(id => {
    const entry = examples.find(e => e.id === id);
    if (!entry) throw new Error(`LUNATION_OWNER_SOURCE_INELIGIBLE:${id}`);
    return entry;
  });
  const gold = preferred[0] ?? examples.find(e => e.sign === sign) ?? examples[0];
  if (!gold) throw new Error('LUNATION_OWNER_REGISTER_REQUIRED');
  const matrix = withoutOwnerRejectedEvidence(lines('data/writing/matrix-evidence-index/TLDR-Matrix-Evidence-Index.jsonl'), corrections, 'copy');
  const approved = withoutOwnerRejectedEvidence(lines('data/writing/OWNER_APPROVED_EXAMPLES.jsonl'), corrections);
  const matrixRoles = ownerApprovedMatrixRoleEvidenceForTarget(matrix, { planet: 'moon', sign, eventType: phase, surface: 'calendar-lunation' });
  const scenes = sceneEvidenceForTarget({ approvedExamples: approved, matrixEvidenceRows: matrix,
    registerExamples: examples, sceneNounLexicon: matrixSceneNounLexicon(matrix), plan });
  const phrasePath = 'data/writing/phrase-evidence-index/owner-phrase-evidence-v1.jsonl';
  read(phrasePath);
  const reviewedMeaningExamples = [phaseMeaning, signMeaning].map(e => ({ id: e.id, status: e.status,
    planet: 'moon', sign: e.sign ?? null, eventType: e.phase ?? null,
    meaningScope: e.kind === 'moon_phase' ? 'lunar-phase' : 'lunar-sign', text: Object.values(e.slots).join('\n'),
    sourcePath: meaningPath, sourceSha256: lunationDigest(e), sourceKind: 'reviewed-doctrine',
    ownerAuthored: false, ownerApproved: false, reviewNote: e.review_note }));
  const relevant = examples.filter(e => e.sign === sign);
  const contextOptions = { examples, reviewedMeaningExamples, matrixExamples: matrixRoles.meaning,
    matrixArgumentCandidates: matrixRoles.argument_candidate, matrixEvidenceAvailableCount: matrixRoles.meaning.length,
    relevantOwnerPassagesAvailableCount: relevant.length, ownerPassageRelevanceTier: relevant.length ? 'same-sign' : 'none',
    sceneExamples: scenes.selected, samePlanetSignSceneAvailableCount: scenes.counts.samePlanetSignSceneAvailable,
    sceneEvidenceInventoryCounts: scenes.counts, corrections, phraseEvidence: loadPhraseEvidenceIndex(path.join(root, phrasePath)),
    registerGoldExamples: [{ ...gold, id: `register-gold:lunations:${phase}`, evidenceRole: 'register_gold' }],
    preferredEvidenceContentKeys: preferred.map(e => e.contentKey) };
  const argumentOutline = buildArgumentOutline(argumentInput, { plan, family: 'lunations', surface: 'calendar-lunation' });
  const context = retrieveOwnerContext(plan, { ...contextOptions, contentFamily: 'lunations', register: 'second_person' });
  // Only argument approval is deferred. All evidence must be available at review time.
  try { assertPositiveOwnerEvidenceContext(context, { family: 'lunations' }); } catch (error) {
    if (error.code !== 'OWNER_EVIDENCE_ROLE_MISSING' || error.detail?.role !== 'argument') throw error;
  }
  const receipt = { version: lunationWritingVersion, editorialAuthorityHash: lunationDigest(LUNATION_EDITORIAL_AUTHORITY), contentKey: engineFacts.contentKey,
    calculatedFactsHash: plan.calculatedFactsHash, outlineHash: argumentOutline.outlineHash, sources: hashes,
    sourceIds: context.sameFamilyExamples.map(e => e.sourceId),
    correctionsHash: lunationDigest(privateCorrections), correctionsCount: privateCorrections.length,
    feedbackStorage: 'request-only; no database write', ownerApproved: false, promotionAuthorized: false };
  return { meaningInput, plan, argumentOutline, contextOptions, context, receipt };
}
