import { BookOpenText, ChevronRight, Database, FileText, Flag, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { buildCompositionMap, type CompositionMapRow } from "./compositionMap";

type Props = {
  editor: ReactNode;
  onEditRow: (row: CompositionMapRow) => void;
  rows: CompositionMapRow[];
};

function matchesSearch(values: string[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/u).filter(Boolean);
  return terms.every((term) => values.join(" ").toLowerCase().includes(term));
}

export default function CompositionMapWorkspace({ editor, onEditRow, rows }: Props) {
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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
  const hasFilters = destinationFilter !== "all" || issuesOnly || Boolean(query.trim());

  function clearFilters() {
    setDestinationFilter("all");
    setIssuesOnly(false);
    setQuery("");
  }

  return (
    <section className="admin-template-page admin-composition-map-page">
      <section className="admin-content-toolbar admin-composition-map-hero" aria-label="Composition map overview">
        <div className="admin-composition-map-intro">
          <p className="admin-eyebrow">Reader copy assembly</p>
          <h2>From destination to editable source</h2>
          <p>Start with what the reader sees, inspect the template, then open the canonical source that supplies each piece of copy.</p>
          <ol className="admin-composition-flow" aria-label="Composition review order">
            <li><span>1</span><strong>Destination</strong></li>
            <ChevronRight size={15} aria-hidden="true" />
            <li><span>2</span><strong>Template</strong></li>
            <ChevronRight size={15} aria-hidden="true" />
            <li><span>3</span><strong>Source</strong></li>
          </ol>
        </div>
        <div className="admin-composition-map-summary" aria-label="Composition map totals">
          <span><strong>{map.length}</strong> templates</span>
          <span><strong>{map.reduce((total, template) => total + template.slots.length, 0)}</strong> slots</span>
          <span><strong>{map.filter((template) => template.issues.length > 0).length}</strong> review flags</span>
        </div>
      </section>

      <section className="admin-composition-map-controls" aria-label="Composition map filters">
        <label>
          <span>Reader destination</span>
          <select aria-label="Reader destination" value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
            <option value="all">All destinations</option>
            {destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}
          </select>
        </label>
        <label className="admin-composition-search-control">
          <span>Search the map</span>
          <span className="admin-composition-search-shell">
            <Search size={15} aria-hidden="true" />
            <input aria-label="Search the composition map" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Template, slot, source, or key" />
            {query && <button type="button" aria-label="Clear composition search" onClick={() => setQuery("")}><X size={14} aria-hidden="true" /></button>}
          </span>
        </label>
        <button type="button" className={`admin-composition-issues-filter ${issuesOnly ? "active" : ""}`} aria-pressed={issuesOnly} onClick={() => setIssuesOnly((current) => !current)}>
          <Flag size={16} aria-hidden="true" />
          Needs IA review
        </button>
      </section>

      <div className="admin-composition-map-layout">
        <aside className="admin-composition-template-list" aria-label="Composition templates">
          <header>
            <div><p className="admin-eyebrow">Templates</p><strong>{filtered.length} shown</strong></div>
            <small>Choose one to inspect its assembly.</small>
          </header>
          <div>
            {filtered.map((template) => (
              <button
                type="button"
                key={template.row.content_key}
                className={selected?.row.content_key === template.row.content_key ? "active" : ""}
                aria-pressed={selected?.row.content_key === template.row.content_key}
                onClick={() => setSelectedKey(template.row.content_key)}
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
                  <code>{selected.row.content_key}</code>
                  <div className="admin-composition-detail-meta" aria-label="Selected template coverage">
                    <span><strong>{selected.slots.length}</strong> slots</span>
                    <span><strong>{selectedEditableSources}</strong> editable source{selectedEditableSources === 1 ? "" : "s"}</span>
                    <span><strong>{selectedRuntimeSlots}</strong> calculated</span>
                  </div>
                </div>
                <button type="button" className="admin-primary-button" onClick={() => onEditRow(selected.row)}>
                  <Sparkles size={16} aria-hidden="true" /> Edit template copy
                </button>
              </header>

              {selected.issues.length > 0 && (
                <section className="admin-composition-issues" aria-label="Naming and information architecture issues">
                  <div><Flag size={17} aria-hidden="true" /><strong>Naming &amp; IA review</strong></div>
                  <ul>{selected.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                </section>
              )}

              <section className="admin-composition-slot-tree" aria-label="Template slots">
                <header>
                  <p className="admin-eyebrow">Template slots</p>
                  <p>{selected.slots.length ? "Each slot resolves to editable saved copy or a value calculated by the app." : "This template currently contains no detectable slots."}</p>
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
              </section>
            </>
          ) : <div className="admin-empty">Choose a template to inspect its composition.</div>}
        </section>
      </div>
      {editor}
    </section>
  );
}
