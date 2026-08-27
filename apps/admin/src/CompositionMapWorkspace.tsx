import { BookOpenText, Code2, Database, Eye, FileText, Flag, Network, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { buildCompositionMap, type CompositionMapRow } from "./compositionMap";

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
  const selectedHasAudienceVariants = Boolean(selected?.preview.fields.some((field) => field.key === "body_you")
    && selected?.preview.fields.some((field) => field.key === "body_they"));
  const visiblePreviewFields = selected?.preview.fields.filter((field) => (
    !selectedHasAudienceVariants
    || !["body_you", "body_they"].includes(field.key)
    || field.key === `body_${previewAudience}`
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

  return (
    <section className="admin-template-page admin-composition-map-page">
      <div className="admin-composition-map-layout">
        <aside className="admin-composition-template-list" aria-label="Composition templates">
          <header>
            <div><p className="admin-eyebrow">Choose a template</p><strong>{filtered.length} of {map.length}</strong></div>
            <small>Choose one to read its representative surface.</small>
            <div className="admin-composition-template-tools">
              <span className="admin-composition-search-shell">
                <Search size={15} aria-hidden="true" />
                <input aria-label="Search the composition map" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a template or source" />
                {query && <button type="button" aria-label="Clear composition search" onClick={() => setQuery("")}><X size={14} aria-hidden="true" /></button>}
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
                  title="Show only templates that need IA review"
                  onClick={() => setIssuesOnly((current) => !current)}
                >
                  <Flag size={16} aria-hidden="true" /> Review
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
                  <Sparkles size={16} aria-hidden="true" /> Edit main template
                </button>
              </header>

              <div className="admin-composition-view-tabs" role="tablist" aria-label="Composition views">
                <button type="button" role="tab" aria-selected={view === "preview"} className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>
                  <Eye size={16} aria-hidden="true" /> Reader preview
                </button>
                <button type="button" role="tab" aria-selected={view === "template"} className={view === "template" ? "active" : ""} onClick={() => setView("template")}>
                  <Code2 size={16} aria-hidden="true" /> Main template
                </button>
                <button type="button" role="tab" aria-selected={view === "assembly"} className={view === "assembly" ? "active" : ""} onClick={() => setView("assembly")}>
                  <Network size={16} aria-hidden="true" /> Assembly
                </button>
              </div>

              {selected.issues.length > 0 && (
                <section className="admin-composition-issues" aria-label="Naming and information architecture issues">
                  <div><Flag size={17} aria-hidden="true" /><strong>Naming &amp; IA review</strong></div>
                  <ul>{selected.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                </section>
              )}

              {view === "preview" && (
                <section className="admin-composition-reader-preview" aria-label="Reader surface preview">
                  <header>
                    <div>
                      <p className="admin-eyebrow">Representative surface preview</p>
                      <h3>What the reader sees</h3>
                      <p>Sample chart facts and documented slot examples are used below. When a slot has one canonical source, its exact saved wording is shown. This is a writing preview, not a live chart reading.</p>
                    </div>
                    <span className="ui-pill admin-status status-reviewed">Example data</span>
                  </header>

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
                          {field.rendered.split(/\n{2,}/u).map((paragraph, index) => (
                            field.key === "headline"
                              ? <h3 key={`${field.key}-${index}`}>{paragraph}</h3>
                              : <p key={`${field.key}-${index}`}>{paragraph}</p>
                          ))}
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
                            {source.kind === "phrase" ? <BookOpenText size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
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
                    <button type="button" onClick={() => onEditRow(selected.row)}><Sparkles size={16} aria-hidden="true" /> Edit template</button>
                  </header>
                  <div className="admin-composition-template-fields">
                    {selected.preview.fields.map((field) => (
                      <article key={field.key}>
                        <span>{field.label}</span>
                        <pre>{field.template}</pre>
                      </article>
                    ))}
                  </div>
                  <section className="admin-composition-template-tokens" aria-label="Template tokens">
                    <p className="admin-eyebrow">Tokens used</p>
                    <div>{selected.slots.map((slot) => <button type="button" key={slot.name} onClick={() => setView("assembly")}>{`{{${slot.name}}}`}<small>{slot.sourceKind === "runtime" ? "Calculated" : "Saved copy"}</small></button>)}</div>
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
                  <article className={`admin-composition-slot ${slot.issue ? "has-issue" : ""}`} key={slot.name}>
                    <header>
                      <div><span className="admin-composition-connector" aria-hidden="true" /><div><strong>{slot.label}</strong><code>{`{{${slot.name}}}`}</code></div></div>
                      <div className="admin-composition-slot-badges">
                        <span className="ui-pill admin-status">{slot.requirement === "Runtime" ? (slot.sourceKind === "runtime" ? "Dynamic" : "In template") : slot.requirement}</span>
                        <span className={`ui-pill admin-status ${slot.sourceKind === "runtime" ? "status-reviewed" : "status-draft"}`}>
                          {slot.sourceKind === "runtime" ? "Calculated" : "Editable source"}
                        </span>
                      </div>
                    </header>
                    <p>{slot.meaning}</p>
                    <small>Used in {slot.fields.join(", ")} · Example: {slot.example}</small>

                    {slot.sourceKind === "runtime" ? (
                      <div className="admin-composition-runtime-source">
                        <Database size={16} aria-hidden="true" />
                        <span><strong>Provided by the app</strong><small>Read-only · {slot.source}</small></span>
                      </div>
                    ) : slot.sources.length > 0 ? (
                      <div className="admin-composition-sources" aria-label={`Saved sources for ${slot.label}`}>
                        {slot.sources.map((source) => (
                          <button type="button" key={source.row.id} onClick={() => onEditRow(source.row)}>
                            {source.kind === "phrase" ? <BookOpenText size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                            <span><small>{source.kind === "phrase" ? "Phrase" : "Hook"}</small><strong>{source.label}</strong><code>{source.row.content_key}</code></span>
                            <span>Open editor</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="admin-composition-missing-source" role="note">
                        <Flag size={16} aria-hidden="true" />
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
