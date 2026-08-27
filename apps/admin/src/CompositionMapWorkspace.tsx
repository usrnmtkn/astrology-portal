import { useMemo, useState, type ReactNode } from "react";
import {
  buildCompositionMap,
  type CompositionMapRow,
  type CompositionMapSource,
  type CompositionPreviewSegment,
  type CompositionPreviewVariableKind
} from "./compositionMap";

type Props = {
  editor: ReactNode;
  onEditRow: (row: CompositionMapRow) => void;
  rows: CompositionMapRow[];
};

type CompositionView = "preview" | "template" | "assembly";

function matchesSearch(values: string[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/u).filter(Boolean);
  return terms.every((term) => values.join(" ").toLowerCase().includes(term));
}

function templateParts(template: string) {
  return template.split(/(\{\{\s*[#^/]?\s*[\w.-]+\s*\}\})/gu).filter(Boolean);
}

export default function CompositionMapWorkspace({ editor, onEditRow, rows }: Props) {
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [view, setView] = useState<CompositionView>("preview");
  const [previewAudience, setPreviewAudience] = useState<"you" | "they">("you");
  const map = useMemo(() => buildCompositionMap(rows), [rows]);
  const destinations = useMemo(
    () => [...new Set(map.map((template) => template.destination))].sort((left, right) => left.localeCompare(right)),
    [map]
  );
  const filtered = useMemo(() => map.filter((template) => (
    (destinationFilter === "all" || template.destination === destinationFilter)
    && (!issuesOnly || template.issues.length > 0)
    && matchesSearch([
      template.label,
      template.description,
      template.destination,
      template.row.content_key,
      ...template.slots.flatMap((slot) => [slot.name, slot.label, slot.meaning, slot.source, ...slot.sources.flatMap((source) => [source.label, source.row.content_key])])
    ], query)
  )), [map, destinationFilter, issuesOnly, query]);
  const selected = filtered.find((template) => template.row.content_key === selectedKey) ?? filtered[0];
  const selectedEditableSources = selected?.slots.reduce((total, slot) => total + slot.sources.length, 0) ?? 0;
  const selectedRuntimeSlots = selected?.slots.filter((slot) => slot.sourceKind === "runtime").length ?? 0;
  const selectedHasAudienceVariants = Boolean(selected?.preview.fields.some((field) => field.audience === "you")
    && selected?.preview.fields.some((field) => field.audience === "they"));
  const visiblePreviewFields = selected?.preview.fields.filter((field) => (
    !field.audience || field.audience === previewAudience
  )) ?? [];
  const hasFilters = destinationFilter !== "all" || issuesOnly || Boolean(query.trim());

  function clearFilters() {
    setDestinationFilter("all");
    setIssuesOnly(false);
    setQuery("");
  }

  function selectTemplate(contentKey: string) {
    setSelectedKey(contentKey);
    setView("preview");
    setPreviewAudience("you");
  }

  function sourceForVariable(name: string) {
    return selected?.preview.fields.flatMap((field) => field.paragraphs.flat())
      .find((segment) => segment.name === name && segment.source)?.source;
  }

  function openVariable(name: string, source?: CompositionMapSource) {
    if (source) {
      onEditRow(source.row);
      return;
    }
    setView("assembly");
    setTimeout(() => {
      const target = document.getElementById(`composition-slot-${name}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    });
  }

  function variableButton(segment: CompositionPreviewSegment, key: string) {
    if (!segment.name || !segment.kind) return segment.text;
    const slot = selected?.slots.find((candidate) => candidate.name === segment.name);
    const action = segment.source ? `Edit ${slot?.label ?? segment.name}` : `Inspect ${slot?.label ?? segment.name}`;
    return (
      <button
        type="button"
        key={key}
        className={`admin-composition-variable variable-${segment.kind}`}
        data-variable-action={`${action} →`}
        aria-label={`${segment.text}. ${action}`}
        onClick={() => openVariable(segment.name!, segment.source)}
      >
        {segment.text}
      </button>
    );
  }

  return (
    <section className="admin-template-page admin-composition-map-page">
      <div className="admin-composition-map-layout">
        <aside className="admin-composition-template-list" aria-label="Composition templates">
          <header>
            <div><p className="admin-eyebrow">Choose a template</p><strong>{filtered.length} of {map.length}</strong></div>
            <small>Choose one to read its surface.</small>
            <div className="admin-composition-template-tools">
              <span className="admin-composition-search-shell">
                <input aria-label="Search the composition map" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a template or source" />
                {query && <button type="button" aria-label="Clear composition search" onClick={() => setQuery("")}>×</button>}
              </span>
              <div className="admin-composition-template-filters">
                <select aria-label="Reader destination" value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
                  <option value="all">All destinations</option>
                  {destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}
                </select>
                <button
                  type="button"
                  className={`admin-composition-issues-filter ${issuesOnly ? "active" : ""}`}
                  aria-label="Show only templates that need IA review"
                  aria-pressed={issuesOnly}
                  onClick={() => setIssuesOnly((current) => !current)}
                >
                  Review
                </button>
              </div>
            </div>
            <label className="admin-composition-template-mobile-picker">
              <span>Selected template</span>
              <select value={selected?.row.content_key ?? ""} onChange={(event) => selectTemplate(event.target.value)}>
                {filtered.map((template) => <option key={template.row.content_key} value={template.row.content_key}>{template.label}</option>)}
              </select>
            </label>
          </header>
          <div className="admin-composition-template-items">
            {filtered.map((template) => (
              <button
                type="button"
                key={template.row.content_key}
                className={selected?.row.content_key === template.row.content_key ? "active" : ""}
                aria-pressed={selected?.row.content_key === template.row.content_key}
                onClick={() => selectTemplate(template.row.content_key)}
              >
                <span>{template.destination}</span>
                <strong>{template.label.replace(`${template.destination} · `, "")}</strong>
                <small>{template.slots.length} slot{template.slots.length === 1 ? "" : "s"} · {template.issues.length ? `${template.issues.length} IA flag${template.issues.length === 1 ? "" : "s"}` : "no IA flags"}</small>
              </button>
            ))}
            {!filtered.length && (
              <div className="admin-composition-empty">
                <strong>No templates match</strong>
                <p>Try a broader destination or clear the current review filters.</p>
                {hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}
              </div>
            )}
          </div>
        </aside>

        <section className="admin-composition-detail" aria-label="Selected template composition">
          {selected ? (
            <>
              <header className="admin-composition-detail-header">
                <div>
                  <p className="admin-eyebrow">{selected.destination}</p>
                  <h2>{selected.label.replace(`${selected.destination} · `, "")}</h2>
                  <p>{selected.description}</p>
                </div>
                <button type="button" className="admin-primary-button" onClick={() => onEditRow(selected.row)}>
                  Edit main template
                </button>
              </header>

              <div className="admin-composition-view-tabs" role="tablist" aria-label="Composition views">
                <button type="button" role="tab" aria-selected={view === "preview"} className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>
                  Reader preview
                </button>
                <button type="button" role="tab" aria-selected={view === "template"} className={view === "template" ? "active" : ""} onClick={() => setView("template")}>
                  Main template
                </button>
                <button type="button" role="tab" aria-selected={view === "assembly"} className={view === "assembly" ? "active" : ""} onClick={() => setView("assembly")}>
                  Assembly
                </button>
              </div>

              {selected.issues.length > 0 && (
                <section className="admin-composition-issues" aria-label="Naming and information architecture issues">
                  <div><strong>Naming &amp; IA review</strong></div>
                  <ul>{selected.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                </section>
              )}

              {view === "preview" && (
                <section className="admin-composition-reader-preview" aria-label="Reader surface preview">
                  <header>
                    <div>
                      <p className="admin-eyebrow">Representative surface preview</p>
                      <h3>Example reader rendering</h3>
                      <p>A coherent sample is assembled from one audience, matching saved sources, and example chart facts. It is not a live chart reading.</p>
                    </div>
                    <span className="ui-pill admin-status status-reviewed">Example data</span>
                  </header>

                  <div className="admin-composition-variable-legend" aria-label="Variable color key">
                    <span className="variable-fact">Calculated fact</span>
                    <span className="variable-phrase">Reusable phrase</span>
                    <span className="variable-hook">Authored hook</span>
                    <span className="variable-copy">Saved copy</span>
                  </div>

                  <div className="admin-composition-preview-surface">
                    <div className="admin-composition-preview-chrome">
                      <span>{selected.destination}</span>
                      {selectedHasAudienceVariants ? (
                        <div className="admin-composition-preview-audience" role="group" aria-label="Preview audience">
                          <button type="button" aria-pressed={previewAudience === "you"} className={previewAudience === "you" ? "active" : ""} onClick={() => setPreviewAudience("you")}>You</button>
                          <button type="button" aria-pressed={previewAudience === "they"} className={previewAudience === "they" ? "active" : ""} onClick={() => setPreviewAudience("they")}>They</button>
                        </div>
                      ) : <span>Reader surface</span>}
                    </div>
                    <div className="admin-composition-preview-copy">
                      {visiblePreviewFields.map((field) => (
                        <section className={`admin-composition-preview-field field-${field.key}`} key={field.key}>
                          <span>{field.label}</span>
                          {field.paragraphs.map((paragraph, paragraphIndex) => {
                            const copy = paragraph.map((segment, segmentIndex) => variableButton(segment, `${field.key}-${paragraphIndex}-${segmentIndex}`));
                            return field.key.startsWith("headline")
                              ? <h3 key={`${field.key}-${paragraphIndex}`}>{copy}</h3>
                              : <p key={`${field.key}-${paragraphIndex}`}>{copy}</p>;
                          })}
                        </section>
                      ))}
                      {!selected.preview.fields.length && (
                        <div className="admin-composition-empty">
                          <strong>No reader preview is available</strong>
                          <p>The template does not contain a headline or passage field yet.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="admin-composition-preview-context">
                    <section aria-label="Saved copy used in preview">
                      <header><div><p className="admin-eyebrow">Exact sources in this preview</p><h3>Open the wording behind the preview</h3></div><strong>{selected.preview.sources.length}</strong></header>
                      <div className="admin-composition-preview-sources">
                        {selected.preview.sources.map((source) => (
                          <button type="button" key={source.row.id} onClick={() => onEditRow(source.row)}>
                            <span><small>{source.kind === "phrase" ? "Phrase" : "Hook"}</small><strong>{source.label}</strong></span>
                            <span>Edit source</span>
                          </button>
                        ))}
                        {!selected.preview.sources.length && <p className="admin-field-hint">This template chooses among multiple saved sources at runtime. Open Assembly to inspect and edit the available source families.</p>}
                      </div>
                    </section>

                    <section aria-label="Example calculated facts">
                      <header><div><p className="admin-eyebrow">Example facts</p><h3>Values supplied by the app</h3></div><strong>{selected.preview.facts.length}</strong></header>
                      <dl>
                        {selected.preview.facts.map((fact) => <div key={fact.name}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
                      </dl>
                      {!selected.preview.facts.length && <p className="admin-field-hint">No calculated facts are required by this template.</p>}
                    </section>
                  </div>
                </section>
              )}

              {view === "template" && (
                <section className="admin-composition-template-workbench" aria-label="Main template">
                  <header>
                    <div><p className="admin-eyebrow">Main template</p><h3>Structure and fixed wording</h3><p>This is the template the resolver fills. Tokens in braces are supplied by saved sources or calculated facts.</p><code>{selected.row.content_key}</code></div>
                    <button type="button" onClick={() => onEditRow(selected.row)}>Edit template</button>
                  </header>
                  <div className="admin-composition-template-fields">
                    {selected.preview.fields.map((field) => (
                      <article key={field.key}>
                        <span>{field.label}</span>
                        <pre>{templateParts(field.template).map((part, index) => {
                          if (!part.startsWith("{{")) return part;
                          const name = part.replace(/[{}#^/\s]/gu, "");
                          const slot = selected.slots.find((candidate) => candidate.name === name);
                          if (!slot) return part;
                          const source = sourceForVariable(name);
                          const kind: CompositionPreviewVariableKind = source?.kind ?? (slot.sourceKind === "runtime" ? "fact" : "copy");
                          const action = source ? `Edit ${slot.label}` : `Inspect ${slot.label}`;
                          return <button type="button" key={`${name}-${index}`} className={`admin-composition-variable-token variable-${kind}`} data-variable-action={`${action} →`} aria-label={`${part}. ${action}`} onClick={() => openVariable(name, source)}>{part}</button>;
                        })}</pre>
                      </article>
                    ))}
                  </div>
                  <section className="admin-composition-template-tokens" aria-label="Template tokens">
                    <p className="admin-eyebrow">Tokens used</p>
                    <div>{selected.slots.map((slot) => <button type="button" key={slot.name} onClick={() => setView("assembly")}>{`{{${slot.name}}}`}<small>{slot.sourceKind === "runtime" ? "Calculated" : slot.sourceKind === "unmapped" ? "Not wired" : "Saved copy"}</small></button>)}</div>
                  </section>
                </section>
              )}

              {view === "assembly" && <section className="admin-composition-slot-tree" aria-label="Template slots">
                <header>
                  <p className="admin-eyebrow">Template slots</p>
                  <p>{selected.slots.length ? "Each slot resolves to editable saved copy or a value calculated by the app." : "This template currently contains no detectable slots."}</p>
                  <div className="admin-composition-detail-meta" aria-label="Selected template coverage">
                    <span><strong>{selected.slots.length}</strong> slots</span>
                    <span><strong>{selectedEditableSources}</strong> editable source{selectedEditableSources === 1 ? "" : "s"}</span>
                    <span><strong>{selectedRuntimeSlots}</strong> calculated</span>
                  </div>
                </header>
                {selected.slots.map((slot) => (
                  <article id={`composition-slot-${slot.name}`} tabIndex={-1} className={`admin-composition-slot ${slot.issue ? "has-issue" : ""}`} key={slot.name}>
                    <header>
                      <div><span className="admin-composition-connector" aria-hidden="true" /><div><strong>{slot.label}</strong><code>{`{{${slot.name}}}`}</code></div></div>
                      <div className="admin-composition-slot-badges">
                        <span className="ui-pill admin-status">{slot.requirement === "Runtime" ? (slot.sourceKind === "runtime" ? "Dynamic" : "In template") : slot.requirement}</span>
                        <span className={`ui-pill admin-status ${slot.sourceKind === "runtime" ? "status-reviewed" : "status-draft"}`}>
                          {slot.sourceKind === "runtime" ? "Calculated" : slot.sourceKind === "unmapped" ? "Not wired" : "Editable source"}
                        </span>
                      </div>
                    </header>
                    <p>{slot.meaning}</p>
                    <small>{slot.depth > 0 ? `Nested inside ${slot.parents.map((name) => `{{${name}}}`).join(", ")}` : `Used in ${slot.fields.join(", ")}`} · Example: {slot.example}</small>

                    {slot.sourceKind === "unmapped" && !slot.sources.length ? (
                      <div className="admin-composition-missing-source" role="note">
                        <span><strong>Not wired to the reader</strong><small>{slot.source}</small></span>
                        <button type="button" onClick={() => onEditRow(selected.row)}>Review template declaration</button>
                      </div>
                    ) : slot.sourceKind === "runtime" ? (
                      <div className="admin-composition-runtime-source">
                        <span><strong>Provided by the app</strong><small>Read-only · {slot.source}</small></span>
                      </div>
                    ) : slot.sources.length > 0 ? (
                      <div className="admin-composition-sources" aria-label={`Saved sources for ${slot.label}`}>
                        {slot.sources.map((source) => (
                          <button type="button" key={source.row.id} onClick={() => onEditRow(source.row)}>
                            <span><small>{source.kind === "phrase" ? "Phrase" : "Hook"}</small><strong>{source.label}</strong><code>{source.row.content_key}</code></span>
                            <span>Open editor</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="admin-composition-missing-source" role="note">
                        <span><strong>Saved source not mapped</strong><small>{slot.source}</small></span>
                        <button type="button" onClick={() => onEditRow(selected.row)}>Edit slot in template</button>
                      </div>
                    )}
                  </article>
                ))}
              </section>}
            </>
          ) : <div className="admin-empty">Choose a template to inspect its composition.</div>}
        </section>
      </div>
      {editor}
    </section>
  );
}
