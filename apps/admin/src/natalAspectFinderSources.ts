import { natalAspectComposedSourceKeys, natalAspectDisplayTitle, natalAspectTitleCase, natalAspectContentKeyPrefix, natalAspectResolverDependencyKeys, type NatalAspectSelection, type NatalAspectSourceRow } from "./natalAspectSources";
import { studioPackageObject as object } from "../../../src/shared/studioPackagePatch";

// Keep source-card descriptions with the lazy finder, outside Studio startup.
export function natalAspectComposedSources(selection: NatalAspectSelection) {
  const labels = [
    `${natalAspectDisplayTitle(selection)} pair writing`,
    "Natal aspect template",
    "Aspect explanation",
    "Aspect wording",
    "Aspect movement wording",
    ...[selection.first, selection.second].map(body => `${natalAspectTitleCase(body)} meaning`)
  ];
  return natalAspectComposedSourceKeys(selection).map((candidateKeys, index) => ({
    id: candidateKeys[0], label: labels[index], candidateKeys
  }));
}

export function natalAspectSourceFields(row: { body?: string | null; sections?: unknown }) {
  const sections = object(row.sections);
  const record = { ...object(sections.packageRecord), ...object(sections.packageDraft) };
  const text = (...values: unknown[]) => values.find((value): value is string => typeof value === 'string' && value.length > 0) ?? '';
  return {
    body_you: text(record.body_you, record.body, row.body),
    body_they: typeof record.body_they === 'string' ? record.body_they : text(sections.body_they),
    astroHint: typeof record.astroHint === 'string' ? record.astroHint : text(sections.astroHint)
  };
}

export function natalAspectPreviewOverrides(rows: Array<{
  content_key: string; id?: string | null; body?: string | null; sections?: unknown;
  lane?: string | null; provider?: string | null; status: string; review_state?: string | null; updated_at?: string | null;
}>, selection: NatalAspectSelection) {
  const keys = new Set(natalAspectResolverDependencyKeys(selection));
  return rows.filter(row => keys.has(row.content_key)).flatMap(row => {
    const sections = object(row.sections);
    const record = object(sections.packageRecord);
    if (typeof record.content_role !== "string") return [];
    return [{
      id: row.id ?? "", lane: row.lane ?? null, provider: row.provider ?? null,
      status: row.review_state ? "DRAFT" : row.status, updatedAt: row.updated_at ?? null,
      packageRow: { ...record, contentKey: row.content_key, body: sections.body ?? record.body ?? row.body,
        body_you: sections.body_you ?? record.body_you, body_they: sections.body_they ?? record.body_they }
    }];
  });
}


export function parseNatalAspectContentKey(contentKey: string): NatalAspectSelection | null {
  const native = contentKey.match(/^natal\.aspect\.([\w-]+)\.([\w-]+)\.([\w-]+)$/u);
  if (native) return { first: native[1].replaceAll('_', '-'), aspect: native[2], second: native[3].replaceAll('_', '-') };
  if (!contentKey.startsWith(natalAspectContentKeyPrefix)) return null;
  const parts = contentKey.slice(natalAspectContentKeyPrefix.length).split("/");
  if (parts.length !== 3 || parts.some((part) => !part.trim())) return null;
  const [first, aspect, second] = parts;
  return { first, aspect, second };
}

export { studioServingStatusRow as natalAspectComposedStatusRow } from "./studioServingStatus.ts";

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
