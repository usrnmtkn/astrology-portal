function words(value) {
  return new Set(String(value ?? "").toLowerCase().match(/[a-z][a-z'-]+/gu) ?? []);
}

function overlapScore(entry, plan) {
  const haystack = words(JSON.stringify(entry));
  const needles = words([
    plan.object,
    plan.sign,
    plan.eventType,
    plan.coreTension,
    ...plan.likelyObservableBehaviors,
    ...plan.risks
  ].filter(Boolean).join(" "));
  let score = 0;
  for (const token of needles) if (haystack.has(token)) score += 1;
  if (entry.family && String(entry.family).includes(plan.object)) score += 4;
  if (entry.sign === plan.sign) score += 4;
  return score;
}

export function retrieveOwnerContext(plan, {
  examples = [],
  corrections = [],
  contentFamily,
  register,
  maxExamples = 4,
  maxCorrections = 3
} = {}) {
  const eligibleExamples = examples.filter((entry) => (
    entry.ownerApproved === true
    && (!contentFamily || entry.family === contentFamily)
    && (!register || entry.register === register)
  ));
  const ranked = (entries) => entries
    .map((entry, index) => ({ entry, index, score: overlapScore(entry, plan) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ entry }) => entry);

  return Object.freeze({
    examples: ranked(eligibleExamples).slice(0, maxExamples),
    corrections: ranked(corrections).slice(0, maxCorrections),
    counts: {
      examples: Math.min(maxExamples, eligibleExamples.length),
      corrections: Math.min(maxCorrections, corrections.length)
    }
  });
}
