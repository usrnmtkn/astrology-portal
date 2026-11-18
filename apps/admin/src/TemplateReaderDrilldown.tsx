import { CompositionVariableKey, compositionVariableColors } from "./CompositionVariableKey";
import { StudioButton } from "./StudioControls";
import { Stack, Text } from "./studio-ds/primitives";
import { useEffect, useMemo, useState } from "react";
import {
  buildCompositionTemplate,
  compositionTemplateKey,
  type CompositionMapRow,
  type CompositionPreviewSegment,
  type CompositionPreviewOptions
} from "./compositionMap";

type Props = {
  rows: CompositionMapRow[];
  templateRow: CompositionMapRow;
  onOpenVariable: (name: string, sourceId: string | null) => void;
  previewOptions?: CompositionPreviewOptions;
  /** Rail mode: no explanatory header or footer, just the write-up and its key. */
  compact?: boolean;
  /**
   * The Studio lists rows without their documents, so a source the write-up needs may arrive
   * with no passage to show. The parent loads those rows when this reports them.
   */
  onLoadSourceDocuments?: (rowIds: string[]) => void;
  onEditSource?: (row: CompositionMapRow) => void;
  disabled?: boolean;
};

function segmentButton(
  segment: CompositionPreviewSegment,
  key: string,
  label: string,
  onOpenVariable: Props["onOpenVariable"],
  color: string | undefined,
  onEditSource?: Props["onEditSource"],
  disabled = false
) {
  if (!segment.name || !segment.kind) return segment.text;
  const action = segment.source
    ? `${onEditSource ? 'Edit the complete saved wording' : 'Open the saved source'} for ${label}`
    : segment.kind === "fact"
      ? `Inspect how ${label} is calculated`
      : `Inspect ${label}`;
  return (
    <StudioButton
      type="button"
      className={`admin-composition-variable admin-template-reader-variable variable-${segment.kind}`}
      aria-label={`${segment.text}. ${action}`}
      data-variable-label={label}
      data-variable-name={segment.name}
      data-variable-color={color}
      disabled={disabled}
      key={key}
      onClick={() => segment.source && onEditSource ? onEditSource(segment.source.row) : onOpenVariable(segment.name!, segment.source?.row.id ?? null)}
      title={action}
    >
      {segment.text}
    </StudioButton>
  );
}

export default function TemplateReaderDrilldown({ rows, templateRow, onOpenVariable, previewOptions, compact = false, onLoadSourceDocuments, onEditSource, disabled = false }: Props) {
  const [audience, setAudience] = useState<"you" | "they">(previewOptions?.initialAudience ?? "you");
  // The parent rebuilds `templateRow` on every render, so key the memo on its
  // content rather than its identity; otherwise every keystroke in the editor
  // rebuilds the whole composition against all rows.
  const templateKey = compositionTemplateKey(templateRow);
  const template = useMemo(
    () => buildCompositionTemplate(templateRow, rows, previewOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewOptions, rows, templateKey]
  );
  const pendingSourceIds = useMemo(() => template.preview.pendingSources.map(source => source.row.id), [template]);
  useEffect(() => {
    if (pendingSourceIds.length) onLoadSourceDocuments?.(pendingSourceIds);
  }, [onLoadSourceDocuments, pendingSourceIds.join("|")]);
  const variableColors = compositionVariableColors(template.slots);
  const hasAudienceVariants = template.preview.fields.some((field) => field.audience === "you")
    && template.preview.fields.some((field) => field.audience === "they");
  const fields = template.preview.fields.filter((field) => !field.audience || field.audience === audience);

  return (
    <section className={`admin-template-reader-drilldown${compact ? " is-compact" : ""}`} aria-label="Example reader write-up">
      <header>
        <Stack gap="sm">
          <Text size="meta" tone="secondary">{compact ? "Assembled write-up" : "Start with the reader-facing result"}</Text>
          {!compact && <h3>Read the assembled write-up</h3>}
          {!compact && <Text size="body" tone="secondary">This representative passage replaces template tokens with sample chart facts and saved writing. Click any colored value to trace it to its atomic source.</Text>}
        </Stack>
        <span className="ui-pill admin-status status-reviewed">Example data</span>
      </header>

      <CompositionVariableKey slots={template.slots} colors={variableColors} />
      {pendingSourceIds.length > 0 && <p role="status">Some saved wording has not loaded. Load its complete source to read or edit it.</p>}
      {onEditSource && template.preview.lineage === 'not-traceable' && <p role="status">{template.preview.lineageNote} Available saved sources can still be opened below. This example is not verified reader copy.</p>}

      <div className="admin-template-reader-surface">
        <div className="admin-composition-preview-chrome">
          <span>{template.destination}</span>
          {hasAudienceVariants ? (
            <div className="admin-composition-preview-audience" role="group" aria-label="Preview audience">
              <StudioButton type="button" aria-pressed={audience === "you"} className={audience === "you" ? "active" : ""} onClick={() => setAudience("you")}>You</StudioButton>
              <StudioButton type="button" aria-pressed={audience === "they"} className={audience === "they" ? "active" : ""} onClick={() => setAudience("they")}>They</StudioButton>
            </div>
          ) : <span>Reader preview</span>}
        </div>
        <div className="admin-template-reader-copy">
          {fields.map((field) => (
            <section className={`admin-composition-preview-field field-${field.key}`} key={field.key}>
              <span>{field.label}</span>
              {field.paragraphs.map((paragraph, paragraphIndex) => {
                const copy = paragraph.map((segment, segmentIndex) => {
                  const slot = segment.name ? template.slots.find((candidate) => candidate.name === segment.name) : null;
                  return segmentButton(
                    segment,
                    `${field.key}-${paragraphIndex}-${segmentIndex}`,
                    slot?.label ?? segment.name ?? "variable",
                    onOpenVariable,
                    segment.name ? variableColors.get(segment.name) : undefined,
                    onEditSource,
                    disabled
                  );
                });
                return field.key.startsWith("headline")
                  ? <h3 key={`${field.key}-${paragraphIndex}`}>{copy}</h3>
                  : <p key={`${field.key}-${paragraphIndex}`}>{copy}</p>;
              })}
            </section>
          ))}
          {!fields.length && (
            <div className="admin-empty-state">
              <strong>No reader-facing preview is available</strong>
              <p>Add a headline or body template before reviewing its assembled result.</p>
            </div>
          )}
        </div>
      </div>
      {onEditSource && <div className="admin-new-actions" role="group" aria-label="Saved wording sources">
        {[...template.preview.sources, ...template.preview.pendingSources].map(source => <StudioButton key={source.row.id} type="button" data-template-source-key={source.row.content_key}
          disabled={disabled} onClick={() => onEditSource(source.row)}>{source.row.inventory_only ? 'Load and edit' : 'Edit'} {template.slots.filter(slot => slot.sources.some(item => item.row.id === source.row.id)).map(slot => slot.label).join(', ') || source.label}</StudioButton>)}
        {!template.preview.sources.length && !template.preview.pendingSources.length && <p>No saved source wording is available for this example. Use Variables to inspect the source selection.</p>}
      </div>}
      {!compact && <p className="admin-field-hint">The preview is representative, not a live chart. Matching colors identify the same variable throughout the template and assembled write-up.</p>}
    </section>
  );
}
