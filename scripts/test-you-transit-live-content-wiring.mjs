import assert from "node:assert/strict";
import fs from "node:fs";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const loader = fs.readFileSync("apps/web/src/services/userGeneratedContent.ts", "utf8");
const page = fs.readFileSync("apps/web/src/features/you/YouPage.tsx", "utf8");
const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");

assert.match(loader, /\.eq\("status", "LIVE"\)/u);
assert.match(loader, /\.eq\("content_key", contentKey\)/u);
assert.match(loader, /query = targetDate \? query\.eq\("target_date", targetDate\)/u);
assert.match(page, /article\.generatedContent\?\.status === "LIVE"/u);
assert.match(page, /generatedContentParagraphs\(/u);
assert.match(page, /generatedContentSections\(generated\)/u);
assert.match(app, /generatedContent: savedGeneratedContent/u);
assert.match(app, /if \(nextContent\.has\(contentKey\)\) \{\s+continue;/u);
assert.match(app, /const readerAspectRows = \[\.\.\.dailyAspectGroups, \.\.\.backgroundAspectGroups\]\.map/u,
  "Calculated transit rows remain visible when prose is unavailable.");
assert.equal((app.match(/const Row = detailAvailable \? "button" : "article"/gu) ?? []).length, 1,
  "House transit rows without detail remain static facts.");
assert.equal((app.match(/onClick=\{detailAvailable \? openArticle : undefined\}/gu) ?? []).length, 1);
assert.match(app, /href=\{detailAvailable \?/u, "Personal transit links require reader detail.");
const card = fs.readFileSync("apps/web/src/components/PersonalTransitCard.tsx", "utf8");
assert.match(card, /: <article className=\{className\}/u, "A personal transit without reading copy remains a static card.");
assert.match(
  app,
  /if \(!detailAvailable\) \{[\s\S]*?<article className="daily-forecast-label daily-forecast-label--static"/u,
  "A behind-the-forecast label without detail copy must be static instead of opening a heading-only article."
);
assert.match(
  app,
  /\{readSection && readParagraphs\.length > 0 \? \(\s*<article className="read-closely">/u,
  "The legacy transit detail panel must not render an empty Read it closely card."
);

fs.mkdirSync("test-results", { recursive: true });
const directory = fs.mkdtempSync("test-results/personal-transit-card-");
try {
  const output = `${directory}/card.mjs`;
  await build({ entryPoints: ["apps/web/src/components/PersonalTransitCard.tsx"], outfile: output,
    bundle: true, format: "esm", platform: "node", packages: "external", jsx: "automatic", logLevel: "silent" });
  const { PersonalTransitCard } = await import(pathToFileURL(`${process.cwd()}/${output}`).href);
  const aspectName = "Moon in Capricorn trine your natal Saturn";
  const body = "Synthetic CMS opening. The complete synthetic final sentence remains available.";
  const props = { aspect: "trine", planet: "Moon", aspectName, time: "Exact 2:37 PM EST", orb: "1° 17′", body,
    href: "/?personalTransit=fixture#you", onOpen() {}, background: false };
  for (const headline of [undefined, aspectName, "Synthetic CMS headline"]) {
    const html = renderToStaticMarkup(createElement(PersonalTransitCard, { ...props, headline }));
    assert.equal((html.match(/<h3\b/gu) ?? []).length, 1);
    assert.match(html, new RegExp(`<h3[^>]*>${headline || aspectName}</h3>`, "u"));
    assert.equal(html.includes('class="personal-transit-card__aspect-name"'), Boolean(headline && headline !== aspectName));
    assert.equal((html.match(new RegExp(aspectName, "gu")) ?? []).length, 2, "The identity appears once in visible copy and once in machine metadata.");
    assert.match(html, /Exact 2:37 PM EST<span aria-hidden="true"> · <\/span><span class="updates-aspect-row__orb">1° 17′<\/span><\/span>/u);
    assert.ok(html.includes(body), "The card preserves the complete CMS body; CSS handles its visible excerpt.");
    assert.equal((html.match(/<a\b/gu) ?? []).length, 1);
    assert.doesNotMatch(html, /<button\b/u);
  }
  const staticCard = renderToStaticMarkup(createElement(PersonalTransitCard, { ...props, href: undefined }));
  assert.match(staticCard, /^<article\b/u);
  assert.doesNotMatch(staticCard, /<a\b|card-read-more/u);
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
console.log("You transit cards preserve CMS copy, render one title and fixed timing/orb, and link only to available readings.");
