import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const adminScreenshotDir = path.join("test-results", "content-dashboard-admin-flow");

const adminPages = [
  { nav: "Studio Home", title: "Content Studio", breadcrumb: "Admin / Home", hash: "home" },
  { nav: "Articles", title: "Articles", breadcrumb: "Admin / Write / Articles", hash: "articles" },
  { nav: "Compatibility", title: "Compatibility", breadcrumb: "Admin / Write / Compatibility", hash: "compatibility" },
  { nav: "Content Library", title: "Content Library", breadcrumb: "Admin / Write / Content library", hash: "exact-content" },
  { nav: "Composite Review", title: "Composite Review", breadcrumb: "Admin / Write / Composite review", hash: "composite-review" },
  { nav: "Templates", title: "Templates", breadcrumb: "Admin / Composition / Templates", hash: "templates" },
  { nav: "Slots", title: "Slots", breadcrumb: "Admin / Composition / Slots", hash: "slots" },
  { nav: "Vocabulary & Phrases", title: "Vocabulary & Phrases", breadcrumb: "Admin / Composition / Vocabulary & phrases", hash: "vocabulary" },
  { nav: "Fallback Hooks", title: "Fallback Hooks", breadcrumb: "Admin / Composition / Fallback hooks", hash: "fallback-hooks" },
  { nav: "Surface Map", title: "Surface Map", breadcrumb: "Admin / App surfaces / Surface map", hash: "surface-map" },
  { nav: "Review Queue", title: "Review Queue", breadcrumb: "Admin / Publish / Review queue", hash: "review-queue" },
  { nav: "Connection", title: "Connection", breadcrumb: "Admin / Connection", hash: "connection" },
  { nav: "App Behavior", title: "App Behavior", breadcrumb: "Admin / App behavior", hash: "app-behavior" },
  { nav: "Release Notes", title: "Release Notes", breadcrumb: "Admin / Release notes", hash: "release-notes" }
];

const forbiddenReaderPreviewCopy = /\b(?:Interpretation in review|Notice how this placement asks|puts first impressions, outward style|write a sentence|source framework|sourceSnapshot|templateVersion|Missing VITE|undefined|null|NaN)\b/i;

const now = "2026-07-16T12:00:00.000Z";

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
  } = {}
) {
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

    if (pathname.endsWith("/generated-content")) {
      const method = route.request().method();
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
        body: JSON.stringify({ ok: true, rows: generatedContentRows })
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

  await page.addInitScript(() => {
    window.localStorage.setItem("tldrastro:contentAdminSecret", "qa-secret");
    window.localStorage.setItem("tldrastro:slotDictionaryInfoDismissed", "true");
  });
}

async function expectNoBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    const text = message.text();

    if (message.type() === "error" && !text.includes("Failed to load resource")) {
      errors.push(text);
    }
  });

  return async () => {
    expect(errors, "No uncaught browser errors or console errors").toEqual([]);
  };
}

async function expectAdminHeader(page: Page, title: string, breadcrumb: string) {
  await expect(page.locator(".admin-dashboard-header h1")).toHaveText(title);
  await expect(page.locator(".admin-breadcrumb")).toHaveText(breadcrumb);
}

async function openAdminHome(page: Page) {
  await page.goto("/admin/content");
  await expectAdminHeader(page, "Content Studio", "Admin / Home");
}

async function openCreateMenu(page: Page) {
  await page.getByRole("button", { name: "Create", exact: true }).click();
}

async function openAdminCreateMenuHost(page: Page) {
  await page.goto("/admin/content");
  await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Slots" }).click();
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
  test("legacy content/admin path opens the admin dashboard instead of the reader app", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.goto("/content/admin");

    await expect(page.getByRole("navigation", { name: "Content operations" })).toBeVisible();
    await expectAdminHeader(page, "Content Studio", "Admin / Home");
    await expect(page.getByRole("button", { name: "TLDR Astro home" })).toHaveCount(0);

    await assertNoBrowserErrors();
  });

  test("admin shell navigates every primary dashboard surface", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.goto("/admin/content");

    await expect(page.getByRole("navigation", { name: "Content operations" })).toBeVisible();
    await expectAdminHeader(page, "Content Studio", "Admin / Home");

    for (const adminPage of adminPages) {
      await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: adminPage.nav }).click();
      await expectAdminHeader(page, adminPage.title, adminPage.breadcrumb);
      await expect(page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: adminPage.nav })).toHaveAttribute("aria-current", "page");
    }

    await assertNoBrowserErrors();
  });

  test("admin dashboard deep links restore primary surfaces, filters, and history state", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    let deepLinkLoadIndex = 0;
    const openAdminDeepLink = async (hash: string) => {
      await page.goto(`/admin/content?qaDeepLink=${deepLinkLoadIndex++}${hash}`);
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
    await expectAdminHeader(page, "Surface Map", "Admin / App surfaces / Surface map");
    await expect(page.getByRole("group", { name: "Filter surfaces by area" }).getByRole("button", { name: /Friends/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("group", { name: "Filter surfaces by normalization status" }).getByRole("button", { name: /Partial/ })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/admin/content#home");
    await expectAdminHeader(page, "Content Studio", "Admin / Home");
    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Articles" }).click();
    await expectAdminHeader(page, "Articles", "Admin / Write / Articles");
    await expect(page).toHaveURL(/\/admin\/content#articles$/);

    await page.goBack();
    await expectAdminHeader(page, "Content Studio", "Admin / Home");
    await expect(page).toHaveURL(/\/admin\/content#home$/);

    await page.goForward();
    await expectAdminHeader(page, "Articles", "Admin / Write / Articles");
    await expect(page).toHaveURL(/\/admin\/content#articles$/);

    await assertNoBrowserErrors();
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

  test("new content actions save with required admin API metadata", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    const writes: { method: string; payload: Record<string, unknown> }[] = [];
    await seedAdminApi(page, {
      onGeneratedContentWrite: (write) => {
        writes.push(write);
      }
    });

    const createCases = [
      { action: "Create article", editorHeading: "Create article", eventType: "sky_article", blockType: "sky_article", contentKey: "sky/article/new-row" },
      { action: "Create content row", editorHeading: "Author new row", eventType: "essay", blockType: "essay", contentKey: "content/manual/new-row" },
      { action: "Create reusable phrase", editorHeading: "Create reusable phrase", eventType: "vocab", blockType: "vocabulary_phrase", contentKey: "vocab/planets/create-reusable-phrase-qa-row", phraseEditor: true },
      { action: "Create template", editorHeading: "Author new row", eventType: "slot-template", blockType: "template", contentKey: "slot-template/manual/new-template" },
      { action: "Create fallback hook", editorHeading: "Author new row", eventType: "fallback-hook", blockType: "fallback_hook", contentKey: "fallback-hook/manual/new-hook" }
    ];

    await openAdminCreateMenuHost(page);

    for (const createCase of createCases) {
      await openCreateMenu(page);
      const createAction = page.getByRole("menuitem", { name: createCase.action });
      await expect(createAction).toBeVisible();
      await createAction.click({ force: true });
      const editor = page.locator(".admin-editor-panel");
      await expect(editor.getByRole("heading", { name: createCase.editorHeading })).toBeVisible();
      if (createCase.phraseEditor) {
        await editor.getByLabel("Phrase title").fill(`${createCase.action} QA row`);
        await editor.getByLabel("Reusable phrase text").fill(`${createCase.action} body copy for the dashboard admin save contract.`);
      } else {
        await expect(editor.getByLabel("Content key")).toHaveValue(createCase.contentKey);
        await editor.getByLabel("Headline").fill(`${createCase.action} QA row`);
        await editor.getByLabel("Body").fill(`${createCase.action} body copy for the dashboard admin save contract.`);
      }
      await editor.getByRole("button", { name: "Save" }).click();

      await expect.poll(() => writes.at(-1)).toMatchObject({
        method: "POST",
        payload: {
          contentKey: createCase.contentKey,
          eventType: createCase.eventType,
          blockType: createCase.blockType
        }
      });
      await openAdminCreateMenuHost(page);
    }

    await assertNoBrowserErrors();
  });

  test("content editor saves row changes through the admin API", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    let generatedContentWrite: { method: string; payload: Record<string, unknown> } | null = null;
    await seedAdminApi(page, {
      onGeneratedContentWrite: (write) => {
        generatedContentWrite = write;
      }
    });
    await page.goto("/admin/content#exact-content");

    await page.getByLabel("Search content").fill("sky.placement.sun.cancer");
    const savedRow = page.locator(".admin-content-row", { hasText: "sky.placement.sun.cancer" });
    await expect(savedRow).toHaveCount(1);
    await savedRow.getByRole("button", { name: "Edit" }).click();
    const editor = page.locator(".admin-editor-panel");
    const contentSystemPanel = editor.locator("section[aria-label='Article content system']");
    await expect(page.locator(".admin-editor-backdrop")).toBeVisible();
    await expect(editor.getByRole("heading", { name: "Edit article" })).toBeVisible();
    await expect(contentSystemPanel).toBeVisible();
    await expect(contentSystemPanel.getByText("Content Level", { exact: true })).toHaveCount(0);
    await expect(contentSystemPanel).toContainText("Authored");
    await expect(editor.getByLabel("App display source")).toHaveCount(0);
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

  test("article filters narrow by point, content system, and text search", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.goto("/admin/content#articles");

    await expectAdminHeader(page, "Articles", "Admin / Write / Articles");
    const articleFilters = page.locator("section[aria-label='Article filters']");
    await expect(articleFilters).toBeVisible();
    await expect(articleFilters.getByLabel("Article status")).toHaveValue("all");
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

  test("compatibility workspace searches, sorts, and groups content support rows", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.goto("/admin/content#compatibility");

    await expectAdminHeader(page, "Compatibility", "Admin / Write / Compatibility");
    await expect(page.getByRole("tablist", { name: "Compatibility sections" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /App card copy/ })).toContainText(/[1-9]\d*/);
    await expect(page.getByRole("tab", { name: /Simple fallbacks/ })).toContainText(/[1-9]\d*/);
    await expect(page.getByRole("tab", { name: /Reusable phrases/ })).toContainText(/[1-9]\d*/);
    await expect(page.getByRole("tab", { name: /Templates & slots/ })).toContainText(/[1-9]\d*/);

    const compatibilityFilters = page.locator("section[aria-label='Compatibility filters']");
    await expect(compatibilityFilters.getByLabel("Compatibility status")).toHaveValue("all");
    await expect(compatibilityFilters.getByLabel("Compatibility planet or point")).toHaveValue("all");
    await expect(compatibilityFilters.getByLabel("Compatibility sort")).toHaveValue("updated-desc");

    await compatibilityFilters.getByLabel("Compatibility planet or point").selectOption("sun");
    await expect(page.locator(".admin-content-row", { hasText: "compatibility.sun.aries.libra" })).toHaveCount(1);
    await expect(page.locator(".admin-content-row", { hasText: "slot-template/compatibility/planet-card" })).toHaveCount(1);

    await compatibilityFilters.getByLabel("Search compatibility").fill("aries libra");
    await expect(page.locator(".admin-content-row", { hasText: "Sun compatibility / Aries and Libra" })).toHaveCount(1);

    await page.getByRole("tab", { name: /Simple fallbacks/ }).click();
    await compatibilityFilters.getByLabel("Search compatibility").fill("");
    await expect(
      page.locator(".admin-content-row", { hasText: "fallback-hook/friends.compatibility.planet-card" }),
    ).toHaveCount(1);

    await page.getByRole("tab", { name: /Reusable phrases/ }).click();
    await compatibilityFilters.getByLabel("Compatibility planet or point").selectOption("venus");
    await expect(
      page.locator(".admin-content-row", { hasText: "vocab/relationship/compatibility-repair" }),
    ).toHaveCount(1);

    await compatibilityFilters.getByLabel("Compatibility sort").selectOption("title-asc");
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(compatibilityFilters.getByLabel("Compatibility sort")).toHaveValue("updated-desc");
    await expect(page.locator(".admin-content-row", { hasText: "compatibility.sun.aries.libra" })).toHaveCount(1);

    await page.locator(".admin-content-row", { hasText: "compatibility.sun.aries.libra" }).getByRole("button", { name: "Edit" }).click();
    await expect(page.locator(".admin-editor-panel").getByRole("heading", { name: "Edit saved row" })).toBeVisible();
    await page.locator(".admin-editor-panel").getByRole("button", { name: "Close" }).click();
    await expect(page.locator(".admin-editor-panel")).toBeHidden();

    const compatibilityShortcuts = page.locator("[aria-label='Compatibility shortcuts']");
    await compatibilityShortcuts.getByRole("button", { name: "Card copy" }).click();
    await expect(page.locator(".admin-editor-panel").getByRole("heading", { name: "Author new row" })).toBeVisible();
    await expect(page.locator(".admin-editor-panel").getByLabel("Content key")).toHaveValue("compatibility.venus.aries.libra");
    await page.locator(".admin-editor-panel").getByRole("button", { name: "Close" }).click();

    await compatibilityShortcuts.getByRole("button", { name: "Phrase", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Generated content editor" }).getByRole("heading", { name: "Create reusable phrase" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Generated content editor" }).getByLabel("Phrase section")).toHaveValue("relationship");
    await expect(page.getByRole("dialog", { name: "Generated content editor" }).getByLabel("Phrase title")).toHaveValue("Compatibility phrase");
    await page.getByRole("dialog", { name: "Generated content editor" }).getByRole("button", { name: "Close" }).click();

    await compatibilityShortcuts.getByRole("button", { name: "Fallback" }).click();
    await expect(page.locator(".admin-editor-panel").getByLabel("Content key")).toHaveValue("fallback-hook/friends.compatibility.planet-card");

    await assertNoBrowserErrors();
  });

  test("surface map filters keep visible hook rows aligned to the selected surface", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.goto("/admin/content#surface-map");

    await expectAdminHeader(page, "Surface Map", "Admin / App surfaces / Surface map");

    const areaFilters = page.getByRole("group", { name: "Filter surfaces by area" });
    const statusFilters = page.getByRole("group", { name: "Filter surfaces by normalization status" });

    await areaFilters.getByRole("button", { name: "Friends" }).click();
    await expect(page.locator(".admin-fallback-row", { hasText: "Friends > Compatibility Card" })).toHaveCount(1);
    await expect(page.locator(".admin-fallback-row", { hasText: "Lunar Calendar" })).toHaveCount(0);

    await statusFilters.getByRole("button", { name: "Complete" }).click();
    await expect(page.locator(".admin-fallback-row", { hasText: "Friends > Compatibility Card" })).toHaveCount(1);
    await expect(page.locator(".admin-fallback-row", { hasText: "Needs row" })).toHaveCount(0);

    await statusFilters.getByRole("button", { name: "Missing" }).click();
    await expect(areaFilters.getByRole("button", { name: "Friends" })).toHaveAttribute("aria-pressed", "true");
    await expect(statusFilters.getByRole("button", { name: "Missing" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".admin-fallback-row", { hasText: "Friends > Compatibility Card" })).toHaveCount(0);
    await expect(page.locator(".admin-fallback-row", { hasText: "Lunar Calendar" })).toHaveCount(0);

    await statusFilters.getByRole("button", { name: "All" }).click();
    await areaFilters.getByRole("button", { name: "Calendar" }).click();
    await expect(page.locator(".admin-fallback-row", { hasText: "Lunar Calendar" }).first()).toBeVisible();
    await expect(page.locator(".admin-fallback-row", { hasText: "Friends > Compatibility Card" })).toHaveCount(0);

    await assertNoBrowserErrors();
  });

  test("composition filters keep vocabulary, hooks, templates, and slots aligned to visible rows", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);

    await page.goto("/admin/content#vocabulary");
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

    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Fallback Hooks" }).click();
    await expectAdminHeader(page, "Fallback Hooks", "Admin / Composition / Fallback hooks");
    const friendsFallbackTab = page
      .getByRole("tablist", { name: "Fallback hook sections" })
      .getByRole("tab", { name: "Friends" });
    await friendsFallbackTab.click();
    await expect(friendsFallbackTab).toHaveAttribute("aria-selected", "true");
    await page.getByLabel("Search fallback hooks").fill("compatibility card");
    await expect(page.locator(".admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-content-row")).toContainText("fallback-hook/friends.compatibility.planet-card");

    await page.goto("/admin/content#templates");
    await expectAdminHeader(page, "Templates", "Admin / Composition / Templates");
    await page.getByLabel("Search templates").fill("compatibility planet card");
    await expect(page.locator(".admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-content-row")).toContainText("slot-template/compatibility/planet-card");

    await page.goto("/admin/content#slots");
    await expectAdminHeader(page, "Slots", "Admin / Composition / Slots");
    await page.getByLabel("Search slot-backed rows").fill("template slot");
    await expect(page.locator(".admin-content-row")).toHaveCount(1);
    await expect(page.locator(".admin-content-row")).toContainText("slot-template/compatibility/planet-card");

    await assertNoBrowserErrors();
  });

  test("content library and publish filters expose writing QA controls", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    await page.goto("/admin/content");

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

  test("composition surfaces expose templates, slots, vocabulary, fallback hooks, and surface map", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await seedAdminApi(page);
    let deepLinkLoadIndex = 0;
    const openAdminDeepLink = async (hash: string) => {
      await page.goto(`/admin/content?qaCompositionSurface=${deepLinkLoadIndex++}${hash}`);
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
    await expectAdminHeader(page, "Surface Map", "Admin / App surfaces / Surface map");
    await expect(page.getByText(/public surfaces|content paths/i)).toBeVisible();

    await assertNoBrowserErrors();
  });

  test("admin responsive web and mobile views stay readable", async ({ page }) => {
    const assertNoBrowserErrors = await expectNoBrowserErrors(page);
    await mkdir(adminScreenshotDir, { recursive: true });
    await seedAdminApi(page);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin/content");
    await expectAdminHeader(page, "Content Studio", "Admin / Home");
    await expectNoHorizontalOverflow(page, "Admin desktop home");
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "desktop-content-studio.png") });

    await page.getByRole("navigation", { name: "Content operations" }).getByRole("button", { name: "Content Library" }).click();
    await expect(page.locator("main.admin-dashboard")).not.toContainText(forbiddenReaderPreviewCopy);
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "desktop-exact-content.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/content");
    await expect(page.getByRole("navigation", { name: "Content operations" })).toBeVisible();
    await expectAdminHeader(page, "Content Studio", "Admin / Home");
    await expectNoHorizontalOverflow(page, "Admin mobile home");
    await expect(page.locator(".admin-studio-map").first()).toHaveCSS("grid-template-columns", /^(?:\d+(?:\.\d+)?px)$/);
    await page.screenshot({ animations: "disabled", fullPage: true, path: path.join(adminScreenshotDir, "mobile-content-studio.png") });

    await assertNoBrowserErrors();
  });
});
