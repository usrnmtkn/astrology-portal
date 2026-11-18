import type { TemplateVariableReference } from './templateVariableReference';

const readerSourceFields = new Set([
  'Headline', 'Summary', 'Body', 'headline', 'summary', 'body', 'body_you', 'body_they', 'headline_they', 'Resolver dependency'
]);

export function templateSavedWordingReferences(references: TemplateVariableReference[]) {
  return references.filter(reference => reference.sourceKind === 'saved-copy'
    && reference.fields.some(field => readerSourceFields.has(field)));
}
