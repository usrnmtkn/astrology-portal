import { studioLazy as lazy } from "./studioLazy";
import { StudioButton, StudioIconButton, StudioInput } from "./StudioControls";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { Stack, Text } from "./studio-ds/primitives";
import { ChevronRight, Search, X } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { compositionPreviewExampleValues, type CompositionMapRow, type CompositionPreviewOptions } from "./compositionMap";
import type { TemplateVariableReference } from "./templateVariableReference";
import { templateVariableSourceCandidates, templateVariableSourceKeyPrefixes } from "./templateVariableSources";
import { TemplateVariableReviewPanels, readableCopy, type TemplateVariableSourceRow } from "./TemplateVariableReviewPanels";
import { PageLoading } from "../../../src/shared/components/PageLoading";

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
  /** Calculated-fact values for the contact on screen, keyed by variable name. */
  factExamples?: Record<string, string>;
  selectedVariableName: string | null;
  selectedSourceId: string | null;
  onSelectVariable: (name: string | null) => void;
  onSelectSource: (id: string | null) => void;
  onEditSource: (row: TemplateVariableSourceRow) => void;
  onClose: () => void;
  onInsert?: (token: string) => void;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
  /** Loads the documents for sources the example write-up needs but the list did not carry. */
  onLoadSourceDocuments?: (rowIds: string[]) => void;
  onLoadSourceInventory?: (prefixes: string[], signal: AbortSignal) => Promise<void>;
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

function variableListPreview(
  reference: TemplateVariableReference,
  kind: VariableKind,
  rows: RailRow[],
  templateContentKey: string,
  factExamples: Record<string, string> = {}
) {
  // A calculated fact reads as the contact being edited where the editor knows it. The
  // dictionary example names Saturn, which belongs to no particular transit and read as
  // another planet's write-up while editing Lilith.
  if (kind === "fact" || kind === "unmapped") return factExamples[reference.name]?.trim() || reference.example?.trim() || "";
  const sources = templateVariableSourceCandidates(reference, rows, templateContentKey);
  const anchor = (reference.name.startsWith('planet') ? factExamples.planetTitle : reference.name.startsWith('sign') ? factExamples.signTitle : '')
    ?.toLowerCase().replace(/\s+/gu, '-');
  const source = sources.find(source => anchor && source.content_key.endsWith(`/${anchor}`)) ?? sources[0];
  return source ? (readableCopy(source)[0]?.[1] ?? "").trim() : "";
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
  reviewTemplateRow, previewOptions, factExamples = {}, selectedVariableName, selectedSourceId,
  onSelectVariable, onSelectSource, onEditSource, onClose, onKeyDown, onInsert, onLoadSourceDocuments, onLoadSourceInventory
}: Props) {
  factExamples = { ...compositionPreviewExampleValues(previewOptions), ...factExamples };
  const [usedOnly, setUsedOnly] = useState(false);
  const terms = query.toLocaleLowerCase().trim().split(/\s+/u).filter(Boolean);
  const visibleReferences = references.filter(reference => (!usedOnly || reference.fields.some(field => field !== 'Available for insertion'))
    && (filteredReferences.includes(reference) || terms.length > 0 && terms.every(term => variableListPreview(reference,
      variableKind(reference, templateContentKey), rows, templateContentKey, factExamples).toLocaleLowerCase().includes(term))));
  const sourceKey = JSON.stringify([...new Set(references.flatMap(reference =>
    templateVariableSourceKeyPrefixes(reference, templateContentKey)))].sort());
  const [sourceState, setSourceState] = useState("loaded");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const prefixes: string[] = JSON.parse(sourceKey);
    if (!onLoadSourceInventory || !prefixes.length) { setSourceState("loaded"); return; }
    const controller = new AbortController();
    setSourceState("loading");
    void onLoadSourceInventory(prefixes, controller.signal)
      .then(() => { if (!controller.signal.aborted) setSourceState("loaded"); })
      .catch(() => { if (!controller.signal.aborted) setSourceState("error"); });
    return () => controller.abort();
  }, [sourceKey, onLoadSourceInventory, retry]);
  useEffect(() => {
    if (selectedSourceId) onLoadSourceDocuments?.([selectedSourceId]);
  }, [selectedSourceId, onLoadSourceDocuments]);
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
        <Stack gap="sm">
          <Text size="meta" tone="secondary">Variables</Text>
          <h2>{selected ? <code>{`{{${selected.name}}}`}</code> : `${references.length} available in this row`}</h2>
        </Stack>
        <div className="admin-variables-rail-actions">
          <StudioIconButton type="button" className="admin-variables-rail-close" onClick={onClose} aria-label="Close variables" title="Close variables">
            <X size={16} aria-hidden="true" />
          </StudioIconButton>
        </div>
      </header>

      <div className="admin-variables-rail-body">
        <details className="admin-workspace-details">
          <AdminDisclosureSummary aria-label="Template syntax help">
            Template syntax help
          </AdminDisclosureSummary>
          <div role="region" aria-label="Template syntax guide">
            <Stack as="dl" gap="md">
              <Stack gap="sm">
                <dt><code>{"{{planetTitle}}"}</code></dt>
                <dd><Text as="span">Inserts one value, such as <em>Jupiter</em>.</Text></dd>
              </Stack>
              <Stack gap="sm">
                <dt><code>{"{{#planetIntro}}…{{/planetIntro}}"}</code></dt>
                <dd><Text as="span">Includes the block only when that optional copy is available.</Text></dd>
              </Stack>
              <Stack gap="sm">
                <dt><code>{"{{.}}"}</code></dt>
                <dd><Text as="span">Inserts the current sentence while the app moves through a list.</Text></dd>
              </Stack>
            </Stack>
          </div>
        </details>
        {sourceState === "loading" && <PageLoading compact message="Loading template sources…" />}
        {sourceState === "error" && <div role="alert">Template sources could not load. <StudioButton type="button" onClick={() => setRetry(value => value + 1)}>Retry source loading</StudioButton></div>}
        {selected ? (
          <TemplateVariableReviewPanels
            references={references}
            factExamples={factExamples}
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
              <Suspense fallback={<PageLoading message="Building reader preview…" />}>
                <TemplateReaderDrilldown
                  key={`${templateContentKey}:${previewOptions?.initialAudience ?? "you"}`}
                  compact
                  rows={rows}
                  templateRow={templatePreviewRow}
                  previewOptions={previewOptions}
                  onOpenVariable={(name, sourceId) => {
                    onSelectVariable(name);
                    onSelectSource(sourceId);
                  }}
                  onLoadSourceDocuments={onLoadSourceDocuments}
                />
              </Suspense>
            )}

            <label className="admin-variables-rail-search">
              <span>Find a variable</span>
              <div className="admin-search-input-shell">
                <Search size={15} aria-hidden="true" />
                <StudioInput
                  type="search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Name, meaning, or source"
                  autoFocus
                />
              </div>
            </label>

            <label><input type="checkbox" checked={usedOnly} onChange={event => setUsedOnly(event.target.checked)} /> Only variables used in this row</label>
            <p className="admin-field-hint">These variables are supported here. Variables for other surfaces are listed in the Variables directory.</p>
            <ul className="admin-variables-rail-list" aria-label="Variables available in this row">
              {visibleReferences.map((reference) => {
                const kind = variableKind(reference, templateContentKey);
                const preview = variableListPreview(reference, kind, rows, templateContentKey, factExamples);
                return (
                  <li key={reference.name}>
                    <StudioButton
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
                      {preview ? <span className="admin-variables-rail-preview">{preview}</span> : null}
                    </StudioButton>
                    {onInsert && <StudioButton type="button" aria-label={`Insert {{${reference.name}}}`} onClick={() => onInsert(`{{${reference.name}}}`)}>Insert</StudioButton>}
                  </li>
                );
              })}
            </ul>
            {visibleReferences.length === 0 && (
              <div className="admin-empty-state">
                <strong>No matching variables</strong>
                <p>Try a name such as <code>planetTitle</code>, or a meaning such as “sign”.</p>
              </div>
            )}
            <p className="admin-field-hint admin-variables-rail-count" aria-live="polite">
              {visibleReferences.length === references.length
                ? `${references.length} variable${references.length === 1 ? "" : "s"}`
                : `${visibleReferences.length} of ${references.length} variables`}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
