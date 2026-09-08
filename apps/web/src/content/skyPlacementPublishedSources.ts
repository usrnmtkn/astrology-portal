import { contentPublicationRecords, publicationAllowsContent } from "./contentPublicationState";
import { isCanonicalSkyReaderRecord } from "./fallbackArchitectureV3/dashboardExtensions";
// @ts-ignore The canonical renderer and its editable-field contract are shared ESM.
import { renderSkyV4ReaderRoute, skyV4ContentStudioRecords } from "./fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

type RecordValue = Record<string, any>;
const object = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const at = (value: RecordValue, path: string): unknown => path.split(".").reduce((current, part) => object(current)[part], value);
function set(value: RecordValue, path: string, copy: string) {
  const parts = path.split(".");
  const leaf = parts.pop()!;
  let target = value;
  for (const part of parts) target = target[part] = { ...object(target[part]) };
  target[leaf] = copy;
}

/** Only a publication's exact row version can supersede the immutable corpus.
 * The corpus owns the editable paths; incoming metadata can never add paths.
 */
export function createPublishedSkyReader(corpus: RecordValue, lunarSource: unknown, sources: () => unknown[]) {
  const baselines = new Map<string, RecordValue>(skyV4ContentStudioRecords(corpus).map((row: RecordValue) => [row.contentKey, row]));
  let fingerprint = "";
  let effective = corpus;
  let blocked = new Set<string>();
  return (input: Record<string, unknown>) => {
    const published = sources().map(object).filter(row => isCanonicalSkyReaderRecord(row as any)
      && row.studio_version_status === "approved-serving-revision"
      && typeof row.publicationRowId === "string"
      && row.review_status === "approved"
      && publicationAllowsContent(row.contentKey, row.publicationRowId, row.publicationRowUpdatedAt));
    const nextFingerprint = JSON.stringify([published.map(row => [row.contentKey, row.publicationRowId, row.publicationRowUpdatedAt]), contentPublicationRecords()]);
    if (nextFingerprint !== fingerprint) {
      fingerprint = nextFingerprint;
      const byKey = new Map(published.map(row => [row.contentKey, row]));
      blocked = new Set([...baselines.keys()].filter(key => !byKey.has(key) && !publicationAllowsContent(key)));
      // Copy only touched branches and whitelisted prose. Structural identity,
      // ephemeris configuration, release gates, and baseline hashes stay fixed.
      function visit(value: unknown): unknown {
        if (Array.isArray(value)) return value.map(visit);
        if (!value || typeof value !== "object") return value;
        const source = object(value);
        const key = source.contentKey ?? source.ContentKey ?? source.OverlayKey;
        const baseline = baselines.get(key);
        if (baseline && (byKey.has(key) || blocked.has(key))) {
          const next = { ...source };
          for (const field of baseline.studio_editable_fields ?? []) {
            const copy = blocked.has(key) ? "" : at(byKey.get(key)!, field.path);
            if (typeof copy === "string") set(next, field.path, copy);
          }
          return next;
        }
        return Object.fromEntries(Object.entries(source).map(([key, child]) => [key, visit(child)]));
      }
      effective = { ...corpus, content: visit(corpus.content) };
    }
    const rendered = renderSkyV4ReaderRoute(effective, input, lunarSource);
    if (blocked.has(rendered.contentKey)) throw new Error(`SKY_V4_SOURCE_GAP: ${rendered.contentKey} has no current published copy.`);
    if (input.route === "placement" && input.isRetrograde === true && blocked.has(`sky-placement/retrograde/${input.planet}`)) {
      throw new Error("SKY_V4_SOURCE_GAP: the retrograde paragraph has no current published copy.");
    }
    return rendered;
  };
}
