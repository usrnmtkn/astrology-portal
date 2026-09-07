import { useMemo, useState } from "react";
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
};

function segmentButton(
  segment: CompositionPreviewSegment,
  key: string,
  label: string,
  onOpenVariable: Props["onOpenVariable"]
) {
  if (!segment.name || !segment.kind) return segment.text;
  const action = segment.source
    ? `Open the saved source for ${label}`
    : segment.kind === "fact"
      ? `Inspect how ${label} is calculated`
      : `Inspect ${label}`;
  return (
    <button
      type="button"
      className={`admin-composition-variable admin-template-reader-variable variable-${segment.kind}`}
      aria-label={`${segment.text}. ${action}`}
      data-variable-label={label}
      key={key}
      onClick={() => onOpenVariable(segment.name!, segment.source?.row.id ?? null)}
      title={action}
    >
      {segment.text}
    </button>
  );
}

export default function TemplateReaderDrilldown({ rows, templateRow, onOpenVariable, previewOptions, compact = false }: Props) {
  const [audience, setAudience] = useState<"you" | "they">("you");
  // The parent rebuilds `templateRow` on every render, so key the memo on its
  // content rather than its identity; otherwise every keystroke in the editor
  // rebuilds the whole composition against all rows.
  const templateKey = compositionTemplateKey(templateRow);
  const template = useMemo(
    () => buildCompositionTemplate(templateRow, rows, previewOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewOptions, rows, templateKey]
  );
  const hasAudienceVariants = template.preview.fields.some((field) => field.audience === "you")
    && template.preview.fields.some((field) => field.audience === "they");
  const fields = template.preview.fields.filter((field) => !field.audience || field.audience === audience);

  return (
    <section className={`admin-template-reader-drilldown${compact ? " is-compact" : ""}`} aria-label="Example reader write-up">
      <header>
        <div>
          <p className="admin-eyebrow">{compact ? "Assembled write-up" : "Start with the reader-facing result"}</p>
          {!compact && <h3>Read the assembled write-up</h3>}
          {!compact && <p>This representative passage replaces template tokens with sample chart facts and saved writing. Click any colored value to trace it to its atomic source.</p>}
        </div>
        <span className="ui-pill admin-status status-reviewed">Example data</span>
      </header>

      <div className="admin-composition-variable-legend" aria-label="Variable color key">
        <span className="variable-fact">Calculated fact</span>
        <span className="variable-phrase">Reusable phrase</span>
        <span className="variable-hook">Authored hook</span>
        <span className="variable-copy">Saved copy</span>
      </div>

      <div className="admin-template-reader-surface">
        <div className="admin-composition-preview-chrome">
          <span>{template.destination}</span>
          {hasAudienceVariants ? (
            <div className="admin-composition-preview-audience" role="group" aria-label="Preview audience">
              <button type="button" aria-pressed={audience === "you"} className={audience === "you" ? "active" : ""} onClick={() => setAudience("you")}>You</button>
              <button type="button" aria-pressed={audience === "they"} className={audience === "they" ? "active" : ""} onClick={() => setAudience("they")}>They</button>
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
                    onOpenVariable
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
      {!compact && <p className="admin-field-hint">The preview is representative, not a live chart. Its colors show which words are calculated and which come from editable saved writing.</p>}
    </section>
  );
}
