import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const panelSource = fs.readFileSync("apps/web/src/features/friends/ManualChartsPanel.tsx", "utf8");
const transitsSource = fs.readFileSync("apps/web/src/features/friends/FriendTransitsTab.tsx", "utf8");
const briefSource = fs.readFileSync("apps/web/src/features/friends/friendTransitsBrief.ts", "utf8");
const serviceSource = fs.readFileSync("apps/web/src/services/userGeneratedContent.ts", "utf8");
const apiSource = fs.readFileSync("api/generate-user-content.ts", "utf8");
const friendApiSource = fs.readFileSync("api/generate-friend-transit-reading.ts", "utf8");
const friendGenerationSource = fs.readFileSync("api/_lib/friend-report-generation.ts", "utf8");
const friendLifecycleSource = fs.readFileSync("api/_lib/friend-report-lifecycle.ts", "utf8");
const friendPlaceholderSource = fs.readFileSync("api/_lib/friend-report-placeholder.ts", "utf8");
const surfaceMigrationSource = fs.readFileSync(
  "apps/web/supabase/migrations/20260906190000_add_friends_user_generated_surface.sql",
  "utf8"
);

assert.match(panelSource, /friendTransitReadingSelectionKeyRef\.current = friendTransitReadingSelectionKey/u);
assert.equal(
  (panelSource.match(/friendTransitReadingSelectionKeyRef\.current !== requestSelectionKey/gu) ?? []).length,
  2,
  "Both success and error paths must discard stale friend/date responses."
);
assert.match(
  briefSource,
  /personalTransitHasGenerationEvidence[\s\S]*evidence\.contentKeys\.some/u,
  "The client brief must enforce the same traceable evidence requirement as the backend request lock."
);
assert.match(
  serviceSource,
  /subjectType === "friend_transit_reading"[\s\S]{0,160}query\.in\("status", \["DRAFT", "REVIEWED", "LIVE"\]\)/u,
  "A successfully generated Friends DRAFT must survive a refresh."
);
assert.match(
  serviceSource,
  /row\?\.body\?\.trim\(\)[\s\S]{0,220}waitForFriendReportByIdentity/u,
  "A durable empty placeholder must stay in Preparing instead of rendering as a finished report."
);
assert.match(serviceSource, /\/api\/friend-report-status/u);
assert.match(serviceSource, /generation_pending/u);
assert.match(
  serviceSource,
  /request\.subjectType === "friend_transit_reading"[\s\S]{0,180}"\/api\/generate-friend-transit-reading"/u,
  "Friends paid readings must use the dedicated short-reading endpoint."
);
assert.match(
  transitsSource,
  /loadUserGeneratedInterpretation\(\{[\s\S]{0,260}subjectType:\s*"friend_transit_reading"[\s\S]{0,260}targetDate:\s*persistedIdentity\.targetDate/u,
  "The Friends card must hydrate an existing saved reading when the page is refreshed."
);
assert.match(
  transitsSource,
  /contentKey:\s*`friend-transit-reading\/\$\{subjectId\}\/\$\{targetDate\}`/u,
  "Refresh hydration must use the same friend/date content key as generation."
);
assert.match(
  transitsSource,
  /const effectiveReading = reading \?\? \(readingStatus === "idle" \? persistedReading : null\)/u,
  "A restored saved reading must become the displayed paid reading while parent generation state is idle."
);

assert.match(apiSource, /const locked = friendTransitReadingRequestLock\(\{/u);
assert.match(apiSource, /input\.status = "DRAFT"/u);
assert.match(apiSource, /input\.allowQualityFallback = false/u);
assert.match(apiSource, /requestSubjectType === "friend_transit_reading"[\s\S]{0,220}This paid reading is currently unavailable/u);

assert.match(friendGenerationSource, /export const FRIEND_TRANSIT_READING_PROVIDER_SCHEMA/u);
assert.match(friendGenerationSource, /required: \["headline", "tldr", "summary", "body"\]/u);
assert.doesNotMatch(friendGenerationSource, /maxItems\s*:/u, "The live Friends provider schema must not use unsupported array-size constraints.");
assert.doesNotMatch(friendGenerationSource, /type:\s*"null"/u, "The live Friends provider schema must not require null-only article fields.");
assert.match(friendGenerationSource, /validateFriendTransitReadingDraft\(\{ draft, brief, expectedHeadline \}\)/u);
assert.match(friendGenerationSource, /validationProfile:\s*"friends-transit"[\s\S]{0,120}family:\s*"friend-transit-reading"[\s\S]{0,120}register:\s*"third_person"/u);
assert.match(friendGenerationSource, /processClaimedFriendReportJob/u);
assert.match(friendGenerationSource, /retryFriendReportJob/u);
assert.match(friendGenerationSource, /\["DRAFT", "REVIEWED", "LIVE"\]\.includes\(existing\.status\)/u, "A saved paid reading must be reused instead of regenerated.");

const placeholderIndex = friendApiSource.indexOf("ensureFriendReportPlaceholder");
const processIndex = friendApiSource.indexOf("claimAndProcessFriendReportJob");
assert.ok(placeholderIndex >= 0 && processIndex > placeholderIndex, "The durable report placeholder must be persisted before model work begins.");
assert.match(friendApiSource, /friendReportEntitlementGrantsAccess/u);
assert.match(friendApiSource, /errorType:\s*"payment_required"/u);
assert.match(friendApiSource, /status\s*\(res, 202|sendJson\(res, 202/u);
assert.match(friendApiSource, /console\.error\("generate-friend-transit-reading failed", error\)/u);
assert.match(friendApiSource, /errorType:\s*"paid_reading_unavailable"[\s\S]{0,120}This paid reading is currently unavailable/u);
assert.doesNotMatch(friendApiSource, /error:\s*error instanceof Error \? error\.message/u, "Provider details must not be returned to the customer.");
assert.match(friendLifecycleSource, /friendReportEntitlementGrantsAccess/u);
assert.match(friendLifecycleSource, /billingMode === "free_test"/u);
assert.match(friendLifecycleSource, /entitlement\.source === "stripe"/u, "A free-test entitlement must not bypass Stripe mode.");
assert.match(friendPlaceholderSource, /body:\s*""/u);
assert.match(friendPlaceholderSource, /ignoreDuplicates:\s*true/u);
assert.match(
  surfaceMigrationSource,
  /user_generated_interpretations_surface_check[\s\S]{0,260}'friends'/u,
  "The user-generated content surface constraint must allow Friends readings to persist."
);

const server = await createServer({
  root: "./apps/web",
  configFile: false,
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});

try {
  const { FriendTransitsTab } = await server.ssrLoadModule(
    "/src/features/friends/FriendTransitsTab.tsx"
  );
  const { buildFriendTransitsBrief } = await server.ssrLoadModule(
    "/src/features/friends/friendTransitsBrief.ts"
  );

  const validTransit = {
    id: "mars-moon",
    title: "Mars trine Moon",
    durationLabel: "A few days",
    rangeLabel: "Sep 5-8",
    timingLabel: "Active now",
    summary: "Alex can act on what they feel with less friction.",
    orb: "1°",
    detailAvailable: true,
    evidence: {
      transitPlanet: "Mars",
      transitSign: "Aries",
      aspect: "trine",
      natalPoint: "Moon",
      natalSign: "Sagittarius",
      natalHouse: 7,
      direction: "applying",
      score: 80,
      significance: "major",
      timingBonuses: [],
      contentKeys: ["authored/transit-aspect/mars/moon/soft"]
    }
  };

  const brief = buildFriendTransitsBrief({
    friendName: "Alex",
    dateLabel: "Today",
    personalTransitGroups: [{ key: "short", label: "Short-term themes", transits: [validTransit] }],
    bondTransits: [],
    houseTransits: [],
    dailyForecast: null,
    dailyDoItems: [],
    dailyDontItems: [],
    patternItems: []
  });

  const mixedEvidenceBrief = buildFriendTransitsBrief({
    friendName: "Social Friend",
    dateLabel: "Today",
    personalTransitGroups: [{
      key: "short",
      label: "Short-term themes",
      transits: [
        { ...validTransit, id: "contentless-transit", evidence: { ...validTransit.evidence, contentKeys: [] } },
        validTransit
      ]
    }],
    bondTransits: [],
    houseTransits: [],
    dailyForecast: null,
    dailyDoItems: [],
    dailyDontItems: [],
    patternItems: []
  });
  assert.equal(mixedEvidenceBrief.primaryThemes.length, 1, "Contentless display transits must not poison an otherwise valid Friends generation brief.");
  assert.equal(mixedEvidenceBrief.primaryThemes[0]?.id, "mars-moon");

  const contentlessOnlyBrief = buildFriendTransitsBrief({
    friendName: "Social Friend",
    dateLabel: "Today",
    personalTransitGroups: [{
      key: "short",
      label: "Short-term themes",
      transits: [{ ...validTransit, id: "contentless-transit", evidence: { ...validTransit.evidence, contentKeys: [] } }]
    }],
    bondTransits: [],
    houseTransits: [],
    dailyForecast: null,
    dailyDoItems: [],
    dailyDontItems: [],
    patternItems: []
  });
  assert.equal(contentlessOnlyBrief.primaryThemes.length, 0);
  assert.equal(contentlessOnlyBrief.hasAnyTransit, false, "An impossible request must fail closed before it reaches the paid-reading endpoint.");

  const baseProps = {
    brief,
    readingAvailable: true,
    onGenerateReading() {},
    onOpenBondTransit() {},
    onOpenHouseTransit() {},
    onOpenPersonalTransit() {},
    patternTimingOverrides: {}
  };

  const idle = renderToStaticMarkup(React.createElement(FriendTransitsTab, baseProps));
  assert.match(idle, /What&#x27;s going on with Alex right now\?/u);
  assert.match(idle, /Paid reading/u);
  assert.match(idle, /Generate reading/u);
  assert.doesNotMatch(idle, /Purchase access|Unlock this reading/u);

  const loading = renderToStaticMarkup(React.createElement(FriendTransitsTab, { ...baseProps, readingStatus: "loading" }));
  assert.match(loading, /Preparing Alex&#x27;s reading/u);

  const ready = renderToStaticMarkup(React.createElement(FriendTransitsTab, {
    ...baseProps,
    readingStatus: "ready",
    reading: {
      headline: "What's going on with Alex right now?",
      summary: "Alex has more room to move with what they already know today.",
      body: "Alex can act on what they feel with less friction.\n\nThe transit cards below remain the source of truth."
    }
  }));
  assert.match(ready, /Alex has more room to move/u);
  assert.match(ready, /The transit cards below remain the source of truth/u);
  assert.doesNotMatch(ready, /Generate reading/u);

  const locked = renderToStaticMarkup(React.createElement(FriendTransitsTab, { ...baseProps, readingStatus: "locked" }));
  assert.match(locked, /This reading is unavailable right now/u);
  assert.match(locked, /Try again/u);
  assert.doesNotMatch(locked, /Anthropic|Claude|API|credit balance|Generation failed|Purchase access|Unlock this reading/iu);

  const unavailable = renderToStaticMarkup(React.createElement(FriendTransitsTab, { ...baseProps, readingAvailable: false }));
  assert.doesNotMatch(unavailable, /Generate reading/u);
} finally {
  await server.close();
}

console.log("Friend transit reading request/render regression passed.");
