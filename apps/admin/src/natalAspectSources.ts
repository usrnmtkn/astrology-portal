export const natalAspectContentKeyPrefix = "fallback-hook/natal-aspect-lived/";

export type NatalAspectSelection = {
  first: string;
  aspect: string;
  second: string;
};

export type NatalAspectSourceRow = {
  content_key: string;
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseNatalAspectContentKey(contentKey: string): NatalAspectSelection | null {
  if (!contentKey.startsWith(natalAspectContentKeyPrefix)) return null;
  const parts = contentKey.slice(natalAspectContentKeyPrefix.length).split("/");
  if (parts.length !== 3 || parts.some((part) => !part.trim())) return null;
  const [first, aspect, second] = parts;
  return { first, aspect, second };
}

export function natalAspectDisplayTitle(selection: NatalAspectSelection) {
  return `${titleCase(selection.first)} ${titleCase(selection.aspect)} ${titleCase(selection.second)}`;
}

export function natalAspectSelectionOptions(rows: NatalAspectSourceRow[]) {
  const parsed = rows
    .map((row) => parseNatalAspectContentKey(row.content_key))
    .filter((selection): selection is NatalAspectSelection => Boolean(selection));
  const bodies = [...new Set(parsed.flatMap((selection) => [selection.first, selection.second]))].sort();
  return {
    first: bodies,
    aspects: [...new Set(parsed.map((selection) => selection.aspect))].sort(),
    second: bodies
  };
}

export function natalAspectMatchesSelection(
  row: NatalAspectSourceRow,
  selection: Partial<NatalAspectSelection>
) {
  const parsed = parseNatalAspectContentKey(row.content_key);
  if (!parsed) return false;
  if (selection.aspect && parsed.aspect !== selection.aspect) return false;
  if (selection.first && selection.second) {
    return (parsed.first === selection.first && parsed.second === selection.second)
      || (parsed.first === selection.second && parsed.second === selection.first);
  }
  const selectedBody = selection.first || selection.second;
  return !selectedBody || parsed.first === selectedBody || parsed.second === selectedBody;
}
