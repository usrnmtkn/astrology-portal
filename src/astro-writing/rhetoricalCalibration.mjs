import { createHash } from 'node:crypto';
import { RHETORICAL_REVIEW_SCHEMA, rhetoricalReviewContract, validateRhetoricalReview, rhetoricalDecision } from './rhetoricalPatterns.mjs';

// No provider, credentials or network here. The caller supplies an independently
// authorized judge. Expected labels and source fixture names never enter its input.
export async function runRhetoricalCalibration(cases, judge) {
  if (typeof judge !== 'function') throw new Error('An explicitly supplied judge is required.');
  const results = [];
  for (const fixture of cases) {
    const candidate = {body: fixture.body};
    const request = {
      id: createHash('sha256').update(fixture.id).digest('hex'),
      surface: fixture.surface,
      candidate,
      instructions: rhetoricalReviewContract(candidate),
      schema: RHETORICAL_REVIEW_SCHEMA
    };
    let raw, review, invalid = null;
    try {
      raw = await judge(request);
      review = validateRhetoricalReview(raw, candidate);
    } catch (error) { invalid = error.message; }
    const labels = [...new Set(review?.findings.map(f=>f.label) ?? [])];
    const missed = review ? (fixture.required ?? []).filter(label=>!labels.includes(label)) : [];
    const missedAlternative = review && fixture.anyOf?.length && !fixture.anyOf.some(label=>labels.includes(label));
    const forbidden = review ? (fixture.forbidden ?? []).filter(label=>labels.includes(label)) : [];
    // Some owner controls protect a particular meaningful contrast, not every
    // rhetorical choice in a long essay. Keep the complete essay in judge context.
    const protectedFindings = review?.findings.filter(f=>(fixture.protectedSpans ?? [])
      .some(span=>span.labels.includes(f.label) && (f.quote.includes(span.text) || span.text.includes(f.quote)))) ?? [];
    results.push({id:fixture.id,surface:fixture.surface,body:fixture.body,raw,invalid,
      decision:review?rhetoricalDecision(review):'evaluation_unavailable',labels,
      falseAcceptance:Boolean(review && (fixture.required?.length || fixture.anyOf?.length) && rhetoricalDecision(review)==='pass'),
      falseRejection:Boolean(review && (forbidden.length || protectedFindings.length)),
      labelMismatch:Boolean(review && (missed.length || missedAlternative)),
      missingLabels:missed,forbiddenLabels:forbidden,protectedFindings});
  }
  const counts = rows=>({cases:rows.length,falseAcceptances:rows.filter(r=>r.falseAcceptance).length,
    falseRejections:rows.filter(r=>r.falseRejection).length,labelMismatches:rows.filter(r=>r.labelMismatch).length,
    invalidEvaluations:rows.filter(r=>r.invalid||r.decision==='evaluation_unavailable').length});
  return {results,totals:counts(results),bySurface:Object.fromEntries([...new Set(cases.map(f=>f.surface))]
    .map(surface=>[surface,counts(results.filter(r=>r.surface===surface))]))};
}
