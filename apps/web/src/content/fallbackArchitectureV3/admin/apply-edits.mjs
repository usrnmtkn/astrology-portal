// Applies a my-copy-edits.json file (exported from content-book.html) to the package rows.
// Usage: node admin/apply-edits.mjs my-copy-edits.json
import fs from "node:fs"; import path from "node:path"; import url from "node:url";
const here = path.dirname(url.fileURLToPath(import.meta.url));
const edits = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const rowsP = path.join(here, "../source-rows/fallback-source-rows-v3.json");
const libP = path.join(here, "../source-rows/transit-synastry-rows-v1.json");
const skyAspectPhrasebookP = path.join(here, "../source-rows/sky-aspect-phrasebook-v1.json");
const rows = JSON.parse(fs.readFileSync(rowsP, "utf8"));
const lib = JSON.parse(fs.readFileSync(libP, "utf8"));
const skyAspectPhrasebook = JSON.parse(fs.readFileSync(skyAspectPhrasebookP, "utf8"));
let n = 0, miss = [];
for (const e of edits) {
  const clean = e.text.replace(/—|–/g, ";").replace(/\s+/g, " ").trim();
  const hook = rows.hookRows.find(r => r.contentKey === e.contentKey);
  const skyAspectHook = skyAspectPhrasebook.hookRows.find(r => r.contentKey === e.contentKey);
  const voc = rows.vocabularyRows.find(r => r.contentKey === e.contentKey);
  const card = lib.authoredCards.find(c => c.contentKey === e.contentKey);
  const NAMED = new Set(["title", "question", "headline", "keywords", "mantra", "intention", "ritual", "axis", "completion", "focus", "strategy"]);
  if (hook || skyAspectHook) {
    const targetHook = hook ?? skyAspectHook;
    if (NAMED.has(e.field)) targetHook[e.field] = clean;
    else {
      const single = targetHook.body_you === targetHook.body_they;
      if (e.field === "they") targetHook.body_they = clean; else { targetHook.body_you = clean; if (single) targetHook.body_they = clean; }
    }
    targetHook.review_status = "approved"; targetHook.approved_via = "owner edit via content book";
  } else if (voc) { voc.body = clean; voc.review_status = "approved"; voc.approved_via = "owner edit via content book"; }
  else if (card) { if (NAMED.has(e.field)) card[e.field] = clean; else card.body = clean; card.review_status = "approved_reuse"; }
  else { miss.push(e.contentKey); continue; }
  n++;
}
fs.writeFileSync(rowsP, JSON.stringify(rows, null, 2) + "\n");
fs.writeFileSync(libP, JSON.stringify(lib, null, 2) + "\n");
fs.writeFileSync(skyAspectPhrasebookP, JSON.stringify(skyAspectPhrasebook, null, 2) + "\n");
console.log("applied", n, "edits" + (miss.length ? "; NOT FOUND: " + miss.join(", ") : ""));
console.log("Now run: node tests/verify-fallback-architecture.mjs && node tests/verify-transit-synastry.mjs");
