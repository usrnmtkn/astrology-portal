import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { buildChartReport, aspectSymbols, reportDegree, reportPointGlyph, type ChartReportSource, type ReportPoint } from "../../services/chartReport";
import { wheelDegree } from "../../services/zodiacWheelFacts";
import type { ChartDownloadFormat, ChartDownloadScope } from "../../services/chartDownload";
import "../../styles/full-chart.css";

export function FullChartView({ source, children, titleId, onClose, controls }: {
  source: ChartReportSource; children: ReactNode; titleId: string; onClose: () => void; controls?: ReactNode;
}) {
  const [includePoints, setIncludePoints] = useState(false);
  const report = useMemo(() => buildChartReport(source, includePoints), [source, includePoints]);
  return <ChartReportView key={report.identity} source={source} report={report} titleId={titleId} onClose={onClose}
    includePoints={includePoints} onIncludePoints={setIncludePoints} controls={controls}>{children}</ChartReportView>;
}

export default FullChartView;

function ChartReportView({ source, report, children, titleId, onClose, controls, includePoints, onIncludePoints }: {
  source: ChartReportSource; report: ReturnType<typeof buildChartReport>; children: ReactNode; titleId: string; onClose: () => void;
  controls?: ReactNode; includePoints: boolean; onIncludePoints: (value: boolean) => void;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [showOrbs, setShowOrbs] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<ChartDownloadFormat>("pdf");
  const [scope, setScope] = useState<ChartDownloadScope>("full");
  const [includeDetails, setIncludeDetails] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const selected = report.aspects.find(aspect => aspect.id === selectedId);
  const aspectMap = new Map(report.aspects.map(aspect => [aspect.id, aspect]));
  const date = source.kind !== "composite" && source.primary.generatedAt ? new Date(source.primary.generatedAt) : null;
  const dateLabel = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date) + " UTC" : "";
  const metadata = [report.subtitle, dateLabel].filter(Boolean).join(" · ");

  async function download() {
    setBusy(true); setStatus("Preparing download…");
    try {
      const { downloadChart } = await import("../../services/chartDownload");
      await downloadChart({ report, wheel: wheelRef.current?.querySelector("svg") ?? null, format, scope, includeDetails, metadata, showOrbs });
      setStatus("Download ready.");
    } catch {
      setStatus("The download could not be prepared. Please try again.");
    } finally { setBusy(false); }
  }
  function positions(points: ReportPoint[], label: string, ring: "row" | "column" = "row") {
    return <div className="full-chart__positions"><table aria-label={`${label} positions`}><caption>{label}</caption><thead><tr><th scope="col">Point</th><th scope="col">Position</th><th scope="col">House</th></tr></thead>
      <tbody>{points.map(point => <tr key={point.name} data-highlighted={selected && (report.rectangular
        ? point.name === (ring === "row" ? selected.row : selected.column)
        : point.name === selected.row || point.name === selected.column) || undefined}>
        <th scope="row"><span className="full-chart__glyph" aria-hidden="true">{reportPointGlyph(point.name)}</span> {point.name}</th>
        <td>{reportDegree(point)}</td><td>{point.house ?? "—"}</td>
      </tr>)}</tbody></table></div>;
  }
  return <div className="full-chart" data-chart-kind={report.kind}>
    <header className="full-chart__toolbar">
      <button type="button" className="full-chart__button" aria-label={report.kind === "sky" ? "Back" : "Close full-screen chart"} onClick={onClose}><ArrowLeft size={18} aria-hidden="true"/> Back</button>
      <span className="full-chart__brand"><svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true"><g stroke="currentColor" strokeWidth="13" strokeLinecap="round"><path d="M50 87V13M82.04 68.5L17.96 31.5M82.04 31.5L17.96 68.5"/></g></svg> TLDR Astro</span>
      <button type="button" className="full-chart__button" aria-expanded={downloadOpen} aria-controls={`${titleId}-downloads`} onClick={() => setDownloadOpen(value => !value)}><Download size={18} aria-hidden="true"/> Download</button>
    </header>
    <div className="full-chart__content">
      <div className="full-chart__heading"><h2 id={titleId} aria-label={report.kind === "sky" ? "Full sky chart" : undefined}>{report.title}</h2>{metadata && <div className="full-chart__meta">{metadata}</div>}{controls}</div>
      <details id={`${titleId}-downloads`} className="full-chart__downloads" open={downloadOpen} onToggle={event => setDownloadOpen(event.currentTarget.open)}><summary>Download options</summary>
        <div className="full-chart__download-fields">
          <label>Format<select aria-label="Download format" value={format} onChange={event => setFormat(event.target.value as ChartDownloadFormat)}>{["pdf", "png", "svg", "csv"].map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
          <label>Include<select aria-label="Download content" value={scope} onChange={event => setScope(event.target.value as ChartDownloadScope)}><option value="full">Full chart</option><option value="wheel">Wheel only</option><option value="grid">Aspect grid only</option></select></label>
          <label className="full-chart__check"><input type="checkbox" checked={includeDetails} onChange={event => setIncludeDetails(event.target.checked)}/> Include names and chart date</label>
          <button type="button" className="full-chart__button" disabled={busy || report.rows.length === 0} onClick={() => void download()}>{busy ? "Preparing…" : `Download ${format.toUpperCase()}`}</button>
        </div><div className="full-chart__meta" role="status">{status}</div>
      </details>
      <div className="full-chart__overview">
        <div ref={wheelRef} className="full-chart__wheel">{children}</div>
        <div className="full-chart__position-list">{positions(report.rows, report.rectangular ? report.rowLabel : "Planet positions")}{report.rectangular && positions(report.columns, report.columnLabel, "column")}</div>
      </div>
      <section className="full-chart__aspects" aria-labelledby={`${titleId}-aspects`}>
        <div className="full-chart__grid-heading"><h3 id={`${titleId}-aspects`}>Aspect grid</h3><div className="full-chart__grid-controls">
          <label className="full-chart__check"><input type="checkbox" checked={includePoints} onChange={event => onIncludePoints(event.target.checked)}/> Points & angles</label>
          <label className="full-chart__check"><input type="checkbox" checked={showOrbs} onChange={event => setShowOrbs(event.target.checked)}/> Show orbs</label>
        </div></div>
        {report.rectangular && <div className="full-chart__meta">Rows: {report.rowLabel} · Columns: {report.columnLabel}</div>}
        <div className="full-chart__grid-scroll" role="region" aria-label="Scrollable aspect grid" tabIndex={0}>
          <table className="full-chart__grid" aria-label={`${report.title} aspect grid`}><thead><tr><th scope="col"><span className="sr-only">{report.rectangular ? "Outer / inner" : "Planet"}</span></th>{report.columns.map(point => <th key={point.name} scope="col" title={point.name}><span aria-hidden="true">{reportPointGlyph(point.name)}</span><span className="sr-only">{point.name}</span></th>)}</tr></thead>
            <tbody>{report.rows.map((row, index) => <tr key={row.name}><th scope="row" title={row.name}><span aria-hidden="true">{reportPointGlyph(row.name)}</span><span className="sr-only">{row.name}</span></th>{report.columns.map((column, columnIndex) => {
              const aspect = aspectMap.get(`${row.name}|${column.name}`), hidden = !report.rectangular && columnIndex >= index;
              return <td key={column.name} className={hidden ? "full-chart__grid-unused" : undefined} data-aspect={aspect?.type}>
                {aspect && !hidden ? <button type="button" aria-label={`${row.name} ${aspect.type} ${column.name}, orb ${wheelDegree(aspect.orb)}`} aria-pressed={selectedId === aspect.id} onClick={() => setSelectedId(selectedId === aspect.id ? null : aspect.id)}>
                  <span className="full-chart__aspect-symbol" aria-hidden="true">{aspectSymbols[aspect.type] ?? aspect.type}</span>{showOrbs && <span>{wheelDegree(aspect.orb)}</span>}
                </button> : <span aria-label={hidden ? undefined : `No aspect between ${row.name} and ${column.name}`} aria-hidden={hidden || undefined}>{hidden ? "" : "·"}</span>}
              </td>;
            })}</tr>)}</tbody></table>
        </div>
        <div className="full-chart__selection" role="status">{selected ? `${selected.row} ${selected.type} ${selected.column} · Orb ${wheelDegree(selected.orb)}${selected.applying === undefined ? "" : selected.applying ? " · Applying" : " · Separating"}` : report.aspects.length ? "Select an aspect to see its details." : "No aspects within the chart’s orb limits."}</div>
        <div className="full-chart__legend">{Object.entries(aspectSymbols).filter(([type]) => report.kind === "sky" || report.kind === "natal" || type !== "quincunx").map(([type, symbol]) => <span key={type}><span className="full-chart__glyph" aria-hidden="true">{symbol}</span> {type}</span>)}</div>
      </section>
      <footer className="full-chart__notes">{report.notes.map(note => <div key={note}>{note}</div>)}<div>Created with TLDR Astro</div></footer>
    </div>
  </div>;
}
