import { useMemo } from "react";
import type { TemplateVariableReference } from "./templateVariableReference";
import { templateVariableSourceCandidates, templateVariableSourceKeyPrefixes, templateVariableSourceSelectionNote } from "./templateVariableSources";
import { buildCompositionTemplate, compositionTemplateKey, type CompositionMapRow } from "./compositionMap";

export type TemplateVariableSourceRow = {
  id: string;
  content_key: string;
  surface: string;
  status: string;
  headline: string | null;
  summary: string | null;
  body: string | null;
  block_type?: string | null;
  sections: unknown;
  source_snapshot?: unknown;
};

type Props = {
  references: TemplateVariableReference[];
  rows: TemplateVariableSourceRow[];
  templateContentKey: string;
  templateRow: CompositionMapRow;
  selectedVariableName: string;
  selectedSourceId: string | null;
  onBackToVariables: () => void;
  onSelectSource: (id: string | null) => void;
  onSelectVariable: (name: string) => void;
  onEditSource: (row: TemplateVariableSourceRow) => void;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readableCopy(row: TemplateVariableSourceRow) {
  const sections = record(row.sections);
  const savedPackage = record(sections.packageDraft ?? sections.packageRecord ?? sections);
  const values = [
    ["Headline", row.headline ?? ""],
    ["Summary", row.summary ?? ""],
    ["Body", row.body ?? ""],
    ["You version", typeof savedPackage.body_you === "string" ? savedPackage.body_you : ""],
    ["They version", typeof savedPackage.body_they === "string" ? savedPackage.body_they : ""]
  ];
  return values.filter(([_, value], index) => value.trim() && values.findIndex((candidate) => candidate[1] === value) === index);
}

function title(row: TemplateVariableSourceRow) {
  return row.headline?.trim() || row.content_key.split("/").at(-1)?.replace(/[-_]/gu, " ") || row.content_key;
}

function status(row: TemplateVariableSourceRow) {
  return row.status === "LIVE" ? "Published" : row.status === "REVIEWED" ? "Reviewed" : "Draft";
}

function variableKind(reference: TemplateVariableReference) {
  return reference.sourceKind === "runtime" ? "fact" : "copy";
}

function sourceCopyParts(value: string, references: TemplateVariableReference[], onSelectVariable: (name: string) => void) {
  return value.split(/(\{\{\s*[#^/]?\s*[\w.-]+\s*\}\})/gu).filter(Boolean).map((part, index) => {
    const token = part.match(/^\{\{\s*([#^/]?)\s*([\w.-]+)\s*\}\}$/u);
    if (!token || token[2] === "." || token[1] === "/") return part;
    const reference = references.find((candidate) => candidate.name === token[2]);
    if (!reference) return <code key={`${part}-${index}`}>{part}</code>;
    return (
      <button
        type="button"
        className={`admin-variable-source-token variable-${variableKind(reference)}`}
        key={`${part}-${index}`}
        onClick={() => onSelectVariable(reference.name)}
        title={`Inspect ${reference.label}`}
      >
        {part}
      </button>
    );
  });
}

export function TemplateVariableReviewPanels({
  references, rows, templateContentKey, templateRow, selectedVariableName, selectedSourceId,
  onBackToVariables, onSelectSource, onSelectVariable, onEditSource
}: Props) {
  const templateKey = compositionTemplateKey(templateRow);
  const atomicReferences = useMemo(
    () => buildCompositionTemplate(templateRow, rows).slots,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, templateKey]
  );
  const reviewReferences = atomicReferences.length ? atomicReferences : references;
  const variable = reviewReferences.find((candidate) => candidate.name === selectedVariableName);
  if (!variable) return null;
  const sources = templateVariableSourceCandidates(variable, rows, templateContentKey);
  const sourceSelectionNote = templateVariableSourceSelectionNote(variable);
  const hasEditableSources = variable.sourceKind === "saved-copy" || sources.length > 0;
  const source = selectedSourceId ? sources.find((row) => row.id === selectedSourceId) ?? null : null;
  const copy = source ? readableCopy(source) : [];
  const directDependencies = reviewReferences.filter((candidate) => {
    const parents = "parents" in candidate && Array.isArray(candidate.parents) ? candidate.parents : [];
    return parents.includes(variable.name);
  });
  const body = (
    <>
      {source ? (
        <>
          <p><strong>{status(source)}</strong> · fills <code>{`{{${variable.name}}}`}</code></p>
          <section className="admin-variable-source-copy" aria-label="Saved source copy">
            {copy.map(([label, value]) => (
              <article className="admin-hook-detail-section" key={label}>
                <p className="admin-eyebrow">{label}</p>
                <div className="admin-variable-source-prose">{sourceCopyParts(value, reviewReferences, onSelectVariable)}</div>
              </article>
            ))}
          </section>
          {directDependencies.length > 0 && (
            <section className="admin-variable-atomic-list" aria-label={`Variables inside ${variable.label}`}>
              <div>
                <p className="admin-eyebrow">Continue to the atomic level</p>
                <h3>Variables inside this saved writing</h3>
                <p>Open a nested value to see whether it is calculated or backed by another editable source.</p>
              </div>
              {directDependencies.map((dependency) => (
                <button type="button" key={dependency.name} onClick={() => onSelectVariable(dependency.name)}>
                  <span><code>{`{{${dependency.name}}}`}</code><strong>{dependency.label}</strong></span>
                  <span>{dependency.sourceKind === "runtime" ? dependency.example : "Open source →"}</span>
                </button>
              ))}
            </section>
          )}
        </>
      ) : (
        <>
          <section className="admin-hook-detail-section admin-variable-source-summary">
            <p>{variable.meaning}</p>
            <p><strong>{hasEditableSources ? "Editable saved writing" : variable.sourceKind === "unmapped" ? "Wiring gap" : "Calculated by app"}</strong> · {variable.source}</p>
          </section>
          {variable.sourceKind === "unmapped" && !sources.length ? (
            <div className="admin-empty-state admin-variable-runtime-note"><strong>Not connected to a source row</strong><p>This slot is declared by the template, but the current catalog and resolver do not provide editable writing for it.</p></div>
          ) : !hasEditableSources ? (
            <div className="admin-empty-state admin-variable-runtime-note"><strong>No saved passage to review</strong><p>The app calculates this value from live chart, date, or person data.</p></div>
          ) : (
            <section className="admin-variable-source-list" aria-label={`Source rows for ${variable.label}`}>
              {sourceSelectionNote && <p>{sourceSelectionNote}</p>}
              <p>{sources.length === 1 ? "1 source row" : `${sources.length} source rows`} can fill this variable.</p>
              {sources.map((row) => <button type="button" className="admin-variable-source-row" key={row.id} onClick={() => onSelectSource(row.id)}><span><strong>{title(row)}</strong><code>{row.content_key}</code></span><span className="ui-pill admin-status">{status(row)}</span></button>)}
              {sources.length === 0 && <p>No matching rows. Expected <code>{templateVariableSourceKeyPrefixes(variable, templateContentKey).join(" or ")}</code></p>}
            </section>
          )}
        </>
      )}
    </>
  );

  return (
    <section className="admin-variables-rail-detail" role="region" aria-label={`${variable.label} variable details`}>
      <nav className="admin-variables-rail-breadcrumb" aria-label="Variable path">
        <button type="button" onClick={onBackToVariables}>All variables</button>
        <span aria-hidden="true">›</span>
        {source ? (
          <>
            <button type="button" onClick={() => onSelectSource(null)}>Sources</button>
            <span aria-hidden="true">›</span>
            <strong>{title(source)}</strong>
          </>
        ) : (
          <strong>{variable.label}</strong>
        )}
      </nav>
      {source && (
        <div className="admin-variables-rail-source-head">
          <code>{source.content_key}</code>
          <button type="button" className="admin-secondary-button" onClick={() => onEditSource(source)}>Edit source</button>
        </div>
      )}
      <div className="admin-variables-rail-detail-body">{body}</div>
    </section>
  );
}
