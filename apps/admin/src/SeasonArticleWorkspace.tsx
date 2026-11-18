import { useEffect, useRef, useState } from "react";
import { seasonArticleKey } from "../../../src/shared/seasonArticle";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton, StudioInput } from "./StudioControls";
import { skyPlacementSigns } from "./skyWriteupRelations";
import type { Row } from "./LunarCalendarWorkspace";
import ContentLiveStatusBadge from "./ContentLiveStatus";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";

type Props = {
  sign?: string;
  loadRows: (keys: string[], excludeArchivedArticleRevisions?: boolean) => Promise<Row[]>;
  onOpen: (row: Row) => void;
  onCreate: (sign: string, year: number) => void;
};

export default function SeasonArticleWorkspace({ sign: selectedSign, loadRows, onOpen, onCreate }: Props) {
  const [sign, setSign] = useState<string>(skyPlacementSigns[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; attempt: number; rows: Row[]; error?: string }>();
  const load = useRef(loadRows);
  load.current = loadRows;
  const currentSign = selectedSign ?? sign;
  const key = seasonArticleKey(currentSign, year);
  useEffect(() => subscribeToContentUpdates(update => {
    if (update.contentKey === key) setRetry(value => value + 1);
  }), [key]);
  useEffect(() => {
    if (!key) return;
    let active = true;
    void load.current([key], true).then(rows => {
      if (active) setResult({ key, attempt: retry, rows });
    }).catch(() => {
      if (active) setResult({ key, attempt: retry, rows: [], error: "The saved article could not load. Retry before creating or editing it." });
    });
    return () => { active = false; };
  }, [key, retry]);
  const current = result?.key === key && result.attempt === retry ? result : undefined;
  const row = current?.rows.slice().sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))[0];
  const title = `${currentSign[0].toUpperCase()}${currentSign.slice(1)} Season ${year}`;
  return <section className="studio-surface studio-section" aria-label="Year-specific season article">
    {selectedSign
      ? <p>This optional article is linked from Sky and Calendar. It is separate from the dated Sky reading managed in This visit.</p>
      : <p>Save a complete season article for a specific year. Sky’s Sun in {currentSign[0].toUpperCase() + currentSign.slice(1)} and the Calendar reference this same article.</p>}
    <div className="admin-review-filter-grid">
      {!selectedSign && <label><span>Article season</span><AdminSelect aria-label="Article season" value={sign} onChange={event => setSign(event.target.value)}>
        {skyPlacementSigns.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}
      </AdminSelect></label>}
      <label><span>Season year</span><StudioInput aria-label="Season year" type="number" min="1900" max="2200" value={year} onChange={event => setYear(Number(event.target.value))} /></label>
      <StudioButton disabled={!key || !current || Boolean(current.error)} onClick={() => row ? onOpen(row) : onCreate(currentSign, year)}>
        {row ? `Open ${title} article` : `Write ${title} article`}
      </StudioButton>
    </div>
    <p role="status">{!key ? "Enter a year from 1900 to 2200." : !current ? "Loading saved article…" : current.error ? "" : row ? row.headline || title : selectedSign ? "No additional linked article saved for this season and year." : "No article saved for this season and year."}</p>
    {row && <ContentLiveStatusBadge row={row} />}
    {current?.error && <p role="alert">{current.error} <StudioButton onClick={() => setRetry(value => value + 1)}>Retry article</StudioButton></p>}
  </section>;
}
