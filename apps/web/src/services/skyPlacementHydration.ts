import { loadInitialSkyListFallbackArchitectureV3Bundle, loadSkyPlacementFallbackArchitectureV3Bundle } from "../content/fallbackArchitectureV3Runtime";
import { loadContentStudioLastKnownGoodRows, loadFallbackArchitectureV3DashboardBundle, loadFallbackArchitectureV3SkyPlacementDashboardBundle, prefetchColdSkyArticleRows, prefetchColdSkyPlacementRows } from "./generatedContent";
import { contentPublicationsAvailableOnline, contentPublicationsResolved, refreshContentPublications, refreshSkyListPublications, skyListPublicationsAvailableOnline } from "./contentPublications";
import { missingSkyPlacementPublications, skyPlacementPublicationIdentity } from "./skyPlacementPublicationGuard";
import { initialSkyReaderAvailable } from "./initialSkyReader";
import { isFallbackOnlySkyPlacementPreview } from "../features/sky/skyPlacementPreviewMode";

export { missingSkyPlacementPublications, skyPlacementPublicationIdentity };

type SourceResult = {
  coreBundle: Awaited<ReturnType<typeof loadFallbackArchitectureV3DashboardBundle>>;
  placementBundle: Awaited<ReturnType<typeof loadFallbackArchitectureV3SkyPlacementDashboardBundle>>;
  identity: string;
  scope: "full" | "compiled-guest" | "initial-reader";
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
  initialList: boolean;
  initialReaderKey?: string;
};
const pending = new Map<string, SourcePreparation>();

async function completeSources(selection: string | undefined, entry: SourcePreparation, compiledGuest?: Promise<string | null>): Promise<SourceResult> {
  await entry.setup;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (entry.superseded) throw new Error("Sky publications changed during loading.");
    const identity = skyPlacementPublicationIdentity();
    if (entry.initialList && entry.initialReaderKey && !isFallbackOnlySkyPlacementPreview()
      && skyListPublicationsAvailableOnline() && initialSkyReaderAvailable(entry.initialReaderKey)) {
      return { coreBundle: null, placementBundle: null, identity, scope: "initial-reader" };
    }
    if (entry.initialList && entry.initialReaderKey) await loadInitialSkyListFallbackArchitectureV3Bundle();
    // The actual loader owners share pending reads by selection/generation.
    const core = loadFallbackArchitectureV3DashboardBundle(selection?.startsWith("article:") ? "sky-article" : selection ? "sky-list" : "sky", attempt === 0 ? entry.early : undefined);
    const selected = loadFallbackArchitectureV3SkyPlacementDashboardBundle(selection, attempt === 0 ? entry.selected : undefined, entry.initialList);
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
export function prepareSkyPlacementSources(selection?: string, options?: { compiledGuest?: Promise<string | null>; initialList?: boolean; initialReaderKey?: string }) {
  // The list may use a smaller local source package. A full reader must never
  // inherit that readiness, even when both callers select the same placements.
  const key = `${options?.initialList ? `initial-list:${options.initialReaderKey ?? "fallback"}:` : ""}${selection ?? "all"}`, identity = skyPlacementPublicationIdentity();
  let entry = pending.get(key);
  if (entry?.epoch && entry.epoch !== identity) {
    entry.superseded = true; entry = undefined;
  }
  if (!entry) {
    const initialList = options?.initialList === true;
    const publications = initialList ? refreshSkyListPublications() : refreshContentPublications();
    const bundled = options?.initialList
      ? options.initialReaderKey ? publications.then(() => initialSkyReaderAvailable(options.initialReaderKey)
        && !isFallbackOnlySkyPlacementPreview() ? false : loadInitialSkyListFallbackArchitectureV3Bundle())
        : loadInitialSkyListFallbackArchitectureV3Bundle()
      : loadSkyPlacementFallbackArchitectureV3Bundle(!selection || selection.startsWith("article:"));
    void bundled.catch(() => { /* Required completions join this rejection. */ });
    entry = { publications, bundled, initialList, initialReaderKey: options?.initialReaderKey, epoch: null, waiters: 0, setup: Promise.resolve() };
    const current = entry;
    current.early = selection?.startsWith("article:") ? prefetchColdSkyArticleRows(publications) : undefined;
    current.setup = publications.then(async () => {
      if (current.superseded) return;
      if (!(initialList ? skyListPublicationsAvailableOnline() : contentPublicationsAvailableOnline())) {
        current.early?.discard(); current.early = undefined;
        current.selected?.discard(); current.selected = undefined;
        await loadContentStudioLastKnownGoodRows();
        if (current.superseded) return;
      }
      if (!(initialList && skyListPublicationsAvailableOnline()) && !contentPublicationsResolved()) throw new Error("Sky publication state is unavailable.");
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
