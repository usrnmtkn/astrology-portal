import { execFileSync } from "node:child_process";

function decodeXml(value) {
  return String(value ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function unzipText(workbookPath, member) {
  return execFileSync("unzip", ["-p", workbookPath, member], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function columnIndex(cellReference) {
  const letters = cellReference.match(/^[A-Z]+/u)?.[0] ?? "";
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function inlineText(cellXml) {
  return [...cellXml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/gu)]
    .map((match) => decodeXml(match[1]))
    .join("");
}

function valueText(cellXml) {
  const value = cellXml.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/u)?.[1];
  return value == null ? "" : decodeXml(value);
}

function relationshipTarget(workbookPath, relationshipId) {
  const relationships = unzipText(workbookPath, "xl/_rels/workbook.xml.rels");
  const relationship = [...relationships.matchAll(/<(?:\w+:)?Relationship\b([^>]+)\/?\s*>/gu)]
    .map((match) => match[1])
    .find((attributes) => attributes.match(/\bId="([^"]+)"/u)?.[1] === relationshipId);
  const target = relationship?.match(/\bTarget="([^"]+)"/u)?.[1];
  if (!target) throw new Error(`Workbook relationship not found: ${relationshipId}`);
  return target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//u, "")}`;
}

function sheetMember(workbookPath, sheetName) {
  const workbookXml = unzipText(workbookPath, "xl/workbook.xml");
  const sheet = [...workbookXml.matchAll(/<(?:\w+:)?sheet\b([^>]+)\/?\s*>/gu)]
    .map((match) => match[1])
    .find((attributes) => decodeXml(attributes.match(/\bname="([^"]+)"/u)?.[1]) === sheetName);
  const relationshipId = sheet?.match(/\b(?:\w+:)?id="([^"]+)"/u)?.[1];
  if (!relationshipId) throw new Error(`Workbook sheet not found: ${sheetName}`);
  return relationshipTarget(workbookPath, relationshipId);
}

export function readInlineXlsxSheet(workbookPath, sheetName) {
  const xml = unzipText(workbookPath, sheetMember(workbookPath, sheetName));
  let sharedStrings = [];
  try {
    const sharedXml = unzipText(workbookPath, "xl/sharedStrings.xml");
    sharedStrings = [...sharedXml.matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/gu)]
      .map((match) => inlineText(match[1]));
  } catch {
    sharedStrings = [];
  }

  const parsedRows = [...xml.matchAll(/<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/gu)]
    .map((rowMatch) => {
      const rowNumber = Number(rowMatch[1].match(/\br="(\d+)"/u)?.[1]);
      const values = [];
      for (const cellMatch of rowMatch[2].matchAll(/<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/gu)) {
        const reference = cellMatch[1].match(/\br="([A-Z]+\d+)"/u)?.[1];
        if (!reference) continue;
        const type = cellMatch[1].match(/\bt="([^"]+)"/u)?.[1] ?? "";
        const raw = type === "inlineStr" ? inlineText(cellMatch[2]) : valueText(cellMatch[2]);
        values[columnIndex(reference)] = type === "s" ? sharedStrings[Number(raw)] ?? "" : raw;
      }
      return { rowNumber, values };
    });

  const headerRow = parsedRows[0];
  if (!headerRow) return [];
  const headers = headerRow.values.map((header) => String(header ?? ""));
  return parsedRows.slice(1).map(({ rowNumber, values }) => ({
    rowNumber,
    cells: Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  }));
}
