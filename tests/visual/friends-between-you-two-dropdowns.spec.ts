import { expect, test, type Page } from "@playwright/test";
import { studioApiStore } from "../helpers/studio-api-store";

const workspacePath = "/admin/content#fallback-hooks?section=friends&audience=friends&workspace=between-you-two";

// Each passage names its own pairing, so a map left behind by the previous
// selection is visible rather than merely plausible.
const savedCopy: Record<string, string> = {
  "fallback-hook/bond-effect-sextile/chiron": "Chiron sextile fixture opening.",
  "fallback-hook/bond-effect-trine/chiron": "Chiron trine fixture opening.",
  "fallback-hook/bond-effect-sextile/mars": "Mars sextile fixture opening.",
  "fallback-hook/bond-effect-trine/mars": "Mars trine fixture opening.",
  "fallback-hook/synastry-pair/sun/saturn/square": "Sun square Saturn fixture activation."
};

/** The library reads which pairings exist from saved rows, so the fixture lists them. */
function savedRows(openings: Record<string, string>) {
  return Object.entries(openings).map(([contentKey, body], index) => ({
    id: `fixture-${index}`, content_key: contentKey, headline: contentKey, summary: null, body,
    surface: "relationship", mode: "in_depth", status: "LIVE", lane: "serving", review_state: null,
    block_type: "fallback_hook", event_type: "fallback-hook", provider: "tldrastro-fallback-architecture-v3",
    facts: { fallbackArchitectureV3: true, content_role: "fallback_hook", review_status: "approved_reuse" },
    source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", content_role: "fallback_hook", review_status: "approved_reuse" },
    sections: { packageRecord: { contentKey, body_you: body, body_they: `${body} Friend view.` } },
    updated_at: "2026-09-19T00:00:00.000Z", target_date: null
  }));
}

async function isolate(page: Page, openings: Record<string, string> = savedCopy) {
  await page.addInitScript(() => {
    localStorage.setItem("tldrastro:contentAdminSecret", "friends-dropdown-fixture");
    localStorage.setItem("tldrastro:studio-theme", "light");
  });
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const contentKey = url.searchParams.get("contentKey") ?? "";
    const body = openings[contentKey];
    if (url.pathname.endsWith("/package-source") && body) {
      return route.fulfill({
        json: {
          ok: true,
          rows: [],
          // The preview opens on the friend voice, so both bodies carry the same
          // identifying sentence and the assertions hold whichever one renders.
          packageSource: { contentKey, body_you: body, body_they: `${body} Friend view.` },
          nextCursor: null
        }
      });
    }
    if ((url.pathname.endsWith("/generated-content") || url.pathname.endsWith("/generated-content-inventory")) && route.request().method() === "GET" && !url.searchParams.get("contentKey")) {
      return route.fulfill({ json: { ok: true, rows: savedRows(openings), nextCursor: null } });
    }
    await route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
  });
}

test("Between you two opens on a saved pairing with dropdowns to change", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await isolate(page);
  await page.goto(workspacePath);

  // Arriving with nothing typed used to render no map at all, so there were no
  // dropdowns to adjust until the owner typed an exact reader title.
  const map = page.getByRole("region", { name: "Between you two composition map" });
  await expect(map.getByLabel("Preview transiting planet", { exact: true })).toBeVisible();
  await expect(map.getByLabel("Transit aspect", { exact: true })).toBeVisible();

  // The pairing it opens on is a real row that renders its saved copy, so the map
  // is readable on arrival rather than an empty frame around dropdowns.
  const chosen = await map.getByLabel("Preview transiting planet", { exact: true }).inputValue();
  const chosenAspect = await map.getByLabel("Transit aspect", { exact: true }).inputValue();
  const openingKey = `fallback-hook/bond-effect-${chosenAspect}/${chosen}`;
  expect(Object.keys(savedCopy)).toContain(openingKey);
  await expect(map).toContainText(savedCopy[openingKey]);

  // The title field describes the same selection as the map rather than sitting empty
  // beside a populated composition.
  const title = page.getByRole("region", { name: "Find a Friends transit card" })
    .getByLabel("Find a Friends transit card", { exact: true });
  await expect(title).toHaveValue(new RegExp(`^${chosen} ${chosenAspect}`, "iu"));
  await expect(page).toHaveURL(/q=/u);

  // Clearing the field leaves it clear, so it stays usable for typing a new title.
  await title.fill("");
  await expect(title).toHaveValue("");
  await title.fill("Mars");
  await expect(title).toHaveValue("Mars");

  // A pairing the owner chose is never replaced by the default.
  await map.getByLabel("Preview transiting planet", { exact: true }).selectOption("mars");
  await expect(map.getByLabel("Preview transiting planet", { exact: true })).toHaveValue("mars");
  await expect(map).toContainText("Mars ");

  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/friends-between-you-two-default-pairing.png" });
});

test("A pairing in the route opens instead of the default", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await isolate(page);
  await page.goto(`${workspacePath}&q=Mars+trine+your+Sun`);

  // Seeding the field must never overwrite a pairing the owner arrived with.
  const map = page.getByRole("region", { name: "Between you two composition map" });
  await expect(map.getByLabel("Preview transiting planet", { exact: true })).toHaveValue("mars");
  await expect(map.getByLabel("Transit aspect", { exact: true })).toHaveValue("trine");
  await expect(map).toContainText("Mars trine fixture opening.");
  await expect(page.getByRole("region", { name: "Find a Friends transit card" })
    .getByLabel("Find a Friends transit card", { exact: true })).toHaveValue("Mars trine your Sun");

  expect(errors).toEqual([]);
});

test("Between you two composition follows its own dropdowns", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await isolate(page);
  await page.goto(workspacePath);

  const finder = page.getByRole("region", { name: "Find a Friends transit card" });
  await finder.getByLabel("Find a Friends transit card", { exact: true }).fill("Chiron sextile your Sun");

  const map = page.getByRole("region", { name: "Between you two composition map" });
  const planet = map.getByLabel("Preview transiting planet", { exact: true });
  const aspect = map.getByLabel("Transit aspect", { exact: true });
  await expect(map.getByRole("heading", { level: 3, name: "Chiron sextile Name's Sun" })).toBeVisible();
  await expect(map).toContainText("Chiron sextile fixture opening.");
  await expect(planet).toHaveValue("chiron");
  await expect(aspect).toHaveValue("sextile");

  // Changing the planet must reload the map onto that pairing, keeping the aspect.
  await planet.selectOption("mars");
  await expect(map.getByRole("heading", { level: 3, name: "Mars sextile Name's Sun" })).toBeVisible();
  await expect(map).toContainText("Mars sextile fixture opening.");
  await expect(map).not.toContainText("Chiron sextile fixture opening.");
  await expect(aspect).toHaveValue("sextile");

  // Changing the aspect must do the same, and not leave the previous opening on
  // screen under the next click.
  await aspect.selectOption("trine");
  await expect(map.getByRole("heading", { level: 3, name: "Mars trine Name's Sun" })).toBeVisible();
  await expect(map).toContainText("Mars trine fixture opening.");
  await expect(map).not.toContainText("Mars sextile fixture opening.");
  await expect(planet).toHaveValue("mars");

  // The section cards below are how an editor opens the row, so they must name the
  // pairing the map is showing rather than the one it started on.
  const sections = page.getByRole("region", { name: "Friends Transits sections" });
  await page.getByText("Section and source details", { exact: true }).click();
  await sections.getByText("About these sections", { exact: true }).click();
  await expect(sections.getByText("fallback-hook/bond-effect-trine/mars", { exact: true })).toBeVisible();
  await expect(sections.getByText("fallback-hook/bond-effect-sextile/chiron", { exact: true })).toHaveCount(0);

  expect(errors).toEqual([]);
  await map.screenshot({ path: "test-results/friends-between-you-two-dropdowns.png" });
});

test("Between you two map re-reads a passage the owner just saved", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const store = { ...savedCopy };
  await isolate(page, store);
  await page.goto(workspacePath);
  await page.getByRole("region", { name: "Find a Friends transit card" })
    .getByLabel("Find a Friends transit card", { exact: true }).fill("Chiron sextile your Sun");

  const map = page.getByRole("region", { name: "Between you two composition map" });
  await expect(map).toContainText("Chiron sextile fixture opening.");
  await expect(map).toContainText("Sun square Saturn fixture activation.");

  // Saving changes neither the selection nor the lookup, so before this fix the map
  // kept showing the copy it read on arrival while the reader already had the edit.
  store["fallback-hook/bond-effect-sextile/chiron"] = "Chiron sextile opening after the edit.";
  store["fallback-hook/synastry-pair/sun/saturn/square"] = "Sun square Saturn activation after the edit.";
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("tldrastro:content-update", {
      detail: { contentKey: "fallback-hook/synastry-pair/sun/saturn/square", published: true, updatedAt: new Date().toISOString() }
    }));
  });

  await expect(map).toContainText("Chiron sextile opening after the edit.");
  await expect(map).toContainText("Sun square Saturn activation after the edit.");
  await expect(map).not.toContainText("Chiron sextile fixture opening.");
  await expect(map).not.toContainText("Sun square Saturn fixture activation.");

  expect(errors).toEqual([]);
});

test("Saved relationship copy uses the selected name in both preview audiences after reload", async ({ page }) => {
  const opening = "{{holder1}} wants the bigger version of the plan while you are figuring out what it actually costs. The idea may be good. The disagreement starts around how much money, time, or effort the two of you can realistically give it.";
  await isolate(page, { ...savedCopy, "fallback-hook/bond-effect-opposition/jupiter": opening });
  await page.goto(`${workspacePath}&q=Jupiter+opposite+their+Sun`);
  const map = page.getByRole("region", { name: "Between you two composition map" });
  for (const afterReload of [false, true]) {
    if (afterReload) await page.reload();
    await expect(map.getByRole("heading", { level: 3, name: "Jupiter opposite Name's Sun" })).toBeVisible();
    await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toHaveText(`${opening.replaceAll("{{holder1}}", "Name")} Friend view.`);
    await map.getByText("Preview details", { exact: true }).click();
    await map.getByLabel("Preview friend name").fill("Example Friend");
    await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toContainText("Example Friend wants the bigger version");
    await expect(map).toContainText("Jupiter in Libra in Example Friend's 5th house is opposite their natal Sun in Gemini.");
    await expect(map).not.toContainText("Only use their name when pronouns would make the sentence ambiguous.");
    await map.getByLabel("Opening audience").selectOption("you");
    await expect(map.getByRole("heading", { level: 3, name: "Jupiter opposite your Sun" })).toBeVisible();
    await map.getByLabel("Opening audience").selectOption("they");
  }
});

test("Friends section navigation opens one workspace at a time", async ({ page }) => {
  await isolate(page);
  await page.goto("/admin/content#sky-writeups?view=transits-to-natal&audience=friends&transit=chiron&aspect=sextile&natal=sun");
  const sections = page.getByRole("navigation", { name: "Friends Transits sections" });
  await expect(sections.getByRole("button", { name: "Active for {{Name}}", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Transiting planet", { exact: true })).toHaveValue("chiron");
  await expect(page.getByRole("region", { name: "Between you two compiled write-up" })).toHaveCount(0);
  await page.getByLabel("Transiting planet", { exact: true }).selectOption("mars");
  await page.getByLabel("Transit to natal aspect", { exact: true }).selectOption("trine");
  await sections.getByRole("button", { name: "Between you two", exact: true }).click();
  await expect(page.getByRole("region", { name: "Between you two composition map" })).toContainText("Mars trine fixture opening.");
  await expect(sections.getByRole("button", { name: "Between you two", exact: true })).toHaveAttribute("aria-current", "page");
  await sections.getByRole("button", { name: "Where it lands", exact: true }).click();
  await expect(page).toHaveURL(/view=house-transits/u);
  await expect(page.getByRole("region", { name: "Between you two compiled write-up" })).toHaveCount(0);
  await expect(sections.getByRole("button", { name: "Where it lands", exact: true })).toHaveAttribute("aria-current", "page");
  await sections.getByRole("button", { name: "Active for {{Name}}", exact: true }).click();
  await expect(page).toHaveURL(/view=transits-to-natal/u);
});

test("A missing opening offers its editor without showing another saved version", async ({ page }) => {
  await isolate(page, {});
  await page.goto(`${workspacePath}&q=Chiron+sextile+your+Sun`);
  const workspace = page.getByRole("region", { name: "Between you two compiled write-up" });
  await expect(workspace.getByRole("alert")).toContainText("The opening row is not saved yet.");
  await expect(workspace.getByRole("button", { name: "Open the opening", exact: true })).toBeEnabled();
  await expect(workspace.getByText(/Opening version history/u)).toHaveCount(0);
  await expect(workspace.getByRole("button", { name: "Edit Friend opening", exact: true })).toContainText("No Friend opening saved.");
});

test("Loading and failed source reads do not expose an editable historical opening", async ({ page }) => {
  await isolate(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("contentKey") !== "fallback-hook/bond-effect-sextile/chiron") return route.fallback();
    await gate;
    return route.fulfill({ status: 503, json: { ok: false, error: "Synthetic opening source unavailable." } });
  });
  await page.goto(`${workspacePath}&q=Chiron+sextile+your+Sun`);
  const workspace = page.getByRole("region", { name: "Between you two compiled write-up" });
  await expect(workspace.getByRole("button", { name: "Open opening editor", exact: true })).toBeDisabled();
  release();
  await expect(workspace.getByRole("alert")).toContainText("Synthetic opening source unavailable.");
  await expect(workspace.getByText(/Opening version history/u)).toHaveCount(0);
});

for (const width of [1440, 390]) for (const theme of ["light", "dark"]) {
  test(`History previews keep revisions separate at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await isolate(page);
    await page.addInitScript(value => localStorage.setItem("tldrastro:studio-theme", value), theme);
    const row = savedRows(savedCopy)[0];
    const draft = { ...row.sections.packageRecord, body_you: "Current You opening, complete to the end.", body_they: "Current Friend opening, complete to the end." };
    const older = { ...draft, body_you: "Earlier You opening, complete to the end.", body_they: "Earlier Friend opening, complete to the end." };
    const sections = { ...row.sections, packageDraft: draft, dashboardEditHistory: [
      { versionId: "revision-1", editedAt: "2026-10-15T04:27:12.045Z", packageDraft: older },
      { versionId: "revision-2", editedAt: "2026-10-15T04:27:15.568Z", packageDraft: { ...older, body_they: "Another Friend revision, complete to the end." } }
    ] };
    await page.route("**/api/**", route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("contentKey") === row.content_key && !url.pathname.endsWith("/package-source")) {
        return route.fulfill({ json: { ok: true, rows: [{ ...row, sections }], nextCursor: null } });
      }
      return route.fallback();
    });
    await page.goto(`${workspacePath}&q=Chiron+sextile+your+Sun`);
    const workspace = page.getByRole("region", { name: "Between you two compiled write-up" });
    const map = workspace.getByRole("region", { name: "Between you two composition map" });
    await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toHaveText(draft.body_they);
    await expect(workspace.getByRole("combobox", { name: "Opening version", exact: true })).toHaveCount(0);
    await expect(map.getByLabel("Preview friend name")).toBeHidden();
    await expect(map.getByRole("button", { name: "Open opening editor", exact: true })).toBeEnabled();
    const history = map.getByRole("button", { name: "History", exact: true });
    await expect(history).toHaveAttribute("aria-expanded", "false");
    await expect(workspace.getByRole("region", { name: "Opening version history", exact: true })).toHaveCount(0);
    await expect(map.getByRole("group", { name: "Open Between you two opening", exact: true }).getByRole("button")).toHaveText(["Open opening editor", "History"]);
    await history.click();
    await expect(history).toHaveAttribute("aria-expanded", "true");
    const versions = workspace.getByRole("group", { name: "Opening versions" });
    await expect(versions).not.toContainText("T04:");
    await expect(versions.getByRole("button", { name: /Version 1/u })).toContainText("2026");
    await versions.getByRole("button", { name: /Version 1/u }).click();
    await expect(workspace.getByRole("status")).toContainText("Previewing an earlier version");
    await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toHaveText(older.body_they);
    await expect(map.getByRole("button", { name: "Edit You opening", exact: true })).toHaveText(older.body_you);
    await expect(map.getByRole("button", { name: "Open opening editor", exact: true })).toBeDisabled();
    await workspace.getByRole("button", { name: "Return to current version", exact: true }).click();
    await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toHaveText(draft.body_they);
    await expect(map.getByRole("button", { name: "Open opening editor", exact: true })).toBeEnabled();
    await versions.getByRole("button", { name: /Version 1/u }).click();
    await expect(map.getByRole("button", { name: "Open opening editor", exact: true })).toBeDisabled();
    await history.click();
    await expect(history).toHaveAttribute("aria-expanded", "false");
    await expect(workspace.getByRole("region", { name: "Opening version history", exact: true })).toHaveCount(0);
    await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toHaveText(draft.body_they);
    await expect(map.getByRole("button", { name: "Open opening editor", exact: true })).toBeEnabled();

    const metrics = await map.evaluate(el => {
      const primary = el.querySelector('fieldset label span')!;
      const reference = el.querySelectorAll('fieldset')[1].querySelector('label span')!;
      const type = (node: Element) => { const s = getComputedStyle(node); return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing, s.textTransform, s.textAlign]; };
      return { primary: type(primary), reference: type(reference), overflow: document.documentElement.scrollWidth - innerWidth,
        labels: Array.from(el.querySelectorAll('fieldset:first-of-type > label > span:first-child')).map(label => label.textContent),
        headingOrder: Array.from(document.querySelectorAll('.admin-main h1,.admin-main h2,.admin-main h3')).slice(0, 3).map(node => node.tagName) };
    });
    expect(metrics.primary).toEqual(metrics.reference);
    expect(metrics.labels).toEqual(["Transiting planet", "Aspect", "Your natal point"]);
    expect(metrics.headingOrder).toEqual(["H1", "H2", "H3"]);
    expect(metrics.overflow).toBeLessThanOrEqual(1);
    await map.screenshot({ path: `test-results/friends-transit-${width}-${theme}.png` });
    await page.reload();
    await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toHaveText(draft.body_they);
    await expect(history).toHaveAttribute("aria-expanded", "false");
  });
}

test("The opening editor saves through the real handler and reloads the complete current pair", async ({ page }) => {
  const initialRows = savedRows(savedCopy);
  const store = await studioApiStore(initialRows);
  const writes: number[] = [];
  try {
    await isolate(page);
    await page.route("**/api/**", async route => {
      const request = route.request(), url = new URL(request.url());
      if (!["/api/admin/generated-content", "/api/admin/generated-content-inventory"].includes(url.pathname)) return route.fallback();
      const result = await store.call({ method: request.method(), url: url.pathname + url.search,
        ...(request.method() !== "GET" ? { body: request.postDataJSON() } : {}) });
      if (request.method() !== "GET") writes.push(result.status);
      return route.fulfill({ status: result.status, json: result.payload });
    });
    await page.goto(`${workspacePath}&q=Chiron+sextile+your+Sun`);
    const map = page.getByRole("region", { name: "Between you two composition map" });
    await map.getByRole("button", { name: "Open opening editor", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Generated content editor", exact: true });
    const friend = editor.locator('textarea[data-sky-field="body_they"]');
    await expect(friend).toHaveValue("Chiron sextile fixture opening. Friend view.");
    const updated = "Complete synthetic Friend opening after the edit.\n\nThe final sentence remains saved.";
    await friend.fill(updated);
    await editor.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => writes).toEqual([200]);
    const sources = await store.call({ method: "rows" });
    const stored = sources.find((row: any) => row.content_key === initialRows[0].content_key && row.status === 'DRAFT');
    expect(stored.source_snapshot.targetRowId).toBe(initialRows[0].id);
    expect(sources.find((row: any) => row.id === initialRows[0].id)).toMatchObject({
      status: 'LIVE', updated_at: initialRows[0].updated_at, sections: { packageRecord: initialRows[0].sections.packageRecord }
    });
    expect(stored.sections.packageDraft.body_they).toBe(updated);
    expect(stored.sections.packageDraft.body_you).toBe("Chiron sextile fixture opening.");
    expect(stored.sections.packageRecord.body_you).toBe(initialRows[0].sections.packageRecord.body_you);
    expect(stored.sections.packageRecord.body_they).toBe(initialRows[0].sections.packageRecord.body_they);
    await page.reload();
    await expect(map.getByRole("button", { name: "Edit Friend opening", exact: true })).toHaveText(updated);
    await expect(map.getByRole("button", { name: "Edit You opening", exact: true })).toHaveText("Chiron sextile fixture opening.");
  } finally { store.close(); }
});
