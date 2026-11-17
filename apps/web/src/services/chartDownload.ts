import newsreaderUrl from "../assets/fonts/newsreader.woff2?url";
import { aspectSymbols, reportDegree, reportPointGlyph, type ChartReport } from "./chartReport";
import { wheelDegree } from "./zodiacWheelFacts";

export type ChartDownloadFormat = "pdf" | "png" | "svg" | "csv";
export type ChartDownloadScope = "full" | "wheel" | "grid";
type Options = { report: ChartReport; wheel: SVGSVGElement | null; format: ChartDownloadFormat; scope: ChartDownloadScope; includeDetails: boolean; metadata: string; showOrbs: boolean };
import { chartCsv } from "./chartCsv";
export { chartCsv } from "./chartCsv";
const website = "https://tldrastro.vercel.app";
const escapeXml = (value: unknown) => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
const defaultLabels = (report: ChartReport) => report.kind === "transit" ? ["Sky · outer", "Natal · inner"] : ["Person B · outer", "Person A · inner"];

async function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("File conversion failed")); reader.readAsDataURL(blob); });
}
async function localAsset(url: string) {
  const resolved = new URL(url, location.href);
  if (resolved.origin !== location.origin) throw new Error("Chart assets must be local");
  const response = await fetch(resolved.href);
  if (!response.ok) throw new Error("Chart asset unavailable");
  return dataUrl(await response.blob());
}

// Capture the existing drawing, including resolved theme styles and local icon
// assets. No screenshots, uploads, profile storage, or remote rendering service.
async function standaloneWheel(wheel: SVGSVGElement) {
  await document.fonts.ready;
  const clone = wheel.cloneNode(true) as SVGSVGElement;
  const originals = [wheel, ...wheel.querySelectorAll<SVGElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<SVGElement>("*")];
  const properties = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "font-family", "font-size", "font-weight", "font-style", "letter-spacing", "text-anchor", "dominant-baseline", "paint-order", "visibility", "display", "filter", "text-transform"];
  for (let index = 0; index < originals.length; index++) {
    const style = getComputedStyle(originals[index]);
    properties.forEach(property => {
      const value = style.getPropertyValue(property);
      // Keep SVG filter references local to the exported drawing.
      copies[index].style.setProperty(property, property === "filter"
        ? value.replace(/url\(["']?[^#]*#([^"')]+)["']?\)/g, "url(#$1)") : value);
    });
    for (const attribute of [...copies[index].attributes]) {
      if (attribute.name.startsWith("aria-") || attribute.name.startsWith("data-") || attribute.name.startsWith("on") || ["tabindex", "role", "class"].includes(attribute.name)) copies[index].removeAttribute(attribute.name);
    }
  }
  clone.querySelectorAll("title, desc").forEach(node => node.remove());
  await Promise.all([...clone.querySelectorAll("image")].map(async element => {
    const href = element.getAttribute("href") ?? element.getAttribute("xlink:href");
    if (href && !href.startsWith("data:")) { element.removeAttribute("xlink:href"); element.setAttribute("href", await localAsset(href)); }
  }));
  clone.removeAttribute("width"); clone.removeAttribute("height"); clone.style.removeProperty("width"); clone.style.removeProperty("height");
  return new XMLSerializer().serializeToString(clone);
}

export async function chartSvg(options: Omit<Options, "format">) {
  const { report, scope, includeDetails, metadata, showOrbs } = options;
  if (scope !== "grid" && !options.wheel) throw new Error("Chart drawing is still loading");
  const font = await localAsset(newsreaderUrl);
  const width = 1200, margin = 48, bodyWidth = width - margin * 2;
  const labels = includeDetails ? [report.rowLabel, report.columnLabel] : defaultLabels(report);
  const texts = (x: number, y: number, value: unknown, attrs = "") => `<text x="${x}" y="${y}" ${attrs}>${escapeXml(value)}</text>`;
  const wrapped = (value: string, limit: number) => value.match(new RegExp(`.{1,${limit}}(?:\\s|$)|.{1,${limit}}`, "g"))?.map(line => line.trim()) ?? [""];
  const metadataLines = includeDetails ? wrapped(metadata, 125) : [];
  let body = "", y = 156 + Math.max(0, metadataLines.length - 1) * 22;
  if (scope !== "grid" && options.wheel) {
    const wheelSize = scope === "wheel" ? 1000 : 650;
    const wheelX = scope === "wheel" ? (width - wheelSize) / 2 : margin;
    const background = getComputedStyle(options.wheel).getPropertyValue("--bg").trim() || "#eef1f5";
    const drawing = (await standaloneWheel(options.wheel)).replace(/<svg\b/, `<svg x="${wheelX}" y="${y}" width="${wheelSize}" height="${wheelSize}"`);
    body += `<rect x="${wheelX}" y="${y}" width="${wheelSize}" height="${wheelSize}" rx="16" fill="${escapeXml(background)}"/>${drawing}`;
    let positionY = y;
    if (scope === "full") {
      const x = 742;
      [report.rows, ...(report.rectangular ? [report.columns] : [])].forEach((points, chartIndex) => {
        const labelLines = wrapped(report.rectangular ? labels[chartIndex] : "Planet positions", 40);
        labelLines.forEach(line => { body += texts(x, positionY + 20, line, 'font-size="17" font-weight="600"'); positionY += 23; });
        positionY += 20;
        body += texts(x, positionY, "Point", 'font-size="12" fill="#606875"') + texts(930, positionY, "Position", 'font-size="12" fill="#606875"') + texts(1136, positionY, "House", 'font-size="12" fill="#606875" text-anchor="end"');
        positionY += 27;
        points.forEach(point => {
          body += texts(x, positionY, point.name, 'font-size="14"') + texts(930, positionY, reportDegree(point), 'font-size="14"') + texts(1136, positionY, point.house ?? "—", 'font-size="14" text-anchor="end"');
          body += `<path d="M${x} ${positionY + 10}H1152" stroke="#dfe4eb"/>`; positionY += 27;
        });
        positionY += 30;
      });
    }
    y = Math.max(y + wheelSize, positionY) + 48;
  }
  if (scope !== "wheel") {
    body += texts(margin, y, "Aspect grid", 'font-family="Newsreader,serif" font-size="32"'); y += 30;
    if (report.rectangular) wrapped(`Rows: ${labels[0]} · Columns: ${labels[1]}`, 130).forEach(line => { body += texts(margin, y, line, 'font-size="14" fill="#606875"'); y += 24; });
    const cell = Math.min(64, bodyWidth / (report.columns.length + 1));
    const gridX = margin, gridY = y;
    report.columns.forEach((point, index) => { body += texts(gridX + (index + 1.5) * cell, gridY + cell / 2, reportPointGlyph(point.name), 'class="glyph" text-anchor="middle" dominant-baseline="middle"'); });
    const aspects = new Map(report.aspects.map(aspect => [aspect.id, aspect]));
    report.rows.forEach((row, rowIndex) => {
      body += texts(gridX + cell / 2, gridY + (rowIndex + 1.5) * cell, reportPointGlyph(row.name), 'class="glyph" text-anchor="middle" dominant-baseline="middle"');
      report.columns.forEach((column, columnIndex) => {
        if (!report.rectangular && columnIndex >= rowIndex) return;
        const x = gridX + (columnIndex + 1) * cell, top = gridY + (rowIndex + 1) * cell;
        const aspect = aspects.get(`${row.name}|${column.name}`);
        body += `<rect x="${x}" y="${top}" width="${cell}" height="${cell}" fill="#fff" stroke="#c9cfd8"/>`;
        if (aspect) {
          const color = ["square", "opposition"].includes(aspect.type) ? "#b83f57" : ["trine", "sextile"].includes(aspect.type) ? "#247364" : "#66732e";
          body += texts(x + cell / 2, top + cell * (showOrbs ? 0.38 : 0.5), aspectSymbols[aspect.type] ?? aspect.type, `class="glyph" fill="${color}" text-anchor="middle" dominant-baseline="middle"`);
          if (showOrbs) body += texts(x + cell / 2, top + cell * 0.79, wheelDegree(aspect.orb), 'font-size="11" text-anchor="middle"');
        }
      });
    });
    y += (report.rows.length + 1) * cell + 32;
    body += texts(margin, y, "☌ Conjunction   ⚹ Sextile   □ Square   △ Trine   ☍ Opposition" + (["sky", "natal"].includes(report.kind) ? "   ⚻ Quincunx" : ""), 'font-size="15"'); y += 32;
  }
  report.notes.forEach(note => { body += texts(margin, y, note, 'font-size="13" fill="#606875"'); y += 22; });
  const height = y + 84;
  return { width, height, text: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="#1c1f26" font-family="Arial,sans-serif"><defs><style>@font-face{font-family:Newsreader;src:url('${font}')}.glyph{font-family:'Noto Sans Symbols 2','Apple Symbols','Segoe UI Symbol',sans-serif;font-size:23px}</style></defs><rect width="${width}" height="${height}" fill="#fff"/><g transform="translate(48 26)" stroke="#1c1f26" stroke-width="4" stroke-linecap="round"><path d="M16 30V2M28.12 23L3.88 9M28.12 9L3.88 23"/></g>${texts(96, 49, "TLDR Astro", 'font-size="22" font-weight="600"')}${texts(margin, 104, report.title, 'font-family="Newsreader,serif" font-size="40"')}${metadataLines.map((line, index) => texts(margin, 133 + index * 22, line, 'font-size="15" fill="#606875"')).join("")}${body}<path d="M48 ${height - 58}H1152" stroke="#c9cfd8"/>${texts(margin, height - 28, "Created with TLDR Astro", 'font-size="13"')}${texts(1152, height - 28, website, 'font-size="13" text-anchor="end"')}</svg>` };
}

async function rasterize(svg: Awaited<ReturnType<typeof chartSvg>>) {
  const url = URL.createObjectURL(new Blob([svg.text], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = svg.width * 2; canvas.height = svg.height * 2;
    const context = canvas.getContext("2d"); if (!context) throw new Error("Image rendering unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height); return canvas;
  } finally { URL.revokeObjectURL(url); }
}

export function chartPdf(canvas: HTMLCanvasElement, title: string) {
  const image = Uint8Array.from(atob(canvas.toDataURL("image/jpeg", 0.95).split(",")[1]), character => character.charCodeAt(0));
  const pageWidth = 595.28, pageHeight = pageWidth * canvas.height / canvas.width;
  const parts: BlobPart[] = [], offsets = [0], encoder = new TextEncoder(); let length = 0;
  const add = (value: string | Uint8Array) => { const bytes = typeof value === "string" ? encoder.encode(value) : value; parts.push(bytes as BlobPart); length += bytes.length; };
  const object = (index: number, value: string) => { offsets[index] = length; add(`${index} 0 obj\n${value}\nendobj\n`); };
  add("%PDF-1.4\n"); object(1, "<< /Type /Catalog /Pages 2 0 R >>"); object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length; add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`); add(image); add("\nendstream\nendobj\n");
  const stream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
  object(5, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  object(6, `<< /Title (TLDR Astro - ${title.replace(/[()\\]/g, "")}) /Creator (TLDR Astro) /Producer (TLDR Astro chart export) >>`);
  const xref = length; add("xref\n0 7\n0000000000 65535 f \n"); for (let index = 1; index <= 6; index++) add(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  add(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF`); return new Blob(parts, { type: "application/pdf" });
}

export async function downloadChart(options: Options) {
  let blob: Blob;
  if (options.format === "csv") blob = new Blob([chartCsv(options)], { type: "text/csv;charset=utf-8" });
  else {
    const svg = await chartSvg(options);
    if (options.format === "svg") blob = new Blob([svg.text], { type: "image/svg+xml;charset=utf-8" });
    else {
      const canvas = await rasterize(svg);
      blob = options.format === "pdf" ? chartPdf(canvas, options.report.title) : await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("Image export failed")), "image/png"));
    }
  }
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `tldr-astro-${options.report.kind}-${options.scope}.${options.format}`;
  document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
