import { skyIngressEssayReaderSection } from "../../web/src/content/skyIngressEssayReader";
import { skyArticleEditionRecord } from "../../web/src/content/skyArticleTemplateCompiler";
import { approvedSkySeasonFallback, skySeasonFallbackIdentity } from "../../web/src/content/skySeasonFallback";
import { skyPlacementReaderHref } from "./adminReaderDestinations";
import { skyMoonWriteupKeys } from "./skyMoonWriteup";

export type PlacementSourceRow = {
  id: string;
  content_key: string;
  headline: string | null;
  body?: string | null;
  status: string;
  event_type: string | null;
  updated_at?: string | null;
  inventory_only?: boolean;
  lane?: string | null;
  review_state?: string | null;
  sections: unknown;
  source_snapshot?: Record<string, unknown> | null;
};

export function sharedSkyPlacementKeys(planet: string, sign: string) {
  return planet === "moon" ? skyMoonWriteupKeys(sign)
    : [planet === "lilith" ? `sky-lilith/article/${sign}`
      : planet.endsWith("-node") ? `sky-nodes/${planet}/${sign}`
      : `sky-placement/article/${planet}/${sign}`];
}

export function placementSourceRows<T extends PlacementSourceRow>(rows: T[], planet: string, sign: string) {
  const shared = new Set(sharedSkyPlacementKeys(planet, sign));
  return rows.filter(row => {
    const seasonal = skySeasonFallbackIdentity(row.content_key);
    return row.content_key.startsWith(`sky-article/${planet}/${sign}/`)
    || row.content_key.startsWith(`sky-article-revision/${planet}/${sign}/`)
    || seasonal?.planet === planet && seasonal.sign === sign
    || shared.has(row.content_key);
  });
}

export function placementSourcesReferenceDate(instant: string) {
  const date = new Date(instant);
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return day;
}

export function placementSourcesReaderHref(planet: string, sign: string, instant: string) {
  return `/?date=${placementSourcesReferenceDate(instant)}${skyPlacementReaderHref(planet, sign).slice(1)}`;
}

export function selectPlacementSources<T extends PlacementSourceRow>(
  rows: T[], planet: string, sign: string, activeInstant: string, liveIds: ReadonlySet<string>
) {
  rows = placementSourceRows(rows, planet, sign);
  const selected = skyIngressEssayReaderSection(rows.filter(row => row.status === "LIVE"
    && row.lane === "serving" && !row.review_state && liveIds.has(row.id))
    .map(row => ({ id: row.id, contentKey: row.content_key, status: row.status,
      lane: row.lane, reviewState: row.review_state, sections: row.sections,
      sourceSnapshot: row.source_snapshot, body: row.body ?? undefined, headline: row.headline })),
  { planet, sign, activeInstant });
  const active = rows.find(row => row.status === "LIVE" && liveIds.has(row.id)
    && selected?.sourceKeys.includes(row.content_key)) ?? null;
  const edition = skyArticleEditionRecord((active?.sections as { skyArticleEdition?: unknown } | null)?.skyArticleEdition);
  const seasonal = active ? approvedSkySeasonFallback(active) : null;
  const window = edition ? { from: edition.validFrom, to: edition.validTo }
    : seasonal ? { from: new Date(seasonal.start).toISOString().slice(0, 10), to: new Date(seasonal.end).toISOString().slice(0, 10) } : null;
  const pending = rows.filter(row => row.status === "DRAFT"
    && row.event_type === "sky-article-edition-revision")
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
  const sharedKeys = new Set(sharedSkyPlacementKeys(planet, sign));
  const fallback = [...sharedKeys].flatMap(key => {
    const candidates = rows.filter(row => row.content_key === key
      && !(row.status === "ARCHIVED" && row.review_state === "published-revision"))
      .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
    const selected = candidates.find(row => liveIds.has(row.id)) ?? candidates[0];
    return selected ? [selected] : [];
  });
  return { active, window, pending, fallback };
}
