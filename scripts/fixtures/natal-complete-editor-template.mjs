// A synthetic template tail tests complete editing independently of owner prose.
export function natalCompleteEditorTemplate(source) {
  const body = "{{#pairSentences}}{{pairSentences}} Synthetic shared closing for {{possessiveLow}} {{planetATitle}} and {{planetBTitle}}.{{/pairSentences}}";
  return { ...source, body_you: body, body_they: body, review_status: "approved" };
}
