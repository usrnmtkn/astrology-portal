import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { contentSourceRepairPlan } from "../../api/admin/content-source-repair-plans";
import { writingSurfaceAdminAccess, writingSurfaceSourceMap } from "../../apps/admin/src/writingSurfaceSourceMap";
import {
  expectRouteLoadsWithin,
  routeReadyTimeoutMs,
  watchBrowserErrors
} from "./qaRuntimeGuards";

const adminScreenshotDir = path.join("test-results", "content-dashboard-admin-flow");
const unresolvedQueueSource = JSON.parse(readFileSync(path.join(process.cwd(), "packages/astro-knowledge/generated/content-unresolved-queue-v1.json"), "utf8")) as {
  count: number;
  items: Array<{ contentKey: string; reason: string; [key: string]: unknown }>;
  [key: string]: unknown;
};
const unresolvedItems = unresolvedQueueSource.items.map((item) => ({
    ...item,
    surface: item.contentKey.includes("daily-") || item.contentKey.startsWith("daily-glance-variant/")
      ? "Daily Glance"
      : item.contentKey.includes("natal") || item.contentKey.includes("placement")
        ? "Natal / Placements"
        : item.contentKey.includes("lunation") || item.contentKey.includes("eclipse") || item.contentKey.includes("moon-phase")
          ? "Lunations"
          : item.contentKey.includes("sky-") || item.contentKey.includes("transit") || item.contentKey.includes("timing")
            ? "Sky / Transits"
            : "Other"
  }));
const unresolvedRecordsByKey = new Map<string, typeof unresolvedItems>();
unresolvedItems.forEach((item) => unresolvedRecordsByKey.set(item.contentKey, [...(unresolvedRecordsByKey.get(item.contentKey) ?? []), item]));
const completedSourceRepairPlan = contentSourceRepairPlan("fallback-hook/sky-sign-copy/sun/virgo");
if (!completedSourceRepairPlan) throw new Error("Sun in Virgo source-repair fixture is unavailable.");
const sourceRepairFixture = {
  issueId: "5678d2c461d266372d0836503c818b29fccda7726b5595a3a5340dfde2193f7e",
  contentKey: "fallback-hook/sky-sign-copy/sun/virgo",
  surface: "Sky / Transits",
  kind: "source-repair",
  records: [{
    id: "completed-source-repair-fixture",
    contentKey: "fallback-hook/sky-sign-copy/sun/virgo",
    reviewStatus: "approved",
    reason: "known-current-contract-failure",
    sourcePath: "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-placement-owner-approved-fallbacks-v1.json",
    objectPath: "/rows/37",
    surface: "Sky / Transits"
  }],
  repairPlan: completedSourceRepairPlan,
  sourceDecision: null,
  aiRequest: "Investigate the Sun in Virgo source lineage before implementing the governed replacement."
};
const unresolvedQueue = {
  ...unresolvedQueueSource,
  items: unresolvedItems,
  resolutionStoreReady: true,
  issues: [sourceRepairFixture, ...[...unresolvedRecordsByKey.values()].map((records, index) => {
    const contentKey = records[0].contentKey;
    const sourceRepair = records.some((item) => item.reason === "known-current-contract-failure");
    return {
      issueId: String(index).padStart(64, "0"),
      contentKey,
      surface: records[0].surface,
      kind: sourceRepair ? "source-repair" : "editorial-review",
      records,
      repairPlan: sourceRepair ? contentSourceRepairPlan(contentKey) : null,
      sourceDecision: null,
      aiRequest: sourceRepair ? `Repair ${contentKey}` : `Investigate ${contentKey}`
    };
  })]
};
const unresolvedIssueCount = unresolvedQueue.issues.length;
const guidedLunationContentKey = "authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/rising-aquarius/house-2";
const guidedLunationSource = JSON.parse(readFileSync(path.join(
  process.cwd(),
  "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-eclipse-variants-v1.json"
), "utf8")) as { authoredCards: Array<Record<string, unknown>> };
const guidedLunationRecord = guidedLunationSource.authoredCards.find((row) => row.contentKey === guidedLunationContentKey);
if (!guidedLunationRecord || typeof guidedLunationRecord.body !== "string") throw new Error("Guided lunation review fixture is unavailable.");

const adminPages = [
  { nav: "Review Queue", title: "Review Queue", breadcrumb: "Admin / Publish / Review queue", hash: "review-queue" },
  { nav: "Unresolved Content", title: "Unresolved Content", breadcrumb: "Admin / Publish / Unresolved content", hash: "unresolved-content" },
  { nav: "Content Library", title: "Content Library", breadcrumb: "Admin / Write / Content library", hash: "exact-content" },
  { nav: "Sky Write-ups", title: "Sky Write-ups", breadcrumb: "Admin / Write / Sky write-ups", hash: "sky-writeups" },
  { nav: "Articles", title: "Articles", breadcrumb: "Admin / Write / Articles", hash: "articles" },
  { nav: "Compatibility", title: "Compatibility", breadcrumb: "Admin / Write / Compatibility", hash: "compatibility" },
  { nav: "Composite Review", title: "Composite Review", breadcrumb: "Admin / Write / Composite review", hash: "composite-review" },
  { nav: "Composition", title: "Composition Map", breadcrumb: "Admin / Composition / Map", hash: "composition-map" },
  { nav: "Aspect Patterns", title: "Aspect Patterns", breadcrumb: "Admin / Language System / Aspect Patterns", hash: "content/aspect-patterns" }
];

const adminCreateCases = [
  { action: "Create article", hash: "articles", editorHeading: "Create article", eventType: "sky_article", blockType: "essay", contentKey: "article/manual/new-row", headlineLabel: "Article title", bodyLabel: "Article body" },
  { action: "Create content row", hash: "exact-content", editorHeading: "Create saved row", eventType: "essay", blockType: "essay", contentKey: "content/manual/new-row", headlineLabel: "Title / headline", bodyLabel: "Full passage / body" },
  { action: "Create reusable phrase", hash: "vocabulary", editorHeading: "Create reusable phrase", eventType: "vocab", blockType: "vocabulary_phrase", contentKey: "vocab/planets/create-reusable-phrase-qa-row", phraseEditor: true },
  { action: "Create template", hash: "templates", editorHeading: "Create reader-copy template", eventType: "slot-template", blockType: "template", contentKey: "slot-template/manual/new-template", headlineLabel: "Template name", bodyLabel: "Template pattern" },
  { action: "Create fallback hook", hash: "fallback-hooks", editorHeading: "Create fallback passage", eventType: "fallback-hook", blockType: "fallback_hook", contentKey: "fallback-hook/manual/new-hook", headlineLabel: "Editor label", bodyLabel: "Reader copy" }
];

const forbiddenReaderPreviewCopy = /\b(?:Interpretation in review|Notice how this placement asks|puts first impressions, outward style|write a sentence|source framework|sourceSnapshot|templateVersion|Missing VITE|undefined|null|NaN)\b/i;

const now = "2026-07-16T12:00:00.000Z";

const skyReviewHorizonFixture = {
  startDate: "2026-08-22",
  endDate: "2026-11-20",
  snapshotCount: 91,
  calculationMethod: "daily-active-sky-snapshot",
  counts: { occurrences: 2, aspectCandidates: 1, placementCandidates: 1, activeWindows: 2 },
  reviewCounts: { missing_draft: 1, draft_needs_work: 1 },
  generationPlan: {
    status: "authorization_required",
    reusableCandidatesMissingDrafts: 1,
    writerCalls: 1,
    reviewerCalls: 1,
    minimumSuccessfulCalls: 2,
    contentKeys: ["sky.aspect.sun.trine.chiron.leo.taurus"],
    note: "Fixture generation plan."
  },
  occurrences: [
    {
      kind: "aspect",
      contentKey: "sky.aspect.sun.trine.chiron.leo.taurus",
      label: "Sun trine Chiron",
      facts: { a: "sun", b: "chiron", aspect: "trine", signA: "leo", signB: "taurus" },
      activeDates: ["2026-08-22"],
      windows: [{ startDate: "2026-08-22", endDate: "2026-08-22" }],
      reviewStatus: "missing_draft",
      row: null
    },
    {
      kind: "placement",
      contentKey: "sky.placement.base.jupiter.leo",
      label: "Jupiter in Leo",
      facts: { planet: "jupiter", sign: "leo" },
      activeDates: ["2026-08-22"],
      windows: [{ startDate: "2026-08-22", endDate: "2026-11-20" }],
      reviewStatus: "draft_needs_work",
      row: {
        id: "qa-jupiter-leo-candidate",
        content_key: "sky.placement.base.jupiter.leo",
        surface: "sky",
        mode: "feed",
        headline: "Jupiter in Leo",
        summary: null,
        body: "A generated candidate that is not the owner-approved article readers receive.",
        status: "DRAFT",
        block_type: "sky_placement",
        event_type: "collective-placement-card",
        target_date: null,
        sections: [],
        lane: "reference",
        review_state: "needs-review",
        facts: { planet: "jupiter", sign: "leo" },
        source_snapshot: {},
        judge_score: 2,
        judge_gate: "regenerate",
        updated_at: now
      }
    }
  ]
};

const heldSkyAspectDrafts = [
  {
    id: "sky.sun.trine.chiron",
    canonicalId: "sky-aspect/chiron/sun/trine",
    bodyA: "chiron",
    bodyB: "sun",
    aspect: "trine",
    body: "People are telling the story of their worst year and finding out it counts as a credential.",
    authorityClass: "unverified",
    governanceState: "needs-owner-decision",
    surfacePermission: ["doctrine-only"],
    status: "NEEDS_OWNER_DECISION",
    sourcePath: "packages/astro-knowledge/data/points/aspects/sky/four-body-unverified/chiron-sun-trine.json",
    provenance: { sourceKey: "sky.sun.trine.chiron" }
  },
  {
    id: "sky.sun.opposition.north-node",
    canonicalId: "sky-aspect/north_node/sun/opposition",
    bodyA: "north_node",
    bodyB: "sun",
    aspect: "opposition",
    body: "The comeback offer is arriving, and it is excellent, and it points backward.",
    authorityClass: "unverified",
    governanceState: "needs-owner-decision",
    surfacePermission: ["doctrine-only"],
    status: "NEEDS_OWNER_DECISION",
    sourcePath: "packages/astro-knowledge/data/points/aspects/sky/four-body-unverified/north_node-sun-opposition.json",
    provenance: { sourceKey: "sky.sun.opposition.north-node" }
  }
];

const generatedContentRows = [
  {
    id: "qa-sky-row",
    content_key: "sky.placement.sun.cancer",
    surface: "sky",
    mode: "feed",
    status: "LIVE",
    event_type: "sky_placement",
    target_date: "2026-07-16",
    headline: "Sun in Cancer",
    summary: "A reader-ready Sky row that keeps the public preview direct and grounded.",
    body: "The Sun in Cancer brings attention to care, memory, belonging, and the places that help life feel held. Notice what needs protection without turning every feeling into a permanent conclusion.",
    sections: [],
    block_type: "sky_article",
    lane: "serving",
    review_state: "reviewed",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { body: "Sun", sign: "Cancer" },
    knowledge_ids: ["qa-sky-source"],
    source_snapshot: { contentSystem: "authored", contentLevel: "source-grounded", contentType: "sky_article", authoringSource: "qa-fixture" },
    reviewer_notes: "QA fixture row.",
    prompt_version: "qa-admin-flow",
    provider: "qa-fixture",
    model: null,
    reviewed_at: now,
    published_at: now,
    updated_at: now,
    created_at: now
  },
  {
    id: "qa-standalone-article-row",
    content_key: "article/manual/sun-in-cancer",
    surface: "sky",
    mode: "article",
    status: "LIVE",
    event_type: "sky_article",
    target_date: null,
    headline: "Understanding the Sun in Cancer",
    summary: "A standalone article fixture that is deliberately separate from the Sky write-up workflow.",
    body: "This long-form article is available to editorial workflows without duplicating the current Sky placement write-up.",
    sections: [],
    block_type: "essay",
    lane: "serving",
    review_state: null,
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { body: "Sun", sign: "Cancer" },
    knowledge_ids: ["qa-standalone-article-source"],
    source_snapshot: { contentSystem: "authored", contentLevel: "source-grounded", contentType: "article", authoringSource: "qa-fixture" },
    reviewer_notes: "QA standalone article fixture row.",
    prompt_version: "qa-admin-flow",
    provider: "qa-fixture",
    model: null,
    reviewed_at: now,
    published_at: now,
    updated_at: now,
    created_at: now
  },
  {
    id: "qa-visible-moon-row",
    content_key: "sky.placement.moon.virgo",
    surface: "sky",
    mode: "feed",
    status: "LIVE",
    event_type: "sky_placement",
    target_date: "2026-07-16",
    headline: "Moon in Virgo",
    summary: "A visible Moon row for search filter QA.",
    body: "Moon in Virgo keeps the emotional signal practical and specific.",
    sections: [],
    block_type: "sky_article",
    lane: "serving",
    review_state: "reviewed",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { body: "Moon", sign: "Virgo" },
    knowledge_ids: ["qa-moon-source"],
    source_snapshot: { contentSystem: "authored", contentLevel: "source-grounded", contentType: "sky_article", authoringSource: "qa-fixture" },
    reviewer_notes: "QA fixture row.",
    prompt_version: "qa-admin-flow",
    provider: "qa-fixture",
    model: null,
    reviewed_at: now,
    published_at: now,
    updated_at: now,
    created_at: now
  },
  {
    id: "qa-hidden-body-moon-row",
    content_key: "qa/transit/mercury/search-trap",
    surface: "you",
    mode: "feed",
    status: "LIVE",
    event_type: "transit",
    target_date: "2026-07-16",
    headline: "QA Mercury Hidden Body Search Trap",
    summary: "Mercury row whose hidden body mentions the Moon.",
    body: "This hidden body mentions Moon only to prove Content Library search does not return invisible matches.",
    sections: [],
    block_type: "transit",
    lane: "serving",
    review_state: "reviewed",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { planet: "Mercury", house: 2 },
    knowledge_ids: ["qa-mercury-search-trap"],
    source_snapshot: { contentType: "phrasebank", authoringSource: "qa-fixture" },
    reviewer_notes: "QA fixture row.",
    prompt_version: "qa-admin-flow",
    provider: "qa-fixture",
    model: null,
    reviewed_at: now,
    published_at: now,
    updated_at: now,
    created_at: now
  },
  {
    id: "qa-synastry-row",
    content_key: "synastry-ascendant-square-mercury",
    surface: "friends",
    mode: "synastry_aspect",
    status: "REVIEWED",
    event_type: "synastry_aspect",
    target_date: null,
    headline: "Ascendant square Mercury",
    summary: "Authored relationship copy should resolve before emergency fallback.",
    body: "Their presence and the way they carry themselves press against your thinking and how you talk and decide. The useful part is naming the mismatch before either person assumes the other is being careless.",
    sections: [],
    block_type: "synastry_aspect",
    lane: "serving",
    review_state: "reviewed",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { pointA: "Ascendant", pointB: "Mercury", aspect: "square" },
    knowledge_ids: ["A-ascendant_B-mercury_square"],
    source_snapshot: null,
    reviewer_notes: "QA fixture row.",
    prompt_version: "qa-admin-flow",
    provider: "qa-fixture",
    model: null,
    reviewed_at: now,
    published_at: null,
    updated_at: now,
    created_at: now
  },
  {
    id: "qa-compatibility-content-row",
    content_key: "compatibility.sun.aries.libra",
    surface: "relationship",
    mode: "card",
    status: "LIVE",
    event_type: "friends.compatibility.planet-card",
    target_date: null,
    headline: "Sun compatibility / Aries and Libra",
    summary: "Compatibility card copy for an Aries reader and Libra friend.",
    body: "Aries and Libra can learn timing from each other: one starts the motion, the other checks the mutual field before the next step.",
    sections: [],
    block_type: "compatibility_planet_card",
    lane: "serving",
    review_state: "reviewed",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { planet: "sun", readerSign: "aries", otherSign: "libra" },
    knowledge_ids: ["compatibility.sun.aries.libra"],
    source_snapshot: { contentType: "friends.compatibility.planet-card", contentSystem: "authored", contentLevel: "source-grounded", planet: "sun", readerSign: "aries", otherSign: "libra" },
    reviewer_notes: "QA compatibility fixture row.",
    prompt_version: "qa-admin-flow",
    provider: "phrasebank-dashboard-materialization",
    model: null,
    reviewed_at: now,
    published_at: now,
    updated_at: now,
    created_at: now
  },
  {
    id: "qa-compatibility-fallback-row",
    content_key: "fallback-hook/friends.compatibility.planet-card",
    surface: "friends",
    mode: "card",
    status: "REVIEWED",
    event_type: "fallback-hook",
    target_date: null,
    headline: "Compatibility card fallback",
    summary: "Fallback hook for compatibility cards.",
    body: "When no reviewed compatibility card is saved yet, use the simple relationship pattern without inventing intimacy.",
    sections: [],
    block_type: "fallback_template",
    lane: "reference",
    review_state: "reviewed",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { planet: "sun" },
    knowledge_ids: ["fallback-hook/friends.compatibility.planet-card"],
    source_snapshot: { contentType: "template", hook: "friends.compatibility.planet-card", contentLevel: "madlib-fallback" },
    reviewer_notes: "QA compatibility fallback fixture row.",
    prompt_version: "fallback-hook-template-v1",
    provider: "qa-fixture",
    model: null,
    reviewed_at: now,
    published_at: null,
    updated_at: now,
    created_at: now
  },
  {
    id: "qa-compatibility-vocab-row",
    content_key: "vocab/relationship/compatibility-repair",
    surface: "relationship",
    mode: "feed",
    status: "LIVE",
    event_type: "vocab",
    target_date: null,
    headline: "Compatibility repair phrase",
    summary: "Reusable phrase for compatibility repair moments.",
    body: "Name the mismatch without making either person the problem.",
    sections: [],
    block_type: "vocabulary_phrase",
    lane: "reference",
    review_state: "reviewed",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { family: "compatibility", planet: "venus" },
    knowledge_ids: ["vocab/relationship/compatibility-repair"],
    source_snapshot: { contentType: "vocab", bucket: "vocab", contentLevel: "source-grounded", planet: "venus" },
    reviewer_notes: "QA compatibility vocab fixture row.",
    prompt_version: "vocab-v1",
    provider: "qa-fixture",
    model: null,
    reviewed_at: now,
    published_at: now,
    updated_at: now,
    created_at: now
  },
  {
    id: "qa-compatibility-slot-row",
    content_key: "slot-template/compatibility/planet-card",
    surface: "relationship",
    mode: "card",
    status: "REVIEWED",
    event_type: "slot-template",
    target_date: null,
    headline: "Compatibility planet card slot",
    summary: "Template slot for compatibility card assembly.",
    body: "{{readerSign}} and {{otherSign}} meet through {{planetTheme}}.",
    sections: [],
    block_type: "template",
    lane: "reference",
    review_state: "EDITORIAL_REVIEW_REQUIRED",
    evergreen: true,
    evergreen_at: now,
    evergreen_by: "qa",
    facts: { family: "compatibility", planet: "sun" },
    knowledge_ids: ["slot-template/compatibility/planet-card"],
    source_snapshot: { contentType: "template", contentFamily: "friends.compatibility.planet-card", contentLevel: "source-grounded", planet: "sun" },
    reviewer_notes: "QA compatibility slot fixture row.",
    prompt_version: "slot-template-v1",
    provider: "qa-fixture",
    model: null,
    reviewed_at: now,
    published_at: null,
    updated_at: now,
    created_at: now
  }
];

const reviewRecordRows = generatedContentRows.map((row) => ({
  id: row.id,
  source: "global",
  surface: row.surface,
  status: row.status,
  mode: row.mode,
  title: row.headline,
  subtitle: `${row.surface} / ${row.mode}`,
  targetDate: row.target_date,
  contentKey: row.content_key,
  eventType: row.event_type,
  summary: row.summary,
  body: row.body,
  sections: [],
  blockType: row.block_type,
  facts: row.facts,
  knowledgeIds: row.knowledge_ids,
  sourceSnapshot: row.source_snapshot,
  evergreen: row.evergreen,
  evergreenAt: row.evergreen_at,
  evergreenBy: row.evergreen_by,
  reviewerNotes: row.reviewer_notes,
  provider: row.provider,
  model: row.model,
  promptVersion: row.prompt_version,
  updatedAt: row.updated_at,
  rawGlobalRow: row
}));

async function seedAdminApi(
  page: Page,
  options: {
    onGeneratedContentWrite?: (write: { method: string; payload: Record<string, unknown> }) => void;
    onResolutionWrite?: (payload: Record<string, unknown>) => void;
    onSourceDecisionWrite?: (payload: Record<string, unknown>) => void;
    initialSecret?: string;
    expectedSecret?: string;
    generatedRows?: Record<string, unknown>[];
    generatedContentDelayMs?: number;
    generatedContentFailuresBeforeSuccess?: number;
    onGeneratedContentRead?: (url: URL) => void;
  } = {}
) {
  const apiGeneratedContentRows = structuredClone(options.generatedRows ?? generatedContentRows) as Record<string, unknown>[];
  let generatedContentFailuresRemaining = options.generatedContentFailuresBeforeSuccess ?? 0;
  await page.route("https://tldrastro-api-27165565299.us-central1.run.app/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        timestamp: now,
        dependencies: {
          ephemeris: { ok: true, detail: { version: "qa-fixture" } }
        }
      })
    });
  });

  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        timestamp: now,
        dependencies: {
          ephemeris: { ok: true, detail: { version: "qa-fixture" } }
        }
      })
    });
  });

  await page.route("**/api/admin/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (
      options.expectedSecret
      && route.request().headers()["x-content-generation-secret"] !== options.expectedSecret
    ) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized." })
      });
      return;
    }

    if (pathname.endsWith("/review-records")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          surface: url.searchParams.get("surface") ?? "upcomingAspects",
          startDate: url.searchParams.get("startDate") ?? "2026-07-16",
          endDate: url.searchParams.get("endDate") ?? "2026-08-15",
          prompt: null,
          rows: reviewRecordRows,
          counts: { total: reviewRecordRows.length, DRAFT: 0, REVIEWED: 1, LIVE: 1, ARCHIVED: 0, ERROR: 0 }
        })
      });
      return;
    }

    if (pathname.endsWith("/sky-review-horizon")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, horizon: skyReviewHorizonFixture })
      });
      return;
    }

    if (pathname.endsWith("/content-unresolved")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, report: unresolvedQueue })
      });
      return;
    }

    if (pathname.endsWith("/content-unresolved-resolutions")) {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      options.onResolutionWrite?.(payload);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, resolution: payload })
      });
      return;
    }

    if (pathname.endsWith("/content-source-repair-decisions")) {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      options.onSourceDecisionWrite?.(payload);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          decision: {
            decision_id: "a".repeat(64),
            issue_id: payload.issueId,
            content_key: payload.contentKey,
            decision_status: "approved-for-implementation",
            action: payload.action,
            candidate_path: contentSourceRepairPlan(String(payload.contentKey))?.candidatePath,
            candidate_sha256: payload.candidateSha256,
            owner_statement: payload.approvalStatement,
            approved_at: now
          }
        })
      });
      return;
    }

    if (pathname.endsWith("/natal-placement-preview")) {
      const payload = route.request().postDataJSON() as { house?: string; isRetrograde?: boolean; planet?: string; sign?: string };
      const titleCase = (value: string) => value.split("-").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
      const planetLabel = titleCase(payload.planet ?? "sun");
      const signLabel = titleCase(payload.sign ?? "aries");
      const signPart = `Your ${planetLabel} is in ${signLabel}, so the planet-in-sign write-up loads before a house is selected.`;
      const retrogradePart = payload.isRetrograde ? `Because ${planetLabel} is retrograde in the birth chart, the pattern runs inward first.` : "";
      const housePart = payload.house ? [`The ${payload.house} house adds the second placement paragraph.`, retrogradePart].filter(Boolean).join(" ") : null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          rendered: {
            headline: payload.house ? `${planetLabel}${payload.isRetrograde ? " Rx" : ""} in ${signLabel} in the ${payload.house === "1" ? "1st" : `${payload.house}th`} house` : `${planetLabel}${payload.isRetrograde ? " Rx" : ""} in ${signLabel}`,
            parts: [signPart, ...(housePart ? [housePart] : [])],
            partKeys: ["fallback-template/natal.planet-in-sign", ...(housePart ? ["fallback-template/natal.house-context"] : [])],
            body: [signPart, housePart].filter(Boolean).join("\n\n"),
            templateKey: payload.house ? "fallback-template/natal.placement" : "fallback-template/natal.planet-in-sign"
          }
        })
      });
      return;
    }

    if (pathname.endsWith("/generated-content")) {
      const method = route.request().method();
      if (method === "GET" && url.searchParams.get("sourceDrafts") === "sky-aspects") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, rows: heldSkyAspectDrafts })
        });
        return;
      }
      if (method === "POST" || method === "PATCH") {
        const payload = route.request().postDataJSON() as Record<string, unknown>;
        options.onGeneratedContentWrite?.({ method, payload });
        const existingRow = apiGeneratedContentRows.find((row) => row.id === payload.id) ?? generatedContentRows[0];
        if (payload.ownerAction === "approve-package-revision") {
          const existingSections = existingRow.sections && typeof existingRow.sections === "object"
            ? existingRow.sections as Record<string, unknown>
            : {};
          const installedRecord = existingSections.packageRecord && typeof existingSections.packageRecord === "object"
            ? existingSections.packageRecord as Record<string, unknown>
            : {};
          const proposedRecord = existingSections.packageDraft && typeof existingSections.packageDraft === "object"
            ? existingSections.packageDraft as Record<string, unknown>
            : {};
          const promotedRecord = { ...installedRecord, ...proposedRecord, review_status: "approved" };
          const { packageDraft: _discardedProposal, ...remainingSections } = existingSections;
          const publishedRow = {
            ...existingRow,
            status: "LIVE",
            lane: "serving",
            review_state: null,
            body: typeof promotedRecord.body_you === "string"
              ? promotedRecord.body_you
              : typeof promotedRecord.body === "string"
                ? promotedRecord.body
                : existingRow.body,
            sections: { ...remainingSections, packageRecord: promotedRecord },
            facts: { ...(existingRow.facts ?? {}), review_status: "approved" },
            source_snapshot: { ...(existingRow.source_snapshot ?? {}), review_status: "approved" }
          };
          const publishedIndex = apiGeneratedContentRows.findIndex((row) => row.id === publishedRow.id);
          if (publishedIndex >= 0) apiGeneratedContentRows[publishedIndex] = publishedRow;
          else apiGeneratedContentRows.push(publishedRow);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, rows: [publishedRow] })
          });
          return;
        }
        const packageReviewStatus = typeof payload.reviewStatus === "string" ? payload.reviewStatus : null;
        const packageReaderServing = packageReviewStatus === "approved" || packageReviewStatus === "approved_reuse";
        const updatedRow = {
          ...existingRow,
          id: typeof payload.id === "string" ? payload.id : existingRow.id,
          content_key: typeof payload.contentKey === "string" ? payload.contentKey : existingRow.content_key,
          surface: typeof payload.surface === "string" ? payload.surface : existingRow.surface,
          mode: typeof payload.mode === "string" ? payload.mode : existingRow.mode,
          status: packageReviewStatus ? packageReaderServing ? "LIVE" : "DRAFT" : typeof payload.status === "string" ? payload.status : existingRow.status,
          headline: typeof payload.headline === "string" ? payload.headline : existingRow.headline,
          summary: typeof payload.summary === "string" ? payload.summary : existingRow.summary,
          body: typeof payload.body === "string" ? payload.body : existingRow.body,
          sections: payload.sections && typeof payload.sections === "object" ? payload.sections : existingRow.sections,
          facts: payload.facts && typeof payload.facts === "object" ? payload.facts : existingRow.facts,
          source_snapshot: payload.sourceSnapshot && typeof payload.sourceSnapshot === "object"
            ? payload.sourceSnapshot
            : existingRow.source_snapshot,
          lane: packageReviewStatus ? packageReaderServing ? "serving" : "reference" : typeof payload.lane === "string" ? payload.lane : existingRow.lane,
          review_state: packageReviewStatus ? packageReaderServing ? null : "needs-review" : typeof payload.reviewState === "string" ? payload.reviewState : null,
          block_type: typeof payload.blockType === "string" ? payload.blockType : existingRow.block_type,
          prompt_version: typeof payload.promptVersion === "string" ? payload.promptVersion : existingRow.prompt_version
        };

        const updatedIndex = apiGeneratedContentRows.findIndex((row) => row.id === updatedRow.id);
        if (updatedIndex >= 0) apiGeneratedContentRows[updatedIndex] = updatedRow;
        else apiGeneratedContentRows.push(updatedRow);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, rows: [updatedRow] })
        });
        return;
      }

      if (options.generatedContentDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.generatedContentDelayMs));
      }
      options.onGeneratedContentRead?.(url);
      if (generatedContentFailuresRemaining > 0) {
        generatedContentFailuresRemaining -= 1;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "Temporary generated-content read failure." })
        });
        return;
      }
      const servedRows = url.searchParams.get("scope") === "compatibility"
        ? apiGeneratedContentRows.filter((row) => {
            const key = String(row.content_key ?? "");
            return key.startsWith("compatibility.")
              || key.startsWith("compatibility/")
              || key.startsWith("authored/compat-")
              || key.startsWith("fallback-hook/friends")
              || key.startsWith("fallback-hook/relationship")
              || key.startsWith("fallback-hook/synastry")
              || key.startsWith("fallback-hook/pair-daily/")
              || key.startsWith("vocab/relationship/")
              || key.startsWith("slot-template/compatibility/")
              || row.event_type === "friends.compatibility.planet-card"
              || row.block_type === "compatibility_planet_card";
          })
        : apiGeneratedContentRows;
      const limit = Math.max(1, Number(url.searchParams.get("limit") ?? servedRows.length));
      const cursor = url.searchParams.get("cursor");
      const cursorIndex = cursor ? servedRows.findIndex((row) => row.id === cursor) : -1;
      const offset = cursor ? Math.max(0, cursorIndex + 1) : Math.max(0, Number(url.searchParams.get("offset") ?? 0));
      const pageRows = servedRows.slice(offset, offset + limit);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          rows: pageRows,
          ...(url.searchParams.get("scope") === "compatibility"
            ? { nextCursor: pageRows.length === limit ? String(pageRows.at(-1)?.id ?? "") : null }
            : {})
        })
      });
      return;
    }

    if (pathname.endsWith("/user-generated-content")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, rows: [] })
      });
      return;
    }

    if (pathname.endsWith("/content-facts")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, facts: [] })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, rows: [] })
    });
  });

  await page.addInitScript(({ initialSecret }) => {
    window.localStorage.setItem("tldrastro:contentAdminSecret", initialSecret);
    window.localStorage.setItem("tldrastro:slotDictionaryInfoDismissed", "true");
  }, { initialSecret: options.initialSecret ?? "qa-secret" });
}

async function expectNoBrowserErrors(page: Page) {
  return watchBrowserErrors(page);
}

async function expectAdminRouteLoads(page: Page, route: string) {
  await expectRouteLoadsWithin(page, route, `admin route ${route}`, async () => {
    await expect(page.locator("#root")).toBeVisible({ timeout: routeReadyTimeoutMs });
    await expect(page.locator(".admin-dashboard-header h1")).toBeVisible({
      timeout: routeReadyTimeoutMs
    });
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("saved rows loaded", {
      timeout: routeReadyTimeoutMs
    });
  });
}

async function expectAdminHeader(page: Page, title: string, breadcrumb: string) {
  await expect(page.locator(".admin-dashboard-header h1")).toHaveText(title);
  await expect(page.locator(".admin-breadcrumb")).toHaveText(breadcrumb);
}

async function openAdminHome(page: Page) {
  await expectAdminRouteLoads(page, "/admin/content");
  await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
}

async function openCreateMenu(page: Page) {
  await page.getByRole("button", { name: "Create", exact: true }).click();
}

async function fillAdminEditorField(editor: Locator, label: string, value: string) {
  const field = editor.getByLabel(label);
  await field.evaluate((element, nextValue) => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!valueSetter) throw new Error(`No value setter available for ${element.tagName}`);
    valueSetter.call(element, nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await expect(field).toHaveValue(value);
}

async function openAdminCreateMenuHost(page: Page) {
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  if (await editor.isVisible()) {
    const prompt = page.waitForEvent("dialog", { timeout: 300 }).then(async (dialog) => {
      await dialog.accept();
    }).catch(() => undefined);
    await editor.getByRole("button", { name: "Close" }).click();
    await prompt;
    await expect(editor).toHaveCount(0);
  }
  await expectAdminRouteLoads(page, "/admin/content#slots");
  await expectAdminHeader(page, "Slots", "Admin / Composition / Slots");
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  const maxScrollWidth = Math.max(dimensions.bodyScrollWidth, dimensions.documentScrollWidth);

  expect(maxScrollWidth, `${label} does not create horizontal overflow`).toBeLessThanOrEqual(dimensions.viewportWidth + 4);
}

async function expectFormShellDoesNotOverlap(
  shell: Locator,
  label: string,
  selectors = {
    header: ":scope > .admin-editor-toolbar",
    body: ":scope > .admin-post-editor",
    footer: ":scope > .admin-editor-savebar"
  }
) {
  await expect(shell, `${label} shell is visible`).toBeVisible();
  const layout = await shell.evaluate((element, regionSelectors) => {
    const rect = (selector: string) => {
      const node = element.querySelector<HTMLElement>(selector);
      if (!node) return null;
      const bounds = node.getBoundingClientRect();
      return {
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        left: bounds.left,
        position: getComputedStyle(node).position,
        overflowY: getComputedStyle(node).overflowY,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth
      };
    };
    const bounds = element.getBoundingClientRect();
    return {
      shell: { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left },
      header: rect(regionSelectors.header),
      body: rect(regionSelectors.body),
      footer: rect(regionSelectors.footer),
      horizontalOverflow: element.scrollWidth - element.clientWidth
    };
  }, selectors);

  expect(layout.header, `${label} has a header`).not.toBeNull();
  expect(layout.body, `${label} has a scrolling body`).not.toBeNull();
  expect(layout.horizontalOverflow, `${label} shell has no horizontal overflow`).toBeLessThanOrEqual(1);
  expect(layout.header!.bottom, `${label} header ends before the form body`).toBeLessThanOrEqual(layout.body!.top + 1);
  expect(layout.body!.left, `${label} body stays inside the shell`).toBeGreaterThanOrEqual(layout.shell.left - 1);
  expect(layout.body!.right, `${label} body stays inside the shell`).toBeLessThanOrEqual(layout.shell.right + 1);
  expect(layout.body!.scrollWidth - layout.body!.clientWidth, `${label} body has no horizontal overflow`).toBeLessThanOrEqual(1);
  if (layout.footer) {
    expect(layout.body!.bottom, `${label} body ends before its actions`).toBeLessThanOrEqual(layout.footer.top + 1);
    expect(layout.footer.position, `${label} actions remain in layout flow`).not.toBe("sticky");
    expect(layout.footer.bottom, `${label} actions stay inside the shell`).toBeLessThanOrEqual(layout.shell.bottom + 1);
  }
}

test.describe("content dashboard admin user flow case studies", () => {
  test("admin route is excluded from reader blank-shell recovery", async ({ page }) => {
    let mainFrameNavigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) {
        mainFrameNavigations += 1;
      }
    });

    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content");
    const navigationsAfterInitialLoad = mainFrameNavigations;
    await page.waitForTimeout(1_500);

    expect(mainFrameNavigations).toBe(navigationsAfterInitialLoad);
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
  });

  test("legacy content/admin path opens the admin dashboard instead of the reader app", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/content/admin");

    await expect(page.getByRole("navigation", { name: "Content operations" })).toBeVisible();
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await expect(page.getByRole("button", { name: "TLDR Astro home" })).toHaveCount(0);

    await assertNoBrowserErrors();
  });

  test("header breadcrumbs link to parent Content Studio workspaces", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content#vocabulary");

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb).toHaveText("Admin / Composition / Vocabulary & phrases");
    await expect(breadcrumb.getByRole("link", { name: "Admin", exact: true })).toHaveAttribute("href", "#review-queue");
    await expect(breadcrumb.getByRole("link", { name: "Composition", exact: true })).toHaveAttribute("href", "#composition-map");
    await expect(breadcrumb.getByRole("link", { name: "Vocabulary & phrases", exact: true })).toHaveCount(0);
    await expect(breadcrumb.getByText("Vocabulary & phrases", { exact: true })).toHaveAttribute("aria-current", "page");

    await breadcrumb.getByRole("link", { name: "Composition", exact: true }).click();
    await expectAdminHeader(page, "Composition Map", "Admin / Composition / Map");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Admin", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page, "clickable header breadcrumbs");
    await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Admin", exact: true }).click();
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await assertNoBrowserErrors();
  });

  test("initial CMS load does not present zero counts as a ready dashboard", async ({ page }) => {
    await seedAdminApi(page, { generatedContentDelayMs: 1_000 });
    await page.goto("/admin/content");

    await expect(page.getByRole("status")).toContainText("Loading saved content…");
    await expect(page.getByRole("status")).not.toContainText("Content Studio ready");
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Loading");
    await expect(page.getByRole("region", { name: "Loading saved content" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Review queue views" })).toBeHidden();

    await expect(page.getByRole("region", { name: "Admin status" })).toContainText(`${generatedContentRows.length} saved rows loaded`, {
      timeout: routeReadyTimeoutMs
    });
    await expect(page.getByRole("region", { name: "Loading saved content" })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Review queue views" })).toBeVisible();
  });

  test("initial CMS load retries a transient generated-content page failure", async ({ page }) => {
    let generatedContentReads = 0;
    await seedAdminApi(page, {
      generatedContentFailuresBeforeSuccess: 1,
      onGeneratedContentRead: () => {
        generatedContentReads += 1;
      }
    });

    await expectAdminRouteLoads(page, "/admin/content#review-queue");
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText(`${generatedContentRows.length} saved rows loaded`);
    await expect(page.getByRole("region", { name: "Admin status" })).not.toContainText("Rows not loaded");
    expect(generatedContentReads).toBe(2);
  });

  test("production-scale Compatibility renders its first scoped page before the full editorial inventory", async ({ page }) => {
    test.setTimeout(60_000);
    const compatibilityRowsAtScale = Array.from({ length: 1_261 }, (_, index) => ({
      ...generatedContentRows.find((row) => row.id === "qa-compatibility-content-row")!,
      id: `qa-compat-scale-${index}`,
      content_key: `authored/compat-pair/mars/aries/${index}`,
      headline: `Compatibility scale ${index}`,
      facts: { planet: "mars", readerSign: "aries", otherSign: "libra" },
      source_snapshot: { contentSystem: "authored", planet: "mars", readerSign: "aries", otherSign: "libra" }
    }));
    const unrelatedEditorialRows = Array.from({ length: 7_500 }, (_, index) => ({
      ...generatedContentRows[0],
      id: `qa-unrelated-scale-${index}`,
      content_key: `content/unrelated/${index}`,
      headline: `Unrelated editorial row ${index}`
    }));
    const reads: URL[] = [];
    await seedAdminApi(page, {
      generatedRows: [...compatibilityRowsAtScale, ...unrelatedEditorialRows],
      generatedContentDelayMs: 150,
      onGeneratedContentRead: (url) => reads.push(url)
    });

    const startedAt = Date.now();
    await page.goto("/admin/content#compatibility");
    await expect(page.locator(".admin-content-row").first()).toBeVisible({ timeout: 3_000 });
    expect(Date.now() - startedAt, "first Compatibility page becomes usable within 3 seconds").toBeLessThan(3_000);
    expect(reads[0]?.searchParams.get("scope")).toBe("compatibility");
    expect(reads[0]?.searchParams.get("limit")).toBe("500");

    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("1261 saved rows loaded", {
      timeout: routeReadyTimeoutMs
    });
  });

  test("production-scale Content Library keeps the DOM bounded and search responsive", async ({ page }) => {
    test.setTimeout(120_000);
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const scaleRows = Array.from({ length: 7_200 }, (_, index) => ({
      ...generatedContentRows[0],
      id: `qa-scale-row-${index}`,
      content_key: `content/scale/row-${String(index).padStart(4, "0")}`,
      headline: index === 7_199 ? "Production scale search target" : `Production scale row ${index}`,
      summary: `Bounded rendering fixture ${index}.`,
      body: `Production-scale Content Studio fixture body ${index}.`
    }));

    await seedAdminApi(page, { generatedRows: scaleRows });
    await expectAdminRouteLoads(page, "/admin/content#exact-content");

    await expect(page.locator(".admin-content-row")).toHaveCount(50);
    await expect(page.getByRole("navigation", { name: "Content rows pagination" })).toContainText("Showing 1–50 of 7200");
    expect(await page.locator("*").count(), "Content Library DOM remains bounded at production scale").toBeLessThan(10_000);

    await page.getByRole("navigation", { name: "Content rows pagination" }).getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("navigation", { name: "Content rows pagination" })).toContainText("Showing 51–100 of 7200");

    const searchStartedAt = Date.now();
    await page.getByRole("textbox", { name: "Search content" }).fill("Production scale search target");
    await expect(page.locator(".admin-content-row")).toHaveCount(1, { timeout: 2_500 });
    await expect(page.locator(".admin-content-row")).toContainText("content/scale/row-7199");
    expect(Date.now() - searchStartedAt, "Content Library search resolves within the interaction budget").toBeLessThan(3_000);
    await assertNoBrowserErrors();
  });

  test("admin access validates pasted env assignments before saving them", async ({ page }) => {
    await seedAdminApi(page, {
      initialSecret: "stale-secret",
      expectedSecret: "qa-secret"
    });
    await page.goto("/admin/content");

    await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible({
      timeout: routeReadyTimeoutMs
    });
    await expect(page.getByRole("status")).toContainText("Admin access was denied");
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Access denied");
    await expect(page.getByRole("region", { name: "Admin access required" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review, sign off, publish" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
    const secretInput = page.getByLabel("Secret");
    await expect(secretInput).toHaveValue("stale-secret");
    await expect(page.getByRole("button", { name: "Load content" })).toBeVisible();

    await secretInput.fill("CONTENT_GENERATION_SECRET");
    await secretInput.press("Enter");
    await expect(page.getByRole("status")).toContainText("Paste the secret value, not the words CONTENT_GENERATION_SECRET");

    await secretInput.fill("CONTENT_GENERATION_SECRET='qa-secret'");
    await expect(secretInput).toHaveValue("CONTENT_GENERATION_SECRET='qa-secret'");
    await expect(page.getByRole("button", { name: "Load content" })).toBeEnabled();
    await page.getByRole("button", { name: "Load content" }).click();

    await expect(page.getByRole("region", { name: "Admin status" })).toContainText(`${generatedContentRows.length} saved rows loaded`, {
      timeout: routeReadyTimeoutMs
    });
    await expect(page.getByRole("status")).toContainText(`Loaded ${generatedContentRows.length} saved rows`);
    await page.getByRole("button", { name: "Dismiss notification" }).click();
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("admin shell navigates every primary dashboard surface", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content");

    await expect(page.getByRole("navigation", { name: "Content operations" })).toBeVisible();
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await expect(page.getByRole("button", { name: "Studio Home" })).toHaveCount(0);
    const advanced = page.locator("details.admin-nav-advanced");
    await expect(advanced).not.toHaveAttribute("open", "");
    await advanced.getByText("Operations / Advanced").click();
    await expect(advanced.getByRole("button", { name: "Connection" })).toBeVisible();

    for (const [index, adminPage] of adminPages.entries()) {
      if (index === 1) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      }
      await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: adminPage.nav }).click();
      await expectAdminHeader(page, adminPage.title, adminPage.breadcrumb);
      await expect(page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: adminPage.nav })).toHaveAttribute("aria-current", "page");
      if (index === 1) {
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      }
    }

    await assertNoBrowserErrors();
  });

  test("Natal Chart sidebar opens the placement source finder as a distinct workspace", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const natalExactRow = {
      ...generatedContentRows[3],
      id: "qa-natal-exact-row",
      content_key: "fallback-hook/natal-you-placement-complete-final/sun/cancer/1",
      event_type: "natal_placement",
      headline: "Sun in Cancer in the 1st house",
      summary: "Complete natal placement write-up.",
      body: "Your Sun in Cancer in the 1st house makes care, identity, and self-expression immediately visible.",
      block_type: "fallback_hook",
      source_snapshot: { contentType: "fallback-system", content_role: "fallback_hook", authoringSource: "qa-fixture" }
    };
    const natalTemplateRow = {
      ...natalExactRow,
      id: "qa-natal-sun-sign-template",
      content_key: "fallback-template/natal.planet-in-sign/sun",
      headline: "Sun in {{signTitle}}",
      body: "{{possessive}} {{planetTitle}} is in {{signTitle}}: you show up {{signAdverb}}.",
      block_type: "fallback_template",
      event_type: "fallback-template",
      sections: { packageRecord: {
        content_role: "template",
        headline: "Sun in {{signTitle}}",
        body_you: "{{possessive}} {{planetTitle}} is in {{signTitle}}: you show up {{signAdverb}}."
      } },
      source_snapshot: { contentType: "template", content_role: "template", authoringSource: "qa-fixture" }
    };
    const natalCancerStyleRow = {
      ...natalExactRow,
      id: "qa-natal-cancer-style",
      content_key: "fallback-vocab/sign-adverb/cancer",
      headline: "Cancer style phrase",
      body: "protectively",
      block_type: "vocabulary_phrase",
      event_type: "vocab",
      sections: { packageRecord: { content_role: "vocabulary", body: "protectively" } },
      source_snapshot: { contentType: "vocabulary", content_role: "vocabulary", authoringSource: "qa-fixture" }
    };
    await seedAdminApi(page, { generatedRows: [natalExactRow, natalTemplateRow, natalCancerStyleRow, ...generatedContentRows] });
    await page.setViewportSize({ width: 1365, height: 900 });
    await expectAdminRouteLoads(page, "/admin/content");

    const navigation = page.getByRole("navigation", { name: "Content operations" });
    await navigation.getByRole("button", { name: "Natal Chart" }).click();

    await expectAdminHeader(page, "Natal Chart Write-ups", "Admin / Write / Natal chart");
    await expect(page).toHaveURL(/#exact-content\?category=Natal\+Chart$/);
    await expect(navigation.getByRole("button", { name: "Natal Chart" })).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("button", { name: "Content Library" })).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("region", { name: "Find natal placement source writing" })).toBeVisible();
    await expect(page.getByLabel("Natal placement planet or point")).toBeVisible();
    await expect(page.getByLabel("Natal placement zodiac sign")).toBeVisible();
    await expect(page.getByLabel("Natal placement house")).toBeVisible();
    await expect(page.getByLabel("Natal placement motion")).toBeVisible();
    await expect(page.getByRole("region", { name: "Content list filters" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "App visibility status" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Generated content records" })).toHaveCount(0);
    await expect(page.getByText("QA Mercury Hidden Body Search Trap")).toHaveCount(0);
    await expect(page.getByText("Pick one value in each field. This workspace contains natal placements only; current transits and Sky placements are kept in Sky Write-ups.")).toBeVisible();

    const sourceFinder = page.getByRole("region", { name: "Find natal placement source writing" });
    const sourceFinderBox = await sourceFinder.boundingBox();
    const selectorBoxes = await sourceFinder.locator(".admin-natal-placement-selectors label").evaluateAll((labels) => labels.map((label) => {
      const box = label.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    }));
    expect(sourceFinderBox).not.toBeNull();
    expect(selectorBoxes).toHaveLength(4);
    selectorBoxes.forEach((box, index) => {
      expect(box.left).toBeGreaterThanOrEqual(sourceFinderBox!.x);
      expect(box.right).toBeLessThanOrEqual(sourceFinderBox!.x + sourceFinderBox!.width);
      if (index > 0) expect(box.left).toBeGreaterThanOrEqual(selectorBoxes[index - 1].right);
    });
    await expectNoHorizontalOverflow(page, "Natal Chart workspace");

    await page.getByLabel("Natal placement planet or point").selectOption("mercury");
    await page.getByLabel("Natal placement zodiac sign").selectOption("virgo");
    await page.getByLabel("Natal placement house").selectOption("6");
    await page.getByLabel("Natal placement motion").selectOption("retrograde");
    await expect(page).toHaveURL(/planet=mercury&sign=virgo&house=6&motion=retrograde/u);
    await expect(sourceFinder.getByText("Retrograde chart context", { exact: true })).toBeVisible();

    await page.getByLabel("Natal placement planet or point").selectOption("sun");
    await page.getByLabel("Natal placement zodiac sign").selectOption("cancer");
    await page.getByLabel("Natal placement house").selectOption("");
    await expect(page.getByLabel("Natal placement motion")).toHaveValue("direct");
    await expect(sourceFinder.locator(".admin-natal-placement-finder-heading h3")).toHaveText("Sun in Cancer");
    await expect(sourceFinder.getByRole("heading", { name: "What you see" })).toBeVisible();
    await expect(sourceFinder.getByText("Your Sun is in Cancer, so the planet-in-sign write-up loads before a house is selected.")).toBeVisible();
    await expect(sourceFinder.getByText("The planet-in-sign write-up is shown below. Choose a house to add the house paragraph and exact full-placement override.")).toBeVisible();
    await expect(sourceFinder.locator(".admin-natal-source-group").first().getByRole("heading", { name: "Sun in Cancer", exact: true })).toBeVisible();
    await expect(sourceFinder.getByText("Optional exact override.")).toHaveCount(0);
    await expect(sourceFinder.getByRole("button", { name: "Create exact override" })).toHaveCount(0);
    await page.getByLabel("Natal placement house").selectOption("1");
    await expect(sourceFinder.locator(".admin-natal-placement-finder-heading h3")).toHaveText("Sun in Cancer in the 1st house");
    await expect(sourceFinder.getByText("Reader path", { exact: true })).toBeVisible();
    await expect(sourceFinder.getByText("Source key", { exact: true }).first()).toBeVisible();
    await expect(sourceFinder.getByRole("heading", { name: "Complete Sun in Cancer in the 1st house write-up" })).toBeVisible();
    await expect(sourceFinder.getByText("Your Sun in Cancer in the 1st house makes care, identity, and self-expression immediately visible.")).toBeVisible();
    await expect(sourceFinder.getByText("Load this exact source to view and edit its saved writing.")).toHaveCount(0);
    await expect(sourceFinder.getByRole("button", { name: "Load and edit" }).first()).toBeVisible();
    await sourceFinder.getByRole("button", { name: "Edit source" }).first().click();
    await expect(page.getByRole("dialog", { name: "Generated content editor" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Edit Sun in Cancer in the 1st House · Complete natal placement" })).toBeVisible();
    await expect(page.getByLabel("Editor label")).toHaveValue("Sun in Cancer in the 1st house");
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await sourceFinder.getByText("Sentence structure (advanced)", { exact: true }).click();
    await sourceFinder.getByRole("button", { name: "Preview template" }).first().click();
    await expect(page.getByRole("dialog", { name: "Template variable reference" })).toBeVisible();
    const templatePreview = page.getByRole("region", { name: "Example reader write-up" });
    await expect(templatePreview).toBeVisible();
    await expect(templatePreview.locator(".variable-fact")).toContainText(["Sun", "Cancer"]);
    const stylePhrase = templatePreview.getByRole("button", { name: /protectively.*Open the saved source for Sign Adverb/u });
    await expect(stylePhrase).toBeVisible();
    await stylePhrase.click();
    const variableDetails = page.getByRole("dialog", { name: "Sign adverb variable details" });
    await expect(variableDetails.getByRole("region", { name: "Saved source copy" })).toContainText("protectively");
    await variableDetails.getByRole("button", { name: "Sources" }).click();
    await variableDetails.getByRole("button", { name: "All variables" }).click();
    await page.getByRole("button", { name: "Back to editor" }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await navigation.getByRole("button", { name: "Content Library" }).click();
    await expectAdminHeader(page, "Content Library", "Admin / Write / Content library");
    await expect(page.getByLabel("Category")).toHaveValue("all");
    await expect(navigation.getByRole("button", { name: "Content Library" })).toHaveAttribute("aria-current", "page");

    await assertNoBrowserErrors();
  });

  test("admin dashboard deep links restore primary surfaces, filters, and history state", async ({ page }) => {
    test.setTimeout(120_000);
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    let deepLinkLoadIndex = 0;
    const openAdminDeepLink = async (hash: string) => {
      const route = `/admin/content?qaDeepLink=${deepLinkLoadIndex++}${hash}`;
      await expect(async () => {
        await expectAdminRouteLoads(page, route);
      }).toPass({ timeout: routeReadyTimeoutMs * 2 });
    };

    for (const adminPage of adminPages) {
      await openAdminDeepLink(`#${adminPage.hash}`);
      await expectAdminHeader(page, adminPage.title, adminPage.breadcrumb);
      await expect(page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: adminPage.nav })).toHaveAttribute("aria-current", "page");
      await expect(page).toHaveURL(new RegExp(`/admin/content\\?qaDeepLink=\\d+#${adminPage.hash.replaceAll("-", "\\-")}$`));
    }

    await openAdminDeepLink("#exact-content?category=Relationship&source=phrasebank&q=synastry");
    await expectAdminHeader(page, "Content Library", "Admin / Write / Content library");
    await expect(page.locator("section[aria-label='Content list filters']")).toBeVisible();
    await expect(page.locator("section[aria-label='Content list filters']").getByLabel("Category")).toHaveValue("Relationship");
    await expect(page.locator("section[aria-label='Content list filters']").getByLabel("Content class")).toHaveValue("phrasebank");
    await expect(page.locator("section[aria-label='Content list filters']").getByLabel("Search content")).toHaveValue("synastry");

    await openAdminDeepLink("#vocabulary?category=relationship&q=trust");
    await expectAdminHeader(page, "Vocabulary & Phrases", "Admin / Composition / Vocabulary & phrases");
    await expect(page.getByRole("tablist", { name: "Vocabulary categories" }).getByRole("tab", { name: "Relationship" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Search vocabulary")).toHaveValue("trust");

    await openAdminDeepLink("#fallback-hooks?section=friends");
    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    await expect(page.getByRole("tab", { name: /Friends/ })).toHaveAttribute("aria-selected", "true");
    const mainRail = await page.locator("section.admin-main").boundingBox();
    const fallbackHeader = await page.locator(".admin-dashboard-header").boundingBox();
    const fallbackRows = await page.locator(".admin-list-panel").first().boundingBox();
    expect(mainRail, "Content Studio main rail has rendered geometry").not.toBeNull();
    expect(fallbackHeader, "Fallback page header has rendered geometry").not.toBeNull();
    expect(fallbackRows, "Fallback row panel has rendered geometry").not.toBeNull();
    if (mainRail && fallbackHeader && fallbackRows) {
      const contentInset = fallbackHeader.x - mainRail.x;
      expect(contentInset, "desktop content inset leaves more width for rows").toBeLessThanOrEqual(54);
      expect(fallbackRows.width, "fallback rows use the widened content rail").toBeGreaterThanOrEqual(mainRail.width - 108);
    }

    await openAdminDeepLink("#surface-map?area=friends&status=partial");
    await expectAdminHeader(page, "Surface Map", "Admin / Composition / Surface map");
    await expect(page.getByRole("group", { name: "Filter surfaces by area" }).getByRole("button", { name: /Friends/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "Filter surfaces by admin editability" }).getByRole("button", { name: /Runtime gaps/ })).toHaveAttribute("aria-pressed", "true");

    await expectAdminRouteLoads(page, "/admin/content#home");
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Articles" }).click();
    await expectAdminHeader(page, "Articles", "Admin / Write / Articles");
    await expect(page).toHaveURL(/\/admin\/content#articles$/);

    await page.goBack();
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await expect(page).toHaveURL(/\/admin\/content(?:#home)?$/);

    await page.goForward();
    await expectAdminHeader(page, "Articles", "Admin / Write / Articles");
    await expect(page).toHaveURL(/\/admin\/content#articles$/);

    await assertNoBrowserErrors();
  });

  test("deferred hook catalog exposes failures, retries, and loads exact source bodies on demand", async ({ page }) => {
    let indexRequests = 0;
    let skyBodyRequests = 0;
    await page.route("**/generated/admin-hook-catalog-index-v1.json", async (route) => {
      indexRequests += 1;
      if (indexRequests === 1) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "QA index failure" }) });
        return;
      }
      await route.continue();
    });
    await page.route("**/generated/admin-hook-catalog-sky-v1.json", async (route) => {
      skyBodyRequests += 1;
      if (skyBodyRequests === 1) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "QA domain failure" }) });
        return;
      }
      await route.continue();
    });
    await seedAdminApi(page);

    await expectAdminRouteLoads(page, "/admin/content#surface-map");
    await expectAdminHeader(page, "Surface Map", "Admin / Composition / Surface map");
    await page.getByText(/Supporting fallback-hook catalog/).click();
    await expect(page.getByRole("alert")).toContainText("failed with HTTP 503");
    await page.getByRole("button", { name: "Retry catalog" }).click();

    const firstHook = page.locator("article.admin-fallback-row").filter({ hasText: "fallback-hook/angle-intro/ascendant" }).first();
    await expect(firstHook).toBeVisible();
    await firstHook.getByRole("button", { name: "Author" }).click();
    await expect(page.getByText(/Select Author to retry\./)).toBeVisible();
    await firstHook.getByRole("button", { name: "Author" }).click();

    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    await expect(page.getByLabel("Reader copy")).not.toHaveValue("");
    expect(indexRequests).toBe(2);
    expect(skyBodyRequests).toBe(2);
  });

  test("create menu routes writing actions to the right editors", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await openAdminCreateMenuHost(page);

    await openCreateMenu(page);
    const createArticle = page.getByRole("menuitem", { name: /Create article/ });
    await expect(createArticle).toBeVisible();
    await expect(createArticle).toBeFocused();
    await createArticle.press("Escape");
    await expect(createArticle).toBeHidden();
    await expect(page.getByRole("button", { name: "Create" })).toBeFocused();
    await openCreateMenu(page);
    await createArticle.click({ force: true });
    await expectAdminHeader(page, "Articles", "Admin / Write / Articles");
    await expect(page.locator(".admin-review-workspace, .admin-workbench").first()).toBeVisible();

    await openAdminCreateMenuHost(page);
    await openCreateMenu(page);
    const createContentRow = page.getByRole("menuitem", { name: /Create content row/ });
    await expect(createContentRow).toBeVisible();
    await createContentRow.click({ force: true });
    await expectAdminHeader(page, "Content Library", "Admin / Write / Content library");
    await expect(page.locator("section[aria-label='Content controls']")).toBeVisible();
    await expect(page.locator("section[aria-label='Content list filters']")).toBeVisible();

    await openAdminCreateMenuHost(page);
    await openCreateMenu(page);
    const createReusablePhrase = page.getByRole("menuitem", { name: /Create reusable phrase/ });
    await expect(createReusablePhrase).toBeVisible();
    await createReusablePhrase.click({ force: true });
    await expectAdminHeader(page, "Vocabulary & Phrases", "Admin / Composition / Vocabulary & phrases");

    await openAdminCreateMenuHost(page);
    await openCreateMenu(page);
    const createTemplate = page.getByRole("menuitem", { name: /Create template/ });
    await expect(createTemplate).toBeVisible();
    await createTemplate.click({ force: true });
    await expectAdminHeader(page, "Templates", "Admin / Composition / Templates");

    await openAdminCreateMenuHost(page);
    await openCreateMenu(page);
    const createFallbackHook = page.getByRole("menuitem", { name: /Create fallback hook/ });
    await expect(createFallbackHook).toBeVisible();
    await createFallbackHook.click({ force: true });
    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    await assertNoBrowserErrors();
  });

  for (const createCase of adminCreateCases) {
    test(`${createCase.action} saves with required admin API metadata`, async ({ page }) => {
      const assertNoBrowserErrors = await expectNoBrowserErrors(page);
      const writes: { method: string; payload: Record<string, unknown> }[] = [];
      await seedAdminApi(page, {
        onGeneratedContentWrite: (write) => {
          writes.push(write);
        }
      });
      await expectAdminRouteLoads(page, `/admin/content#${createCase.hash}`);
      await openCreateMenu(page);
      const createAction = page.getByRole("menuitem", { name: createCase.action });
      await expect(createAction).toBeVisible();
      await createAction.click({ force: true });
      const editor = page.locator(".admin-editor-panel");
      await expect(editor.getByRole("heading", { name: createCase.editorHeading })).toBeVisible();
      await expectFormShellDoesNotOverlap(editor, `${createCase.action} desktop editor`);
      if (createCase.phraseEditor) {
        await fillAdminEditorField(editor, "Phrase title", `${createCase.action} QA row`);
        await fillAdminEditorField(editor, "Reusable phrase", `${createCase.action} body copy for the dashboard admin save contract.`);
      } else {
        await expect(editor.getByLabel("Content key")).toHaveValue(createCase.contentKey);
        if (createCase.action === "Create content row") {
          await expect(editor.getByText("Title / headline", { exact: true })).toBeVisible();
          await expect(editor.getByText("TL;DR / summary", { exact: true })).toBeVisible();
          await expect(editor.getByLabel("Full passage / body")).toBeVisible();
          await expect(editor.getByText(/Stored internally as Headline/)).toBeVisible();
          await expect(editor.getByText(/Stored internally as Summary/)).toBeVisible();
          await expect(editor.getByText(/Stored internally as Body/)).toBeVisible();
        }
        await fillAdminEditorField(editor, createCase.headlineLabel, `${createCase.action} QA row`);
        await fillAdminEditorField(editor, createCase.bodyLabel, `${createCase.action} body copy for the dashboard admin save contract.`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await expectFormShellDoesNotOverlap(editor, `${createCase.action} mobile editor`);
      await expectNoHorizontalOverflow(page, `${createCase.action} mobile editor`);
      await page.setViewportSize({ width: 1280, height: 900 });
      await editor.getByRole("button", { name: "Save" }).evaluate((element) => {
        (element as HTMLButtonElement).click();
      });

      await expect.poll(() => writes.at(-1)).toMatchObject({
        method: "POST",
        payload: {
          contentKey: createCase.contentKey,
          eventType: createCase.eventType,
          blockType: createCase.blockType
        }
      });
      await assertNoBrowserErrors();
    });
  }

  test("content editor saves row changes through the admin API", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    let generatedContentWrite: { method: string; payload: Record<string, unknown> } | null = null;
    await seedAdminApi(page, {
      onGeneratedContentWrite: (write) => {
        generatedContentWrite = write;
      }
    });
    await expectAdminRouteLoads(page, "/admin/content#exact-content");

    await page.getByLabel("Search content").fill("sky.placement.sun.cancer");
    const savedRow = page.locator(".admin-content-row", { hasText: "sky.placement.sun.cancer" });
    await expect(savedRow).toHaveCount(1);
    const editor = page.locator(".admin-editor-panel");
    const contentSystemPanel = editor.locator("section[aria-label='Article content system']");
    await expect(async () => {
      if (!await editor.isVisible()) {
        await savedRow.getByRole("button", { name: "Edit" }).click();
      }
      await expect(page.locator(".admin-editor-backdrop")).toBeVisible();
      await expect(editor.getByRole("heading", { name: "Edit Sun in Cancer" })).toBeVisible();
      await expect(contentSystemPanel).toContainText("Authored");
    }).toPass({ timeout: routeReadyTimeoutMs });
    await expect(contentSystemPanel.getByText("Content Level", { exact: true })).toHaveCount(0);
    await expect(editor.getByLabel("App display source")).toHaveCount(0);
    const savebar = editor.locator(".admin-editor-savebar");
    await expect(savebar).toContainText("All changes saved");
    expect(await savebar.evaluate((element) => getComputedStyle(element).position)).toBe("relative");
    await expectFormShellDoesNotOverlap(editor, "saved Content Library editor");
    const relatedPassages = editor.getByRole("region", { name: "Related reader horoscope passages" });
    await expect(relatedPassages).toBeVisible();
    await expect(relatedPassages).toContainText("House horoscopes");
    await expect(relatedPassages).toContainText("Aspect passages");
    await expect(relatedPassages.locator("details > summary > span")).toHaveText([
      "Aspect passages",
      "House horoscopes"
    ]);
    await expect(relatedPassages.locator("details[open]")).toHaveCount(0);
    const editorReadingOrder = await editor.locator(".admin-post-editor").evaluate((postEditor) => {
      const headline = postEditor.querySelector('[aria-label="Article title"]')?.closest("label");
      const summary = postEditor.querySelector('[aria-label="TL;DR / summary"]')?.closest("label");
      const body = postEditor.querySelector('[aria-label="Article body"]')?.closest("label");
      const related = postEditor.querySelector('[aria-label="Related reader horoscope passages"]');
      const nodes = [headline, summary, body, related];
      return nodes.every(Boolean) && nodes.every((node, index) => (
        index === nodes.length - 1
        || Boolean(node?.compareDocumentPosition(nodes[index + 1] as Node) & Node.DOCUMENT_POSITION_FOLLOWING)
      ));
    });
    expect(editorReadingOrder, "write-up fields precede aspects and house horoscopes").toBe(true);
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "desktop-sky-related-passages.png")
    });
    await editor.getByLabel("Article title").fill("Sun in Cancer QA edit");
    await editor.getByLabel("TL;DR / summary").fill("Updated summary from the visual admin editor.");
    await editor.getByLabel("Article body").fill("Updated body from the visual admin editor.");
    await expect(savebar).toContainText("Unsaved changes");
    await expect(editor.getByLabel("TL;DR / summary").locator("xpath=following-sibling::*[contains(@class, 'admin-field-metrics')]")).toContainText("7 words");
    await expect(editor.getByLabel("Article body").locator("xpath=following-sibling::*[contains(@class, 'admin-field-metrics')]")).toContainText("7 words");
    await editor.getByRole("button", { name: "Save" }).click();

    await expect.poll(() => generatedContentWrite).toMatchObject({
      method: "PATCH",
      payload: {
        id: "qa-sky-row",
        contentKey: "sky.placement.sun.cancer",
        headline: "Sun in Cancer QA edit",
        summary: "Updated summary from the visual admin editor.",
        body: "Updated body from the visual admin editor.",
        status: "LIVE",
        sourceSnapshot: {
          contentSystem: "authored",
          contentLevel: "source-grounded"
        }
      }
    });
    await expect(page.getByRole("status")).toContainText("sky.placement.sun.cancer saved as Published");
    await assertNoBrowserErrors();
  });

  test("Sky write-ups filter and sort retrograde Calendar placements", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const retrogradeRow = {
      ...generatedContentRows[0],
      id: "qa-retrograde-calendar-row",
      content_key: "sky/station/mercury/retrograde/virgo",
      event_type: "station",
      headline: "Mercury stations retrograde in Virgo",
      facts: { body: "Mercury", sign: "Virgo", motion: "retrograde", isRetrograde: true }
    };
    const directRow = {
      ...generatedContentRows[0],
      id: "qa-direct-sky-row",
      content_key: "sky/placement/venus/libra/direct",
      event_type: "sky-placement",
      headline: "Venus direct in Libra",
      facts: { body: "Venus", sign: "Libra", motion: "direct", isRetrograde: false }
    };
    await seedAdminApi(page, { generatedRows: [directRow, retrogradeRow, ...generatedContentRows] });
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups");

    await expect(page.getByLabel("Sky write-up motion")).toBeVisible();
    await expect(page.getByLabel("Sky write-up reader use")).toBeVisible();
    await expect(page.getByLabel("Sort Sky write-ups")).toBeVisible();
    await page.getByLabel("Sky write-up motion").selectOption("retrograde");
    await page.getByLabel("Sky write-up reader use").selectOption("calendar");
    await page.getByLabel("Sort Sky write-ups").selectOption("retrograde-first");

    await expect(page.locator(".admin-content-row", { hasText: "Mercury stations retrograde in Virgo" })).toBeVisible();
    await expect(page.locator(".admin-content-row", { hasText: "Venus direct in Libra" })).toHaveCount(0);
    await assertNoBrowserErrors();
  });

  test("Sky write-up editor stays single-column and orders aspects before house horoscopes", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await page.setViewportSize({ width: 1308, height: 900 });
    const packageSkyRow = {
      ...generatedContentRows[0],
      id: "qa-chiron-package-row",
      content_key: "sky.placement.chiron.taurus",
      headline: "Chiron in Taurus",
      summary: "Being seen without apology",
      body: "A complete QA write-up used to verify the editor reading order.",
      facts: { body: "Chiron", sign: "Taurus", fallbackArchitectureV3: true },
      provider: "tldrastro-fallback-architecture-v3",
      source_snapshot: {
        contentSystem: "generated",
        contentLevel: "source-grounded",
        sourcePackage: "tldrastro-fallback-architecture-v3"
      },
      sections: {
        packageRecord: {
          content_role: "full-copy",
          review_status: "approved",
          editorial_notes: ""
        }
      }
    };
    await seedAdminApi(page, { generatedRows: [packageSkyRow, ...generatedContentRows.slice(1)] });
    await expectAdminRouteLoads(page, "/admin/content#exact-content");

    await page.getByLabel("Search content").fill("sky.placement.chiron.taurus");
    const savedRow = page.locator(".admin-content-row", { hasText: "sky.placement.chiron.taurus" });
    await expect(savedRow).toHaveCount(1);
    await savedRow.getByRole("button", { name: "Edit" }).click();

    const editor = page.locator(".admin-editor-panel");
    await expect(editor).toBeVisible();
    const relatedPassages = editor.getByRole("region", { name: "Related reader horoscope passages" });
    await expect(relatedPassages.locator("details > summary > span")).toHaveText([
      "Aspect passages",
      "House horoscopes"
    ]);
    await expect(relatedPassages.locator("details[open]")).toHaveCount(0);
    const fallbackDiagnostic = editor.getByRole("region", { name: "Fallback composition check" });
    await expect(fallbackDiagnostic).toBeVisible();

    const layout = await editor.evaluate((panel) => {
      const postEditor = panel.querySelector<HTMLElement>(".admin-post-editor");
      const packagePanel = panel.querySelector<HTMLElement>(".admin-package-edit-panel");
      const fallbackGrid = panel.querySelector<HTMLElement>(".admin-fallback-diagnostic-grid");
      const headline = panel.querySelector<HTMLElement>('[aria-label="Article title"]')?.closest("label");
      const summary = panel.querySelector<HTMLElement>('[aria-label="TL;DR / summary"]')?.closest("label");
      const body = panel.querySelector<HTMLElement>('[aria-label="Article body"]')?.closest("label");
      const related = panel.querySelector<HTMLElement>('[aria-label="Related reader horoscope passages"]');
      const topPositions = [headline, summary, body, related].map((node) => node?.getBoundingClientRect().top ?? -1);
      const packageChildren = packagePanel ? Array.from(packagePanel.children).map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }) : [];
      const fallbackChildren = fallbackGrid ? Array.from(fallbackGrid.children).map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }) : [];
      return {
        editorWidth: panel.getBoundingClientRect().width,
        editorOverflow: panel.scrollWidth - panel.clientWidth,
        postEditorColumns: postEditor ? getComputedStyle(postEditor).gridTemplateColumns : "",
        packageColumns: packagePanel ? getComputedStyle(packagePanel).gridTemplateColumns : "",
        fallbackColumns: fallbackGrid ? getComputedStyle(fallbackGrid).gridTemplateColumns : "",
        topPositions,
        packageChildren,
        fallbackChildren
      };
    });

    expect(layout.editorWidth).toBeLessThanOrEqual(761);
    expect(layout.editorOverflow).toBeLessThanOrEqual(1);
    expect(layout.postEditorColumns.trim().split(/\s+/)).toHaveLength(1);
    expect(layout.packageColumns.trim().split(/\s+/)).toHaveLength(1);
    expect(layout.fallbackColumns.trim().split(/\s+/)).toHaveLength(1);
    expect(layout.topPositions.every((top, index, positions) => index === 0 || top > positions[index - 1])).toBe(true);
    expect(layout.packageChildren.every((child, index, children) => index === 0 || child.top >= children[index - 1].bottom)).toBe(true);
    expect(layout.fallbackChildren.every((child, index, children) => index === 0 || child.top >= children[index - 1].bottom)).toBe(true);
    await expectNoHorizontalOverflow(page, "Narrow Sky write-up editor");
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "narrow-sky-writeup-editor.png")
    });
    await fallbackDiagnostic.scrollIntoViewIfNeeded();
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "narrow-sky-fallback-diagnostic.png")
    });
    await assertNoBrowserErrors();
  });

  test("lunations live in Sky Write-ups with macro, aspects, then twelve rising horoscopes", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await page.setViewportSize({ width: 1308, height: 900 });
    const packageSource = {
      sourcePackage: "tldrastro-fallback-architecture-v3",
      contentSystem: "authored",
      contentLevel: "source-grounded",
      content_role: "authored_card",
      review_status: "approved"
    };
    const relationRow = (id: string, contentKey: string, body: string, blockType = "fallback_hook") => ({
      ...generatedContentRows[0],
      id,
      content_key: contentKey,
      mode: "feed",
      status: "DRAFT",
      event_type: blockType === "vocabulary_phrase" ? "vocab" : "fallback-hook",
      headline: contentKey,
      summary: "",
      body,
      block_type: blockType,
      lane: "reference",
      review_state: "fallback-system-reference",
      facts: { fallbackArchitectureV3: true },
      source_snapshot: packageSource,
      sections: { packageRecord: { contentKey, body_you: body, content_role: blockType === "vocabulary_phrase" ? "vocabulary" : "fallback_hook", review_status: "approved" } },
      provider: "tldrastro-fallback-architecture-v3"
    });
    const macroRow = {
      ...generatedContentRows[0],
      id: "qa-pisces-full-moon",
      content_key: "authored/sky-lunation-macro/full-moon/pisces",
      mode: "article",
      status: "DRAFT",
      event_type: "sky-lunation-macro",
      headline: "The Macro View: What the Pisces Full Moon Represents",
      summary: "The macro view",
      body: "Check the details without treating reality as a betrayal of the dream.",
      block_type: null,
      lane: "reference",
      review_state: "fallback-system-reference",
      facts: {
        fallbackArchitectureV3: true,
        content_role: "authored_card",
        review_status: "approved",
        moonEvent: { name: "Full Moon", sign: "Pisces", eclipseType: "lunar" }
      },
      source_snapshot: packageSource,
      sections: { packageRecord: { contentKey: "authored/sky-lunation-macro/full-moon/pisces", body: "Check the details without treating reality as a betrayal of the dream.", content_role: "authored_card", review_status: "approved" } },
      provider: "tldrastro-fallback-architecture-v3"
    };
    const lunationRows = [
      macroRow,
      relationRow("qa-lunation-frame", "fallback-hook/lunation-horoscope/full", "Your {{houseOrdinal}} house of {{jurisdiction}} is illuminated."),
      relationRow("qa-lunation-focus", "fallback-hook/lunation-sign-compact/full-moon/pisces", "Pisces asks where empathy has become an obligation."),
      relationRow("qa-lunation-aspect", "authored/transit-aspect/moon/saturn/hard", "The Moon presses against a natal Saturn boundary."),
      ...Array.from({ length: 12 }, (_, index) => relationRow(
        `qa-lunation-opening-${index + 1}`,
        `fallback-hook/lunation-opening-situation/${index + 1}`,
        `Opening situation for house ${index + 1}.`
      )),
      ...Array.from({ length: 12 }, (_, index) => relationRow(
        `qa-lunation-jurisdiction-${index + 1}`,
        `fallback-vocab/house-jurisdiction/${index + 1}`,
        `house topic ${index + 1}`,
        "vocabulary_phrase"
      ))
    ];
    await seedAdminApi(page, { generatedRows: lunationRows });
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups");

    await expectAdminHeader(page, "Sky Write-ups", "Admin / Write / Sky write-ups");
    const macroListRow = page.locator(".admin-content-row", { hasText: "authored/sky-lunation-macro/full-moon/pisces" });
    await expect(macroListRow).toHaveCount(1);
    await macroListRow.getByRole("button", { name: "Edit" }).click();

    const editor = page.locator(".admin-editor-panel");
    const related = editor.getByRole("region", { name: "Related reader horoscope passages" });
    await expect(editor.getByLabel("Article body")).toHaveValue("Check the details without treating reality as a betrayal of the dream.");
    await expect(related.locator("dl > div", { hasText: "Eclipse" })).toContainText("Lunar eclipse");
    await expect(related.locator("details > summary > span")).toHaveText([
      "Aspect passages",
      "Rising-sign horoscopes"
    ]);
    const readingOrder = await editor.locator(".admin-post-editor").evaluate((postEditor) => {
      const body = postEditor.querySelector('[aria-label="Article body"]')?.closest("label");
      const relatedRegion = postEditor.querySelector('[aria-label="Related reader horoscope passages"]');
      const [aspects, horoscopes] = relatedRegion ? Array.from(relatedRegion.querySelectorAll(":scope > details")) : [];
      return Boolean(body && relatedRegion && aspects && horoscopes
        && body.compareDocumentPosition(relatedRegion) & Node.DOCUMENT_POSITION_FOLLOWING
        && aspects.compareDocumentPosition(horoscopes) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(readingOrder, "macro copy precedes aspects and rising-sign horoscopes").toBe(true);

    await related.getByText("Rising-sign horoscopes", { exact: true }).click();
    await expect(related).toContainText("12/12 source-ready");
    await expect(related.locator(".admin-sky-house-grid > article")).toHaveCount(12);
    await expect(related).toContainText("Pisces Rising · 1st House");
    await expect(related).toContainText("Aries Rising · 12th House");
    await expect(related).toContainText("The app assembles these twelve horoscopes from the saved frame");
    await expectNoHorizontalOverflow(page, "Lunation Sky write-up editor");
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "narrow-lunation-sky-writeup-editor.png")
    });
    await assertNoBrowserErrors();
  });

  test("article filters narrow by point, content system, and text search", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content#articles");

    await expectAdminHeader(page, "Articles", "Admin / Write / Articles");
    const articleFilters = page.locator("section[aria-label='Article filters']");
    await expect(articleFilters).toBeVisible();
    await expect(articleFilters.getByLabel("Article status")).toHaveValue("LIVE");
    await expect(articleFilters.getByLabel("Article planet or point")).toHaveValue("all");
    await expect(articleFilters.getByLabel("Article content system")).toHaveValue("all");

    await articleFilters.getByLabel("Article planet or point").selectOption("sun");
    await expect(page.locator(".admin-content-row", { hasText: "article/manual/sun-in-cancer" })).toHaveCount(1);
    await expect(page.locator(".admin-dashboard h2").filter({ hasText: "Articles" })).toBeVisible();

    await articleFilters.getByLabel("Search articles").fill("cancer");
    await expect(page.locator(".admin-content-row", { hasText: "Understanding the Sun in Cancer" }).first()).toBeVisible();

    await articleFilters.getByLabel("Article content system").selectOption("fallback");
    await expect(page.locator(".admin-content-row")).toHaveCount(0);
    await expect(page.getByText("No rows match these filters.")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(articleFilters.getByLabel("Article planet or point")).toHaveValue("all");
    await expect(articleFilters.getByLabel("Article content system")).toHaveValue("all");
    await expect(articleFilters.getByLabel("Search articles")).toHaveValue("");
    await expect(page.locator(".admin-content-row", { hasText: "article/manual/sun-in-cancer" })).toHaveCount(1);

    await assertNoBrowserErrors();
  });

  test("compatibility is a dedicated primary workspace", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const compatibilityReads: URL[] = [];
    let compatibilityWrite: { method: string; payload: Record<string, unknown> } | null = null;
    const directionalCompatibilityRow = {
      ...generatedContentRows.find((row) => row.id === "qa-compatibility-content-row")!,
      id: "qa-directional-compatibility-content-row",
      content_key: "authored/compat-deep/sun/pisces/aquarius",
      headline: "Aquarius",
      summary: "",
      body: "With your Sun in Pisces, you give your Aquarius friend room to choose their own direction.",
      facts: {},
      source_snapshot: { contentSystem: "authored" }
    };
    const reverseDirectionalCompatibilityRow = {
      ...directionalCompatibilityRow,
      id: "qa-reverse-directional-compatibility-content-row",
      content_key: "authored/compat-deep/sun/aquarius/pisces",
      headline: "Pisces"
    };
    const copyContaminationRow = {
      ...directionalCompatibilityRow,
      id: "qa-jupiter-copy-contamination-row",
      content_key: "authored/compat-deep/jupiter/libra/taurus",
      headline: "Taurus",
      body: "Jupiter between Libra and Taurus can still discuss Venus themes without becoming a Venus record.",
      facts: { planet: "jupiter", readerSign: "libra", otherSign: "taurus" },
      source_snapshot: { contentSystem: "authored", planet: "jupiter", readerSign: "libra", otherSign: "taurus" }
    };
    await seedAdminApi(page, {
      generatedRows: [...generatedContentRows, directionalCompatibilityRow, reverseDirectionalCompatibilityRow, copyContaminationRow],
      onGeneratedContentRead: (url) => compatibilityReads.push(url),
      onGeneratedContentWrite: (write) => { compatibilityWrite = write; }
    });
    await expectAdminRouteLoads(page, "/admin/content#compatibility");

    await expectAdminHeader(page, "Compatibility", "Admin / Write / Compatibility");
    expect(compatibilityReads[0]?.searchParams.get("scope")).toBe("compatibility");
    expect(compatibilityReads[0]?.searchParams.get("visibility")).toBe("all");
    const compatibilitySections = page.getByRole("tablist", { name: "Compatibility sections" });
    await expect(compatibilitySections.getByRole("tab", { name: /All compatibility/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("region", { name: "Compatibility sections summary" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Surface" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Kind" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Updated" })).toHaveCount(0);
    await expect(compatibilitySections.getByRole("tab", { name: /Simple fallbacks 1/ })).toBeVisible();
    await expect(compatibilitySections.getByRole("tab", { name: /Reusable phrases 1/ })).toBeVisible();
    await expect(compatibilitySections.getByRole("tab", { name: /Templates & slots 1/ })).toBeVisible();
    const compatibilityRow = page.locator(".admin-content-row", { hasText: "compatibility.sun.aries.libra" });
    await expect(compatibilityRow).toHaveCount(1);
    await expect(compatibilityRow.getByText("Sun · Aries → Libra", { exact: true })).toBeVisible();
    await expect(compatibilityRow).toContainText("You: Aries · Friend: Libra");
    await expect(page.getByLabel("Compatibility sort").locator("option:checked")).toHaveText("Newest updated");
    await page.getByLabel("Compatibility planet or point").selectOption("venus");
    await expect(page.locator(".admin-content-row", { hasText: "authored/compat-deep/jupiter/libra/taurus" })).toHaveCount(0);
    await page.getByLabel("Compatibility planet or point").selectOption("jupiter");
    await expect(page.locator(".admin-content-row", { hasText: "authored/compat-deep/jupiter/libra/taurus" })).toHaveCount(1);
    await page.getByLabel("Compatibility planet or point").selectOption("all");
    await page.getByLabel("Compatibility sort").selectOption("title-asc");
    await expect(page.getByLabel("Compatibility sort").locator("option:checked")).toHaveText("Planet + sign pair A-Z");
    await page.getByLabel("Search compatibility").fill("you pisces friend aquarius");
    const directionalCompatibilityResult = page.locator(".admin-content-row", { hasText: "authored/compat-deep/sun/pisces/aquarius" });
    await expect(directionalCompatibilityResult.getByText("Sun · Pisces → Aquarius", { exact: true })).toBeVisible();
    await expect(directionalCompatibilityResult).toContainText("You: Pisces · Friend: Aquarius");
    await directionalCompatibilityResult.getByRole("button", { name: "Edit" }).click();
    const compatibilityEditor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(compatibilityEditor.getByRole("heading", { name: "Edit Sun · Pisces → Aquarius" })).toBeVisible();
    const compatibilityIdentity = compatibilityEditor.getByRole("region", { name: "Compatibility record identity" });
    await expect(compatibilityIdentity).toContainText("You: Pisces · Friend: Aquarius");
    await expect(compatibilityIdentity).toContainText("Reversing the two signs opens a different record");
    const reverseButton = compatibilityIdentity.getByRole("button", { name: "Open reverse · Aquarius → Pisces" });
    await expect(reverseButton).toBeEnabled();
    await reverseButton.click();
    await expect(compatibilityEditor.getByRole("heading", { name: "Edit Sun · Aquarius → Pisces" })).toBeVisible();
    await expect(compatibilityIdentity).toContainText("You: Aquarius · Friend: Pisces");
    await compatibilityIdentity.getByRole("button", { name: "Open reverse · Pisces → Aquarius" }).click();
    await expect(compatibilityEditor.getByRole("heading", { name: "Edit Sun · Pisces → Aquarius" })).toBeVisible();
    const compatibilityWriteup = compatibilityEditor.getByLabel("Compatibility write-up");
    const originalCompatibilityWriteup = await compatibilityWriteup.inputValue();
    await compatibilityWriteup.fill(`${originalCompatibilityWriteup} `);
    await expect(compatibilityIdentity.getByRole("button", { name: "Open reverse · Aquarius → Pisces" })).toBeDisabled();
    await compatibilityWriteup.fill(originalCompatibilityWriteup);
    await expect(compatibilityIdentity.getByRole("button", { name: "Open reverse · Aquarius → Pisces" })).toBeEnabled();
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileReverseButton = compatibilityIdentity.getByRole("button", { name: "Open reverse · Aquarius → Pisces" });
    const [mobileIdentityBox, mobileReverseButtonBox] = await Promise.all([
      compatibilityIdentity.boundingBox(),
      mobileReverseButton.boundingBox()
    ]);
    expect(mobileIdentityBox).not.toBeNull();
    expect(mobileReverseButtonBox).not.toBeNull();
    expect(mobileReverseButtonBox!.width).toBeGreaterThanOrEqual(250);
    expect(mobileReverseButtonBox!.width).toBeLessThanOrEqual(mobileIdentityBox!.width);
    await expectNoHorizontalOverflow(page, "Compatibility reverse action on mobile");
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      path: path.join(adminScreenshotDir, "mobile-compatibility-reverse-button.png")
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(compatibilityEditor.getByLabel("Card title")).toHaveValue("Aquarius");
    await expect(compatibilityEditor.getByLabel("TL;DR (optional)")).toBeVisible();
    await expect(compatibilityWriteup).toBeVisible();
    await compatibilityEditor.getByRole("button", { name: "Close" }).click();
    await expect(directionalCompatibilityResult.getByRole("button", { name: "Edit" })).toBeFocused();

    await page.getByLabel("Search compatibility").fill("you aries friend libra");
    await compatibilityRow.getByRole("button", { name: "Edit" }).click();
    await expect(compatibilityEditor.getByRole("button", { name: "Reverse record unavailable" })).toBeDisabled();
    await compatibilityEditor.getByRole("button", { name: "Close" }).click();

    const createCardButton = page.locator(".admin-new-actions").getByRole("button", { name: "Card copy" });
    await createCardButton.click();
    await expect(compatibilityEditor.getByRole("heading", { name: "Create compatibility card" })).toBeVisible();
    await expect(compatibilityEditor.getByRole("button", { name: /Reverse record/ })).toHaveCount(0);
    await expect(compatibilityEditor.getByRole("button", { name: "Close" })).toBeFocused();
    const newCardSave = compatibilityEditor.getByRole("button", { name: "Save", exact: true });
    await expect(newCardSave).toBeDisabled();
    await compatibilityEditor.getByLabel("Compatibility card planet").selectOption("mars");
    await compatibilityEditor.getByLabel("Compatibility card reader sign").selectOption("pisces");
    await compatibilityEditor.getByLabel("Compatibility card friend sign").selectOption("aquarius");
    await expect(compatibilityEditor.getByLabel("Content key")).toHaveValue("authored/compat-pair/mars/pisces/aquarius");
    await compatibilityEditor.getByLabel("Compatibility write-up").fill("Mars between Pisces and Aquarius needs room for both instinct and perspective.");
    await expect(newCardSave).toBeEnabled();
    await newCardSave.click();
    expect(compatibilityWrite?.method).toBe("POST");
    expect(compatibilityWrite?.payload).toMatchObject({
      contentKey: "authored/compat-pair/mars/pisces/aquarius",
      lane: "serving",
      blockType: "compatibility_planet_card"
    });
    await compatibilityEditor.getByRole("button", { name: "Close" }).click();
    await expect(page.locator(".admin-content-row", { hasText: "authored/compat-pair/mars/pisces/aquarius" })).toHaveCount(1);

    await page.getByLabel("Search compatibility").fill("no-result-keyword");
    const compatibilityEmpty = page.locator(".admin-compatibility-empty");
    await expect(compatibilityEmpty).toContainText("Current filters:");
    await compatibilityEmpty.getByRole("button", { name: "Clear Compatibility filters" }).click();
    await expect(page.getByLabel("Search compatibility")).toHaveValue("");

    await page.locator(".admin-new-actions").getByRole("button", { name: "Template" }).click();
    await expect(compatibilityEditor.getByRole("heading", { name: "Edit Compatibility · Planet card" })).toBeVisible();
    await expect(compatibilityEditor.getByLabel("Template name")).toHaveValue("Compatibility planet card slot");
    await expect(compatibilityEditor.getByLabel("Template purpose (optional)")).toBeVisible();
    await expect(compatibilityEditor.getByLabel("Template pattern")).toBeVisible();
    await compatibilityEditor.getByRole("button", { name: "Close" }).click();
    await expect(compatibilityEditor).toHaveCount(0);

    const createPhraseButton = page.locator(".admin-new-actions").getByRole("button", { name: "Phrase" });
    await createPhraseButton.click();
    await expect(compatibilityEditor.getByRole("heading", { name: "Create reusable phrase" })).toBeVisible();
    await expect(compatibilityEditor.getByRole("region", { name: "Content role" })).toHaveCount(0);
    await compatibilityEditor.getByLabel("Phrase title").fill("Repair timing phrase");
    await compatibilityEditor.getByLabel("Reusable phrase").fill("Name the timing mismatch before assigning blame.");
    await compatibilityEditor.getByRole("button", { name: "Save", exact: true }).click();
    expect(compatibilityWrite?.payload).toMatchObject({
      contentKey: "vocab/relationship/repair-timing-phrase",
      lane: "reference",
      blockType: "vocabulary_phrase"
    });
    await compatibilityEditor.getByRole("button", { name: "Close" }).click();
    await expect(compatibilityEditor).toHaveCount(0);
    await expect(page.locator(".admin-content-row", { hasText: "vocab/relationship/repair-timing-phrase" })).toHaveCount(1);

    await createCardButton.click();
    await compatibilityEditor.getByLabel("Compatibility card planet").selectOption("saturn");
    await compatibilityEditor.getByLabel("Compatibility write-up").fill("Unsaved compatibility draft used to verify the close warning.");
    page.once("dialog", async (dialog) => dialog.dismiss());
    await compatibilityEditor.getByRole("button", { name: "Close" }).click();
    await expect(compatibilityEditor).toBeVisible();
    page.once("dialog", async (dialog) => dialog.accept());
    await compatibilityEditor.press("Escape");
    await expect(compatibilityEditor).toHaveCount(0);
    await expect(createCardButton).toBeFocused();

    await expect(page.locator(".admin-content-row", { hasText: "Moon in Virgo" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Compatibility" })).toHaveAttribute("aria-current", "page");

    await assertNoBrowserErrors();
  });

  test("surface map organizes editable content by the reader surface where it appears", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    let cmsWrite: { method: string; payload: Record<string, unknown> } | null = null;
    await seedAdminApi(page, { onGeneratedContentWrite: (write) => { cmsWrite = write; } });
    await expectAdminRouteLoads(page, "/admin/content#surface-map");

    await expectAdminHeader(page, "Surface Map", "Admin / Composition / Surface map");

    const areaFilters = page.getByRole("group", { name: "Filter surfaces by area" });
    const statusFilters = page.getByRole("group", { name: "Filter surfaces by admin editability" });
    const planetCards = page.locator(".admin-surface-card", { hasText: "Friends Compatibility: Planet Comparison Cards" });
    const skyAspect = page.locator(".admin-surface-card", { hasText: "Sky Aspect Detail Pages" });
    const calendarEvents = page.locator(".admin-surface-card", { hasText: "Sky Calendar: Event Cards" });
    const friendsSurfaceLabels = writingSurfaceSourceMap
      .filter((surface) => surface.area === "Friends")
      .map((surface) => surface.surface);

    expect(friendsSurfaceLabels).toEqual(expect.arrayContaining([
      "Friends Compatibility: Planet Comparison Cards",
      "Friends Compatibility: Exact Dynamics Lanes",
      "Friends Synastry: Aspect Rows And Detail Pages"
    ]));

    await areaFilters.getByRole("button", { name: "Friends" }).click();
    await expect(planetCards).toHaveCount(1);
    await expect(skyAspect).toHaveCount(0);

    await statusFilters.getByRole("button", { name: "Editable", exact: true }).click();
    await expect(planetCards).toHaveCount(1);

    await statusFilters.getByRole("button", { name: "Runtime gaps" }).click();
    await expect(areaFilters.getByRole("button", { name: "Friends" })).toHaveAttribute("aria-pressed", "true");
    await expect(statusFilters.getByRole("button", { name: "Runtime gaps" })).toHaveAttribute("aria-pressed", "true");
    await expect(planetCards).toHaveCount(0);

    await statusFilters.getByRole("button", { name: "All" }).click();
    await areaFilters.getByRole("button", { name: "Calendar" }).click();
    await expect(calendarEvents).toHaveCount(1);
    await expect(planetCards).toHaveCount(0);

    await areaFilters.getByRole("button", { name: "Sky" }).click();
    await expect(skyAspect).toHaveCount(1);
    const skyAspectAccess = writingSurfaceAdminAccess["sky-aspect-detail"];
    for (const route of skyAspectAccess.routes) {
      await expect(skyAspect.locator(`a[href='${route.hash}']`)).toHaveCount(1);
    }

    await areaFilters.getByRole("button", { name: "You" }).click();
    const emptyHouseSurface = page.locator(".admin-surface-card", { hasText: "Empty House Cards And Detail Pages" });
    await emptyHouseSurface.getByRole("button", { name: "Start empty-house detail template" }).click();
    const editor = page.locator(".admin-editor-panel");
    await expect(editor.getByRole("heading", { name: "Create saved row" })).toBeVisible();
    await expect(editor.getByLabel("Content key")).toHaveValue("cms/natal-empty-house/detail/you/template");
    await expect(editor.getByText("Reader-facing CMS override")).toBeVisible();
    await expect(editor.locator("p", { hasText: "Allowed slots:" })).toContainText("{{houseOrdinal}}");
    await fillAdminEditorField(editor, "Full passage / body", "Your {{houseOrdinal}} house begins in {{missingTopic}}.");
    await expect(editor.getByRole("alert", { name: "CMS template errors" })).toContainText("{{missingTopic}}");
    await expect(editor.getByText("Save this draft before review or publication.")).toBeVisible();
    await expect(editor.getByRole("button", { name: "Publish to app" })).toHaveCount(0);
    await fillAdminEditorField(editor, "Full passage / body", "Your {{houseOrdinal}} house begins in {{sign}}. Review what you repeat here each month.");
    await expect(editor.getByRole("alert", { name: "CMS template errors" })).toHaveCount(0);
    await expect(editor.getByLabel("CMS template preview")).toContainText("Your 2nd house begins in Taurus.");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor.getByText("Reader-facing CMS override")).toBeVisible();
    await expect(editor.locator(".admin-editor-toolbar")).toContainText("Draft");
    await expect(editor.getByRole("button", { name: "Mark reviewed" })).toBeEnabled();
    await expect(editor.getByRole("button", { name: "Publish to app" })).toBeEnabled();
    expect(cmsWrite?.method).toBe("POST");
    expect(cmsWrite?.payload.sourceSnapshot).toMatchObject({
      contentType: "mustache-template",
      contentSystem: "cms-surface-override",
      contentLevel: "owner-authored",
      allowedSlots: expect.arrayContaining(["houseOrdinal", "sign"])
    });
    await editor.getByRole("button", { name: "Close" }).click();

    await assertNoBrowserErrors();
  });

  test("held Sky aspect passages are searchable and editable without generic publication", async ({ page }) => {
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page, { onGeneratedContentWrite: (write) => writes.push(write) });
    await expectAdminRouteLoads(page, "/admin/content#source-drafts");

    await expectAdminHeader(page, "Sky Aspect Drafts", "Admin / App surfaces / Sky aspect drafts");
    await expect(page.getByText("2 of 2 passages shown")).toBeVisible();
    await page.getByLabel("Search Sky aspect drafts").fill("Sun trine Chiron");
    const sourceRow = page.locator(".admin-fallback-row", { hasText: "sky.sun.trine.chiron" });
    await expect(sourceRow).toHaveCount(1);
    await expect(page.locator(".admin-fallback-row", { hasText: "sky.sun.opposition.north-node" })).toHaveCount(0);
    await sourceRow.getByRole("button", { name: "Open draft" }).click();

    const editor = page.locator(".admin-editor-panel");
    await expect(editor.getByRole("heading", { name: "Create saved row" })).toBeVisible();
    await expect(editor.getByLabel("Content key")).toHaveValue("sky.sun.trine.chiron");
    await expect(editor.getByLabel("Full passage / body")).toHaveValue(heldSkyAspectDrafts[0].body);
    await expect(editor.getByLabel("Lane")).toHaveValue("reference");
    await expect(editor.getByLabel("Review state")).toHaveValue("NEEDS_OWNER_DECISION");

    await expect(editor.getByLabel("Status", { exact: true })).not.toBeVisible();
    await expect(editor.getByRole("button", { name: "Publish to app" })).toHaveCount(0);
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].payload).toMatchObject({
      contentKey: "sky.sun.trine.chiron",
      status: "DRAFT",
      lane: "reference",
      reviewState: "NEEDS_OWNER_DECISION",
      blockType: "sky_aspect"
    });

    await assertNoBrowserErrors();
  });

  test("composition filters keep vocabulary, hooks, templates, and slots aligned to visible rows", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);

    await expectAdminRouteLoads(page, "/admin/content#vocabulary");
    await page.waitForURL("**/admin/content#vocabulary");
    await expectAdminHeader(page, "Vocabulary & Phrases", "Admin / Composition / Vocabulary & phrases");
    const vocabularyTabs = page.getByRole("tablist", { name: "Vocabulary categories" });
    await expect(vocabularyTabs.getByRole("tab", { name: "Planets" })).toHaveAttribute("aria-selected", "true");
    const relationshipVocabTab = vocabularyTabs.getByRole("tab", { name: "Relationship" });
    await relationshipVocabTab.click();
    await expect(page).toHaveURL(/#vocabulary\?category=relationship$/);
    await expect(
      page.getByRole("tablist", { name: "Vocabulary categories" }).getByRole("tab", { name: "Relationship" })
    ).toHaveAttribute("aria-selected", "true");
    await page.getByLabel("Search vocabulary").fill("vocab/relationship/compatibility-repair");
    await expect(page.locator(".admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-content-row")).toContainText("vocab/relationship/compatibility-repair");

    await page.getByRole("navigation", { name: "Composition workspace" }).getByRole("button", { name: "Fallback Hooks" }).click();
    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    const friendsFallbackTab = page
      .getByRole("tablist", { name: "Fallback hook sections" })
      .getByRole("tab", { name: "Friends" });
    await friendsFallbackTab.click();
    await expect(friendsFallbackTab).toHaveAttribute("aria-selected", "true");
    await page.getByLabel("Search fallback articles and passages").fill("compatibility card");
    await expect(page.locator(".admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-content-row")).toContainText("fallback-hook/friends.compatibility.planet-card");

    await expectAdminRouteLoads(page, "/admin/content#templates");
    await expectAdminHeader(page, "Templates", "Admin / Composition / Templates");
    await page.getByLabel("Search templates").fill("compatibility planet card");
    await expect(page.locator(".admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-content-row")).toContainText("slot-template/compatibility/planet-card");

    await expectAdminRouteLoads(page, "/admin/content#slots");
    await expectAdminHeader(page, "Slots", "Admin / Composition / Slots");
    await page.getByLabel("Search slot-backed rows").fill("template slot");
    await expect(page.locator(".admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-content-row")).toContainText("slot-template/compatibility/planet-card");

    await assertNoBrowserErrors();
  });

  test("package vocabulary rows expose one editable variable value instead of empty article fields", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const vocabularyRow = {
      ...generatedContentRows[0],
      id: "qa-pisces-moon-caution",
      content_key: "fallback-vocab/dodont-moon-dont/pisces",
      surface: "modifier",
      mode: "feed",
      status: "DRAFT",
      event_type: "fallback-vocabulary",
      headline: "Pisces",
      summary: "",
      body: "",
      lane: "reference",
      review_state: "fallback-system-reference",
      block_type: null,
      facts: { fallbackArchitectureV3: true, review_status: "approved" },
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        content_role: "vocabulary",
        review_status: "approved"
      },
      sections: {
        packageRecord: {
          contentKey: "fallback-vocab/dodont-moon-dont/pisces",
          content_role: "vocabulary",
          body: "Saying yes on autopilot",
          body_you: "",
          body_they: "",
          review_status: "approved"
        }
      },
      provider: "tldrastro-fallback-architecture-v3"
    };
    await seedAdminApi(page, {
      generatedRows: [vocabularyRow],
      onGeneratedContentWrite: (write) => writes.push(write)
    });
    await expectAdminRouteLoads(page, "/admin/content#vocabulary?category=signs&q=pisces");

    const listRow = page.locator(".admin-content-row", { hasText: "fallback-vocab/dodont-moon-dont/pisces" });
    await expect(listRow).toHaveCount(1);
    await listRow.getByRole("button", { name: "Edit" }).click();

    const editor = page.locator(".admin-editor-panel");
    await expect(editor.getByLabel("Phrase authoring guidance")).toContainText("Edit this variable value");
    await expect(editor.getByRole("region", { name: "Variable usage" })).toContainText("Daily Moon caution");
    await expect(editor.getByRole("region", { name: "Variable usage" })).toContainText("Moon is in Pisces");
    await expect(editor.getByLabel("Variable value")).toHaveValue("Saying yes on autopilot");
    await expect(editor.getByLabel("Variable approval")).toHaveValue("approved");
    await expect(editor.getByLabel("TL;DR / summary")).toHaveCount(0);
    await expect(editor.getByLabel("body_you")).toHaveCount(0);
    await expect(editor.getByLabel("body_they")).toHaveCount(0);
    await expect(editor.getByLabel("Status", { exact: true })).toHaveCount(0);
    await expect(editor.getByLabel("Surface")).toHaveCount(0);
    await expect(editor.getByText("Fallback ingredient check")).toHaveCount(0);
    await expect(editor.getByText("Internal source details")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(editor.getByLabel("Variable value")).toBeVisible();
    const mobileEditorBox = await editor.boundingBox();
    expect(mobileEditorBox).not.toBeNull();
    expect(mobileEditorBox!.x).toBeGreaterThanOrEqual(0);
    expect(mobileEditorBox!.width).toBeLessThanOrEqual(390);

    await editor.getByLabel("Variable value").fill("Agreeing before checking your capacity");
    await editor.getByRole("button", { name: "Save revision", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].method).toBe("PATCH");
    expect(writes[0].payload.body).toBe("Agreeing before checking your capacity");
    expect((writes[0].payload.sections as { packageDraft: { body: string } }).packageDraft.body)
      .toBe("Agreeing before checking your capacity");
    await expect(editor.getByText("Revision saved; awaiting approval", { exact: true })).toBeVisible();
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      path: path.join(adminScreenshotDir, "template-editor-saved-desktop.png")
    });

    const discardPrompts: string[] = [];
    page.on("dialog", async (dialog) => {
      discardPrompts.push(dialog.message());
      await dialog.dismiss();
    });
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(editor).toHaveCount(0);
    expect(discardPrompts).toEqual([]);

    await assertNoBrowserErrors();
  });

  test("audience-aware vocabulary rows expose editable you and they versions", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const vocabularyRow = {
      ...generatedContentRows[0],
      id: "qa-sun-function-voices",
      content_key: "fallback-vocab/planet-function/sun",
      surface: "modifier",
      mode: "feed",
      status: "DRAFT",
      event_type: "fallback-vocabulary",
      headline: "Sun",
      summary: "",
      body: "",
      lane: "reference",
      review_state: "fallback-system-reference",
      block_type: null,
      facts: { fallbackArchitectureV3: true, review_status: "approved_reuse" },
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        content_role: "vocabulary",
        review_status: "approved_reuse"
      },
      sections: {
        packageRecord: {
          contentKey: "fallback-vocab/planet-function/sun",
          content_role: "vocabulary",
          body: "identity, vitality, and where you're meant to shine",
          body_you: "",
          body_they: "identity, vitality, and where they're meant to shine",
          review_status: "approved_reuse"
        }
      },
      provider: "tldrastro-fallback-architecture-v3"
    };
    await seedAdminApi(page, {
      generatedRows: [vocabularyRow],
      onGeneratedContentWrite: (write) => writes.push(write)
    });
    await expectAdminRouteLoads(page, "/admin/content#vocabulary?category=planets&q=sun");

    const listRow = page.locator(".admin-content-row", { hasText: "fallback-vocab/planet-function/sun" });
    await listRow.getByRole("button", { name: "Edit" }).click();

    const editor = page.locator(".admin-editor-panel");
    await expect(editor.getByLabel("You version")).toHaveValue("identity, vitality, and where you're meant to shine");
    await expect(editor.getByLabel("They version")).toHaveValue("identity, vitality, and where they're meant to shine");
    await expect(editor.getByLabel("body_you")).toHaveCount(0);
    await expect(editor.getByLabel("body_they")).toHaveCount(0);

    await editor.getByLabel("You version").fill("identity, purpose, and where you take up space");
    await editor.getByLabel("They version").fill("identity, purpose, and where they take up space");
    await editor.getByRole("button", { name: "Save revision", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].payload.body).toBe("identity, purpose, and where you take up space");
    expect((writes[0].payload.sections as { packageDraft: { body: string; body_they: string } }).packageDraft)
      .toMatchObject({
        body: "identity, purpose, and where you take up space",
        body_they: "identity, purpose, and where they take up space"
      });

    await assertNoBrowserErrors();
  });

  test("content library and publish filters expose writing QA controls", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content");

    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Content Library" }).click();
    await expect(page.locator("section[aria-label='Content list filters']")).toBeVisible();
    await expect(page.locator("[aria-label='Status']")).toBeVisible();
    await expect(page.locator("[aria-label='Status']").getByRole("tab", { name: /Draft/ })).toBeVisible();
    await expect(page.locator("[aria-label='Status']").getByRole("tab", { name: /Published/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "App visibility status" }).getByText("App visibility")).toBeVisible();

    await page.getByLabel("Search content").fill("moon");
    await expect(page.locator(".admin-content-row", { hasText: "Moon in Virgo" }).first()).toBeVisible();
    await expect(page.locator(".admin-content-row", { hasText: "QA Mercury Hidden Body Search Trap" })).toHaveCount(0);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByLabel("Search content")).toHaveValue("");
    await expect(page.locator(".admin-content-row", { hasText: "QA Mercury Hidden Body Search Trap" })).toHaveCount(1);

    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Review Queue" }).click();
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await expect(page.locator("section[aria-label='Review queue filters']")).toBeVisible();
    await expect(page.locator("section[aria-label='Review queue filters']").getByLabel("Status")).toBeVisible();
    await expect(page.locator("section[aria-label='Review queue filters']").getByLabel("Evergreen")).toBeVisible();

    await assertNoBrowserErrors();
  });

  test("unresolved content shows the governed package inventory and links to Content Library", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    let sourceDecision: Record<string, unknown> | null = null;
    let editorialReviewWrite: Record<string, unknown> | null = null;
    const editableUnresolvedItem = unresolvedQueue.items.find((item) => item.contentKey === guidedLunationContentKey);
    const missingUnresolvedItem = unresolvedQueue.items.find((item) => item.reason === "review-status" && item.contentKey !== editableUnresolvedItem?.contentKey);
    expect(editableUnresolvedItem).toBeTruthy();
    const editableUnresolvedRow = {
      ...generatedContentRows[0],
      id: "qa-editable-unresolved-row",
      content_key: editableUnresolvedItem?.contentKey,
      status: "DRAFT",
      lane: "reference",
      review_state: "needs-review",
      source_snapshot: {
        sourceType: "owner-resource-review",
        sourcePackage: "tldrastro-fallback-architecture-v3",
        review_status: "needs_review"
      },
      headline: guidedLunationRecord.headline,
      summary: "",
      body: guidedLunationRecord.body,
      block_type: "authored_content",
      facts: { fallbackArchitectureV3: true, review_status: "needs_review" },
      sections: {
        packageRecord: { ...guidedLunationRecord },
        body_you: null,
        body_they: null
      }
    };
    await seedAdminApi(page, {
      generatedRows: [editableUnresolvedRow, ...generatedContentRows],
      onSourceDecisionWrite: (payload) => { sourceDecision = payload; },
      onGeneratedContentWrite: ({ payload }) => {
        const review = (payload.sections as { contentStudioReview?: unknown } | undefined)?.contentStudioReview;
        if (review && typeof review === "object") editorialReviewWrite = payload;
      }
    });
    await expectAdminRouteLoads(page, "/admin/content#unresolved-content");

    await expectAdminHeader(page, "Unresolved Content", "Admin / Publish / Unresolved content");
    await expect(page.getByRole("region", { name: "Unresolved content overview" })).toContainText("Resolve content holds");
    await expect(page.getByRole("region", { name: "Unresolved content overview" })).toContainText("Review exact replacements and authorize source repairs here.");
    await expect(page.getByRole("region", { name: "Unresolved content records" })).toBeVisible();
    await expect(page.locator(".admin-unresolved-content-table tbody tr")).toHaveCount(Math.min(25, unresolvedIssueCount));
    if (unresolvedIssueCount > 25) {
      await expect(page.getByRole("navigation", { name: "Unresolved content pagination" })).toContainText(`Showing 1–25 of ${unresolvedIssueCount}`);
    }

    const unresolvedHeadingStyle = await page.getByRole("heading", { name: "Resolve content holds" }).evaluate((heading) => {
      const style = getComputedStyle(heading);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.textAlign];
    });
    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Review Queue" }).click();
    const reviewHeadingStyle = await page.getByRole("heading", { name: "Review, sign off, publish" }).evaluate((heading) => {
      const style = getComputedStyle(heading);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing, style.textAlign];
    });
    expect(unresolvedHeadingStyle).toEqual(reviewHeadingStyle);
    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Unresolved Content" }).click();

    await page.getByLabel("Search unresolved content").fill("sun/virgo");
    await expect(page.locator(".admin-unresolved-content-table tbody tr")).toHaveCount(1);
    const sourceRepairIssue = page.locator(".admin-unresolved-content-table tbody tr").first();
    await expect(sourceRepairIssue).toContainText("fallback-hook/sky-sign-copy/sun/virgo");
    await expect(sourceRepairIssue).toContainText("Sky / Transits");
    await expect(sourceRepairIssue).toContainText("Action needed");
    await expect(sourceRepairIssue).toContainText("Review the exact replacement");
    await expect(sourceRepairIssue).toContainText("Responsible now: You");
    await expect(sourceRepairIssue.getByRole("list", { name: /Resolution progress/ })).toContainText("Diagnose conflict");
    await expect(sourceRepairIssue.getByRole("list", { name: /Resolution progress/ })).toContainText("Review replacement");
    await expect(sourceRepairIssue.getByRole("button", { name: "Open exact row" })).toHaveCount(0);
    await expect(sourceRepairIssue.getByRole("button", { name: "Review replacement now" })).toBeVisible();
    await expect(sourceRepairIssue.getByRole("button", { name: "Copy investigation" })).toBeVisible();
    await sourceRepairIssue.getByRole("button", { name: "Review replacement now" }).click();
    const repairDialog = page.getByRole("dialog", { name: "Review replacement for fallback-hook/sky-sign-copy/sun/virgo" });
    await expect(repairDialog).toBeVisible();
    await expectFormShellDoesNotOverlap(repairDialog, "source repair desktop dialog", {
      header: ":scope > .admin-source-repair-header",
      body: ":scope > .admin-source-repair-body",
      footer: ":scope > .admin-source-repair-footer"
    });
    await expect(repairDialog).toContainText("Sun in Virgo replacement");
    await expect(repairDialog).toContainText("Virgo is not tidiness. Virgo is the standard");
    await expect(repairDialog).toContainText("packages/astro-knowledge/review/sun-virgo-spine-rewrite-v1/candidate.json");
    const approveReplacement = repairDialog.getByRole("button", { name: "Approve exact replacement" });
    await expect(approveReplacement).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectFormShellDoesNotOverlap(repairDialog, "source repair mobile dialog", {
      header: ":scope > .admin-source-repair-header",
      body: ":scope > .admin-source-repair-body",
      footer: ":scope > .admin-source-repair-footer"
    });
    await expectNoHorizontalOverflow(page, "source repair mobile dialog");
    await page.setViewportSize({ width: 1280, height: 900 });
    await repairDialog.getByRole("checkbox").check();
    await expect(approveReplacement).toBeEnabled();
    await approveReplacement.click();
    await expect.poll(() => sourceDecision).not.toBeNull();
    expect(sourceDecision).toMatchObject({
      schema: "content-studio-source-decision/v1",
      contentKey: "fallback-hook/sky-sign-copy/sun/virgo",
      action: "approve-replacement",
      confirmExactText: true
    });
    await expect(repairDialog).toContainText("Approved for implementation");
    await repairDialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(sourceRepairIssue).toContainText("Implement the approved repair");
    await expect(sourceRepairIssue).toContainText("The exact replacement is approved");
    await expect(sourceRepairIssue.getByRole("button", { name: "Copy implementation request" })).toBeVisible();

    await page.getByLabel("Search unresolved content").fill(missingUnresolvedItem?.contentKey ?? "");
    const missingIssue = page.locator(".admin-unresolved-content-table tbody tr").first();
    await expect(missingIssue).toContainText("Diagnose the missing editable row");
    await expect(missingIssue.getByRole("button", { name: "Copy investigation request" })).toBeVisible();

    await page.getByLabel("Search unresolved content").fill(editableUnresolvedItem?.contentKey ?? "");
    const editableIssue = page.locator(".admin-unresolved-content-table tbody tr").first();
    await expect(editableIssue).toContainText("Your next action");
    await expect(editableIssue).toContainText("the Content Library editor with this exact row already selected");
    const guidedReviewButton = editableIssue.getByRole("button", { name: "Review this horoscope" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(guidedReviewButton).toBeVisible();
    await expect(guidedReviewButton).toBeInViewport();
    await expect.poll(() => guidedReviewButton.evaluate((button) => button.scrollWidth <= button.clientWidth)).toBe(true);
    const guidedReviewButtonBox = await guidedReviewButton.boundingBox();
    expect(guidedReviewButtonBox).not.toBeNull();
    expect((guidedReviewButtonBox?.x ?? 0) + (guidedReviewButtonBox?.width ?? 0)).toBeLessThanOrEqual(1280);
    await guidedReviewButton.click();
    await expectAdminHeader(page, "Content Library", "Admin / Write / Content library");
    await expect(page.getByLabel("Search content")).toHaveValue(editableUnresolvedItem?.contentKey ?? "");
    await expect(page.locator(".admin-content-row")).toContainText(editableUnresolvedItem?.contentKey ?? "");
    await expect(page.getByRole("button", { name: "Show reference" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Show retired" })).toHaveAttribute("aria-pressed", "true");
    const guidedEditor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(guidedEditor).toBeVisible();
    await expect(guidedEditor.getByRole("region", { name: "Guided unresolved-content review" })).toContainText("The populated Headline and Body fields below are the copy under review");
    await expect(guidedEditor.getByRole("region", { name: "Guided unresolved-content review" })).toContainText(editableUnresolvedItem?.contentKey ?? "");
    await expect(guidedEditor.getByLabel("Full passage / body")).toHaveValue(String(guidedLunationRecord.body));
    await expect(guidedEditor.getByLabel("body_you")).toHaveCount(0);
    await expect(guidedEditor.getByLabel("body_they")).toHaveCount(0);
    await expect(guidedEditor.getByLabel("Approval", { exact: true })).toBeDisabled();
    await expect(guidedEditor.getByRole("button", { name: "Save held draft" })).toBeDisabled();
    await guidedEditor.getByRole("button", { name: "Record owner copy review" }).click();
    await expect.poll(() => editorialReviewWrite).not.toBeNull();
    expect(editorialReviewWrite).toMatchObject({ reviewStatus: "needs_review" });
    expect((editorialReviewWrite?.sections as { contentStudioReview?: Record<string, unknown> }).contentStudioReview).toMatchObject({
      schema: "content-studio-editorial-review/v1",
      decision: "approved-exact-copy"
    });
    await expect(guidedEditor.getByText("Owner copy review recorded")).toBeVisible();
    await guidedEditor.getByRole("button", { name: "Back to Unresolved Content" }).click();
    await expectAdminHeader(page, "Unresolved Content", "Admin / Publish / Unresolved content");
    await page.getByLabel("Search unresolved content").fill(guidedLunationContentKey);
    const approvedEditorialIssue = page.locator(".admin-unresolved-content-table tbody tr").first();
    await expect(approvedEditorialIssue).toContainText("Owner review complete");
    await expect(approvedEditorialIssue).toContainText("Implement the approved source copy");
    await expect(approvedEditorialIssue.getByRole("button", { name: "Copy source implementation request" })).toBeVisible();

    await page.getByLabel("Search unresolved content").fill("not-a-real-content-key");
    await expect(page.getByText("No matching issues.")).toBeVisible();

    const headingLevels = await page.getByRole("main").getByRole("heading").evaluateAll((headings) => headings.map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      text: heading.textContent?.trim() ?? ""
    })));
    expect(headingLevels.slice(0, 2)).toEqual([
      { level: 1, text: "Unresolved Content" },
      { level: 2, text: "Resolve content holds" }
    ]);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: "Unresolved Content", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resolve content holds", level: 2 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Unresolved content search" })).toBeVisible();
    const noHorizontalOverflow = await page.getByRole("main").evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(noHorizontalOverflow).toBe(true);

    await assertNoBrowserErrors();
  });

  test("unresolved content records a structured Codex response without editing content", async ({ page }) => {
    let recorded: Record<string, unknown> | null = null;
    await seedAdminApi(page, { onResolutionWrite: (payload) => { recorded = payload; } });
    await expectAdminRouteLoads(page, "/admin/content#unresolved-content");
    const issue = unresolvedQueue.issues.find((candidate) => candidate.kind === "editorial-review");
    expect(issue).toBeTruthy();
    await page.getByLabel("Search unresolved content").fill(issue?.contentKey ?? "");
    const response = {
      schema: "content-studio-resolution/v1",
      issueId: issue?.issueId,
      contentKey: issue?.contentKey,
      status: "diagnosis-only",
      diagnosis: "The source contract is incomplete.",
      proposedAction: "Repair the source contract in a scoped PR.",
      filesInvolved: ["apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"],
      prUrl: null,
      ownerDecisionRequired: true
    };
    page.on("dialog", async (dialog) => {
      if (dialog.type() === "prompt") await dialog.accept(JSON.stringify(response));
      else await dialog.dismiss();
    });
    await page.getByRole("button", { name: "Record an existing response" }).click();
    await expect.poll(() => recorded).toEqual(response);
  });

  test("review queue Edit opens the saved-row editor", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content#review-queue");

    const reviewRow = page.locator(".admin-review-queue-row", { hasText: "sky.placement.sun.cancer" });
    await expect(reviewRow).toHaveCount(1);
    await reviewRow.getByRole("button", { name: "Edit" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByRole("heading", { name: "Edit Sun in Cancer" })).toBeVisible();
    await expect(editor.getByLabel("Content key")).toHaveValue("sky.placement.sun.cancer");
    await assertNoBrowserErrors();
  });

  test("aspect rows identify natal, transit, and relationship context before editing", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const aspectRows = [
      {
        ...generatedContentRows[0],
        id: "qa-current-sky-aspect",
        content_key: "sky.aspect.chiron.sextile.north-node.taurus.aquarius",
        surface: "sky",
        mode: "feed",
        status: "DRAFT",
        event_type: "collective-aspect-card",
        headline: "Chiron sextile North Node",
        summary: "Current-sky aspect fixture.",
        body: "Current-sky transit aspect copy.",
        block_type: "sky_aspect",
        review_state: "needs-review"
      },
      {
        ...generatedContentRows[0],
        id: "qa-transit-to-natal-aspect",
        content_key: "authored/transit-aspect/saturn/sun/square",
        surface: "you",
        mode: "card",
        status: "DRAFT",
        event_type: "transit-aspect",
        headline: "Saturn square your Sun",
        summary: "Transit-to-natal aspect fixture.",
        body: "A moving Saturn makes contact with a natal Sun.",
        block_type: "transit_aspect",
        review_state: "needs-review"
      },
      {
        ...generatedContentRows[0],
        id: "qa-natal-aspect",
        content_key: "natal.aspect.sun.square.moon",
        surface: "natal",
        mode: "card",
        status: "DRAFT",
        event_type: "natal_aspect",
        headline: "Sun square Moon",
        summary: "Natal aspect fixture.",
        body: "Two placements within one birth chart.",
        block_type: "natal_aspect",
        review_state: "needs-review"
      },
      {
        ...generatedContentRows[0],
        id: "qa-synastry-aspect",
        content_key: "synastry.sun.square.moon",
        surface: "synastry",
        mode: "synastry_aspect",
        status: "DRAFT",
        event_type: "synastry_aspect",
        headline: "Sun square Moon",
        summary: "Synastry aspect fixture.",
        body: "A connection between two people's charts.",
        block_type: "synastry_aspect",
        review_state: "needs-review"
      }
    ];

    await seedAdminApi(page, { generatedRows: aspectRows });
    await expectAdminRouteLoads(page, "/admin/content#review-queue");

    const currentSkyRow = page.locator(".admin-review-queue-row", { hasText: aspectRows[0].content_key });
    const transitToNatalRow = page.locator(".admin-review-queue-row", { hasText: aspectRows[1].content_key });
    const natalRow = page.locator(".admin-review-queue-row", { hasText: aspectRows[2].content_key });
    const synastryRow = page.locator(".admin-review-queue-row", { hasText: aspectRows[3].content_key });

    await expect(currentSkyRow.locator(".admin-aspect-context-pill")).toHaveText("Transit aspect · current sky");
    await expect(transitToNatalRow.locator(".admin-aspect-context-pill")).toHaveText("Transit aspect · natal contact");
    await expect(natalRow.locator(".admin-aspect-context-pill")).toHaveText("Natal aspect · birth chart");
    await expect(synastryRow.locator(".admin-aspect-context-pill")).toHaveText("Relationship aspect · synastry");

    await page.getByLabel("Search review queue").fill("Natal aspect birth chart");
    await expect(page.locator(".admin-review-queue-row")).toHaveCount(1);
    await expect(page.locator(".admin-review-queue-row")).toContainText(aspectRows[2].content_key);

    await page.getByLabel("Search review queue").fill("");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(currentSkyRow.locator(".admin-aspect-context-pill")).toBeVisible();
    await expectNoHorizontalOverflow(page, "aspect-context review rows");
    await currentSkyRow.getByRole("button", { name: "Edit" }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.locator(".admin-aspect-context-pill")).toHaveText("Transit aspect · current sky");
    await expectNoHorizontalOverflow(page, "aspect-context editor");
    await assertNoBrowserErrors();
  });

  test("new natal aspect They copy shows the exact name variable above the field", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const exactAspectSeed = (contentKey: string, headline: string) => ({
      ...generatedContentRows[0],
      id: `qa-${contentKey.replaceAll("/", "-")}`,
      content_key: contentKey,
      surface: "you",
      mode: "in_depth",
      status: "DRAFT",
      event_type: "fallback-hook",
      headline,
      summary: "Exact natal aspect writing for the reader's birth chart.",
      body: "Exact You copy.",
      block_type: "fallback_hook",
      review_state: "needs-review",
      sections: {
        packageRecord: {
          contentKey,
          content_role: "full_copy",
          grammar_frame: "complete_sentence",
          body: "Exact You copy.",
          body_they: "{{Name}} receives exact They copy.",
          reader_only: true,
          render_policy: "reader-only-exact-lived-v1",
          review_status: "needs_review"
        }
      }
    });

    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    await seedAdminApi(page, {
      generatedRows: [
        exactAspectSeed("fallback-hook/natal-aspect-lived/lilith/conjunction/sun", "Lilith Conjunction Sun"),
        exactAspectSeed("fallback-hook/natal-aspect-lived/moon/square/ascendant", "Moon Square Ascendant")
      ],
      onGeneratedContentWrite: (write) => writes.push(write)
    });
    await expectAdminRouteLoads(
      page,
      "/admin/content#exact-content?category=Natal+Aspects&first=lilith&aspect=square&second=ascendant"
    );

    await page.getByRole("button", { name: "Write Lilith Square Ascendant" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    const theyField = editor.locator('label[data-reader-audience="they"]');
    const hint = theyField.getByRole("note");
    const textarea = theyField.getByLabel("Reader phrase · They");

    await expect(hint).toHaveText("Name variable: {{Name}}. Enter it exactly where the person's name should appear; the app replaces it with their name.");
    await expect(textarea).toHaveAttribute("aria-describedby", "natal-aspect-they-name-hint");
    expect(await theyField.locator(":scope > *").evaluateAll((children) => children.map((child) => child.tagName))).toEqual([
      "SPAN",
      "SMALL",
      "TEXTAREA",
      "SMALL"
    ]);

    await editor.getByText("Publishing and technical settings", { exact: true }).click();
    await editor.getByLabel("Approval", { exact: true }).selectOption("approved");
    await expect(editor.getByLabel("Fallback review status")).toHaveCount(0);
    await expect(editor.getByLabel("Approval status")).toHaveText("Approved");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Will go live on Save");
    await expect(editor.getByLabel("Reader status after save")).toHaveValue("LIVE");
    await expect(editor.getByText("This copy is approved. Save to publish it to readers.")).toBeVisible();

    await editor.getByRole("button", { name: "Save & publish" }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.payload).toMatchObject({ reviewStatus: "approved" });
    await expect(editor.getByLabel("Approval status")).toHaveText("Approved");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await expect(page.getByRole("status")).toContainText("fallback-hook/natal-aspect-lived/lilith/square/ascendant saved as Published");
    await editor.getByText("Structured fields", { exact: true }).click();
    const editorBodyBox = await editor.locator(":scope > .admin-post-editor").boundingBox();
    const savebarBox = await editor.locator(":scope > .admin-editor-savebar").boundingBox();
    expect(editorBodyBox).not.toBeNull();
    expect(savebarBox).not.toBeNull();
    expect((editorBodyBox?.y ?? 0) + (editorBodyBox?.height ?? 0)).toBeLessThanOrEqual((savebarBox?.y ?? 0) + 1);
    expect(await editor.locator(".admin-review-json pre").evaluate((element) => element.clientHeight <= window.innerHeight * 0.46)).toBe(true);
    await assertNoBrowserErrors();
  });

  test("an approved natal aspect stuck in Draft can be published without another copy edit", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const contentKey = "fallback-hook/natal-aspect-lived/lilith/square/ascendant";
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const stuckDraft = {
      ...generatedContentRows[0],
      id: "qa-approved-natal-aspect-stuck-draft",
      content_key: contentKey,
      surface: "you",
      mode: "in_depth",
      status: "DRAFT",
      lane: "reference",
      review_state: "needs-review",
      event_type: "fallback-hook",
      block_type: "fallback_hook",
      provider: "tldrastro-fallback-architecture-v3",
      headline: "Lilith Square Ascendant",
      summary: "Exact natal aspect writing for the reader's birth chart.",
      body: "Exact You copy.",
      facts: { first: "lilith", aspect: "square", second: "ascendant", fallbackArchitectureV3: true, review_status: "approved" },
      source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", review_status: "approved" },
      sections: {
        packageRecord: {
          contentKey,
          content_role: "full_copy",
          grammar_frame: "complete_sentence",
          body_you: "Exact You copy.",
          body_they: "{{Name}} receives exact They copy.",
          reader_only: true,
          render_policy: "reader-only-exact-lived-v1",
          review_status: "approved"
        }
      }
    };

    await seedAdminApi(page, {
      generatedRows: [stuckDraft],
      onGeneratedContentWrite: (write) => writes.push(write)
    });
    await expectAdminRouteLoads(
      page,
      "/admin/content#exact-content?category=Natal+Aspects&first=lilith&aspect=square&second=ascendant"
    );
    await page.getByRole("button", { name: "Edit source" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Approval status")).toHaveText("Approved");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Will go live on Save");
    await expect(editor.getByText("Ready to publish", { exact: true })).toBeVisible();
    const publishButton = editor.getByRole("button", { name: "Save & publish" });
    await expect(publishButton).toBeEnabled();
    await publishButton.click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.method).toBe("PATCH");
    expect(writes[0]?.payload).toMatchObject({ id: stuckDraft.id, reviewStatus: "approved" });
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await expect(page.getByRole("status")).toContainText(`${contentKey} saved as Published`);
    await assertNoBrowserErrors();
  });

  test("a saved fallback revision can be explicitly approved and published", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const contentKey = "fallback-hook/natal-aspect-lived/lilith/square/ascendant";
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const pendingRevision = {
      ...generatedContentRows[0],
      id: "qa-natal-aspect-pending-package-revision",
      content_key: contentKey,
      surface: "you",
      mode: "in_depth",
      status: "DRAFT",
      lane: "reference",
      review_state: "needs-review",
      event_type: "fallback-hook",
      block_type: "fallback_hook",
      provider: "tldrastro-fallback-architecture-v3",
      headline: "Lilith Square Ascendant",
      summary: "Exact natal aspect writing for the reader's birth chart.",
      body: "Installed You copy.",
      facts: { first: "lilith", aspect: "square", second: "ascendant", fallbackArchitectureV3: true, review_status: "needs_review" },
      source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", review_status: "needs_review" },
      sections: {
        packageRecord: {
          contentKey,
          content_role: "full_copy",
          grammar_frame: "complete_sentence",
          body_you: "Installed You copy.",
          body_they: "{{Name}} receives installed They copy.",
          reader_only: true,
          render_policy: "reader-only-exact-lived-v1",
          review_status: "approved"
        },
        packageDraft: {
          contentKey,
          content_role: "full_copy",
          grammar_frame: "complete_sentence",
          body_you: "Approved revised You copy.",
          body_they: "{{Name}} receives approved revised They copy.",
          reader_only: true,
          render_policy: "reader-only-exact-lived-v1",
          review_status: "approved"
        }
      }
    };

    await seedAdminApi(page, {
      generatedRows: [pendingRevision],
      onGeneratedContentWrite: (write) => writes.push(write)
    });
    await expectAdminRouteLoads(
      page,
      "/admin/content#exact-content?category=Natal+Aspects&first=lilith&aspect=square&second=ascendant"
    );
    await page.getByRole("button", { name: "Edit source" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Approval status")).toHaveText("Needs review");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Revision not live");
    await expect(editor.getByText("Revision saved; awaiting approval", { exact: true })).toBeVisible();
    await expect(editor.getByLabel("Reader phrase · You")).toHaveValue("Approved revised You copy.");
    const publishRevisionButton = editor.getByRole("button", { name: "Approve & publish revision" });
    await expect(publishRevisionButton).toBeEnabled();
    await publishRevisionButton.click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.method).toBe("PATCH");
    expect(writes[0]?.payload).toEqual({ id: pendingRevision.id, ownerAction: "approve-package-revision" });
    await expect(editor.getByLabel("Approval status")).toHaveText("Approved");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await expect(editor.getByLabel("Reader phrase · You")).toHaveValue("Approved revised You copy.");
    await expect(editor.getByRole("button", { name: "Approve & publish revision" })).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText(`${contentKey} approved and published to the app`);
    await assertNoBrowserErrors();
  });

  test("missing Sky candidates open a manual draft with their calculated facts", async ({ page }) => {
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page, { onGeneratedContentWrite: (write) => writes.push(write) });
    await expectAdminRouteLoads(page, "/admin/content#review-queue");

    await page.getByRole("button", { name: /Upcoming 90 days/ }).click();
    const missingCard = page.locator(".admin-sky-voice-card", { hasText: "Sun trine Chiron" });
    await expect(missingCard.getByRole("button", { name: "Create draft" })).toBeVisible();
    await missingCard.getByRole("button", { name: "Create draft" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByRole("heading", { name: "Create saved row" })).toBeVisible();
    await expect(editor.getByLabel("Content key")).toHaveValue("sky.aspect.sun.trine.chiron.leo.taurus");
    await expect(editor.getByLabel("Block type")).toHaveValue("sky_aspect");
    await editor.getByLabel("Full passage / body").fill("Owner-authored fixture copy for this exact active Sky aspect.");
    await editor.getByRole("button", { name: "Save", exact: true }).click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].payload).toMatchObject({
      contentKey: "sky.aspect.sun.trine.chiron.leo.taurus",
      eventType: "collective-aspect-card",
      blockType: "sky_aspect",
      facts: { a: "sun", b: "chiron", aspect: "trine", signA: "leo", signB: "taurus" }
    });
    await assertNoBrowserErrors();
  });

  test("generated placement candidates identify the owner-approved article that replaces them", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const servingArticle = {
      ...generatedContentRows[0],
      id: "qa-jupiter-leo-serving-article",
      content_key: "fallback-hook/sky-sign-copy/jupiter/leo",
      headline: "Jupiter in Leo",
      body: "Jupiter enters Leo on {{entryDate}}.\n\nAttention can become the measure.\n\nBefore {{exitDate}}, choose the work.",
      facts: { fallbackArchitectureV3: true, review_status: "approved" },
      provider: "tldrastro-fallback-architecture-v3",
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        review_status: "approved"
      },
      sections: {
        packageRecord: {
          contentKey: "fallback-hook/sky-sign-copy/jupiter/leo",
          content_role: "fallback_hook",
          grammar_frame: "continuous_editorial_unit",
          render_policy: "sky-placement-continuous-v2",
          fact_line: "{{entryDate}} to {{exitDate}}",
          aspect_insert: "{{aspectInsert}}",
          opening: "Jupiter enters Leo on {{entryDate}}.",
          tension: "Attention can become the measure.",
          development: "The work can keep its own shape.",
          close: "Before {{exitDate}}, choose the work.",
          review_status: "approved"
        }
      }
    };
    await seedAdminApi(page, {
      generatedRows: [servingArticle, ...generatedContentRows.slice(1)],
      onGeneratedContentWrite: (write) => writes.push(write)
    });
    await expectAdminRouteLoads(page, "/admin/content#review-queue");

    await page.getByRole("button", { name: /Upcoming 90 days/ }).click();
    const candidate = page.locator(".admin-sky-voice-card", { hasText: "Jupiter in Leo" });

    await expect(candidate.getByText("Not serving — replaced by owner-approved article", { exact: true })).toBeVisible();
    await expect(candidate.getByText("fallback-hook/sky-sign-copy/jupiter/leo", { exact: true })).toBeVisible();
    await candidate.getByRole("button", { name: "Edit serving article" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByRole("region", { name: "Sky Placement article workspace" })).toBeVisible();
    await expect(editor.getByRole("heading", { name: "Jupiter in Leo", exact: true }).first()).toBeVisible();
    await expect(editor.getByText("Full Sky Placement article.", { exact: false }).first()).toBeVisible();
    await expect(editor.getByRole("heading", { name: "Article paragraphs" })).toBeVisible();
    await expect(editor.getByRole("region", { name: "Rendered fallback preview" })).toContainText("Jupiter enters Leo");
    await expect(editor.getByLabel("Fallback field Opening paragraphs")).toHaveValue("Jupiter enters Leo on {{entryDate}}.");
    const calculatedFacts = editor.getByRole("region", { name: "Calculated facts" });
    await expect(calculatedFacts).toContainText("These tokens are the only variables");
    await expect(calculatedFacts).toContainText("{{exitDate}}");
    await expect(editor.getByLabel("Calculated fact target field")).toHaveValue("fact_line");
    await expect(editor.getByText("Package renderer")).toHaveCount(0);
    await editor.getByLabel("Fallback field Development / turn").fill("The work keeps its own shape.");
    await expect(editor.getByRole("region", { name: "Review fallback changes" })).toContainText("The work keeps its own shape.");
    await editor.getByRole("button", { name: "Save revision", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].payload).toMatchObject({
      id: "qa-jupiter-leo-serving-article",
      reviewStatus: "needs_review",
      sections: {
        packageRecord: { development: "The work can keep its own shape.", review_status: "approved" },
        packageDraft: { development: "The work keeps its own shape.", review_status: "approved" }
      }
    });
    await assertNoBrowserErrors();
  });

  test("fallback library groups complete astrology titles by reader content type", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const articleRow = {
      ...generatedContentRows[0],
      id: "qa-fallback-title-article",
      content_key: "fallback-hook/sky-sign-copy/jupiter/leo",
      headline: "Leo",
      provider: "tldrastro-fallback-architecture-v3",
      source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", review_status: "approved" },
      sections: {
        packageRecord: {
          contentKey: "fallback-hook/sky-sign-copy/jupiter/leo",
          content_role: "fallback_hook",
          render_policy: "sky-placement-continuous-v2",
          opening: "Jupiter enters Leo.",
          close: "The work keeps its own shape.",
          review_status: "approved"
        }
      }
    };
    const houseRow = {
      ...articleRow,
      id: "qa-fallback-title-house",
      content_key: "house-horoscope-core/jupiter/leo/house-10",
      headline: "House 10",
      sections: {
        packageRecord: {
          contentKey: "house-horoscope-core/jupiter/leo/house-10",
          content_role: "fallback_hook",
          body_you: "Jupiter in Leo moves through your 10th house.",
          review_status: "approved"
        }
      }
    };
    await seedAdminApi(page, { generatedRows: [articleRow, houseRow] });
    await expectAdminRouteLoads(page, "/admin/content#fallback-hooks");
    await page.getByLabel("Search fallback articles and passages").fill("Jupiter in Leo");

    const articleGroup = page.getByRole("region", { name: "Sky Placement articles" });
    await expect(articleGroup.getByText("Jupiter in Leo", { exact: true })).toBeVisible();
    await expect(articleGroup.getByText("Full Sky Placement article", { exact: true })).toBeVisible();
    const houseGroup = page.getByRole("region", { name: "House horoscopes" });
    await expect(houseGroup.getByText("Jupiter in Leo · 10th House", { exact: true })).toBeVisible();
    await expect(houseGroup.getByText("House horoscope", { exact: true })).toBeVisible();
    const compactTags = houseGroup.locator(".admin-table-tag");
    await expect(compactTags.first()).toBeVisible();
    const tagHeights = await compactTags.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().height)));
    expect(tagHeights.length).toBeGreaterThan(0);
    expect(Math.max(...tagHeights)).toBeLessThanOrEqual(24);
    await page.getByLabel("Search fallback articles and passages").fill("Jupiter in Leo 10th House");
    await expect(articleGroup).toBeHidden();
    await expect(houseGroup.getByText("Jupiter in Leo · 10th House", { exact: true })).toBeVisible();
    await houseGroup.getByRole("button", { name: "Edit" }).click();
    const houseEditor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(houseEditor.getByLabel("Editor label"))
      .toHaveValue("Jupiter in Leo · 10th House");
    await expect(houseEditor.getByRole("note", { name: "Current source: You" })).toContainText("Friends also has horoscope content");
    await expect(houseEditor.getByLabel("Reader passage · You")).toHaveValue("Jupiter in Leo moves through your 10th house.");
    await expect(houseEditor.getByLabel(/They/)).toHaveCount(0);
    await houseEditor.getByRole("button", { name: "Close" }).click();

    await page.getByLabel("Search fallback articles and passages").fill("no matching astrology row");
    await expect(page.getByText("No rows match these filters.", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Search fallback articles and passages").fill("Jupiter in Leo");
    await expect(page.getByRole("region", { name: "Sky Placement articles" })).toContainText("Jupiter in Leo");
    await expect(page.getByRole("region", { name: "House horoscopes" })).toContainText("Jupiter in Leo · 10th House");
    await assertNoBrowserErrors();
  });

  test("Content Library connects a shadowed placement candidate to its owner-approved source workspace", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const servingArticle = {
      ...generatedContentRows[0],
      id: "qa-jupiter-leo-content-library-source",
      content_key: "fallback-hook/sky-sign-copy/jupiter/leo",
      headline: "Jupiter in Leo",
      body: "Jupiter enters Leo on {{entryDate}}.\n\nAttention can become the measure.\n\nBefore {{exitDate}}, choose the work.",
      lane: "reference",
      status: "DRAFT",
      facts: { fallbackArchitectureV3: true, review_status: "approved" },
      provider: "tldrastro-fallback-architecture-v3",
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        review_status: "approved"
      },
      sections: {
        packageRecord: {
          contentKey: "fallback-hook/sky-sign-copy/jupiter/leo",
          content_role: "fallback_hook",
          grammar_frame: "continuous_editorial_unit",
          render_policy: "sky-placement-continuous-v2",
          fact_line: "{{entryDate}} to {{exitDate}}",
          aspect_insert: "{{aspectInsert}}",
          opening: "Jupiter enters Leo on {{entryDate}}.",
          tension: "Attention can become the measure.",
          development: "The work can keep its own shape.",
          close: "Before {{exitDate}}, choose the work.",
          review_status: "approved"
        }
      }
    };
    await seedAdminApi(page, {
      generatedRows: [...generatedContentRows.slice(0, 6), skyReviewHorizonFixture.occurrences[1].row!, servingArticle]
    });
    await expectAdminRouteLoads(page, "/admin/content#exact-content");

    await page.getByLabel("Search content").fill("sky.placement.base.jupiter.leo");
    const candidate = page.locator(".admin-content-row", { hasText: "sky.placement.base.jupiter.leo" });
    await expect(candidate).toHaveCount(1);
    await candidate.getByRole("button", { name: "Edit" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    const readerStatus = editor.getByRole("region", { name: "Reader source status" });
    await expect(readerStatus.getByText("Not serving — replaced by owner-approved article", { exact: true })).toBeVisible();
    await expect(readerStatus.getByText("fallback-hook/sky-sign-copy/jupiter/leo", { exact: true })).toBeVisible();
    await readerStatus.getByRole("button", { name: "Open owner-approved source" }).click();

    await expect(editor.getByRole("region", { name: "Sky Placement article workspace" })).toBeVisible();
    await expect(editor.getByRole("heading", { name: "Jupiter in Leo", exact: true }).first()).toBeVisible();
    await expect(editor.getByLabel("Fallback field Opening paragraphs")).toHaveValue("Jupiter enters Leo on {{entryDate}}.");
    await expect(editor.getByRole("region", { name: "Calculated facts" })).toContainText("{{exitDate}}");
    await assertNoBrowserErrors();
  });

  test("composition surfaces expose templates, slots, vocabulary, fallback hooks, and surface map", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    let deepLinkLoadIndex = 0;
    const openAdminDeepLink = async (hash: string) => {
      await expectAdminRouteLoads(page, `/admin/content?qaCompositionSurface=${deepLinkLoadIndex++}${hash}`);
    };

    await openAdminDeepLink("#composition-map");
    await expectAdminHeader(page, "Composition Map", "Admin / Composition / Map");
    await expect(page.getByText("Start with any reader-facing surface in the app, then follow its editorial sources, runtime path, templates, and calculated facts.")).toBeVisible();
    await expect(page.getByRole("tab", { name: /Surfaces & systems 24/ })).toHaveAttribute("aria-selected", "true");
    const surfaceList = page.getByRole("complementary", { name: "App surfaces and systems" });
    await surfaceList.getByLabel("Search surfaces and systems").fill("Daily At-a-Glance");
    await expect(surfaceList.getByRole("button", { name: /Daily At-a-Glance/ })).toBeVisible();
    await surfaceList.getByRole("button", { name: /Daily At-a-Glance/ }).click();
    await expect(page.getByRole("region", { name: "Selected app surface or system" })).toContainText("Edit daily headline and body hooks");
    await surfaceList.getByLabel("Search surfaces and systems").fill("");
    await surfaceList.getByLabel("Surface or system area").selectOption("Reports");
    await expect(surfaceList.getByRole("button", { name: /Purchased Reports/ })).toBeVisible();
    await surfaceList.getByRole("button", { name: /Purchased Reports/ }).click();
    await expect(page.getByRole("region", { name: "Selected app surface or system" })).toContainText("Editable in Content Studio");
    await expect(page.getByRole("region", { name: "Selected app surface or system" }).getByRole("link", { name: /Preview and edit delivered reports/ })).toHaveAttribute("href", "#report-fulfillment");
    await surfaceList.getByLabel("Surface or system area").selectOption("Friends");
    await surfaceList.getByLabel("Search surfaces and systems").fill("Today between you two");
    await surfaceList.getByRole("button", { name: /Today Between You Two/ }).click();
    await expect(page.getByRole("region", { name: "Selected app surface or system" })).toContainText("Editable in Content Studio");
    await expect(page.getByRole("region", { name: "Selected app surface or system" }).getByRole("link", { name: /Edit Today between you two/ })).toHaveAttribute("href", "#fallback-hooks?section=daily&q=pair-daily");
    await page.getByRole("tab", { name: /Template internals/ }).click();
    await expect(page.getByRole("complementary", { name: "Composition templates" })).toContainText("Friends & relationships");
    await expect(page.getByRole("region", { name: "Selected template composition" }).getByRole("heading", { name: "Planet card" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Reader surface preview" })).toBeVisible();
    await page.getByRole("tab", { name: "Assembly" }).click();
    await expect(page.getByRole("region", { name: "Template slots" })).toContainText("Reader Sign");
    await expect(page.getByRole("region", { name: "Template slots" })).toContainText("Provided by the app");

    await openAdminDeepLink("#fallback-hooks?section=daily&q=daily");
    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    await expect(page.getByRole("tab", { name: "Daily" })).toHaveAttribute("aria-selected", "true");
    const dailyGuide = page.getByRole("region", { name: "How daily content is assembled" });
    await expect(dailyGuide).toContainText("Daily At-a-Glance");
    await expect(dailyGuide).toContainText("Today between you two");
    await dailyGuide.getByRole("button", { name: "Browse shared daily sources" }).click();
    await expect(page.getByLabel("Search fallback articles and passages")).toHaveValue("pair-daily");

    await openAdminDeepLink("#templates");
    await expectAdminHeader(page, "Templates", "Admin / Composition / Templates");
    await expect(page.getByRole("heading", { name: "Reader copy templates" })).toBeVisible();
    await expect(page.getByText("Each row is a reusable pattern for one app destination. Its title shows where it is used.")).toBeVisible();
    const compatibilityTemplate = page.locator(".admin-content-row", { hasText: "slot-template/compatibility/planet-card" });
    await expect(compatibilityTemplate.getByText("Compatibility · Planet card", { exact: true })).toBeVisible();
    await expect(compatibilityTemplate.getByText("Copy pattern for compatibility", { exact: true })).toBeVisible();

    await openAdminDeepLink("#slots");
    await expectAdminHeader(page, "Slots", "Admin / Composition / Slots");
    await expect(page.getByRole("button", { name: /Editable slot rows/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Needs rows" })).toBeVisible();

    await openAdminDeepLink("#vocabulary");
    await expectAdminHeader(page, "Vocabulary & Phrases", "Admin / Composition / Vocabulary & phrases");
    await expect(page.getByRole("tablist", { name: "Vocabulary categories" }).getByRole("tab", { name: "Planets" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Vocabulary categories" }).getByRole("tab", { name: "Relationship" })).toBeVisible();

    await openAdminDeepLink("#fallback-hooks");
    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    await expect(page.locator("main.admin-dashboard")).toContainText(/Sky|Natal|Lunar Calendar|Settings|Friends/);

    await openAdminDeepLink("#surface-map");
    await expectAdminHeader(page, "Surface Map", "Admin / Composition / Surface map");
    await expect(page.getByText(/reader surface directory|mapped surfaces/i).first()).toBeVisible();

    await assertNoBrowserErrors();
  });

  test("composition map opens canonical templates and saved hook sources for editing", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const templateSeed = generatedContentRows.find((row) => row.content_key === "slot-template/compatibility/planet-card")!;
    const hookSeed = generatedContentRows.find((row) => row.content_key === "fallback-hook/friends.compatibility.planet-card")!;
    const templateRow = {
      ...templateSeed,
      id: "qa-composition-map-template",
      content_key: "slot-template/compatibility/closing-card",
      headline: "Compatibility closing card template",
      body: "{{signATitle}} and {{signBTitle}} can return to this: {{closingLine}}",
      source_snapshot: { ...templateSeed.source_snapshot, contentFamily: "friends.compatibility.closing-card" }
    };
    const hookRow = {
      ...hookSeed,
      id: "qa-composition-map-hook",
      content_key: "fallback-hook/compatibility-closing/shared",
      headline: "Shared compatibility closing",
      body: "The connection works best when both people say what they need directly."
    };
    const jupiterTemplateRow = {
      ...templateSeed,
      id: "qa-composition-map-jupiter-template",
      content_key: "fallback-template/natal.planet-in-sign/jupiter",
      headline: "Jupiter in {{signTitle}}",
      body: "Your {{planetTitle}} is in {{signTitle}}.",
      surface: "natal",
      block_type: "fallback_template",
      sections: {
        packageRecord: {
          content_role: "template",
          headline: "Jupiter in {{signTitle}}",
          body_you: "Your {{planetTitle}} is in {{signTitle}}."
        }
      }
    };
    await seedAdminApi(page, { generatedRows: [templateRow, hookRow, jupiterTemplateRow] });
    await expectAdminRouteLoads(page, "/admin/content#composition-map");
    await page.getByRole("tab", { name: /Template internals/ }).click();
    const compositionNotification = page.getByRole("button", { name: "Dismiss notification" });
    if (await compositionNotification.isVisible()) await compositionNotification.click();

    const detail = page.getByRole("region", { name: "Selected template composition" });
    await expect(detail.getByRole("heading", { name: "Closing card" })).toBeVisible();
    const templateList = page.getByRole("complementary", { name: "Composition templates" });
    const jupiterTemplate = templateList.getByRole("button").filter({ hasText: "Jupiter in any sign" });
    await expect(jupiterTemplate).toContainText("Jupiter in any sign");
    await expect(jupiterTemplate).not.toContainText("{{signTitle}}");
    await jupiterTemplate.click();
    await expect(detail.getByRole("heading", { name: "Jupiter in any sign" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Reader surface preview" })).toContainText("Jupiter in Leo");
    await templateList.getByRole("button").filter({ hasText: "Closing card" }).click();
    await expect(detail.getByRole("heading", { name: "Closing card" })).toBeVisible();
    const preview = page.getByRole("region", { name: "Reader surface preview" });
    await expect(preview.getByRole("heading", { name: "Traceable reader rendering" })).toBeVisible();
    await expect(preview).toContainText("Leo and Aquarius can return to this: The connection works best when both people say what they need directly.");
    await expect(preview.locator(".admin-composition-variable.variable-fact").first()).toBeVisible();
    const inlineHook = preview.locator(".admin-composition-variable.variable-hook").filter({ hasText: "The connection works best" });
    await expect(inlineHook).toHaveAttribute("data-variable-action", /Edit Closing Line/);
    await inlineHook.hover();
    await inlineHook.click();
    let editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Content key")).toHaveValue("fallback-hook/compatibility-closing/shared");
    const sentenceContext = editor.getByRole("region", { name: "Reader sentence context" });
    await expect(sentenceContext).toContainText("Closing card · Passage");
    await expect(sentenceContext).toContainText("Leo and Aquarius can return to this:");
    await expect(sentenceContext.locator("mark")).toHaveText("The connection works best when both people say what they need directly.");
    await expect(sentenceContext).toContainText("The highlighted words are the source you are editing.");
    await editor.getByLabel("Reader copy").fill("Both people do better when they say what they need directly.");
    await expect(sentenceContext.locator("mark")).toHaveText("Both people do better when they say what they need directly.");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Discard the unsaved changes");
      await dialog.accept();
    });
    await editor.getByRole("button", { name: "Close" }).click();
    await expect(editor).toHaveCount(0);
    await detail.getByRole("tab", { name: "Main template" }).click();
    await expect(detail.locator(".admin-composition-variable-token.variable-hook")).toHaveAttribute("data-variable-action", /Edit Closing Line/);
    await detail.getByRole("tab", { name: "Reader preview" }).click();
    const renderedCopyBounds = await preview.getByText("Leo and Aquarius can return to this: The connection works best when both people say what they need directly.").boundingBox();
    expect(renderedCopyBounds?.y).toBeLessThan(900);
    await expect(preview.getByRole("button", { name: /Shared compatibility closing/ })).toBeVisible();
    await expectNoHorizontalOverflow(page, "Composition Map desktop");
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "desktop-composition-map.png")
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(detail.getByRole("heading", { name: "Closing card" })).toBeVisible();
    await expect(preview.getByRole("button", { name: /Shared compatibility closing/ })).toBeVisible();
    await expectNoHorizontalOverflow(page, "Composition Map mobile");
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "mobile-composition-map.png")
    });

    await detail.getByRole("button", { name: "Edit main template" }).click();
    editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Content key")).toHaveValue("slot-template/compatibility/closing-card");
    await editor.getByRole("button", { name: "Close" }).click();

    await preview.getByRole("button", { name: /Shared compatibility closing/ }).click();
    editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Content key")).toHaveValue("fallback-hook/compatibility-closing/shared");
    await editor.getByRole("button", { name: "Close" }).click();

    await page.getByRole("tab", { name: "Main template" }).click();
    await expect(page.getByRole("region", { name: "Main template" })).toContainText("{{signATitle}} and {{signBTitle}}");
    await page.getByRole("tab", { name: "Assembly" }).click();
    await expect(page.getByRole("region", { name: "Template slots" })).toContainText("Provided by the app");
    await assertNoBrowserErrors();
  });

  test("template revisions save, close cleanly, and reopen with the saved values", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const contentKey = "fallback-template/transit.aspect";
    const templateRow = {
      ...generatedContentRows[0],
      id: "qa-template-save-close-reopen",
      content_key: contentKey,
      headline: "{{transitTitle}} {{aspectName}} your {{natalTitle}}",
      summary: "Original purpose",
      body: "{{transitRef}} {{aspectAdj}} your natal {{natalTitle}} {{timeline}}.",
      surface: "sky",
      mode: "feed",
      status: "LIVE",
      lane: "serving",
      review_state: null,
      event_type: "fallback-template",
      block_type: "fallback_template",
      provider: "tldrastro-fallback-architecture-v3",
      facts: { fallbackArchitectureV3: true, review_status: "approved_reuse" },
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        content_role: "template",
        readerDestination: "Current Sky",
        review_status: "approved_reuse"
      },
      sections: {
        packageRecord: {
          contentKey,
          content_role: "template",
          headline: "{{transitTitle}} {{aspectName}} your {{natalTitle}}",
          body_you: "{{transitRef}} {{aspectAdj}} your natal {{natalTitle}} {{timeline}}.",
          body_they: "{{transitRef}} {{aspectAdj}} {{otherPoss}} natal {{natalTitle}} {{timeline}}.",
          editorial_notes: "Original purpose",
          review_status: "approved_reuse"
        }
      }
    };

    await seedAdminApi(page, {
      generatedRows: [templateRow],
      onGeneratedContentWrite: (write) => writes.push(write)
    });
    await expectAdminRouteLoads(page, "/admin/content#composition-map");
    await page.getByRole("tab", { name: /Template internals/ }).click();
    const compositionNotification = page.getByRole("button", { name: "Dismiss notification" });
    if (await compositionNotification.isVisible()) await compositionNotification.click();

    const detail = page.getByRole("region", { name: "Selected template composition" });
    await detail.getByRole("button", { name: "Edit main template" }).click();
    let editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Content key")).toHaveValue(contentKey);
    await expect(editor.getByLabel("Template purpose (optional)")).toHaveValue("Original purpose");
    await expectFormShellDoesNotOverlap(editor, "Template editor desktop");

    await fillAdminEditorField(editor, "Template purpose (optional)", "Updated template purpose");
    await editor.getByRole("button", { name: "Save revision", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.payload).toMatchObject({
      id: templateRow.id,
      sections: {
        packageDraft: {
          summary: "Updated template purpose"
        }
      }
    });
    await expect(editor.getByText("Revision saved; awaiting approval", { exact: true })).toBeVisible();

    let discardPrompts = 0;
    page.on("dialog", async (dialog) => {
      discardPrompts += 1;
      await dialog.dismiss();
    });
    await editor.getByRole("button", { name: "Close" }).click();
    await expect(editor).toHaveCount(0);
    expect(discardPrompts).toBe(0);

    await detail.getByRole("button", { name: "Edit main template" }).click();
    editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Template purpose (optional)")).toHaveValue("Updated template purpose");
    await expect(editor.getByRole("button", { name: "Approve & publish revision" })).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: path.join(adminScreenshotDir, "template-editor-saved-desktop.png")
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expectFormShellDoesNotOverlap(editor, "Template editor mobile");
    await expectNoHorizontalOverflow(page, "Template editor mobile");
    await page.screenshot({
      animations: "disabled",
      path: path.join(adminScreenshotDir, "template-editor-saved-mobile.png")
    });
    await assertNoBrowserErrors();
  });

  test("composition map follows the runtime retrograde source and ignores a conflicting placement article", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const articleBody = "Opening article paragraph.\n\nClosing article paragraph.";
    const templateRow = {
      ...generatedContentRows[0],
      id: "qa-retrograde-article-template",
      content_key: "fallback-template/transit.retrograde-article",
      headline: "{{articleHeadline}}",
      summary: "Reader-facing retrograde article wrapper.",
      body: "{{articleBody}}",
      surface: "sky",
      block_type: "fallback_template",
      provider: "tldrastro-fallback-architecture-v3",
      facts: { fallbackArchitectureV3: true, review_status: "approved" },
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        readerDestination: "Current Sky",
        review_status: "approved"
      },
      sections: {
        packageRecord: {
          contentKey: "fallback-template/transit.retrograde-article",
          content_role: "template",
          headline: "{{articleHeadline}}",
          requiredSlots: ["articleHeadline", "articleBody"],
          body: "{{articleBody}}",
          review_status: "approved"
        }
      }
    };
    const articleRow = {
      ...generatedContentRows[0],
      id: "qa-saturn-aries-article",
      content_key: "sky-article/saturn/aries/2026",
      headline: "Saturn in Aries",
      summary: null,
      body: articleBody,
      surface: "sky",
      mode: "feed",
      block_type: null,
      provider: "tldrastro-fallback-architecture-v3",
      facts: { fallbackArchitectureV3: true, review_status: "approved" },
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        review_status: "approved"
      },
      sections: {
        body_you: null,
        body_they: null,
        packageRecord: {
          contentKey: "sky-article/saturn/aries/2026",
          content_role: "authored_card",
          headline: "Saturn in Aries",
          body: articleBody,
          review_status: "approved"
        }
      }
    };
    const retrogradeHookBody = "{{timeOpen}}, {{transitRef}} is retrograde, and the inspection starts. Review what can no longer run on autopilot.";
    const retrogradeHookRow = {
      ...generatedContentRows[0],
      id: "qa-saturn-retrograde-hook",
      content_key: "fallback-hook/transit-retro-article/saturn",
      headline: "The shortcut always sends the bill later.",
      summary: "Planet-specific retrograde article used by the runtime resolver.",
      body: retrogradeHookBody,
      surface: "sky",
      block_type: "fallback_hook",
      provider: "tldrastro-fallback-architecture-v3",
      facts: { fallbackArchitectureV3: true, review_status: "approved" },
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        review_status: "approved",
        content_role: "fallback_hook"
      },
      sections: {
        body_you: retrogradeHookBody,
        body_they: retrogradeHookBody,
        packageRecord: {
          contentKey: "fallback-hook/transit-retro-article/saturn",
          content_role: "fallback_hook",
          grammar_frame: "complete_sentence",
          headline: "The shortcut always sends the bill later.",
          body_you: retrogradeHookBody,
          body_they: retrogradeHookBody,
          review_status: "approved"
        }
      }
    };
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    await seedAdminApi(page, {
      generatedRows: [templateRow, retrogradeHookRow, articleRow],
      onGeneratedContentWrite: (write) => writes.push(write)
    });
    await expectAdminRouteLoads(page, "/admin/content#composition-map");
    await page.getByRole("tab", { name: /Template internals/ }).click();

    const preview = page.getByRole("region", { name: "Reader surface preview" });
    await expect(preview.locator(".admin-composition-preview-field.field-headline h3")).toContainText("The shortcut always sends the bill later.");
    await expect(preview).toContainText("From August 12 through September 3, Saturn in Aries is retrograde, and the inspection starts.");
    await expect(preview).not.toContainText("Opening article paragraph.");
    await expect(preview.getByRole("region", { name: "Saved copy used in preview" })).toContainText("Hook");
    await expect(preview.getByRole("region", { name: "Saved copy used in preview" })).toContainText("fallback-hook/transit-retro-article/saturn");
    await expect(preview.getByRole("button", { name: /The shortcut always sends the bill later.*Edit Article Headline/u })).toHaveAttribute("data-variable-action", /Edit Article Headline/);
    const highlightedHook = preview.locator(".admin-composition-variable.variable-hook").filter({ hasText: "is retrograde" });
    await expect(highlightedHook).toBeVisible();

    const desktopReviewTypography = await preview.evaluate((region) => {
      const readStyle = (selector: string) => {
        const element = region.querySelector<HTMLElement>(selector);
        if (!element) return null;
        const style = getComputedStyle(element);
        return {
          fontFamily: style.fontFamily,
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number.parseInt(style.fontWeight, 10),
          lineHeight: Number.parseFloat(style.lineHeight),
          letterSpacing: style.letterSpacing,
          marginTop: style.marginTop,
          marginBottom: style.marginBottom,
          textTransform: style.textTransform,
          textAlign: style.textAlign
        };
      };
      return {
        heading: readStyle(".admin-composition-preview-field h3"),
        body: readStyle(".admin-composition-preview-field p")
      };
    });
    expect(desktopReviewTypography.heading).toMatchObject({
      fontSize: 22,
      fontWeight: 700,
      marginTop: "0px",
      marginBottom: "0px",
      textTransform: "none"
    });
    expect(desktopReviewTypography.heading?.fontFamily).toBeTruthy();
    expect(desktopReviewTypography.heading?.lineHeight).toBeLessThanOrEqual(28);
    expect(desktopReviewTypography.body).toMatchObject({
      fontSize: 16,
      fontWeight: 400,
      marginTop: "0px",
      marginBottom: "0px",
      textTransform: "none"
    });
    expect(desktopReviewTypography.body?.fontFamily).toBeTruthy();
    expect(desktopReviewTypography.body?.lineHeight).toBeLessThanOrEqual(25);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileReviewTypography = await preview.evaluate((region) => {
      const heading = region.querySelector<HTMLElement>(".admin-composition-preview-field h3");
      const body = region.querySelector<HTMLElement>(".admin-composition-preview-field p");
      return {
        headingSize: heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : null,
        bodySize: body ? Number.parseFloat(getComputedStyle(body).fontSize) : null
      };
    });
    expect(mobileReviewTypography).toEqual({ headingSize: 20, bodySize: 14 });
    await expectNoHorizontalOverflow(page, "Composition Map compact article preview mobile");
    await page.setViewportSize({ width: 1308, height: 900 });

    await highlightedHook.click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByRole("heading", { name: "Edit Saturn · Transit Retro Article" })).toBeVisible();
    await expect(editor.getByLabel("Reader headline")).toHaveValue("The shortcut always sends the bill later.");
    await expect(editor.getByLabel("Reader passage")).toHaveValue(retrogradeHookBody);
    await expect(editor.getByLabel("Reference mirror · not rendered")).toHaveValue(retrogradeHookBody);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(editor.getByRole("heading", { name: "Edit Saturn · Transit Retro Article" })).toBeVisible();
    await expectNoHorizontalOverflow(page, "Composition Map retrograde source editor mobile");

    const revisedBody = `${retrogradeHookBody} A reversible QA edit.`;
    await editor.getByLabel("Reader passage").fill(revisedBody);
    await editor.getByRole("button", { name: "Save revision", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].method).toBe("PATCH");
    expect(writes[0].payload.body).toBe(revisedBody);
    expect((writes[0].payload.sections as { packageDraft?: { body_you?: string } }).packageDraft?.body_you).toBe(revisedBody);
    await assertNoBrowserErrors();
  });

  test("delivered report copy can be previewed, staged privately, and explicitly published", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    const reportId = "qa-report-1";
    const unitId = "qa-report-unit-overview";
    let stagedDraft: Record<string, unknown> | null = null;
    const actions: Array<Record<string, unknown>> = [];
    const metrics = {
      orders: 1,
      entitlementStatuses: { active: 1 },
      fulfillmentStatuses: { live: 1 },
      jobStates: { complete: 1 },
      exceptionDepth: 0,
      auditDepth: 0,
      averageDeliveryMinutes: 3,
      averageJudgeScore: 0.95,
      averageAcceptedTokenCount: 1200,
      averageTotalTokenCount: 1600,
      averageEstimatedSpendUsd: 0.45,
      validatorPassRate: 1,
      judgePassRate: 1,
      attemptDistribution: { "1": 1 },
      judgeScoreDistribution: { "0.95": 1 }
    };
    const reportRow = {
      id: reportId,
      entitlement_id: "qa-entitlement-1",
      entitlement_source: "comp",
      report_domain: "general",
      report_horizon: "12_months",
      fulfillment_status: "live",
      token_count: 1200,
      token_count_total: 1600,
      token_budget_lifetime: 1450000,
      token_spend_usd_estimate: 0.45,
      attempt_counts: { writer: 1 },
      validator_results: [],
      failure_history: []
    };
    await page.route("**/api/admin/report-fulfillment**", async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() === "POST") {
        const payload = route.request().postDataJSON() as Record<string, unknown>;
        actions.push(payload);
        if (payload.action === "save_report_unit_draft") stagedDraft = payload;
        if (payload.action === "discard_report_unit_draft" || payload.action === "publish_report_unit_correction") stagedDraft = null;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
        return;
      }
      if (url.searchParams.get("reportId")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            report: { id: reportId, report_domain: "general", report_horizon: "12_months", fulfillment_status: "live" },
            units: [{
              id: unitId,
              content_key: `report:${reportId}:overview`,
              headline: "Your Year Ahead",
              timing: "January through December",
              summary: "The year asks for deliberate growth.",
              body: "Build the structure that can hold the next chapter.",
              sections: [{ heading: "First movement", body: "Start with the commitment already asking for form." }],
              source_snapshot: stagedDraft ? { adminCorrectionDraft: stagedDraft } : {}
            }]
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ billingMode: "free_test", metrics, reports: [reportRow], audits: [], users: [], callEstimates: {} })
      });
    });

    await expectAdminRouteLoads(page, "/admin/content#report-fulfillment");
    await page.getByRole("button", { name: "Preview and edit" }).click();
    const editor = page.getByRole("region", { name: "Report reader-copy editor" });
    await expect(editor.getByLabel("Reader preview of this report section")).toContainText("Your Year Ahead");
    await expect(editor.getByLabel("Title", { exact: true })).toHaveValue("Your Year Ahead");
    await expect(editor.getByLabel("Timing line")).toHaveValue("January through December");
    await expect(editor.getByLabel("TL;DR")).toHaveValue("The year asks for deliberate growth.");
    await editor.getByLabel("Timing line").fill("February through December");
    await editor.getByRole("textbox", { name: "Body", exact: true }).fill("A reviewed correction for the delivered reader passage.");
    await editor.getByRole("button", { name: "Save correction draft" }).click();
    await expect(editor.getByRole("button", { name: "Publish correction" })).toBeVisible();
    expect(actions.at(-1)).toMatchObject({
      action: "save_report_unit_draft",
      reportId,
      unitId,
      timing: "February through December",
      body: "A reviewed correction for the delivered reader passage."
    });
    await editor.getByRole("button", { name: "Publish correction" }).click();
    expect(actions.at(-1)).toMatchObject({ action: "publish_report_unit_correction", reportId, unitId });
    await assertNoBrowserErrors();
  });

  test("fallback rows sort by title and explain each atomic source in its reader context", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const fallbackSeed = generatedContentRows.find((row) => row.content_key === "fallback-hook/friends.compatibility.planet-card")!;
    await seedAdminApi(page, {
      generatedRows: [
        {
          ...fallbackSeed,
          id: "qa-alpha-fallback",
          content_key: "fallback-hook/qa/alpha",
          headline: "Alpha fallback",
          block_type: "fallback_hook"
        },
        {
          ...fallbackSeed,
          id: "qa-zeta-fallback",
          content_key: "fallback-hook/qa/zeta",
          headline: "Zeta fallback",
          block_type: "fallback_hook"
        },
        {
          ...fallbackSeed,
          id: "qa-jupiter-article-fallback",
          content_key: "fallback-hook/sky-sign-copy/jupiter/leo",
          headline: "Internal Jupiter fallback label",
          block_type: "fallback_hook"
        },
        {
          ...fallbackSeed,
          id: "qa-pluto-planet-mode",
          content_key: "fallback-hook/planet-mode/pluto",
          headline: "Pluto",
          summary: "Plain 'what this planet is in your life' phrase for synastry aspect lines.",
          body: "how you handle power and deep change",
          block_type: "fallback_hook",
          sections: {
            body_you: "how you handle power and deep change",
            body_they: "how they handle power and deep change",
            packageRecord: {
              contentKey: "fallback-hook/planet-mode/pluto",
              content_role: "fallback_hook",
              grammar_frame: "noun_phrase",
              body_you: "how you handle power and deep change",
              body_they: "how they handle power and deep change",
              summary: "Plain 'what this planet is in your life' phrase for synastry aspect lines."
            }
          }
        }
      ]
    });
    await expectAdminRouteLoads(page, "/admin/content#fallback-hooks");

    const sort = page.getByLabel("Sort fallback rows");
    const list = page.getByRole("complementary", { name: "Fallback hook rows and package sources" });
    await expect(sort).toHaveValue("type");
    await expect(list.getByRole("heading", { name: "Sky Placement articles" })).toBeVisible();
    await expect(list.getByRole("heading", { name: "Supporting fallback rows" })).toBeVisible();

    await sort.selectOption("title-asc");
    await expect(list.locator(".admin-content-row-title")).toHaveText(["Alpha · Qa", "Jupiter in Leo", "Pluto · Relationship role phrase", "Zeta · Qa"]);
    await sort.selectOption("title-desc");
    await expect(list.locator(".admin-content-row-title")).toHaveText(["Zeta · Qa", "Pluto · Relationship role phrase", "Jupiter in Leo", "Alpha · Qa"]);

    await list.locator(".admin-content-row", { hasText: "Pluto · Relationship role phrase" }).getByRole("button", { name: "Edit" }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByRole("heading", { name: "Edit Pluto · Relationship role phrase" })).toBeVisible();
    const guidance = editor.getByRole("region", { name: "How this source is used" });
    await expect(guidance).toContainText("Compatibility and relationship readings");
    await expect(guidance).toContainText("What Pluto represents for each person");
    await expect(guidance).toContainText("an intense connection between how you handle power and deep change");
    await expect(guidance).toContainText("Write a lowercase phrase");
    await expect(editor.getByLabel("Editor label")).toHaveValue("Pluto");
    await expect(editor.getByLabel("Purpose (editors only)")).toHaveValue("Plain 'what this planet is in your life' phrase for synastry aspect lines.");
    await expect(editor.getByLabel("Reader phrase · You")).toHaveValue("how you handle power and deep change");
    await expect(editor.getByLabel("Reader phrase · They")).toHaveValue("how they handle power and deep change");
    expect((await editor.locator("label > span").allTextContents()).slice(0, 4)).toEqual([
      "Editor label",
      "Purpose (editors only)",
      "Reader phrase · You",
      "Reader phrase · They"
    ]);
    await expect(editor).not.toContainText("How to update this fallback");
    await expect(editor.getByRole("region", { name: "Content role" })).toHaveCount(0);

    const desktopEditorHeadingStyle = await editor.getByRole("heading", { name: "Edit Pluto · Relationship role phrase" }).evaluate((heading) => {
      const style = getComputedStyle(heading);
      return {
        fontFamily: style.fontFamily,
        fontSize: Number.parseFloat(style.fontSize),
        fontWeight: Number.parseInt(style.fontWeight, 10),
        lineHeight: Number.parseFloat(style.lineHeight),
        letterSpacing: style.letterSpacing,
        marginTop: style.marginTop,
        textTransform: style.textTransform,
        textAlign: style.textAlign
      };
    });
    expect(desktopEditorHeadingStyle).toMatchObject({
      fontSize: 22,
      fontWeight: 500,
      marginTop: "6px",
      textTransform: "none",
      textAlign: "start"
    });
    expect(desktopEditorHeadingStyle.fontFamily).toBeTruthy();
    expect(desktopEditorHeadingStyle.lineHeight).toBeLessThanOrEqual(26);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(editor.getByRole("heading", { name: "Edit Pluto · Relationship role phrase" })).toBeVisible();
    await expectNoHorizontalOverflow(page, "contextual fallback editor mobile");
    await assertNoBrowserErrors();
  });

  test("Sky Placement template parts use reader-facing titles and descriptions", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const fallbackSeed = generatedContentRows.find((row) => row.content_key === "fallback-hook/friends.compatibility.planet-card")!;
    await seedAdminApi(page, {
      generatedRows: [
        {
          ...fallbackSeed,
          id: "qa-sun-placement-opening",
          content_key: "fallback-hook/sky-placement/sun",
          headline: "Sun",
          block_type: "fallback_hook"
        },
        {
          ...fallbackSeed,
          id: "qa-sun-placement-frame",
          content_key: "fallback-hook/sky-placement-frame/sun",
          headline: "Sun",
          block_type: "fallback_hook"
        },
        {
          ...fallbackSeed,
          id: "qa-sun-virgo-placement-sign",
          content_key: "fallback-hook/sky-placement-sign/sun/virgo",
          headline: "Virgo",
          block_type: "fallback_hook"
        }
      ]
    });
    await expectAdminRouteLoads(page, "/admin/content#fallback-hooks");

    const list = page.getByRole("complementary", { name: "Fallback hook rows and package sources" });
    await expect(list.getByText("Sun · Transit dates and opening", { exact: true })).toBeVisible();
    await expect(list.getByText("Sun · About the Sun", { exact: true })).toBeVisible();
    await expect(list.getByText("Sun in Virgo", { exact: true })).toBeVisible();

    await list.locator(".admin-content-row", { hasText: "Sun · Transit dates and opening" }).getByRole("button", { name: "Edit" }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    const sourceGuidance = editor.getByRole("region", { name: "How this source is used" });
    await expect(sourceGuidance).toContainText("Sun · Transit dates and opening");
    await expect(sourceGuidance).toContainText("Shared Sun opening with calculated sign, entry date, and exit date");
    await assertNoBrowserErrors();
  });

  test("template editor opens a readable variable reference without losing the draft", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const bodyYou = "{{#planetIntro}}{{planetIntro}}{{/planetIntro}} {{possessive}} {{planetTitle}} is in {{signTitle}}, meaning you {{planetVerb}} {{signAdverb}}, and what you want most is {{signNeed}}.{{#placementGerundText}} Day to day, that can look like {{placementGerundText}}.{{/placementGerundText}} Pushed too far, this side of you can tip into {{planetExcess}}. {{planetBest}}{{#modifierSentences}} {{.}}{{/modifierSentences}}";
    const bodyThey = bodyYou.replace("meaning you", "meaning they").replace("side of you", "side of them");
    const templateRow = {
      ...generatedContentRows[0],
      id: "qa-natal-planet-sign-template",
      content_key: "fallback-template/natal.planet-in-sign/sun",
      headline: "{{planetTitle}} in {{signTitle}}",
      body: bodyYou,
      block_type: "fallback_template",
      provider: "tldrastro-fallback-architecture-v3",
      facts: { fallbackArchitectureV3: true, review_status: "needs_review" },
      source_snapshot: {
        sourcePackage: "tldrastro-fallback-architecture-v3",
        review_status: "needs_review"
      },
      sections: {
        body_you: bodyYou,
        body_they: bodyThey,
        packageRecord: {
          contentKey: "fallback-template/natal.planet-in-sign/sun",
          content_role: "template",
          review_status: "needs_review",
          requiredSlots: ["possessive", "planetTitle", "signTitle", "planetVerb", "signAdverb", "signNeed", "planetExcess", "planetBest"],
          optionalSlots: ["planetIntro", "placementGerundText", "modifierSentences"],
          body_you: bodyYou,
          body_they: bodyThey
        }
      }
    };
    const planetIntroRow = {
      ...generatedContentRows[0],
      id: "qa-sun-planet-intro",
      content_key: "fallback-hook/planet-intro/sun",
      headline: "Sun introduction",
      summary: "Reviewed opening for the Sun.",
      body: "The Sun describes identity, purpose, and the need to create.",
      block_type: "fallback_hook",
      status: "DRAFT",
      provider: "tldrastro-fallback-architecture-v3",
      sections: {
        body_you: "The Sun describes identity, purpose, and the need to create.",
        body_they: "The Sun describes their identity, purpose, and need to create."
      }
    };
    const planetBestRow = {
      ...planetIntroRow,
      id: "qa-sun-planet-best",
      content_key: "fallback-hook/planet-best/sun",
      headline: "Sun at its best",
      summary: "Reviewed constructive expression for the Sun.",
      body: "At your best, {{planetTitle}} makes confidence generous.",
      sections: {
        packageRecord: {
          contentKey: "fallback-hook/planet-best/sun",
          content_role: "fallback_hook",
          review_status: "approved",
          body: "At your best, {{planetTitle}} makes confidence generous."
        }
      }
    };
    await seedAdminApi(page, { generatedRows: [templateRow, planetIntroRow, planetBestRow] });
    await expectAdminRouteLoads(page, "/admin/content#fallback-hooks");

    const savedRow = page.locator(".admin-content-row", { hasText: "fallback-template/natal.planet-in-sign/sun" });
    await expect(savedRow).toHaveCount(1);
    await expect(savedRow.locator(".admin-content-row-title")).toHaveText("Sun in a Sign");
    await savedRow.getByRole("button", { name: "Edit" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByRole("heading", { name: "Edit Sun in a Sign" })).toBeVisible();
    await expect(editor.getByLabel("Template name")).toHaveValue("Sun in {{signTitle}}");
    const editedBody = `${bodyYou} QA draft remains here.`;
    await editor.getByLabel("You view copy").fill(editedBody);
    await editor.getByRole("button", { name: /^Reader preview & variables \(\d+\)$/u }).click();

    const variableGuide = page.getByRole("dialog", { name: "Template variable reference" });
    await expect(variableGuide).toBeVisible();
    await expectFormShellDoesNotOverlap(variableGuide, "template variable reference desktop dialog");
    await expect(variableGuide.getByRole("heading", { name: "Reader write-up & variables" })).toBeVisible();
    const readerWriteup = variableGuide.getByRole("region", { name: "Example reader write-up" });
    await expect(readerWriteup.getByRole("heading", { name: "Read the assembled write-up" })).toBeVisible();
    await expect(readerWriteup).toContainText("Sun in Leo");
    await expect(readerWriteup).toContainText("QA draft remains here.");
    await expect(readerWriteup).not.toContainText("{{planetTitle}}");
    await expect(readerWriteup.locator(".variable-fact").first()).toBeVisible();
    await expect(readerWriteup.locator(".variable-hook").first()).toBeVisible();
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "desktop-template-reader-drilldown.png")
    });

    await readerWriteup.getByRole("button", { name: /At your best.*Open the saved source for Planet Best/u }).click();
    let variableDetails = page.getByRole("dialog", { name: "Planet best variable details" });
    await expect(variableDetails).toContainText("At your best,");
    await expect(variableDetails.getByRole("region", { name: "Saved source copy" }).getByRole("button", { name: "{{planetTitle}}" })).toBeVisible();
    await expect(variableDetails.getByRole("region", { name: "Variables inside Planet Best" })).toContainText("Planet Title");
    await variableDetails.getByRole("region", { name: "Saved source copy" }).getByRole("button", { name: "{{planetTitle}}" }).click();
    variableDetails = page.getByRole("dialog", { name: "Planet title variable details" });
    await expect(variableDetails).toContainText("Calculated by app");
    await expect(variableDetails).toContainText("No saved passage to review");
    await variableDetails.getByRole("button", { name: "All variables" }).click();

    const syntaxGuide = variableGuide.getByRole("region", { name: "Template syntax guide" });
    await syntaxGuide.getByText("Template syntax help", { exact: true }).click();
    await expect(syntaxGuide).toContainText("Includes the whole block only when that optional copy is available");

    const verbCard = variableGuide.locator(".admin-variable-reference-card", { hasText: "{{planetVerb}}" });
    await expect(verbCard).toContainText("Required");
    await expect(verbCard).toContainText("base-form action associated with the planet");
    await expect(verbCard).toContainText("Planet vocabulary");
    const introCard = variableGuide.locator(".admin-variable-reference-card", { hasText: "{{planetIntro}}" });
    await expect(introCard).toContainText("Optional");
    await expect(introCard).toContainText("introductory sentences");
    await expect(introCard).toContainText("Open the source rows to read or edit the actual copy");
    await expect(introCard).not.toContainText("The Sun describes identity, purpose, and the need to create.");

    await variableGuide.getByRole("searchbox", { name: "Find a variable or meaning" }).fill("modifier");
    await expect(variableGuide.locator(".admin-variable-reference-card")).toHaveCount(1);
    await expect(variableGuide).toContainText("Showing 1 of");

    await page.setViewportSize({ width: 390, height: 844 });
    await expectFormShellDoesNotOverlap(variableGuide, "template variable reference mobile dialog");
    await expectNoHorizontalOverflow(page, "Template variable reference mobile slide-out");
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "mobile-template-reader-drilldown.png")
    });
    await variableGuide.getByRole("button", { name: "Back to editor" }).click();
    await expect(variableGuide).toBeHidden();
    await expect(editor.getByLabel("You view copy")).toHaveValue(editedBody);
    await expectNoHorizontalOverflow(page, "Template editor with variable action on mobile");

    await editor.getByRole("button", { name: /^Reader preview & variables \(\d+\)$/u }).click();
    await variableGuide.getByRole("searchbox", { name: "Find a variable or meaning" }).fill("planet intro");
    await variableGuide.locator(".admin-variable-reference-card", { hasText: "{{planetIntro}}" })
      .getByRole("button", { name: "Review source writing" })
      .click();

    variableDetails = page.getByRole("dialog", { name: "Planet intro variable details" });
    await expect(variableDetails).toContainText("fallback-hook/planet-intro/sun");
    await expectFormShellDoesNotOverlap(variableDetails, "stacked variable detail mobile dialog");
    const detailToolbarBox = await variableDetails.locator(".admin-editor-toolbar").boundingBox();
    const detailBodyBox = await variableDetails.locator(".admin-post-editor").boundingBox();
    expect(detailToolbarBox).not.toBeNull();
    expect(detailBodyBox).not.toBeNull();
    expect(detailToolbarBox!.height).toBeLessThan(260);
    expect(detailBodyBox!.y - (detailToolbarBox!.y + detailToolbarBox!.height)).toBeLessThanOrEqual(24);
    await expectNoHorizontalOverflow(page, "Stacked variable detail mobile slide-out");
    await variableDetails.locator(".admin-variable-source-row", { hasText: "Sun introduction" }).click();
    await expect(variableDetails).toContainText("The Sun describes identity, purpose, and the need to create.");
    await variableDetails.getByRole("button", { name: "Edit source" }).click();

    await expect(variableGuide).toBeHidden();
    await expect(variableDetails).toBeHidden();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(editor.getByLabel("Content key")).toHaveValue("fallback-hook/planet-intro/sun");
    await expect(editor.getByLabel("Reader copy")).toHaveValue("The Sun describes identity, purpose, and the need to create.");
    await assertNoBrowserErrors();
  });

  test("nested resolver variables open their atomic saved sources", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const sourceRow = (id: string, contentKey: string, headline: string, body: string, role: string) => ({
      ...generatedContentRows[0],
      id,
      content_key: contentKey,
      headline,
      body,
      block_type: role === "vocabulary" ? "vocabulary_phrase" : "fallback_hook",
      provider: "tldrastro-fallback-architecture-v3",
      sections: { packageRecord: { contentKey, content_role: role, body, review_status: "approved" } }
    });
    const aspectVerb = sourceRow("qa-aspect-verb", "fallback-vocab/aspect-verb/trine", "Trine", "puts {{transitTopic}} solidly behind {{natalCore}}", "vocabulary");
    const saturnTopic = sourceRow("qa-saturn-topic", "fallback-vocab/planet-topic/saturn", "Saturn topic", "structure and limits", "vocabulary");
    const venusTopic = sourceRow("qa-venus-topic", "fallback-vocab/planet-topic/venus", "Venus topic", "love, value, and relationship choices", "vocabulary");
    const venusNatalCore = sourceRow("qa-venus-natal-core", "fallback-hook/natal-core/venus", "Venus natal core", "what you love and value", "fallback_hook");
    const venusCoreFallback = sourceRow("qa-venus-core", "fallback-vocab/planet-core/venus", "Venus core fallback", "relationship needs and values", "vocabulary");
    await seedAdminApi(page, { generatedRows: [aspectVerb, saturnTopic, venusTopic, venusNatalCore, venusCoreFallback] });
    await expectAdminRouteLoads(page, "/admin/content#vocabulary");

    const phrase = page.locator(".admin-content-row", { hasText: "fallback-vocab/aspect-verb/trine" });
    await phrase.getByRole("button", { name: "Edit" }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await editor.getByRole("button", { name: "Variables (2)" }).click();
    const variableGuide = page.getByRole("dialog", { name: "Template variable reference" });
    const transitTopicCard = variableGuide.locator(".admin-variable-reference-card", { hasText: "{{transitTopic}}" });
    await expect(transitTopicCard).toContainText("Planet-topic vocabulary selected by the transit resolver");
    await transitTopicCard.getByRole("button", { name: "Review source writing" }).click();

    const transitTopicDetails = page.getByRole("dialog", { name: "Transit topic variable details" });
    await expect(transitTopicDetails).toContainText("The resolver selects one planet-topic phrase using the transiting planet.");
    await expect(transitTopicDetails).toContainText("fallback-vocab/planet-topic/saturn");
    await expect(transitTopicDetails).toContainText("fallback-vocab/planet-topic/venus");
    await expect(transitTopicDetails).not.toContainText("No saved passage to review");
    await transitTopicDetails.locator(".admin-variable-source-row", { hasText: "Saturn topic" }).click();
    await transitTopicDetails.getByRole("button", { name: "Edit source" }).click();
    await expect(editor.getByLabel("Phrase title")).toHaveValue("Saturn topic");
    await expect(editor.getByLabel("Variable value")).toHaveValue("structure and limits");
    await assertNoBrowserErrors();
  });

  test("admin responsive web and mobile views stay readable", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await mkdir(adminScreenshotDir, { recursive: true });
    await seedAdminApi(page);
    const readPrimaryNavRhythm = () => page.getByRole("region", { name: "Content" }).evaluate((section) => {
      const button = section.querySelector("button");
      const sectionStyle = getComputedStyle(section);
      const buttonStyle = button ? getComputedStyle(button) : null;
      return {
        rowGap: Number.parseFloat(sectionStyle.rowGap),
        itemHeight: button?.getBoundingClientRect().height ?? 0,
        fontFamily: buttonStyle?.fontFamily ?? "",
        fontSize: Number.parseFloat(buttonStyle?.fontSize ?? "0"),
        fontWeight: buttonStyle?.fontWeight ?? "",
        lineHeight: buttonStyle?.lineHeight ?? "",
        letterSpacing: buttonStyle?.letterSpacing ?? ""
      };
    });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expectAdminRouteLoads(page, "/admin/content");
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    const desktopNavRhythm = await readPrimaryNavRhythm();
    expect(desktopNavRhythm.rowGap).toBeLessThanOrEqual(8);
    expect(desktopNavRhythm.itemHeight).toBeGreaterThanOrEqual(32);
    expect(desktopNavRhythm.itemHeight).toBeLessThanOrEqual(40);
    expect(desktopNavRhythm.fontFamily).toContain("system-ui");
    expect(desktopNavRhythm.fontSize).toBe(15);
    expect(desktopNavRhythm.fontWeight).toBe("500");
    expect(desktopNavRhythm.lineHeight).toBe("normal");
    expect(desktopNavRhythm.letterSpacing).toBe("normal");
    await expectNoHorizontalOverflow(page, "Admin desktop home");
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "desktop-review-queue.png") });

    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Content Library" }).click();
    await expect(page.locator("main.admin-dashboard")).not.toContainText(forbiddenReaderPreviewCopy);
    const contentToolbar = page.getByRole("region", { name: "Content controls" });
    const contentToolbarCopy = contentToolbar.locator(".admin-content-toolbar-copy");
    const contentToolbarActions = contentToolbar.locator("[aria-label='Content admin shortcuts']");
    const contentToolbarLayout = await Promise.all([
      contentToolbar.boundingBox(),
      contentToolbarCopy.boundingBox(),
      contentToolbarActions.boundingBox()
    ]);
    const [toolbarBox, toolbarCopyBox, toolbarActionsBox] = contentToolbarLayout;
    expect(toolbarBox).not.toBeNull();
    expect(toolbarCopyBox).not.toBeNull();
    expect(toolbarActionsBox).not.toBeNull();
    expect(toolbarCopyBox!.width).toBeGreaterThanOrEqual(Math.min(760, toolbarBox!.width - 52));
    expect(toolbarActionsBox!.y).toBeGreaterThan(toolbarCopyBox!.y);
    await expect(contentToolbar.getByRole("heading", { name: "All editable content rows" })).toHaveCSS("white-space", "normal");
    const visibilityPanel = page.getByRole("region", { name: "App visibility status" });
    const visibilityCopy = visibilityPanel.locator(":scope > div").first();
    const visibilityGrid = visibilityPanel.locator(".admin-reader-safety-grid");
    const [visibilityPanelBox, visibilityCopyBox, visibilityGridBox] = await Promise.all([
      visibilityPanel.boundingBox(),
      visibilityCopy.boundingBox(),
      visibilityGrid.boundingBox()
    ]);
    expect(visibilityPanelBox).not.toBeNull();
    expect(visibilityCopyBox).not.toBeNull();
    expect(visibilityGridBox).not.toBeNull();
    expect(visibilityCopyBox!.width, "App visibility explanation keeps a readable column").toBeGreaterThanOrEqual(220);
    expect(
      visibilityGridBox!.x,
      "App visibility cards begin after the explanation instead of covering it"
    ).toBeGreaterThanOrEqual(visibilityCopyBox!.x + visibilityCopyBox!.width);
    const visibilityCardMetrics = await visibilityGrid.locator("article").evaluateAll((cards) => cards.map((card) => ({
      clientWidth: card.clientWidth,
      scrollWidth: card.scrollWidth
    })));
    for (const card of visibilityCardMetrics) {
      expect(card.clientWidth, "App visibility cards keep a readable minimum width").toBeGreaterThanOrEqual(140);
      expect(card.scrollWidth, "App visibility card copy stays inside its card").toBeLessThanOrEqual(card.clientWidth + 1);
    }
    await expectNoHorizontalOverflow(page, "Content Library desktop");
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "desktop-exact-content.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await expectAdminRouteLoads(page, "/admin/content");
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    const mobileNavigation = page.getByRole("navigation", { name: "Content operations" });
    await expect(mobileNavigation).toBeHidden();
    await page.getByRole("button", { name: "Open Content Studio navigation" }).click();
    await expect(mobileNavigation).toBeVisible();
    const mobileNavRhythm = await readPrimaryNavRhythm();
    expect(mobileNavRhythm).toEqual(desktopNavRhythm);
    await page.getByRole("button", { name: "Close Content Studio navigation" }).click();
    await expect(mobileNavigation).toBeHidden();
    const mobileFilterToggle = page.getByRole("button", { name: /Filters/ });
    const reviewQueueSearch = page.getByRole("textbox", { name: "Search review queue" });
    await expect(mobileFilterToggle).toBeVisible();
    await expect(mobileFilterToggle).toHaveAttribute("aria-expanded", "false");
    await expect(reviewQueueSearch).toBeHidden();
    await mobileFilterToggle.click();
    await expect(mobileFilterToggle).toHaveAttribute("aria-expanded", "true");
    await expect(reviewQueueSearch).toBeVisible();
    await mobileFilterToggle.click();

    await page.getByRole("button", { name: "Create" }).click();
    const mobileCreateMenu = page.getByRole("menu");
    await expect(mobileCreateMenu).toBeVisible();
    const mobileCreateMenuBox = await mobileCreateMenu.boundingBox();
    expect(mobileCreateMenuBox).not.toBeNull();
    expect(mobileCreateMenuBox!.x).toBeGreaterThanOrEqual(0);
    expect(mobileCreateMenuBox!.width).toBeLessThanOrEqual(390);
    expect(mobileCreateMenuBox!.y + mobileCreateMenuBox!.height).toBeLessThanOrEqual(844);
    await page.getByRole("button", { name: "Close create menu" }).click({ position: { x: 195, y: 200 } });
    await expect(mobileCreateMenu).toBeHidden();
    const mobileNotification = page.getByRole("button", { name: "Dismiss notification" });
    if (await mobileNotification.isVisible()) await mobileNotification.click();
    await expectNoHorizontalOverflow(page, "Admin mobile home");
    await expect(page.getByRole("button", { name: "Studio Home" })).toHaveCount(0);
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "mobile-review-queue.png") });

    await assertNoBrowserErrors();
  });
});
