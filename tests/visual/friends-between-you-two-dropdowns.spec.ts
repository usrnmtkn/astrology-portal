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
    await route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
  });
}

test("Between you two map is present before a reader title is typed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await isolate(page);
  await page.goto(workspacePath);

  const finder = page.getByRole("region", { name: "Find a Friends transit card" });
  await expect(finder.getByLabel("Find a Friends transit card", { exact: true })).toHaveValue("");

  const map = page.getByRole("region", { name: "Between you two composition map" });
  await expect(map.getByLabel("Transiting planet", { exact: true })).toBeVisible();
  await expect(map.getByLabel("Transit aspect", { exact: true })).toBeVisible();
  await expect(map.getByRole("heading", { level: 3, name: "Chiron sextile your Sun" })).toBeVisible();
  await expect(map).toContainText("Chiron sextile fixture opening.");
  await expect(map.getByRole("heading", { level: 3, name: "Your Sun square Name's Saturn" })).toBeVisible();

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
  const planet = map.getByLabel("Transiting planet", { exact: true });
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
