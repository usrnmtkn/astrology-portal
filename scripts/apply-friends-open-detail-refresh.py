from pathlib import Path

# ManualChartsPanel: restore a personal-transit detail from its canonical
# Friends route whenever the panel mounts, and make transit summaries react
# to runtime content-version changes.
path = Path('apps/web/src/features/friends/ManualChartsPanel.tsx')
text = path.read_text()
text = text.replace(
    '  useMemo,\n  useState,',
    '  useMemo,\n  useRef,\n  useState,',
    1
)
text = text.replace(
    '  const [socialFriends, setSocialFriends] = useState<ConnectedSocialFriend[]>([]);',
    '  const friendRouteDetailRefreshKeyRef = useRef("");\n  const [socialFriends, setSocialFriends] = useState<ConnectedSocialFriend[]>([]);',
    1
)
old_deps = '  }, [currentSky, relationshipGeneratedContent, selectedChart, selectedFriendTransits]);'
new_deps = '  }, [currentSky, fallbackArchitectureV3Version, relationshipGeneratedContent, selectedChart, selectedFriendTransits]);'
if old_deps not in text:
    raise SystemExit('Personal transit group dependency anchor not found')
text = text.replace(old_deps, new_deps, 1)

anchor = '''  const openFriendTransitById = (transitId: string) => {
    const transit = selectedFriendTransits.find((candidate) => candidate.id === transitId);

    if (transit) {
      openFriendTransitDetail(transit);
    }
  };
'''
if anchor not in text:
    raise SystemExit('openFriendTransitById anchor not found')
addition = anchor + '''
  useEffect(() => {
    const routeState = friendsRouteStateFromUrl();
    if (
      !routeState?.detail
      || routeState.view !== "transits"
      || routeState.chartId !== selectedChart?.id
      || !currentSky
    ) {
      return;
    }

    const prefix = "transit-";
    if (!routeState.detail.startsWith(prefix)) {
      return;
    }

    const routedTransitId = routeState.detail.slice(prefix.length);
    const transit = selectedFriendTransits.find((candidate) => (
      normalizeContentIdPart(candidate.id) === routedTransitId
    ));
    if (!transit) {
      return;
    }

    const refreshKey = [
      routeState.chartId,
      routeState.detail,
      fallbackArchitectureV3Version,
      currentSky.generatedAt
    ].join(":");
    if (friendRouteDetailRefreshKeyRef.current === refreshKey) {
      return;
    }

    friendRouteDetailRefreshKeyRef.current = refreshKey;
    openFriendTransitDetail(transit);
  }, [
    currentSky,
    fallbackArchitectureV3Version,
    selectedChart?.id,
    selectedFriendTransits
  ]);
'''
text = text.replace(anchor, addition, 1)
path.write_text(text)

# App: track live dashboard-overlay installation separately from unrelated local
# fallback bundle changes. If a Friends detail is already open when live content
# arrives, release the stored snapshot once; ManualChartsPanel remounts and rebuilds
# that routed detail against the updated runtime.
path = Path('apps/web/src/App.tsx')
text = path.read_text()
state_anchor = '  const [fallbackArchitectureV3Version, setFallbackArchitectureV3Version] = useState(0);'
if state_anchor not in text:
    raise SystemExit('fallback architecture state anchor not found')
text = text.replace(
    state_anchor,
    state_anchor + '\n  const [fallbackDashboardOverlayVersion, setFallbackDashboardOverlayVersion] = useState(0);',
    1
)
ref_anchor = '  const fallbackDashboardHydrationRequestedRef = useRef(false);'
if ref_anchor not in text:
    raise SystemExit('fallback dashboard ref anchor not found')
text = text.replace(
    ref_anchor,
    ref_anchor + '\n  const friendDetailOverlayRefreshKeyRef = useRef("");',
    1
)
install_anchor = '''        installFallbackArchitectureV3Bundle(bundle);
        setFallbackArchitectureV3Version((version) => version + 1);'''
if install_anchor not in text:
    raise SystemExit('dashboard install anchor not found')
text = text.replace(
    install_anchor,
    install_anchor + '\n        setFallbackDashboardOverlayVersion((version) => version + 1);',
    1
)

effect_anchor = '''  useEffect(() => {
    if (!selectedSkyDetail) {
      return;
    }

    setDatePickerOpen(false);'''
if effect_anchor not in text:
    raise SystemExit('selected detail UI effect anchor not found')
refresh_effect = '''  useEffect(() => {
    const routePath = selectedSkyDetail?.routePath;
    if (!fallbackDashboardOverlayVersion || !routePath?.startsWith("friends?")) {
      return;
    }

    const refreshKey = `${routePath}:${fallbackDashboardOverlayVersion}`;
    if (friendDetailOverlayRefreshKeyRef.current === refreshKey) {
      return;
    }

    friendDetailOverlayRefreshKeyRef.current = refreshKey;
    setSelectedSkyDetail(null);
  }, [fallbackDashboardOverlayVersion, selectedSkyDetail?.routePath]);

'''
text = text.replace(effect_anchor, refresh_effect + effect_anchor, 1)
path.write_text(text)

# Source contract for the specific race seen in production: Content Studio live
# hydration succeeds after a Friends transit detail has already been rendered.
path = Path('scripts/test-friends-live-detail-refresh.mjs')
path.write_text(r'''#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(root, "apps/web/src/App.tsx"), "utf8");
const panel = fs.readFileSync(path.join(root, "apps/web/src/features/friends/ManualChartsPanel.tsx"), "utf8");

assert.match(
  app,
  /installFallbackArchitectureV3Bundle\(bundle\);[\s\S]{0,180}setFallbackArchitectureV3Version[\s\S]{0,180}setFallbackDashboardOverlayVersion/u,
  "Installing a live Content Studio core overlay must publish a distinct overlay generation."
);
assert.match(
  app,
  /routePath = selectedSkyDetail\?\.routePath[\s\S]{0,500}routePath\?\.startsWith\("friends\?"\)[\s\S]{0,500}setSelectedSkyDetail\(null\)/u,
  "An already-open Friends detail must be released after a newer live overlay installs so it cannot remain a frozen pre-hydration snapshot."
);
assert.match(
  panel,
  /friendsRouteStateFromUrl\(\)[\s\S]{0,1000}routeState\.detail\.startsWith\(prefix\)[\s\S]{0,1000}openFriendTransitDetail\(transit\)/u,
  "Friends must rebuild a routed personal-transit detail when the panel remounts."
);
assert.match(
  panel,
  /\[currentSky, fallbackArchitectureV3Version, relationshipGeneratedContent, selectedChart, selectedFriendTransits\]/u,
  "Friends personal-transit summaries must recompute when the fallback runtime changes."
);

console.log("Friends live detail refresh contract passed.");
''')

path = Path('package.json')
text = path.read_text()
old = 'node scripts/test-fallback-dashboard-live-overlay.mjs && node scripts/test-fallback-refresh-wiring.mjs'
new = 'node scripts/test-fallback-dashboard-live-overlay.mjs && node scripts/test-friends-live-detail-refresh.mjs && node scripts/test-fallback-refresh-wiring.mjs'
if old not in text:
    raise SystemExit('content test insertion anchor not found')
path.write_text(text.replace(old, new, 1))
