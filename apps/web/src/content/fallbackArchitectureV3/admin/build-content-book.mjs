// Builds content-book.html: every row of reader copy, readable and editable in a browser.
// Rebuild any time with: node admin/build-content-book.mjs
import fs from "node:fs"; import path from "node:path"; import url from "node:url";
const here = path.dirname(url.fileURLToPath(import.meta.url));
const rows = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/fallback-source-rows-v3.json"), "utf8"));
const bondLanguagePass2 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/bond-language-pass-2.json"), "utf8"));
const pairDailyFramesV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/pair-daily-frames-v1.json"), "utf8"));
const pairDailyClausesV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/pair-daily-clauses-v1.json"), "utf8"));
const skyArticleV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-article-v1.json"), "utf8"));
const skyAspectPhrasebookV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-aspect-phrasebook-v1.json"), "utf8"));
const skyPlacementVoicePassV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-placement-inventories-voice-pass-v1.json"), "utf8"));
const skyPlacementOwnerApprovedFallbacksV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-placement-owner-approved-fallbacks-v1.json"), "utf8"));
const skyPlanetFramesV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-planet-frames-v1.json"), "utf8"));
const skySignCopySunV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sky-sign-copy-sun-v1.json"), "utf8"));
const sunLeoHouseCoresV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/sun-leo-house-cores-v1.json"), "utf8"));
const venusLibraHouseCoresV1 = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/venus-libra-house-cores-v1.json"), "utf8"));
const lib = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/transit-synastry-rows-v1.json"), "utf8"));
// [section name, matcher, plain-language "where this goes", optional example builder]
const SECTIONS = [
  ["Your authored cards (verbatim)", k => k.startsWith("authored/") || k.startsWith("sky-article/"),
   "These are your own write-ups. They show to readers word for word, and always win over generated copy."],
  ["Natal: planet meanings", k => /^fallback-hook\/(planet-intro|planet-best|natal-core)\//.test(k) || /^fallback-vocab\/planet-(topic|core|excess|productive|verb)\//.test(k)],
  ["Natal: planet in sign", k => k.startsWith("fallback-hook/placement-sentence/")],
  ["Natal: planet in house", k => k.startsWith("fallback-hook/placement-house-sentence/") || k.startsWith("fallback-hook/house-meaning/")],
  ["Natal: angles (Rising, MC, DC, IC)", k => k.startsWith("fallback-hook/angle-")],
  ["Natal: aspects", k => k.startsWith("fallback-hook/aspect-") || k.startsWith("fallback-hook/transit-aspect-type/")],
  ["Natal: empty houses", k => k.startsWith("fallback-hook/empty-house") || k.startsWith("fallback-hook/house-cusp/")],
  ["Profection years", k => k.startsWith("fallback-hook/profection-")],
  ["Transits: effect lines + variants", k => k.startsWith("fallback-hook/transit-effect-")],
  ["Transits: retrogrades", k => k.startsWith("fallback-hook/transit-retro")],
  ["Synastry + compatibility", k => k.startsWith("fallback-hook/synastry-") || k.startsWith("fallback-hook/planet-mode/") || k.startsWith("fallback-hook/planet-grates/") || k.startsWith("fallback-hook/compat-") || k.startsWith("fallback-hook/element-pattern/")],
  ["Connection transits (bonds)", k => k.startsWith("fallback-hook/bond-") || k.startsWith("fallback-vocab/bond-")],
  ["Sky page: reviewed aspect phrasebook", k => k.startsWith("fallback-hook/sky-aspect-")],
  ["Sky page: placements + articles", k => k.startsWith("fallback-hook/sky-placement") || k.startsWith("fallback-hook/sky-sign-copy/") || k.startsWith("house-horoscope-core/") || k.startsWith("fallback-hook/sky-element-close/") || /^fallback-vocab\/(planet-blessing|sign-blessing|sign-does|sign-style|sign-need|sign-adverb)\//.test(k)],
  ["Sky page: seasons, lunations, eclipses", k => /^fallback-hook\/sky-(season|lunation|axis|fullmoon|newmoon|eclipse|sign-trap|event|horoscope)/.test(k)],
  ["Calendar: phases, void, markers", k => k.startsWith("fallback-hook/moon-") || k.startsWith("fallback-hook/season-marker/")],
  ["Friends Circle feed", k => k.startsWith("fallback-hook/circle-")],
  ["Today between you two (pair daily) — approved 2026-08-06", k => k.startsWith("fallback-hook/pair-daily/"),
   "Connective frames for the daily pair paragraph on a friend's Compatibility tab. {readerClause}/{friendClause} fill from your approved daily At-a-Glance lines; {friendHandle} is the friend's @handle; {bondClause} is the active connection transit's effect line. Nothing serves until you approve the exact wording."],
  ["Everything else (labels, houses, misc.)", () => true],
];
import { renderNatalPlacement, renderNatalAngle, renderNatalAspect, renderNatalEmptyHouse, renderProfectionYear } from "../resolver/renderFallback.mjs";
import { renderTransitAspect, renderSynastryAspect, renderBondTransit, renderSkyPlacement, renderSkyAspectCard, renderSkyLunation, renderCalendarPhase, renderCircleStory } from "../resolver/renderTransitSynastry.mjs";
const esc0 = s => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const para = r => (r.parts ?? [r.body]).map(x => `<p>${esc0(x)}</p>`).join("");
const O = { allowUnreviewed: true };
const EXAMPLES = {
  "Natal: planet meanings": para(renderNatalPlacement({ planet: "chiron", sign: "scorpio", house: 8, voice: "you" }, O)),
  "Natal: planet in sign": para(renderNatalPlacement({ planet: "venus", sign: "aries", voice: "you" }, O)),
  "Natal: angles (Rising, MC, DC, IC)": para(renderNatalAngle({ angle: "ascendant", sign: "gemini", voice: "you" }, O)),
  "Natal: aspects": para(renderNatalAspect({ planetA: "sun", planetB: "moon", aspect: "square", voice: "you" }, O)),
  "Natal: empty houses": para(renderNatalEmptyHouse({ house: 8, sign: "pisces", rulerSign: "capricorn", rulerHouse: 6, voice: "Sofia" }, O)),
  "Profection years": para(renderProfectionYear({ house: 6, sign: "virgo", voice: "you" }, O)),
  "Transits: effect lines + variants": para(renderTransitAspect({ transiting: "saturn", natal: "mercury", aspect: "square", window: "Until November 13" })),
  "Synastry + compatibility": para(renderSynastryAspect({ planetA: "moon", planetB: "mercury", aspect: "conjunction", otherName: "Sofia" })),
  "Connection transits (bonds)": para(renderBondTransit({ transiting: "jupiter", aspect: "trine", endpointPlanet: "mercury", endpointOwner: "friend", activatedPlanets: ["moon"], otherName: "Jose", window: "This month" })),
  "Sky page: reviewed aspect phrasebook": para(renderSkyAspectCard({ a: "venus", b: "saturn", aspect: "square", aSign: "aries", bSign: "cancer" })),
  "Sky page: placements + articles": para(renderSkyPlacement({
    planet: "sun",
    sign: "leo",
    entryDate: "July 22, 2026",
    exitDate: "August 23, 2026",
    priorSign: "cancer",
    priorSignEntryDate: "June 21, 2026",
    priorSignExitDate: "July 22, 2026",
    previousResidencyEntryDate: "July 22, 2025",
    previousResidencyExitDate: "August 22, 2025"
  })),
  "Sky page: seasons, lunations, eclipses": para(renderSkyLunation({ kind: "full-moon", sign: "aquarius", dateLine: "On July 29" })),
  "Calendar: phases, void, markers": para(renderCalendarPhase({ phase: "full-moon", sign: "cancer" })),
  "Friends Circle feed": para(renderCircleStory({ trigger: "profection", house: 12, names: ["Alisa P", "Jose"], includesReader: true })),
};
const esc = s => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nice = k => k.replace(/^fallback-(hook|vocab)\//, "").replace(/^authored\//, "").replace(/\//g, " › ").replace(/-/g, " ");
const buckets = SECTIONS.map(() => []);
const place = (item) => { for (let i = 0; i < SECTIONS.length; i++) if (SECTIONS[i][1](item.key)) { buckets[i].push(item); return; } };
const named = (obj, fields) => fields.map((f) => [f, obj[f]]).filter(([, v]) => v);
for (const r of rows.hookRows) place({ key: r.contentKey, you: r.body_you, they: r.body_they !== r.body_you ? r.body_they : null, extra: named(r, ["title", "question", "headline"]) });
for (const r of bondLanguagePass2.rows) place({ key: r.contentKey, you: r.body_you, they: null, extra: named(r, ["review_status"]) });
for (const r of pairDailyFramesV1.rows) place({ key: r.contentKey, you: r.body_you, they: null, extra: named(r, ["review_status"]) });
for (const r of pairDailyClausesV1.rows) place({ key: r.contentKey, you: r.body_you, they: r.body_they !== r.body_you ? r.body_they : null, extra: named(r, ["review_status", "source_key"]) });
for (const r of skyArticleV1.hookRows) place({ key: r.contentKey, you: r.body_you, they: r.body_they !== r.body_you ? r.body_they : null, extra: named(r, ["review_status"]) });
for (const r of skyAspectPhrasebookV1.hookRows) place({ key: r.contentKey, you: r.body_you, they: r.body_they !== r.body_you ? r.body_they : null, extra: named(r, ["review_status"]) });
for (const r of skyPlanetFramesV1.rows) place({ key: r.contentKey, you: r.body_you, they: null, extra: named(r, ["review_status"]) });
for (const r of skyPlacementVoicePassV1.rows) place({ key: r.contentKey, you: r.body_you, they: null, extra: named(r, ["review_status"]) });
for (const r of skyPlacementOwnerApprovedFallbacksV1.rows) place({ key: r.contentKey, you: r.body_you, they: null, extra: named(r, ["review_status"]) });
for (const r of skySignCopySunV1.rows) place({ key: r.contentKey, you: r.body_you, they: null, extra: named(r, ["review_status"]) });
for (const r of sunLeoHouseCoresV1.rows) place({ key: r.contentKey, you: r.body_you, they: null, extra: named(r, ["review_status"]) });
for (const r of venusLibraHouseCoresV1.rows) place({ key: r.contentKey, you: r.body_you, they: null, extra: named(r, ["review_status"]) });
for (const r of rows.vocabularyRows) { if (r.content_role === "vocabulary") place({ key: r.contentKey, you: r.body, they: null, extra: [] }); }
for (const c of lib.authoredCards) place({ key: c.contentKey, you: c.body, they: null, extra: named(c, ["headline", "keywords", "mantra", "intention", "ritual", "axis", "completion", "focus", "strategy"]) });
for (const r of skyArticleV1.vocabularyRows) place({ key: r.contentKey, you: r.body, they: null, extra: [] });
for (const c of skyArticleV1.authoredCards) place({ key: c.contentKey, you: c.body, they: null, extra: named(c, ["headline", "valid_from", "valid_to"]) });
const DESCS = {"Natal: planet meanings": "Ingredient sentences for every natal planet reading. The machine builds each reading in a fixed order: the intro line, then the planet-in-sign sentence, then the day-to-day list, then the warning (excess), then the Best line as the ending. Editing one entry here changes that part of the reading for ALL twelve signs.", "Natal: planet in sign": "The middle of each natal reading: the sentence written for that exact planet-sign pair. This is the most specific part of a reading.", "Natal: planet in house": "The second paragraph of each natal reading: what house the planet sits in and how it plays out there.", "Natal: angles (Rising, MC, DC, IC)": "The Rising, Midheaven, Descendant, and IC pages, one entry per sign.", "Natal: aspects": "Aspect pages between two natal planets: the per-pair sections plus the shared lines that explain what a square, trine, or conjunction is.", "Natal: empty houses": "The empty-house pages on friend charts: how the sign on the house runs it, plus the ruler, placement, and closing paragraphs.", "Profection years": "The yearly profection card: the clock explainer, one entry per house year, and the ruler paragraphs (who is driving the year).", "Transits: effect lines + variants": "The heart of every transit card: what each moving planet does when it touches part of a chart. Soft = trine/sextile, hard = square/opposition. Variants rotate so repeat viewers see fresh wording.", "Transits: retrogrades": "The retrograde season cards and long articles for the nine bodies that retrograde.", "Synastry + compatibility": "Between-two-charts pages: the aspect structures, how each planet thinks/feels (mode), and what each feels like on the receiving end (grates).", "Connection transits (bonds)": "The transits-to-your-connection cards: what each moving planet does to the line between you and a named friend.", "Sky page: placements + articles": "The planet-in-sign sky articles: the you-voice opener, the write-up, the practice paragraph, the element close, and the sign-off blessings.", "Sky page: seasons, lunations, eclipses": "The season articles, Full and New Moon articles, eclipse rules, sign lore and traps, and the event frames that report real sky aspects.", "Calendar: phases, void, markers": "The calendar page: the eight moon phase cards, the void-of-course card, and the solstice and equinox cards.", "Friends Circle feed": "The group stories in the Friends feed: shared profection years, lunations, retrogrades, returns, and the synastry spotlight, each with its headline, shared paragraph, and group question.", "Everything else (labels, houses, misc.)": "Small building blocks: house topics, one-line transit labels, aspect words, and other vocabulary the templates snap together."};
let toc = "", body = "";
SECTIONS.forEach(([name], i) => {
  const items = buckets[i]; if (!items.length) return;
  const id = "s" + i;
  toc += `<a href="#${id}">${esc(name)} <span class="n">${items.length}</span></a>`;
  body += `<h2 id="${id}">${esc(name)} <span class="n">${items.length} entries</span></h2>`;
  if (DESCS[name]) body += `<p class="desc">${esc(DESCS[name])}</p>`;
  if (EXAMPLES[name]) body += `<div class="example"><div class="exlabel">How it reads in the app (one example)</div>${EXAMPLES[name]}</div>`;
  items.sort((a, b) => a.key.localeCompare(b.key));
  for (const it of items) {
    body += `<div class="row" data-key="${esc(it.key)}"><div class="key">${esc(nice(it.key))}</div>`;
    for (const [fname, ex] of it.extra) body += `<div class="copy extra" contenteditable="true" data-field="${esc(fname)}" spellcheck="true">${esc(ex)}</div>`;
    body += `<div class="copy" contenteditable="true" data-field="you" spellcheck="true">${esc(it.you)}</div>`;
    if (it.they) body += `<div class="voice">friend view</div><div class="copy they" contenteditable="true" data-field="they" spellcheck="true">${esc(it.they)}</div>`;
    body += `</div>`;
  }
});
const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>TLDR Astro — Content Book</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.75;color:#222;max-width:760px;margin:0 auto;padding:24px 20px 120px;background:#faf9f6}
h1{font-size:28px} h2{font-size:22px;margin-top:56px;border-bottom:1px solid #ddd;padding-bottom:8px}
.n{color:#999;font-size:13px;font-family:Arial,sans-serif;font-weight:normal}
nav{font-family:Arial,sans-serif;font-size:14px;line-height:2.1;column-count:2;column-gap:24px;margin:16px 0 8px}
nav a{display:block;color:#3b5bdb;text-decoration:none}
.row{margin:26px 0;padding:2px 0 2px 16px;border-left:3px solid #e6e2d8}
.key{font-family:Arial,sans-serif;font-size:12.5px;color:#8a857a;letter-spacing:.02em;margin-bottom:4px;text-transform:capitalize}
.extra{font-style:italic;color:#555;margin-bottom:2px}
.desc{font-family:Arial,sans-serif;font-size:14.5px;color:#6b675e;background:#f1ede3;border-radius:8px;padding:10px 14px;line-height:1.6}
.example{border:1px solid #ddd6c4;border-radius:8px;padding:4px 16px;margin:14px 0 6px;background:#fff}
.example p{font-size:16.5px;line-height:1.65}
.exlabel{font-family:Arial,sans-serif;font-size:11.5px;color:#b08c3e;text-transform:uppercase;letter-spacing:.08em;margin-top:10px}
.voice{font-family:Arial,sans-serif;font-size:11.5px;color:#b08c3e;text-transform:uppercase;letter-spacing:.08em;margin-top:8px}
.copy{outline:none;border-radius:6px;padding:2px 6px;margin-left:-6px}
.copy:focus{background:#fff;box-shadow:0 0 0 2px #c9d8f0}
.copy.edited{background:#fff8dc}
#bar{position:fixed;bottom:0;left:0;right:0;background:#2b2a26;color:#fff;font-family:Arial,sans-serif;font-size:14px;padding:12px 20px;display:flex;gap:16px;align-items:center;justify-content:center}
#bar button{font-size:14px;padding:8px 18px;border-radius:8px;border:none;background:#e8b64c;cursor:pointer;font-weight:bold}
#search{font-size:15px;padding:7px 12px;border-radius:8px;border:none;width:230px}
.hid{display:none}
</style></head><body>
<h1>TLDR Astro — Content Book</h1>
<p>Every piece of reader copy in the package, in plain text. <b>To fix anything: click into the text and type.</b> Edited entries turn yellow. When you are done, press <b>Download my edits</b> at the bottom; send that small file back and the changes get applied to the real package exactly as you wrote them. Use the search box to jump to a planet, sign, or phrase.</p>
<nav>${toc}</nav>
${body}
<div id="bar"><input id="search" placeholder="Search copy (e.g. Saturn, Scorpio)…"><span id="count"></span><button onclick="dl()">Download my edits</button></div>
<script>
const orig=new Map();
document.querySelectorAll('.copy').forEach(el=>{orig.set(el,el.textContent);el.addEventListener('input',()=>{el.classList.toggle('edited',el.textContent!==orig.get(el));upd();});});
function upd(){const n=document.querySelectorAll('.copy.edited').length;document.getElementById('count').textContent=n?n+' edit'+(n>1?'s':''):'';}
function dl(){const out=[];document.querySelectorAll('.copy.edited').forEach(el=>{out.push({contentKey:el.closest('.row').dataset.key,field:el.dataset.field,text:el.textContent});});
if(!out.length){alert('No edits yet. Click into any paragraph and type to change it.');return;}
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='my-copy-edits.json';a.click();}
document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.row').forEach(r=>{r.classList.toggle('hid',q&&!r.textContent.toLowerCase().includes(q));});});
</script></body></html>`;
fs.writeFileSync(path.join(here, "../content-book.html"), html);
console.log("content-book.html written:", (html.length / 1048576).toFixed(1), "MB");
