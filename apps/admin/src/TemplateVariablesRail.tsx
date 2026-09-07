import { ChevronRight, CircleHelp, Search, X } from "lucide-react";
import { Suspense, lazy } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { CompositionMapRow, CompositionPreviewOptions } from "./compositionMap";
import type { TemplateVariableReference } from "./templateVariableReference";
import { templateVariableSourceKeyPrefixes } from "./templateVariableSources";
import { TemplateVariableReviewPanels, type TemplateVariableSourceRow } from "./TemplateVariableReviewPanels";

const TemplateReaderDrilldown = lazy(() => import("./TemplateReaderDrilldown"));

type RailRow = CompositionMapRow & TemplateVariableSourceRow;

type Props = {
  references: TemplateVariableReference[];
  filteredReferences: TemplateVariableReference[];
  query: string;
  onQueryChange: (query: string) => void;
  rows: RailRow[];
  templateContentKey: string;
  templatePreviewRow: CompositionMapRow | null;
  reviewTemplateRow: CompositionMapRow;
  previewOptions?: CompositionPreviewOptions;
  selectedVariableName: string | null;
  selectedSourceId: string | null;
  onSelectVariable: (name: string | null) => void;
  onSelectSource: (id: string | null) => void;
  onEditSource: (row: TemplateVariableSourceRow) => void;
  onClose: () => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

type VariableKind = "fact" | "phrase" | "hook" | "copy" | "unmapped";

function variableKind(reference: TemplateVariableReference, templateContentKey: string): VariableKind {
  if (reference.sourceKind === "runtime") return "fact";
  if (reference.sourceKind === "unmapped") return "unmapped";
  const prefixes = templateVariableSourceKeyPrefixes(reference, templateContentKey).join(" ");
  if (prefixes.includes("vocab")) return "phrase";
  if (prefixes.includes("hook")) return "hook";
  return "copy";
}

const kindLabels: Record<VariableKind, string> = {
  fact: "Runtime",
  phrase: "Phrase",
  hook: "Hook",
  copy: "Copy",
  unmapped: "Unwired"
};

/**
 * Variables docked beside the editor. The assembled write-up stays on top
 * because it is the fastest way to see what a variable does; the list below
 * it is one row per variable, and selecting a row swaps the rail to that
 * variable's detail instead of stacking another drawer over the editor.
 */
export default function TemplateVariablesRail({
  references, filteredReferences, query, onQueryChange, rows, templateContentKey, templatePreviewRow,
  reviewTemplateRow, previewOptions, selectedVariableName, selectedSourceId,
  onSelectVariable, onSelectSource, onEditSource, onClose, onKeyDown
}: Props) {
  const selected = selectedVariableName
    ? references.find((reference) => reference.name === selectedVariableName) ?? null
    : null;

  return (
    <aside
      className="admin-variables-rail"
      role="complementary"
      aria-label="Template variable reference"
      onKeyDown={onKeyDown}
    >
      <header className="admin-variables-rail-header">
        <div>
          <p className="admin-eyebrow">Variables</p>
          <h2>{selected ? <code>{`{{${selected.name}}}`}</code> : `${references.length} in this row`}</h2>
        </div>
        <div className="admin-variables-rail-actions">
          <details className="admin-help-popover">
            <summary aria-label="Template syntax help" title="Template syntax help">
              <CircleHelp size={16} aria-hidden="true" />
            </summary>
            <div role="region" aria-label="Template syntax guide">
              <p className="admin-eyebrow">Template syntax</p>
              <dl className="admin-hook-pattern-list">
                <div>
                  <dt><code>{"{{planetTitle}}"}</code></dt>
                  <dd>Inserts one value, such as <em>Jupiter</em>.</dd>
                </div>
                <div>
                  <dt><code>{"{{#planetIntro}}…{{/planetIntro}}"}</code></dt>
                  <dd>Includes the block only when that optional copy is available.</dd>
                </div>
                <div>
                  <dt><code>{"{{.}}"}</code></dt>
                  <dd>Inserts the current sentence while the app moves through a list.</dd>
                </div>
              </dl>
            </div>
          </details>
          <button type="button" className="admin-secondary-button admin-variables-rail-close" onClick={onClose} aria-label="Close variables" title="Close variables">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="admin-variables-rail-body">
        {selected ? (
          <TemplateVariableReviewPanels
            references={references}
            rows={rows}
            templateContentKey={templateContentKey}
            templateRow={reviewTemplateRow}
            selectedVariableName={selected.name}
            selectedSourceId={selectedSourceId}
            onBackToVariables={() => onSelectVariable(null)}
            onSelectSource={onSelectSource}
            onSelectVariable={(name) => {
              onSelectSource(null);
              onSelectVariable(name);
            }}
            onEditSource={onEditSource}
          />
        ) : (
          <>
            {templatePreviewRow && (
              <Suspense fallback={<div className="admin-empty-state"><strong>Building reader preview…</strong></div>}>
                <TemplateReaderDrilldown
                  compact
                  rows={rows}
                  templateRow={templatePreviewRow}
                  previewOptions={previewOptions}
                  onOpenVariable={(name, sourceId) => {
                    onSelectVariable(name);
                    onSelectSource(sourceId);
                  }}
                />
              </Suspense>
            )}

            <label className="admin-variables-rail-search">
              <span>Find a variable</span>
              <div className="admin-search-input-shell">
                <Search size={15} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Name, meaning, or source"
                  autoFocus
                />
              </div>
            </label>

            <ul className="admin-variables-rail-list" aria-label="Variables used in this row">
              {filteredReferences.map((reference) => {
                const kind = variableKind(reference, templateContentKey);
                return (
                  <li key={reference.name}>
                    <button
                      type="button"
                      className="admin-variables-rail-row"
                      onClick={() => {
                        onSelectSource(null);
                        onSelectVariable(reference.name);
                      }}
                    >
                      <code className={`admin-variables-rail-token variable-${kind === "unmapped" ? "copy" : kind}`}>{`{{${reference.name}}}`}</code>
                      <span className={`ui-pill admin-variables-rail-kind is-${kind}`}>{kindLabels[kind]}</span>
                      <ChevronRight size={16} aria-hidden="true" />
                      <span className="admin-variables-rail-source">
                        {reference.requirement !== "Runtime" && <>{reference.requirement} · </>}
                        {reference.source}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {filteredReferences.length === 0 && (
              <div className="admin-empty-state">
                <strong>No matching variables</strong>
                <p>Try a name such as <code>planetTitle</code>, or a meaning such as “sign”.</p>
              </div>
            )}
            <p className="admin-field-hint admin-variables-rail-count" aria-live="polite">
              {filteredReferences.length === references.length
                ? `${references.length} variable${references.length === 1 ? "" : "s"}`
                : `${filteredReferences.length} of ${references.length} variables`}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
