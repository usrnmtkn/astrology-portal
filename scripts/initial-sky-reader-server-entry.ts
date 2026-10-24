import { skyListPlacementPreview } from "../apps/web/src/App";
import { skyNodeDisplayPositions } from "../apps/web/src/features/sky/skyHelpers";
import { installContentPublications, publicationAllowsContent, type ContentPublication } from "../apps/web/src/content/contentPublicationState";
import { loadInitialSkyListFallbackArchitectureV3Bundle, installSkyCoreFallbackArchitectureV3Bundle, installSkyPlacementFallbackArchitectureV3Bundle } from "../apps/web/src/content/fallbackArchitectureV3Runtime";
import { packageFallbackArchitectureV3CoreRows, packageHookRowFromRow, isSkyPlacementFallbackPartitionKey } from "../apps/web/src/services/fallbackArchitectureV3CorePackaging";
import { generatedContentMapFromRows, type GeneratedContentRow } from "../apps/web/src/services/generatedContent";
import { skyPlacementSelection, skyPlacementSourceInSelection } from "../apps/web/src/services/skyPlacementSourceScope";
import { isSkyListDashboardRow } from "../apps/web/src/services/skyDashboardScope";
import { skyIngressEssayPublicationKeys } from "../apps/web/src/content/skyIngressEssayReader";
import keys from "../apps/web/src/content/fallbackArchitectureV3/initial-sky-core-keys-v1.json";
import placementManifest from "../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json";
import type { SkySnapshot } from "../apps/web/src/types";

// The shared browser renderer owns mutable public overlay indexes. Serialize
// only their install/render section; request I/O and astronomy stay parallel.
let queue: Promise<void> = Promise.resolve();
const placementKeys = new Set(placementManifest.keys.map(key => key.slice(key.indexOf(":") + 1)));
function selectedSourceKey(sky: SkySnapshot) {
  const selection = skyPlacementSelection(sky.positions);
  return (key: string) => (placementKeys.has(key) || isSkyPlacementFallbackPartitionKey(key)
    || /^sky-placement\/(?:article|retrograde)\//u.test(key)) && skyPlacementSourceInSelection(key, selection);
}
export function requiredInitialSkySourceKeys(sky: SkySnapshot, publications: ContentPublication[]) {
  const selectedKey = selectedSourceKey(sky);
  const editions = new Set(skyNodeDisplayPositions(sky.positions).flatMap(position => skyIngressEssayPublicationKeys(publications, {
    planet: position.planet.toLowerCase().replace(/\s+/gu, "-"), sign: position.sign.toLowerCase()
  })));
  return publications.filter(row => selectedKey(row.content_key) || isSkyListDashboardRow(row) || editions.has(row.content_key))
    .map(row => row.content_key);
}
export function renderInitialSkyReader(sky: SkySnapshot, inputRows: GeneratedContentRow[], publications: ContentPublication[]) {
  const result = queue.then(async () => {
    installContentPublications(publications, "complete-sky-list");
    await loadInitialSkyListFallbackArchitectureV3Bundle();
    const rows = inputRows.filter(row => publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date));
    const core = packageFallbackArchitectureV3CoreRows(rows.filter(row => row.provider === "tldrastro-fallback-architecture-v3" && isSkyListDashboardRow(row)), keys);
    installSkyCoreFallbackArchitectureV3Bundle(core);
    const selectedKey = selectedSourceKey(sky);
    if (publications.some(publication => selectedKey(publication.content_key) && publication.state === "live"
      && publication.row_id && !rows.some(row => row.id === publication.row_id && row.content_key === publication.content_key
        && publicationAllowsContent(row.content_key, row.id, row.updated_at)))) {
      throw new Error("Current Sky publications did not load.");
    }
    const selected = rows.filter(row => selectedKey(row.content_key)).map(packageHookRowFromRow).filter(Boolean);
    installSkyPlacementFallbackArchitectureV3Bundle(selected.length ? {
      transitLib: { authoredCards: [] }, templatesFile: { templates: [] },
      rowsFile: { hookRows: selected as any, vocabularyRows: [] }
    } : null);
    const content = generatedContentMapFromRows(rows);
    const positions = skyNodeDisplayPositions(sky.positions);
    const editions = positions.flatMap(position => skyIngressEssayPublicationKeys(publications, {
      planet: position.planet.toLowerCase().replace(/\s+/gu, "-"), sign: position.sign.toLowerCase()
    }));
    if (editions.some(key => !content.has(key))) throw new Error("Current article editions did not load.");
    const previews = positions.map(position => ({ planet: position.planet, body: skyListPlacementPreview({
      position, displayPositions: positions, aspects: sky.aspects, generatedAt: sky.generatedAt,
      generatedContent: content, locationLatitude: sky.location.latitude, moonEvent: sky.moonEvent
    }) }));
    if (previews.length !== 14 || new Set(previews.map(row => row.planet)).size !== 14 || previews.some(row => !row.body.trim())) {
      throw new Error("Complete initial Sky readings unavailable.");
    }
    return previews;
  });
  queue = result.then(() => undefined, () => undefined);
  return result;
}
