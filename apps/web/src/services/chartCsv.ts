import type { ChartReport } from "./chartReport";
import type { ChartDownloadScope } from "./chartDownload";
type Options = { report: ChartReport; scope: ChartDownloadScope; includeDetails: boolean; metadata: string };
const website = "https://tldrastro.vercel.app";
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/^(?:[\s]*[=+@-]|[\t\r])/, "'$&").replaceAll('"', '""')}"`;
const defaultLabels = (report: ChartReport) => report.kind === "transit" ? ["Sky · outer", "Natal · inner"] : ["Person B · outer", "Person A · inner"];

export function chartCsv(options: Pick<Options, "report" | "scope" | "includeDetails" | "metadata">) {
  const { report, scope, includeDetails, metadata } = options;
  const labels = includeDetails ? [report.rowLabel, report.columnLabel] : defaultLabels(report);
  const rows: unknown[][] = [["Brand", "TLDR Astro"], ["Website", website], ["Chart", report.title], ["Zodiac", "Tropical"], ["Houses", "Whole sign where time is known"], ["Scope", scope]];
  if (includeDetails && metadata) rows.push(["Details", metadata]);
  report.notes.forEach(note => rows.push(["Note", note]));
  if (scope !== "grid") {
    rows.push([], ["Chart ring", "Point", "Sign", "Degree in sign", "Longitude", "House", "Motion"]);
    [report.rows, ...(report.rectangular ? [report.columns] : [])].forEach((points, index) => points.forEach(point => rows.push([
      report.rectangular ? labels[index] : report.title, point.name, point.sign, point.degree, point.longitude, point.house,
      report.kind === "composite" || point.name === "Ascendant" || point.name === "Midheaven" ? "" : point.retrograde ? "Retrograde" : "Direct"
    ])));
  }
  if (scope !== "wheel") {
    rows.push([], ["Row chart", "Row point", "Column chart", "Column point", "Aspect", "Orb (degrees)", "Phase"]);
    report.aspects.forEach(aspect => rows.push([report.rectangular ? labels[0] : report.title, aspect.row, report.rectangular ? labels[1] : report.title, aspect.column,
      aspect.type, aspect.orb, aspect.applying === undefined ? "" : aspect.applying ? "Applying" : "Separating"]));
  }
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
