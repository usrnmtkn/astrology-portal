#!/usr/bin/env node
import fs from "node:fs";

function replaceExact(source, from, to, label, expectedCount = 1) {
  const count = source.split(from).length - 1;
  if (count !== expectedCount) throw new Error(`${label}: expected ${expectedCount} matches, found ${count}`);
  return source.split(from).join(to);
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`${label}: markers not found`);
  if (source.indexOf(startMarker, start + 1) >= 0) throw new Error(`${label}: start marker is not unique`);
  return source.slice(0, start) + replacement + source.slice(end);
}

const manualPath = "apps/web/src/features/friends/ManualChartsPanel.tsx";
let manual = fs.readFileSync(manualPath, "utf8");
manual = replaceExact(
  manual,
  '  fallbackV3ApprovalLevelForContentKey,\n  normalizeAspect as normalizeFallbackV3Aspect,',
  '  fallbackV3ApprovalLevelForContentKey,\n  fallbackV3HookBody,\n  normalizeAspect as normalizeFallbackV3Aspect,',
  "ManualChartsPanel fallbackV3HookBody import"
);
manual = replaceExact(
  manual,
  'import { natalChartHasCompletePlacements } from "../../services/natalChartCompleteness";\nimport {\n  selectPairDailyDriver,',
  'import { natalChartHasCompletePlacements } from "../../services/natalChartCompleteness";\nimport {\n  betweenYouTwoV2BondReading,\n  betweenYouTwoV2SharedMoonReading\n} from "../../services/betweenYouTwoV2";\nimport {\n  selectPairDailyDriver,',
  "ManualChartsPanel V2 service import"
);
manual = replaceExact(
  manual,
  '          id: `${group.key}-${group.activationId}`,\n          effectFamily: bondEffectFamily(group.transiting, group.aspect) as "soft" | "hard",',
  '          id: `${group.key}-${group.activationId}`,\n          endpointOwner: group.endpointOwner,\n          effectFamily: bondEffectFamily(group.transiting, group.aspect) as "soft" | "hard",',
  "active bond endpoint owner"
);

const v2Selection = `  const selectedPairDaily = useMemo(() => {
    if (
      !friendProfileWork.compatibility
      || !relationshipComparisonIsSelf
      || !currentSky
      || !profileNatalSky
      || !selectedChart
      || !selectedFriendReadyNatalChart
      || selectedChartIsEvent
    ) {
      return null;
    }

    const isoDate = currentSky.generatedAt.slice(0, 10);
    const dateLabel = formatPairDailyDate(isoDate);
    const readerChartId = profile.charts[0]?.id ?? profile.id;
    const pairVariant = stablePairDailyVariant(readerChartId, selectedChart.id, isoDate);
    const readerDriver = pairDailyDriver(
      currentSky,
      profileNatalSky,
      pairVariant,
      profile.charts[0]?.birthTime === "Time unknown"
    );
    const friendDriver = pairDailyDriver(
      currentSky,
      selectedFriendReadyNatalChart,
      pairVariant,
      selectedChart.birthTimeUnknown
    );
    const readerContext = readerDriver
      ? fallbackV3HookBody(pairDailyClauseKey(readerDriver), "you").trim() || null
      : null;
    const friendContext = friendDriver
      ? fallbackV3HookBody(pairDailyClauseKey(friendDriver), "they").trim() || null
      : null;
    const selectedBondTransit = selectedBondTransitCards[0];

    if (selectedBondTransit) {
      return betweenYouTwoV2BondReading({
        dateLabel,
        family: selectedBondTransit.effectFamily,
        transiting: selectedBondTransit.transitPlanet,
        direction: selectedBondTransit.endpointOwner === "reader" ? "you" : "they",
        friendName: selectedChart.displayName,
        primaryBondTransitId: selectedBondTransit.id,
        readerContext,
        friendContext
      });
    }

    const moon = currentSky.positions.find((position) => position.planet === "Moon") ?? null;
    const element = moon ? pairDailyMoonElement(moon.sign) : null;
    if (!element || readerDriver?.kind !== "aspect" || friendDriver?.kind !== "aspect") {
      return null;
    }

    return betweenYouTwoV2SharedMoonReading({
      dateLabel,
      element,
      readerContext,
      friendContext
    });
  }, [
    currentSky,
    fallbackArchitectureV3Version,
    friendProfileWork.compatibility,
    profile.charts,
    profile.id,
    profileNatalSky,
    relationshipComparisonIsSelf,
    selectedBondTransitCards,
    selectedChart,
    selectedChartIsEvent,
    selectedFriendReadyNatalChart
  ]);
`;
manual = replaceBetween(
  manual,
  '  const selectedPairDailySelection = useMemo(() => {',
  '  const selectedFriendTransitAspectLines = useMemo(() => (',
  v2Selection,
  "replace V1 Pair Daily composition with V2 relationship-first selection"
);
fs.writeFileSync(manualPath, manual);

const compatibilityPath = "apps/web/src/features/friends/CompatibilityTab.tsx";
let compatibility = fs.readFileSync(compatibilityPath, "utf8");
compatibility = replaceExact(
  compatibility,
  'import { zodiacAssetHref, zodiacSignIconFiles } from "../../components/charts/chartAssets";\n',
  'import { zodiacAssetHref, zodiacSignIconFiles } from "../../components/charts/chartAssets";\nimport type { BetweenYouTwoV2Daily } from "../../services/betweenYouTwoV2";\n',
  "CompatibilityTab V2 type import"
);
compatibility = replaceExact(
  compatibility,
  '  daily?: { body: string; dateLabel: string } | null;',
  '  daily?: BetweenYouTwoV2Daily | null;',
  "CompatibilityTab daily prop"
);
const oldDaily = `        {daily ? (
          <section className="daily-horoscope-summary friend-daily-forecast" aria-label={\`Today - \${daily.dateLabel}\`}>
            <span className="eyebrow section-label friend-section-label">Today - {daily.dateLabel}</span>
            <p>{daily.body}</p>
          </section>
        ) : null}
`;
const newDaily = `        {daily ? (
          <section className="daily-horoscope-summary friend-daily-forecast" aria-label={\`Between you two - \${daily.dateLabel}\`}>
            <span className="eyebrow section-label friend-section-label">Between you two · Today - {daily.dateLabel}</span>
            <h3 className="friend-daily-forecast__headline">{daily.headline}</h3>
            <p>{daily.body}</p>
            {daily.readerContext || daily.friendContext ? (
              <div className="friend-daily-forecast__context">
                <span className="eyebrow section-label friend-section-label">What each of you is carrying today</span>
                {daily.readerContext ? <p><strong>You:</strong> {daily.readerContext}</p> : null}
                {daily.friendContext ? <p><strong>{friendName}:</strong> {daily.friendContext}</p> : null}
              </div>
            ) : null}
            {daily.move ? (
              <div className="friend-daily-forecast__move">
                <span className="eyebrow section-label friend-section-label">One useful move</span>
                <p>{daily.move}</p>
              </div>
            ) : null}
          </section>
        ) : null}
`;
compatibility = replaceExact(compatibility, oldDaily, newDaily, "CompatibilityTab V2 reader hierarchy");
fs.writeFileSync(compatibilityPath, compatibility);

const mapPath = "apps/admin/src/writingSurfaceSourceMap.ts";
let map = fs.readFileSync(mapPath, "utf8");
const oldMap = `  {
    id: "friends-pair-daily",
    surface: "Friends: Today Between You Two",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["daily opener", "your daily clause", "friend daily clause", "shared bridge", "optional closing advice"],
    visibleLayerOrder: ["source-grounded"],
    currentRenderPath: "ManualChartsPanel calculates each person's daily driver and the shared Moon or bond context, then renderPairDaily fills reviewed pair-daily hooks. Every displayed prose span retains its fallback-hook source key.",
    risk: "Planet, aspect, house, Moon element, and date remain calculated facts. Editors must change the reviewed hook wording without hard-coding those facts into reusable rows.",
    nextAction: "Use the Friends pair-daily source browser, edit an atomic hook, and verify both direct-reader and friend voice in the reader preview.",
    sources: [
      { label: "ManualChartsPanel.tsx", path: "apps/web/src/features/friends/ManualChartsPanel.tsx", role: "renderer" },
      { label: "pairDaily.ts", path: "apps/web/src/services/pairDaily.ts", role: "renderer" },
      { label: "pair-daily-frames-v1.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-frames-v1.json", role: "source-grounded" },
      { label: "pair-daily-clauses-v1.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-clauses-v1.json", role: "source-grounded" }
    ]
  },`;
const newMap = `  {
    id: "friends-pair-daily",
    surface: "Friends: Between You Two V2",
    area: "Friends",
    status: "normalized",
    requiredSlots: ["shared relationship evidence", "headline", "canonical bond body or shared-Moon body", "optional individual context", "optional useful move"],
    visibleLayerOrder: ["source-grounded"],
    currentRenderPath: "ManualChartsPanel selects the top-ranked active bond transit first. BetweenYouTwoV2 resolves only an approved direction-specific headline + canonical owner-approved family body + approved move. If no bond transit exists, an approved shared-Moon note may render. With no shared condition, the daily synthesis is omitted.",
    risk: "V2 approval is directional. Reader-facing headline/move approval must never be copied to an unseen reverse-direction row. Held rows remain visible in Content Studio but excluded from the reader bundle.",
    nextAction: "Review held V2 reader-direction and reverse-direction rows separately in Content Studio. Promote only exact wording the owner has reviewed.",
    sources: [
      { label: "ManualChartsPanel.tsx", path: "apps/web/src/features/friends/ManualChartsPanel.tsx", role: "renderer" },
      { label: "betweenYouTwoV2.ts", path: "apps/web/src/services/betweenYouTwoV2.ts", role: "renderer" },
      { label: "pair-daily-v2-rows.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-v2-rows.json", role: "source-grounded" },
      { label: "bond-effect directional corpus", path: "packages/astro-knowledge/review/bond-effect-directional-copy-v1", role: "source-grounded" },
      { label: "pair-daily-frames-v1.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-frames-v1.json", role: "source-grounded" },
      { label: "pair-daily-clauses-v1.json", path: "apps/web/src/content/fallbackArchitectureV3/source-rows/pair-daily-clauses-v1.json", role: "source-grounded" }
    ]
  },`;
map = replaceExact(map, oldMap, newMap, "writing surface V2 map");
fs.writeFileSync(mapPath, map);

console.log("Patched dark Between You Two V2 reader, Compatibility UI, and Content Studio surface map.");
