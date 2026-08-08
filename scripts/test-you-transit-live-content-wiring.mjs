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
assert.match(app, /generatedContent: personalTransitGeneratedContent\.get\(personalizedContentKey\) \?\? null/u);
assert.match(app, /if \(nextContent\.has\(contentKey\)\) \{\s+continue;/u);

console.log("You transit articles serve only matching LIVE generated rows and retain the authored fallback.");
