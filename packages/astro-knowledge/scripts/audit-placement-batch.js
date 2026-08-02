#!/usr/bin/env node
//
// Cross-draft sameness audit for a sky-placement batch. The linter and judge
// score one card at a time, so neither can see the batch-level failure mode:
// every card reaching for the same objects, openers, and moves (the first
// pilot put "coffee order" in 18 of 35 drafts and opened 14 hooks with "You
// catch yourself"). This audit reads out/sky-placement-drafts and flags:
//
//   - any word/phrase (3+ content words treated as phrases, plus notable
//     single objects) appearing in too many drafts
//   - repeated hook openers (first 3 words)
//   - repeated move templates (first 4 words)
//   - repeated taglines
//
// Exit 1 lists the offending draft files; delete them and re-run --batch
// (resumable) so only the flagged cells regenerate under the current prompt.
//
//   node scripts/audit-placement-batch.js [dir]

const fs = require("fs");
const path = require("path");
const { lintArticle } = require("./lint-placement-voice.js");

const root = path.join(__dirname, "..");
const dir = process.argv[2] || path.join(root, "out", "sky-placement-drafts");

// A phrase is "shared" if it appears in more than this fraction of drafts
// (minimum absolute floor keeps tiny batches from tripping on coincidence).
const SHARE_LIMIT = 0.15;
const MIN_HITS = 3;

function articleText(a) {
  return articleSegments(a)
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[‘’]/g, "'"); // keep contractions as one token
}

function articleSegments(a) {
  return [a.tagline, a.hook, a.lived, a.turn, ...(a.moves || [])].filter(Boolean);
}

// Phrases that are legitimately shared across cards and never sameness:
// the pace construction is REQUIRED by the spec (so every trigram of every
// pace label is allowlisted, plus the spelled-out variants the writers use),
// and bare idiom runs are noise.
const spec = JSON.parse(fs.readFileSync(path.join(root, "voice", "tldr-astro", "sky-placement.json"), "utf8"));
const ALLOWED_SHARED_EXACT = new Set();
const paceSources = [
  ...Object.values(spec.pace.labels),
  ...Object.entries(spec.pace.labels).map(([planet, label]) => `${planet} spends ${label} in a sign`),
  "two and a half days", "for about a month", "for about four weeks",
  "six or seven weeks", "about eighteen months", "about twenty years"
];
for (const label of paceSources) {
  const w = label.toLowerCase().replace(/[^a-z' -]/g, " ").split(/\s+/).filter(Boolean);
  for (const size of [3, 4]) {
    for (let i = 0; i + size <= w.length; i++) {
      ALLOWED_SHARED_EXACT.add(w.slice(i, i + size).join(" "));
    }
  }
}
const ALLOWED_SHARED = [
  /^for about( \S+)?$/, /^over the next$/, /^the next few$/, /^next few weeks$/,
  /^in a sign$/, /^a sign for$/, /^(a|and a) half (days?|weeks?)$/, /half days? here$/
];
const isAllowedShared = (key) => ALLOWED_SHARED_EXACT.has(key) || ALLOWED_SHARED.some((re) => re.test(key));

function main() {
  if (!fs.existsSync(dir)) {
    console.error(`No batch directory at ${dir}`);
    process.exit(2);
  }
  const drafts = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json") || f === "_summary.json") continue;
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    if (d.article) drafts.push({ file: f, cell: f.replace(".json", ""), article: d.article });
  }
  if (drafts.length < 2) {
    console.log(`Only ${drafts.length} draft(s); nothing to cross-compare.`);
    return;
  }

  const flagged = new Map(); // file -> reasons[]
  const flag = (file, reason) => {
    if (!flagged.has(file)) flagged.set(file, []);
    flagged.get(file).push(reason);
  };
  const limit = Math.max(MIN_HITS, Math.ceil(drafts.length * SHARE_LIMIT));

  // 0. re-lint every draft against the CURRENT rules. Ban lists tighten over
  //    time; a draft generated before a ban landed can sit on disk carrying
  //    now-banned copy while the cross-draft checks stay quiet (mercury-aries
  //    survived three delete rounds this way with "unsent" in its lived beat).
  for (const d of drafts) {
    const planet = d.cell.split("-").slice(0, -1).join("-") || d.cell.split("-")[0];
    const r = lintArticle({ ...d.article, planet });
    if (r.fails > 0) {
      const what = r.findings.filter((x) => x.severity === "fail").map((x) => `${x.term}${x.match ? ` "${x.match}"` : ""}`).slice(0, 3).join("; ");
      console.log(`STALE VS CURRENT RULES ${d.cell}: ${what}`);
      flag(d.file, `fails current lint (${what})`);
    }
  }

  // 1. shared trigrams across draft bodies. A trigram only counts as a
  //    "phrase" if at least TWO of its words are content words - runs of
  //    pronouns, auxiliaries, and contractions are idiom, not sameness.
  const STOP = new Set(("the a an and or but of to in on for with at by is are was be it its this that " +
    "you your we our us they them what when where who how not no so as if then than there here " +
    "it's that's you've you'd you'll you're don't doesn't can't won't isn't aren't we're i'm " +
    "get gets got like feels feel want wants been being over next few about into out up down one " +
    "will would could should may might just still even more most some any every each").split(/\s+/));
  const gramWhere = new Map();
  for (const d of drafts) {
    const words = articleText(d.article).replace(/[^a-z' -]/g, " ").split(/\s+/).filter(Boolean);
    const seen = new Set();
    for (let i = 0; i + 2 < words.length; i++) {
      const g = words.slice(i, i + 3);
      if (g.filter((w) => !STOP.has(w)).length < 2) continue;
      const key = g.join(" ");
      if (isAllowedShared(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!gramWhere.has(key)) gramWhere.set(key, []);
      gramWhere.get(key).push(d.file);
    }
  }
  for (const [gram, files] of gramWhere) {
    if (files.length >= limit) {
      console.log(`SHARED PHRASE "${gram}" in ${files.length}/${drafts.length}: ${files.map((f) => f.replace(".json", "")).join(", ")}`);
      for (const f of files) flag(f, `phrase "${gram}"`);
    }
  }

  // Small pilots need a stricter pairwise check. With six or twelve cards, a
  // phrase copied into two drafts is already visible; the 15% production-batch
  // threshold and three-hit floor would miss it. Four-word runs reduce noise
  // while still catching prompt leakage and same-planet boilerplate.
  if (drafts.length <= 12) {
    const fourGramWhere = new Map();
    for (const d of drafts) {
      const seen = new Set();
      for (const segment of articleSegments(d.article)) {
        const words = String(segment).toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' -]/g, " ").split(/\s+/).filter(Boolean);
        for (let i = 0; i + 3 < words.length; i++) {
          const g = words.slice(i, i + 4);
          if (g.filter((w) => !STOP.has(w)).length < 2) continue;
          const key = g.join(" ");
          if (isAllowedShared(key)) continue;
          if (seen.has(key)) continue;
          seen.add(key);
          if (!fourGramWhere.has(key)) fourGramWhere.set(key, []);
          fourGramWhere.get(key).push(d.file);
        }
      }
    }
    for (const [gram, files] of fourGramWhere) {
      if (files.length < 2) continue;
      console.log(`SHARED PILOT PHRASE "${gram}" in ${files.length}/${drafts.length}: ${files.map((f) => f.replace(".json", "")).join(", ")}`);
      for (const f of files) flag(f, `pilot phrase "${gram}"`);
    }
  }

  // 2. hook openers (first 3 words)
  const openers = new Map();
  for (const d of drafts) {
    const key = String(d.article.hook || "").toLowerCase().split(/\s+/).slice(0, 3).join(" ");
    if (!openers.has(key)) openers.set(key, []);
    openers.get(key).push(d.file);
  }
  for (const [opener, files] of openers) {
    if (files.length >= limit) {
      console.log(`SHARED HOOK OPENER "${opener}" in ${files.length}/${drafts.length}: ${files.map((f) => f.replace(".json", "")).join(", ")}`);
      for (const f of files.slice(1)) flag(f, `hook opener "${opener}"`); // keep the first, regen the copies
    }
  }

  // 3. move templates (first 4 words of each move)
  const moveStarts = new Map();
  for (const d of drafts) {
    for (const m of d.article.moves || []) {
      const key = String(m).toLowerCase().split(/\s+/).slice(0, 4).join(" ");
      if (!moveStarts.has(key)) moveStarts.set(key, []);
      moveStarts.get(key).push(d.file);
    }
  }
  for (const [start, files] of moveStarts) {
    const unique = [...new Set(files)];
    if (unique.length >= Math.max(2, Math.ceil(limit / 2))) {
      console.log(`SHARED MOVE "${start}..." in ${unique.length} drafts: ${unique.map((f) => f.replace(".json", "")).join(", ")}`);
      for (const f of unique.slice(1)) flag(f, `move template "${start}"`);
    }
  }

  // 4. duplicate taglines
  const tags = new Map();
  for (const d of drafts) {
    const key = String(d.article.tagline || "").toLowerCase();
    if (!key) continue;
    if (!tags.has(key)) tags.set(key, []);
    tags.get(key).push(d.file);
  }
  for (const [tag, files] of tags) {
    if (files.length > 1) {
      console.log(`DUPLICATE TAGLINE "${tag}": ${files.map((f) => f.replace(".json", "")).join(", ")}`);
      for (const f of files.slice(1)) flag(f, `duplicate tagline "${tag}"`);
    }
  }

  if (!flagged.size) {
    console.log(`\nSameness audit clean across ${drafts.length} drafts.`);
    return;
  }
  console.log(`\n${flagged.size}/${drafts.length} drafts flagged for regeneration. Delete and re-run --batch:`);
  const files = [...flagged.keys()].sort();
  for (const f of files) console.log(`  ${f}  (${[...new Set(flagged.get(f))].slice(0, 3).join("; ")})`);
  console.log(`\n  cd ${path.relative(process.cwd(), dir) || "."} && rm ${files.join(" ")}`);
  process.exit(1);
}

main();
