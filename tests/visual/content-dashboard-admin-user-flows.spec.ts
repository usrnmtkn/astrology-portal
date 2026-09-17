import { emptyHousePreviewApi } from "../helpers/empty-house-preview-api";
import { normalizeTransitNatalPreviewInput, renderTransitNatalPreviewState } from "../../api/admin/transit-natal-preview";
import { approveNatalAspectStudioCopy } from "../../api/_lib/content-studio-approval";
import { contentLiveStatuses, servingPackageRecords, type LiveStatusRow } from "../../api/_lib/content-live-status";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { natalPlacementPackageSources, normalizeNatalPlacementPreviewInput, renderNatalPlacementPreviewState } from "../../api/admin/natal-placement-preview";
import { natalPlacementResolverDependencyKeys } from "../../apps/admin/src/natalPlacementSources";
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
    onGeneratedContentWrite?: (write: { method: string; payload: Record<string, unknown> }) => void | Promise<void>;
    onResolutionWrite?: (payload: Record<string, unknown>) => void;
    onSourceDecisionWrite?: (payload: Record<string, unknown>) => void;
    initialSecret?: string;
    expectedSecret?: string;
    generatedRows?: Record<string, unknown>[];
    generatedContentDelayMs?: number;
    generatedContentFailuresBeforeSuccess?: number;
    generatedContentWriteReturnsEmpty?: boolean;
    onGeneratedContentRead?: (url: URL) => void;
    reviewRows?: Record<string, unknown>[];
    compositionCatalog?: Array<{ content_key: string; headline: string | null; role: string }>;
  } = {}
) {
  const apiGeneratedContentRows = structuredClone(options.generatedRows ?? generatedContentRows) as Record<string, unknown>[];
  const publications = new Map<string, Record<string, unknown>>();
  await page.route("**/rest/v1/content_publications*", (route) => route.fulfill({ json: [...publications.values()] }));
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

    if (pathname.endsWith("/content-publication")) {
      const request = route.request().postDataJSON();
      const source = apiGeneratedContentRows.find((row) => row.id === request.id && row.content_key === request.contentKey);
      if (!source || source.updated_at !== request.expectedUpdatedAt) { await route.fulfill({ status: 409, json: { ok: false, error: "Source changed." } }); return; }
      const publication = { content_key: request.contentKey, state: request.action === "publish" ? "live" : "retired", revision: Number(publications.get(request.contentKey)?.revision ?? 0) + 1, row_id: request.id, row_updated_at: source.updated_at, updated_at: now };
      publications.set(request.contentKey, publication);
      await route.fulfill({ json: { ok: true, publication } }); return;
    }
    if (pathname.endsWith("/content-live-status")) {
      if (route.request().postDataJSON().action === "composition-catalog") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, rows: options.compositionCatalog ?? [] }) });
        return;
      }
      const ids = route.request().postDataJSON().ids as string[];
      const rows = apiGeneratedContentRows.filter((row) => ids.includes(String(row.id))) as LiveStatusRow[];
      for (const id of ids.filter((id) => id.startsWith("package:"))) {
        const source = servingPackageRecords.get(id.slice(8));
        rows.push({ id, content_key: id.slice(8), ...(source ? { sections: { packageRecord: source } } : {}) });
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, statuses: contentLiveStatuses(rows, apiGeneratedContentRows as LiveStatusRow[]).map((status) => publications.get(rows.find((row) => row.id === status.id)?.content_key ?? "")?.state === "retired" ? { ...status, live: false, label: "Not live", source: null, detail: "Retired everywhere." } : status) }) });
      return;
    }

    if (pathname.endsWith("/review-records")) {
      const servedReviewRows = options.reviewRows ?? reviewRecordRows;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          surface: url.searchParams.get("surface") ?? "upcomingAspects",
          startDate: url.searchParams.get("startDate") ?? "2026-07-16",
          endDate: url.searchParams.get("endDate") ?? "2026-08-15",
          prompt: null,
          rows: servedReviewRows,
          counts: { total: servedReviewRows.length, DRAFT: 0, REVIEWED: 1, LIVE: 1, ARCHIVED: 0, ERROR: 0 }
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
      if (method === "GET" && url.searchParams.get("variables") === "true") {
        await route.fulfill({ json: { ok: true, variables: [] } });
        return;
      }
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
        await options.onGeneratedContentWrite?.({ method, payload });
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
          approveNatalAspectStudioCopy(promotedRecord, String(existingRow.content_key));
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
          provider: typeof payload.provider === "string" ? payload.provider : (payload.sourceSnapshot as Record<string, unknown>)?.sourcePackage === "tldrastro-fallback-architecture-v3" ? "tldrastro-fallback-architecture-v3" : existingRow.provider,
          prompt_version: typeof payload.promptVersion === "string" ? payload.promptVersion : existingRow.prompt_version
        };

        if (typeof payload.reviewStatus === "string") {
          const reviewStatus = payload.sourceLifecycleAction === "archive"
            ? "deprecated"
            : payload.sourceLifecycleAction === "restore"
              ? "needs_review"
              : payload.reviewStatus;
          updatedRow.status = ["approved", "approved_reuse"].includes(reviewStatus) ? "LIVE" : "DRAFT";
          updatedRow.source_snapshot = { ...updatedRow.source_snapshot, review_status: reviewStatus };
          updatedRow.facts = { ...updatedRow.facts, review_status: reviewStatus };
          const sections = updatedRow.sections as Record<string, any>;
          if (reviewStatus === "approved" && !sections.packageDraft && sections.packageRecord) approveNatalAspectStudioCopy(sections.packageRecord, String(updatedRow.content_key));
        }

        const updatedIndex = apiGeneratedContentRows.findIndex((row) => row.id === updatedRow.id);
        if (updatedIndex >= 0) apiGeneratedContentRows[updatedIndex] = updatedRow;
        else apiGeneratedContentRows.push(updatedRow);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, rows: options.generatedContentWriteReturnsEmpty ? [] : [updatedRow] })
        });
        return;
      }

      if (method === "DELETE") {
        const id = url.searchParams.get("id");
        options.onGeneratedContentWrite?.({ method, payload: { id } });
        const index = apiGeneratedContentRows.findIndex((row) => row.id === id);
        if (index >= 0) apiGeneratedContentRows.splice(index, 1);
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
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
      let servedRows = url.searchParams.get("scope") === "compatibility"
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
      const requestedId = url.searchParams.get("id");
      const requestedKeys = url.searchParams.get("contentKeys")?.split(",") ?? (url.searchParams.get("contentKey") ? [url.searchParams.get("contentKey")!] : undefined);
      if (requestedId) servedRows = servedRows.filter((row) => row.id === requestedId);
      if (requestedKeys) servedRows = servedRows.filter((row) => requestedKeys.includes(row.content_key));
      const limit = Math.max(1, Number(url.searchParams.get("limit") ?? servedRows.length));
      const cursor = url.searchParams.get("cursor");
      const cursorIndex = cursor ? servedRows.findIndex((row) => row.id === cursor) : -1;
      const offset = cursor ? Math.max(0, cursorIndex + 1) : Math.max(0, Number(url.searchParams.get("offset") ?? 0));
      const pageRows = servedRows.slice(offset, offset + limit);
      const nextCursor = offset + pageRows.length < servedRows.length
        ? String(pageRows.at(-1)?.id ?? "")
        : null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          rows: pageRows,
          nextCursor,
          ...(url.searchParams.get("includePackageSource") === "true" ? { packageSource: servingPackageRecords.get(url.searchParams.get("contentKey")!) ?? null } : {})
        })
      });
      return;
    }

    if (pathname.endsWith("/report-fulfillment")) {
      await route.fulfill({ json: {
        billingMode: "free_test",
        metrics: {
          orders: 0, entitlementStatuses: {}, fulfillmentStatuses: {}, jobStates: {},
          exceptionDepth: 0, auditDepth: 0, averageDeliveryMinutes: null, averageJudgeScore: null,
          averageAcceptedTokenCount: 0, averageTotalTokenCount: 0, averageEstimatedSpendUsd: 0,
          validatorPassRate: null, judgePassRate: null, attemptDistribution: {}, judgeScoreDistribution: {}
        },
        reports: [], audits: [], users: [], callEstimates: {}
      } });
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
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected ·", {
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

const railShellSelectors = {
  header: ":scope > .admin-variables-rail-header",
  body: ":scope > .admin-variables-rail-body",
  footer: ":scope > .admin-variables-rail-footer"
};

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

    const loading = page.getByRole("region", { name: "Loading saved content" });
    await expect(loading).toContainText("Loading saved content…");
    await expect(loading).not.toContainText("Content Studio ready");
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Loading… 0 rows");
    await expect(loading).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Review queue views" })).toBeHidden();

    await expect(page.getByRole("region", { name: "Admin status" })).toContainText(`Connected · ${generatedContentRows.length.toLocaleString("en-US")} rows`, {
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
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText(`Connected · ${generatedContentRows.length.toLocaleString("en-US")} rows`);
    await expect(page.getByRole("region", { name: "Admin status" })).not.toContainText("Rows not loaded");
    expect(generatedContentReads).toBe(2);
  });

  test("production-scale Compatibility renders its first scoped page before the full editorial inventory", async ({ page }) => {
    test.setTimeout(60_000);
    const variableReads: string[] = [];
    page.on("request", request => {
      if (new URL(request.url()).searchParams.get("variables") === "true") variableReads.push(request.url());
    });
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
    expect(variableReads, "custom writing loads when opening Variables or an editor").toEqual([]);

    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected · 1,261 rows", {
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
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Connected · 7,200 rows", {
      timeout: routeReadyTimeoutMs
    });

    await expect(page.locator(".admin-content-row")).toHaveCount(50);
    await expect(page.getByRole("navigation", { name: "Content rows pagination" })).toContainText("Showing 1–50 of 7200");
    expect(await page.locator("*").count(), "Content Library DOM remains bounded at production scale").toBeLessThan(10_000);

    await page.getByRole("navigation", { name: "Content rows pagination" }).getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("navigation", { name: "Content rows pagination" })).toContainText("Showing 51–100 of 7200");

    const searchStartedAt = Date.now();
    await page.getByRole("searchbox", { name: "Search content" }).fill("Production scale search target");
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
    await expect(page.getByRole("alert")).toContainText("Admin access was denied");
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Access denied");
    await expect(page.getByRole("region", { name: "Admin access required" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review, sign off, publish" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
    const secretInput = page.getByLabel("Emergency admin secret");
    await expect(secretInput).toHaveValue("stale-secret");
    await expect(page.getByRole("button", { name: "Verify emergency access" })).toBeVisible();

    await secretInput.fill("CONTENT_GENERATION_SECRET");
    await secretInput.press("Enter");
    await expect(page.getByRole("alert")).toContainText("Paste the secret value, not the words CONTENT_GENERATION_SECRET");

    await secretInput.fill("CONTENT_GENERATION_SECRET='qa-secret'");
    await expect(secretInput).toHaveValue("CONTENT_GENERATION_SECRET='qa-secret'");
    await expect(page.getByRole("button", { name: "Verify emergency access" })).toBeEnabled();
    await page.getByRole("button", { name: "Verify emergency access" }).click();

    await expect(page.getByRole("region", { name: "Admin status" })).toContainText(`Connected · ${generatedContentRows.length.toLocaleString("en-US")} rows`, {
      timeout: routeReadyTimeoutMs
    });
    await expect(page.getByRole("region", { name: "Admin access required" })).toBeHidden();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("tldrastro:contentAdminSecret"))).toBe("qa-secret");
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("admin shell navigates every primary dashboard surface", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content");

    await expect(page.getByRole("navigation", { name: "Content operations" })).toBeVisible();
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await expect(page.getByRole("button", { name: "Studio Home" })).toHaveCount(0);
    const navigationGroups = page.getByRole("navigation", { name: "Content operations" }).locator(".admin-nav-section > .admin-eyebrow, details.admin-nav-advanced > summary");
    await expect(navigationGroups).toHaveText(["Publish", "Write", "Compose", "Operations"]);
    const advanced = page.locator("details.admin-nav-advanced");
    // Operations stays expanded at desktop widths so Users / Reports / Connection are one click away.
    await expect(advanced).toHaveAttribute("open", "");
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

  test("Daily Sky Moon-sign navigation supports named browsing, composition, variables and CRUD", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const contentKey = "authored/calendar-weekly-moon/cancer/variant-2";
    const source = JSON.parse(readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", "utf8"));
    const record = source.authoredCards.find((item: { contentKey: string }) => item.contentKey === contentKey);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const moonRow = {
      ...generatedContentRows[0], id: "qa-calendar-moon-cancer", content_key: contentKey,
      headline: "Variant 2", summary: record.notes, body: record.body, surface: "sky", mode: "in_depth",
      status: "LIVE", lane: "serving", review_state: null, block_type: "fallback_hook",
      event_type: "fallback-hook", provider: "tldrastro-fallback-architecture-v3",
      facts: { fallbackArchitectureV3: true, content_role: "full_copy", review_status: "approved_reuse" },
      source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", content_role: "full_copy", review_status: "approved_reuse" },
      sections: { packageRecord: record }
    };
    const pattern = { ...moonRow, id: "qa-lunar-template", content_key: "cms/calendar-day/moon", headline: "Moon day", body: "{{moonSign}} {{unmappedLunarValue}}", sections: { packageRecord: { contentKey: "cms/calendar-day/moon", content_role: "template", body: "{{moonSign}} {{unmappedLunarValue}}", review_status: "needs_review" } } };
    await seedAdminApi(page, { generatedRows: [moonRow, pattern], onGeneratedContentWrite: write => writes.push(write) });
    await expectAdminRouteLoads(page, "/admin/content");
    const nav = page.getByRole("navigation", { name: "Content operations" });
    await nav.getByRole("button", { name: "Calendar Write-ups", exact: true }).click();
    const calendarNav = nav.getByRole("button", { name: "Daily Sky", exact: true });
    await calendarNav.click();
    await expectAdminHeader(page, "Calendar Write-ups", "Admin / Write / Calendar write-ups");
    await expect(calendarNav).toHaveAttribute("aria-current", "page");
    const search = page.getByRole("textbox", { name: "Search Lunar Calendar" });
    const browse = page.getByRole("complementary", { name: "Lunar passages" });
    await search.fill("Cancer Variant 2");
    await browse.getByRole("button", { name: /^Moon in Cancer · Variant 2$/ }).click();
    const detail = page.getByRole("region", { name: "Selected lunar passage" });
    await expect(detail).toContainText(record.body);
    await detail.getByRole("button", { name: "Review composition and variables" }).click();
    const composition = page.getByRole("region", { name: "Selected template composition" });
    await expect(composition.getByRole("heading", { name: "Complete passage preview" })).toBeVisible();
    await expect(composition).toContainText(record.body);
    await expect(composition).toContainText(record.focus);
    await composition.getByRole("button", { name: "Edit passage", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByRole("heading").first()).toContainText("Moon in Cancer · Variant 2");
    await expect(editor.getByLabel("Source notes (not reader copy)")).toHaveValue(record.notes);
    await editor.getByLabel("Full lunar passage").fill(record.body + "\nQA revision.");
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("tab", { name: "Write-ups", exact: true }).click();
    await detail.getByRole("button", { name: "Edit passage", exact: true }).click();
    await expect(editor.getByLabel("Full lunar passage")).toHaveValue(record.body + "\nQA revision.");
    await editor.getByRole("button", { name: "Archive source" }).click();
    await expect.poll(() => writes.length).toBe(2);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByLabel("Publication", { exact: true }).selectOption("archived");
    await expect(browse.getByRole("button", { name: /^Moon in Cancer/ })).toBeVisible();
    await detail.getByRole("button", { name: "Edit passage", exact: true }).click();
    await editor.getByRole("button", { name: "Restore as draft" }).click();
    await expect.poll(() => writes.length).toBe(3);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByLabel("Publication", { exact: true }).selectOption("active");
    await page.getByRole("button", { name: "Add Moon-in-sign write-up", exact: true }).click();
    await page.getByLabel("Moon sign for the new write-up", { exact: true }).selectOption("cancer");
    await page.getByRole("button", { name: "Start draft", exact: true }).click();
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue("authored/calendar-weekly-moon/cancer/variant-3");
    await editor.getByLabel("Full lunar passage").fill("QA new lunar passage.");
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => writes.length).toBe(4);
    expect(writes[3].method).toBe("POST");
    await editor.getByRole("button", { name: "Delete draft", exact: true }).click();
    await expect.poll(() => writes.length).toBe(5);
    expect(writes[4].method).toBe("DELETE");
    await search.fill("");
    await page.getByLabel("Moon sign", { exact: true }).selectOption("all");
    await page.getByLabel("Content family", { exact: true }).selectOption("all");
    await page.getByRole("tab", { name: "Composition & variables" }).click();
    await page.getByRole("complementary", { name: "Composition templates" }).getByRole("button", { name: /Calendar Day/ }).click();
    await expect(composition.getByText("Not traceable", { exact: true })).toBeVisible();
    await composition.getByRole("tab", { name: "Assembly" }).click();
    await expect(composition.getByRole("region", { name: "Template slots" })).toContainText("unmappedLunarValue");
    await page.getByRole("tab", { name: "Write-ups", exact: true }).click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        if (await page.locator('main.admin-dashboard').getAttribute('data-studio-theme') !== colorScheme) {
          await page.getByRole('button', { name: `Switch to ${colorScheme} theme` }).click();
        }
        await expect(page.locator('main.admin-dashboard')).toHaveAttribute('data-studio-theme', colorScheme);
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, colorScheme);
        await search.fill("Cancer");
        await expect(detail.getByRole("heading", { name: "Moon in Cancer · Variant 2" })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.locator('.admin-dashboard-header h1')).toHaveText('Calendar Write-ups');
        await expect(page.getByRole('region', { name: 'Lunar Calendar workspace' }).getByRole('heading', { level: 2, name: 'Lunar Calendar write-ups' })).toHaveCount(0);
        const headingStyle = (element: Element) => {
          const style = getComputedStyle(element);
          return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'marginTop', 'marginBottom', 'textTransform', 'textAlign'].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
        };
        const browseStyle = await detail.getByRole('heading', { level: 2 }).evaluate(headingStyle);
        await page.getByRole('tab', { name: 'Composition & variables' }).click();
        expect(await composition.getByRole('heading', { level: 2 }).evaluate(headingStyle)).toEqual(browseStyle);
        await page.getByRole('tab', { name: 'Write-ups', exact: true }).click();
        await mkdir(adminScreenshotDir, { recursive: true });
        await page.screenshot({ path: path.join(adminScreenshotDir, `lunar-${colorScheme}-${width}.png`), fullPage: true });
        await search.fill("no-matching-lunar-passage");
        await expect(page.getByText("No lunar passages match these filters.")).toBeVisible();
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await search.fill("Cancer");
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(adminScreenshotDir, "lunar-workspace-desktop.png") });
    await assertNoBrowserErrors();
  });

  test("Calendar Aspects navigation opens and edits the governed non-serving draft catalog", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    let generatedContentWrite: { method: string; payload: Record<string, unknown> } | null = null;
    const composedCard = {
      ...generatedContentRows[0],
      id: "qa-calendar-composed-card",
      content_key: "sky-card/venus/libra/square/saturn/aries",
      mode: "studio-draft",
      status: "DRAFT",
      event_type: "calendar-aspect-content-studio-draft",
      headline: "Venus in Libra square Saturn in Aries",
      body: "A composed Calendar aspect card held for owner review.",
      lane: "reference",
      review_state: "owner-review-required",
      block_type: "fallback_hook",
      prompt_version: "calendar-aspect-consequence-first-studio-draft-v1",
      facts: { readerServing: false },
      source_snapshot: { contentType: "fallback-system", content_role: "fallback_hook", authoringSource: "qa-fixture" }
    };
    const reusablePassage = {
      ...composedCard,
      id: "qa-calendar-reusable-passage",
      content_key: "fallback-hook/sky-aspect-sign/venus/libra/square/saturn/aries",
      headline: "Venus in Libra square Saturn in Aries passage",
      body: "A reusable sign-specific Calendar aspect passage held outside reader serving.",
      review_state: "serving-disabled",
      prompt_version: "calendar-aspect-owner-approved-studio-draft-v1"
    };
    await seedAdminApi(page, {
      generatedRows: [composedCard, reusablePassage, ...generatedContentRows],
      onGeneratedContentWrite: (write) => {
        generatedContentWrite = write;
      }
    });
    await expectAdminRouteLoads(page, "/admin/content");

    const navigation = page.getByRole("navigation", { name: "Content operations" });
    await navigation.getByRole("button", { name: "Calendar Aspects", exact: true }).click();

    await expectAdminHeader(page, "Calendar Aspect Cards", "Admin / Write / Calendar aspects");
    await expect(page).toHaveURL(/#exact-content\?category=Calendar\+Aspects$/u);
    await expect(navigation.getByRole("button", { name: "Calendar Aspects", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("button", { name: "Content Library" })).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Edit Calendar aspect cards" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Content status definitions" })).toContainText("Live means readers can currently receive this copy. Draft, Ready, Inactive, Archived, Retired, Error, and Unavailable describe content that is not currently serving.");
    const contentFilters = page.locator("section[aria-label='Content list filters']");
    await expect(contentFilters.getByLabel("Content class")).toHaveCount(0);
    await expect(contentFilters.getByLabel("Tier")).toHaveCount(0);
    await expect(contentFilters.getByLabel("Category")).toHaveCount(0);
    await expect(contentFilters.getByRole("tab", { name: "Editorial content" })).toHaveCount(0);
    await expect(contentFilters.getByRole("button", { name: "Hide reference", exact: true })).toHaveCount(0);
    await expect(contentFilters.getByLabel("Find an aspect")).toHaveAttribute("placeholder", "Mercury sextile Mars");
    await contentFilters.getByText("Editorial filters", { exact: true }).click();
    await expect(contentFilters.getByRole("button", { name: "All 2" })).toBeVisible();

    const contentRows = page.locator(".admin-content-row");
    await expect(contentRows).toHaveCount(2);
    await expect(contentRows.filter({ hasText: composedCard.content_key })).toHaveCount(1);
    await expect(contentRows.filter({ hasText: reusablePassage.content_key })).toHaveCount(1);
    await expect(contentRows.filter({ hasText: generatedContentRows[0].content_key })).toHaveCount(0);

    await contentRows.filter({ hasText: composedCard.content_key }).getByRole("button", { name: "Edit" }).click();
    const editor = page.locator(".admin-editor-panel");
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel("Reader copy")).toHaveValue(composedCard.body);
    await editor.getByLabel("Reader copy").fill("Updated composed Calendar aspect copy for owner review.");
    await editor.getByRole("button", { name: "Save" }).click();
    await expect.poll(() => generatedContentWrite?.payload).toMatchObject({
      id: composedCard.id,
      contentKey: composedCard.content_key,
      body: "Updated composed Calendar aspect copy for owner review.",
      status: "DRAFT",
      lane: "reference"
    });
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
    await navigation.getByRole("button", { name: "Natal Chart", exact: true }).click();

    await expectAdminHeader(page, "Natal Chart Write-ups", "Admin / Write / Natal chart");
    await expect(page).toHaveURL(/#exact-content\?category=Natal\+Chart$/);
    await expect(navigation.getByRole("button", { name: "Natal Chart", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("button", { name: "Content Library" })).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("region", { name: "Find natal chart source writing" })).toBeVisible();
    const sourceFinder = page.getByRole("region", { name: "Find natal chart source writing" });
    await expect(page.getByLabel("Natal placement planet or point")).toBeVisible();
    await expect(page.getByLabel("Natal placement zodiac sign")).toBeVisible();
    await expect(page.getByLabel("Natal placement house")).toBeVisible();
    await expect(page.getByLabel("Natal placement motion")).toBeVisible();
    const natalPointSelect = page.getByLabel("Natal placement planet or point");
    await expect(natalPointSelect.locator("option[value='ascendant']")).toHaveText("ASC");
    await expect(natalPointSelect.locator("option[value='descendant']")).toHaveText("DC");
    await expect(natalPointSelect.locator("option[value='midheaven']")).toHaveText("MC");
    await expect(natalPointSelect.locator("option[value='imum-coeli']")).toHaveText("IC");
    await natalPointSelect.selectOption("ascendant");
    await page.getByLabel("Natal placement zodiac sign").selectOption("aries");
    await expect(page).toHaveURL(/planet=ascendant&sign=aries/u);
    await expect(sourceFinder.getByRole("heading", { name: "ASC in Aries", exact: true })).toBeVisible();
    await expect(sourceFinder.getByText("fallback-hook/angle-sign/ascendant/aries")).toBeVisible();
    await expect(sourceFinder.getByText("fallback-hook/angle-intro/ascendant")).toBeVisible();
    await expect(page.getByRole("region", { name: "Content list filters" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Content status definitions" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Generated content records" })).toHaveCount(0);
    await expect(page.getByText("QA Mercury Hidden Body Search Trap")).toHaveCount(0);
    await expect(page.getByText("Pick one value in each field. This workspace contains natal placements only; current transits and Sky placements are kept in Sky Write-ups.")).toHaveCount(0);

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
      if (index % 2 > 0) expect(box.left).toBeGreaterThanOrEqual(selectorBoxes[index - 1].right);
      if (index >= 2) expect(box.top).toBeGreaterThanOrEqual(selectorBoxes[index - 2].bottom);
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
    await expect(sourceFinder.locator(".admin-natal-placement-finder-heading h3")).toHaveCount(0);
    await expect(sourceFinder.getByRole("heading", { name: "What you see" })).toBeVisible();
    await expect(sourceFinder.getByText("Your Sun is in Cancer, so the planet-in-sign write-up loads before a house is selected.")).toBeVisible();
    await expect(sourceFinder.getByText("The planet-in-sign write-up is shown below. Choose a house to add the house paragraph and exact full-placement override.")).toHaveCount(0);
    await expect(sourceFinder.locator(".admin-natal-source-group").first().getByRole("heading", { name: "Sun in Cancer", exact: true })).toBeVisible();
    await expect(sourceFinder.getByText("Optional exact override.")).toHaveCount(0);
    await expect(sourceFinder.getByRole("button", { name: "Create exact override" })).toHaveCount(0);
    await page.getByLabel("Natal placement house").selectOption("1");
    await expect(sourceFinder.getByRole("button", { name: "View Sun in Cancer in the 1st house in app" })).toBeVisible();
    await expect(sourceFinder.getByText("Reader path", { exact: true })).toHaveCount(0);
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
    await expect(page.getByRole("complementary", { name: "Template variable reference" })).toBeVisible();
    const templatePreview = page.getByRole("region", { name: "Example reader write-up" });
    await expect(templatePreview).toBeVisible();
    await expect(templatePreview.locator(".variable-fact")).toContainText(["Sun", "Cancer"]);
    const stylePhrase = templatePreview.getByRole("button", { name: /protectively.*Open the saved source for Sign Adverb/u });
    await expect(stylePhrase).toBeVisible();
    await stylePhrase.click();
    const variableDetails = page.getByRole("region", { name: "Sign adverb variable details" });
    await expect(variableDetails.getByRole("region", { name: "Saved source copy" })).toContainText("protectively");
    await variableDetails.getByRole("button", { name: "Sources" }).click();
    await variableDetails.getByRole("button", { name: "All variables" }).click();
    await page.getByRole("button", { name: "Close variables" }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    await navigation.getByRole("button", { name: "Content Library" }).click();
    await expectAdminHeader(page, "Content Library", "Admin / Write / Content library");
    await expect(page.getByLabel("Category")).toHaveValue("all");
    await expect(navigation.getByRole("button", { name: "Content Library" })).toHaveAttribute("aria-current", "page");

    await assertNoBrowserErrors();
  });

  test("Sky write-ups search and filter by editorial keywords", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups");

    const filters = page.getByRole("region", { name: "Sky write-up filters" });
    const search = filters.getByLabel("Search Sky write-ups");
    const type = filters.getByLabel("Sky write-up type");
    await expect(search).toHaveAttribute("placeholder", "Search write-ups");
    await expect(filters.getByLabel("Sky write-up motion")).toBeVisible();
    await expect(filters.getByLabel("Sky write-up reader use")).toBeHidden();
    await filters.getByText("More filters", { exact: true }).click();
    await expect(filters.getByLabel("Sky write-up reader use")).toBeVisible();

    await search.fill("care belonging");
    await expect(page.locator(".admin-content-row", { hasText: "sky.placement.sun.cancer" })).toHaveCount(1);
    await expect(page.locator(".admin-content-row", { hasText: "sky.placement.moon.virgo" })).toHaveCount(0);

    await search.fill("qa-moon-source");
    await expect(page.locator(".admin-content-row", { hasText: "sky.placement.moon.virgo" })).toHaveCount(1);
    await type.selectOption("point");
    await expect(page.getByText("No Sky write-ups match “qa-moon-source”. Try another keyword or clear the filters.")).toBeVisible();

    await filters.getByRole("button", { name: "Clear filters" }).click();
    await expect(search).toHaveValue("");
    await expect(type).toHaveValue("all");
    await expect(filters.getByLabel("Sky write-up motion")).toHaveValue("all");
    await expect(filters.getByLabel("Sky write-up reader use")).toHaveValue("all");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(search).toBeVisible();
    await expect(filters.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await expectNoHorizontalOverflow(page, "Sky write-up keyword filters");
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
    await expect(page.getByRole("navigation", { name: "Vocabulary categories" }).getByRole("link", { name: "Relationship" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByLabel("Search vocabulary")).toHaveValue("trust");

    await openAdminDeepLink("#fallback-hooks?section=friends");
    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    await expect(page.getByRole("group", { name: "Fallback hook sections" }).getByRole("button", { name: "Friends", exact: true })).toHaveAttribute("aria-pressed", "true");
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
          await expect(editor.getByText(/Stored internally as Headline/)).toHaveCount(0);
          await expect(editor.getByText(/Stored internally as Summary/)).toHaveCount(0);
          await expect(editor.getByText(/Stored internally as Body/)).toHaveCount(0);
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
      expect(await editor.getByRole('heading', {name: 'Edit Sun in Cancer'}).evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
      }), 'Editor title must not be covered by navigation').toBe(true);
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
    await expect(page.getByRole("status").filter({ hasText: "sky.placement.sun.cancer saved as Live" })).toBeVisible();
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
    await page.getByRole("region", { name: "Sky write-up filters" }).getByText("More filters", { exact: true }).click();
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
    const details = editor.locator("details.admin-editor-details");
    await expect(details).not.toHaveAttribute("open", "");
    await details.locator("> summary").click();
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

    expect(layout.editorWidth).toBeLessThanOrEqual(960);
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

  test("Retire everywhere persists across reload; explicit publication restores it", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const contentKey = "authored/sky-lunation-macro/new-moon/virgo";
    const record = servingPackageRecords.get(contentKey)!;
    const macro = { ...generatedContentRows[0], id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", target_date: null, content_key: contentKey, mode: "article", event_type: "sky-lunation-macro", status: "LIVE", lane: "serving", review_state: null, provider: "tldrastro-fallback-architecture-v3", headline: record.headline, summary: record.summary, body: record.body, facts: { fallbackArchitectureV3: true, moonEvent: { name: "New Moon", sign: "Virgo" } }, source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", contentType: "authored-content" }, sections: { packageRecord: record } };
    await seedAdminApi(page, { generatedRows: [macro] });
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups");
    const row = page.locator(".admin-content-row", { hasText: contentKey });
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await editor.getByRole("button", { name: "Retire everywhere", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Publish again", exact: true })).toBeEnabled();
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Inactive");
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("tldrastro:content-publications:v1") ?? "[]"));
    expect(stored.find((record: any) => record.content_key === contentKey).state).toBe("retired");
    await page.reload();
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Publish again", exact: true })).toBeEnabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page, "Retirement mobile editor");
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(adminScreenshotDir, "retire-everywhere-mobile.png") });
    await editor.getByRole("button", { name: "Publish again", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Retire everywhere", exact: true })).toBeEnabled();
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await assertNoBrowserErrors();
  });

  test("Live status follows exact Virgo macro copy through two edits and publication", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const contentKey = "authored/sky-lunation-macro/new-moon/virgo";
    const record = servingPackageRecords.get(contentKey)!;
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const macro = { ...generatedContentRows[0], id: "qa-virgo-live", content_key: contentKey, mode: "article", event_type: "sky-lunation-macro", status: "DRAFT", lane: "reference", review_state: "fallback-system-reference", provider: "tldrastro-fallback-architecture-v3", headline: record.headline, summary: record.summary, body: record.body, facts: { fallbackArchitectureV3: true, moonEvent: { name: "New Moon", sign: "Virgo" } }, source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", contentType: "authored-content" }, sections: { packageRecord: record } };
    await seedAdminApi(page, { generatedRows: [macro], onGeneratedContentWrite: (write) => writes.push(write) });
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups");
    const row = page.locator(".admin-content-row", { hasText: contentKey });
    await expect(row.locator(".admin-col-visibility")).toHaveText("Live");
    await row.getByRole("button", { name: /^Details/ }).click();
    await expect(row.locator("..").locator(".admin-content-expanded-body")).toContainText("Authored");
    await expect(row.locator("..").locator(".admin-content-expanded-body")).not.toContainText("Legacy generated");
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        const visibleStatus = row.locator(width <= 720 ? ".admin-content-mobile-status" : ".admin-col-visibility");
        await expect(visibleStatus).toBeVisible();
        await expect(visibleStatus).toHaveText("Live");
        await expectNoHorizontalOverflow(page, `Live status ${theme} ${width}`);
        await mkdir(adminScreenshotDir, { recursive: true });
        await row.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(adminScreenshotDir, `live-status-${theme}-${width}.png`) });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    for (const body of ["QA first revised macro.", "QA second revised macro."]) {
      await editor.getByLabel("Full lunar passage", { exact: true }).fill(body);
      await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Draft");
      await editor.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect(editor.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
      await expect(editor.getByLabel("Full lunar passage", { exact: true })).toHaveValue(body);
    }
    expect(writes.filter((write) => !write.payload.ownerAction)).toHaveLength(2);
    await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await row.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(editor.getByLabel("Full lunar passage", { exact: true })).toHaveValue("QA second revised macro.");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await assertNoBrowserErrors();
  });

  for (const theme of ["dark", "light"] as const) for (const width of [1440, 390]) test(`lunations live in Sky Write-ups ${theme} ${width}`, async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => localStorage.setItem("tldrastro:studio-theme", value), theme);
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
    await expect(editor.getByLabel("Full lunar passage")).toHaveValue("Check the details without treating reality as a betrayal of the dream.");
    await expect(related.locator("dl > div", { hasText: "Eclipse" })).toContainText("Lunar eclipse");
    await expect(related.locator("details > summary > span")).toHaveText([
      "Aspect passages",
      "Rising-sign horoscopes"
    ]);
    const readingOrder = await editor.locator(".admin-post-editor").evaluate((postEditor) => {
      const body = postEditor.querySelector('[aria-label="Full lunar passage"]')?.closest("label");
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
      path: path.join(adminScreenshotDir, `lunation-native-${theme}-${width}.png`)
    });
    await assertNoBrowserErrors();
  });

  async function openSharedTransitSource(preview: import("@playwright/test").Locator, key: string) {
    const control = preview.locator(`[data-transit-source-key="${key}"]`).first();
    const disclosure = control.locator("summary");
    if (await control.evaluate(element => element instanceof HTMLDetailsElement && !element.open)) await disclosure.click();
    await control.getByRole("button", { name: "Edit shared source", exact: true }).click();
    await expect(control.getByRole("alert")).toContainText("not a separate passage for this aspect");
    await control.getByRole("button", { name: "Continue to shared source", exact: true }).click();
  }

  async function closeGeneratedEditor(page: import("@playwright/test").Page, waitForOpen = false) {
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    if (waitForOpen) await expect(editor).toBeVisible();
    else if (!(await editor.isVisible())) return;
    const close = editor.getByRole("button", { name: "Close", exact: true });
    await expect(close).toBeEnabled();
    const acceptDialog = async (dialog: import("@playwright/test").Dialog) => {
      try { await dialog.accept(); } catch { /* already handled by another listener */ }
    };
    page.once("dialog", acceptDialog);
    await close.click();
    await expect(editor).toHaveCount(0);
  }

  function transitWriteupButton(finder: import("@playwright/test").Locator, title: string) {
    return finder.getByRole("button", { name: new RegExp(`^(Edit|Write) ${title}$`) });
  }

  for (const [width, theme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) test(`Transit exact editor isolates sibling aspects ${width} ${theme}`, async ({ page }) => {
    page.on("dialog", dialog => { dialog.accept().catch(() => undefined); });
    const noErrors = await expectNoBrowserErrors(page);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const exactKey = "authored/transit-aspect/sun/sun/sextile";
    const sharedKey = "authored/transit-aspect/sun/sun/soft";
    const exact = { contentKey: exactKey, content_role: "full_copy", grammar_frame: "complete_sentence", surface: "transit-aspect", reader_only: true, render_policy: "personal-transit-exact-v1", review_status: "needs_review", body: "Synthetic saved sextile You.", body_you: "Synthetic saved sextile You.", body_they: "Synthetic saved sextile Friend." };
    await page.setViewportSize({ width, height: 1000 });
    await seedAdminApi(page, { onGeneratedContentWrite: write => writes.push(write), generatedRows: [{
      id: "qa-separate-sextile", content_key: exactKey, surface: "you", mode: "in_depth", status: "DRAFT", lane: "reference", block_type: "fallback_hook", headline: "Sun sextile your Sun", summary: "", body: exact.body,
      sections: { packageRecord: exact }, facts: { fallbackArchitectureV3: true }, provider: "tldrastro-fallback-architecture-v3", updated_at: now
    }] });
    await page.route("**/rest/v1/generated_interpretations*", route => route.fulfill({ json: [] }));
    await page.route("**/api/admin/transit-natal-preview", async route => {
      await route.fulfill({ json: { ok: true, rendered: renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput(route.request().postDataJSON())) } });
    });
    await page.addInitScript(value => localStorage.setItem("tldrastro:theme", value), theme);
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups?view=transits-to-natal&transit=sun&sign=virgo&transitHouse=3&aspect=trine&natal=sun&natalHouse=3");
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    const finder = page.getByRole("region", { name: "Personal Transits source finder" });
    const exactEditor = finder.getByRole("region", { name: "This transit write-up" });
    const preview = finder.getByRole("region", { name: "Effective transit to natal reader preview" });
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue("authored/transit-aspect/sun/sun/trine");
    await expect(editor.getByLabel("Reader phrase · You", { exact: true })).toHaveValue("");
    await expect(editor.getByLabel("Reader phrase · They", { exact: true })).toHaveValue("");
    await expect(editor.getByLabel("Write-up aspect", { exact: true })).toHaveValue("trine");
    await closeGeneratedEditor(page);
    await expect(exactEditor).toContainText("authored/transit-aspect/sun/sun/trine");
    await expect(transitWriteupButton(exactEditor, "Sun trine your Sun")).toBeVisible();
    expect(await exactEditor.evaluate(element => Boolean(element.compareDocumentPosition(document.querySelector('[aria-label="Effective transit to natal reader preview"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    const shared = preview.locator(`[data-transit-source-key="${sharedKey}"]`).first();
    await expect(shared).toBeVisible();
    await expect(shared).not.toHaveAttribute("open", "");
    await shared.locator("summary").click();
    await shared.getByRole("button", { name: "Edit shared source", exact: true }).click();
    await expect(editor).not.toBeVisible();
    await expect(shared.getByRole("alert")).toContainText("not a separate passage for this aspect");
    await shared.getByRole("button", { name: "Cancel shared edit", exact: true }).click();
    expect(writes).toHaveLength(0);
    await shared.getByRole("button", { name: "Edit shared source", exact: true }).click();
    await page.getByLabel("Transit to natal aspect", { exact: true }).selectOption("sextile");
    await expect(preview.getByRole("heading", { level: 4 })).toHaveText("Sun sextile your Sun");
    await expect(preview.getByRole("button", { name: "Continue to shared source", exact: true })).toHaveCount(0);
    await expect(exactEditor).toContainText("A draft is saved for this contact");
    const publishedBody = await preview.locator(".admin-natal-source-card-copy > p").allTextContents();
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue(exactKey);
    await expect(editor.getByLabel("Reader phrase · You", { exact: true })).toHaveValue(exact.body_you);
    await expect(editor.getByLabel("Reader phrase · They", { exact: true })).toHaveValue(exact.body_they);
    const you = "Synthetic revised sextile You opening.\n\nSynthetic revised sextile You ending.";
    const friend = "Synthetic revised sextile Friend opening.\n\nSynthetic revised sextile Friend ending.";
    await editor.getByLabel("Reader phrase · You", { exact: true }).fill(you);
    await editor.getByLabel("Reader phrase · They", { exact: true }).fill(friend);
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].payload).toMatchObject({ reviewStatus: "needs_review" });
    expect((writes[0].payload.sections as any).packageDraft).toMatchObject({ contentKey: exactKey, body_you: you, body_they: friend });
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(exactEditor).toContainText("A draft is saved for this contact");
    await expect(preview.locator(`[data-transit-source-key="${sharedKey}"]`).first()).toBeVisible();
    expect(await preview.locator(".admin-natal-source-card-copy > p").allTextContents()).toEqual(publishedBody);
    await page.getByLabel("Transit to natal aspect", { exact: true }).selectOption("trine");
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue("authored/transit-aspect/sun/sun/trine");
    await expect(editor.getByLabel("Reader phrase · You", { exact: true })).toHaveValue("");
    await expect(editor.getByLabel("Reader phrase · They", { exact: true })).toHaveValue("");
    await closeGeneratedEditor(page);
    await page.getByLabel("Transit to natal aspect", { exact: true }).selectOption("sextile");
    await expect(editor.getByLabel("Reader phrase · You", { exact: true })).toHaveValue(you);
    await expect(editor.getByLabel("Reader phrase · They", { exact: true })).toHaveValue(friend);
    expect(writes).toHaveLength(1);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expectNoHorizontalOverflow(page, "Separate transit editor");
    await mkdir(adminScreenshotDir, { recursive: true });
    await finder.screenshot({ path: path.join(adminScreenshotDir, `separate-transit-editor-${width}-${theme}.png`) });
    await noErrors();
  });

  for (const [width, theme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) test(`canonical Personal Transit Studio preview ${width} ${theme}`, async ({ page }) => {
    page.on("dialog", dialog => { dialog.accept().catch(() => undefined); });
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const key = "authored/transit-aspect/sun/north-node/conjunction";
    const source = servingPackageRecords.get(key)!;
    expect(source).toBeTruthy();
    await page.setViewportSize({ width, height: 1000 });
    await seedAdminApi(page, { onGeneratedContentWrite: write => writes.push(write), generatedRows: [{
      id: "qa-canonical-transit", content_key: key, surface: "you", mode: "feed",
      event_type: "transit_aspect", block_type: "transit_aspect", status: "DRAFT", lane: "serving",
      headline: "Sun Conjunction North Node", summary: "", body: "Unsaved Studio draft must never replace the reader passage.",
      sections: { packageRecord: source, body_you: "Unsaved Studio draft must never replace the reader passage." },
      facts: { fallbackArchitectureV3: true }, provider: "tldrastro-fallback-architecture-v3", updated_at: now
    }, ...["fallback-hook/transit-effect-soft/lilith", "fallback-vocab/planet-topic/north-node"].map(content_key => {
      const record = servingPackageRecords.get(content_key)!;
      return { id: `qa-${content_key}`, content_key, headline: content_key, body: String(record.body_you ?? record.body), summary: "", surface: "you", mode: "feed", status: "LIVE", lane: "serving", block_type: "fallback_hook", sections: { packageRecord: record }, facts: { fallbackArchitectureV3: true }, provider: "tldrastro-fallback-architecture-v3", updated_at: now };
    })] });
    await page.route("**/rest/v1/generated_interpretations*", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/admin/transit-natal-preview", async (route) => {
      try { await route.fulfill({ json: { ok: true, rendered: renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput(route.request().postDataJSON())) } }); }
      catch (error) { await route.fulfill({ json: { error: String(error) } }); }
    });
    await page.addInitScript((theme) => localStorage.setItem("tldrastro:theme", theme), theme);
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups?view=transits-to-natal");
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const finder = page.getByRole("region", { name: "Personal Transits source finder" });
    await expect(finder).toContainText("Choose all six values");
    await page.getByLabel("Transiting planet", { exact: true }).selectOption("sun");
    await page.getByLabel("Transit zodiac sign").selectOption("virgo");
    await page.getByLabel("Transit house", { exact: true }).selectOption("4");
    await page.getByLabel("Transit to natal aspect").selectOption("conjunction");
    await page.getByLabel("Natal planet or point", { exact: true }).selectOption("north-node");
    await page.getByLabel("Natal point house").selectOption("4");
    await closeGeneratedEditor(page, true);
    const preview = finder.getByRole("region", { name: "Effective transit to natal reader preview" });
    await expect(preview).toContainText("You may be offered a role that feels slightly ahead");
    await expect(preview).toContainText("accept the first assignment and learn from what happens next.");
    await expect(preview).not.toContainText("Unsaved Studio draft");
    await expect(preview).not.toContainText("While the Sun is in your");
    await expect(preview.getByRole("heading", { level: 3 })).toHaveText("What you see");
    await expect(preview.getByRole("heading", { level: 4 })).toHaveText("Sun conjunction your North Node");
    await expect(preview.getByRole("button", { name: /Edit selected source/ })).toContainText(key);
    const body = await preview.locator(".admin-natal-source-card-copy > p").allTextContents();
    await page.getByLabel("Transit house", { exact: true }).selectOption("10");
    expect(await preview.locator(".admin-natal-source-card-copy > p").allTextContents()).toEqual(body);
    const headingStyles = await preview.getByRole("heading", { level: 3 }).evaluate((heading) => {
      const style = getComputedStyle(heading);
      const reference = getComputedStyle(document.querySelector(".admin-natal-placement-finder-heading h3")!);
      const properties = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "marginTop", "marginBottom"] as const;
      return properties.map((property) => [property, style[property], reference[property]]);
    });
    // The existing finder title and preview subheading have separate size rules.
    // Preserve that hierarchy and retain their computed comparison as QA evidence.
    await test.info().attach("Studio heading style comparison", { body: JSON.stringify(headingStyles, null, 2), contentType: "application/json" });
    await expectNoHorizontalOverflow(page, "Canonical Personal Transit Studio preview");
    await mkdir(adminScreenshotDir, { recursive: true });
    await preview.screenshot({ path: path.join(adminScreenshotDir, `canonical-transit-${width}-${theme}.png`) });
    await preview.getByRole("button", { name: /Edit selected source/ }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue(key);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByLabel("Natal planet or point", { exact: true }).selectOption("sun");
    await expect(preview.getByRole("alert")).toBeVisible();
    await expect(preview).not.toContainText("You may be offered a role");
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue("authored/transit-return/sun");
    await closeGeneratedEditor(page, true);
    await page.getByLabel("Natal planet or point", { exact: true }).selectOption("south-node");
    await page.getByLabel("Transit to natal aspect", { exact: true }).selectOption("opposition");
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue("authored/transit-aspect/sun/south-node/opposition");
    await expect(editor.getByLabel("Reader phrase · You", { exact: true })).toHaveValue("");
    await expect(editor.getByLabel("Reader phrase · They", { exact: true })).toHaveValue("");
    const candidate = "A synthetic complete opening for the exact transit.\n\nA synthetic complete ending for the exact transit.";
    await editor.getByLabel("Reader phrase · You", { exact: true }).fill(candidate);
    await editor.getByRole("button", { name: /^(Save draft|Save)$/ }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect((writes[0].payload.sections as { packageDraft?: { body_you?: string } }).packageDraft?.body_you ?? writes[0].payload.body).toBe(candidate);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await transitWriteupButton(finder, "Sun opposition your South Node").click();
    await expect(editor.getByLabel("Reader phrase · You", { exact: true })).toHaveValue(candidate);
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByLabel("Transiting planet", { exact: true }).selectOption("lilith");
    await page.getByLabel("Transit zodiac sign").selectOption("capricorn");
    await page.getByLabel("Transit house", { exact: true }).selectOption("8");
    await page.getByLabel("Natal planet or point", { exact: true }).selectOption("north-node");
    await page.getByLabel("Transit to natal aspect").selectOption("trine");
    await closeGeneratedEditor(page, true);
    await expect(preview).toContainText("Lilith in Capricorn is trining your natal North Node");
    await expect(preview).not.toContainText("fallback-template/transit.aspect");
    await openSharedTransitSource(preview, "fallback-hook/transit-effect-soft/lilith");
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue("fallback-hook/transit-effect-soft/lilith");
    const hook = servingPackageRecords.get("fallback-hook/transit-effect-soft/lilith")!;
    await expect(editor.getByLabel("Reader phrase · You", { exact: true })).toHaveValue(String(hook.body_you));
    await expect(editor).not.toContainText("Saturn trine");
    await editor.getByRole("button", { name: /Variables/ }).click();
    const rail = page.getByRole("complementary", { name: "Template variable reference" });
    await expect(rail).toContainText(/the growth edge and the unfamiliar appetite/i);
    await expect(rail).not.toContainText("Saturn");
    await expect(rail.locator(".admin-composition-preview-chrome")).toContainText("Personal Transits");
    await rail.getByRole("button", { name: "Close variables", exact: true }).click();
    await editor.screenshot({ path: path.join(adminScreenshotDir, `lilith-source-${width}-${theme}.png`) });
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await transitWriteupButton(finder, "Lilith trine your North Node").click();
    await expect(editor.getByRole("heading", { level: 2 })).toHaveText("Write Lilith trine your North Node");
    await expect(editor.getByLabel("Reader phrase · You", { exact: true })).toHaveValue("");
    await expect(editor.getByText(/No write-up is saved for this exact contact yet/)).toBeVisible();
    await expect(editor.getByRole("button", { name: "Revert to package original", exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page, "Lilith exact draft");
    await editor.screenshot({ path: path.join(adminScreenshotDir, `lilith-new-draft-${width}-${theme}.png`) });
    await assertNoBrowserErrors();
  });

  for (const [width, theme] of [[1440, "light"], [1440, "dark"], [390, "light"], [390, "dark"]] as const) test(`Friends transit source preserves selected context ${width} ${theme}`, async ({ page }) => {
    page.on("dialog", dialog => { dialog.accept().catch(() => undefined); });
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    const keys = ["fallback-hook/transit-effect-soft/lilith", "fallback-vocab/planet-topic/north-node"];
    await seedAdminApi(page, { generatedRows: keys.map(content_key => {
      const record = servingPackageRecords.get(content_key)!;
      return { id: `qa-friends-${content_key}`, content_key, headline: content_key, body: String(record.body_you ?? record.body), summary: "", surface: "you", mode: "feed", status: "LIVE", lane: "serving", block_type: "fallback_hook", sections: { packageRecord: record }, facts: { fallbackArchitectureV3: true }, provider: "tldrastro-fallback-architecture-v3", updated_at: now };
    }) });
    await page.route("**/rest/v1/generated_interpretations*", route => route.fulfill({ json: [] }));
    await page.route("**/api/admin/transit-natal-preview", async route => {
      const input = normalizeTransitNatalPreviewInput(route.request().postDataJSON());
      expect(input.voice).toBe("{{Name}}");
      await route.fulfill({ json: { ok: true, rendered: renderTransitNatalPreviewState(input) } });
    });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups?view=transits-to-natal&transit=lilith&sign=capricorn&transitHouse=8&aspect=trine&natal=north-node&natalHouse=4&audience=friends");
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const preview = page.getByRole("region", { name: "Effective transit to natal reader preview" });
    await closeGeneratedEditor(page, true);
    await expect(preview).toContainText("Lilith in Capricorn");
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    const rail = page.getByRole("complementary", { name: "Template variable reference" });
    for (let reopen = 0; reopen < 2; reopen++) {
      await openSharedTransitSource(preview, keys[0]);
      await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue(keys[0]);
      await expect(editor.getByLabel("Selected transit context")).toContainText("Lilith in Capricorn, 8th house, trine natal North Node, 4th house");
      await editor.getByRole("button", { name: /Variables/ }).click();
      await expect(rail.getByRole("button", { name: "They", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(rail.locator(".admin-composition-preview-chrome")).toContainText("Friends Transits");
      await expect(rail).toContainText(/the growth edge and the unfamiliar appetite/i);
      await expect(rail).not.toContainText("Saturn");
      await expect(rail).not.toContainText("Venus");
      const copy = rail.locator(".admin-template-reader-copy");
      await expect(copy).toContainText("Things they say plainly in this window tend to land clean");
      await expect(copy).not.toContainText("Say the true thing while it comes out clean.");
      if (reopen === 0) {
        await mkdir(adminScreenshotDir, { recursive: true });
        await rail.screenshot({ path: path.join(adminScreenshotDir, `friends-transit-context-${width}-${theme}.png`) });
      }
      await rail.getByRole("button", { name: "You", exact: true }).click();
      await expect(rail.getByRole("button", { name: "You", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(copy).toContainText("Say the true thing while it comes out clean.");
      await expect(copy).not.toContainText("Things they say plainly in this window tend to land clean");
      await rail.getByRole("button", { name: "Close variables", exact: true }).click();
      await editor.getByRole("button", { name: "Close", exact: true }).click();
    }
    await expectNoHorizontalOverflow(page, "Friends selected transit source");
    await assertNoBrowserErrors();
  });

  for (const [width, theme] of [[1440, "light"], [390, "dark"]] as const) test(`transit paragraph sources and packaged exact editor ${width} ${theme}`, async ({ page }) => {
    page.on("dialog", dialog => { dialog.accept().catch(() => undefined); });
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    const reads: URL[] = [];
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    await seedAdminApi(page, { generatedRows: [], onGeneratedContentRead: url => reads.push(url), onGeneratedContentWrite: write => writes.push(write) });
    await page.route("**/rest/v1/generated_interpretations*", route => route.fulfill({ json: [] }));
    const inputs: any[] = [];
    await page.route("**/api/admin/transit-natal-preview", async route => {
      const input = normalizeTransitNatalPreviewInput(route.request().postDataJSON());
      inputs.push(input);
      await route.fulfill({ json: { ok: true, rendered: renderTransitNatalPreviewState(input) } });
    });
    await page.addInitScript(theme => localStorage.setItem("tldrastro:theme", theme), theme);
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups?view=transits-to-natal&transit=neptune&sign=aries&transitHouse=8&aspect=opposition&natal=sun&natalHouse=4&audience=friends&variant=1&pass=2&retrograde=true&window=until+October+4");
    const preview = page.getByRole("region", { name: "Effective transit to natal reader preview" });
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await closeGeneratedEditor(page, true);
    const facts = { planet: "neptune", sign: "aries", aspect: "opposition", natalPoint: "sun", voice: "{{Name}}", variant: 1, pass: 2, isRetrograde: true, window: "until October 4" };
    const expected = renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput(facts));
    await expect(preview.locator(".admin-natal-source-card-copy > p")).toHaveText(expected.paragraphs.map(p => p.text));
    const fog = expected.paragraphs.flatMap(p => p.sources).find(source => source.contentKey.includes("fog-note"))!;
    await openSharedTransitSource(preview, fog.contentKey);
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue(fog.contentKey);
    await expect(editor.locator(`[data-sky-field="${fog.field}"]`)).toHaveValue(String(servingPackageRecords.get(fog.contentKey)![fog.field]));
    await expect(editor.locator(`[data-sky-field="${fog.field}"]`)).toBeFocused();
    await expect(editor.getByLabel("Selected transit context")).toContainText("Neptune in Aries, 8th house, opposition natal Sun, 4th house");
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await closeGeneratedEditor(page, true);
    await expect(preview.locator(".admin-natal-source-card-copy > p")).toHaveText(expected.paragraphs.map(p => p.text));
    expect(inputs.at(-1)).toEqual(facts);
    await page.getByText("Reading preview options", { exact: true }).click();
    await expect(page.getByLabel("Transit copy variant")).toHaveValue("1");
    await expect(page.getByLabel("Transit repeat pass")).toHaveValue("2");
    await expect(page.getByLabel("Transit preview motion")).toHaveValue("true");
    await expect(page.getByLabel("Transit preview timing")).toHaveValue("until October 4");
    await page.getByLabel("Transit copy variant").selectOption("4");
    await expect.poll(() => inputs.at(-1)?.variant).toBe(4);
    await page.getByLabel("Transiting planet", { exact: true }).selectOption("sun");
    await page.getByLabel("Natal planet or point", { exact: true }).selectOption("midheaven");
    await closeGeneratedEditor(page, true);
    const insertKey = "authored/transit-aspect-insert/sun/midheaven/opposition";
    await openSharedTransitSource(preview, insertKey);
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue(insertKey);
    const insertSource = renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput(inputs.at(-1))).paragraphs.flatMap(p => p.sources).find(source => source.contentKey === insertKey)!;
    await expect(editor.locator(`[data-sky-field="${insertSource.field}"]`)).toHaveValue(String(servingPackageRecords.get(insertKey)![insertSource.field]));
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByLabel("Natal planet or point", { exact: true }).selectOption("north-node");
    await page.getByLabel("Transit to natal aspect").selectOption("conjunction");
    const key = "authored/transit-aspect/sun/north-node/conjunction";
    await expect(editor.getByLabel("Content key", { exact: true })).toHaveValue(key);
    await expect(editor.getByRole("heading", { level: 2 })).not.toHaveText("Write Sun conjunction your North Node");
    await expect(editor).not.toContainText("This is a new blank draft");
    await expect(editor.locator('[data-sky-field="body_you"]')).toHaveValue(String(servingPackageRecords.get(key)!.body_you));
    expect(reads.some(url => url.searchParams.get("contentKey") === key && url.searchParams.get("includePackageSource") === "true")).toBe(true);
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect((writes[0].payload.sections as { packageDraft?: { body_you?: string } }).packageDraft?.body_you ?? writes[0].payload.body).toBe(String(servingPackageRecords.get(key)!.body_you));
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "Edit Sun conjunction your North Node", exact: true }).click();
    await expect(editor.locator('[data-sky-field="body_you"]')).toHaveValue(String(servingPackageRecords.get(key)!.body_you));
    await expectNoHorizontalOverflow(page, "Packaged exact transit editor");
    await mkdir(adminScreenshotDir, { recursive: true });
    await editor.screenshot({ path: path.join(adminScreenshotDir, `transit-package-${width}-${theme}.png`) });
    await assertNoBrowserErrors();
  });

  test("transit preview rejects stale and malformed source responses", async ({ page }) => {
    page.on("dialog", dialog => { dialog.accept().catch(() => undefined); });
    await seedAdminApi(page, { generatedRows: [] });
    await page.route("**/rest/v1/generated_interpretations*", route => route.fulfill({ json: [] }));
    let release: (() => Promise<void>) | undefined;
    await page.route("**/api/admin/transit-natal-preview", async route => {
      const input = normalizeTransitNatalPreviewInput(route.request().postDataJSON());
      const rendered = renderTransitNatalPreviewState(input);
      if (input.variant === 4) { release = () => route.fulfill({ json: { ok: true, rendered } }).catch(() => {}); return; }
      await route.fulfill({ json: input.variant === 2 ? { ok: true, rendered: { body: rendered.body, paragraphs: [] } } : { ok: true, rendered } });
    });
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups?view=transits-to-natal&transit=neptune&sign=aries&transitHouse=8&aspect=opposition&natal=sun&natalHouse=4");
    const preview = page.getByRole("region", { name: "Effective transit to natal reader preview" });
    await closeGeneratedEditor(page, true);
    await expect(preview.locator("[data-transit-source-key]").first()).toBeVisible();
    await page.getByText("Reading preview options", { exact: true }).click();
    await page.getByLabel("Transit copy variant").selectOption("4");
    await expect.poll(() => Boolean(release)).toBe(true);
    await expect(preview.getByRole("button")).toHaveCount(0);
    await page.getByLabel("Transit copy variant").selectOption("3");
    const expected = renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput({ planet: "neptune", sign: "aries", aspect: "opposition", natalPoint: "sun", variant: 3 }));
    await expect(preview.locator(".admin-natal-source-card-copy > p")).toHaveText(expected.paragraphs.map(p => p.text));
    await release!();
    await expect(preview.locator(".admin-natal-source-card-copy > p")).toHaveText(expected.paragraphs.map(p => p.text));
    await page.getByLabel("Transit copy variant").selectOption("2");
    await expect(preview.getByRole("alert")).toContainText("source links could not be verified");
    await expect(preview.getByRole("button")).toHaveCount(0);
    await page.route("**/api/admin/generated-content?**", async route => {
      if (new URL(route.request().url()).searchParams.get("includePackageSource") === "true") await route.fulfill({ json: { ok: true, rows: null } });
      else await route.fallback();
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "Retry this transit" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Write / })).toHaveCount(0);
  });

  test("house transits expose the complete card before its evergreen and sign-specific passages", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    await page.setViewportSize({ width: 1308, height: 900 });
    const houseTransitRows = [
      {
        ...generatedContentRows[0],
        id: "qa-uranus-house-1-intro",
        content_key: "authored/transit-house-intro/uranus/1",
        headline: "Uranus through the 1st house",
        body: "Over the next several years, the pull is toward freedom: old roles stop fitting."
      },
      {
        ...generatedContentRows[0],
        id: "qa-uranus-gemini-house-1",
        content_key: "authored/transit-house-sign/uranus/1/gemini",
        headline: "Uranus in Gemini through the 1st house",
        body: "Uranus in Gemini changes how you introduce yourself, speak up, and choose what comes next."
      }
    ];
    await seedAdminApi(page, { generatedRows: houseTransitRows, onGeneratedContentWrite: (write) => writes.push(write) });
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups");

    await page.getByRole("tab", { name: "House Transits" }).click();
    await page.getByLabel("House Transit planet").selectOption("uranus");
    await page.getByLabel("House Transit zodiac sign").selectOption("gemini");
    await page.getByLabel("House Transit house").selectOption("1");

    const finder = page.getByRole("region", { name: "House Transits source finder" });
    await expect(finder.getByRole("heading", { name: "Uranus in Gemini through your 1st house", level: 3 })).toBeVisible();
    const preview = finder.getByRole("region", { name: "Effective House Transit reader preview" });
    await expect(preview).toContainText("Complete composition");
    await expect(preview).toContainText("Over the next several years, the pull is toward freedom");
    await expect(preview).toContainText("Uranus in Gemini changes how you introduce yourself");
    await expect(finder.getByRole("heading", { name: "Editable passages in this House Transit", level: 3 })).toBeVisible();
    await expect(finder.getByRole("button", { name: "Edit complete write-up", exact: true })).toHaveCount(1);
    await expect(finder.locator('.admin-natal-source-group:not(details)').getByRole("button", { name: "Edit source row" })).toHaveCount(0);

    const selectorLabels = await finder.locator(".admin-natal-placement-selectors label > span:not(.admin-select-shell)").allTextContents();
    expect(selectorLabels).toEqual([
      "1. Transiting planet",
      "2. Current sign",
      "3. Reader's house",
      "4. Current motion"
    ]);
    const headingLevels = await page.getByRole("main").getByRole("heading").evaluateAll((headings) => headings.map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      text: heading.textContent?.trim() ?? ""
    })));
    expect(headingLevels.slice(0, 3)).toEqual([
      { level: 1, text: "Sky Write-ups" },
      { level: 2, text: "Sky writing workspaces" },
      { level: 3, text: "Uranus in Gemini through your 1st house" }
    ]);
    const contentOrder = await finder.evaluate((region) => {
      const readerPreview = region.querySelector('[aria-label="Effective House Transit reader preview"]');
      const sourceHeading = Array.from(region.querySelectorAll("h3")).find((heading) => heading.textContent?.trim() === "Editable passages in this House Transit");
      return Boolean(readerPreview && sourceHeading && readerPreview.compareDocumentPosition(sourceHeading) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(contentOrder, "House Transit reader preview precedes its editable source passages").toBe(true);

    await finder.getByRole("button", { name: "Edit complete write-up", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "House Transit write-up editor" });
    const signField = editor.getByRole("textbox", { name: "Uranus in Gemini through the 1st house — You copy", exact: true });
    await expect(signField).toHaveValue("Uranus in Gemini changes how you introduce yourself, speak up, and choose what comes next.");
    await signField.fill("Uranus in Gemini changes how you introduce yourself and choose what comes next.");
    await editor.getByRole("button", { name: "Save all changes", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ method: "PATCH", payload: { id: "qa-uranus-gemini-house-1" } });
    // Row lifecycle remains covered by the ordinary-content save/archive/restore test.
    // The combined editor changes prose without adding a new publication action.
    await editor.getByRole("button", { name: /^Close/ }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(finder.getByRole("heading", { name: "Uranus in Gemini through your 1st house", level: 3 })).toBeVisible();
    await expectNoHorizontalOverflow(page, "House Transits Sky write-up workspace");
    await assertNoBrowserErrors();
  });

  test("transit source saves fail visibly when the API returns no saved row", async ({ page }) => {
    const houseTransitRow = {
      ...generatedContentRows[0],
      id: "qa-empty-response-house-transit",
      content_key: "authored/transit-house-intro/uranus/1",
      headline: "Uranus through the 1st house",
      body: "Over the next several years, the pull is toward freedom: old roles stop fitting."
    };
    await seedAdminApi(page, { generatedRows: [houseTransitRow], generatedContentWriteReturnsEmpty: true });
    await expectAdminRouteLoads(page, "/admin/content#sky-writeups");
    await page.getByRole("tab", { name: "House Transits" }).click();
    await page.getByLabel("House Transit planet").selectOption("uranus");
    await page.getByLabel("House Transit zodiac sign").selectOption("gemini");
    await page.getByLabel("House Transit house").selectOption("1");

    await page.getByRole("region", { name: "House Transits source finder" })
      .getByRole("button", { name: "Edit complete write-up", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "House Transit write-up editor" });
    const field = editor.getByRole("textbox", { name: "Uranus through the 1st house — You copy", exact: true });
    await field.fill("A proposed change that must remain visibly unsaved.");
    await editor.getByRole("button", { name: "Save all changes", exact: true }).click();
    await expect(editor.getByRole("alert")).toContainText(/did not return the saved row|not saved|save failed/i);
    await expect(field).toHaveValue("A proposed change that must remain visibly unsaved.");
    await expect(editor.getByRole("button", { name: "Save all changes", exact: true })).toBeEnabled();
  });

  test("legacy transit searches and navigation lead directly to Transit to Natal Charts", async ({ page }) => {
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content#exact-content?category=Sky&q=cms%2Fpersonal-transit-aspect");

    const shortcut = page.getByRole("region", { name: "Transit writing workspace shortcut" });
    await expect(shortcut.getByRole("heading", { name: "Transit to Natal Charts" })).toBeVisible();
    expect(await page.getByLabel("Category").locator("option").allTextContents()).toEqual(expect.arrayContaining([
      "Personal Transits (Transit to Natal)",
      "House Transits"
    ]));
    await shortcut.getByRole("button", { name: "Open Transit to Natal Charts" }).click();
    await expect(page.getByRole("tab", { name: "Personal Transits" })).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/#sky-writeups\?view=transits-to-natal$/u);

    const navigation = page.getByRole("navigation", { name: "Content operations" });
    await expect(navigation.getByRole("button", { name: "Transit to Natal Charts" })).toHaveAttribute("aria-current", "page");
    await navigation.getByRole("button", { name: "House Transits" }).click();
    await expect(page.getByRole("tab", { name: "House Transits" })).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/#sky-writeups\?view=house-transits$/u);
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
    await expect(page.getByRole("heading", { name: "Articles", level: 1, exact: true })).toBeVisible();

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
    const compatibilitySections = page.getByRole("group", { name: "Compatibility sections" });
    await expect(compatibilitySections.getByRole("button", { name: /All compatibility/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("region", { name: "Compatibility sections summary" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Surface" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Kind" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Updated" })).toHaveCount(0);
    await expect(compatibilitySections.getByRole("button", { name: /Simple fallbacks 1/ })).toBeVisible();
    await expect(compatibilitySections.getByRole("button", { name: /Reusable phrases 1/ })).toBeVisible();
    await expect(compatibilitySections.getByRole("button", { name: /Templates & slots 1/ })).toBeVisible();
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
    await expect(editor.getByRole("button", { name: "Save & publish", exact: true })).toBeDisabled();
    await fillAdminEditorField(editor, "Full passage / body", "Your {{houseOrdinal}} house begins in {{sign}}. Review what you repeat here each month.");
    await expect(editor.getByRole("alert", { name: "CMS template errors" })).toHaveCount(0);
    await expect(editor.getByLabel("CMS template preview")).toContainText("Your 2nd house begins in Taurus.");
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(editor.getByText("Reader-facing CMS override")).toBeVisible();
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Inactive");
    await expect(editor.getByRole("button", { name: "Mark reviewed" })).toHaveCount(0);
    await expect(editor.getByRole("button", { name: "Save & publish", exact: true })).toBeEnabled();
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
    await expect(editor.getByLabel("Source text")).toHaveValue(heldSkyAspectDrafts[0].body);
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
    const vocabularyTabs = page.getByRole("navigation", { name: "Vocabulary categories" });
    await expect(vocabularyTabs.getByRole("link", { name: "Planets" })).toHaveAttribute("aria-current", "page");
    const relationshipVocabTab = vocabularyTabs.getByRole("link", { name: "Relationship" });
    await relationshipVocabTab.click();
    await expect(page).toHaveURL(/#vocabulary\?category=relationship$/);
    await expect(
      page.getByRole("navigation", { name: "Vocabulary categories" }).getByRole("link", { name: "Relationship" })
    ).toHaveAttribute("aria-current", "page");
    await page.getByLabel("Search vocabulary").fill("vocab/relationship/compatibility-repair");
    await expect(page.locator(".admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-content-row")).toContainText("vocab/relationship/compatibility-repair");

    await page.getByRole("navigation", { name: "Composition workspace" }).getByRole("button", { name: "Fallback Hooks" }).click();
    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    const friendsFallbackTab = page
      .getByRole("group", { name: "Fallback hook sections" })
      .getByRole("button", { name: "Friends", exact: true });
    await friendsFallbackTab.click();
    await expect(friendsFallbackTab).toHaveAttribute("aria-pressed", "true");
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
    await expect(editor.locator("details.admin-editor-brief > summary")).toContainText("Edit this variable value");
    await editor.locator("details.admin-editor-brief > summary").click();
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
    await editor.locator("details.admin-editor-details > summary").click();
    await expect(editor.getByText("Internal source details")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(editor.getByLabel("Variable value")).toBeVisible();
    const mobileEditorBox = await editor.boundingBox();
    expect(mobileEditorBox).not.toBeNull();
    expect(mobileEditorBox!.x).toBeGreaterThanOrEqual(0);
    expect(mobileEditorBox!.width).toBeLessThanOrEqual(390);

    await editor.getByLabel("Variable value").fill("Agreeing before checking your capacity");
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].method).toBe("PATCH");
    expect(writes[0].payload.body).toBe("Agreeing before checking your capacity");
    expect((writes[0].payload.sections as { packageDraft: { body: string } }).packageDraft.body)
      .toBe("Agreeing before checking your capacity");
    await expect(editor.getByText("Draft saved", { exact: true })).toBeVisible();
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
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
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
    await page.getByText("Editorial filters", { exact: true }).click();
    await expect(page.locator("[aria-label='Reader status']").getByRole("button", { name: /Inactive/ })).toBeVisible();
    await expect(page.locator("[aria-label='Reader status']").getByRole("button", { name: /Live/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Content status definitions" })).toContainText("readers can currently receive this copy");

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
    const workflowParagraph = sourceRepairIssue.locator('.admin-unresolved-current-step > p');
    await expect(workflowParagraph).toHaveText('The diagnosis and replacement plan are ready. Review the exact wording and approve it only if it is correct.');
    await expectStudioRole(page, workflowParagraph, 'body', 'Unresolved workflow explanation inside its table cell');
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
    await expect(page.getByRole("button", { name: "Hide reference" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Show retired" })).toHaveAttribute("aria-pressed", "true");
    const guidedEditor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(guidedEditor).toBeVisible();
    await expect(guidedEditor.getByRole("region", { name: "Guided unresolved-content review" })).toContainText("The populated Headline and Body fields below are the copy under review");
    await expect(guidedEditor.getByRole("region", { name: "Guided unresolved-content review" })).toContainText(editableUnresolvedItem?.contentKey ?? "");
    await expect(guidedEditor.getByLabel("Full lunar passage")).toHaveValue(String(guidedLunationRecord.body));
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
    await expect.poll(() => recorded).toEqual({ ...response, expectedUpdatedAt: null });
  });

  test("review queue Edit opens the saved-row editor", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content#review-queue?view=all");

    const reviewRow = page.locator(".admin-review-queue-rows .admin-content-row", { hasText: "sky.placement.sun.cancer" });
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
    await expectAdminRouteLoads(page, "/admin/content#review-queue?view=all");

    await page.getByRole("button", { name: "All review", exact: true }).click();
    const currentSkyRow = page.locator(".admin-review-queue-rows .admin-content-row", { hasText: aspectRows[0].content_key });
    const transitToNatalRow = page.locator(".admin-review-queue-rows .admin-content-row", { hasText: aspectRows[1].content_key });
    const natalRow = page.locator(".admin-review-queue-rows .admin-content-row", { hasText: aspectRows[2].content_key });
    const synastryRow = page.locator(".admin-review-queue-rows .admin-content-row", { hasText: aspectRows[3].content_key });

    await expect(currentSkyRow.locator(".admin-content-type-label")).toHaveText("Transit aspect · current sky");
    await expect(transitToNatalRow.locator(".admin-content-type-label")).toHaveText("Transit aspect · natal contact");
    await expect(natalRow.locator(".admin-content-type-label")).toHaveText("Natal aspect · birth chart");
    await expect(synastryRow.locator(".admin-content-type-label")).toHaveText("Relationship aspect · synastry");

    await page.getByLabel("Search review queue").fill("Natal aspect birth chart");
    await expect(page.locator(".admin-review-queue-rows .admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-review-queue-rows .admin-content-row")).toContainText(aspectRows[2].content_key);

    await page.getByLabel("Search review queue").fill("");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(currentSkyRow.locator(".admin-content-type-label")).toBeVisible();
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

    await editor.locator("details.admin-editor-details > summary").click();
    await editor.locator("details.admin-editor-settings > summary").click();
    await editor.getByLabel("Approval", { exact: true }).selectOption("approved");
    await expect(editor.getByLabel("Fallback review status")).toHaveCount(0);
    await expect(editor.getByLabel("Approval status")).toHaveText("Approved");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Draft");
    await expect(editor.getByLabel("Reader status after save")).toHaveText("Live");
    await expect(editor.getByText("This copy is approved. Save to publish it to readers.")).toBeVisible();
    await expect(editor.getByRole("button", { name: "Save & publish", exact: true })).toBeDisabled();
    await editor.getByLabel("Reader phrase · You", { exact: true }).fill("QA new natal aspect passage.");
    await textarea.fill("{{Name}} receives the QA natal aspect passage.");

    await editor.getByRole("button", { name: "Save & publish" }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.payload).toMatchObject({ reviewStatus: "approved" });
    await expect(editor.getByLabel("Approval status")).toHaveText("Approved");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await expect(page.getByRole("status").filter({ hasText: "fallback-hook/natal-aspect-lived/lilith/square/ascendant saved as Live" })).toBeVisible();
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
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Inactive");
    await expect(editor.getByText("Ready to publish", { exact: true })).toBeVisible();
    const publishButton = editor.getByRole("button", { name: "Save & publish" });
    await expect(publishButton).toBeEnabled();
    await publishButton.click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.method).toBe("PATCH");
    expect(writes[0]?.payload).toMatchObject({ id: stuckDraft.id, reviewStatus: "approved" });
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await expect(page.getByRole("status").filter({ hasText: `${contentKey} saved as Live` })).toBeVisible();
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
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Inactive");
    await expect(editor.getByText("Draft saved", { exact: true })).toBeVisible();
    await expect(editor.getByLabel("Reader phrase · You")).toHaveValue("Approved revised You copy.");
    const publishRevisionButton = editor.getByRole("button", { name: "Save & publish" });
    await expect(publishRevisionButton).toBeEnabled();
    let unconfirmedPublish = true;
    await page.route("**/api/admin/generated-content", async route => {
      if (unconfirmedPublish && route.request().method() === "PATCH"
        && route.request().postDataJSON().ownerAction === "approve-package-revision") {
        unconfirmedPublish = false;
        await route.fulfill({ json: { ok: true, rows: [pendingRevision] } });
      } else await route.fallback();
    });
    await publishRevisionButton.click();
    await expect(editor.getByRole("alert")).toContainText("Publication was not confirmed");
    await expect(editor.getByLabel("Reader phrase · You")).toHaveValue("Approved revised You copy.");
    await expect(publishRevisionButton).toBeEnabled();
    await publishRevisionButton.click();

    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.method).toBe("PATCH");
    expect(writes[0]?.payload).toEqual({
      id: pendingRevision.id,
      ownerAction: "approve-package-revision",
      expectedUpdatedAt: pendingRevision.updated_at
    });
    await expect(editor.getByLabel("Approval status")).toHaveText("Approved");
    await expect(editor.getByLabel("Reader status", { exact: true })).toHaveText("Live");
    await expect(editor.getByLabel("Reader phrase · You")).toHaveValue("Approved revised You copy.");
    await expect(editor.getByRole("button", { name: "Save & publish" })).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText(`${contentKey} approved and published to the app`);
    await assertNoBrowserErrors();
  });

  test("missing Sky candidates open a manual draft with their calculated facts", async ({ page }) => {
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page, { onGeneratedContentWrite: (write) => writes.push(write) });
    await expectAdminRouteLoads(page, "/admin/content#review-queue?view=all");

    await page.getByRole("button", { name: /Missing writing \/ upcoming/ }).click();
    const missingCard = page.locator(".admin-sky-voice-card", { hasText: "Sun trine Chiron" });
    await expect(missingCard.getByRole("button", { name: "Write manually" })).toBeVisible();
    await missingCard.getByRole("button", { name: "Write manually" }).click();

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
    await expectAdminRouteLoads(page, "/admin/content#review-queue?view=all");

    await page.getByRole("button", { name: /Missing writing \/ upcoming/ }).click();
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
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
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
    const compactTags = houseGroup.locator(".admin-table-tag:visible");
    await expect(compactTags.first()).toBeVisible();
    const tagHeights = await compactTags.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().height)));
    expect(tagHeights.length).toBeGreaterThan(0);
    expect(Math.max(...tagHeights)).toBeLessThanOrEqual(32);
    await page.getByLabel("Search fallback articles and passages").fill("Jupiter in Leo 10th House");
    await expect(articleGroup).toBeHidden();
    await expect(houseGroup.getByText("Jupiter in Leo · 10th House", { exact: true })).toBeVisible();
    await houseGroup.getByRole("button", { name: "Edit" }).click();
    const houseEditor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(houseEditor.getByLabel("Editor label"))
      .toHaveValue("Jupiter in Leo · 10th House");
    await houseEditor.locator("details.admin-editor-brief > summary").click();
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
    await expect(page.getByText("Start with any reader-facing surface in the app, then follow its editorial sources, runtime path, templates, and calculated facts.")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Surfaces & systems 24/ })).toHaveAttribute("aria-selected", "true");
    const surfaceList = page.getByRole("complementary", { name: "App surfaces and systems" });
    await surfaceList.getByText(/^Browse surfaces/).click();
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
    await expect(page.getByRole("group", { name: "Fallback hook sections" }).getByRole("button", { name: "Daily", exact: true })).toHaveAttribute("aria-pressed", "true");
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
    await expect(page.getByRole("navigation", { name: "Vocabulary categories" }).getByRole("link", { name: "Planets" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Vocabulary categories" }).getByRole("link", { name: "Relationship" })).toBeVisible();

    await openAdminDeepLink("#fallback-hooks");
    await expectAdminHeader(page, "Fallback Articles & Passages", "Admin / Composition / Fallback articles & passages");
    await expect(page.locator("main.admin-dashboard")).toContainText(/Sky|Natal|Lunar Calendar|Settings|Friends/);

    await openAdminDeepLink("#surface-map");
    await expectAdminHeader(page, "Surface Map", "Admin / Composition / Surface map");
    await expect(page.getByText(/reader surface directory|mapped surfaces/i).first()).toBeVisible();

    await assertNoBrowserErrors();
  });

  test("Daily At-a-Glance pairs headline and passage with calculated Moon context", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const dailyRow = (id: string, contentKey: string, bodyYou: string, bodyThey: string) => ({
      id,
      content_key: contentKey,
      surface: "you",
      mode: "feed",
      status: "LIVE",
      event_type: "fallback-hook",
      target_date: null,
      headline: contentKey,
      summary: "Owner-approved Daily At-a-Glance fixture.",
      body: bodyYou,
      sections: {
        packageRecord: {
          content_role: "fallback_hook",
          contentKey,
          review_status: "approved",
          body_you: bodyYou,
          body_they: bodyThey
        }
      },
      block_type: "fallback_hook",
      lane: "serving",
      review_state: null,
      facts: { fallbackArchitectureV3: true, review_status: "approved" },
      knowledge_ids: [],
      source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", review_status: "approved" },
      reviewer_notes: null,
      prompt_version: "qa-daily-glance",
      provider: "fallback-architecture-v3",
      model: null,
      reviewed_at: now,
      published_at: now,
      updated_at: now,
      created_at: now
    });
    const generatedRows = [
      dailyRow("qa-daily-headline", "fallback-hook/daily-headline/soft/mars", "Take the useful opening.", "{{personPreferredName}} may take the useful opening for {{personReflexive}}."),
      dailyRow("qa-daily-passage", "fallback-hook/daily-body/soft/mars", "Check the schedule before committing.", "The calendar gives {{personObject}} time before {{personSubject}} commit{{personVerbSuffix}}.")
    ];
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    await seedAdminApi(page, {
      generatedRows,
      onGeneratedContentWrite: (write) => writes.push(write),
      reviewRows: [{
        id: "calculated:daily-glance:alisa:2026-09-01",
        source: "calculated",
        surface: "you",
        status: "DRAFT",
        mode: "feed",
        title: "Daily At-a-Glance · Alisa P",
        subtitle: "Moon in Aries · Moon trine natal Mars",
        targetDate: "2026-09-01",
        contentKey: "fallback-hook/daily-body/soft/mars",
        eventType: "daily-glance-source",
        summary: "Calculated fixture.",
        body: "",
        sections: [],
        facts: {
          timeZone: "America/New_York",
          chart: { id: "alisa", name: "Alisa P", birthTimeKnown: true },
          moon: { sign: "Aries", degree: 9.2 },
          driver: { kind: "aspect", label: "Moon trine natal Mars", orb: 1.2 },
          selector: "soft/mars",
          headlineKey: "fallback-hook/daily-headline/soft/mars",
          passageKey: "fallback-hook/daily-body/soft/mars",
          detailLine: "Moon in Aries is trine Alisa P's natal Mars at a 1.2° orb."
        },
        sourceSnapshot: null,
        reviewerNotes: null,
        updatedAt: now
      }]
    });

    await expectAdminRouteLoads(page, "/admin/content#fallback-hooks?section=daily&q=daily");
    const studio = page.getByRole("region", { name: "Daily At-a-Glance editor" });
    await expect(studio.getByRole("heading", { name: "Edit the complete write-up" })).toBeVisible();
    await expect(studio).toContainText("1 matched write-ups");
    await page.getByLabel("Search fallback articles and passages").fill("schedule");
    await expect(studio.getByText("Check the schedule before committing.")).toBeVisible();
    const listPassage = studio.locator('.admin-daily-glance-pair-list p.admin-copy-preview');
    await expect(listPassage).toHaveText('Check the schedule before committing.');
    await expectStudioRole(page, listPassage, 'body', 'Daily matched passage paragraph');

    await studio.getByLabel("Daily At-a-Glance person or chart").fill("Alisa P");
    await studio.getByLabel("Daily At-a-Glance local date").fill("2026-09-01");
    await studio.getByRole("button", { name: "Load current Moon write-up" }).click();
    await expect(studio.getByText("Moon in Aries", { exact: true })).toBeVisible();
    await expect(studio).toContainText("Moon in Aries is trine Alisa P's natal Mars at a 1.2° orb.");
    const currentPassage = studio.locator('.admin-daily-glance-current p.admin-copy-preview');
    await expect(currentPassage).toHaveText('Check the schedule before committing.');
    await expectStudioRole(page, currentPassage, 'body', 'Calculated Daily passage paragraph');
    await studio.getByRole("button", { name: "Edit this headline and passage" }).click();

    const editor = page.getByRole("dialog", { name: "Daily At-a-Glance paired editor" });
    await expect(editor.getByLabel("Headline · You")).toHaveValue("Take the useful opening.");
    await expect(editor.getByLabel("Passage · You")).toHaveValue("Check the schedule before committing.");
    const youPassage = editor.getByLabel('You reader preview').locator('p.admin-copy-preview');
    await expect(youPassage).toHaveText('Check the schedule before committing.');
    await expectStudioRole(page, youPassage, 'body', 'Daily paired editor passage paragraph');
    const friendPreview = editor.getByLabel("Friend reader preview");
    await expect(editor.getByLabel("Friend preview name")).toHaveValue("Alisa P");
    await expect(friendPreview).toContainText("Alisa P may take the useful opening for themselves.");
    await expect(friendPreview).toContainText("The calendar gives them time before they commit.");
    await expect(friendPreview).not.toContainText("{{");
    await expect(friendPreview.locator('[data-variable="personPreferredName"]')).toHaveClass(/is-name/u);
    await expect(friendPreview.locator('[data-variable="personObject"]')).toHaveClass(/is-object/u);
    await expect(friendPreview.locator('[data-variable="personReflexive"]')).toHaveClass(/is-reflexive/u);
    const variableGuide = editor.getByLabel("Friend variable guide");
    await expect(variableGuide).toContainText("The pronoun that receives an action: them, her, or him.");
    await expect(variableGuide).toContainText("The pronoun used when the person acts on themself: themselves, herself, or himself.");
    await editor.getByLabel("Friend preview pronouns").selectOption("she");
    await expect(friendPreview).toContainText("Alisa P may take the useful opening for herself.");
    await expect(friendPreview).toContainText("The calendar gives her time before she commits.");
    await editor.getByLabel("Headline · You").fill("Take the useful opening now.");
    await editor.getByLabel("Passage · You").fill("Check the calendar before committing.");
    await editor.getByRole("button", { name: "Save headline and passage" }).click();
    await expect.poll(() => writes.length).toBe(2);
    await expect(editor).toContainText("All changes saved");
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
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]?.payload).toMatchObject({
      id: templateRow.id,
      sections: {
        packageDraft: {
          summary: "Updated template purpose"
        }
      }
    });
    await expect(editor.getByText("Draft saved", { exact: true })).toBeVisible();

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
    await expect(editor.getByRole("button", { name: "Save & publish" })).toBeVisible();
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
      fontSize: 16,
      fontWeight: 600,
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
    expect(mobileReviewTypography).toEqual({ headingSize: 16, bodySize: 16 });
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
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
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
              updated_at: "2026-09-10T12:00:00.123456Z",
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
    expect(actions.at(-1)).toMatchObject({ action: "publish_report_unit_correction", reportId, unitId, expectedUpdatedAt: "2026-09-10T12:00:00.123456Z" });
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
    await editor.locator("details.admin-editor-brief > summary").click();
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
      marginTop: "0px",
      textTransform: "none",
      textAlign: "start"
    });
    expect(desktopEditorHeadingStyle.fontFamily).toBeTruthy();
    expect(desktopEditorHeadingStyle.lineHeight).toBeLessThanOrEqual(29);

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
    await editor.locator("details.admin-editor-brief > summary").click();
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

    const variableGuide = page.getByRole("complementary", { name: "Template variable reference" });
    await expect(variableGuide).toBeVisible();
    await expect(variableGuide.getByRole("button", { name: "Insert {{planetTitle}}", exact: true })).toBeVisible();
    await expectFormShellDoesNotOverlap(variableGuide, "template variable rail desktop", railShellSelectors);
    await expect(variableGuide.getByRole("heading", { name: /in this row$/u })).toBeVisible();
    // The rail docks beside the editor instead of covering it.
    const editorBox = await editor.boundingBox();
    const railBox = await variableGuide.boundingBox();
    expect(editorBox!.x + editorBox!.width).toBeLessThanOrEqual(railBox!.x + 1);
    const readerWriteup = variableGuide.getByRole("region", { name: "Example reader write-up" });
    await expect(readerWriteup.getByText("Assembled write-up", { exact: true })).toBeVisible();
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
    let variableDetails = variableGuide.getByRole("region", { name: "Planet best variable details" });
    await expect(variableDetails).toContainText("At your best,");
    await expect(variableDetails.getByRole("region", { name: "Saved source copy" }).getByRole("button", { name: "{{planetTitle}}" })).toBeVisible();
    const sourceParagraphs = variableDetails.getByRole('region', { name: 'Saved source copy' }).locator('p.admin-variable-source-prose');
    const sourceProse = sourceParagraphs.filter({ has: page.getByRole('button', { name: '{{planetTitle}}', exact: true }) });
    await expect(sourceProse).toHaveText(planetBestRow.body);
    expect(await sourceProse.evaluate(element => element.textContent)).toBe(planetBestRow.body);
    await expectStudioRole(page, sourceParagraphs, 'body', 'Saved variable source paragraphs');
    await expectStudioRole(page, sourceProse.getByRole('button', { name: '{{planetTitle}}', exact: true }), 'body', 'Inline source variable keeps saved paragraph typography');
    await expect(variableDetails.getByRole("region", { name: "Variables inside Planet Best" })).toContainText("Planet Title");
    await variableDetails.getByRole("region", { name: "Saved source copy" }).getByRole("button", { name: "{{planetTitle}}" }).click();
    variableDetails = variableGuide.getByRole("region", { name: "Planet title variable details" });
    await expect(variableDetails).toContainText("Calculated by app");
    await expect(variableDetails).toContainText("No saved passage to review");
    await variableDetails.getByRole("button", { name: "All variables" }).click();

    await variableGuide.locator("summary[aria-label='Template syntax help']").click();
    const syntaxGuide = variableGuide.getByRole("region", { name: "Template syntax guide" });
    await expect(syntaxGuide).toContainText("Includes the block only when that optional copy is available");
    await variableGuide.locator("summary[aria-label='Template syntax help']").click();

    const verbRow = variableGuide.locator(".admin-variables-rail-row", { hasText: "{{planetVerb}}" });
    await expect(verbRow).toContainText("Required");
    await expect(verbRow).toContainText("Planet vocabulary");
    const introRow = variableGuide.locator(".admin-variables-rail-row", { hasText: "{{planetIntro}}" });
    await expect(introRow).toContainText("Optional");
    await introRow.click();
    variableDetails = variableGuide.getByRole("region", { name: "Planet intro variable details" });
    await expect(variableDetails).toContainText("introductory sentences");
    await expect(variableDetails).toContainText("fallback-hook/planet-intro/sun");
    await expect(variableDetails).not.toContainText("The Sun describes identity, purpose, and the need to create.");
    await variableDetails.getByRole("button", { name: "All variables" }).click();

    await variableGuide.getByRole("searchbox", { name: "Find a variable" }).fill("modifier");
    await expect(variableGuide.locator(".admin-variables-rail-row")).toHaveCount(1);
    await expect(variableGuide).toContainText("1 of");

    await page.setViewportSize({ width: 390, height: 844 });
    await expectFormShellDoesNotOverlap(variableGuide, "template variable rail mobile", railShellSelectors);
    await expectNoHorizontalOverflow(page, "Template variable rail mobile");
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "mobile-template-reader-drilldown.png")
    });
    await variableGuide.getByRole("button", { name: "Close variables" }).click();
    await expect(variableGuide).toBeHidden();
    await expect(editor.getByLabel("You view copy")).toHaveValue(editedBody);
    await expectNoHorizontalOverflow(page, "Template editor with variable action on mobile");

    await editor.getByRole("button", { name: /^Reader preview & variables \(\d+\)$/u }).click();
    await variableGuide.getByRole("searchbox", { name: "Find a variable" }).fill("planet intro");
    await variableGuide.locator(".admin-variables-rail-row", { hasText: "{{planetIntro}}" }).click();

    variableDetails = variableGuide.getByRole("region", { name: "Planet intro variable details" });
    await expect(variableDetails).toContainText("fallback-hook/planet-intro/sun");
    await expect(variableDetails.getByRole("navigation", { name: "Variable path" })).toContainText("Planet Intro");
    await expectNoHorizontalOverflow(page, "Variable detail in the mobile rail");
    await variableDetails.locator(".admin-variable-source-row", { hasText: "Sun introduction" }).click();
    await expect(variableDetails).toContainText("The Sun describes identity, purpose, and the need to create.");
    page.once("dialog", (dialog) => dialog.dismiss());
    await variableDetails.getByRole("button", { name: "Edit source" }).click();
    await expect(editor.getByLabel("You view copy")).toHaveValue(editedBody);
    await expect(variableGuide).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
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
    const variableGuide = page.getByRole("complementary", { name: "Template variable reference" });
    const transitTopicRow = variableGuide.locator(".admin-variables-rail-row", { hasText: "{{transitTopic}}" });
    await expect(transitTopicRow).toContainText("Planet-topic vocabulary selected by the transit resolver");
    await transitTopicRow.click();

    const transitTopicDetails = variableGuide.getByRole("region", { name: "Transit topic variable details" });
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
    const readPrimaryNavRhythm = () => page.getByRole("region", { name: "Write" }).evaluate((section) => {
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
    expect(desktopNavRhythm.itemHeight).toBe(56);
    expect(desktopNavRhythm.fontFamily).toContain("system-ui");
    expect(desktopNavRhythm.fontSize).toBe(14);
    expect(desktopNavRhythm.fontWeight).toBe("400");
    expect(desktopNavRhythm.lineHeight).toBe("20px");
    expect(desktopNavRhythm.letterSpacing).toBe("normal");
    await expectNoHorizontalOverflow(page, "Admin desktop home");
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "desktop-review-queue.png") });

    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Content Library" }).click();
    await expect(page.locator("main.admin-dashboard")).not.toContainText(forbiddenReaderPreviewCopy);
    const contentToolbar = page.getByRole("region", { name: "Content controls" });
    await expect(contentToolbar.locator('.admin-library-guide')).toBeVisible();
    await expect(contentToolbar.getByRole('heading')).toHaveCount(0);
    await expect(contentToolbar.getByRole('button', { name: 'New content row', exact: true })).toBeHidden();
    await contentToolbar.getByText('Library tools', { exact: true }).click();
    await expect(contentToolbar.getByRole('button', { name: 'New content row', exact: true })).toBeVisible();
    const visibilityPanel = page.getByRole('region', { name: 'Content status definitions' });
    await visibilityPanel.locator('summary').click();
    await expect(visibilityPanel).toContainText('Inactive');
    expect(await visibilityPanel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
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
  test("natal variables support inline repeat saves and preserve the complete Uranus assembly", async ({ page }) => {
    test.setTimeout(90_000);
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    const keys = natalPlacementResolverDependencyKeys("uranus", "scorpio", "6", "direct");
    const sources = natalPlacementPackageSources(keys);
    const sourceRows = sources.map((record) => ({
      ...generatedContentRows[0], id: `qa-${record.contentKey}`, content_key: record.contentKey,
      surface: "you", mode: "in_depth", status: "LIVE", lane: "serving", review_state: null,
      provider: "tldrastro-fallback-architecture-v3", event_type: "fallback-hook",
      headline: record.headline ?? record.contentKey, summary: "",
      body: record.body_you ?? record.body ?? "",
      block_type: record.content_role === "template" ? "fallback_template" : record.content_role === "vocabulary" ? "vocabulary_phrase" : "fallback_hook",
      facts: { fallbackArchitectureV3: true },
      source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", review_status: record.review_status },
      sections: { packageRecord: record }, updated_at: "2026-09-07T08:00:00.000Z"
    }));
    await seedAdminApi(page, { generatedRows: sourceRows, onGeneratedContentWrite: (write) => writes.push(write) });
    // Use the real API renderer and shipped package for the preview response.
    await page.route("**/api/admin/natal-placement-preview", async (route) => {
      const state = renderNatalPlacementPreviewState(normalizeNatalPlacementPreviewInput(route.request().postDataJSON()));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, ...state }) });
    });
    await expectAdminRouteLoads(page, "/admin/content#exact-content?category=Natal+Chart&planet=uranus&sign=scorpio&house=6");
    const preview = page.locator(".admin-natal-reader-preview");
    const opening = "Uranus describes the part of you that needs freedom to think for yourself";
    const ending = "Your freedom comes from knowing what has power over you well enough to choose differently.";
    await expect(preview).toContainText(opening);
    await expect(preview).toContainText(ending);
    const complete = page.locator(".admin-natal-source-card").filter({ has: page.getByRole("heading", { name: "Complete Uranus in Scorpio passage", exact: true }) });
    await expect(complete.getByRole("textbox")).toHaveValue(new RegExp(opening));
    const action = page.locator(".admin-natal-source-card").filter({ has: page.getByRole("heading", { name: "Uranus action phrase", exact: true }) });
    const field = action.getByLabel("Uranus action phrase: You copy");
    await field.fill("first test revision");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByLabel("Natal placement zodiac sign", { exact: true }).selectOption("libra");
    await expect(field).toHaveValue("first test revision");

    await action.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(action).toContainText("Draft saved.");
    await field.fill("second test revision");
    await expect(action.getByRole("button", { name: "Save draft", exact: true })).toBeEnabled();
    await action.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => writes.length).toBe(2);
    expect((writes[1].payload.sections as { packageDraft: { body: string } }).packageDraft.body).toBe("second test revision");
    await action.getByRole("button", { name: "Save & publish", exact: true }).click();
    await expect(action).toContainText("Published. The reader preview will refresh.");
    await field.fill("third test revision");
    await action.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(action).toContainText("Draft saved.");
    await expect(page.getByRole("dialog", { name: "Generated content editor" })).toHaveCount(0);
    // Shared phrase changes cannot splice into the author-final sign passage.
    await expect(preview).toContainText(opening);
    await expect(preview).toContainText(ending);
    const titleContract = await complete.locator("h4").evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
    });
    expect(await action.locator("h4").evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing];
    })).toEqual(titleContract);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((theme) => { document.documentElement.dataset.theme = theme; }, theme);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await complete.scrollIntoViewIfNeeded();
        await expect(complete.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
        await expect(complete.getByRole("button", { name: "Save & publish", exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(page, `Natal inline editor ${theme} ${width}`);
        await page.screenshot({ path: path.join(adminScreenshotDir, `natal-inline-${theme}-${width}.png`) });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByText("Sentence structure (advanced)", { exact: true }).click();
    const templateCard = page.locator(".admin-natal-source-card").filter({ has: page.getByRole("heading", { name: "Uranus sign template", exact: true }) });
    await templateCard.getByRole("button", { name: "Preview template", exact: true }).click();
    const rail = page.getByRole("complementary", { name: "Template variable reference" });
    await expect(rail).toContainText("Uranus");
    await expect(rail).toContainText("Scorpio");
    await expect(rail).not.toContainText("Sun in Leo");
    await rail.locator(".admin-variables-rail-row").filter({ hasText: "{{planetBest}}" }).click();
    await expect(rail).not.toContainText("0 source rows");
    await expect(rail).toContainText("fallback-hook/planet-best/uranus");
    await assertNoBrowserErrors();
  });

  test("bulk CRUD preserves successful updates and deletions when another row fails", async ({ page }) => {
    const fixtures = ["first", "second"].map((name) => ({
      ...generatedContentRows[0], id: `bulk-${name}`, content_key: `content/manual/bulk-${name}`,
      headline: `Bulk ${name} entry`, body: "Test body.", status: "DRAFT", lane: "serving",
      block_type: "essay", event_type: "essay", provider: "manual-admin", sections: {}, facts: {}, source_snapshot: {}
    }));
    await seedAdminApi(page, { generatedRows: fixtures });
    await page.route("**/api/admin/generated-content**", async (route) => {
      const request = route.request();
      const method = request.method();
      const id = method === "PATCH" ? request.postDataJSON().id : new URL(request.url()).searchParams.get("id");
      if ((method === "PATCH" || method === "DELETE") && id === "bulk-second") {
        await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ ok: false, error: "A newer revision exists." }) });
      } else await route.fallback();
    });
    await expectAdminRouteLoads(page, "/admin/content#exact-content");
    // Row selection is intentionally internal in the product. Reveal it only
    // in this fixture to exercise the retained mutation handlers.
    await page.addStyleTag({ content: ".admin-dashboard .admin-col-select { display: table-cell !important; } .admin-dashboard .admin-content-row-check { display: block !important; } .admin-dashboard .admin-content-bulk-bar { display: flex !important; }" });
    const first = page.locator(".admin-content-row").filter({ hasText: "Bulk first entry" });
    const second = page.locator(".admin-content-row").filter({ hasText: "Bulk second entry" });
    await first.getByRole("checkbox").check();
    await second.getByRole("checkbox").check();
    const bulk = page.locator(".admin-content-bulk-bar");
    await bulk.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page.getByText(/Updated 1 rows. 1 failed and remain selected/)).toBeVisible();
    await expect(first.getByRole("checkbox")).not.toBeChecked();
    await expect(second.getByRole("checkbox")).toBeChecked();
    await first.getByRole("checkbox").check();
    await bulk.getByRole("button", { name: "Delete drafts", exact: true }).click();
    await expect(page.getByText(/Deleted 1 non-published rows. 1 failed and remain selected/)).toBeVisible();
    await expect(first).toHaveCount(0);
    await expect(second.getByRole("checkbox")).toBeChecked();
  });

  test("article autosaves serialize overlapping edits and protect pending copy on close", async ({ page }) => {
    const { compileSkyArticleEdition } = await import("../../apps/web/src/content/skyArticleTemplateCompiler");
    const edition = await compileSkyArticleEdition({
      templateBody: "# Pluto in {{sign}}\n\nQA article body.\n\n{{risingBlocks}}",
      templateKey: "sky/article-template/pluto/ingress", planet: "pluto", sign: "aquarius",
      tldr: "QA original summary.", entryYear: 2024, validFrom: "2024-11-19", validTo: "2043-03-08",
      transitStartInstant: "2024-11-19T20:29:00.000Z", transitEndInstant: "2043-03-09T00:00:00.000Z",
      slotValues: { sign: "Aquarius" },
      housePassages: Array.from({ length: 12 }, (_, index) => ({ house: index + 1, contentKey: `qa/house/${index + 1}`, body: `QA house ${index + 1}.` })),
      aspectPassages: []
    });
    let saved = { ...generatedContentRows[0], id: "qa-article-autosave", content_key: edition.contentKey,
      status: "LIVE", lane: "serving", review_state: null, event_type: "sky-article-edition", block_type: "sky_article",
      headline: edition.headline, summary: edition.tldr, body: edition.body,
      sections: { skyArticleEdition: edition }, updated_at: "2026-09-07T10:00:00.000Z" };
    await seedAdminApi(page, { generatedRows: [saved] });
    const writes: Record<string, any>[] = [];
    let releaseFirst!: () => void;
    const firstResponse = new Promise<void>((resolve) => { releaseFirst = resolve; });
    await page.route("**/api/admin/generated-content", async (route) => {
      if (route.request().method() !== "PATCH") return route.fallback();
      const body = route.request().postDataJSON();
      writes.push(body);
      if (writes.length === 1) await firstResponse;
      if (body.expectedUpdatedAt !== saved.updated_at) {
        await route.fulfill({ status: 409, json: { error: "Stale editor version" } }); return;
      }
      saved = { ...saved, summary: body.sections.skyArticleEdition.tldr,
        sections: { skyArticleEdition: body.sections.skyArticleEdition },
        updated_at: `2026-09-07T10:00:0${writes.length}.000Z` };
      await route.fulfill({ json: { ok: true, rows: [saved] } });
    });
    await expectAdminRouteLoads(page, "/admin/content#exact-content");
    await page.locator(".admin-content-row").getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.locator(".admin-editor-panel");
    const summary = editor.getByLabel("Sky article TL;DR", { exact: true });
    await summary.fill("QA first revision.");
    await expect.poll(() => writes.length).toBe(1);
    await summary.fill("QA second revision while first is saving.");
    page.once("dialog", (dialog) => dialog.dismiss());
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(summary).toHaveValue("QA second revision while first is saving.");
    await page.waitForTimeout(1100); // Let the second autosave debounce expire behind the held response.
    expect(writes).toHaveLength(1);
    releaseFirst();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes[1].expectedUpdatedAt).toBe("2026-09-07T10:00:01.000Z");
    await expect.poll(() => saved.summary).toBe("QA second revision while first is saving.");
    await expect(editor.locator(".admin-sky-article-editor header")).toContainText("Saved");
    await summary.fill(edition.tldr); // Reverting to the original is still a persisted edit.
    await expect.poll(() => saved.summary).toBe(edition.tldr);
    await expect(editor).not.toContainText("Autosave failed");
  });

  test("ordinary content can save twice, archive, restore, edit again, and reopen cleanly", async ({ page }) => {
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    await seedAdminApi(page, { generatedRows: [generatedContentRows[0]], onGeneratedContentWrite: (write) => writes.push(write) });
    await expectAdminRouteLoads(page, "/admin/content#exact-content");
    await page.locator(".admin-content-row").getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.locator(".admin-editor-panel");
    const summary = editor.getByLabel("TL;DR / summary", { exact: true });
    await summary.fill("QA unsaved navigation draft.");
    expect(await page.evaluate(() => !window.dispatchEvent(new Event("beforeunload", { cancelable: true })))).toBe(true);
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.evaluate(() => { window.location.hash = "#reports"; });
    await expect(page).toHaveURL(/#exact-content$/);
    await expect(summary).toHaveValue("QA unsaved navigation draft.");
    for (const copy of ["QA first saved revision.", "QA second saved revision."]) {
      await summary.fill(copy);
      await editor.getByRole("button", { name: "Save", exact: true }).click();
      await expect(editor.locator(".admin-editor-savebar")).toContainText("All changes saved");
      await expect(summary).toHaveValue(copy);
    }
    await editor.getByRole("button", { name: "Archive source", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Restore as draft", exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Restore as draft", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Archive source", exact: true })).toBeVisible();
    await summary.fill("QA final copy after restore.");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor.locator(".admin-editor-savebar")).toContainText("All changes saved");
    let discarded = false;
    page.on("dialog", async (dialog) => { discarded = true; await dialog.dismiss(); });
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(editor).toHaveCount(0);
    await page.locator(".admin-content-row").getByRole("button", { name: "Edit", exact: true }).click();
    await expect(summary).toHaveValue("QA final copy after restore.");
    expect(discarded).toBe(false);
    expect(writes.map((write) => write.payload.status)).toEqual(["LIVE", "LIVE", "ARCHIVED", "DRAFT", "DRAFT"]);
  });

});


test("surface maps select source families and manage repeated edits across themes and sizes", async ({ page }) => {
  test.setTimeout(90_000);
  const assertNoBrowserErrors = await expectNoBrowserErrors(page);
  const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
  const key = "fallback-hook/planet-intro/uranus";
  const row = {
    ...generatedContentRows[0], id: "qa-map-uranus", content_key: key,
    headline: "Uranus introduction", body: "QA introduction used by the source manager.",
    surface: "you", status: "LIVE", lane: "serving", review_state: null,
    provider: "tldrastro-fallback-architecture-v3", event_type: "fallback-hook", block_type: "fallback_hook",
    facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3" },
    sections: { packageRecord: { contentKey: key, content_role: "fallback_hook", review_status: "approved", body_you: "QA introduction used by the source manager.", body_they: "QA friend introduction." } }
  };
  const alternate = { ...row, id: "qa-map-uranus-alternate", mode: "in_depth", headline: "Uranus alternate saved row" };
  await seedAdminApi(page, { generatedRows: [row, alternate], onGeneratedContentWrite: (write) => writes.push(write) });
  await expectAdminRouteLoads(page, "/admin/content#composition-map");
  await page.getByLabel("Search surfaces and systems").fill("natal placement detail");
  const manager = page.getByRole("region", { name: "Manage composition sources" });
  await expect(manager.getByLabel("Selected composition source")).toHaveValue(row.id);
  await manager.getByLabel("Source family").selectOption("fallback-hook/planet-intro");
  await manager.getByLabel("Selected composition source").selectOption(alternate.id);
  await expect(manager.getByLabel("Selected composition source").locator("option:checked")).toContainText(alternate.headline);
  await expect(manager.locator(".admin-composition-source-card > strong")).toHaveCount(0);
  await manager.getByLabel("Selected composition source").selectOption(row.id);

  for (const theme of ["light", "dark"]) {
    if (await page.locator('.admin-dashboard').getAttribute('data-studio-theme') !== theme) {
      await page.getByRole('button', { name: `Switch to ${theme} theme` }).click();
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(manager.getByRole("heading", { name: "Select and manage sources" })).toHaveClass("sr-only");
      const style = async (locator: Locator) => locator.evaluate((element) => {
        const css = getComputedStyle(element);
        return [css.fontFamily, css.fontSize, css.fontWeight, css.lineHeight, css.letterSpacing, css.textTransform];
      });
      expect((await style(manager.getByLabel("Selected composition source").locator("..")))[2]).toBe("400");
      await expectNoHorizontalOverflow(page, `Composition source manager ${theme} ${width}`);
      await mkdir(adminScreenshotDir, { recursive: true });
      await manager.screenshot({ path: path.join(adminScreenshotDir, `source-manager-${theme}-${width}.png`) });
      await manager.getByLabel("Search composition sources").fill("no-matching-source");
      await expect(manager.getByRole("status")).toContainText("No sources match");
      await expect(manager.getByLabel("Selected composition source")).toBeDisabled();
      await expectNoHorizontalOverflow(page, `Empty composition source manager ${theme} ${width}`);
      await manager.getByLabel("Search composition sources").fill("");
    }
  }
  await manager.getByRole("button", { name: "Edit selected source" }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await expect(editor.getByLabel("Content key")).toHaveValue(key);
  for (const value of ["QA first edited introduction.", "QA second edited introduction."]) {
    await editor.getByLabel("Reader phrase · You", { exact: true }).fill(value);
    await editor.getByRole("button", { name: /^Save(?: draft)?$/ }).click();
    await expect(editor.getByRole("button", { name: /^Save(?: draft)?$/ })).toBeDisabled();
  }
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await expect(manager).toContainText("QA second edited introduction.");
  expect(writes).toHaveLength(2);
  await assertNoBrowserErrors();
});


test("composition map loads a package-only hook before opening its editable starter", async ({ page }) => {
  const key = "fallback-hook/natal-you-placement-sign-final/uranus/scorpio";
  const record = servingPackageRecords.get(key)!;
  await seedAdminApi(page, { generatedRows: [], compositionCatalog: [{ content_key: key, headline: "Uranus in Scorpio", role: "fallback_hook" }] });
  await page.route("**/api/admin/generated-content?**", async (route) => {
    if (!new URL(route.request().url()).searchParams.getAll("contentKeys").includes(key)) return route.fallback();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, rows: [{
      ...generatedContentRows[0], id: `package:${key}`, content_key: key, headline: "Uranus in Scorpio", body: record.body_you ?? record.body,
      surface: "you", status: "DRAFT", lane: "reference", review_state: "needs-review", provider: "tldrastro-fallback-architecture-v3",
      sections: { packageRecord: record }, source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3" }, facts: { fallbackArchitectureV3: true },
      inventory_only: false, package_starter: true
    }] }) });
  });
  await expectAdminRouteLoads(page, "/admin/content#composition-map");
  await page.getByLabel("Search surfaces and systems").fill("natal placement detail");
  const manager = page.getByRole("region", { name: "Manage composition sources" });
  await expect(manager).toContainText("Your freedom comes from knowing what has power over you well enough to choose differently.");
  await manager.getByRole("button", { name: "Edit selected source" }).click();
  await expect(page.getByRole("dialog", { name: "Generated content editor" }).getByLabel("Content key")).toHaveValue(key);
});

test("Chiron transit recovers stale save versions and keeps conflicting edits visible", async ({ page }) => {
  const copy = JSON.parse(readFileSync("docs/content-management/owner-copy/chiron-jupiter-hard-2026-09-07.json", "utf8"));
  const original = JSON.parse(readFileSync("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json", "utf8")).authoredCards.find((row: any) => row.contentKey === copy.contentKey);
  const row = { ...generatedContentRows[0], id: "qa-chiron-repeat-save", content_key: copy.contentKey,
    headline: "Chiron Hard your Jupiter", summary: "", body: original.body_you, surface: "you", mode: "feed",
    status: "LIVE", lane: "serving", review_state: null, provider: "tldrastro-fallback-architecture-v3",
    facts: { fallbackArchitectureV3: true }, source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3" },
    sections: { packageRecord: original, body_you: original.body_you, body_they: original.body_they } };
  const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
  await seedAdminApi(page, { generatedRows: [row], onGeneratedContentWrite: write => writes.push(write) });
  await expectAdminRouteLoads(page, "/admin/content#exact-content");
  await page.locator(".admin-content-row").getByRole("button", { name: "Edit", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await editor.getByLabel("You view copy", { exact: true }).fill(copy.body_you);
  await editor.getByLabel("Friend view copy", { exact: true }).fill(copy.body_they);
  let rejectNext = true;
  let competingCopy = false;
  await page.route("**/api/admin/generated-content**", async route => {
    if (route.request().method() === "PATCH" && rejectNext) {
      rejectNext = false;
      await route.fulfill({ status: 409, json: { error: "This content changed after the editor was opened." } });
    } else if (route.request().method() === "GET" && new URL(route.request().url()).searchParams.get("id") === row.id) {
      const latest = { ...row, updated_at: "2026-09-07T14:19:16.750192+00:00" };
      if (competingCopy) latest.sections = { ...row.sections, packageRecord: { ...original, body_you: "A competing saved revision." } };
      await route.fulfill({ json: { ok: true, rows: [latest] } });
    } else await route.fallback();
  });
  await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect(editor.locator(".admin-editor-savebar")).toContainText("All changes saved");
  expect(writes).toHaveLength(2);
  expect(writes[1].payload.ownerAction).toBe("approve-package-revision");
  expect(writes[0].payload.expectedUpdatedAt).toBe("2026-09-07T14:19:16.750192+00:00");
  expect((writes[0].payload.sections as any).packageDraft.body_they).toBe(copy.body_they);
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.getByLabel("You view copy", { exact: true }).fill(copy.body_you + "\n");
  await editor.getByRole("button", { name: "Save & publish", exact: true }).click();
  await expect(editor.locator(".admin-editor-savebar")).toContainText("All changes saved");
  expect(writes).toHaveLength(4);
  expect(writes[3].payload.ownerAction).toBe("approve-package-revision");
  await expect(editor.getByText("Draft saved", { exact: true })).toHaveCount(0);
  const savedWriteCount = writes.length;
  rejectNext = true;
  competingCopy = true;
  await editor.getByLabel("You view copy", { exact: true }).fill(copy.body_you + "\n\n");
  await editor.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("Your edits are still here");
  expect(writes.length).toBe(savedWriteCount);
  await expect(editor.getByLabel("You view copy", { exact: true })).toHaveValue(copy.body_you + "\n\n");
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.getByRole("alert").scrollIntoViewIfNeeded();
  await expect(editor.getByRole("alert")).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`Calendar Live filters agree with reader status at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const { buildRows } = await import("../../scripts/seed-published-calendar-aspect-content-studio.mjs");
    const baseline = buildRows().find((row: any) => row.content_key === "sky.aspect.saturn.square.lilith");
    const live = { ...baseline, id: "qa-calendar-live", updated_at: now };
    const pending = { ...baseline, id: "qa-calendar-pending", updated_at: now, headline: "QA pending Calendar revision", sections: { ...baseline.sections, packageDraft: { ...baseline.sections.packageRecord, Body: "QA pending Calendar revision." } } };
    await seedAdminApi(page, { generatedRows: [live, pending] });
    await expectAdminRouteLoads(page, "/admin/content#exact-content?category=Calendar+Aspects");
    if (width <= 720) await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByText("Editorial filters", { exact: true }).click();
    const filters = page.getByRole("group", { name: "Reader status" });
    await expect(filters.getByRole("button", { name: "Live 1", exact: true })).toBeVisible();
    await expect(filters.getByRole("button", { name: "Inactive 1", exact: true })).toBeVisible();
    await filters.getByRole("button", { name: "Live 1", exact: true }).click();
    const rows = page.locator(".admin-content-row:visible");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Saturn Square Lilith");
    await expect(rows.first().locator(".admin-status:visible").filter({ hasText: /^Live$/ })).toBeVisible();
    await expect(rows.first().getByText("Not live", { exact: true })).toHaveCount(0);
    await filters.getByRole("button", { name: "Inactive 1", exact: true }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("QA pending Calendar revision");
    await expect(rows.first().locator(".admin-status:visible").filter({ hasText: /^Inactive$/ })).toBeVisible();
  });
}

test("Live filters keep unknown status separate and retry after refresh", async ({ page }) => {
  const { buildRows } = await import("../../scripts/seed-published-calendar-aspect-content-studio.mjs");
  const row = { ...buildRows().find((row: any) => row.content_key === "sky.aspect.saturn.square.lilith"), id: "qa-status-retry", updated_at: now };
  await seedAdminApi(page, { generatedRows: [row] });
  let omit = true;
  await page.route("**/api/admin/content-live-status", async (route) => {
    if (omit && route.request().postDataJSON().ids) await route.fulfill({ json: { ok: true, statuses: [] } });
    else await route.fallback();
  });
  await expectAdminRouteLoads(page, "/admin/content#exact-content?category=Calendar+Aspects");
  await page.getByText("Editorial filters", { exact: true }).click();
  await expect(page.getByText(/Status unavailable for 1 entries/)).toBeVisible();
  const filters = page.getByRole("group", { name: "Reader status" });
  await filters.getByRole("button", { name: "Inactive 0", exact: true }).click();
  await expect(page.locator(".admin-content-row:visible")).toHaveCount(0);
  omit = false;
  await page.getByRole("button", { name: "Refresh rows", exact: true }).click();
  await expect(filters.getByRole("button", { name: "Live 1", exact: true })).toBeVisible();
  await filters.getByRole("button", { name: "Live 1", exact: true }).click();
  await expect(page.locator(".admin-content-row:visible")).toHaveCount(1);
});


test("Natal Empty Houses opens exact sources and supports repeated edits and retirement", async ({ page }) => {
  const writes: Array<{method:string;payload:Record<string,unknown>}> = [];
  const key="fallback-hook/empty-house/base/1";
  const record=servingPackageRecords.get(key)!;
  const row={...generatedContentRows[0],id:"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",content_key:key,headline:"Empty first house introduction",body:record.body_you,
    status:"LIVE",lane:"serving",review_state:null,target_date:null,provider:"tldrastro-fallback-architecture-v3",event_type:"fallback-hook",block_type:"fallback_hook",
    facts:{fallbackArchitectureV3:true},source_snapshot:{sourcePackage:"tldrastro-fallback-architecture-v3"},sections:{packageRecord:record}};
  await seedAdminApi(page,{generatedRows:[row],onGeneratedContentWrite:write=>writes.push(write),compositionCatalog:[
    {content_key:"fallback-hook/empty-house/rising-ruler/gemini/mercury/10",headline:"Gemini rising ruler in tenth house",role:"fallback_hook"},
    {content_key:"fallback-vocab/empty-house-ruler-jurisdiction/10",headline:"Tenth house jurisdiction",role:"vocabulary"}
  ]});
  await expectAdminRouteLoads(page,"/admin/content#exact-content?category=Natal+Chart");
  await page.getByRole("button",{name:"Empty houses",exact:true}).click();
  const manager=page.getByRole("region",{name:"Manage composition sources"});
  await expect(manager.getByLabel("Empty house",{exact:true})).toBeVisible();
  await manager.getByLabel("Empty house cusp sign").selectOption("gemini");
  await manager.getByLabel("Empty house ruler house").selectOption("10");
  await expect(manager.getByLabel("Selected composition source")).toContainText("Gemini rising ruler in tenth house");
  await expect(manager.getByLabel("Selected composition source")).toContainText("Tenth house jurisdiction");
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await expectNoHorizontalOverflow(page,`Empty house manager ${width}`);
  }
  await manager.getByLabel("Selected composition source").selectOption(row.id);
  await manager.getByRole("button",{name:"Edit selected source"}).click();
  const editor=page.getByRole("dialog",{name:"Generated content editor"});
  for(const text of ["QA empty house first edit.","QA empty house second edit."]) {
    await editor.getByLabel("Reader phrase · You",{exact:true}).fill(text);
    await editor.getByRole("button",{name:/^Save(?: draft)?$/}).click();
    await expect(editor.getByRole("button",{name:/^Save(?: draft)?$/})).toBeDisabled();
  }
  expect(writes).toHaveLength(2);
  await editor.getByRole("button",{name:"Retire everywhere",exact:true}).click();
  await expect(editor.getByRole("button",{name:"Publish again",exact:true})).toBeVisible();
  await editor.getByRole("button",{name:"Close",exact:true}).click();
  await page.reload();
  await expect(manager.getByLabel("Empty house",{exact:true})).toBeVisible();
});


test("Sky placement filters select exact planet sign and motion independently of prose", async ({ page }) => {
  const make=(id:string,key:string,headline:string,motion:string)=>({...generatedContentRows[0],id,content_key:key,headline,body:"Sun in Virgo is mentioned here, but does not define this placement.",block_type:"sky_article",mode:"article",facts:{motion}});
  const target=make("qa-sky-exact","sky/article-template/sun/virgo","Templated article — arbitrary editorial title","direct");
  const mercury=make("qa-sky-rx","sky/placement/mercury/virgo/retrograde","Bespoke edition — Mercury","retrograde");
  const wrong=make("qa-sky-wrong","sky/article-edition/jupiter/leo","Bespoke edition — Jupiter Enters Leo","direct");
  await seedAdminApi(page,{generatedRows:[target,mercury,wrong]});
  await expectAdminRouteLoads(page,"/admin/content#sky-writeups");
  await page.getByLabel("Sky placement planet or point").selectOption("sun");
  await page.getByLabel("Sky placement zodiac sign").selectOption("virgo");
  await page.getByLabel("Sky write-up motion").selectOption("direct");
  await expect(page.locator(".admin-content-row")).toHaveCount(1);
  await expect(page.locator(".admin-content-row .admin-content-row-title")).toHaveText("Sun in Virgo · Direct");
  await page.getByLabel("Sky placement planet or point").selectOption("mercury");
  await page.getByLabel("Sky write-up motion").selectOption("retrograde");
  await expect(page.locator(".admin-content-row")).toHaveCount(1);
  await expect(page.locator(".admin-content-row .admin-content-row-title")).toHaveText("Mercury in Virgo · Retrograde");
  for(const theme of ["light","dark"]) for(const width of [1440,390]) {
    if (await page.locator('.admin-dashboard').getAttribute('data-studio-theme') !== theme) {
      await page.getByRole('button', {name: `Switch to ${theme} theme`}).click();
    }
    await page.setViewportSize({width,height:1000});
    await expectNoHorizontalOverflow(page,`Sky selectors ${theme} ${width}`);
    const filters = page.getByRole("region", { name: "Sky write-up filters" });
    await expect(filters.locator("label > span:not(.admin-select-shell)").first()).toHaveText("Planet or point");
    await expect(filters.locator("label > span:not(.admin-select-shell)").nth(1)).toHaveText("Zodiac sign");
    await expect(filters.locator("label > span:not(.admin-select-shell)").nth(2)).toHaveText("Motion");
    const typography = (element: Element) => {
      const style = getComputedStyle(element);
      return Object.fromEntries(["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "marginTop", "marginBottom", "textTransform", "textAlign"].map(key => [key, style[key as keyof CSSStyleDeclaration]]));
    };
    expect(await filters.locator("label > span:not(.admin-select-shell)").first().evaluate(typography)).toEqual(await filters.locator("label > span:not(.admin-select-shell)").nth(3).evaluate(typography));
    await page.getByLabel("Sky placement zodiac sign").selectOption("aries");
    await expect(page.locator(".admin-content-row")).toHaveCount(0);
    await expectNoHorizontalOverflow(page,`Empty Sky selectors ${theme} ${width}`);
    await page.getByLabel("Sky placement zodiac sign").selectOption("virgo");
  }
  await page.getByRole("button",{name:"Clear filters",exact:true}).click();
  await expect(page.getByLabel("Sky placement planet or point")).toHaveValue("all");
  await expect(page.getByLabel("Sky placement zodiac sign")).toHaveValue("all");
  await expect(page.locator(".admin-content-row")).toHaveCount(3);
});

for (const theme of ["light", "dark"]) for (const width of [1440, 390]) {
  test(`Sky approval failures stay visible in the editor ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    const row = { ...generatedContentRows[0], id: "qa-sky-approval", content_key: "sky.aspect.chiron.sextile.nodes.taurus.aquarius",
      headline: "Chiron sextile North Node", body: "Saved Sky approval fixture.", surface: "sky", mode: "feed",
      status: "DRAFT", event_type: "collective-aspect-card", block_type: "sky_aspect", review_state: "needs-review", judge_gate: "human-review",
      source_snapshot: { skyAspectVoiceLint: { score: 3, fails: 0 }, studioWritingCheck: { reviewPolicy: "owner-final-v1", contentKey: "sky.aspect.chiron.sextile.nodes.taurus.aquarius" } }, sections: {}, facts: {}, updated_at: now };
    const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
    await seedAdminApi(page, { generatedRows: [row], onGeneratedContentWrite: write => writes.push(write) });
    let outcome = "blocked";
    await page.route("**/api/admin/generated-content**", async route => {
      if (route.request().method() !== "PATCH" || route.request().postDataJSON().ownerAction !== "approve-and-schedule") return route.fallback();
      if (outcome === "blocked") return route.fulfill({ status: 500, json: { error: "Collective sky cards must use first-person plural (we/our/us). A passing editorial judge review is still required." } });
      return route.fulfill({ json: { ok: true, rows: [{ ...row, status: outcome === "approved" ? "LIVE" : "REVIEWED" }] } });
    });
    await expectAdminRouteLoads(page, "/admin/content#review-queue");
    await page.evaluate(value => document.documentElement.setAttribute("data-theme", value), theme);
    await page.locator(".admin-review-queue-rows .admin-content-row", { hasText: row.content_key }).getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await editor.getByRole("button", { name: "Mark reviewed", exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].payload.status).toBe("REVIEWED");
    const approve = editor.getByRole("button", { name: "Approve & schedule", exact: true });
    await approve.click();
    await expect(editor.getByRole("alert")).toContainText("first-person plural");
    await editor.getByRole("alert").scrollIntoViewIfNeeded();
    await expect(editor.getByRole("alert")).toBeVisible();
    await page.screenshot({ path: `test-results/sky-approval-error-${theme}-${width}.png` });
    await expectNoHorizontalOverflow(page, "Sky approval error");
    outcome = "unconfirmed";
    await approve.click();
    await expect(editor.getByRole("alert")).toContainText("Approval was not confirmed");
    outcome = "approved";
    await approve.click();
    await expect(editor.getByRole("alert")).toHaveCount(0);
    await expect(editor.getByLabel("Full passage / body", { exact: true })).toHaveValue(row.body);
  });
}

test("reopening a saved aspect fetches the current copy and version before another edit", async ({ page }) => {
  let saved = { ...generatedContentRows[0], id: "qa-reopen-aspect", content_key: "sky.aspect.sun.trine.lilith",
    headline: "Sun Trine Lilith", body: "First saved passage.", surface: "sky", mode: "feed", status: "DRAFT",
    event_type: "collective-aspect-card", block_type: "sky_aspect", review_state: "needs-review",
    source_snapshot: {}, sections: {}, facts: {}, updated_at: "2026-09-10T07:06:54.000001+00:00" };
  await seedAdminApi(page, { generatedRows: [saved] });
  let reads = 0;
  let writtenVersion: string | undefined;
  await page.route("**/api/admin/generated-content**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === "GET" && url.searchParams.get("id") === saved.id) {
      reads += 1;
      return route.fulfill({ json: { ok: true, rows: [saved] } });
    }
    if (req.method() === "PATCH") {
      const input = req.postDataJSON();
      writtenVersion = input.expectedUpdatedAt;
      if (writtenVersion !== saved.updated_at) return route.fulfill({ status: 409, json: { error: "Stale version" } });
      saved = { ...saved, body: input.body, status: input.status, review_state: input.reviewState, updated_at: "2026-09-10T07:08:00.000003+00:00" };
      return route.fulfill({ json: { ok: true, rows: [saved] } });
    }
    return route.fallback();
  });
  await expectAdminRouteLoads(page, "/admin/content#review-queue?view=all");
  const open = page.locator(".admin-review-queue-rows .admin-content-row", { hasText: saved.content_key }).getByRole("button", { name: "Edit", exact: true });
  await open.click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await expect(editor.getByLabel("Full passage / body", { exact: true })).toHaveValue("First saved passage.");
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  saved = { ...saved, body: "Published in another tab.", updated_at: "2026-09-10T07:06:57.684208+00:00" };
  await open.click();
  await expect(editor.getByLabel("Full passage / body", { exact: true })).toHaveValue(saved.body);
  expect(reads).toBe(2);
  await editor.getByLabel("Full passage / body", { exact: true }).fill("Owner's next exact revision.");
  await editor.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await expect.poll(() => saved.body).toBe("Owner's next exact revision.");
  expect(writtenVersion).toBe("2026-09-10T07:06:57.684208+00:00");
  await expect(editor.getByRole("alert")).toHaveCount(0);
});

for (const pair of ["sun-chiron", "moon-chiron"]) for (const width of [390, 1440]) for (const theme of ["light", "dark"]) test(`review queue preserves ${pair} source identity and saved review status ${theme} ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const row = { ...generatedContentRows[0], id: `qa-source-${pair}`, content_key: `source/sky-aspect-pair/${pair}`,
    headline: pair, body: "Exact source passage retained during editorial review.", surface: "sky", mode: "feed",
    status: "DRAFT", event_type: "sky-aspect-pair-source", block_type: "fallback_hook", lane: "reference",
    provider: "owner-resource-review", review_state: "owner-review-required", facts: {}, sections: {},
    source_snapshot: { sourceType: "owner-resource-review", content_role: "fallback_source", review_status: "needs_review" }, updated_at: now };
  const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
  const assertNoBrowserErrors = watchBrowserErrors(page);
  await seedAdminApi(page, { generatedRows: [row], reviewRows: [{ ...reviewRecordRows[0], id: row.id, contentKey: row.content_key, status: "DRAFT" }],
    onGeneratedContentWrite: write => writes.push(write) });
  // Production's editorial inventory excludes reference sources, even though
  // review-records still lists them. A fresh queue must load their saved rows.
  await page.route("**/api/admin/generated-content?**", route => new URL(route.request().url()).searchParams.get("visibility") === "editorial"
    ? route.fulfill({ json: { ok: true, rows: [] } }) : route.fallback());
  await expectAdminRouteLoads(page, "/admin/content#review-queue?view=sources");
  await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
  const queueRow = page.locator(".admin-review-queue-rows .admin-content-row", { hasText: row.content_key });
  await queueRow.getByRole("button", { name: "Edit", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await expect(editor.getByRole("button", { name: "Publish to app", exact: true })).toHaveCount(0);
  await expect(editor.getByText("Source material cannot be published.")).toBeVisible();
  await editor.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].payload).toMatchObject({ status: "REVIEWED", lane: "reference", body: row.body, eventType: row.event_type,
    sourceSnapshot: { content_role: "fallback_source", review_status: "reviewed", sourceType: "owner-resource-review" } });
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await editor.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator(".admin-review-queue-groups").getByRole("button", { name: /Reviewed/ }).click();
  await expect(queueRow).toHaveCount(1);
  await queueRow.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Publish to app", exact: true })).toHaveCount(0);
  await expect(editor.getByLabel("Source text", { exact: true })).toHaveValue(row.body);
  await expect(editor.getByRole("button", { name: "Reviewed", exact: true })).toBeDisabled();
  await page.reload();
  await queueRow.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Reviewed", exact: true })).toBeDisabled();
  await expect(editor.getByLabel("Source text", { exact: true })).toHaveValue(row.body);
  await expectNoHorizontalOverflow(page, "Source review editor");
  await page.screenshot({ path: `test-results/review-queue-${pair}-${theme}-${width}.png` });
  assertNoBrowserErrors();
});

test("review queue publishes reader-ready hooks from the reference lane and confirms the response", async ({ page }) => {
  const row = { ...generatedContentRows[0], id: "qa-reader-hook", content_key: "fallback-hook/sky-sign-copy/sun/virgo",
    headline: "Reader-ready hook", body: "Exact reader passage.", surface: "sky", mode: "feed", status: "REVIEWED",
    event_type: "fallback-hook", block_type: "fallback_hook", lane: "reference", provider: "owner-resource-review",
    review_state: null, facts: {}, sections: {}, source_snapshot: { sourceType: "owner-resource-review", content_role: "fallback_hook", review_status: "reviewed" }, updated_at: now };
  const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
  const assertNoBrowserErrors = watchBrowserErrors(page);
  await seedAdminApi(page, { generatedRows: [row], reviewRows: [], onGeneratedContentWrite: write => writes.push(write) });
  let responseOverride: Record<string, unknown> | null = row;
  await page.route("**/api/admin/generated-content**", async route => {
    if (route.request().method() !== "PATCH" || !responseOverride) return route.fallback();
    return route.fulfill({ json: { ok: true, rows: [responseOverride] } });
  });
  await expectAdminRouteLoads(page, "/admin/content#review-queue");
  await page.locator(".admin-review-queue-rows .admin-content-row", { hasText: row.content_key }).getByRole("button", { name: "Edit", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await editor.getByRole("button", { name: "Publish to app", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("did not return the saved row");
  for (const invalid of [
    { ...row, status: "LIVE", lane: "serving", id: "wrong-row" },
    { ...row, status: "LIVE", lane: "reference" },
    { ...row, status: "LIVE", lane: "serving", review_state: "owner-review-required" },
    { ...row, status: "LIVE", lane: "serving", body: "Wrong saved passage." }
  ]) {
    responseOverride = invalid;
    await editor.getByRole("button", { name: "Publish to app", exact: true }).click();
    await expect(editor.getByRole("alert")).toContainText("did not return the saved row");
  }
  responseOverride = null;
  await editor.getByRole("button", { name: "Publish to app", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].payload).toMatchObject({ status: "LIVE", lane: "serving", reviewState: null, body: row.body,
    sourceSnapshot: { content_role: "fallback_hook", review_status: "approved" } });
  await expect(editor.getByRole("alert")).toHaveCount(0);
  assertNoBrowserErrors();
});

test("review queue retains exact edits after a conflict or unconfirmed review and supports retry", async ({ page }) => {
  const row = { ...generatedContentRows[0], id: "qa-source-retry", content_key: "source/sky-aspect-pair/sun-chiron",
    headline: "Sun–Chiron", body: "Initial source passage.", surface: "sky", mode: "feed", status: "DRAFT",
    event_type: "sky-aspect-pair-source", block_type: "fallback_hook", lane: "reference", provider: "owner-resource-review",
    review_state: "owner-review-required", facts: {}, sections: {},
    source_snapshot: { sourceType: "owner-resource-review", content_role: "fallback_hook", review_status: "needs_review" }, updated_at: now };
  const writes: Array<{ method: string; payload: Record<string, unknown> }> = [];
  const assertNoBrowserErrors = watchBrowserErrors(page);
  await seedAdminApi(page, { generatedRows: [row], reviewRows: [], onGeneratedContentWrite: write => writes.push(write) });
  let outcome = "conflict";
  await page.route("**/api/admin/generated-content**", async route => {
    if (route.request().method() !== "PATCH" || outcome === "saved") return route.fallback();
    if (outcome === "conflict") return route.fulfill({ status: 409, json: { error: "This content changed after the editor was opened." } });
    return route.fulfill({ json: { ok: true, rows: [{ ...row, status: "REVIEWED" }] } });
  });
  await expectAdminRouteLoads(page, "/admin/content#review-queue?view=sources");
  await page.locator(".admin-review-queue-rows .admin-content-row", { hasText: row.content_key }).getByRole("button", { name: "Edit", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  const exactEdit = "The complete replacement source passage, with its final sentence preserved.";
  await editor.getByLabel("Source text", { exact: true }).fill(exactEdit);
  await editor.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("changed after the editor was opened");
  await expect(editor.getByLabel("Source text", { exact: true })).toHaveValue(exactEdit);
  outcome = "unconfirmed";
  await editor.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("did not return the saved row");
  await expect(editor.getByLabel("Source text", { exact: true })).toHaveValue(exactEdit);
  outcome = "saved";
  await editor.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].payload).toMatchObject({ status: "REVIEWED", body: exactEdit, lane: "reference",
    sourceSnapshot: { content_role: "fallback_source", review_status: "reviewed" } });
  await expect(editor.getByRole("button", { name: "Reviewed", exact: true })).toBeDisabled();
  await expect(editor.getByRole("alert")).toHaveCount(0);
  assertNoBrowserErrors();
});

test("reopening a completed revision follows its published target", async ({ page }) => {
  const revision = { ...generatedContentRows[0], id: "qa-completed-revision", content_key: "sky.aspect.sun.trine.lilith",
    headline: "Sun Trine Lilith", body: "Cached draft copy.", status: "DRAFT", lane: "reference",
    event_type: "collective-aspect-card", block_type: "sky_aspect",
    review_state: "owner-review-required", source_snapshot: {}, sections: {}, updated_at: now };
  await seedAdminApi(page, { generatedRows: [revision] });
  await page.route("**/api/admin/generated-content?**", async route => {
    const id = new URL(route.request().url()).searchParams.get("id");
    if (id === revision.id) return route.fulfill({ json: { ok: true, rows: [{ ...revision, status: "ARCHIVED",
      review_state: "published-revision", source_snapshot: { targetRowId: "qa-published-target" } }] } });
    if (id === "qa-published-target") return route.fulfill({ json: { ok: true, rows: [{ ...revision,
      id, status: "LIVE", lane: "serving", review_state: null, body: "Current published passage." }] } });
    return route.fallback();
  });
  await expectAdminRouteLoads(page, "/admin/content#review-queue?view=all");
  await page.locator(".admin-review-queue-rows .admin-content-row", { hasText: revision.content_key }).getByRole("button", { name: "Edit", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Generated content editor" });
  await expect(editor.getByLabel("Full passage / body", { exact: true })).toHaveValue("Current published passage.");
  await expect(editor.getByRole("button", { name: "Restore as draft", exact: true })).toHaveCount(0);
});

for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`Imported article keeps drafting notes outside reader copy ${theme} ${width}`, async ({page,baseURL}) => {
    test.skip(!baseURL || !['localhost','127.0.0.1'].includes(new URL(baseURL).hostname), 'Isolated local storage only.');
    await page.setViewportSize({width,height:1000});
    const body='# Sun Enters Aries\n\nThe complete opening remains here.\n\nThe complete final paragraph remains here.';
    const notes='Drafting notes: synthetic batch context.\nneeds_review was the old document label.';
    const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const passages=signs.map((sign,index)=>({risingSign:sign.toLowerCase(),house:(12-index)%12+1,heading:`### ${sign} & ${sign} Rising`,body:`${sign} complete opening.\n\n${sign} complete ending.`}));
    const sections={articleHoroscopes:{schema:'sky-article-horoscopes-v1',heading:'## Horoscopes for the Sun in Aries',introduction:'',passages}};
    const writes: {method:string;payload:Record<string,unknown>}[]=[];
    const row={...generatedContentRows[0],id:'qa-separated-article',content_key:'sky/article-template/sun/aries',
      headline:'Sun Enters Aries',body,summary:'',status:'REVIEWED',lane:'reference',review_state:null,
      event_type:'sky-article-template',block_type:'sky_article',mode:'article',sections,facts:{},
      source_snapshot:{sourceType:'owner-resource-review',contentType:'sky-article-template',importSummary:notes},target_date:null,provider:'owner-resource-review'};
    await seedAdminApi(page,{generatedRows:[row],reviewRows:[],onGeneratedContentWrite:write=>writes.push(write)});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    await expectAdminRouteLoads(page,'/admin/content#review-queue?view=all');
    await page.getByRole('row').filter({hasText:row.content_key}).getByRole('button',{name:'Edit',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    await expect(editor.locator('.admin-copy-field-body')).toHaveValue(body);
    await expect(editor.getByRole('heading',{name:'Edit Sun Enters Aries',exact:true})).toBeVisible();
    const detail=editor.locator('details').filter({has:page.getByText('Original import notes',{exact:true})});
    await expect(detail).not.toHaveAttribute('open');
    await detail.locator('summary').click();
    await expect(detail).toContainText(notes);
    await expect(editor.locator('.admin-copy-field-body')).toHaveValue(body);
    await expect(editor.getByLabel('aries rising horoscope',{exact:true})).toHaveValue(passages[0].body);
    await expect(editor.getByLabel('pisces rising horoscope',{exact:true})).toHaveValue(passages[11].body);
    await expect(editor.getByLabel(/rising horoscope$/)).toHaveCount(12);
    const headings=await editor.locator('h2,h3').allTextContents();
    expect(headings.indexOf('Sun Enters Aries')>=0 || headings.some(h=>h.includes('Edit Sun Enters Aries'))).toBeTruthy();
    const styles=await editor.evaluate(root=>{
      const style=(selector:string)=>{const s=getComputedStyle(root.querySelector(selector)!);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing]};
      return {body:style('.admin-copy-field-body'),horoscope:style('[aria-label="aries rising horoscope"]')};
    });
    expect(styles.horoscope).toEqual(styles.body);
    const revised='Revised complete opening.\n\nRevised complete ending.';
    await editor.getByLabel('aries rising horoscope',{exact:true}).fill('');
    await expect(editor.getByLabel('pisces rising horoscope',{exact:true})).toHaveValue(passages[11].body);
    await editor.getByLabel('aries rising horoscope',{exact:true}).fill(revised);
    await editor.getByRole('button',{name:'Save',exact:true}).click();
    await expect.poll(()=>writes.length).toBe(1);
    expect(writes[0].payload.body).toBe(body);
    const savedSections=writes[0].payload.sections as typeof sections;
    expect(savedSections.articleHoroscopes.passages[0].body).toBe(revised);
    expect(savedSections.articleHoroscopes.passages.slice(1)).toEqual(passages.slice(1));
    await editor.getByRole('button',{name:'Close',exact:true}).click();
    await page.getByRole('row').filter({hasText:row.content_key}).getByRole('button',{name:'Edit',exact:true}).click();
    await expect(editor.getByLabel('aries rising horoscope',{exact:true})).toHaveValue(revised);
    await expect(editor.locator('.admin-copy-field-body')).toHaveValue(body);
    await editor.getByLabel('aries rising horoscope',{exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:test.info().outputPath(`imported-horoscopes-${theme}-${width}.png`)});
    await expectNoHorizontalOverflow(page,`Separated article ${theme} ${width}`);
  });
}

for (const contentKey of ['sky/article-template/nodes','sky/article-template/uranus/ingress']) for (const theme of ['light','dark']) for (const width of [1440,390]) {
  test(`Imported generic horoscope fields ${contentKey} ${theme} ${width}`, async ({page,baseURL})=>{
    test.skip(!baseURL || !['localhost','127.0.0.1'].includes(new URL(baseURL).hostname),'Isolated local storage only.');
    await page.setViewportSize({width,height:1000});
    const row={...generatedContentRows[0],id:'qa-generic-horoscopes',content_key:contentKey,headline:'Generic article',body:'Full article opening. Full article ending.',summary:'',status:'DRAFT',lane:'reference',review_state:null,event_type:'sky-article-template',block_type:'sky_article',mode:'article',facts:{},target_date:null,
      sections:{articleHoroscopes:{schema:'sky-article-horoscopes-v1',heading:'## Horoscopes',introduction:'Read your rising sign.\n\n{{risingBlocks}}',passages:[]}},source_snapshot:{sourceType:'owner-resource-review',contentType:'sky-article-template'}};
    await seedAdminApi(page,{generatedRows:[row],reviewRows:[]});
    await page.addInitScript(value=>localStorage.setItem('tldrastro:studio-theme',value),theme);
    await expectAdminRouteLoads(page,'/admin/content#review-queue?view=all');
    await page.getByRole('row').filter({hasText:contentKey}).getByRole('button',{name:'Edit',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    await expect(editor.getByLabel('Horoscope introduction',{exact:true})).toHaveValue(row.sections.articleHoroscopes.introduction);
    await editor.getByLabel('Horoscope introduction',{exact:true}).fill('');
    await editor.getByLabel('Horoscope introduction',{exact:true}).fill(row.sections.articleHoroscopes.introduction);
    await expect(editor.locator('.admin-copy-field-body')).toHaveValue(row.body);
    await expectNoHorizontalOverflow(page,`Generic horoscope ${theme} ${width}`);
  });
}

test('Aspect Patterns authenticates reads and previews and preserves newer drafts through the actual handler', async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  test.skip(!baseURL || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname), 'Isolated local storage only.');
  const { Readable } = await import('node:stream');
  const { default: handler } = await import('../../api/admin/aspect-pattern-writeups');
  const env = { CONTENT_GENERATION_SECRET: 'qa-secret', SUPABASE_URL: 'https://aspect-browser.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const originalFetch = globalThis.fetch;
  let row: Record<string, any> | null = null;
  let saves = 0;
  const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    expect(url.origin).toBe(env.SUPABASE_URL);
    if (init.method === 'POST') {
      if (row) return Response.json({ code: '23505' }, { status: 409 });
      row = { ...JSON.parse(String(init.body)), id }; saves++; return Response.json([row]);
    }
    if (init.method === 'PATCH') {
      if (!row || url.searchParams.get('updated_at') !== `eq.${row.updated_at}`) return Response.json([]);
      row = { ...row, ...JSON.parse(String(init.body)) }; saves++; return Response.json([row]);
    }
    return Response.json(row ? [row] : []);
  };
  try {
    await seedAdminApi(page, { expectedSecret: 'qa-secret' });
    await page.route('**/api/admin/aspect-pattern-writeups**', async route => {
      const request = route.request();
      const req = Object.assign(Readable.from(request.postData() ? [request.postData()!] : []), {
        method: request.method(), url: request.url(), headers: request.headers()
      });
      const res = { statusCode: 0, headers: {} as Record<string, string>, body: '', setHeader(key: string, value: string) { this.headers[key] = value; }, end(value: string) { this.body = value; } };
      await handler(req as any, res as any);
      await route.fulfill({ status: res.statusCode, headers: res.headers, body: res.body });
    });
    await page.goto('/admin/content#content/aspect-patterns');
    const editor = page.getByRole('region', { name: 'Aspect pattern write-up editor', exact: true });
    await expect(editor).toBeVisible();
    const overview = editor.getByRole('textbox', { name: 'Overview', exact: true });
    const copy = 'QA complete first paragraph.\n\nQA final sentence. ';
    await overview.fill(copy);
    await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect.poll(() => saves).toBe(1);
    await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
    await overview.fill(`${copy}Second edit.`);
    await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect.poll(() => saves).toBe(2);
    await expect(editor.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
    expect(row!.source_snapshot.record.content.overview).toBe(`${copy}Second edit.`);
    row!.updated_at = '2099-01-01T00:00:00.123456Z';
    row!.source_snapshot.record.content.overview = 'QA newer draft from another editor.';
    await overview.fill('QA stale browser edit.');
    await editor.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('changed after it was opened');
    expect(saves).toBe(2);
    expect(row!.source_snapshot.record.content.overview).toBe('QA newer draft from another editor.');
    await expect(overview).toHaveValue('QA stale browser edit.');
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(overview).toHaveValue('QA newer draft from another editor.');
  } finally {
    await page.unroute('**/api/admin/aspect-pattern-writeups**').catch(() => {});
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

// Verify the shared workspace contract in the real Studio with isolated API fixtures.
for (const theme of ["dark", "light"] as const) {
  for (const width of [1440, 390]) {
    test(`Studio workspace rhythm ${theme} ${width}`, async ({ page }) => {
      const assertNoBrowserErrors = await expectNoBrowserErrors(page);
      await page.setViewportSize({ width, height: 1000 });
      await seedAdminApi(page);
      await page.addInitScript((value) => localStorage.setItem("tldrastro:studio-theme", value), theme);
      await expectAdminRouteLoads(page, "/admin/content#exact-content");
      const dashboard = page.locator(".admin-dashboard");
      await expect(dashboard).toHaveAttribute("data-studio-theme", theme);
      await expect(page.locator(".admin-dashboard-header h1")).toHaveText("Content Library");
      await expect(page.locator(".admin-library-workspace h2")).toHaveCount(0);
      await expect(page.locator(".admin-library-guide[open]")).toHaveCount(0);
      const metrics = await page.locator(".admin-dashboard-header h1").evaluate((e) => {
        const s = getComputedStyle(e);
        return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight, leading: s.lineHeight, tracking: s.letterSpacing };
      });
      expect(metrics.family).toContain("system-ui");
      expect(metrics.size).toBe("22px");
      expect(metrics.weight).toBe("500");
      expect(metrics.leading).toBe("28px");
      expect(metrics.tracking).toBe("normal");
      const searchField = page.getByRole('searchbox', { name: 'Search content', exact: true });
      expect((await searchField.locator('..').boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const searchGeometry = await searchField.evaluate(input => {
        const icon = input.parentElement!.querySelector('svg')!;
        const inputBox = input.getBoundingClientRect();
        const iconBox = icon.getBoundingClientRect();
        return { inputLeft: inputBox.left, iconRight: iconBox.right };
      });
      expect(searchGeometry.inputLeft - searchGeometry.iconRight).toBeGreaterThanOrEqual(8);
      await expect(page.getByRole('group', {name:'Content Library saved views'}).getByRole('button', {name:'Editorial content',exact:true})).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('button', {name:'Create',exact:true})).toHaveCSS('font-size', '14px');

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width > 860) {
        await expect(page.locator(".admin-content-row").first()).toBeInViewport({ ratio: 1 });
        await expect(page.locator(".admin-sidebar-status")).toBeInViewport();
        await expect(page.getByRole("button", { name: "Daily Sky Summary", exact: true })).toBeHidden();
      }
      await mkdir("outputs/studio-style", { recursive: true });
      await page.screenshot({ path: `outputs/studio-style/library-${theme}-${width}.png` });
      await page.getByLabel("Search content", { exact: true }).fill("no matching row in this fixture");
      await expect(page.locator(".admin-content-row")).toHaveCount(0);
      await page.screenshot({ path: `outputs/studio-style/empty-${theme}-${width}.png` });
      await page.getByLabel("Search content", { exact: true }).fill("sky.placement.sun.cancer");
      const row = page.locator(".admin-content-row", { hasText: "sky.placement.sun.cancer" });
      await expect(row).toHaveCount(1);
      await row.getByRole("button", { name: "Edit", exact: true }).click();
      const editor = page.locator(".admin-editor-panel");
      await expect(editor.getByRole("heading", { name: "Edit Sun in Cancer" })).toBeVisible();
      await expect(page.getByRole('button', {name:'Close editor',exact:true})).toHaveCSS('border-radius', '0px');
      await expect(editor.getByRole('heading', {name:'Edit Sun in Cancer'})).toHaveCSS('font-family', metrics.family);
      await expect(editor.getByRole('heading', {name:'Edit Sun in Cancer'})).toHaveCSS('line-height', '28px');
      const fieldStyles = await editor.locator('textarea').first().evaluate(element => {
        const s = getComputedStyle(element);
        return {size:s.fontSize, weight:s.fontWeight, leading:s.lineHeight, tracking:s.letterSpacing};
      });
      expect(fieldStyles).toEqual({size:'16px', weight:'400', leading:'24px', tracking:'normal'});
      await expect(editor.locator('.admin-title-field > span').first()).toHaveCSS('font-size', '14px');
      await expect(editor.locator('.admin-title-field > span').first()).toHaveCSS('font-weight', '400');

      await expectFormShellDoesNotOverlap(editor, `${theme} ${width} editor`);
      expect(await editor.getByRole('heading', {name: 'Edit Sun in Cancer'}).evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
      }), 'Editor title must not be covered by navigation').toBe(true);
      await expect(editor.locator("textarea").first()).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await page.screenshot({ path: `outputs/studio-style/editor-${theme}-${width}.png` });
      await assertNoBrowserErrors();
    });
  }
}

test("Studio theme persists and contextual navigation stays reachable", async ({ page }) => {
  await seedAdminApi(page);
  await expectAdminRouteLoads(page, "/admin/content#exact-content");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator(".admin-dashboard")).toHaveAttribute("data-studio-theme", "light");
  await page.reload();
  await expect(page.locator(".admin-dashboard")).toHaveAttribute("data-studio-theme", "light");
  await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Sky Write-ups", exact: true }).click();
  await page.getByRole("button", { name: "Daily Sky Summary", exact: true }).click();
  await expect(page).toHaveURL(/view=daily-summary/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open Content Studio navigation" }).click();
  const nav = page.getByRole("navigation", { name: "Content operations" });
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: "Content Library", exact: true }).click();
  await expect(page.locator(".admin-dashboard-header h1")).toHaveText("Content Library");
  await expect(nav).toBeHidden();
});

for (const theme of ['light', 'dark'] as const) for (const width of [1440, 390]) {
  test(`Daily summary containers preserve layout and controls ${theme} ${width}`, async ({ page }) => {
    await seedAdminApi(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await expectAdminRouteLoads(page, '/admin/content#sky-writeups?view=daily-summary');
    const assembly = page.getByRole('region', { name: 'Full summary assembly', exact: true });
    const composition = page.getByRole('region', { name: 'Sun and Moon composition map', exact: true });
    for (const card of [assembly, composition]) {
      await expect(card).toHaveCSS('padding', '24px 0px 0px');
      await expect(card).toHaveCSS('border-radius', '0px');
      await expect(card).toHaveCSS('gap', '24px');
      await expect(card).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      const outsideChildren = await card.evaluate(element => {
        const parent = element.getBoundingClientRect();
        return Array.from(element.children).filter(child => {
          const rect = child.getBoundingClientRect();
          return rect.width && (rect.left < parent.left || rect.right > parent.right + 1);
        }).map(child => child.className);
      });
      expect(outsideChildren).toEqual([]);
      for (const preview of await card.locator('.admin-template-reader-surface').all()) {
        await expect(preview).toHaveCSS('padding', '16px');
        await expect(preview).toHaveCSS('border-top-width', '1px');
        await expect(preview).toHaveCSS('background-color', theme === 'light' ? 'rgb(239, 241, 239)' : 'rgb(25, 28, 27)');
      }
    }
    const a = (await assembly.boundingBox())!;
    const b = (await composition.boundingBox())!;
    expect(b.x).toBe(a.x);
    expect(b.width).toBe(a.width);
    expect(b.y - a.y - a.height).toBe(24);
    const controls = composition.locator('.admin-daily-glance-context-form > label');
    const first = (await controls.nth(0).boundingBox())!;
    const second = (await controls.nth(1).boundingBox())!;
    if (width > 720) expect(second.y).toBe(first.y);
    else expect(second.y).toBeGreaterThan(first.y + first.height);
    await composition.getByLabel('Composition Sun sign', { exact: true }).selectOption('Aries');
    await expect(composition.getByLabel('Combined Sun and Moon preview', { exact: true })).toContainText('Aries');
    await expect(assembly.getByRole('region', { name: 'Full summary preview' })).toContainText('Aries');
    await assembly.getByText('Preview event examples', { exact: true }).click();
    await assembly.getByLabel('Exact aspect examples', { exact: true }).fill('Example aspect');
    await expect(assembly.getByRole('region', { name: 'Full summary preview' })).toContainText('Example aspect');
    await assembly.getByText('Preview event examples', { exact: true }).click();
    const notification = page.getByRole('button', { name: 'Dismiss notification', exact: true });
    if (await notification.isVisible()) await notification.click();
    await assembly.screenshot({ path: `outputs/studio-style/summary-assembly-${theme}-${width}.png` });
    await composition.screenshot({ path: `outputs/studio-style/summary-composition-${theme}-${width}.png` });
    await page.getByLabel('Search summary wording', { exact: true }).fill('no-matching-summary-12345');
    await expect(page.getByText('No summary fields match this search.', { exact: true })).toBeVisible();
    await page.getByLabel('Search summary wording', { exact: true }).fill('');
    const row = page.locator('.admin-daily-glance-pair-list > article').first();
    await expect(row).toHaveCSS('padding', '24px');
    await expectNoHorizontalOverflow(page, 'Daily summary containers');
    await assertNoBrowserErrors();
  });
}

for (const theme of ['dark', 'light'] as const) for (const width of [1440, 390]) {
  test(`Composition spacing and narrative typography ${theme} ${width}`, async ({ page }) => {
    await seedAdminApi(page);
    await page.setViewportSize({width, height: 1000});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await expectAdminRouteLoads(page, '/admin/content#composition-map');
    await page.getByRole('tab', {name: /Template internals/}).click();
    const review = page.getByRole('button', {name: 'Show only templates that need IA review'});
    await expect(review).toHaveCSS('white-space', 'nowrap');
    await expect(review).toHaveCSS('height', '40px');
    const choices = page.locator('.admin-composition-template-items > button');
    await expect(choices.first()).toHaveCSS('justify-items', 'start');
    await expect(choices.first()).toHaveCSS('justify-content', 'stretch');
    const detail = page.getByRole('region', {name:'Selected template composition',exact:true});
    const heading = detail.locator(':scope > header h2');
    await expect(heading).toHaveCSS('font-size', '22px');
    await expect(heading).toHaveCSS('font-weight', '500');
    const assertHeaderWidth = async (selector: string) => {
      if (width > 720) return;
      const header = detail.locator(selector);
      const parent = await header.boundingBox();
      const copy = await header.locator(':scope > div').boundingBox();
      expect(parent).not.toBeNull();
      expect(copy).not.toBeNull();
      expect(Math.abs(copy!.width - parent!.width)).toBeLessThan(1);
    };
    await assertHeaderWidth(':scope > header');
    await assertHeaderWidth('.admin-composition-reader-preview > header');
    const assertNarrativeVariables = async (selector: string) => {
      await expect(page.locator(selector).first()).toBeVisible();
      const styles = await page.locator(selector).evaluateAll(elements => elements.map(element => {
        const own = getComputedStyle(element), parent = getComputedStyle(element.closest('p')!);
        return {font: own.fontFamily === parent.fontFamily, size:own.fontSize, leading:own.lineHeight, weight:own.fontWeight, tracking:own.letterSpacing};
      }));
      expect(styles.length).toBeGreaterThan(0);
      for (const style of styles) expect(style).toEqual({font:true,size:'16px',leading:'24px',weight:'400',tracking:'normal'});
    };
    await assertNarrativeVariables('.admin-composition-preview-copy p .admin-composition-variable');
    await expect(detail.locator('.admin-composition-preview-surface')).toHaveCSS('padding', '16px');
    await expect(detail.locator('.admin-composition-preview-surface')).toHaveCSS('border-top-width', '1px');
    const notification = page.getByRole('button', {name:'Dismiss notification',exact:true});
    if (await notification.isVisible()) await notification.click();
    await detail.screenshot({path:`outputs/studio-style/composition-preview-spacing-${theme}-${width}.png`});
    await page.getByRole('tab', {name:'Main template',exact:true}).click();
    await assertHeaderWidth('.admin-composition-template-workbench > header');
    const tokens = detail.locator('.admin-composition-template-tokens > div');
    await expect(tokens).toHaveCSS('gap','12px');
    await expect(detail.locator('.admin-composition-template-fields pre').first()).toHaveCSS('margin','0px');
    await expect(detail.getByRole('heading',{name:'Structure and fixed wording'})).toHaveCSS('font-size','16px');
    await detail.screenshot({path:`outputs/studio-style/composition-template-spacing-${theme}-${width}.png`});
    await page.getByRole('tab', {name:'Assembly',exact:true}).click();
    await expect(page.getByLabel('Selected template coverage')).toHaveCSS('gap','12px');
    for (const slot of await detail.locator('.admin-composition-slot').all()) {
      await expect(slot).toHaveCSS('padding','16px');
      await expect(slot).toHaveCSS('gap','8px');
      await expect(slot.locator('.admin-composition-runtime-source > span')).toHaveCSS('display','grid');
    }
    await detail.screenshot({path:`outputs/studio-style/composition-assembly-spacing-${theme}-${width}.png`});
    await expectNoHorizontalOverflow(page,'Composition workbench');
    await page.getByLabel('Search the composition map',{exact:true}).fill('no-template-matches-1234');
    await expect(page.getByText('No templates match',{exact:true})).toBeVisible();
    await expectNoHorizontalOverflow(page,'Composition empty state');
    await expectAdminRouteLoads(page,'/admin/content#sky-writeups?view=daily-summary');
    await assertNarrativeVariables('.admin-daily-glance-studio p .admin-composition-variable');
    await page.getByRole('region',{name:'Full summary assembly',exact:true}).screenshot({path:`outputs/studio-style/summary-type-spacing-${theme}-${width}.png`});
    await expectNoHorizontalOverflow(page,'Daily summary typography');
    await assertNoBrowserErrors();
  });
}

async function expectStudioTypography(page: Page, surface: string) {
  const unexpected = await page.locator('.admin-dashboard').evaluate(root => {
    const allowed = new Set(['12px', '14px', '16px', '22px']);
    return Array.from(root.querySelectorAll<HTMLElement>('*')).flatMap(element => {
      if (element.closest('svg, canvas, [aria-hidden="true"], .sr-only, .admin-brand-mark')) return [];
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return [];
      const style = getComputedStyle(element);
      if (style.clipPath !== 'none' || style.clip !== 'auto') return [];
      const text = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
      const control = element.matches('input, textarea, select');
      if (!control && (!text || !/[A-Za-z0-9]/.test(text))) return [];
      return allowed.has(style.fontSize) ? [] : [{ tag: element.tagName, class: element.className, size: style.fontSize, text: text.slice(0,70) }];
    });
  });
  expect(unexpected, `${surface}: readable text uses the Studio role scale`).toEqual([]);
}

type StudioTypeRole = 'body' | 'title' | 'section' | 'label' | 'meta';
const studioTypeProperties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;
async function expectStudioRole(page: Page, elements: Locator, role: StudioTypeRole, context: string) {
  await expect(elements.first(), context).toBeVisible();
  const expected = await page.locator('.admin-dashboard').evaluate((root, role) => {
    const tokens = {
      body: ['--font-body', '--text-body', '--weight-regular', '--leading-body'],
      title: ['--font-display', '--type-large-title-size', '--weight-medium', '--leading-title'],
      section: ['--font-display', '--type-section-heading-size', '--weight-semibold', '--leading-body'],
      label: ['--font-label', '--type-ui-size', '--weight-regular', '--leading-label'],
      meta: ['--font-label', '--type-meta-size', '--weight-regular', '--leading-meta']
    }[role];
    // Resolve canonical variables for expected values. Only the real component
    // elements below are assertions; this probe is not a replacement fixture.
    const probe = document.createElement('span');
    probe.style.cssText = `visibility:hidden;position:absolute;font-family:var(${tokens[0]});font-size:var(${tokens[1]});font-weight:var(${tokens[2]});line-height:var(${tokens[3]});letter-spacing:var(--tracking-body)`;
    root.append(probe);
    const css = getComputedStyle(probe);
    const value = [css.fontFamily, css.fontSize, css.fontWeight, css.lineHeight, css.letterSpacing];
    probe.remove();
    return value;
  }, role);
  const actual = await elements.evaluateAll((items, properties) => items.map(element => {
    const css = getComputedStyle(element);
    return properties.map(property => css[property]);
  }), [...studioTypeProperties]);
  for (const value of actual) expect(value, context).toEqual(expected);
}

test.describe('Content Dashboard shared text roles', () => {
  test.use({ serviceWorkers: 'block' });
  for (const theme of ['light', 'dark'] as const) for (const width of [1440, 390]) {
    test(`Studio shared prose roles ${theme} ${width}`, async ({ page }) => {
      const savedBody = 'Complete fixture opening.\n\nComplete fixture final paragraph.';
      const voiceRow = { ...generatedContentRows[0], id: 'qa-typography-voice', content_key: 'sky.placement.fixture.mars.aries',
        headline: 'Mars in Aries fixture', body: savedBody, block_type: 'sky_placement', status: 'DRAFT',
        judge_gate: 'human-review', judge_why: 'Complete fixture review explanation.', judge_score: 2,
        review_state: 'needs-review', facts: { planet: 'mars', sign: 'aries' }, source_snapshot: {}, lane: 'reference' };
      await page.setViewportSize({ width, height: 1000 });
      await page.route('**/api/**', route => route.fulfill({ json: { ok: true, rows: [], statuses: [], nextCursor: null } }));
      await seedAdminApi(page, { generatedRows: [...generatedContentRows, voiceRow] });
      await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);

      await expectAdminRouteLoads(page, '/admin/content#review-queue?view=all');
      const commandCopy = page.locator('.admin-review-queue-commandbar-copy > p:not(.admin-eyebrow)');
      await expect(commandCopy).toHaveText('Create writing, run checks, review, and publish. Source material has its own library.');
      await expectStudioRole(page, commandCopy, 'body', 'Review instructions are paragraphs');
      await expectStudioRole(page, page.locator('.admin-dashboard-header h1'), 'title', 'Page heading');
      await expectStudioRole(page, page.locator('.admin-review-queue-commandbar-copy > .admin-eyebrow'), 'meta', 'Eyebrow remains metadata');
      await expectStudioRole(page, page.getByRole('button', { name: 'Create', exact: true }), 'label', 'Action label');
      const tableRow = page.locator('.admin-review-queue-rows .admin-content-row', { hasText: 'sky.placement.sun.cancer' });
      await tableRow.getByRole('button', { name: /^Details/ }).click();
      const summary = page.getByRole('region', { name: 'Details for Sun in Cancer', exact: true }).locator('p.admin-review-preview');
      await expect(summary).toHaveText(generatedContentRows[0].summary);
      await expectStudioRole(page, summary, 'body', 'Expanded table summary does not inherit table label sizing');
      await tableRow.getByRole('button', { name: 'Edit', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Generated content editor', exact: true });
      await expectStudioRole(page, editor.getByRole('heading', { name: 'Edit Sun in Cancer', exact: true }), 'title', 'Modal heading');
      await expectStudioRole(page, editor.locator('.admin-editor-context-line'), 'meta', 'Editor context uses the shared metadata role');
      await expectStudioRole(page, editor.locator('.admin-title-field > span').first(), 'label', 'Modal field label');
      const body = editor.getByRole('textbox', { name: 'Article body', exact: true });
      await expect(body).toHaveValue(generatedContentRows[0].body);
      await expectStudioRole(page, body, 'body', 'Full passage editor');
      await expectStudioRole(page, editor.locator('.admin-title-field > small.admin-field-hint').first(), 'meta', 'Inline field hint remains metadata');
      await editor.locator('.admin-editor-details > summary').click();
      const paragraphHelp = editor.getByRole('region', { name: 'Article content system', exact: true }).locator('p.admin-field-hint');
      await expect(paragraphHelp).toHaveText('Published is a status. Authored, generated, and fallback are provenance systems; publication never changes one system into another.');
      await expectStudioRole(page, paragraphHelp, 'body', 'Explanatory paragraph overrides the field-hint metadata class');
      await expectNoHorizontalOverflow(page, 'Shared modal typography');
      await editor.getByRole('button', { name: 'Close', exact: true }).click();

      await page.getByRole('button', { name: /Sky voice: needs review/ }).click();
      const card = page.locator('.admin-sky-voice-card', { hasText: 'Mars in Aries fixture' });
      const voice = card.locator('p.admin-sky-voice-body');
      await expect(voice).toHaveText(savedBody);
      expect(await voice.evaluate(element => element.textContent)).toBe(savedBody);
      await expect(voice).toHaveCSS('white-space', 'pre-wrap');
      await expectStudioRole(page, voice, 'body', 'Saved voice passage paragraph');
      await expect(card.locator('.admin-sky-voice-judge p')).toHaveText([
        'Why Complete fixture review explanation.', 'Weakest No weakest beat recorded.'
      ]);
      await expectStudioRole(page, card.locator('.admin-sky-voice-judge p'), 'body', 'Nested review rationale');
      await expectStudioRole(page, card.locator('h3'), 'section', 'Card heading');
      await expectStudioRole(page, card.locator('dt'), 'label', 'Definition labels');
      await page.screenshot({ path: test.info().outputPath(`shared-voice-${theme}-${width}.png`) });

      await expectAdminRouteLoads(page, '/admin/content#fallback-hooks?section=daily');
      const guide = page.getByRole('region', { name: 'How daily content is assembled', exact: true });
      const descriptions = guide.locator('.admin-daily-hook-guide-grid > article > p:first-of-type');
      await expect(descriptions).toHaveCount(2);
      const guidance = JSON.parse(readFileSync(path.join(process.cwd(), 'apps/admin/public/generated/admin-fallback-hook-editor-guidance-v1.json'), 'utf8'));
      await expect(descriptions).toHaveText(guidance.workspaceGuide.surfaces.map((surface: { description: string }) => surface.description));
      await expectStudioRole(page, descriptions, 'body', 'Daily guide descriptions retain paragraph roles');
      await expectStudioRole(page, guide.getByRole('heading', { level: 3 }), 'section', 'Guide heading');
      await guide.locator('summary').click();
      await expectStudioRole(page, guide.locator('summary'), 'label', 'Disclosure label');
      await expectStudioRole(page, guide.locator('details > p'), 'body', 'Disclosure paragraph');

      await expectAdminRouteLoads(page, '/admin/content#composition-map');
      await page.getByRole('tab', { name: /Template internals/ }).click();
      const passages = page.locator('.admin-composition-preview-copy p .admin-composition-variable');
      await expectStudioRole(page, passages, 'body', 'Clickable inline passage keeps the paragraph typography');
      await expectStudioRole(page, page.locator('.admin-composition-preview-copy p'), 'body', 'Composition paragraphs');
      await expectNoHorizontalOverflow(page, 'Shared composition typography');

      const memoryBody = 'Complete memory fixture opening.\n\nComplete memory fixture ending.';
      const contextBody = 'Complete required context fixture opening.\n\nComplete required context fixture ending.';
      const memory = { id: 'fixture-memory', kind: 'note', status: 'current', title: 'Fixture memory', path: 'fixture.md', line: 1,
        sourceId: 'fixture-source', family: '', register: '', role: 'task-note', contentKey: '', bodySha256: 'a'.repeat(64) };
      await page.route('**/api/admin/memory-graph?**', route => {
        const query = new URL(route.request().url()).searchParams;
        const json = query.get('mode') === 'visual' ? { ok: true, documents: [], freshness: { checkedAt: now } }
          : query.get('mode') === 'detail' ? { ok: true, record: { ...memory, body: memoryBody, sourceUrl: null, sourceSha256: 'b'.repeat(64), metadata: {}, related: [], connections: [], requiredContext: [{ ...memory, id: 'fixture-context', title: 'Required fixture context', body: contextBody }] } }
            : { ok: true, records: [memory], sources: [], edges: [], total: 1, offset: 0, limit: 20, revision: 'fixture', counts: { note: 1 } };
        return route.fulfill({ json });
      });
      await page.goto('/admin/content/memory');
      await page.getByRole('textbox', { name: 'Search memories', exact: true }).fill('fixture');
      await page.getByRole('complementary', { name: 'Matching memories', exact: true }).getByRole('button', { name: 'Fixture memory', exact: true }).click();
      const memoryDetail = page.getByRole('complementary', { name: 'Memory detail', exact: true });
      const detailBody = memoryDetail.locator(':scope > p.memory-detail-content');
      await expect(detailBody).toHaveText(memoryBody);
      expect(await detailBody.evaluate(element => element.textContent)).toBe(memoryBody);
      await expectStudioRole(page, detailBody, 'body', 'Full memory text paragraph');
      await expect(memoryDetail.locator('h2')).toHaveText('Fixture memory');
      await memoryDetail.locator('.memory-provenance > summary').click();
      await memoryDetail.getByText('Required fixture context', { exact: true }).click();
      const required = memoryDetail.locator('.memory-provenance p.memory-detail-content');
      await expect(required).toHaveText(contextBody);
      await expectStudioRole(page, required, 'body', 'Required context paragraph');
      await expectNoHorizontalOverflow(page, 'Shared memory typography');
      await page.screenshot({ path: test.info().outputPath(`shared-memory-${theme}-${width}.png`) });
    });
  }
});

for (const theme of ['dark', 'light'] as const) {
  for (const width of [1440, 390]) {
    test(`Studio typography inventory ${theme} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await seedAdminApi(page);
      await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme',value), theme);
      const routes = [
        ...adminPages.map(item => item.hash),
        'exact-content?category=Natal+Chart', 'exact-content?category=Natal+Aspects',
        'exact-content?category=Calendar+Aspects', 'fallback-hooks?section=lunar-calendar',
        'templates', 'vocabulary', 'slots', 'source-drafts', 'users', 'report-fulfillment', 'connection', 'diagnostics/aspect-patterns', 'surface-map', 'content/aspect-patterns/activation'
      ];
      for (const route of routes) {
        await expectAdminRouteLoads(page, `/admin/content#${route}`);
        await expectStudioTypography(page, route);
        await expect(page.locator('.admin-dashboard-header h1')).toHaveCSS('font-size','22px');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
      }
      await expectAdminRouteLoads(page, '/admin/content#exact-content');
      await page.getByLabel('Search content', { exact: true }).fill('sky.placement.sun.cancer');
      await page.locator('.admin-content-row', { hasText: 'sky.placement.sun.cancer' }).getByRole('button', { name: 'Edit', exact: true }).click();
      await expect(page.locator('.admin-editor-panel')).toBeVisible();
      await expectStudioTypography(page, 'content editor');
      await expect(page.locator('.admin-editor-toolbar h2')).toHaveCSS('font-size','22px');
    });
  }
}

for (const width of [1440, 390]) {
  test(`Studio browse components preserve keyboard editing and details ${width}`, async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await page.setViewportSize({ width, height: 1000 });
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, '/admin/content#exact-content');
    const create = page.getByRole('button', { name: 'Create', exact: true });
    await create.click();
    const items = page.getByRole('menuitem');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(items.last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(create).toBeFocused();
    await expect(page.getByRole('menu')).toBeHidden();
    const search = page.getByLabel('Search content', { exact: true });
    if (width < 720) {
      await expect(page.getByLabel('Category', { exact: true })).toBeHidden();
      await page.getByRole('button', { name: 'Filters', exact: true }).click();
    }
    expect((await search.boundingBox())!.y).toBeLessThan((await page.getByLabel('Category', { exact: true }).boundingBox())!.y);
    if (width < 720) await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await search.fill('sky.placement.sun.cancer');
    const row = page.locator('.admin-content-row', { hasText: 'sky.placement.sun.cancer' });
    await expect(row).toHaveCount(1);
    await expect(row.locator('..').locator('.admin-content-expanded-body code')).toBeHidden();
    await row.getByRole('button', {name: /^Details/}).click();
    await expect(row.locator('..').locator('.admin-content-expanded-body code')).toBeVisible();
    await expect(page.locator('.admin-editor-panel')).toHaveCount(0);
    expect(await row.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.locator('.admin-browse-table').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.admin-editor-panel').getByRole('heading', { name: 'Edit Sun in Cancer' })).toBeVisible();
    await assertNoBrowserErrors();
  });
}


test('Studio tables keep titles and edit controls readable in narrow desktop panes', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await seedAdminApi(page);
  for (const theme of ['dark', 'light']) {
    for (const route of ['exact-content', 'articles', 'compatibility']) {
      await expectAdminRouteLoads(page, `/admin/content#${route}`);
      if (await page.locator('.admin-dashboard').getAttribute('data-studio-theme') !== theme) {
        await page.getByRole('button', {name: `Switch to ${theme} theme`}).click();
      }
      await expect(page.locator('.admin-dashboard')).toHaveAttribute('data-studio-theme', theme);
      const table = page.locator('.admin-browse-table').first();
      await expect(table).toBeVisible();
      const overflow = await table.locator('td, button').evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
      expect(overflow, `${theme} ${route} table cells fit their content`).toEqual([]);
      await expect(table.locator('.admin-content-row-title').first()).toHaveCSS('overflow', 'visible');
      await page.screenshot({path: `outputs/studio-style/tablet-${route}-${theme}.png`, fullPage: true});
    }
  }
});


for (const theme of ['dark', 'light']) {
  for (const width of [1440, 390]) {
    test(`Studio concise workspace copy ${theme} ${width}`, async ({ page }) => {
      await seedAdminApi(page);
      await page.setViewportSize({width, height: 1000});
      await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
      for (const route of ['exact-content?category=Natal+Chart', 'exact-content?category=Natal+Aspects', 'articles', 'compatibility', 'sky-writeups']) {
        await expectAdminRouteLoads(page, `/admin/content#${route}`);
        await expect(page.locator('.admin-dashboard-header h1')).toHaveCount(1);
        await expect(page.locator('.admin-page-heading > p')).toHaveCount(0);
        await expectStudioTypography(page, route);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (route.includes('Natal+')) {
          await expect(page.locator('.admin-content-library-toolbar')).toHaveCount(0);
          await expect(page.locator('.admin-natal-placement-selectors small')).toHaveCount(0);
          await expect(page.locator('.admin-natal-placement-finder .admin-eyebrow')).toHaveCount(0);
          await expect(page.locator('.admin-natal-placement-finder > h2')).toHaveClass('sr-only');
          await expect(page.locator('.admin-natal-placement-prompt')).toHaveCount(0);
        }
        if (route === 'articles' || route === 'compatibility') {
          await expect(page.locator('.admin-collection-toolbar h2, .admin-collection-toolbar .admin-eyebrow')).toHaveCount(0);
          const wide = await page.locator('.admin-collection-toolbar button').evaluateAll(buttons => buttons.filter(button => button.getBoundingClientRect().width > 250).map(button => button.textContent));
          expect(wide).toEqual([]);
        }
        await page.screenshot({path: `outputs/studio-style/concise-${route.replace(/[^a-zA-Z]/g, '-')}-${theme}-${width}.png`});
      }
      await expectAdminRouteLoads(page, '/admin/content#exact-content?category=Natal+Chart&planet=sun&sign=cancer&house=1');
      await expect(page.getByRole('button', {name: 'View Sun in Cancer in the 1st house in app'})).toBeVisible();
      await expect(page.locator('.admin-natal-placement-finder-heading h3')).toHaveCount(0);
      await expect(page.locator('.admin-natal-reader-preview .admin-eyebrow')).toHaveCount(0);
      await expect(page.locator('.admin-natal-reader-preview > header p')).toHaveCount(1);
      expect((await page.getByRole('button', {name: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}).boundingBox())!.width).toBeLessThan(200);
      await page.screenshot({path: `outputs/studio-style/concise-natal-selected-${theme}-${width}.png`});
    });
  }
}


for (const theme of ['dark', 'light']) {
  for (const width of [1440, 900, 390]) {
    test(`Studio shared form audit ${theme} ${width}`, async ({ page }) => {
      const assertNoBrowserErrors = await expectNoBrowserErrors(page);
      await seedAdminApi(page);
      await page.setViewportSize({width, height: 1000});
      await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
      const routes = [...adminPages.map(item => item.hash), 'exact-content?category=Natal+Chart', 'exact-content?category=Natal+Aspects', 'composition-map?surface=natal-empty-house', 'surface-map', 'templates', 'vocabulary', 'slots', 'source-drafts', 'users', 'report-fulfillment', 'connection', 'diagnostics/aspect-patterns'];
      for (const route of routes) {
        await expectAdminRouteLoads(page, `/admin/content#${route}`);
        const problems = await page.locator('.admin-main input, .admin-main select, .admin-main textarea').evaluateAll(controls => controls.flatMap(control => {
          const box = control.getBoundingClientRect();
          if (!box.width || !box.height || ['checkbox', 'radio', 'range', 'color', 'hidden'].includes(control.getAttribute('type') || '')) return [];
          const style = getComputedStyle(control);
          const shell = control.closest('.admin-editor-panel') || control.closest('.admin-main');
          const bounds = shell.getBoundingClientRect();
          const failures = [];
          if (box.left < bounds.left - 1 || box.right > bounds.right + 1) failures.push('outside form');
          if (box.height < 36) failures.push('control too short');
          if (style.color === style.backgroundColor) failures.push('unreadable text');
          return failures.length ? [{label: control.getAttribute('aria-label') || control.id, failures}] : [];
        }));
        expect(problems, `${route} form controls`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
      }
      await expectAdminRouteLoads(page, '/admin/content#composition-map?surface=natal-empty-house');
      const detail = page.getByRole('region', {name: 'Selected app surface or system'});
      const picker = page.getByRole('complementary', {name: 'App surfaces and systems'});
      expect((await detail.boundingBox())!.width).toBeGreaterThan((await page.locator('.admin-main').boundingBox())!.width * 0.8);
      expect((await detail.boundingBox())!.y).toBeGreaterThan((await picker.boundingBox())!.y);
      await expect(page.getByLabel('Empty house', {exact: true})).toBeVisible();
      await expect(page.getByRole('region', {name: 'Runtime rendering path'})).toBeHidden();
      await expect(page.locator('.admin-composition-tabs')).toHaveCSS('border-top-width', '0px');
      await expect(page.locator('.admin-sidebar-status')).toHaveCSS('border-top-width', '0px');
      await expect(page.locator('.admin-composition-detail-header .status-live')).toHaveCSS('color', theme === 'light' ? 'rgb(47, 106, 57)' : 'rgb(150, 214, 154)');
      await page.screenshot({path: `outputs/studio-style/forms-composition-${theme}-${width}.png`});
      await expectAdminRouteLoads(page, '/admin/content#surface-map');
      await expect(page.locator('.admin-surface-sources').first()).toHaveCSS('border-top-width', '0px');
      await page.locator('.admin-surface-sources summary').first().click();
      await expect(page.locator('.admin-surface-sources > p').first()).toHaveCSS('color', theme === 'light' ? 'rgb(87, 96, 93)' : 'rgb(163, 173, 169)');
      await page.screenshot({path: `outputs/studio-style/forms-surface-${theme}-${width}.png`});
      await assertNoBrowserErrors();
    });
  }
}

for (const theme of ['dark', 'light'] as const) {
  for (const width of [1440, 390]) {
    test(`Studio native controls ${theme} ${width}`, async ({page}) => {
      const noErrors = await expectNoBrowserErrors(page);
      await seedAdminApi(page);
      await page.setViewportSize({width, height: 1000});
      await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
      await expectAdminRouteLoads(page, '/admin/content#exact-content');
      await page.getByLabel('Search content', {exact:true}).fill('sky.placement.sun.cancer');
      const row = page.locator('.admin-content-row').first();
      const summary = row.getByRole('button', {name: /^Details/});
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(summary).toHaveAttribute('aria-expanded', 'true');
      await expect(summary.locator('.admin-disclosure-chevron')).toHaveCSS('transform', 'matrix(0, 1, -1, 0, 0, 0)');
      await expect(page.locator('.admin-editor-panel')).toHaveCount(0);
      if (width === 390) {
        const detailsBox = await row.locator('..').locator('.admin-content-expanded-body').boundingBox();
        const editBox = await row.getByRole('button', {name:'Edit', exact:true}).boundingBox();
        expect(detailsBox!.y).toBeGreaterThanOrEqual(editBox!.y + editBox!.height);
      }
      await row.locator('..').screenshot({path:`outputs/studio-style/native-row-${theme}-${width}.png`});
      await page.keyboard.press('Space');
      await expect(summary).toHaveAttribute('aria-expanded', 'false');
      await row.getByRole('button', {name:'Edit', exact:true}).click();
      const editor = page.locator('.admin-editor-panel');
      const related = editor.locator('.admin-sky-related-editor');
      const aspectSummary = related.locator('.admin-sky-related-group > summary').first();
      await aspectSummary.scrollIntoViewIfNeeded();
      await aspectSummary.focus();
      await page.keyboard.press('Enter');
      const search = editor.getByLabel('Find an aspect passage', {exact:true});
      await expect(search).toBeVisible();
      await expect(search).toHaveCSS('border-top-width', '0px');
      await expect(editor.getByLabel('TL;DR / summary', {exact:true})).toHaveCSS('border-top-color', theme === 'dark' ? 'rgb(137, 147, 143)' : 'rgb(111, 121, 118)');
      await expect(related.locator('.admin-hook-pattern-list')).toHaveCSS('width', await related.locator('.admin-sky-related-heading').evaluate(e => getComputedStyle(e).width));
      await search.fill('no matching aspect');
      await expect(search).toHaveCSS('outline-style', 'none');
      await expect(search).toHaveCSS('box-shadow', 'none');
      await expect(search.locator('..')).toHaveCSS('outline-style', 'solid');
      await expect(related.getByRole('heading', {name:'Reader horoscopes'})).toHaveCSS('font-size', '16px');
      await expect(related.locator('header h3')).toHaveCount(1);
      await expect(related.locator('.admin-empty').first()).toBeVisible();
      await expectStudioTypography(page, 'Expanded related passages');
      await expectFormShellDoesNotOverlap(editor, `Native controls ${theme} ${width}`);
      await related.screenshot({path:`outputs/studio-style/native-related-${theme}-${width}.png`});
      const status = editor.getByRole('region', {name:'Review and publication readiness'});
      await expect(status.getByRole('heading', {name:'Review and publication', exact:true})).toHaveClass('sr-only');
      await expect(status.locator('.admin-review-status-values > div')).toHaveCount(2);
      await expect(status.getByRole('button', {name:'Verify publication status'})).toHaveCSS('font-weight','400');
      await expect(status.getByText('Live means eligible to appear.', {exact:false})).toBeHidden();
      await status.screenshot({path:`outputs/studio-style/review-rhythm-${theme}-${width}.png`});
      await related.locator('.admin-sky-related-group > summary').nth(1).click();
      await expect(related.locator('.admin-sky-house-grid > article')).toHaveCount(12);
      await related.locator('.admin-sky-house-grid').screenshot({path:`outputs/studio-style/house-rhythm-${theme}-${width}.png`});
      await editor.locator('.admin-editor-details > summary').click();
      const diagnostic = editor.locator('.admin-fallback-diagnostic-grid');
      await expect(diagnostic.locator('> div').first()).toHaveCSS('border-top-width', '0px');
      await diagnostic.scrollIntoViewIfNeeded();
      await page.screenshot({path:`outputs/studio-style/details-rhythm-${theme}-${width}.png`});

      await editor.getByRole('button', {name:'Close',exact:true}).click();
      await expectAdminRouteLoads(page, '/admin/content#exact-content?category=Natal+Chart');
      const select = page.locator('.admin-natal-placement-selectors select').first();
      await expect(select).toHaveClass(/admin-native-select/);
      await select.focus();
      await select.selectOption('sun');
      await expect(select).toBeFocused();
      await expect(select).toHaveValue('sun');
      await expect(page).toHaveURL(/planet=sun/);
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Natal placement zodiac sign')).toBeFocused();
      await noErrors();
    });
  }
}

for (const theme of ['dark', 'light'] as const) for (const width of [1440, 900, 390]) {
  test(`Studio expanded row rhythm ${theme} ${width}`, async ({page}) => {
    const noErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.setViewportSize({width, height:1000});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    for (const route of ['exact-content', 'sky-writeups', 'articles', 'compatibility']) {
      await expectAdminRouteLoads(page, `/admin/content#${route}`);
      const table = page.locator('.admin-browse-table').first();
      const row = table.locator('.admin-content-row').first();
      await expect(row).toBeVisible();
      const group = row.locator('..');
      const before = await row.boundingBox();
      const toggle = row.getByRole('button', {name:/^Details/});
      await toggle.click();
      const expanded = group.locator('.admin-content-expanded-body');
      await expect(expanded).toBeVisible();
      await expect(expanded).toHaveCSS('text-align', 'start');
      expect(Math.abs((await row.boundingBox())!.height - before!.height)).toBeLessThanOrEqual(1);
      expect((await expanded.boundingBox())!.width).toBeGreaterThan((await table.boundingBox())!.width * 0.8);
      expect(await table.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      const brokenCells = await row.locator('td:not(.admin-col-select)').evaluateAll(cells => cells.filter(e => getComputedStyle(e).borderBottomWidth !== '0px').length);
      expect(brokenCells).toBe(0);
      await expect(toggle).toHaveCSS('font-weight','400');
      await expect(row.locator('.admin-content-row-title')).toHaveCSS('font-weight','400');
      await expect(row.getByRole('button', {name:'Edit',exact:true})).toHaveCSS('font-weight','400');
      await expectStudioTypography(page, `Expanded ${route}`);
      await table.screenshot({path:`outputs/studio-style/row-rhythm-${route}-${theme}-${width}.png`});
      await toggle.click();
      await expect(expanded).toBeHidden();
    }
    await noErrors();
  });
}

for (const theme of ['light', 'dark'] as const) for (const width of [1440, 900, 390]) {
  test(`Studio shared tables ${theme} ${width}`, async ({page}) => {
    const noErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.setViewportSize({width, height:1000});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    await page.route('**/api/admin/user-generated-content**', route => route.fulfill({json:{ok:true, rows:[{
      ...generatedContentRows[0], id:'user-table-qa', user_id:'user-with-a-long-identifier-for-layout', subject_type:'chart', subject_id:'chart-qa', surface:'you', mode:'natal'
    }]}}));
    await page.route('**/api/admin/report-fulfillment**', route => route.fulfill({json:{billingMode:'free_test', metrics:{
      orders:1, exceptionDepth:0, auditDepth:1, averageDeliveryMinutes:3, averageJudgeScore:0.95, validatorPassRate:1, judgePassRate:1,
      averageAcceptedTokenCount:1200, averageTotalTokenCount:1600, averageEstimatedSpendUsd:0.45, attemptDistribution:{writer:1}, judgeScoreDistribution:{passed:1}
    }, reports:[{id:'layout-report', entitlement_source:'comp', report_domain:'general', report_horizon:'12_months', fulfillment_status:'live', token_count:1200, token_count_total:1600, token_budget_lifetime:1450000, token_spend_usd_estimate:0.45, attempt_counts:{writer:1}, validator_results:[], failure_history:[]}], audits:[{id:'audit-layout',report_id:'layout-report',reason:'Layout fixture',status:'complete',findings:[]}], users:[],callEstimates:{}}}));
    await page.route('**/api/admin/aspect-pattern-fixtures**',route=>route.fulfill({json:{ok:true,sky:{aspectPatterns:{patterns:[],relationships:[{parentPatternId:'grand-square',relationship:'contains',childPatternId:'t-square'}]}}}}));
    await expectAdminRouteLoads(page,'/admin/content#review-queue?view=all');
    const review = page.locator('.admin-review-queue-rows .admin-content-row').first();
    await expect(review).toBeVisible();
    await expect(page.locator('.admin-review-queue-row')).toHaveCount(0);
    await review.getByRole('button',{name:/^Details/}).click();
    await expect(review.locator('..').locator('.admin-content-expanded-body')).toBeVisible();
    expect(await page.locator('.admin-browse-table').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.locator('.admin-review-queue-layout').screenshot({path:`outputs/studio-style/shared-review-${theme}-${width}.png`});
    await review.getByRole('button',{name:'Edit',exact:true}).click();
    await expect(page.locator('.admin-editor-panel')).toBeVisible();
    await page.getByRole('button',{name:'Close',exact:true}).click();
    for (const route of ['users','unresolved-content','report-fulfillment','diagnostics/aspect-patterns']) {
      await expectAdminRouteLoads(page,`/admin/content#${route}`);
      if(route === 'diagnostics/aspect-patterns') await page.getByRole('button',{name:'Run diagnostics'}).click();
      const tables=page.locator('.admin-data-table');
      await expect(tables.first()).toBeVisible();
      for(const table of await tables.all()) {
        await expect(table.locator('tbody tr').first()).toBeVisible();
        expect(await table.locator('tbody td').evaluateAll(cells=>cells.every(cell=>Boolean(cell.getAttribute('data-label'))))).toBe(true);
        const failures=await table.locator('tbody td').evaluateAll(cells=>cells.filter(cell=>cell.scrollWidth>cell.clientWidth+1).map(cell=>cell.getAttribute('data-label')));
        expect(failures, `${route} cell overflow`).toEqual([]);
        await expect(table.locator('tbody td').first()).toHaveCSS('border-bottom-width','0px');
        if(width===390) await expect(table).toHaveCSS('display','block');
      }
      await expectStudioTypography(page,route);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await tables.first().locator('..').screenshot({path:`outputs/studio-style/shared-${route.replaceAll('/','-')}-${theme}-${width}.png`});
    }
    await noErrors();
  });
}

for (const theme of ['dark','light'] as const) for (const width of [1440,390]) {
  test(`Studio expanded component audit ${theme} ${width}`, async ({page}) => {
    test.setTimeout(120000);
    await seedAdminApi(page);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(value=>localStorage.setItem('tldrastro:studio-theme',value),theme);
    const noErrors=await expectNoBrowserErrors(page);
    const routes=[...new Set([...adminPages.map(item=>item.hash),'exact-content?category=Natal+Chart','exact-content?category=Natal+Aspects','composition-map?surface=natal-empty-house','surface-map','templates','vocabulary','slots','source-drafts','users','report-fulfillment','connection','diagnostics/aspect-patterns'])];
    const allFindings: unknown[]=[];
    for(const route of routes){
      await expectAdminRouteLoads(page,`/admin/content#${route}`);
      const visited=new Set<string>();
      for(let n=0;n<40;n++){
        const summaries=page.locator('.admin-main details:not([open]) > summary');
        let next: Locator | undefined;
        for(const summary of await summaries.all()){
          if(!await summary.isVisible()) continue;
          const key=await summary.evaluate(el=>`${el.className}:${el.parentElement?.className}:${el.textContent?.trim()}`);
          if(visited.has(key)) continue;
          visited.add(key);next=summary;break;
        }
        if(!next) break;
        await next.click();
      }
      const findings=await page.locator('.admin-dashboard').evaluate(root=>{
        const found: {kind:string;tag:string;label:string}[]=[];
        const visible=(el:Element)=>{const s=getComputedStyle(el);return el.getClientRects().length>0&&s.visibility!=='hidden'&&!el.closest('[hidden],[aria-hidden="true"]');};
        for(const el of root.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')){
          if(!visible(el)||el.type==='hidden')continue;
          const label=el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||Array.from(el.labels||[]).map(x=>x.textContent?.trim()).join(' ')||el.getAttribute('title')||'';
          if(!label)found.push({kind:'missing field label',tag:el.tagName,label:el.getAttribute('placeholder')||el.outerHTML.slice(0,160)});
          if(el instanceof HTMLSelectElement&&!el.disabled&&el.selectedIndex<0)found.push({kind:'no selected option',tag:el.tagName,label});
          const b=el.getBoundingClientRect();const shell=(el.closest('.admin-editor-panel')||el.closest('.admin-main'))?.getBoundingClientRect();
          if(shell&&(b.left<shell.left-1||b.right>shell.right+1))found.push({kind:'field outside container',tag:el.tagName,label});
        }
        for(const el of root.querySelectorAll('button')){
          if(!visible(el))continue;
          const label=el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.getAttribute('title')||el.textContent?.trim();
          if(!label)found.push({kind:'missing button name',tag:el.tagName,label:el.outerHTML.slice(0,160)});
          const target=el.getAttribute('aria-controls');
          if(target&&!document.getElementById(target))found.push({kind:'missing controlled panel',tag:el.tagName,label:target});
        }
        const ids=Array.from(root.querySelectorAll('[id]')).map(el=>el.id);
        for(const id of new Set(ids.filter((id,index)=>ids.indexOf(id)!==index)))found.push({kind:'duplicate id',tag:'*',label:id});
        return found;
      });
      if(findings.length){allFindings.push({route,findings});await page.screenshot({path:`outputs/studio-style/component-audit-${theme}-${width}-${routes.indexOf(route)}.png`});}
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Expanded ${route}`).toBe(true);
    }
    expect(allFindings,'Expanded fields, dropdowns, buttons, and panel references').toEqual([]);
    await noErrors();
  });
}


test('manual source saves preserve typing during an in-flight response', async ({ page }) => {
  const writes: Record<string, unknown>[] = [];
  let releaseFirst!: () => void;
  const pending = new Promise<void>(resolve => { releaseFirst = resolve; });
  const row = { ...generatedContentRows[0], id: 'qa-pending-save', content_key: 'qa/pending-save', headline: 'Pending save fixture', mode: 'feed', status: 'DRAFT', body: 'Original fixture.', sections: {}, source_snapshot: {}, facts: {}, provider: 'manual', block_type: 'essay' };
  await seedAdminApi(page, { generatedRows: [row], onGeneratedContentWrite: async ({ payload }) => {
    writes.push(payload);
    if (writes.length === 1) await pending;
  }});
  const noErrors = await expectNoBrowserErrors(page);
  await expectAdminRouteLoads(page, '/admin/content#exact-content');
  await page.locator('.admin-content-row').getByRole('button', {name:'Edit', exact:true}).click();
  const editor = page.getByRole('dialog', {name:'Generated content editor'});
  const body = editor.locator('textarea.admin-copy-field-body');
  const save = editor.getByRole('button', {name:'Save',exact:true});
  await body.fill('First fixture revision.');
  await save.click();
  await expect.poll(() => writes.length).toBe(1);
  await body.fill('New typing while the first save is pending.');
  releaseFirst();
  await expect(editor.locator('.admin-editor-savebar')).toHaveAttribute('aria-busy','false');
  await expect(body).toHaveValue('New typing while the first save is pending.');
  await expect(save).toBeEnabled();
  await save.click();
  await expect.poll(() => writes.length).toBe(2);
  await expect(editor.locator('.admin-editor-savebar')).toHaveAttribute('aria-busy','false');
  expect(writes[1].body).toBe('New typing while the first save is pending.');
  await expect(body).toHaveValue('New typing while the first save is pending.');
  await expect(save).toBeDisabled();
  await noErrors();
});


for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
  test(`compact review status ${theme} ${width}`, async ({page}) => {
    await seedAdminApi(page, {generatedRows: generatedContentRows.filter(row => row.content_key === 'synastry-ascendant-square-mercury')});
    await page.setViewportSize({width, height:1000});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme',value),theme);
    const noErrors = await expectNoBrowserErrors(page);
    await expectAdminRouteLoads(page, '/admin/content#exact-content');
    await page.locator('.admin-content-row').getByRole('button', {name:'Edit',exact:true}).click();
    const status = page.getByRole('region', {name:'Review and publication readiness'});
    await expect(status.locator('dt')).toHaveText(['Review', 'Publication']);
    await expect(status.locator('dd')).toHaveText(['Complete', 'Ready']);
    await expect(status.locator('h3')).toHaveClass('sr-only');
    expect((await status.boundingBox())!.height).toBeLessThan(100);
    const values = await status.locator('dl > div').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().y));
    expect(Math.abs(values[0] - values[1])).toBeLessThan(3);
    await expectStudioTypography(page, `Compact status ${theme} ${width}`);
    await expectNoHorizontalOverflow(page, 'Compact review status');
    await status.screenshot({path:`outputs/studio-style/compact-review-status-${theme}-${width}.png`});
    await noErrors();
  });
}


for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
  test(`compact editor header ${theme} ${width}`, async ({page, context}) => {
    const key = 'synastry-ascendant-square-mercury';
    await seedAdminApi(page, {generatedRows: generatedContentRows.filter(row => row.content_key === key)});
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme',value),theme);
    const noErrors = await expectNoBrowserErrors(page);
    await expectAdminRouteLoads(page, '/admin/content#exact-content');
    const edit = page.locator('.admin-content-row').getByRole('button', {name:'Edit',exact:true});
    await edit.click();
    const editor = page.getByRole('dialog', {name:'Generated content editor'});
    const header = editor.locator('.admin-editor-header');
    const title = header.getByRole('heading', {name:'Edit Ascendant square Mercury',exact:true});
    const close = header.getByRole('button', {name:'Close',exact:true});
    await expect(title).toBeVisible();
    await expect(close).toBeFocused();
    await expect(header.locator('.admin-eyebrow, code')).toHaveCount(0);
    const box = (await close.boundingBox())!;
    const titleBox = (await title.boundingBox())!;
    expect(box.x).toBeGreaterThan(titleBox.x + titleBox.width - 1);
    expect(box.width).toBeLessThanOrEqual(44);
    expect((await header.boundingBox())!.height).toBeLessThan(width === 390 ? 230 : 150);
    await expectStudioTypography(page, 'Editor header');
    await expectFormShellDoesNotOverlap(editor, 'Compact editor header');
    await expectNoHorizontalOverflow(page, 'Editor header');
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await expect(header.getByRole('button', {name:`Copy key ${key}`,exact:true})).toHaveCount(0);
    await editor.locator('.admin-editor-details > summary').click();
    await editor.locator('.admin-editor-key-details > summary').click();
    await editor.getByRole('button', {name:`Copy key ${key}`,exact:true}).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(key);
    await header.screenshot({path:`outputs/studio-style/compact-editor-header-${theme}-${width}.png`});
    await close.click();
    await expect(editor).toHaveCount(0);
    await expect(edit).toBeFocused();
    await noErrors();
  });
}

for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
  test(`themed page recovery ${theme} ${width}`, async ({page}) => {
    await seedAdminApi(page);
    await page.setViewportSize({width, height:1000});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme',value), theme);
    const chunk = '**/MemoryGraphDashboard-*.js';
    await page.route(chunk, route => route.abort('failed'));
    await page.goto('/admin/content/memory');
    const recovery = page.getByRole('region', {name:'Page recovery'});
    await expect(recovery.getByRole('alert')).toHaveText('This page could not load.');
    await expect(page.locator('.admin-page-error')).toHaveAttribute('data-studio-theme',theme);
    await expect(recovery).toHaveCSS('background-color', theme === 'dark' ? 'rgb(29, 37, 35)' : 'rgb(250, 253, 250)');
    await expect(recovery.getByRole('button', {name:'Retry page'})).toHaveCSS('font-size','14px');
    const actions = recovery.locator('.admin-page-error-actions');
    if (width === 1440) {
      const positions = await actions.locator('button, a').evaluateAll(items=>items.map(item=>item.getBoundingClientRect().y));
      expect(new Set(positions).size).toBe(1);
    }
    await recovery.getByText('Error details', {exact:true}).focus();
    await page.keyboard.press('Enter');
    await expect(recovery.locator('details')).toHaveAttribute('open','');
    await expect(recovery.locator('pre')).toContainText('dynamically imported module');
    await expectNoHorizontalOverflow(page, 'Page recovery');
    await recovery.screenshot({path:`outputs/studio-style/themed-page-error-${theme}-${width}.png`});
    await recovery.getByRole('button', {name:'Retry page'}).click();
    await expect(recovery).toBeVisible(); // A rejected lazy chunk still needs a reload.
    await recovery.getByRole('link', {name:'Open Review Queue'}).click();
    await expect(page.locator('.admin-review-queue-rows')).toBeVisible();
    await expect(page.locator('.admin-dashboard')).toHaveAttribute('data-studio-theme',theme);
    await page.goto('/admin/content/memory');
    await expect(recovery).toBeVisible();
    await page.unroute(chunk);
    await recovery.getByRole('button', {name:'Reload page'}).click();
    await expect(page.getByRole('heading', {name:'Memory graph',exact:true})).toBeVisible();
    await expect(recovery).toHaveCount(0);
  });
}

for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
  test(`themed API error recovery ${theme} ${width}`, async ({page}) => {
    await seedAdminApi(page);
    await page.setViewportSize({width, height:1000});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme',value),theme);
    let unavailable = true;
    await page.route('**/api/admin/generated-content**', async route => {
      if (unavailable) return route.fulfill({status:503,json:{error:'Temporarily unavailable. Please retry.'}});
      return route.fallback();
    });
    await page.goto('/admin/content#review-queue');
    const error = page.locator('.admin-page-notice[role="alert"]');
    await expect(error).toBeVisible();
    await expect(error).toHaveCSS('background-color',theme === 'dark' ? 'rgb(147, 0, 10)' : 'rgb(255, 218, 214)');
    await expect(error).toHaveCSS('color',theme === 'dark' ? 'rgb(255, 218, 214)' : 'rgb(65, 0, 2)');
    await expect(error.locator('button svg')).toHaveCSS('color',theme === 'dark' ? 'rgb(255, 218, 214)' : 'rgb(65, 0, 2)');
    await expect(error).toHaveCSS('padding','16px');
    expect((await error.boundingBox())!.y).toBeLessThan((await page.locator('.admin-dashboard-header').boundingBox())!.y);
    await expectNoHorizontalOverflow(page, 'API error');
    await error.screenshot({path:`outputs/studio-style/themed-api-error-${theme}-${width}.png`});
    await error.getByRole('button',{name:'Dismiss notification'}).click();
    await expect(error).toHaveCount(0);
    unavailable = false;
    await page.getByRole('region',{name:'Content load failed'}).getByRole('button',{name:'Retry',exact:true}).click();
    await expect(page.locator('.admin-review-queue-rows')).toBeVisible();
    await expect(page.getByRole('region',{name:'Content load failed'})).toHaveCount(0);
  });
}

for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
  test(`quiet composition forms ${theme} ${width}`, async ({page}) => {
    await seedAdminApi(page);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(value=>localStorage.setItem('tldrastro:studio-theme',value),theme);
    const noErrors = await expectNoBrowserErrors(page);
    await expectAdminRouteLoads(page,'/admin/content#composition-map');
    const selected = page.getByRole('region',{name:'Selected app surface or system'});
    await expect(selected.locator('.admin-composition-detail-header h2')).toHaveClass('sr-only');
    await expect(selected.locator('.admin-composition-detail-header .admin-eyebrow')).toHaveCount(0);
    const manager = page.getByRole('region',{name:'Manage composition sources'});
    await expect(manager.locator('h3')).toHaveClass('sr-only');
    await expect(manager.locator('.admin-composition-source-card > strong, .admin-composition-source-card > code')).toHaveCount(0);
    await expect(manager.getByRole('button',{name:'Edit selected source'})).toBeVisible();
    await expectNoHorizontalOverflow(page,'Quiet composition map');
    await selected.screenshot({path:`outputs/studio-style/quiet-composition-${theme}-${width}.png`});
    await expectAdminRouteLoads(page,'/admin/content#templates');
    await page.locator('.admin-content-row',{hasText:'slot-template/compatibility/planet-card'}).getByRole('button',{name:'Edit',exact:true}).click();
    const editor = page.getByRole('dialog',{name:'Generated content editor'});
    const guidance = editor.getByLabel('Editing guidance');
    await expect(guidance.locator('summary .admin-disclosure-chevron')).toHaveCount(1);
    await expect(guidance.locator('.admin-editor-brief-more')).toHaveCount(0);
    await expect(guidance.locator('summary strong')).toHaveCSS('font-weight','400');
    await expect(editor.locator('.admin-editor-header').getByRole('button',{name:/Copy key/})).toHaveCount(0);
    const labelStyles = await editor.locator('label').evaluateAll(labels => labels.filter(label=>label.getBoundingClientRect().height>0).map(label=>({weight:getComputedStyle(label).fontWeight,casing:getComputedStyle(label).textTransform})));
    expect(labelStyles.length).toBeGreaterThan(0);
    expect(labelStyles.every(style=>style.weight==='400' && style.casing==='none')).toBe(true);
    await guidance.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(guidance).toHaveAttribute('open','');
    await page.keyboard.press('Enter');
    await expect(guidance).not.toHaveAttribute('open','');
    await expectStudioTypography(page,'Quiet template form');
    await expectNoHorizontalOverflow(page,'Quiet template form');
    await page.screenshot({path:`outputs/studio-style/quiet-template-editor-${theme}-${width}.png`});
    await noErrors();
  });
}

for (const theme of ['dark','light']) for (const width of [1440,390]) {
  test(`Fallback library sections and editor cards ${theme} ${width}`, async ({page}) => {
    await seedAdminApi(page);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(value=>localStorage.setItem('tldrastro:studio-theme',value),theme);
    const noErrors=await expectNoBrowserErrors(page);
    await expectAdminRouteLoads(page,'/admin/content#fallback-hooks');
    const notification=page.getByRole('button',{name:'Dismiss notification',exact:true});
    if(await notification.isVisible()) await notification.click();
    const controls=page.getByRole('region',{name:'Fallback library controls',exact:true});
    await expect(controls).toHaveCSS('padding',width===390?'16px':'24px');
    const visibleTitles=await page.getByRole('heading',{name:'Fallback Articles & Passages',exact:true}).evaluateAll(nodes=>nodes.filter(node=>getComputedStyle(node).clipPath==='none').map(node=>node.tagName));
    expect(visibleTitles).toEqual(['H1']);
    const search=controls.getByLabel('Search fallback articles and passages', {exact:true});
    const sort=controls.getByLabel('Sort fallback rows',{exact:true});
    const searchBox=(await search.boundingBox())!,sortBox=(await sort.boundingBox())!;
    if(width===390) expect(sortBox.y).toBeGreaterThan(searchBox.y+searchBox.height);
    else { expect(Math.abs(searchBox.y-sortBox.y)).toBeLessThan(1); expect(searchBox.width).toBeGreaterThan(sortBox.width); }
    const friends=controls.getByRole('button',{name:'Friends',exact:true});
    await friends.click();
    await friends.hover();
    await expect(friends).toHaveCSS('background-color',theme==='dark'?'rgb(51, 75, 69)':'rgb(205, 232, 224)');
    await search.fill('compatibility card');
    const row=page.locator('.admin-content-row').filter({hasText:'fallback-hook/friends.compatibility.planet-card'});
    await expect(row).toHaveCount(1);
    const group=page.getByRole('region',{name:'Supporting fallback rows',exact:true});
    await expect(group).toHaveCSS('padding',width===390?'16px':'24px');
    await page.screenshot({path:`outputs/studio-style/fallback-library-cards-${theme}-${width}.png`,fullPage:true});
    await row.getByRole('button',{name:'Edit',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    const copy=editor.getByRole('region',{name:'Content name and summary',exact:true});
    await expect(copy).toHaveCSS('padding',width===390?'16px':'24px');
    await expect(copy.getByLabel('Editor label',{exact:true})).toHaveValue('Compatibility card fallback');
    await expect(copy.getByLabel('Purpose (editors only)',{exact:true})).toBeVisible();
    await expect(copy.locator('label').first()).toHaveCSS('font-weight','400');
    if(width===390) {
      const footer=editor.locator('.admin-editor-savebar');
      await expect(footer).toHaveCSS('display','grid');
      const save=(await footer.getByRole('button',{name:'Save',exact:true}).boundingBox())!;
      const retire=(await footer.getByRole('button',{name:'Retire everywhere',exact:true}).boundingBox())!;
      expect(Math.abs(save.width-retire.width)).toBeLessThan(1);
      expect(Math.abs(save.y-retire.y)).toBeLessThan(1);
      const publish=(await footer.getByRole('button',{name:'Publish to app',exact:true}).boundingBox())!;
      expect(publish.width).toBeGreaterThan(save.width*2);
    }
    await editor.screenshot({path:`outputs/studio-style/fallback-editor-cards-${theme}-${width}.png`});
    const body=editor.locator('.admin-copy-field-body');
    await body.scrollIntoViewIfNeeded();
    const bodyCard=body.locator('..');
    const cardBox=(await bodyCard.boundingBox())!,copyBox=(await copy.boundingBox())!;
    expect(Math.abs(cardBox.x-copyBox.x)).toBeLessThan(1);
    expect(Math.abs(cardBox.width-copyBox.width)).toBeLessThan(1);
    await expectFormShellDoesNotOverlap(editor,'Fallback editor');
    await editor.screenshot({path:`outputs/studio-style/fallback-editor-passage-${theme}-${width}.png`});
    await editor.getByRole('button',{name:'Close',exact:true}).click();
    await search.fill('no-fallback-match-987');
    await expect(page.getByText('No rows match these filters.',{exact:true})).toBeVisible();
    await page.screenshot({path:`outputs/studio-style/fallback-library-empty-${theme}-${width}.png`,fullPage:true});
    await expectNoHorizontalOverflow(page,'Fallback library cards');
    await noErrors();
  });
  test(`Studio container insets ${theme} ${width}`, async ({page,context}) => {
    await seedAdminApi(page);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(value=>localStorage.setItem('tldrastro:studio-theme',value),theme);
    const noErrors=await expectNoBrowserErrors(page);
    await expectAdminRouteLoads(page,'/admin/content#exact-content');
    await page.getByLabel('Search content',{exact:true}).fill('sky.placement.sun.cancer');
    await page.locator('.admin-content-row').getByRole('button',{name:'Edit',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'Generated content editor'});
    await editor.locator('.admin-editor-details > summary').click();
    const diagnostic=editor.locator('.admin-fallback-diagnostic-grid');
    const code=diagnostic.locator('code').first();
    await expect(code).toHaveText('natal.placement');
    const codeBox=(await code.boundingBox())!;
    expect(codeBox.width).toBeLessThan(180);
    await expect(code).toHaveCSS('padding-left','8px');
    await expect(code).toHaveCSS('padding-top','4px');
    await diagnostic.screenshot({path:`outputs/studio-style/token-diagnostics-${theme}-${width}.png`});
    await editor.locator('.admin-editor-settings > summary').click();
    const metadata=editor.locator('.admin-metadata-fields');
    await expect(metadata.locator('label').first()).toHaveCSS('border-top-width','0px');
    await expect(editor.locator('.admin-editor-settings > summary')).toHaveCSS('padding-top','12px');
    const titleField=editor.locator('.admin-editor-copy-section');
    const statusPanel=editor.getByRole('region',{name:'Review and publication readiness'});
    expect(Math.abs((await titleField.boundingBox())!.width-(await statusPanel.boundingBox())!.width)).toBeLessThan(2);
    const select=metadata.getByLabel('Mode',{exact:true});
    await expect(select).toHaveCSS('height','56px');
    await expect(select).toHaveCSS('padding-left','16px');
    await expect(select).toHaveCSS('padding-right','48px');
    await expect(metadata.getByLabel('Review state',{exact:true})).toHaveCSS('padding-left','16px');
    await expect(select.locator('..').locator('.admin-select-chevron')).toHaveCount(1);
    const left=(await metadata.boundingBox())!.x;
    expect(Math.abs(left-(await metadata.locator('label').first().boundingBox())!.x)).toBeLessThan(2);
    await select.focus();
    await select.selectOption('feed');
    await expect(select).toBeFocused();
    await metadata.screenshot({path:`outputs/studio-style/token-metadata-${theme}-${width}.png`});
    await editor.locator('.admin-editor-key-details > summary').click();
    const key=editor.locator('.admin-editor-key-details');
    await expect(key.locator('label > span')).toHaveClass('sr-only');
    const body=key.locator('.admin-disclosure-content');
    const field=key.getByLabel('Content key',{exact:true});
    const button=key.getByRole('button',{name:/Copy key/});
    const fieldBox=(await field.boundingBox())!;
    expect(Math.abs(fieldBox.x-(await body.boundingBox())!.x)).toBeLessThan(2);
    expect(Math.abs((await button.boundingBox())!.x-fieldBox.x)).toBeLessThan(2);
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await button.click();
    expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('sky.placement.sun.cancer');
    await key.screenshot({path:`outputs/studio-style/token-content-key-${theme}-${width}.png`});
    await expectNoHorizontalOverflow(page,'Expanded Studio surfaces');
    await noErrors();
  });
}

for (const theme of ['dark', 'light'] as const) for (const width of [1440, 390]) {
  test(`Studio source and house rows ${theme} ${width}`, async ({ page }) => {
    const noErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    await expectAdminRouteLoads(page, '/admin/content#exact-content?category=Natal+Chart&planet=sun&sign=aries&house=1');
    const finder = page.locator('.admin-natal-placement-finder');
    const grid = finder.locator('.admin-natal-source-grid').first();
    const card = grid.locator('> article').first();
    await expect(card).toBeVisible();
    expect(Math.abs((await card.boundingBox())!.width - (await grid.boundingBox())!.width)).toBeLessThan(2);
    // Source passages share the Studio surface-card spacing and boundary.
    await expect(card).toHaveCSS('padding-left', '24px');
    await expect(card).toHaveCSS('border-top-width', '1px');
    await expect(card.locator('.admin-natal-source-key > span')).toHaveCSS('font-weight', '400');
    await expect(card.locator('.admin-natal-source-key > span')).toHaveCSS('text-transform', 'none');
    await expect(finder.locator('> h2')).toHaveClass('sr-only');
    await expect(card.locator('h4')).toHaveCount(1);
    await expectStudioTypography(page, 'Natal full-width sources');
    await expectNoHorizontalOverflow(page, 'Natal full-width sources');
    await card.screenshot({ path: `outputs/studio-style/source-row-${theme}-${width}.png` });
    await finder.getByLabel('Natal placement house').selectOption('');
    const signCard = finder.locator('.admin-natal-source-grid').first().locator('> article').first();
    expect(Math.abs((await signCard.boundingBox())!.width - (await signCard.locator('..').boundingBox())!.width)).toBeLessThan(2);

    await expectAdminRouteLoads(page, '/admin/content#exact-content');
    await page.getByLabel('Search content', { exact: true }).fill('sky.placement.sun.cancer');
    await page.locator('.admin-content-row').getByRole('button', { name: 'Edit', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Generated content editor' });
    const related = editor.locator('.admin-sky-related-editor');
    await related.locator('.admin-sky-related-group > summary').nth(1).click();
    const houses = related.locator('.admin-sky-house-grid');
    const rows = houses.locator('> article');
    await expect(rows).toHaveCount(12);
    await expect(rows.first()).toContainText('1st House');
    await expect(rows.last()).toContainText('12th House');
    const boxes = await rows.evaluateAll(items => items.map(item => {
      const box = item.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }));
    for (let i = 0; i < boxes.length; i++) {
      expect(boxes[i].x).toBe(boxes[0].x);
      expect(boxes[i].width).toBe(boxes[0].width);
      expect(boxes[i].height).toBeGreaterThanOrEqual(44);
      expect(boxes[i].height).toBeLessThanOrEqual(64);
      if (i) expect(boxes[i].y).toBeCloseTo(boxes[i - 1].y + boxes[i - 1].height, 0);
    }
    await expect(rows.first()).toHaveCSS('border-radius', '0px');
    await expect(rows.last()).toHaveCSS('border-bottom-width', '0px');
    await houses.screenshot({ path: `outputs/studio-style/house-rows-${theme}-${width}.png` });
    await expectNoHorizontalOverflow(page, 'House coverage list');
    await expectFormShellDoesNotOverlap(editor, 'House coverage list');
    await noErrors();
  });
}

for (const theme of ['dark', 'light'] as const) {
  for (const width of [1440, 390]) {
    test(`Studio secondary choices and search geometry ${theme} ${width}`, async ({ page }) => {
      const noErrors = await expectNoBrowserErrors(page);
      await seedAdminApi(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
      await expectAdminRouteLoads(page, '/admin/content#composition-map');
      const create = page.getByRole('button', { name: 'Create', exact: true });
      await expect(page.locator('.admin-create-menu')).toHaveCSS('box-shadow', 'none');
      await create.click();
      await expect(page.getByRole('menu')).toHaveCSS('border-radius', '8px');
      await expect(page.getByRole('menu')).not.toHaveCSS('box-shadow', 'none');
      await expect(page.getByRole('menuitem').first()).toHaveCSS('border-radius', '8px');
      await page.keyboard.press('Escape');
      await expect(create).toBeFocused();

      const search = page.getByLabel('Search surfaces and systems', { exact: true });
      await search.fill('Friends');
      const shell = page.locator('.admin-composition-search-shell');
      const clear = page.getByRole('button', { name: 'Clear surface search' });
      const geometry = await shell.evaluate(root => {
        const box = root.getBoundingClientRect();
        const input = root.querySelector('input')!.getBoundingClientRect();
        const clear = root.querySelector('button')!.getBoundingClientRect();
        return { height: box.height, inset: input.left - box.left, gap: clear.left - input.right, right: box.right - clear.right, clearHeight: clear.height };
      });
      expect(geometry.height).toBe(56);
      expect(geometry.inset).toBe(17);
      expect(geometry.gap).toBe(8);
      expect(geometry.right).toBe(17);
      expect(geometry.clearHeight).toBe(40);
      await expect(search).toHaveCSS('border-width', '0px');

      const choices = page.locator('.admin-composition-template-items > button');
      await expect(choices.first()).toBeVisible();
      for (const choice of await choices.all()) {
        await expect(choice).toHaveCSS('border-radius', '16px');
        await expect(choice).toHaveCSS('padding', '16px');
        await expect(choice).toHaveCSS('text-align', 'start');
        await expect(choice.locator('strong')).toHaveCSS('font-weight', '400');
      }
      const next = choices.nth(1);
      await next.focus();
      await page.keyboard.press('Enter');
      await expect(next).toHaveAttribute('aria-pressed', 'true');
      await expect(choices.first()).toHaveAttribute('aria-pressed', 'false');
      await expect(next).toHaveCSS('background-color', theme === 'dark' ? 'rgb(51, 75, 69)' : 'rgb(205, 232, 224)');
      await next.screenshot({ path: `outputs/studio-style/secondary-choice-${theme}-${width}.png` });
      await expectStudioTypography(page, 'selected surface choices');
      await expectNoHorizontalOverflow(page, 'selected surface choices');
      await search.fill('no surface matches this search');
      await expect(page.getByText('No surfaces match', { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page, 'empty surface choices');
      await clear.click();
      await expect(search).toHaveValue('');
      await expect(choices.first()).toBeVisible();

      await page.getByRole('tab', { name: /Template internals/ }).click();
      await expect(choices.first()).toBeVisible();
      await expect(choices.first()).toHaveCSS('border-radius', '16px');
      await expect(choices.first()).toHaveCSS('padding', '16px');
      const filterBox = await page.locator('.admin-composition-search-shell').boundingBox();
      const cardBox = await choices.first().boundingBox();
      expect(cardBox!.x).toBe(filterBox!.x);
      await expectNoHorizontalOverflow(page, 'template choices');
      await page.locator('.admin-composition-template-list').screenshot({ path: `outputs/studio-style/secondary-templates-${theme}-${width}.png` });
      await noErrors();
    });

    for (const route of ['composition-map', 'templates', 'surface-map', 'slots', 'vocabulary', 'connection', 'users', 'report-fulfillment', 'exact-content?category=Natal+Chart']) {
      test(`Studio expanded secondary screens ${route} ${theme} ${width}`, async ({ page }) => {
        const noErrors = await expectNoBrowserErrors(page);
        await seedAdminApi(page);
        await page.setViewportSize({ width, height: 1000 });
        await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
        await expectAdminRouteLoads(page, `/admin/content#${route}`);
        const summaries = page.locator('.admin-main details > summary');
        // Read disclosure state together; each disclosure still opens through a user click.
        while (true) {
          const closed = await summaries.evaluateAll(elements => elements.flatMap((element, index) =>
            element.checkVisibility({ checkVisibilityCSS: true }) && !element.parentElement?.hasAttribute('open') ? [index] : []));
          if (!closed.length) break;
          for (const index of closed) await summaries.nth(index).click();
        }
        await expectStudioTypography(page, `expanded ${route}`);
        await expectNoHorizontalOverflow(page, `expanded ${route}`);
        const boldLabels = await page.locator('.admin-main label, .admin-main legend').evaluateAll(elements => elements.filter(element => element.checkVisibility({ checkVisibilityCSS: true }) && Number(getComputedStyle(element).fontWeight) > 400).map(element => element.textContent));
        expect(boldLabels, route).toEqual([]);
        await noErrors();
      });
    }
  }
}

for (const theme of ['light','dark']) for (const width of [1440,390]) {
  test(`Studio grid spacing ${theme} ${width}`, async ({page}) => {
    await seedAdminApi(page);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(value=>localStorage.setItem('tldrastro:studio-theme',value),theme);
    await expectAdminRouteLoads(page,'/admin/content#exact-content');
    if (width < 720) await page.getByRole('button',{name:'Filters',exact:true}).click();
    for (const name of ['Show reference','Show retired','Refresh rows','Clear filters']) {
      const button=page.getByRole('button',{name,exact:true});
      expect((await button.boundingBox())!.height,name).toBe(40);
    }
    const toolbar=page.locator('.admin-content-toolbar').first();
    expect((await toolbar.boundingBox())!.height).toBeLessThan(width < 720 ? 160 : 90);
    await page.screenshot({path:`outputs/studio-style/grid-library-${theme}-${width}.png`});
    await expectAdminRouteLoads(page,'/admin/content#sky-writeups');
    const filters=page.getByRole('region',{name:'Sky write-up filters',exact:true});
    const compactHeight=await filters.evaluate(element=>Number.parseFloat(getComputedStyle(element).getPropertyValue('--workspace-control-height')));
    expect(compactHeight).toBe(44);
    await filters.getByText('More filters',{exact:true}).click();
    const grids=filters.locator('.admin-review-filter-grid');
    await expect(grids).toHaveCount(2);
    for (const grid of await grids.all()) {
      const selects=await grid.locator('select').evaluateAll(items=>items.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,height:e.getBoundingClientRect().height})));
      expect(selects).toHaveLength(3);
      expect(new Set(selects.map(e=>e.x)).size).toBe(width < 720 ? 1 : 3);
      expect(selects.every(e=>e.height===compactHeight)).toBe(true);
    }
    expect((await filters.getByLabel('Search Sky write-ups').boundingBox())!.height).toBe(compactHeight);
    expect((await filters.getByRole('button',{name:'Clear filters',exact:true}).boundingBox())!.height).toBe(40);
    await expectNoHorizontalOverflow(page,'Sky filter grid');
    await page.screenshot({path:`outputs/studio-style/grid-sky-${theme}-${width}.png`});
    await expectAdminRouteLoads(page,'/admin/content#users');
    const empty=page.getByText('No user-generated rows are loaded.',{exact:true});
    await expect(empty).toHaveCSS('padding-left','16px');
    await expect(empty).toHaveCSS('padding-top','16px');
    await expectNoHorizontalOverflow(page,'Users empty state');
    await page.screenshot({path:`outputs/studio-style/grid-users-${theme}-${width}.png`});
  });

  test(`Studio memory grid recovery ${theme} ${width}`, async ({page}) => {
    await seedAdminApi(page);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(value=>localStorage.setItem('tldrastro:studio-theme',value),theme);
    let failing=true;
    await page.route('**/api/admin/memory-graph**',route=>route.fulfill({status:failing?503:200,contentType:'application/json',body:JSON.stringify(failing?{ok:false,error:'This screen has no sample data in the design preview.'}:{ok:true,documents:[]})}));
    await page.goto('/admin/content/memory');
    const error=page.locator('.memory-error');
    await expect(error).toBeVisible();
    await expect(error).toHaveCSS('background-color',theme==='dark'?'rgb(147, 0, 10)':'rgb(255, 218, 214)');
    const message=(await error.locator('p').boundingBox())!;
    const retry=(await error.getByRole('button',{name:'Try again'}).boundingBox())!;
    expect(retry.height).toBe(40);
    expect(width===390?retry.y-(message.y+message.height):retry.x-(message.x+message.width)).toBeGreaterThanOrEqual(15);
    await expect(page.locator('.memory-loading')).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(0);
    const search=page.getByRole('textbox',{name:'Search memories'});
    await expect(search).toHaveCSS('border-top-width','0px');
    const toolbar=(await page.locator('.memory-toolbar').boundingBox())!;
    const banner=(await error.boundingBox())!;
    const back=(await page.getByRole('link',{name:'Back to Content Studio',exact:true}).boundingBox())!;
    expect(banner.y).toBeLessThan(back.y);
    expect(banner.x-toolbar.x).toBe(24);
    expect(toolbar.x+toolbar.width-banner.x-banner.width).toBe(24);
    await expectNoHorizontalOverflow(page,'Memory error');
    await page.screenshot({path:`outputs/studio-style/grid-memory-error-${theme}-${width}.png`});
    failing=false;
    await error.getByRole('button',{name:'Try again'}).click();
    await expect(page.getByText('No project memories available.',{exact:true})).toBeVisible();
    await expect(error).toHaveCount(0);
    await search.fill('query');
    await page.getByRole('button',{name:'Clear search'}).click();
    await expect(search).toHaveValue('');
    await page.screenshot({path:`outputs/studio-style/grid-memory-empty-${theme}-${width}.png`});
  });
}

for (const theme of ['light','dark']) for (const width of [1440,390]) {
  test(`Studio populated memory workspace ${theme} ${width}`, async ({page}) => {
    await seedAdminApi(page);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(value=>localStorage.setItem('tldrastro:studio-theme',value),theme);
    const document={id:'qa-memory-source',orgId:'qa',userId:'qa',title:'Studio layout reference',contentHash:null,status:'done',createdAt:'2026-09-11',updatedAt:'2026-09-11',memoryEntries:[{id:'qa-memory-entry',documentId:'qa-memory-source',content:'Use consistent spacing for form fields.',title:'Field spacing',createdAt:'2026-09-11',updatedAt:'2026-09-11',isLatest:true}]};
    await page.route('**/api/admin/memory-graph**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,documents:[document]})}));
    await page.goto('/admin/content/memory');
    await expect(page.locator('.memory-reference-root canvas')).toBeVisible();
    await expect(page.locator('.memory-error,.memory-loading')).toHaveCount(0);
    const toolbar=(await page.locator('.memory-toolbar').boundingBox())!;
    const workspace=(await page.locator('.memory-workspace').boundingBox())!;
    expect(workspace.y-toolbar.y-toolbar.height).toBe(24);
    expect(workspace.x).toBe(toolbar.x);
    expect(workspace.width).toBe(toolbar.width);
    await expectNoHorizontalOverflow(page,'Populated Memory graph');
    await page.screenshot({path:`outputs/studio-style/grid-memory-populated-${theme}-${width}.png`});
  });
}

for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`Studio issue status guide ${theme} ${width}`, async ({ page }) => {
    await seedAdminApi(page);
    await page.setViewportSize({ width, height: 1100 });
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    let responseState: 'populated' | 'failed' | 'empty' = 'populated';
    let releaseLoading!: () => void;
    const loading = new Promise<void>(resolve => { releaseLoading = resolve; });
    await page.route('**/api/admin/content-unresolved', async route => {
      await loading;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(
        responseState === 'failed' ? { ok: false, error: 'Fixture unavailable' } :
          { ok: true, report: { ...unresolvedQueue, issues: responseState === 'empty' ? [] : [sourceRepairFixture] } }
      ) });
    });
    await expectAdminRouteLoads(page, '/admin/content#unresolved-content');
    const records = page.getByRole('region', { name: 'Unresolved content records' });
    const guide = page.getByRole('region', { name: 'Issue status guide' });
    const toolbar = page.getByRole('region', { name: 'Unresolved content search' });
    await expect(records.getByText('Loading unresolved issues…')).toBeVisible();
    await expect(records.getByRole('table')).toHaveCount(0);
    await expect(toolbar.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
    releaseLoading();
    await expect(records.getByRole('table')).toBeVisible();
    await expect(page.locator('.admin-unresolved-total')).toHaveText('1 issue');
    const notification = page.getByRole('button', { name: 'Dismiss notification', exact: true });
    await expect(page.getByRole('region', { name: 'Admin status' })).toContainText('Connected');
    await expect(notification).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Unresolved Content', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Resolve content holds' })).toBeVisible();
    const heading = guide.getByRole('heading', { level: 3, name: 'Issue status guide' });
    await expect(heading).toHaveCSS('font-size', '16px');
    await expect(heading).toHaveCSS('line-height', '24px');
    await expect(heading).toHaveCSS('font-weight', '600');
    await expect(heading).toHaveCSS('margin-top', '0px');
    await expect(heading).toHaveCSS('text-align', 'start');
    await expect(heading).toHaveCSS('text-transform', 'none');
    await expect(guide).toHaveCSS('padding', '24px');
    const badges = guide.locator('dt .admin-unresolved-state');
    for (const badge of await badges.all()) {
      await expect(badge).toHaveCSS('font-weight', '400');
      await expect(badge).toHaveCSS('padding', '4px 8px');
      await expect(badge).toHaveCSS('min-height', '32px');
    }
    await expect(badges.first()).toHaveCSS('background-color', theme === 'light' ? 'rgb(255, 223, 152)' : 'rgb(88, 68, 11)');
    const definitions = await guide.locator('dl > div').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().x));
    expect(new Set(definitions).size).toBe(width === 390 ? 1 : 2);
    await expect(guide.getByRole('button')).toHaveCount(0);
    expect((await toolbar.getByRole('button', { name: 'Refresh status' }).boundingBox())!.height).toBe(40);
    await expectNoHorizontalOverflow(page, 'Issue status guide');
    await page.screenshot({ path: `outputs/studio-style/status-guide-${theme}-${width}.png` });
    await expect(records.locator('.admin-unresolved-current-step')).toHaveCSS('display', 'grid');
    await expect(records.locator('.admin-unresolved-progress')).toHaveCSS('list-style-type', 'none');
    await records.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/studio-style/status-rows-${theme}-${width}.png` });
    await toolbar.getByRole('textbox').fill('no-such-issue');
    await expect(records.getByText('No matching issues.')).toBeVisible();
    await toolbar.getByRole('textbox').fill('');
    responseState = 'failed';
    await toolbar.getByRole('button', { name: 'Refresh status' }).click();
    await expect(records.getByRole('alert')).toHaveText('Issues could not load. Select Refresh status to try again.');
    await expect(records.getByRole('table')).toHaveCount(0);
    await expect(page.locator('.admin-unresolved-total')).toHaveText('Issues unavailable');
    await expect(records.getByRole('alert')).toHaveCSS('background-color', theme === 'light' ? 'rgb(255, 218, 214)' : 'rgb(147, 0, 10)');
    await records.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/studio-style/status-error-${theme}-${width}.png` });
    responseState = 'empty';
    await toolbar.getByRole('button', { name: 'Refresh status' }).click();
    await expect(records.getByText('No unresolved issues.')).toBeVisible();
    await expect(page.locator('.admin-unresolved-total')).toHaveText('0 issues');
    await expect(records.getByRole('alert')).toHaveCount(0);
    await expect(heading).toHaveCSS('font-size', '16px');
    await expect(heading).toHaveCSS('font-weight', '600');
    await expectNoHorizontalOverflow(page, 'Empty unresolved issues');
    await records.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/studio-style/status-empty-${theme}-${width}.png` });
  });
}


for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
  test(`Studio tabs match the reference and keyboard contract ${theme} ${width}`, async ({ page }) => {
    await seedAdminApi(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    await expectAdminRouteLoads(page, '/admin/content#sky-writeups?view=daily-summary');
    const expectConnectedTabSurfaces = async () => {
      for (const strip of await page.getByRole('tablist').all()) {
        if (!(await strip.isVisible())) continue;
        const connection = await strip.evaluate(element => {
          const panel = element.nextElementSibling!;
          const tabBox = element.getBoundingClientRect();
          const panelBox = panel.getBoundingClientRect();
          return { gap: panelBox.top - tabBox.bottom, left: panelBox.left - tabBox.left,
            width: panelBox.width - tabBox.width, sameSurface: getComputedStyle(element).backgroundColor === getComputedStyle(panel).backgroundColor,
            topLeft: getComputedStyle(panel).borderTopLeftRadius, topRight: getComputedStyle(panel).borderTopRightRadius };
        });
        expect(connection).toEqual({gap: 0, left: 0, width: 0, sameSurface: true, topLeft: '0px', topRight: '0px'});
      }
    };
    const tabs = page.getByRole('tablist', { name: 'Sky Write-ups workspaces' });
    await expectConnectedTabSurfaces();
    const daily = tabs.getByRole('tab', { name: 'Daily Sky Summary' });
    const catalog = tabs.getByRole('tab', { name: 'Placements & lunations' });
    await expect(daily).toHaveAttribute('aria-selected', 'true');
    await expect(daily).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(daily).toHaveCSS('border-bottom-width', '3px');
    await expect(daily).toHaveCSS('border-bottom-color', theme === 'light' ? 'rgb(0, 107, 91)' : 'rgb(89, 219, 193)');
    await expect(daily).toHaveCSS('color', theme === 'light' ? 'rgb(25, 28, 27)' : 'rgb(196, 199, 197)');
    for (const tab of await tabs.getByRole('tab').all()) {
      await expect(tab).toHaveCSS('font-weight', '400');
      await expect(tab).toHaveCSS('font-size', '14px');
      await expect(tab).toHaveCSS('line-height', '20px');
      await expect(tab).toHaveCSS('border-radius', '0px');
      await expect(tab).toHaveCSS('min-height', '56px');
    }
    const bounds = await tabs.getByRole('tab').evaluateAll(elements => elements.map(element => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y, width: element.getBoundingClientRect().width })));
    expect(new Set(bounds.map(rect => rect.y)).size).toBe(1);
    if (width > 720) expect(Math.max(...bounds.map(rect => rect.width)) - Math.min(...bounds.map(rect => rect.width))).toBeLessThan(1);
    await daily.focus();
    await daily.press('ArrowRight');
    await expect(catalog).toBeFocused();
    await expect(daily).toHaveAttribute('aria-selected', 'true');
    await catalog.press('Enter');
    await expect(catalog).toHaveAttribute('aria-selected', 'true');
    const panel = page.getByRole('tabpanel', { name: 'Placements & lunations', exact: true });
    await expect(panel).toBeVisible();
    expect(await panel.getAttribute('id')).toBe(await catalog.getAttribute('aria-controls'));
    expect(await panel.getAttribute('aria-labelledby')).toBe(await catalog.getAttribute('id'));
    await catalog.press('End');
    const house = tabs.getByRole('tab', { name: 'House Transits' });
    await expect(house).toBeFocused();
    const focusedBounds = (await house.boundingBox())!;
    const stripBounds = (await tabs.boundingBox())!;
    expect(focusedBounds.x).toBeGreaterThanOrEqual(stripBounds.x);
    expect(focusedBounds.x + focusedBounds.width).toBeLessThanOrEqual(stripBounds.x + stripBounds.width + 1);
    await house.press(' ');
    await expect(page.getByRole('tabpanel', { name: 'House Transits', exact: true })).toBeVisible();
    await house.press('Home');
    await expect(daily).toBeFocused();
    await daily.press('Enter');
    await daily.press('ArrowLeft');
    await expect(house).toBeFocused();
    await house.press('ArrowRight');
    await expect(daily).toBeFocused();
    await daily.press('Tab');
    await expect(page.getByRole('tabpanel', { name: 'Daily Sky Summary', exact: true })).toBeFocused();
    const notification = page.getByRole('button', { name: 'Dismiss notification', exact: true });
    if (await notification.isVisible()) await notification.click();
    await expectNoHorizontalOverflow(page, 'Sky tabs');
    await tabs.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `outputs/studio-style/tabs-sky-${theme}-${width}.png` });

    await expectAdminRouteLoads(page, '/admin/content#composition-map');
    const scope = page.getByRole('tablist', { name: 'Composition Map scope' });
    await scope.getByRole('tab').first().focus();
    await scope.getByRole('tab').first().press('End');
    await scope.getByRole('tab').last().press('Enter');
    const compositionTabs = page.getByRole('tablist', { name: 'Composition views' });
    await compositionTabs.getByRole('tab').first().focus();
    await compositionTabs.getByRole('tab').first().press('End');
    await compositionTabs.getByRole('tab').last().press('Enter');
    await expect(page.getByRole('tabpanel', { name: 'Assembly', exact: true })).toBeVisible();
    await expectConnectedTabSurfaces();
    await expectNoHorizontalOverflow(page, 'Composition tabs');
    await page.screenshot({ path: `outputs/studio-style/tabs-composition-${theme}-${width}.png` });

    await expectAdminRouteLoads(page, '/admin/content#exact-content');
    const savedViews = page.getByRole('group', { name: 'Content Library saved views' });
    await expect(savedViews.getByRole('tab')).toHaveCount(0);
    await expect(savedViews.getByRole('button', { name: 'Editorial content' })).toHaveAttribute('aria-pressed', 'true');
    await expectAdminRouteLoads(page, '/admin/content#vocabulary');
    const categories = page.getByRole('navigation', { name: 'Vocabulary categories' });
    await categories.getByRole('link', { name: 'Relationship' }).click();
    await expect(categories.getByRole('link', { name: 'Relationship' })).toHaveAttribute('aria-current', 'page');
    await expect(categories.getByRole('tab')).toHaveCount(0);
    await expectNoHorizontalOverflow(page, 'Vocabulary category links');
  });
}

for (const theme of ['light', 'dark'] as const) for (const width of [1440, 390]) {
  test(`Composition variable identity colors ${theme} ${width}`, async ({ page }) => {
    await seedAdminApi(page);
    await page.setViewportSize({width, height:1000});
    await page.addInitScript(value => localStorage.setItem('tldrastro:studio-theme', value), theme);
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await expectAdminRouteLoads(page, '/admin/content#composition-map');
    await page.getByRole('tab', {name:/Template internals/}).click();
    const detail = page.getByRole('region', {name:'Selected template composition',exact:true});
    const key = detail.getByLabel('Variable color key');
    await expect(key.locator('[data-variable-name]')).toHaveCount(3);
    const colors = await key.locator('[data-variable-name]').evaluateAll(elements => elements.map(element => ({
      name: element.getAttribute('data-variable-name')!,
      color: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor,
    })));
    expect(new Set(colors.map(item => item.background)).size).toBe(3);
    for (const variable of colors) {
      const preview = detail.locator(`.admin-composition-preview-copy [data-variable-name="${variable.name}"]`).first();
      await expect(preview).toHaveCSS('color',variable.color);
      await expect(preview).toHaveCSS('background-color',variable.background);
      await preview.hover();
      await expect(preview).toHaveCSS('background-color',variable.background);
      await expect(preview).toHaveCSS('font-size','16px');
      await expect(preview).toHaveCSS('line-height','24px');
      await expect(preview).toHaveAttribute('aria-label',new RegExp(`Inspect`));
    }
    // Verify every paired categorical color, including palette entries absent
    // from this three-variable fixture, against its actual themed background.
    const contrasts = await detail.evaluate(root => {
      const luminance = (color: string) => {
        const rgb = color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(channel => {
          const value=channel/255;
          return value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4;
        });
        return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
      };
      return Array.from({length:6}, (_,index) => {
        const probe=document.createElement('span');
        probe.dataset.variableColor=String(index+1);
        root.append(probe);
        const style=getComputedStyle(probe);
        const a=luminance(style.color),b=luminance(style.backgroundColor);
        probe.remove();
        return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      });
    });
    for (const ratio of contrasts) expect(ratio).toBeGreaterThanOrEqual(4.5);
    await detail.screenshot({path:`outputs/studio-style/variable-colors-preview-${theme}-${width}.png`});
    await page.getByRole('tab',{name:'Main template',exact:true}).click();
    for (const variable of colors) {
      const token=detail.locator(`.admin-composition-template-fields [data-variable-name="${variable.name}"]`).first();
      await expect(token).toHaveCSS('color',variable.color);
      await expect(token).toHaveCSS('background-color',variable.background);
    }
    await detail.screenshot({path:`outputs/studio-style/variable-colors-template-${theme}-${width}.png`});
    const first=colors[0];
    const token=detail.locator(`.admin-composition-template-fields [data-variable-name="${first.name}"]`).first();
    await token.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tab',{name:'Assembly',exact:true})).toHaveAttribute('aria-selected','true');
    await expect(page.locator(`[id="composition-slot-${first.name}"]`)).toBeFocused();
    for (const variable of colors) {
      const badge=detail.locator(`.admin-composition-slot code[data-variable-name="${variable.name}"]`);
      await expect(badge).toHaveCSS('background-color',variable.background);
      await expect(badge).toHaveCSS('color',variable.color);
    }
    await detail.screenshot({path:`outputs/studio-style/variable-colors-assembly-${theme}-${width}.png`});
    await expectNoHorizontalOverflow(page,'Colored composition variables');
    await assertNoBrowserErrors();
  });
}

const containerAuditRoutes = [...new Set([...adminPages.map(item => item.hash),
  'review-queue', 'exact-content?category=Natal+Chart', 'exact-content?category=Natal+Aspects',
  'sky-writeups?view=daily-summary', 'sky-writeups?view=transits-to-natal', 'sky-writeups?view=house-transits',
  'fallback-hooks?section=lunar-calendar', 'composition-map', 'surface-map', 'templates', 'vocabulary', 'slots',
  'source-drafts', 'users', 'report-fulfillment', 'connection', 'diagnostics/aspect-patterns',
  'content/aspect-pattern-activation', 'fallback-hooks', 'sky-writeups?view=transits-to-natal&audience=friends',
  'exact-content?category=Calendar+Aspects'])];

async function uncontainedStudioContent(page: Page) {
  return page.locator('.admin-main').evaluate(main => {
    const canvas = getComputedStyle(main.closest('.admin-dashboard')!).backgroundColor;
    const isContained = (element: Element) => {
      for (let parent = element.matches('input,select,textarea,button,a,span,strong,code') ? element.parentElement : element; parent && parent !== main; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== canvas) return true;
      }
      return false;
    };
    return [...main.querySelectorAll('input,select,textarea,p,h1,h2,h3,label,nav,span,strong,button')].filter(el => el.checkVisibility({checkVisibilityCSS:true}) && !el.closest('.sr-only,.admin-sr-only,.admin-editor-backdrop,.admin-source-repair-backdrop,.admin-create-menu-backdrop') && !isContained(el)).map(el => ({
      tag: el.tagName, text: (el.getAttribute('aria-label') || el.textContent || '').slice(0,70),
      parents: [el.parentElement?.className,el.parentElement?.parentElement?.className,el.parentElement?.parentElement?.parentElement?.className]
    }));
  });
}

for (const theme of ['light','dark']) for (const width of [1440,390]) {
  test(`Studio all pages and forms have containers ${theme} ${width}`, async ({ page }, testInfo) => {
    test.setTimeout(180000);
    const noErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.setViewportSize({width,height:1000});
    await page.addInitScript(theme => localStorage.setItem('tldrastro:studio-theme', theme),theme);
    const findings = [];
    for (const route of containerAuditRoutes) {
      await expectAdminRouteLoads(page, `/admin/content#${route}`);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect(page.locator('.admin-loaded-workspace')).not.toContainText(/Loading (aspect|report|Lunar|Composition)/);
      await page.locator('.admin-main details').evaluateAll(items => items.forEach(item => { (item as HTMLDetailsElement).open = true; }));
      for (const toggle of await page.locator('.admin-filter-disclosure-toggle[aria-expanded="false"],.admin-browse-filter-toggle[aria-expanded="false"]').all()) {
        if (await toggle.isVisible()) await toggle.click();
      }
      const missing = await uncontainedStudioContent(page);
      if (missing.length) findings.push({route,missing});
      await expectNoHorizontalOverflow(page,route);
      if (['review-queue','exact-content','surface-map','templates','connection'].includes(route)) {
        await page.screenshot({path:`outputs/studio-style/containers-${route}-${theme}-${width}.png`});
      }
    }
    for (const item of adminCreateCases) {
      await openAdminCreateMenuHost(page);
      await openCreateMenu(page);
      await page.getByRole('menuitem',{name:item.action}).click();
      const editor=page.getByRole('dialog',{name:'Generated content editor'});
      await expect(editor).toBeVisible();
      await editor.locator('details').evaluateAll(items => items.forEach(item => { (item as HTMLDetailsElement).open = true; }));
      const missing=await uncontainedStudioContent(page);
      if(missing.length) findings.push({route:item.action,missing});
      await expectNoHorizontalOverflow(page,item.action);
    }
    await testInfo.attach('container-audit',{body:JSON.stringify({routes:containerAuditRoutes,editors:adminCreateCases.map(item=>item.action),findings},null,2),contentType:'application/json'});
    expect(findings.map(item=>({route:item.route,missing:item.missing.slice(0,12),count:item.missing.length}))).toEqual([]);
    await noErrors();
  });
}

for (const width of [390, 1440]) test(`Empty-house preview uses the actual authenticated reader API at ${width}`, async ({ page }) => {
  await seedAdminApi(page);
  const api = emptyHousePreviewApi();
  const results: Array<{ body: any; rendered: any }> = [];
  try {
    await page.route("**/api/admin/natal-placement-preview", async route => {
      const body = route.request().postDataJSON();
      const result = await api.invoke(body, route.request().headers());
      expect(result.status).toBe(200);
      results.push({ body, rendered: result.payload.rendered });
      await route.fulfill({ status: result.status, json: result.payload });
    });
    await page.setViewportSize({ width, height: 1000 });
    await expectAdminRouteLoads(page, "/admin/content#exact-content?category=Natal+Chart");
    await page.getByRole("tab", { name: "Empty houses", exact: true }).click();
    const workspace = page.getByRole("region", { name: "Empty house writing", exact: true });
    await workspace.getByLabel("Empty house cusp sign").selectOption("gemini");
    await workspace.getByLabel("Empty house ruler house").selectOption("10");
    const copy = workspace.locator(".admin-empty-house-assembly-copy p");
    for (const audience of ["you", "they"]) {
      await workspace.getByRole("button", { name: audience === "you" ? "You" : "Friend", exact: true }).click();
      await expect.poll(() => results.some(result => result.body.sign === "gemini" && result.body.rulerHouse === 10 && result.body.audience === audience)).toBe(true);
      const result = results.filter(result => result.body.sign === "gemini" && result.body.rulerHouse === 10 && result.body.audience === audience).at(-1)!;
      await expect(copy).toHaveText(result.rendered.body);
      expect(result.rendered.body.length).toBeGreaterThan(100);
      await expect(workspace.getByLabel("Sources used in this assembly").getByRole("button")).toHaveCount(result.rendered.sourceKeys.length);
    }
    await expectNoHorizontalOverflow(page, `Empty-house actual API preview ${width}`);
    await workspace.screenshot({ path: `test-results/empty-house-actual-api-${width}.png` });
  } finally { await page.unroute("**/api/admin/natal-placement-preview"); api.close(); }
});
