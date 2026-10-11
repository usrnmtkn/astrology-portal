import { isSkyIngressEssay } from "../../web/src/content/skyIngressEssay.mjs";
import type { CompiledSkyArticleEdition } from "../../web/src/content/skyArticleTemplateCompiler";
import { AdminDisclosureSummary, AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import type { RelatedHousePassage, SkyWriteupRelationRow } from "./skyWriteupRelations";

type Row = SkyWriteupRelationRow & { status?: string | null; updated_at?: string | null; inventory_only?: boolean };
type Props<T extends Row> = {
  view: "houses" | "aspects";
  house: number;
  onHouse: (house: number) => void;
  houses: RelatedHousePassage<T>[];
  aspects: T[];
  query: string;
  onQuery: (query: string) => void;
  onEdit: (row: T) => void;
  title: (row: T) => string;
};

export default function SkyPlacementCompanions<T extends Row>({ view, house, onHouse, houses, aspects, query, onQuery, onEdit, title }: Props<T>) {
  const passages = houses.filter(passage => passage.house === house);
  const complete = passages.filter(passage => passage.availability === "Reader-ready");
  const supporting = passages.filter(passage => passage.availability === "Source candidate");
  const renderPassage = (row: T, label: string) => <article className="admin-sky-related-row admin-hook-detail-section" key={row.id}>
    <div className="admin-fallback-diagnostic-heading"><strong>{label}</strong><ContentLiveStatusBadge row={row} /></div>
    <p className="admin-copy-preview">{row.body || (row.inventory_only ? "Open this passage to load its saved writing." : "No writing saved.")}</p>
    <StudioButton onClick={() => onEdit(row)}>Edit {label.toLowerCase()}</StudioButton>
    <details className="admin-workspace-details"><AdminDisclosureSummary>Source details</AdminDisclosureSummary><code>{row.content_key}</code></details>
  </article>;
  return <section className="studio-section admin-sky-companion-editor" aria-label={view === "houses" ? "House horoscopes" : "Personal aspects"}>
    {view === "houses" ? <>
      <p>Choose a house to edit its complete horoscope. Supporting passages are listed separately below it.</p>
      <label><span>House</span><AdminSelect aria-label="Choose horoscope house" value={house} onChange={event => onHouse(Number(event.target.value))}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(value => <option key={value} value={value}>House {value}</option>)}
      </AdminSelect></label>
      {complete.map(passage => renderPassage(passage.row, `House ${house} horoscope`))}
      {!complete.length && <p className="admin-empty">No complete horoscope is saved for House {house}.</p>}
      <details className="admin-workspace-details">
        <AdminDisclosureSummary>Supporting passages ({supporting.length})</AdminDisclosureSummary>
        <p>These are reusable ingredients, not the complete horoscope.</p>
        {supporting.map(passage => renderPassage(passage.row, passage.kind))}
        {!supporting.length && <p className="admin-empty">No supporting passages are saved for this house.</p>}
      </details>
    </> : <>
      <p>These passages describe this transiting planet's aspects to a reader's natal chart. Use Sky &amp; Calendar aspects for aspects between two planets in the sky.</p>
      <label className="admin-sky-related-search"><span>Find a personal aspect</span><div className="admin-search-input-shell"><StudioInput type="search" aria-label="Find a personal aspect" value={query} onChange={event => onQuery(event.target.value)} placeholder="Search by natal planet, aspect, or wording" /></div></label>
      {aspects.map(row => renderPassage(row, title(row)))}
      {!aspects.length && <p className="admin-empty">{query.trim() ? "No personal aspects match this search. Try another planet or clear the search." : "No personal aspect passages are saved for this planet."}</p>}
    </>}
  </section>;
}

export function SkyArticleSourceDetails({ edition }: { edition: CompiledSkyArticleEdition }) {
  const title = (value: string) => value.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  return (
              <details className="admin-workspace-details"><AdminDisclosureSummary>Article source details</AdminDisclosureSummary>
              <div className="admin-fallback-diagnostic-heading">
                <div>
                  <p className="admin-eyebrow">Compiled article edition</p>
                  <h3>{title(edition.planet)} in {title(edition.sign)}</h3>
                </div>
                <strong>{edition.validFrom} through {edition.validTo}</strong>
              </div>
              <p>This saved article contains no unresolved placeholders. Review it before publication.</p>
              <div className="admin-hook-detail-section">
                <strong>TL;DR</strong>
                <p>{edition.tldr}</p>
              </div>
              <dl className="admin-hook-pattern-list">
                <div><dt>Template</dt><dd>{edition.templateKey}</dd></div>
                <div><dt>Template hash</dt><dd><code>{edition.templateHash.slice(0, 12)}</code></dd></div>
                <div><dt>Compiled hash</dt><dd><code>{edition.compiledHash.slice(0, 12)}</code></dd></div>
                {!isSkyIngressEssay(edition.format) && <>
                  <div><dt>House horoscopes</dt><dd>{edition.housePassages.length}/12</dd></div>
                  <div><dt>Aspect passages</dt><dd>{edition.aspectPassages.length}</dd></div>
                </>}
              </dl>
              </details>
  );
}

export function SkyPlacementEditorNav({ section, onSection, onSkyAspects }: {
  section: "article" | "houses" | "aspects";
  onSection: (section: "article" | "houses" | "aspects") => void;
  onSkyAspects: () => void;
}) {
  return <nav className="admin-editor-meta admin-surface-actions" aria-label="Placement editor sections">
    {([{ value: "article", label: "Article" }, { value: "houses", label: "House horoscopes" }, { value: "aspects", label: "Personal aspects" }] as const).map(item =>
      <StudioButton key={item.value} aria-controls="sky-placement-editor-content" aria-pressed={section === item.value} onClick={() => onSection(item.value)}>{item.label}</StudioButton>)}
    <StudioButton onClick={onSkyAspects}>Sky &amp; Calendar aspects</StudioButton>
  </nav>;
}
