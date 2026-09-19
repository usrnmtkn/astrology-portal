import { expect, test, type Page } from "@playwright/test";

const workspacePath = "/admin/content#fallback-hooks?section=friends&audience=friends&workspace=between-you-two";

// Each opening names its own pairing, so a map left behind by the previous
// selection is visible rather than merely plausible.
const openings: Record<string, string> = {
  "fallback-hook/bond-effect-sextile/chiron": "Chiron sextile fixture opening.",
  "fallback-hook/bond-effect-trine/chiron": "Chiron trine fixture opening.",
  "fallback-hook/bond-effect-sextile/mars": "Mars sextile fixture opening.",
  "fallback-hook/bond-effect-trine/mars": "Mars trine fixture opening."
};

async function isolate(page: Page) {
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
