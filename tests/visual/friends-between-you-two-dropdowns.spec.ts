import { expect, test, type Page } from "@playwright/test";

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
    if (url.pathname.endsWith("/generated-content") && body) {
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
    if (url.pathname.endsWith("/generated-content") && route.request().method() === "GET" && !url.searchParams.get("contentKey")) {
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
  await expect(map.getByRole("heading", { level: 3, name: "Chiron sextile your Sun" })).toBeVisible();
  await expect(map).toContainText("Chiron sextile fixture opening.");
  await expect(planet).toHaveValue("chiron");
  await expect(aspect).toHaveValue("sextile");

  // Changing the planet must reload the map onto that pairing, keeping the aspect.
  await planet.selectOption("mars");
  await expect(map.getByRole("heading", { level: 3, name: "Mars sextile your Sun" })).toBeVisible();
  await expect(map).toContainText("Mars sextile fixture opening.");
  await expect(map).not.toContainText("Chiron sextile fixture opening.");
  await expect(aspect).toHaveValue("sextile");

  // Changing the aspect must do the same, and not leave the previous opening on
  // screen under the next click.
  await aspect.selectOption("trine");
  await expect(map.getByRole("heading", { level: 3, name: "Mars trine your Sun" })).toBeVisible();
  await expect(map).toContainText("Mars trine fixture opening.");
  await expect(map).not.toContainText("Mars sextile fixture opening.");
  await expect(planet).toHaveValue("mars");

  // The section cards below are how an editor opens the row, so they must name the
  // pairing the map is showing rather than the one it started on.
  const sections = page.getByRole("region", { name: "Friends Transits sections" });
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
