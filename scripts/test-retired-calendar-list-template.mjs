import assert from "node:assert/strict";
import fs from "node:fs";

const authoredLibrary = JSON.parse(fs.readFileSync(
  new URL("../tldr-astro-phrasebank/final/tldr-astro-authored-library-COMPLETE.json", import.meta.url),
  "utf8"
));
const row = authoredLibrary.rows.find((candidate) => candidate.content_key === "slot-template/6O");
assert.ok(row, "The original Calendar list template must remain preserved as source material.");
assert.equal(row.retired, true, "The template must be explicitly retired so import cannot publish it LIVE.");
assert.match(row.retirement_reason, /no provider for these compact date and time slots/u);
assert.equal(row.body, "{{event_date_compact}}  {{event_title}}{{#has_exact_time}} · {{exact_time_compact}}{{/has_exact_time}}", "Retirement must not rewrite the owner-authored template.");

const aliases = fs.readFileSync(new URL("../apps/web/src/content/keyAliases.ts", import.meta.url), "utf8");
assert.doesNotMatch(aliases, /"slot-template\/6O"/u, "The retired template must not retain a reader-serving alias.");

const importer = fs.readFileSync(new URL("./apply-tldr-astro-authored-library-complete.mjs", import.meta.url), "utf8");
assert.match(importer, /row\.retired === true\) return "ARCHIVED"/u, "The authored-library import must keep retired rows archived.");
assert.match(importer, /status === "ARCHIVED" \? "reference" : "serving"/u, "Retired rows must remain in the reference lane.");

console.log("Retired Calendar list template contract passed: owner source preserved, runtime alias removed, and reimport remains archived.");
