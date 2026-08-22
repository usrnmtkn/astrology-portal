import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { writingSurfaceAdminAccess, writingSurfaceSourceMap } from "../../apps/admin/src/writingSurfaceSourceMap";
import {
  expectRouteLoadsWithin,
  routeReadyTimeoutMs,
  watchBrowserErrors
} from "./qaRuntimeGuards";

const adminScreenshotDir = path.join("test-results", "content-dashboard-admin-flow");

const adminPages = [
  { nav: "Review Queue", title: "Review Queue", breadcrumb: "Admin / Publish / Review queue", hash: "review-queue" },
  { nav: "Content Library", title: "Content Library", breadcrumb: "Admin / Write / Content library", hash: "exact-content" },
  { nav: "Articles", title: "Articles", breadcrumb: "Admin / Write / Articles", hash: "articles" },
  { nav: "Templates", title: "Templates", breadcrumb: "Admin / Composition / Templates", hash: "templates" },
  { nav: "Aspect Patterns", title: "Aspect Patterns", breadcrumb: "Admin / Language System / Aspect Patterns", hash: "content/aspect-patterns" }
];

const adminCreateCases = [
  { action: "Create article", hash: "articles", editorHeading: "Create article", eventType: "sky_article", blockType: "sky_article", contentKey: "sky/article/new-row" },
  { action: "Create content row", hash: "exact-content", editorHeading: "Author new row", eventType: "essay", blockType: "essay", contentKey: "content/manual/new-row" },
  { action: "Create reusable phrase", hash: "vocabulary", editorHeading: "Create reusable phrase", eventType: "vocab", blockType: "vocabulary_phrase", contentKey: "vocab/planets/create-reusable-phrase-qa-row", phraseEditor: true },
  { action: "Create template", hash: "templates", editorHeading: "Author new row", eventType: "slot-template", blockType: "template", contentKey: "slot-template/manual/new-template" },
  { action: "Create fallback hook", hash: "fallback-hooks", editorHeading: "Author new row", eventType: "fallback-hook", blockType: "fallback_hook", contentKey: "fallback-hook/manual/new-hook" }
];

const forbiddenReaderPreviewCopy = /\b(?:Interpretation in review|Notice how this placement asks|puts first impressions, outward style|write a sentence|source framework|sourceSnapshot|templateVersion|Missing VITE|undefined|null|NaN)\b/i;

const now = "2026-07-16T12:00:00.000Z";

const skyReviewHorizonFixture = {
  startDate: "2026-08-22",
  endDate: "2026-11-20",
  snapshotCount: 91,
  calculationMethod: "daily-active-sky-snapshot",
  counts: { occurrences: 1, aspectCandidates: 1, placementCandidates: 0, activeWindows: 1 },
  reviewCounts: { missing_draft: 1 },
  generationPlan: {
    status: "authorization_required",
    reusableCandidatesMissingDrafts: 1,
    writerCalls: 1,
    reviewerCalls: 1,
    minimumSuccessfulCalls: 2,
    contentKeys: ["sky.aspect.sun.trine.chiron.leo.taurus"],
    note: "Fixture generation plan."
  },
  occurrences: [{
    kind: "aspect",
    contentKey: "sky.aspect.sun.trine.chiron.leo.taurus",
    label: "Sun trine Chiron",
    facts: { a: "sun", b: "chiron", aspect: "trine", signA: "leo", signB: "taurus" },
    activeDates: ["2026-08-22"],
    windows: [{ startDate: "2026-08-22", endDate: "2026-08-22" }],
    reviewStatus: "missing_draft",
    row: null
  }]
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
    lane: "serving",
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
    lane: "serving",
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
    initialSecret?: string;
    expectedSecret?: string;
    generatedRows?: Record<string, unknown>[];
  } = {}
) {
  const apiGeneratedContentRows = options.generatedRows ?? generatedContentRows;
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
      && route.request().headers().authorization !== `Bearer ${options.expectedSecret}`
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
        const updatedRow = {
          ...generatedContentRows[0],
          id: typeof payload.id === "string" ? payload.id : generatedContentRows[0].id,
          content_key: typeof payload.contentKey === "string" ? payload.contentKey : generatedContentRows[0].content_key,
          surface: typeof payload.surface === "string" ? payload.surface : generatedContentRows[0].surface,
          mode: typeof payload.mode === "string" ? payload.mode : generatedContentRows[0].mode,
          status: typeof payload.status === "string" ? payload.status : generatedContentRows[0].status,
          headline: typeof payload.headline === "string" ? payload.headline : generatedContentRows[0].headline,
          summary: typeof payload.summary === "string" ? payload.summary : generatedContentRows[0].summary,
          body: typeof payload.body === "string" ? payload.body : generatedContentRows[0].body,
          source_snapshot: payload.sourceSnapshot && typeof payload.sourceSnapshot === "object"
            ? payload.sourceSnapshot
            : generatedContentRows[0].source_snapshot,
          lane: typeof payload.lane === "string" ? payload.lane : generatedContentRows[0].lane,
          review_state: typeof payload.reviewState === "string" ? payload.reviewState : null,
          block_type: typeof payload.blockType === "string" ? payload.blockType : generatedContentRows[0].block_type,
          prompt_version: typeof payload.promptVersion === "string" ? payload.promptVersion : generatedContentRows[0].prompt_version
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, rows: [updatedRow] })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, rows: apiGeneratedContentRows })
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
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("8 saved rows loaded", {
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

  test("admin access trims pasted secrets and clears a rejected saved value", async ({ page }) => {
    await seedAdminApi(page, {
      initialSecret: "stale-secret",
      expectedSecret: "qa-secret"
    });
    await page.goto("/admin/content");

    await expect(page.getByRole("heading", { name: "Review Queue" })).toBeVisible({
      timeout: routeReadyTimeoutMs
    });
    await expect(page.getByRole("status")).toContainText("The rejected saved secret was cleared");
    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("Access denied");
    const secretInput = page.getByLabel("Secret");
    await expect(secretInput).toHaveValue("");

    await secretInput.fill("  qa-secret  ");
    await expect(secretInput).toHaveValue("qa-secret");
    await page.getByRole("button", { name: "Load content" }).click();

    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("8 saved rows loaded", {
      timeout: routeReadyTimeoutMs
    });
    await expect(page.getByRole("status")).toContainText("Loaded 8 saved rows");
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
    await expectAdminHeader(page, "Fallback Hooks", "Admin / Composition / Fallback hooks");
    await expect(page.getByRole("tab", { name: /Friends/ })).toHaveAttribute("aria-selected", "true");

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

    await expectAdminHeader(page, "Fallback Hooks", "Admin / Composition / Fallback hooks");
    await expect(page.getByLabel("Body")).not.toHaveValue("");
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
    await expectAdminHeader(page, "Fallback Hooks", "Admin / Composition / Fallback hooks");
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
      if (createCase.phraseEditor) {
        await fillAdminEditorField(editor, "Phrase title", `${createCase.action} QA row`);
        await fillAdminEditorField(editor, "Reusable phrase text", `${createCase.action} body copy for the dashboard admin save contract.`);
      } else {
        await expect(editor.getByLabel("Content key")).toHaveValue(createCase.contentKey);
        await fillAdminEditorField(editor, "Headline", `${createCase.action} QA row`);
        await fillAdminEditorField(editor, "Body", `${createCase.action} body copy for the dashboard admin save contract.`);
      }
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
      await expect(editor.getByRole("heading", { name: "Edit article" })).toBeVisible();
      await expect(contentSystemPanel).toContainText("Authored");
    }).toPass({ timeout: routeReadyTimeoutMs });
    await expect(contentSystemPanel.getByText("Content Level", { exact: true })).toHaveCount(0);
    await expect(editor.getByLabel("App display source")).toHaveCount(0);
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
      const headline = postEditor.querySelector('[aria-label="Headline"]')?.closest("label");
      const summary = postEditor.querySelector('[aria-label="Summary"]')?.closest("label");
      const body = postEditor.querySelector('[aria-label="Body"]')?.closest("label");
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
    await editor.getByLabel("Headline").fill("Sun in Cancer QA edit");
    await editor.getByLabel("Summary").fill("Updated summary from the visual admin editor.");
    await editor.getByLabel("Body").fill("Updated body from the visual admin editor.");
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

  test("Sky write-up editor stays single-column and orders aspects before house horoscopes", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await page.setViewportSize({ width: 654, height: 900 });
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

    const layout = await editor.evaluate((panel) => {
      const postEditor = panel.querySelector<HTMLElement>(".admin-post-editor");
      const packagePanel = panel.querySelector<HTMLElement>(".admin-package-edit-panel");
      const headline = panel.querySelector<HTMLElement>('[aria-label="Headline"]')?.closest("label");
      const summary = panel.querySelector<HTMLElement>('[aria-label="Summary"]')?.closest("label");
      const body = panel.querySelector<HTMLElement>('[aria-label="Body"]')?.closest("label");
      const related = panel.querySelector<HTMLElement>('[aria-label="Related reader horoscope passages"]');
      const topPositions = [headline, summary, body, related].map((node) => node?.getBoundingClientRect().top ?? -1);
      const packageChildren = packagePanel ? Array.from(packagePanel.children).map((node) => {
        const rect = (node as HTMLElement).getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }) : [];
      return {
        editorOverflow: panel.scrollWidth - panel.clientWidth,
        postEditorColumns: postEditor ? getComputedStyle(postEditor).gridTemplateColumns : "",
        packageColumns: packagePanel ? getComputedStyle(packagePanel).gridTemplateColumns : "",
        topPositions,
        packageChildren
      };
    });

    expect(layout.editorOverflow).toBeLessThanOrEqual(1);
    expect(layout.postEditorColumns.trim().split(/\s+/)).toHaveLength(1);
    expect(layout.packageColumns.trim().split(/\s+/)).toHaveLength(1);
    expect(layout.topPositions.every((top, index, positions) => index === 0 || top > positions[index - 1])).toBe(true);
    expect(layout.packageChildren.every((child, index, children) => index === 0 || child.top >= children[index - 1].bottom)).toBe(true);
    await expectNoHorizontalOverflow(page, "Narrow Sky write-up editor");
    await mkdir(adminScreenshotDir, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: path.join(adminScreenshotDir, "narrow-sky-writeup-editor.png")
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
    await expect(page.locator(".admin-content-row", { hasText: "sky.placement.sun.cancer" })).toHaveCount(1);
    await expect(page.locator(".admin-dashboard h2").filter({ hasText: "Articles" })).toBeVisible();

    await articleFilters.getByLabel("Search articles").fill("cancer");
    await expect(page.locator(".admin-content-row", { hasText: "Sun in Cancer" }).first()).toBeVisible();

    await articleFilters.getByLabel("Article content system").selectOption("fallback");
    await expect(page.locator(".admin-content-row")).toHaveCount(0);
    await expect(page.getByText("No rows match these filters.")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(articleFilters.getByLabel("Article planet or point")).toHaveValue("all");
    await expect(articleFilters.getByLabel("Article content system")).toHaveValue("all");
    await expect(articleFilters.getByLabel("Search articles")).toHaveValue("");
    await expect(page.locator(".admin-content-row", { hasText: "sky.placement.sun.cancer" })).toHaveCount(1);

    await assertNoBrowserErrors();
  });

  test("compatibility is a saved Content Library view", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content#compatibility");

    await expectAdminHeader(page, "Content Library", "Admin / Write / Content library");
    const libraryViews = page.getByRole("tablist", { name: "Content Library saved views" });
    await expect(libraryViews.getByRole("tab", { name: "Compatibility" })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".admin-content-row", { hasText: "compatibility.sun.aries.libra" })).toHaveCount(1);
    await expect(page.locator(".admin-content-row", { hasText: "Moon in Virgo" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Show reference" })).toHaveAttribute("aria-pressed", "false");

    await libraryViews.getByRole("tab", { name: "Editorial content" }).click();
    await expect(libraryViews.getByRole("tab", { name: "Editorial content" })).toHaveAttribute("aria-selected", "true");

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
    await expect(editor.getByRole("heading", { name: "Author new row" })).toBeVisible();
    await expect(editor.getByLabel("Content key")).toHaveValue("cms/natal-empty-house/detail/you/template");
    await expect(editor.getByText("Reader-facing CMS override")).toBeVisible();
    await expect(editor.locator("p", { hasText: "Allowed slots:" })).toContainText("{{houseOrdinal}}");
    await fillAdminEditorField(editor, "Body", "Your {{houseOrdinal}} house begins in {{missingTopic}}.");
    await expect(editor.getByRole("alert", { name: "CMS template errors" })).toContainText("{{missingTopic}}");
    await expect(editor.getByRole("button", { name: "Sign Off" })).toBeDisabled();
    await fillAdminEditorField(editor, "Body", "Your {{houseOrdinal}} house begins in {{sign}}. Review what you repeat here each month.");
    await expect(editor.getByRole("alert", { name: "CMS template errors" })).toHaveCount(0);
    await expect(editor.getByLabel("CMS template preview")).toContainText("Your 2nd house begins in Taurus.");
    await expect(editor.getByRole("button", { name: "Sign Off" })).toBeEnabled();
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor.getByText("Reader-facing CMS override")).toBeVisible();
    await expect(editor.locator(".admin-editor-toolbar")).toContainText("Draft");
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
    await expect(editor.getByRole("heading", { name: "Author new row" })).toBeVisible();
    await expect(editor.getByLabel("Content key")).toHaveValue("sky.sun.trine.chiron");
    await expect(editor.getByLabel("Body")).toHaveValue(heldSkyAspectDrafts[0].body);
    await expect(editor.getByLabel("Lane")).toHaveValue("reference");
    await expect(editor.getByLabel("Review state")).toHaveValue("NEEDS_OWNER_DECISION");

    await editor.getByLabel("Status").selectOption("LIVE");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/still needs an explicit owner decision/)).toBeVisible();
    expect(writes).toHaveLength(0);

    await editor.getByLabel("Status").selectOption("DRAFT");
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
    await expectAdminHeader(page, "Fallback Hooks", "Admin / Composition / Fallback hooks");
    const friendsFallbackTab = page
      .getByRole("tablist", { name: "Fallback hook sections" })
      .getByRole("tab", { name: "Friends" });
    await friendsFallbackTab.click();
    await expect(friendsFallbackTab).toHaveAttribute("aria-selected", "true");
    await page.getByLabel("Search fallback hooks").fill("compatibility card");
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

  test("content library and publish filters expose writing QA controls", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content");

    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Content Library" }).click();
    await expect(page.locator("section[aria-label='Content list filters']")).toBeVisible();
    await expect(page.locator("[aria-label='Status']")).toBeVisible();
    await expect(page.locator("[aria-label='Status']").getByRole("tab", { name: /Draft/ })).toBeVisible();
    await expect(page.locator("[aria-label='Status']").getByRole("tab", { name: /Published/ })).toBeVisible();
    await expect(page.getByText("Reader safety")).toBeVisible();

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

  test("review queue Edit opens the saved-row editor", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await expectAdminRouteLoads(page, "/admin/content#review-queue");

    const reviewRow = page.locator(".admin-review-queue-row", { hasText: "sky.placement.sun.cancer" });
    await expect(reviewRow).toHaveCount(1);
    await reviewRow.getByRole("button", { name: "Edit" }).click();

    const editor = page.getByRole("dialog", { name: "Generated content editor" });
    await expect(editor.getByRole("heading", { name: "Edit article" })).toBeVisible();
    await expect(editor.getByLabel("Content key")).toHaveValue("sky.placement.sun.cancer");
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
    await expect(editor.getByRole("heading", { name: "Author new row" })).toBeVisible();
    await expect(editor.getByLabel("Content key")).toHaveValue("sky.aspect.sun.trine.chiron.leo.taurus");
    await expect(editor.getByLabel("Block type")).toHaveValue("sky_aspect");
    await editor.getByLabel("Body").fill("Owner-authored fixture copy for this exact active Sky aspect.");
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

  test("composition surfaces expose templates, slots, vocabulary, fallback hooks, and surface map", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    let deepLinkLoadIndex = 0;
    const openAdminDeepLink = async (hash: string) => {
      await expectAdminRouteLoads(page, `/admin/content?qaCompositionSurface=${deepLinkLoadIndex++}${hash}`);
    };

    await openAdminDeepLink("#templates");
    await expectAdminHeader(page, "Templates", "Admin / Composition / Templates");
    await expect(page.getByText(/Mustache templates|voice scaffolds/i)).toBeVisible();

    await openAdminDeepLink("#slots");
    await expectAdminHeader(page, "Slots", "Admin / Composition / Slots");
    await expect(page.getByRole("button", { name: /Editable slot rows/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Needs rows" })).toBeVisible();

    await openAdminDeepLink("#vocabulary");
    await expectAdminHeader(page, "Vocabulary & Phrases", "Admin / Composition / Vocabulary & phrases");
    await expect(page.getByRole("tablist", { name: "Vocabulary categories" }).getByRole("tab", { name: "Planets" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Vocabulary categories" }).getByRole("tab", { name: "Relationship" })).toBeVisible();

    await openAdminDeepLink("#fallback-hooks");
    await expectAdminHeader(page, "Fallback Hooks", "Admin / Composition / Fallback hooks");
    await expect(page.locator("main.admin-dashboard")).toContainText(/Sky|Natal|Lunar Calendar|Settings|Friends/);

    await openAdminDeepLink("#surface-map");
    await expectAdminHeader(page, "Surface Map", "Admin / Composition / Surface map");
    await expect(page.getByText(/reader surface directory|mapped surfaces/i).first()).toBeVisible();

    await assertNoBrowserErrors();
  });

  test("admin responsive web and mobile views stay readable", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await mkdir(adminScreenshotDir, { recursive: true });
    await seedAdminApi(page);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expectAdminRouteLoads(page, "/admin/content");
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await expectNoHorizontalOverflow(page, "Admin desktop home");
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "desktop-review-queue.png") });

    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Content Library" }).click();
    await expect(page.locator("main.admin-dashboard")).not.toContainText(forbiddenReaderPreviewCopy);
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "desktop-exact-content.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await expectAdminRouteLoads(page, "/admin/content");
    await expect(page.getByRole("navigation", { name: "Content operations" })).toBeVisible();
    await expectAdminHeader(page, "Review Queue", "Admin / Publish / Review queue");
    await expectNoHorizontalOverflow(page, "Admin mobile home");
    await expect(page.getByRole("button", { name: "Studio Home" })).toHaveCount(0);
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "mobile-review-queue.png") });

    await assertNoBrowserErrors();
  });
});
