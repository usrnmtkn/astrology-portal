const formulaPrefix = /^(?:[ \t\r\n]*[=+\-@]|[\t\r'])/;
export function quoteCsvCell(value: string) {
  const safe = formulaPrefix.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function decodeCsvCell(value: string) {
  return value.startsWith("'") && formulaPrefix.test(value.slice(1)) ? value.slice(1) : value;
}
