import { CompositionVariableKey, compositionVariableColors } from "./CompositionVariableKey";
import { StudioTabs, StudioButton, StudioInput } from "./StudioControls";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import CompositionSurfaceSources from "./CompositionSourceManager";
import type { SkyPlacementSelection } from "./skyPlacementAssembly";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildCompositionMap,
  buildCompositionTemplate,
  type CompositionMapRow,
  type CompositionMapSource,
  type CompositionPreviewSegment,
  type CompositionPreviewVariableKind
} from "./compositionMap";
import {
  writingLayerLabels,
  writingSurfaceAdminAccess,
  writingSurfaceSourceMap,
  writingSurfaceSourceRoleLabels,
  writingSurfaceStatusLabels,
  type WritingSurfaceCmsStarter,
  type WritingSurfaceMapItem
} from "./writingSurfaceSourceMap";

type Props = {
  editor: ReactNode;
  onEditRow: (row: CompositionMapRow, context?: CompositionEditorContext) => void;
  onEditField?: (row: CompositionMapRow, path: string, selection: SkyPlacementSelection) => void;
  onStartCmsRow?: (surface: WritingSurfaceMapItem, starter: WritingSurfaceCmsStarter) => void;
  rows: CompositionMapRow[];
  templateKeys?: string[];
  initialKey?: string;
  initialSurfaceId?: string;
  onLoadRow?: (row: CompositionMapRow) => Promise<unknown>;
};

export type CompositionEditorContext = {
  active: string;
  after: string;
  audience: "you" | "they";
  before: string;
  fieldLabel: string;
  sourceField: "body_you" | "body_they" | "headline";
  templateLabel: string;
};

type CompositionView = "preview" | "template" | "assembly";
type CompositionScope = "surfaces" | "templates";

function matchesSearch(values: string[], query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/u).filter(Boolean);
  return terms.every((term) => values.join(" ").toLowerCase().includes(term));
}

function templateParts(template: string) {
  return template.split(/(\{\{\s*[#^/]?\s*[\w.-]+\s*\}\})/gu).filter(Boolean);
}

function sourceKindLabel(source: CompositionMapSource) {
  return source.kind === "phrase" ? "Phrase" : source.kind === "copy" ? "Saved copy" : "Hook";
}

function ReaderSurfaceWorkspace({
  onStartCmsRow, rows, templates, onEditRow, onEditField, onSelectTemplate, onLoadRow, initialSurfaceId
}: {
  initialSurfaceId?: string;
  rows: CompositionMapRow[];
  templates: ReturnType<typeof buildCompositionMap>;
  onEditRow: Props["onEditRow"];
  onEditField?: Props["onEditField"];
  onSelectTemplate: (key: string) => void;
  onLoadRow?: Props["onLoadRow"];
  onStartCmsRow?: (surface: WritingSurfaceMapItem, starter: WritingSurfaceCmsStarter) => void;
}) {
  const [area, setArea] = useState<WritingSurfaceMapItem["area"] | "All">("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSurfaceId ?? null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const areas = useMemo(
    () => ["All", ...new Set(writingSurfaceSourceMap.map((surface) => surface.area))] as Array<WritingSurfaceMapItem["area"] | "All">,
    []
  );
  const filtered = useMemo(() => writingSurfaceSourceMap.filter((surface) => {
    const access = writingSurfaceAdminAccess[surface.id];
    return (area === "All" || surface.area === area) && matchesSearch([
      surface.surface,
      surface.area,
      surface.currentRenderPath,
      surface.risk,
      surface.nextAction,
      ...(surface.runtimeSurfaceIds ?? []),
      ...surface.requiredSlots,
      ...surface.sources.flatMap((source) => [source.label, source.path, source.role]),
      access?.readerLocation ?? "",
      ...(access?.routes.flatMap((route) => [route.label, route.note]) ?? [])
    ], query);
  }), [area, query]);
  const selected = filtered.find((surface) => surface.id === selectedId) ?? filtered[0];
  const access = selected ? writingSurfaceAdminAccess[selected.id] : undefined;
  const editorialStatus = access?.editability === "editable"
    ? "Editable in Content Studio"
    : access?.editability === "partial"
      ? "Inspection only"
      : "Editor not wired";

  return (
    <div className="admin-composition-map-layout admin-composition-surface-layout">
      <aside className="admin-composition-template-list" aria-label="App surfaces and systems">
        <header>
          <div><p className="admin-eyebrow">Choose a surface or system</p><strong>{filtered.length} of {writingSurfaceSourceMap.length}</strong></div>
          <div className="admin-composition-template-tools">
            <span className="admin-composition-search-shell">
              <StudioInput aria-label="Search surfaces and systems" value={query} onChange={(event) => { setQuery(event.target.value); setBrowseOpen(true); }} placeholder="Article, calendar, report…" />
              {query && <StudioButton type="button" aria-label="Clear surface search" onClick={() => setQuery("")}>×</StudioButton>}
            </span>
            <AdminSelect aria-label="Surface or system area" value={area} onChange={(event) => { setArea(event.target.value as WritingSurfaceMapItem["area"] | "All"); setBrowseOpen(true); }}>
              {areas.map((itemArea) => <option key={itemArea} value={itemArea}>{itemArea === "All" ? "All app areas" : itemArea}</option>)}
            </AdminSelect>
          </div>
          <label className="admin-composition-template-mobile-picker">
            <span>Selected surface</span>
            <AdminSelect value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>
              {filtered.map((surface) => <option key={surface.id} value={surface.id}>{surface.surface}</option>)}
            </AdminSelect>
          </label>
        </header>
        <details className="admin-workspace-details admin-composition-browse" open={browseOpen} onToggle={(event) => setBrowseOpen(event.currentTarget.open)}><AdminDisclosureSummary>Browse surfaces ({filtered.length})</AdminDisclosureSummary>
        <div className="admin-composition-template-items">
          {filtered.map((surface) => {
            const surfaceAccess = writingSurfaceAdminAccess[surface.id];
            return (
              <StudioButton
                type="button"
                key={surface.id}
                className={selected?.id === surface.id ? "active" : ""}
                aria-pressed={selected?.id === surface.id}
                onClick={() => setSelectedId(surface.id)}
              >
                <span>{surface.area}</span>
                <strong>{surface.surface}</strong>
                <small>{surface.requiredSlots.length} content part{surface.requiredSlots.length === 1 ? "" : "s"} · {surfaceAccess?.editability === "editable" ? "editable" : surfaceAccess?.editability === "partial" ? "inspection only" : "editor not wired"}</small>
              </StudioButton>
            );
          })}
          {!filtered.length && (
            <div className="admin-composition-empty">
              <strong>No surfaces match</strong>
              <p>Clear the search or choose another app area.</p>
              <StudioButton type="button" onClick={() => { setArea("All"); setQuery(""); }}>Clear filters</StudioButton>
            </div>
          )}
        </div>
        </details>
      </aside>

      <section className="admin-composition-detail" aria-label="Selected app surface or system">
        {selected && access ? (
          <>
            <header className="admin-composition-detail-header">
              <div>
                <h2 className="sr-only">{selected.surface}</h2>
              </div>
              <span className={`ui-pill admin-status ${access.editability === "editable" ? "status-live" : access.editability === "missing" ? "status-error" : "status-draft"}`}>{editorialStatus}</span>
            </header>

            <CompositionSurfaceSources onEditField={onEditField} key={selected.id} surfaceId={selected.id} rows={rows} templates={templates} onEditRow={onEditRow} onSelectTemplate={onSelectTemplate} onLoadRow={onLoadRow} />
            <section className="admin-composition-surface-actions" aria-label="Editing destinations">
              <header>
                <div><h3>Editing destinations</h3></div>
              </header>
              <div className="admin-composition-surface-route-list">
                {access.routes.map((route) => (
                  <a key={`${selected.id}-${route.hash}`} href={route.hash} className={route.purpose === "reader-copy" ? "primary" : ""}>
                    <span><strong>{route.label}</strong><small>{route.note}</small></span>
                    <span aria-hidden="true">→</span>
                  </a>
                ))}
                {access.routes.length === 0 && (
                  <div className="admin-composition-missing-source" role="note">
                    <span><strong>No atomic editor yet</strong><small>This surface is mapped so the gap is visible; its code-composed prose still needs governed source rows.</small></span>
                  </div>
                )}
              </div>
              {access.cmsStarters?.length ? (
                <div className="admin-composition-cms-starters">
                  <p className="admin-eyebrow">Create a governed surface override</p>
                  {access.cmsStarters.map((starter) => (
                    <article key={starter.contentKey}>
                      <div><strong>{starter.label}</strong><code>{starter.contentKey}</code><small>Calculated slots: {starter.allowedSlots.join(", ") || "none"}</small></div>
                      {onStartCmsRow && <StudioButton type="button" onClick={() => onStartCmsRow(selected, starter)}>Start draft</StudioButton>}
                    </article>
                  ))}
                </div>
              ) : null}
            </section>

            <details className="admin-workspace-details admin-composition-technical"><AdminDisclosureSummary>Technical details</AdminDisclosureSummary>
            <section className="admin-composition-surface-summary" aria-label="Writing surface contract">
              <div>
                <p className="admin-eyebrow">Surface content</p>
                <h3>Required content parts</h3>
                <div className="admin-composition-surface-parts">
                  {selected.requiredSlots.map((slot) => <span key={slot}>{slot}</span>)}
                </div>
              </div>
              <div>
                <p className="admin-eyebrow">How it is assembled</p>
                <h3>Visible precedence</h3>
                <ol className="admin-composition-layer-order">
                  {selected.visibleLayerOrder.map((layer) => <li key={layer}>{writingLayerLabels[layer]}</li>)}
                </ol>
              </div>
            </section>

            <section className="admin-composition-surface-flow" aria-label="Runtime rendering path">
              <p className="admin-eyebrow">Runtime rendering path</p>
              <h3>Where the displayed copy comes from</h3>
              <p>{selected.currentRenderPath}</p>
              <span className="ui-pill admin-status">{writingSurfaceStatusLabels[selected.status]}</span>
            </section>

            <section className="admin-composition-surface-provenance" aria-label="Surface provenance">
              <header><div><p className="admin-eyebrow">Provenance</p><h3>Code and content sources</h3></div><strong>{selected.sources.length}</strong></header>
              <div>
                {selected.sources.map((source) => (
                  <article key={`${selected.id}-${source.role}-${source.path}`}>
                    <span>{writingSurfaceSourceRoleLabels[source.role]}</span>
                    <strong>{source.label}</strong>
                    <code>{source.path}</code>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-composition-surface-limit" aria-label="Known limits">
              <div><p className="admin-eyebrow">Known limit</p><p>{selected.risk}</p></div>
              <div><p className="admin-eyebrow">Next QA action</p><p>{selected.nextAction}</p></div>
            </section>            </details>

          </>
        ) : <div className="admin-empty">Choose a reader surface to inspect its composition.</div>}
      </section>
    </div>
  );
}

export default function CompositionMapWorkspace({ editor, onEditRow, onEditField, onStartCmsRow, rows, templateKeys, initialKey, onLoadRow, initialSurfaceId }: Props) {
  const [scope, setScope] = useState<CompositionScope>(templateKeys ? "templates" : "surfaces");
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(initialKey ?? null);
  const [exampleValues, setExampleValues] = useState<Record<string, string>>({});
  const [view, setView] = useState<CompositionView>("preview");
  const [previewAudience, setPreviewAudience] = useState<"you" | "they">("you");
  const map = useMemo(() => templateKeys
    ? rows.filter(row => templateKeys.includes(row.content_key)).map(row => buildCompositionTemplate(row, rows))
    : buildCompositionMap(rows.filter((row) => !row.id.startsWith("package:") || row.sections)), [rows, templateKeys]);
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
  const selectedBase = filtered.find((template) => template.row.content_key === selectedKey) ?? filtered[0];
  const selected = useMemo(() => selectedBase && Object.keys(exampleValues).length
    ? buildCompositionTemplate(selectedBase.row, rows, { exampleValues, includeOptionalSources: true })
    : selectedBase, [selectedBase, rows, exampleValues]);
  const [loadError, setLoadError] = useState("");
  const [retryLoad, setRetryLoad] = useState(0);
  const pendingRows = scope === "templates" && selected ? [selected.row, ...selected.preview.sources.map(source => source.row)].filter(row => (row as CompositionMapRow & { inventory_only?: boolean }).inventory_only) : [];
  const pendingKey = pendingRows.map(row => row.id).join("|");
  useEffect(() => {
    setLoadError("");
    if (!onLoadRow || !pendingRows.length) return;
    let active = true;
    void Promise.all([...new Map(pendingRows.map(row => [row.id, row])).values()].map(onLoadRow)).catch(error => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load composition sources."); });
    return () => { active = false; };
  }, [pendingKey, retryLoad]);
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
    setExampleValues({});
    setView("preview");
    setPreviewAudience("you");
  }

  const variableColors = compositionVariableColors(selected?.slots ?? []);

  function sourceForVariable(name: string) {
    return selected?.preview.fields.flatMap((field) => field.paragraphs.flat())
      .find((segment) => segment.name === name && segment.source)?.source;
  }

  function openVariable(name: string, source?: CompositionMapSource, context?: CompositionEditorContext) {
    if (source) {
      onEditRow(source.row, context);
      return;
    }
    setView("assembly");
    setTimeout(() => {
      const target = document.getElementById(`composition-slot-${name}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    });
  }

  function variableButton(
    segment: CompositionPreviewSegment,
    key: string,
    fieldLabel: string,
    paragraph: CompositionPreviewSegment[],
    segmentIndex: number,
    audience: "you" | "they"
  ) {
    if (!segment.name || !segment.kind) return segment.text;
    const slot = selected?.slots.find((candidate) => candidate.name === segment.name);
    const action = segment.source ? `Edit ${slot?.label ?? segment.name}` : `Inspect ${slot?.label ?? segment.name}`;
    const context = segment.source && selected ? {
      active: segment.text,
      after: paragraph.slice(segmentIndex + 1).map((part) => part.text).join(""),
      audience,
      before: paragraph.slice(0, segmentIndex).map((part) => part.text).join(""),
      fieldLabel,
      sourceField: fieldLabel === "Headline" ? "headline" : audience === "they" ? "body_they" : "body_you",
      templateLabel: selected.label
    } satisfies CompositionEditorContext : undefined;
    return (
      <StudioButton
        type="button"
        key={key}
        className={`admin-composition-variable variable-${segment.kind}`}
        data-variable-name={segment.name}
        data-variable-color={variableColors.get(segment.name)}
        data-variable-action={`${action} →`}
        aria-label={`${segment.text}. ${action}`}
        title={action}
        onClick={() => openVariable(segment.name!, segment.source, context)}
      >
        {segment.text}
      </StudioButton>
    );
  }

  return (
    <section className="admin-template-page admin-composition-map-page">
      {loadError && <div role="alert"><p>{loadError}</p><StudioButton type="button" onClick={() => setRetryLoad(value => value + 1)}>Retry sources</StudioButton></div>}
      {pendingRows.length > 0 && !loadError && <p role="status">Loading full composition sources…</p>}
      <StudioTabs label="Composition Map scope" value={scope} onValueChange={setScope} hidden={Boolean(templateKeys)}
        tabs={[{ value: "surfaces", label: <>Surfaces &amp; systems <span>{writingSurfaceSourceMap.length}</span></> },
          { value: "templates", label: <>Template internals <span>{map.length}</span></> }]}>
      {scope === "surfaces" ? <ReaderSurfaceWorkspace onEditField={onEditField} initialSurfaceId={initialSurfaceId} onStartCmsRow={onStartCmsRow} onLoadRow={onLoadRow} rows={rows} templates={map} onEditRow={onEditRow} onSelectTemplate={(key) => { clearFilters(); selectTemplate(key); setScope("templates"); }} /> : <div className="admin-composition-map-layout">
        <aside className="admin-composition-template-list" aria-label="Composition templates">
          <header>
            <div><p className="admin-eyebrow">{templateKeys ? "Choose a passage or template" : "Choose a template"}</p><strong>{filtered.length} of {map.length}</strong></div>
            <small>Choose one to read its surface.</small>
            <div className="admin-composition-template-tools">
              <span className="admin-composition-search-shell">
                <StudioInput aria-label="Search the composition map" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a template or source" />
                {query && <StudioButton type="button" aria-label="Clear composition search" onClick={() => setQuery("")}>×</StudioButton>}
              </span>
              <div className="admin-composition-template-filters">
                <AdminSelect aria-label="Reader destination" value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
                  <option value="all">All destinations</option>
                  {destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}
                </AdminSelect>
                <StudioButton
                  type="button"
                  className={`admin-composition-issues-filter ${issuesOnly ? "active" : ""}`}
                  aria-label="Show only templates that need IA review"
                  aria-pressed={issuesOnly}
                  onClick={() => setIssuesOnly((current) => !current)}
                >
                  Review
                </StudioButton>
              </div>
            </div>
            <label className="admin-composition-template-mobile-picker">
              <span>Selected template</span>
              <AdminSelect value={selected?.row.content_key ?? ""} onChange={(event) => selectTemplate(event.target.value)}>
                {filtered.map((template) => <option key={template.row.content_key} value={template.row.content_key}>{template.label}</option>)}
              </AdminSelect>
            </label>
          </header>
          <div className="admin-composition-template-items">
            {filtered.map((template) => (
              <StudioButton
                type="button"
                key={template.row.content_key}
                className={selected?.row.content_key === template.row.content_key ? "active" : ""}
                aria-pressed={selected?.row.content_key === template.row.content_key}
                onClick={() => selectTemplate(template.row.content_key)}
              >
                <span>{template.destination}</span>
                <strong>{template.label.replace(`${template.destination} · `, "")}</strong>
                <small>{template.slots.length} slot{template.slots.length === 1 ? "" : "s"} · {template.issues.length ? `${template.issues.length} IA flag${template.issues.length === 1 ? "" : "s"}` : "no IA flags"}</small>
              </StudioButton>
            ))}
            {!filtered.length && (
              <div className="admin-composition-empty">
                <strong>No templates match</strong>
                <p>Try a broader destination or clear the current review filters.</p>
                {hasFilters && <StudioButton type="button" onClick={clearFilters}>Clear filters</StudioButton>}
              </div>
            )}
          </div>
        </aside>

        <section className="admin-composition-detail" aria-label="Selected template composition">
          {selected && !pendingRows.length && !loadError ? (
            <>
              <header className="admin-composition-detail-header">
                <div>
                  <p className="admin-eyebrow">{selected.destination}</p>
                  <h2>{selected.label.replace(`${selected.destination} · `, "")}</h2>
                  <p>{selected.description}</p>
                </div>
                <StudioButton type="button" className="admin-primary-button" onClick={() => onEditRow(selected.row)}>
                  {selected.preview.lineage === "saved-passage" ? "Edit passage" : "Edit main template"}
                </StudioButton>
              </header>

              <StudioTabs label="Composition views" value={view} onValueChange={setView}
                tabs={[{ value: "preview", label: "Reader preview" }, { value: "template", label: "Main template" }, { value: "assembly", label: "Assembly" }]}>
              {selected.issues.length > 0 && (
                <section className="admin-composition-issues" aria-label="Naming and information architecture issues">
                  <div><strong>Naming &amp; IA review</strong></div>
                  <ul>{selected.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                </section>
              )}

              <CompositionVariableKey slots={selected.slots} colors={variableColors} />

              {view === "preview" && (
                <section className="admin-composition-reader-preview" aria-label="Reader surface preview">
                  <header>
                    <div>
                      <p className="admin-eyebrow">Representative surface preview</p>
                      <h3>{selected.preview.lineage === "saved-passage" ? "Complete passage preview" : selected.preview.lineage === "runtime-traceable" ? "Traceable reader rendering" : "Preview lineage is incomplete"}</h3>
                      <p>{selected.preview.lineageNote} {selected.preview.lineage !== "saved-passage" && "This uses sample chart facts, not a live chart."}</p>
                    </div>
                    <span className={`ui-pill admin-status ${selected.preview.lineage !== "not-traceable" ? "status-reviewed" : "status-error"}`}>
                      {selected.preview.lineage === "saved-passage" ? "Saved passage" : selected.preview.lineage === "runtime-traceable" ? "Runtime-traceable" : "Not traceable"}
                    </span>
                  </header>

                  {selected.preview.lineage === "not-traceable" && (
                    <div className="admin-composition-lineage-warning" role="alert">
                      <strong>Do not use this as reader-copy evidence</strong>
                      <p>Open Assembly to declare the missing source lineage. Content Studio will not present this sample as a verified rendering.</p>
                    </div>
                  )}

                  <div className="admin-composition-preview-surface">
                    <div className="admin-composition-preview-chrome">
                      <span>{selected.destination}</span>
                      {selectedHasAudienceVariants ? (
                        <div className="admin-composition-preview-audience" role="group" aria-label="Preview audience">
                          <StudioButton type="button" aria-pressed={previewAudience === "you"} className={previewAudience === "you" ? "active" : ""} onClick={() => setPreviewAudience("you")}>You</StudioButton>
                          <StudioButton type="button" aria-pressed={previewAudience === "they"} className={previewAudience === "they" ? "active" : ""} onClick={() => setPreviewAudience("they")}>They</StudioButton>
                        </div>
                      ) : <span>Reader surface</span>}
                    </div>
                    <div className="admin-composition-preview-copy">
                      {visiblePreviewFields.map((field) => (
                        <section className={`admin-composition-preview-field field-${field.key}`} key={field.key}>
                          <span>{field.label}</span>
                          {field.paragraphs.map((paragraph, paragraphIndex) => {
                            const audience = field.audience === "they" ? "they" : previewAudience;
                            const copy = paragraph.map((segment, segmentIndex) => variableButton(
                              segment,
                              `${field.key}-${paragraphIndex}-${segmentIndex}`,
                              field.label,
                              paragraph,
                              segmentIndex,
                              audience
                            ));
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
                          <StudioButton type="button" key={source.row.id} onClick={() => onEditRow(source.row)}>
                            <span><small>{sourceKindLabel(source)}</small><strong>{source.label}</strong><code>{source.row.content_key}</code></span>
                            <span>Edit source</span>
                          </StudioButton>
                        ))}
                        {!selected.preview.sources.length && <p className="admin-field-hint">This template chooses among multiple saved sources at runtime. Open Assembly to inspect and edit the available source families.</p>}
                      </div>
                    </section>

                    <section aria-label="Example calculated facts">
                      <header><div><p className="admin-eyebrow">Example facts</p><h3>Values supplied by the app</h3></div><strong>{selected.preview.facts.length}</strong></header>
                      <p className="admin-field-hint">Change sample facts to find the wording for a planet, sign, house, or aspect. These inputs do not change anyone’s calculated chart.</p>
                      <dl>
                        {selected.preview.facts.map((fact) => <div key={fact.name}><dt><label htmlFor={`composition-fact-${fact.name}`}>{fact.label}</label></dt><dd><StudioInput id={`composition-fact-${fact.name}`} value={fact.value} onChange={(event) => setExampleValues((current) => ({ ...current, [fact.name]: event.target.value }))} /></dd></div>)}
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
                    <StudioButton type="button" onClick={() => onEditRow(selected.row)}>Edit template</StudioButton>
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
                          return <StudioButton type="button" key={`${name}-${index}`} className={`admin-composition-variable-token variable-${kind}`} data-variable-name={name} data-variable-color={variableColors.get(name)} data-variable-action={`${action} →`} aria-label={`${part}. ${action}`} onClick={() => openVariable(name, source)}>{part}</StudioButton>;
                        })}</pre>
                      </article>
                    ))}
                  </div>
                  <section className="admin-composition-template-tokens" aria-label="Template tokens">
                    <p className="admin-eyebrow">Tokens used</p>
                    <div>{selected.slots.map((slot) => <StudioButton type="button" key={slot.name} data-variable-name={slot.name} data-variable-color={variableColors.get(slot.name)} onClick={() => openVariable(slot.name)}>{`{{${slot.name}}}`}<small>{slot.sourceKind === "runtime" ? "Calculated" : slot.sourceKind === "unmapped" ? "Not wired" : "Saved copy"}</small></StudioButton>)}</div>
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
                      <div><span className="admin-composition-connector" aria-hidden="true" /><div><strong>{slot.label}</strong><code data-variable-name={slot.name} data-variable-color={variableColors.get(slot.name)}>{`{{${slot.name}}}`}</code></div></div>
                      <div className="admin-composition-slot-badges">
                        <span className="ui-pill admin-status">{slot.requirement === "Runtime" ? (slot.sourceKind === "runtime" ? "Dynamic" : "In template") : slot.requirement}</span>
                        <span className={`ui-pill admin-status ${slot.sourceKind === "runtime" ? "status-reviewed" : "status-draft"}`}>
                          {slot.sourceKind === "runtime" ? "Calculated" : slot.sourceKind === "unmapped" ? "Not wired" : "Editable source"}
                        </span>
                      </div>
                    </header>
                    <p>{slot.meaning}</p>
                    <small>{slot.depth > 0 ? `Nested inside ${slot.parents.map((name) => `{{${name}}}`).join(", ")}` : `Used in ${slot.fields.join(", ")}`} · Example: {slot.example}</small>
                    {slot.sourceKind === "saved-copy" && (
                      <small className="admin-composition-source-contract">
                        {slot.sourceContract.confidence === "template-specific"
                          ? "Exact template contract"
                          : slot.sourceContract.confidence === "resolver-family"
                            ? "Declared resolver family"
                            : "Inferred source family"}
                        {slot.sourceContract.prefixes.length ? ` · ${slot.sourceContract.prefixes.join(" or ")}` : ""}
                      </small>
                    )}

                    {slot.sourceKind === "unmapped" && !slot.sources.length ? (
                      <div className="admin-composition-missing-source" role="note">
                        <span><strong>Not wired to the reader</strong><small>{slot.source}</small></span>
                        <StudioButton type="button" onClick={() => onEditRow(selected.row)}>Review template declaration</StudioButton>
                      </div>
                    ) : slot.sourceKind === "runtime" ? (
                      <div className="admin-composition-runtime-source">
                        <span><strong>Provided by the app</strong><small>Read-only · {slot.source}</small></span>
                      </div>
                    ) : slot.sources.length > 0 ? (
                      <div className="admin-composition-sources" aria-label={`Saved sources for ${slot.label}`}>
                        {slot.sources.map((source) => (
                          <StudioButton type="button" key={source.row.id} onClick={() => onEditRow(source.row)}>
                            <span><small>{sourceKindLabel(source)}</small><strong>{source.label}</strong><code>{source.row.content_key}</code></span>
                            <span>Open editor</span>
                          </StudioButton>
                        ))}
                      </div>
                    ) : (
                      <div className="admin-composition-missing-source" role="note">
                        <span><strong>Saved source not mapped</strong><small>{slot.source}</small></span>
                        <StudioButton type="button" onClick={() => onEditRow(selected.row)}>Edit slot in template</StudioButton>
                      </div>
                    )}
                  </article>
                ))}
              </section>}
              </StudioTabs>
            </>
          ) : <div className="admin-empty">Choose a template to inspect its composition.</div>}
        </section>
      </div>}
      </StudioTabs>
      {editor}
    </section>
  );
}
