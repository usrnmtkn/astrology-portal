export function readerCsvCells(text: string) {
  // Reader snapshots intentionally lack editable row identities.
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 1; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && c === ',') { row.push(cell); cell = ''; }
    else if (!quoted && c === '\r') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += c;
  }
  return Object.fromEntries(rows[0].map((key, index) => [key, rows[1][index]]));
}
