# Temporary, branch-only patch applicator for the oversized legacy App module.
# Every replacement requires one exact match. Never used on production or main.
from pathlib import Path
import subprocess
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip() == 'chatgpt/ci-and-sky-verification-20260914'
p=Path('apps/web/src/App.tsx')
s=p.read_text()
def rep(a,b):
 global s
 assert s.count(a)==1,(a[:150],s.count(a))
 s=s.replace(a,b)
rep('import { isContentRetired } from "./content/contentPublicationState";', 'import { isContentRetired } from "./content/contentPublicationState";\nimport { prepareSkyPlacementSources, skyPlacementPublicationIdentity } from "./services/skyPlacementHydration";')
rep('  const [skyPlacementFallbackStatus, setSkyPlacementFallbackStatus] = useState<SkyPlacementContentStatus>("idle");', '''  const [skyPlacementLoadStatus, setSkyPlacementFallbackStatus] = useState<SkyPlacementContentStatus>("idle");
  const [skyPlacementResolvedIdentity, setSkyPlacementResolvedIdentity] = useState<string | null>(null);
  // A ledger change invalidates prose during render, before asynchronous effects
  // can install the new source set. A clock tick does not change this identity.
  const skyPlacementFallbackStatus: SkyPlacementContentStatus = skyPlacementLoadStatus === "ready"
    && skyPlacementResolvedIdentity !== skyPlacementPublicationIdentity() ? "loading" : skyPlacementLoadStatus;
  const [skyDetailReadError, setSkyDetailReadError] = useState<string | null>(null);
  const [skyDetailRetry, setSkyDetailRetry] = useState(0);''')
rep('  useEffect(() => {\n    if (\n      !shouldHydrateFallbackDashboardContent({', '''  const placementContentNeeded = shouldLoadSkyPlacementContent({ mode, hasSky: Boolean(sky), detailRoutePath: skyDetailRoutePath });
  useEffect(() => {
    if (
      placementContentNeeded || !shouldHydrateFallbackDashboardContent({''')
rep('  }, [contentRefreshVersion, friendNatalContentRequested, friendRelationshipContentRequests, mode]);\n\n  const placementContentNeeded = shouldLoadSkyPlacementContent({ mode, hasSky: Boolean(sky), detailRoutePath: skyDetailRoutePath });', '  }, [contentRefreshVersion, friendNatalContentRequested, friendRelationshipContentRequests, mode, placementContentNeeded]);')
start=s.index('    setSkyPlacementFallbackStatus("loading");',s.index('const placementContentNeeded ='))
end=s.index('\n    return () => {\n      cancelled = true;\n    };\n  }, [contentRefreshVersion, placementContentNeeded, skyPlacementFallbackRetryKey]);',start)
s=s[:start]+'''    // Keep a fully resolved, unchanged revision visible during revalidation.
    // On first load (or after a publication changes), the view stays in its
    // existing loading skeleton until *all* source planes have resolved.
    setSkyPlacementFallbackStatus(previous => previous === "ready" ? previous : "loading");
    void prepareSkyPlacementSources().then(({ coreBundle, placementBundle, identity }) => {
      if (cancelled) return;
      if (identity !== skyPlacementPublicationIdentity()) throw new Error("Sky sources changed during loading. Please retry.");
      // Commit both overlays in the same task; never announce the bundled
      // passage as ready and replace it later with the Studio passage.
      installFallbackArchitectureV3Bundle(coreBundle);
      installSkyPlacementFallbackArchitectureV3Bundle(placementBundle);
      setFallbackArchitectureV3Version(version => version + 1);
      setFallbackDashboardOverlayVersion(version => version + 1);
      setSkyPlacementResolvedIdentity(identity);
      setSkyPlacementFallbackStatus("ready");
    }).catch(error => {
      if (cancelled) return;
      console.warn("The authoritative Sky placement sources could not load.", error);
      setSkyPlacementFallbackStatus(previous => previous === "ready"
        && skyPlacementResolvedIdentity === skyPlacementPublicationIdentity() ? previous : "error");
    });
''' + s[end:]
rep('''    const awaitPlacementTiming = detailType === "placement"
      && (skyPlacementFallbackStatus !== "ready" || !placementPosition || !placementPosition.transitStart || !placementPosition.transitEnd);''','''    const awaitPlacementTiming = detail.routePath?.startsWith("sky/")
      && (detailType === "placement" || detailType === "retrograde");''')
rep('''    const [, detailType, detailPlanet, detailSign] = decodeSkyRouteParts(detail.routePath ?? "");
    const placementPosition = detailType === "placement" && skyNodeDisplayPositions(sky?.positions ?? [])
      .find(position => skyRoutePartMatches(position.planet, detailPlanet) && skyRoutePartMatches(position.sign, detailSign));''','''    const [, detailType] = decodeSkyRouteParts(detail.routePath ?? "");''')
rep('''        renderPlacement(availableDetailContent);
        renderPlacement(await loadSkyDetailContent(placementSky, availableDetailContent, [], loadLiveGeneratedContentForKeys), true);''','''        renderPlacement(await loadSkyDetailContent(placementSky, availableDetailContent, [], loadLiveGeneratedContentForKeys), true);''')
rep('''        renderAspect(availableDetailContent);
        renderAspect(await loadSkyDetailContent(eventSky, availableDetailContent, [], loadLiveGeneratedContentForKeys), true);''','''        renderAspect(await loadSkyDetailContent(eventSky, availableDetailContent, [], loadLiveGeneratedContentForKeys), true);''')
rep('''    // Keep immediately available copy visible while the matching published rows load.
    if (!calendarEvent) renderDetail(sky, availableDetailContent);''','''    // Keep an already committed article visible, but never paint a newly
    // assembled partial article before its matching published rows resolve.''')
rep('''      if (calendarEvent) renderDetail(detailSky, availableDetailContent);
      const content = await loadSkyDetailContent''','''      const content = await loadSkyDetailContent''')
rep('''    const availableDetailContent = eligibleSkyDetailContent(mergeGeneratedContentMaps(skyGeneratedContent, selectedSkyDetailContentRef.current));''','''    setSkyDetailReadError(null);
    const availableDetailContent = eligibleSkyDetailContent(mergeGeneratedContentMaps(skyGeneratedContent, selectedSkyDetailContentRef.current));''')
for message in ['Requested placement calculation failed.','Dated aspect calculation failed.','Sky detail interpretation failed to load.']:
 old='}).catch(error => { if (!cancelled) console.warn("'+message+'", error); });'
 new='}).catch(error => { if (!cancelled) { console.warn("'+message+'", error); setSkyDetailReadError(skyDetailRoutePath); } });'
 rep(old,new)
rep('''skyPlacementPersonalizationTransits, userProfile?.rising]);\n\n  useEffect''','''skyPlacementPersonalizationTransits, userProfile?.rising, skyDetailRetry]);\n\n  useEffect''')
rep('''    setSkyGeneratedContent(normalizedSkySnapshotContent);

    const aspectContentKeys''','''    setSkyGeneratedContent(previous => eligibleSkyDetailContent(previous));

    const aspectContentKeys''')
rep('''      {selectedSkyDetail ? (
        <>
          {skyPlacementFallbackStatus''','''      {selectedSkyDetail && (!/^sky\\/(?:placement|retrograde)\\//u.test(skyDetailRoutePath ?? "")
        || skyPlacementFallbackStatus === "ready") ? (
        <>
          {skyPlacementFallbackStatus''')
rep('''            : <FeatureLoadingFallback />
      ) : (
        <>
          <section className''','''            : skyDetailReadError === skyDetailRoutePath
              ? <PageLoadError message="The placement reading could not load. Please try again." onRetry={() => setSkyDetailRetry(value => value + 1)} />
              : <FeatureLoadingFallback />
      ) : (
        <>
          <section className''')
rep('''          const rowSummary = normalizedSurfacePreview(
            normalizeSkyPlacementSurface(''','''          const placementReady = contentStatus === "ready" && Boolean(position.transitStart && position.transitEnd);
          const rowSummary = placementReady ? normalizedSurfacePreview(
            normalizeSkyPlacementSurface(''')
rep('''          );
          const descriptionState = skyPlacementDescriptionState(rowSummary, contentStatus);''','''          ) : "";
          const descriptionState = skyPlacementDescriptionState(rowSummary,
            contentStatus === "ready" && !placementReady ? "loading" : contentStatus);''')
rep('                  {!isSkyLoading && sky && mode === "guest" && (', '''                  {!isSkyLoading && sky && skyPlacementFallbackStatus === "error" && (
                    <PageLoadError message="The placement readings could not load. Please try again."
                      onRetry={() => setSkyPlacementFallbackRetryKey(value => value + 1)} />
                  )}
                  {!isSkyLoading && sky && mode === "guest" && (''')
p.write_text(s)
p=Path('apps/web/src/features/sky/skyPlacementContentState.ts')
s=p.read_text().replace('(mode === "guest" || mode === "member" || mode === "calendar")','(mode === "guest" || mode === "member")')
s=s.replace('  if (description?.trim()) {','  if (contentStatus === "loading" || contentStatus === "idle") return "loading" as const;\n  if (description?.trim()) {').replace('return contentStatus === "loading" ? "loading" as const : "empty" as const;', 'return "empty" as const;')
p.write_text(s)
p=Path('scripts/test-sky-placement-loading-system.mjs')
p.write_text(p.read_text().replace('skyPlacementDescriptionState("Approved copy", "loading"), "ready"','skyPlacementDescriptionState("Approved copy", "loading"), "loading"'))
p=Path('apps/web/src/services/skyDetailContent.ts')
s=p.read_text().replace('import { publicationAllowsContent }','import { contentPublication, publicationAllowsContent }')
s=s.replace('  if (!missing.length) return retained.size === existing.size ? existing : retained;', '''  const complete = (content: Map<string, LiveGeneratedContent>) => {
    const unresolved = keys.filter(key => {
      const publication = contentPublication(key);
      if (publication?.state !== "live") return false;
      const row = content.get(key);
      return !row || !publicationAllowsContent(key, row.id, row.updatedAt, row.targetDate);
    });
    if (unresolved.length) throw new Error("The current article publication could not load.");
    return content;
  };
  if (!missing.length) return complete(retained.size === existing.size ? existing : retained);''')
s=s.replace('return new Map([...retained, ...incoming]);','return complete(new Map([...retained, ...incoming]));').replace('    return retained;','    return complete(retained);')
p.write_text(s)
p=Path('scripts/test-sky-detail-content.mts')
s=p.read_text().replace('const staleOffline = await loadSkyDetailContent(facts, stale, [], async () => { throw new Error("offline fixture"); });\nassert.equal(staleOffline.has(key), false, "An offline refresh cannot retain a superseded row.");', '''await assert.rejects(
  loadSkyDetailContent(facts, stale, [], async () => { throw new Error("offline fixture"); }),
  /current article publication/i,
  "An unavailable authoritative row must reject a partial article, not reveal older fallback prose."
);''')
p.write_text(s)
