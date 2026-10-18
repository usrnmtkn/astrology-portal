import { loadSkyPlacementFallbackArchitectureV3Bundle } from "../content/fallbackArchitectureV3Runtime";
import { loadContentStudioLastKnownGoodRows, loadFallbackArchitectureV3DashboardBundle, loadFallbackArchitectureV3SkyPlacementDashboardBundle, prefetchColdSkyArticleRows, prefetchColdSkyPlacementRows } from "./generatedContent";
import { contentPublicationsAvailableOnline, contentPublicationsResolved, refreshContentPublications } from "./contentPublications";
import { missingSkyPlacementPublications, skyPlacementPublicationIdentity } from "./skyPlacementPublicationGuard";

export { missingSkyPlacementPublications, skyPlacementPublicationIdentity };

type SourceResult = {
  coreBundle: Awaited<ReturnType<typeof loadFallbackArchitectureV3DashboardBundle>>;
  placementBundle: Awaited<ReturnType<typeof loadFallbackArchitectureV3SkyPlacementDashboardBundle>>;
  identity: string;
  scope: "full" | "compiled-guest";
};
type SourcePreparation = {
  publications: Promise<void>;
  selected?: ReturnType<typeof prefetchColdSkyPlacementRows>;
  early?: ReturnType<typeof prefetchColdSkyArticleRows>;
  bundled: ReturnType<typeof loadSkyPlacementFallbackArchitectureV3Bundle>;
  setup: Promise<void>;
  full?: Promise<SourceResult>;
  epoch: string | null;
  superseded?: boolean;
  waiters: number;
};
const pending = new Map<string, SourcePreparation>();

async function completeSources(selection: string | undefined, entry: SourcePreparation, compiledGuest?: Promise<string | null>): Promise<SourceResult> {
  await entry.setup;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (entry.superseded) throw new Error("Sky publications changed during loading.");
    const identity = skyPlacementPublicationIdentity();
    // The actual loader owners share pending reads by selection/generation.
    const core = loadFallbackArchitectureV3DashboardBundle(selection?.startsWith("article:") ? "sky-article" : selection ? "sky-list" : "sky", attempt === 0 ? entry.early : undefined);
    const selected = loadFallbackArchitectureV3SkyPlacementDashboardBundle(selection, attempt === 0 ? entry.selected : undefined);
    void selected.catch(() => { /* A guest may not require it; full callers do. */ });
    // Undefined means the selected plane was deliberately not required; null
    // remains a completed full-plane result with no dashboard overlay.
    const requiredSelected = compiledGuest
      ? compiledGuest.then(admitted => admitted === identity && contentPublicationsAvailableOnline() ? undefined : selected)
      : selected;
    const [coreBundle, completedSelected] = await Promise.all([core, requiredSelected, entry.bundled]);
    const subset = completedSelected === undefined && contentPublicationsAvailableOnline();
    const placementBundle = subset ? null : completedSelected === undefined ? await selected : completedSelected;
    if (entry.superseded) throw new Error("Sky publications changed during loading.");
    if (identity !== skyPlacementPublicationIdentity()) continue;
    const missing = missingSkyPlacementPublications(subset ? [coreBundle] : [coreBundle, placementBundle]);
    if (missing.length) throw new Error(`Current Sky publications did not load: ${missing.join(", ")}`);
    return { coreBundle, placementBundle, identity, scope: subset ? "compiled-guest" : "full" };
  }
  throw new Error("Sky publications changed during loading.");
}
function requiredCompletion(key: string, selection: string | undefined, entry: SourcePreparation, compiledGuest?: Promise<string | null>) {
  entry.waiters++;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Only a real full consumer creates this pending completion. A later full
  // consumer joins it even after core settled while selected rows remain held.
  if (!compiledGuest && !entry.full) {
    const full = completeSources(selection, entry).finally(() => {
      if (entry.full === full) entry.full = undefined;
    });
    entry.full = full;
  }
  const completion = compiledGuest ? completeSources(selection, entry, compiledGuest) : entry.full!;
  return Promise.race([completion, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Sky placement content timed out. Please retry.")), 20_000);
  })]).finally(() => {
    clearTimeout(timer);
    if (--entry.waiters === 0) {
      entry.superseded = true;
      entry.early?.discard(); entry.selected?.discard();
      if (pending.get(key) === entry) pending.delete(key);
    }
  });
}

/** One readiness owner, distinct required completions. Transport sharing and
 * retry lifetime belong to the existing generation-scoped loader owners. */
export function prepareSkyPlacementSources(selection?: string, options?: { compiledGuest: Promise<string | null> }) {
  const key = selection ?? "all", identity = skyPlacementPublicationIdentity();
  let entry = pending.get(key);
  if (entry?.epoch && entry.epoch !== identity) {
    entry.superseded = true; entry = undefined;
  }
  if (!entry) {
    const publications = refreshContentPublications();
    const bundled = loadSkyPlacementFallbackArchitectureV3Bundle(!selection || selection.startsWith("article:"));
    void bundled.catch(() => { /* Required completions join this rejection. */ });
    entry = { publications, bundled, epoch: null, waiters: 0, setup: Promise.resolve() };
    const current = entry;
    current.early = selection?.startsWith("article:") ? prefetchColdSkyArticleRows(publications) : undefined;
    current.setup = publications.then(async () => {
      if (current.superseded) return;
      if (!contentPublicationsAvailableOnline()) {
        current.early?.discard(); current.early = undefined;
        current.selected?.discard(); current.selected = undefined;
        await loadContentStudioLastKnownGoodRows();
        if (current.superseded) return;
      }
      if (!contentPublicationsResolved()) throw new Error("Sky publication state is unavailable.");
      current.epoch = skyPlacementPublicationIdentity();
    });
    pending.set(key, current);

  }
  return requiredCompletion(key, selection, entry, options?.compiledGuest);
}
export function prefetchColdSkyPlacementSources(selection?: string) {
  const entry = selection ? pending.get(selection) : undefined;
  if (entry && selection && !entry.selected) entry.selected = prefetchColdSkyPlacementRows(selection, entry.publications);
}
