import assert from "node:assert/strict";
import fs from "node:fs";

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
assert.match(
  app,
  /const readerAspectRows = aspectRows\.flatMap[\s\S]*?normalizedSurfaceHasReaderDetail\(normalizedTransit\) \|\| hasReaderFacingGeneratedCopy\(savedGeneratedContent\)[\s\S]*?\? \[\{ normalizedTransit, personalizedContentKey, savedGeneratedContent, transit \}\][\s\S]*?: \[\]/u,
  "The You updates list must omit a transit whose detail has neither approved authored sections nor saved generated copy."
);
assert.match(
  app,
  /if \(!detailAvailable\) \{[\s\S]*?<article className="daily-forecast-label daily-forecast-label--static"/u,
  "A behind-the-forecast label without detail copy must be static instead of opening a heading-only article."
);
assert.match(
  app,
  /if \(!normalizedSurfaceHasReaderDetail\(normalizedHouseTransit\)\) \{\s*return \[\];\s*\}/u,
  "A house-transit row without reader detail must not open an empty article."
);
assert.match(
  app,
  /\{readSection && readParagraphs\.length > 0 \? \(\s*<article className="read-closely">/u,
  "The legacy transit detail panel must not render an empty Read it closely card."
);

console.log("You transit articles serve only matching LIVE or approved authored detail and never open heading-only pages.");
