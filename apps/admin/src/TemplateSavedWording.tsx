import { useEffect, useState, type ComponentProps } from 'react';
import TemplateReaderDrilldown from './TemplateReaderDrilldown';
import { templateVariableSourceKeyPrefixes } from './templateVariableSources';
import { templateSavedWordingReferences } from './templateSavedWordingReferences';
import type { TemplateVariableReference } from './templateVariableReference';
import { StudioButton } from './StudioControls';
import { PageLoading } from '../../../src/shared/components/PageLoading';
import { studioVariablePreviewRow } from './studioVariablePreviewRow';

type Props = ComponentProps<typeof TemplateReaderDrilldown> & {
  references: TemplateVariableReference[];
  onLoadSourceInventory: (prefixes: string[], signal: AbortSignal) => Promise<void>;
};

/** The main authoring view exposes the saved words as well as the raw pattern.
 * Source editing retains the existing complete-document editor and return path.
 */
export default function TemplateSavedWording({ references, onLoadSourceInventory, ...props }: Props) {
  const prefixes = JSON.stringify([...new Set(templateSavedWordingReferences(references)
    .flatMap(reference => templateVariableSourceKeyPrefixes(reference, props.templateRow.content_key)))].sort());
  const [state, setState] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const keys: string[] = JSON.parse(prefixes);
    if (!keys.length) { setState('loaded'); return; }
    const controller = new AbortController();
    setState('loading');
    void onLoadSourceInventory(keys, controller.signal)
      .then(() => { if (!controller.signal.aborted) setState('loaded'); })
      .catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [prefixes, onLoadSourceInventory, attempt]);
  return <section className="studio-section studio-surface" aria-label="Template saved wording">
    <p>Read the wording behind this template. Edit a saved passage here; its complete source opens and your template draft is retained. Calculated values remain variables.</p>
    {state === 'loading' && <PageLoading compact message="Loading saved wording sources…" />}
    {state === 'error' && <p role="alert">Saved wording sources could not load. <StudioButton onClick={() => setAttempt(value => value + 1)}>Retry saved wording</StudioButton></p>}
    {state === 'loaded' && <TemplateReaderDrilldown key={props.previewOptions?.initialAudience ?? 'you'} {...props}
      templateRow={studioVariablePreviewRow(props.templateRow)} rows={props.rows.map(studioVariablePreviewRow)}
      onEditSource={props.onEditSource ? row => props.onEditSource!(props.rows.find(original => original.id === row.id) ?? row) : undefined} compact />}
  </section>;
}
