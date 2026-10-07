import authority from './lunationEditorialAuthority.cjs';
export const { LUNATION_REQUIRED_VOCABULARY, LUNATION_ARGUMENT_GUIDANCE, LUNATION_EDITORIAL_AUTHORITY } = authority;

export function lunationVocabularyFindings(passage) {
  return ['headline', 'summary', 'body', 'journalPrompt'].flatMap(field => {
    const text = String(passage?.[field] ?? '').replace(/&#(x[\da-f]+|\d+);?/giu, (_, value) => {
      const code = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/[\u200b-\u200d\ufeff]/gu, '');
    return /(?<![\p{L}\p{N}_])whether(?![\p{L}\p{N}_])/iu.test(text)
      ? [{ category: 'lunation_required_vocabulary', field, detail: `Remove “whether” from the ${field}. Recast the thought naturally.`, governanceTier: 'blocking' }]
      : [];
  });
}

export function withLunationVocabularyFindings(lint, passage) {
  const violations = [...lint.violations, ...lunationVocabularyFindings(passage)];
  return { ...lint, passed: violations.length === 0, violations,
    governance: { ...lint.governance, blockingViolationCount: violations.length },
    rulesRun: [...lint.rulesRun, 'lunation-required-vocabulary'] };
}
