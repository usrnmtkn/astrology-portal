#!/usr/bin/env node
import fs from "node:fs";

const appPath = "apps/web/src/App.tsx";
const visualPath = "tests/visual/client-facing-user-flows.spec.ts";
const contractPath = "scripts/test-sky-placement-exact-aspect-authority.mjs";

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Multiple ${label}`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`))];
  if (matches.length !== 1) throw new Error(`Expected one ${label}, found ${matches.length}`);
  return source.replace(pattern, replacement);
}

let app = fs.readFileSync(appPath, "utf8");
app = replaceOnce(
  app,
  "  const [contentRegistryVersion, setContentRegistryVersion] = useState(0);",
  "  const contentRegistryVersion = useContentRegistryRevision();",
  "content registry local state"
);
app = replaceOnce(
  app,
  `  useEffect(() => subscribeContentRegistry(() => {\n    setContentRegistryVersion((version) => version + 1);\n  }), []);\n\n`,
  "",
  "content registry ad-hoc subscription"
);

const builderStart = app.indexOf("function relatedSkyAspectSectionsForPlacement({");
const builderEnd = app.indexOf("\nfunction skyPlacementAspectExactMoment(", builderStart);
if (builderStart < 0 || builderEnd <= builderStart) throw new Error("Missing related Sky aspect section builder");
let builder = app.slice(builderStart, builderEnd);
const oldBuilderTail = `  const giftSection = resolvedSections.find(({ section }) => section.group === "gifts");\n  const lessonSection = resolvedSections.find(({ section }) => section.group === "lessons");\n\n  if (giftSection && lessonSection) {\n    return [giftSection, lessonSection]\n      .sort((first, second) => first.orb - second.orb)\n      .map(({ section }) => section);\n  }\n\n  return resolvedSections\n    .slice(0, 2)\n    .map(({ section }) => section);\n`;
builder = replaceOnce(
  builder,
  oldBuilderTail,
  `  return resolvedSections.map(({ section }) => section);\n`,
  "two-aspect placement cap"
);
app = app.slice(0, builderStart) + builder + app.slice(builderEnd);

app = replaceRegexOnce(
  app,
  /  const sourceGapAspectRows = isRegistryArticle[\s\S]*?\n      \}\);\n/u,
  "",
  "Sky placement source-gap rows"
);
app = replaceRegexOnce(
  app,
  /    relatedAspects: sourceGapAspectRows\.length > 0[\s\S]*?\n      : undefined,\n/u,
  "",
  "Sky placement source-gap rendering"
);

if (app.includes("setContentRegistryVersion")) throw new Error("Ad-hoc content registry setter remains");
if (builder.includes(".slice(0, 2)") || builder.includes("giftSection") || builder.includes("lessonSection")) {
  throw new Error("Two-aspect cap remains in related Sky aspect builder");
}
if (app.includes("sourceGapAspectRows")) throw new Error("Source-gap rows remain in Sky placement detail");
fs.writeFileSync(appPath, app);

let contract = fs.readFileSync(contractPath, "utf8");
contract = contract.replace(
  `assert.match(builder, /const giftSection = resolvedSections\\.find\\(\\(\\{ section \\}\\) => section\\.group === "gifts"\\);/u);\nassert.match(builder, /const lessonSection = resolvedSections\\.find\\(\\(\\{ section \\}\\) => section\\.group === "lessons"\\);/u);\nassert.match(builder, /if \\(giftSection && lessonSection\\)[\\s\\S]*return \\[giftSection, lessonSection\\][\\s\\S]*\\.map\\(\\(\\{ section \\}\\) => section\\);/u);\n`,
  `assert.match(builder, /return resolvedSections\\.map\\(\\(\\{ section \\}\\) => section\\);/u);\nassert.doesNotMatch(builder, /\\.slice\\(0, 2\\)|giftSection|lessonSection/u);\n`
);
contract = contract.replace(
  `assert.match(app, /const \\[contentRegistryVersion, setContentRegistryVersion\\] = useState\\(0\\);/u);\n`,
  `assert.match(app, /const contentRegistryVersion = useContentRegistryRevision\\(\\);/u);\nassert.doesNotMatch(app, /setContentRegistryVersion/u);\n`
);
contract = contract.replace(
  `assert.match(app, /const loadedExactRegistry = contentRegistryFor\\("sky"\\);[\\s\\S]*studio[\\s\\S]*loadedExactRegistry[\\s\\S]*!loadedExactRegistry\\.approvedExactSkyAspectCopy/u);\n`,
  `assert.match(app, /const loadedExactRegistry = contentRegistryFor\\("sky"\\);[\\s\\S]*studio[\\s\\S]*loadedExactRegistry[\\s\\S]*!loadedExactRegistry\\.approvedExactSkyAspectCopy/u);\nassert.doesNotMatch(app, /sourceGapAspectRows/u);\n`
);
fs.writeFileSync(contractPath, contract);

let visual = fs.readFileSync(visualPath, "utf8");
const insertionPoint = `  test("SKY V4 placement detail composes canonical copy with governed conditions and aspects", async ({ page }) => {`;
const newTest = `  test("Sky placement renders approved related aspects as full write-ups without source-gap rows", async ({ page }) => {\n    const assertNoClientErrors = await expectNoClientErrors(page);\n\n    await seedClientState(page, { now: "2026-09-02T16:00:00.000Z" });\n    await expectClientRouteLoads(page, "/#sky/placement/sun/virgo");\n\n    const article = page.locator(".sky-detail-article");\n    await expect(article).toBeVisible();\n    const sunLilith = article.locator(".article-related-aspects__copy").filter({ hasText: "Sun Trine Lilith" });\n    await expect(sunLilith).toBeVisible();\n    await expect(sunLilith).toContainText("You may be able to show more of who you are without preparing a defense first.");\n    await expect(article.locator(".aspect-row-list")).toHaveCount(0);\n    await assertNoClientErrors();\n  });\n\n`;
if (!visual.includes(newTest.trim())) {
  visual = replaceOnce(visual, insertionPoint, newTest + insertionPoint, "Sky V4 browser regression insertion point");
}
fs.writeFileSync(visualPath, visual);

console.log("Applied Sky related-aspect full-writeup repair.");
