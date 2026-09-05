#!/usr/bin/env node
import fs from "node:fs";

const filePath = "tests/visual/client-facing-user-flows.spec.ts";
let source = fs.readFileSync(filePath, "utf8");
const startMarker = '  test("Calendar Day and Month preserve the approved sign-specific Sky aspect override", async ({ page }) => {';
const endMarker = '\n  test("calendar reserves the Full Moon title for the exact lunation day", async ({ page }) => {';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error("Could not locate stale Calendar sign-specific authority regression.");
}

const replacement = `  test("Calendar Day and Month keep canonical exact Sky aspect copy authoritative", async ({ page }) => {
    const assertNoClientErrors = await expectNoClientErrors(page);
    const generatedAspectContentKey = "sky.aspect.venus.square.mars.virgo.gemini";
    const signSpecificContentKey = "fallback-hook/sky-aspect-sign/venus/virgo/square/mars/gemini";
    const exactBody = (JSON.parse(readFileSync(
      path.resolve("packages/astro-knowledge/data/transits/venus-square-mars.json"),
      "utf8"
    )) as { readerCopy?: { body?: string } }).readerCopy?.body;
    const signSpecificBody = skyAspectPhrasebook.hookRows.find(
      ({ contentKey }) => contentKey === signSpecificContentKey
    )?.body_you;

    expect(exactBody).toBeTruthy();
    expect(signSpecificBody).toBeTruthy();
    expect(exactBody).not.toBe(signSpecificBody);
    if (!exactBody || !signSpecificBody) {
      throw new Error("Expected both canonical exact and legacy sign-specific Venus square Mars fixtures.");
    }

    await seedClientState(page, {
      now: "2026-07-30T12:00:00.000Z",
      generatedInterpretations: [{
        id: "calendar-sky-aspect-row",
        content_key: generatedAspectContentKey,
        surface: "sky",
        mode: "article",
        status: "LIVE",
        lane: "serving",
        review_state: null,
        event_type: "sky_aspect",
        target_date: null,
        facts: {},
        source_snapshot: {
          skyAspectVoiceLint: { score: 3, fails: 0 },
          pairSource: "data/pairs/venus-mars.json",
          pairKey: "venus-mars",
          cardFacts: {
            a: "venus",
            b: "mars",
            aspect: "square",
            signA: "virgo",
            signB: "gemini"
          }
        },
        headline: "Venus square Mars",
        summary: null,
        body: "This generated row must remain behind the canonical exact Sky passage.",
        sections: {},
        block_type: "sky_aspect",
        flags: [],
        provider: "qa",
        judge_score: 3,
        judge_gate: "auto-publish",
        model: null,
        updated_at: "2026-07-30T12:00:00.000Z"
      }]
    });
    await expectClientRouteLoads(page, "/#calendar");

    const selectedDay = page.getByLabel("Selected lunar day");
    const aspectDay = page.getByLabel("Selected week").getByRole("button", {
      name: /Full Moon\\. Moon in Aquarius\\. Venus square Mars/
    });
    await aspectDay.click();
    await expect(selectedDay.getByRole("button", { name: "Venus square Mars" })).toBeVisible({ timeout: 15_000 });
    await expect(selectedDay.locator(".lunar-selected-card__aspect-writeup")).toHaveText(exactBody);
    await expect(selectedDay.locator(".lunar-selected-card__aspect-writeup")).not.toHaveText(signSpecificBody);

    const monthTab = page.getByRole("tab", { name: "Month", exact: true });
    await monthTab.click();
    await expect(monthTab).toHaveAttribute("aria-selected", "true");
    await expect(selectedDay.locator(".lunar-selected-card__aspect-writeup")).toHaveText(exactBody, {
      timeout: 15_000
    });
    await expect(selectedDay.locator(".lunar-selected-card__aspect-writeup")).not.toHaveText(signSpecificBody);
    await expect(selectedDay).not.toContainText("and for the collective");
    await assertNoClientErrors();
  });
`;

source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
fs.writeFileSync(filePath, source);
console.log("Updated Calendar exact-authority browser regression.");
