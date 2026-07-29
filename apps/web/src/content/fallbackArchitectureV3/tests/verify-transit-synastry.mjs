// Verifies the transit + synastry layer (v1): authored-card hygiene + render checks.
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { renderTransitHouse, renderTransitAspect, renderCompat, renderSynastryAspect, renderCircleStory, formatCircleNames, renderSkyPlacement, renderSkyLunation, renderCalendarPhase, renderVoidOfCourse, renderSeasonMarker, renderWeeklyMoon, renderSkyAspectCard, renderBondTransit, renderTransitLabel, renderLunationHoroscope, renderDoDont } from "../resolver/renderTransitSynastry.mjs";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const lib = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/transit-synastry-rows-v1.json"), "utf8"));
const rowsFileForTests = JSON.parse(fs.readFileSync(path.join(here, "../source-rows/fallback-source-rows-v3.json"), "utf8"));
let failures = 0;
const fail = (m) => { failures++; console.error("FAIL:", m); };

// friend-voice object-position guard: preposition/copula + "they" is always a converter defect
{
  const BAD = /\b(?:on|off|is|was|are|were|be|being|been|onto|upon|into|beside|beneath|among|behind|below|above|across|along|about|scatters|fuels|shifts|runs|grows|enlarges|favors?|rebuilds?|pairs?|pairing|erases?|weighs|counts|calling|lifts?|expects?|embarrasses|enjoys?|scares?) they\b/;
  const BAD2 = /\bLet themselves\b|\btrusts? they with\b|\bcall they the\b/;
  const OK = /\bearly on they\b/i;
  const scan = (arr, label) => { for (const r of arr ?? []) { const t = r.body_they; if (t && ((BAD.test(t) && !OK.test(t)) || BAD2.test(t))) fail(`${label} ${r.contentKey}: object-position "they" (${t.match(BAD)[0]})`); } };
  scan(lib.authoredCards, "card");
  scan(rowsFileForTests.hookRows, "hook");
}

// card hygiene
for (const c of lib.authoredCards) {
  if (/[—–]/.test((c.body ?? "") + (c.headline ?? ""))) fail(`${c.contentKey}: em/en dash`);
  if (c.content_role !== "full_copy") fail(`${c.contentKey}: wrong role`);
  if (/\{\{(?!other_name)/.test(c.body)) fail(`${c.contentKey}: unexpected placeholder`);
}


for (const c of lib.authoredCards) {
  if (/\*?\s*(Anchor|Flag|Source|Corpus)\s*:/.test(c.body ?? "") || /^\s*\*|\*\s*$/.test(c.body ?? ""))
    fail(`${c.contentKey}: editorial metadata or asterisk junk in reader body`);
}

// transit-house full grid
const signsPl = ["jupiter", "saturn", "uranus", "neptune", "pluto"];
for (const p of signsPl) for (let h = 1; h <= 12; h++) {
  try { const r = renderTransitHouse({ planet: p, house: h }); if (r.body.length < 100) fail(`thin house card ${p}/${h}`); }
  catch (e) { fail(`${p}/${h}: ${e.message}`); }
}

// two-layer house grid (six planets): 12 houses x 12 signs, authored intro + synthesis, dual voice
{
  const SIGNS12 = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
  let marsN = 0;
  for (const lp of ["mars", "venus", "sun", "mercury", "jupiter", "saturn"]) for (let h = 1; h <= 12; h++) for (const sg of SIGNS12) {
    const r = renderTransitHouse({ planet: lp, house: h, sign: sg });
    if (r.templateKey !== "authored/transit-house-layered") fail(`${lp}/${h}/${sg}: fell through to ${r.templateKey}`);
    if (r.parts.length !== 2) fail(`${lp}/${h}/${sg}: expected 2 layers, got ${r.parts.length}`);
    if (r.body.length < 300) fail(`${lp}/${h}/${sg}: thin layered card`);
    if (r.body.includes("{{")) fail(`${lp}/${h}/${sg}: unfilled slot`);
    const f = renderTransitHouse({ planet: lp, house: h, sign: sg, voice: "Sofia" });
    if (/\b(you|your|yourself)\b/i.test(f.body + " " + f.headline)) fail(`${lp}/${h}/${sg} friend voice: second-person leak`);
    if (!f.body.includes("Sofia")) fail(`${lp}/${h}/${sg} friend voice: name missing`);
    marsN += 2;
  }
  // the sign layer must enter the copy: same house, different signs, different bodies
  const a = renderTransitHouse({ planet: "mars", house: 1, sign: "gemini" });
  const b = renderTransitHouse({ planet: "mars", house: 1, sign: "scorpio" });
  if (a.parts[1] === b.parts[1]) fail("mars 1st house: gemini and scorpio syntheses identical (sign layer not entering copy)");
  if (a.parts[0] !== b.parts[0]) fail("mars 1st house: intros should be shared across signs");
  const va = renderTransitHouse({ planet: "venus", house: 1, sign: "gemini" });
  const vb = renderTransitHouse({ planet: "venus", house: 1, sign: "scorpio" });
  if (va.parts[1] === vb.parts[1]) fail("venus 1st house: gemini and scorpio syntheses identical (sign layer not entering copy)");
  if (va.parts[0] !== vb.parts[0]) fail("venus 1st house: intros should be shared across signs");
  // variant rotation: houses 1-7 carry a Satori variant-2; house 8+ falls back to base
  const v2 = renderTransitHouse({ planet: "mars", house: 1, sign: "gemini", variant: 2 });
  if (v2.body === a.body) fail("mars 1/gemini variant 2: identical to base (variant rows not picked up)");
  // mars variant-2 now covers all 12 houses (rotation parity)
  for (let h = 1; h <= 12; h++) {
    const vb = renderTransitHouse({ planet: "mars", house: h, sign: "gemini", variant: 2 });
    if (vb.body === renderTransitHouse({ planet: "mars", house: h, sign: "gemini" }).body) fail(`mars ${h}/gemini variant 2: identical to base (parity gap)`);
    const vf = renderTransitHouse({ planet: "mars", house: h, sign: "gemini", variant: 2, voice: "Sofia" });
    if (/\b(you|your|yourself)\b/i.test(vf.body)) fail(`mars ${h} variant 2 friend voice: second-person leak`);
  }
  const v2fb = renderTransitHouse({ planet: "venus", house: 9, sign: "gemini", variant: 2 });
  if (v2fb.body !== renderTransitHouse({ planet: "venus", house: 9, sign: "gemini" }).body) fail("venus 9/gemini variant 2: should fall back to base rows (no venus variants yet)");
  // aspect events layer: sky-register composer (frame + wants-pair + scenes)
  const ev = renderTransitHouse({ planet: "mars", house: 1, sign: "gemini", events: [ { natal: "saturn", aspect: "square" }, { natal: "venus", aspect: "trine" } ] });
  if (ev.parts.length !== 4) fail(`events layer: expected 4 parts, got ${ev.parts.length}`);
  if (!ev.parts[2].includes("squaring your natal Saturn")) fail("events layer: square verb missing");
  if (!ev.parts[2].includes("Mars in Gemini wants the fresh plot line right now; your Saturn holds the rules")) fail("events layer: wants-pair sentence missing");
  if (ev.parts[2].includes("In plain terms")) fail("events layer: old scaffold leaked");
  if (/friction sharpens the same weeks|grinding against|tugging at|glaring at|crosstalking|trading notes with|feeding energy to/.test(ev.body)) fail("events layer: metaphor frame verbs leaked");
  if (ev.body.includes("{{")) fail("events layer: unfilled slot");
  // owner-verbatim overrides render
  const evn = renderTransitHouse({ planet: "mars", house: 1, sign: "gemini", events: [ { natal: "neptune", aspect: "opposition", window: "Aug 2" }, { natal: "south-node", aspect: "square" } ] });
  if (!evn.parts[2].includes("opposing your natal Neptune until Aug 2.")) fail("events layer: opposition verb or window missing");
  if (/natal \w+ through /.test(evn.body)) fail("events layer: through-date phrasing regressed (owner ruling: until)");
  const evu = renderTransitHouse({ planet: "mars", house: 1, sign: "gemini", events: [ { natal: "neptune", aspect: "opposition", window: "Until August 2" } ] });
  if (evu.parts[2].includes("through Until")) fail("events layer: doubled window preposition");
  if (!evu.parts[2].includes("natal Neptune until August 2.")) fail("events layer: preposition-bearing window not normalized");
  if (!evn.parts[2].includes("moving toward a clear vision beats fighting the mist")) fail("events layer: neptune owner override missing");
  if (!evn.parts[3].includes("the South Node leans on the muscle memory it's mastered")) fail("events layer: south node holds-clause missing");
  if (!evn.parts[3].includes("reflex disguised as functioning")) fail("events layer: south node owner override missing");
  const evf = renderTransitHouse({ planet: "venus", house: 7, sign: "libra", voice: "Sofia", events: [ { natal: "moon", aspect: "conjunction" } ] });
  if (evf.parts.length !== 3) fail(`friend events layer: expected 3 parts, got ${evf.parts.length}`);
  if (!evf.parts[2].includes("Venus in Libra wants the balance restored")) fail("friend events layer: wants clause missing");
  if (/\b(you|your|yourself)\b/i.test(evf.body)) fail("friend events layer: second-person leak");
  if (!evf.parts[2].includes("Sofia's")) fail("friend events layer: name missing from frame");
  // conjunction class follows planet nature: benefic conj reads soft, mars conj reads hard
  const vconj = renderTransitHouse({ planet: "venus", house: 4, sign: "virgo", events: [ { natal: "north-node", aspect: "conjunction", window: "Jul 30, 2026" } ] });
  if (!vconj.parts[2].includes("sitting right on your natal North Node")) fail("venus conj frame wrong");
  if (vconj.parts[2].includes("Comfort lobbies against growth")) fail("venus conjunction scored as hard (benefic conj must read soft)");
  if (!vconj.parts[2].includes("the growth tastes good")) fail("venus conj NN: soft scenes missing");
  const mconj = renderTransitHouse({ planet: "mars", house: 1, sign: "gemini", events: [ { natal: "saturn", aspect: "conjunction" } ] });
  if (!mconj.parts[2].includes("sitting right on your natal Saturn")) fail("mars conj frame wrong");

  // slow movers: register, conj nature, events, rx
  const j1 = renderTransitHouse({ planet: "jupiter", house: 1, sign: "sagittarius" });
  if (!/this year|about a year/.test(j1.body)) fail("jupiter 1: year timescale missing");
  const s1c = renderTransitHouse({ planet: "saturn", house: 10, sign: "capricorn" });
  if (!/these years|couple of years|harvest/.test(s1c.body)) fail("saturn 10: slow timescale missing");
  const jconj = renderTransitHouse({ planet: "jupiter", house: 2, sign: "taurus", events: [ { natal: "venus", aspect: "conjunction" } ] });
  if (!jconj.parts[2] || !jconj.parts[2].includes("sitting right on your natal Venus")) fail("jupiter conj frame wrong");
  if (!jconj.parts[2].includes("Jupiter in Taurus wants the growth that compounds")) fail("jupiter wants clause missing");
  const sev2 = renderTransitHouse({ planet: "saturn", house: 7, sign: "libra", events: [ { natal: "moon", aspect: "square" } ] });
  if (!sev2.parts[2] || !sev2.parts[2].includes("squaring your natal Moon")) fail("saturn square frame wrong");
  const jrx = renderTransitHouse({ planet: "jupiter", house: 9, sign: "pisces", isRetrograde: true });
  if (!jrx.body.includes("expansion resumes on schedule")) fail("jupiter rx overlay missing");
  const srx = renderTransitHouse({ planet: "saturn", house: 4, sign: "aries", voice: "Sofia", isRetrograde: true });
  if (!srx.body.includes("inspection ends and the building resumes")) fail("saturn rx overlay missing");
  if (/\b(you|your)\b/i.test(srx.body)) fail("saturn rx friend voice: second-person leak");

  // a SOURCE_GAP event must never block the card
  const evgap = renderTransitHouse({ planet: "mars", house: 1, sign: "gemini", events: [ { natal: "nonsense", aspect: "square" } ] });
  if (evgap.parts.length !== 2) fail("events layer: gap event should be skipped, not rendered or thrown");

  // sun grounding checks: month timescale explicit, sign layer diverges, sun event frame works
  const s1 = renderTransitHouse({ planet: "sun", house: 1, sign: "aries" });
  if (!/month|weeks/.test(s1.body)) fail("sun 1/aries: month timescale missing (transit-explicitness directive)");
  const s2 = renderTransitHouse({ planet: "sun", house: 1, sign: "scorpio" });
  if (s1.parts[1] === s2.parts[1]) fail("sun 1st house: aries and scorpio syntheses identical");
  const sev = renderTransitHouse({ planet: "sun", house: 1, sign: "aries", events: [ { natal: "saturn", aspect: "square" } ] });
  if (!sev.parts[2] || !sev.parts[2].includes("squaring your natal Saturn")) fail("sun events layer: square verb missing");
  if (!sev.parts[2].includes("The Sun in Aries wants to go first")) fail("sun events layer: wants clause missing");
  // venus falsifiability regression: fixed claims stay fixed
  // they-voice subject/object regression (the "love them feel" class of converter bug)
  const vp12 = renderTransitHouse({ planet: "venus", house: 12, sign: "pisces", voice: "Sofia" });
  if (vp12.body.includes("the love them feel")) fail("venus 12/pisces friend voice: subject-you converted as object (them feel)");
  if (!vp12.body.includes("the love they feel")) fail("venus 12/pisces friend voice: expected corrected phrase missing");
  const v2i = renderTransitHouse({ planet: "venus", house: 2, sign: "aries" });
  if (v2i.body.includes("The raise gets approved")) fail("venus 2nd: flat event claim regressed");
  if (!v2i.body.includes("tends to move toward you")) fail("venus 2nd: tendency framing missing");

  // mercury: timescale + divergence + event frame
  const m1 = renderTransitHouse({ planet: "mercury", house: 3, sign: "gemini" });
  if (!/weeks/.test(m1.body)) fail("mercury 3/gemini: weeks timescale missing");
  const m2 = renderTransitHouse({ planet: "mercury", house: 3, sign: "capricorn" });
  if (m1.parts[1] === m2.parts[1]) fail("mercury 3rd house: gemini and capricorn syntheses identical");
  const mev = renderTransitHouse({ planet: "mercury", house: 3, sign: "gemini", events: [ { natal: "moon", aspect: "trine" } ] });
  if (!mev.parts[2] || !mev.parts[2].includes("trining your natal Moon")) fail("mercury events layer: trine verb missing");
  if (!mev.parts[2].includes("Mercury in Gemini wants all the tabs open; your Moon guards")) fail("mercury events layer: wants-pair missing");

  // retrograde overlay: extra part when flagged, absent when not, silent for planets without a row
  const rx = renderTransitHouse({ planet: "mercury", house: 3, sign: "gemini", isRetrograde: true });
  if (!rx.body.includes("revise rather than redo")) fail("mercury rx overlay missing");
  if (rx.parts.length !== 3) fail(`mercury rx: expected 3 parts, got ${rx.parts.length}`);
  const rxf = renderTransitHouse({ planet: "venus", house: 5, sign: "leo", voice: "Sofia", isRetrograde: true });
  if (/\b(you|your)\b/i.test(rxf.body)) fail("venus rx overlay friend voice: second-person leak");
  const rxsun = renderTransitHouse({ planet: "sun", house: 1, sign: "aries", isRetrograde: true });
  if (rxsun.parts.length !== 2) fail("sun rx flag should be a no-op (no overlay row by design)");

  // no sign passed -> legacy template path still serves mars
  const legacy = renderTransitHouse({ planet: "mars", house: 1 });
  if (legacy.templateKey === "authored/transit-house-layered") fail("mars/1 without sign should use the fallback template");
  console.log(`Rendered ${marsN} two-layer house cards across six planets (+ validation, variant, events, and fallback checks).`);
}

// standalone transit-aspect fallback: composer register (owner directive from the Chiron screenshot)
{
  // v2 authored library (owner-approved 2026-07-28): slow-planet pairs render the authored card
  // with the exact aspect + window filled into the closer.
  const ch = renderTransitAspect({ transiting: "chiron", natal: "jupiter", aspect: "square", sign: "taurus", window: "Until Jul 30, 2026" });
  if (ch.templateKey !== "authored/transit-aspect") fail("chiron/jupiter square: authored v2 card expected");
  if (!ch.body.includes("Chiron square your Jupiter until Jul 30, 2026")) fail("chiron/jupiter square: exact-aspect closer with filled window missing");
  if (/\{\{/.test(ch.body)) fail("chiron/jupiter square: unfilled slot");
  // Reader voice is authored-first across the library; the composer register is exercised
  // by the friend-voice checks below (authored cards never serve friend view).
  const chf = renderTransitAspect({ transiting: "chiron", natal: "jupiter", aspect: "square", sign: "taurus", voice: "Sofia" });
  if (/\b(you|your|yourself)\b/i.test(chf.body)) fail("transit-aspect composer friend voice: second-person leak");
  if (!chf.body.includes("Sofia's natal Jupiter")) fail("transit-aspect composer friend voice: possessive missing");
  const nosign = renderTransitAspect({ transiting: "pluto", natal: "moon", aspect: "opposition", voice: "Sofia" });
  if (!nosign.body.includes("Pluto wants it transformed at the root")) fail("transit-aspect fallback: sign-less wants fallback missing (friend voice)");
  if (/\b(you|your)\b/i.test(nosign.body)) fail("transit-aspect sign-less friend voice: second-person leak");
  const moonfast = renderTransitAspect({ transiting: "moon", natal: "venus", aspect: "trine", sign: "pisces" });
  if (moonfast.body.includes("In plain terms")) fail("moon transit-aspect: old scaffold leaked");
}

// moon daily-driver grid (spec: every Moon-to-natal-point pair)
const natal = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "ascendant", "midheaven"];
let moonGaps = [];
for (const n of natal) for (const a of ["conjunction", "square", "trine"]) {
  try { renderTransitAspect({ transiting: "moon", natal: n, aspect: a }); } catch { moonGaps.push(`moon/${n}/${a}`); }
}
if (moonGaps.length) fail(`moon driver gaps: ${moonGaps.join(", ")}`);

// compat: deep grids complete for sun+moon; pair cards render in stored direction
const SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
for (const pl of ["sun", "moon"]) for (const a of SIGNS) for (const b of SIGNS) {
  try { const r = renderCompat({ planet: pl, signA: a, signB: b, otherName: "Sofia" }); if (r.body.includes("{{")) fail(`placeholder left ${pl}/${a}/${b}`); if (/\bboth're\b/i.test(r.body)) fail(`both're bug ${pl}/${a}/${b}`); }
  catch (e) { fail(`compat ${pl}/${a}/${b}: ${e.message}`); }
}
let pairDir = 0, pairRev = 0;
for (const pl of ["mercury", "venus", "mars", "jupiter", "saturn"]) for (const a of SIGNS) for (const b of SIGNS) {
  try { renderCompat({ planet: pl, signA: a, signB: b, otherName: "Sofia" }); pairDir++; }
  catch (e) { if (e.reversedAvailable) pairRev++; else fail(`compat ${pl}/${a}/${b}: no card either direction`); }
}
console.log(`pair compat: ${pairDir} direct, ${pairRev} reversed-only (authoring gap, correctly SOURCE_GAP)`);

// synastry aspects: full pair x aspect base render
const pls = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"];
let syn = 0;
for (let i = 0; i < pls.length; i++) for (let j = i; j < pls.length; j++) for (const asp of ["conjunction","square","trine","sextile","opposition"]) {
  try { const r = renderSynastryAspect({ planetA: pls[i], planetB: pls[j], aspect: asp, otherName: "Sofia" }); if (/[—–]|\{\{/.test(r.body)) fail(`syn ${pls[i]}-${asp}-${pls[j]} bad output`); syn++; }
  catch (e) { fail(`syn ${pls[i]}-${asp}-${pls[j]}: ${e.message}`); }
}

// Friends Circle feed: every trigger renders, no leftover slots, no dashes, grammar helpers work
const circleFacts = [];
for (let h = 1; h <= 12; h++) circleFacts.push({ trigger: "profection", house: h, names: ["Alisa P", "Jose"], includesReader: true });
for (const kind of ["full", "new"]) circleFacts.push({ trigger: "lunation", kind, sign: "aquarius", dateLine: "on July 29", names: ["Alisa P", "Jose", "Maya"], includesReader: true });
for (const pl of ["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"]) circleFacts.push({ trigger: "retro", planet: pl, names: ["Sofia"], includesReader: true });
for (const pl of ["saturn", "jupiter", "venus"]) circleFacts.push({ trigger: "return", planet: pl, names: ["Sofia", "Marc"], includesReader: false });
for (const asp of ["conjunction", "square", "trine", "sextile", "opposition"]) circleFacts.push({ trigger: "synastry", aspect: asp, planetA: "moon", planetB: "mercury", nameA: "Alisa P", nameB: "Jose", names: ["Alisa P", "Jose"], includesReader: false });
let circ = 0;
for (const f of circleFacts) {
  try {
    const r = renderCircleStory(f);
    const all = [r.headline, r.subtitle, r.body, r.question ?? ""].join(" ");
    if (/[\u2014\u2013]|\{\{/.test(all)) fail(`circle ${f.trigger}: bad output (${all.slice(0, 60)})`);
    if (f.trigger === "profection" && f.names.length + 1 === 2 && !/are both/.test(r.body)) fail(`circle profection: allWord grammar`);
    circ++;
  } catch (e) { fail(`circle ${f.trigger}/${f.house ?? f.planet ?? f.kind ?? f.aspect}: ${e.message}`); }
}
// two-person grammar + name formatting rules
const two = renderCircleStory({ trigger: "profection", house: 3, names: ["Sofia"], includesReader: true });
if (!two.body.includes("You and Sofia are both in")) fail("circle: two-person allWord");
if (formatCircleNames(["Alisa P", "Jose", "Maya"], true) !== "You, Alisa P, and 2 more") fail("circle: name cap");
if (formatCircleNames(["v"], true) !== "You and a friend") fail("circle: initial-only name must become a friend");
const secs = renderCircleStory({ trigger: "profection", house: 3, names: ["Sofia"], includesReader: true, members: [{ isReader: true, body: "Reader section." }, { name: "v", body: "Friend section." }] }).sections;
if (secs[0].name !== "You" || secs[1].name !== "a friend") fail("circle: section naming");
console.log(`Rendered ${circ} circle stories.`);


// Sky placement articles: full 13 x 12 grid renders, no leftover slots, no dashes
const SKY_PL = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","chiron","north-node","south-node"];
let skyPl = 0;
for (const pl of SKY_PL) for (const sg of SIGNS) {
  try {
    const r = renderSkyPlacement({ planet: pl, sign: sg, events: [{ type: "aspect", a: pl === "mars" ? "saturn" : "mars", b: pl, aspect: "trine", dateLine: "Through Saturday" }] });
    if (/[\u2014\u2013]|\{\{/.test(r.body)) fail(`sky placement ${pl}/${sg}: bad output`);
    if (r.parts.length < 3) fail(`sky placement ${pl}/${sg}: too thin (${r.parts.length} paras)`);
    skyPl++;
  } catch (e) { fail(`sky placement ${pl}/${sg}: ${e.message}`); }
}
console.log(`Rendered ${skyPl} sky placement articles.`);


// Lunation articles: every sign x kind renders; authored per-sign cards present; eclipse canon holds
let lun = 0;
for (const sg of SIGNS) for (const kd of ["new-moon", "full-moon", "eclipse-solar", "eclipse-lunar"]) {
  try {
    const r = renderSkyLunation({ kind: kd, sign: sg, dateLine: "On September 7", northSign: "pisces", southSign: "virgo" });
    if (/[\u2014\u2013]|\{\{/.test(r.body)) fail(`lunation ${kd}/${sg}: bad output`);
    const ecl = kd.startsWith("eclipse");
    if (ecl && /Set your intention|Ritual:/.test(r.body)) fail(`lunation ${kd}/${sg}: ritual leaked into eclipse (canon: skip rituals)`);
    if (!ecl && !/Set your intention|Ritual:|ask:/.test(r.body) && ["capricorn","aquarius","pisces","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","aries"].includes(sg)) fail(`lunation ${kd}/${sg}: authored intention/ritual missing`);
    if (ecl && !/not a regular/.test(r.body)) fail(`lunation ${kd}/${sg}: eclipse opener missing`);
    lun++;
  } catch (e) { fail(`lunation ${kd}/${sg}: ${e.message}`); }
}
const yearEnd = renderSkyLunation({ kind: "new-moon", sign: "capricorn", dateLine: "On December 31", variant: "year-end" });
if (!yearEnd.body.includes("Here you are again, at the threshold")) fail("lunation: year-end variant not selected");
console.log(`Rendered ${lun} lunation articles (incl. eclipse kinds).`);


// Calendar layer: phases, void of course, season markers, weekly moon (all signs + variants)
const PHASES = ["new-moon","waxing-crescent","first-quarter","waxing-gibbous","full-moon","disseminating","last-quarter","balsamic"];
let cal = 0;
for (const ph of PHASES) { const r = renderCalendarPhase({ phase: ph, sign: "cancer" }); if (!r.headline || /\{\{/.test(r.body)) fail(`phase ${ph}`); cal++; }
for (let i = 0; i < SIGNS.length; i++) { const r = renderVoidOfCourse({ sign: SIGNS[i], nextSign: SIGNS[(i+1)%12] }); if (/\{\{/.test(r.body)) fail(`voc ${SIGNS[i]}`); cal++; }
for (const w of ["march-equinox","june-solstice","september-equinox","december-solstice"]) { const r = renderSeasonMarker({ which: w }); if (!r.body || !r.headline) fail(`marker ${w}`); cal++; }
for (const sg of SIGNS) for (const v of [1,2]) {
  try { const r = renderWeeklyMoon({ sign: sg, variant: v }); if (!r.body || /[\u2014\u2013]/.test(r.body)) fail(`weekly ${sg}/${v}`); cal++; }
  catch (e) { fail(`weekly ${sg}/${v}: ${e.message}`); }
}
console.log(`Rendered ${cal} calendar pieces.`);


// Sky aspect cards: all pairs x aspects render collectively, no natal-voice leakage
let skyAsp = 0;
for (let i = 0; i < SKY_PL.length; i++) for (let j = i + 1; j < SKY_PL.length; j++) for (const asp of ["conjunction", "square", "trine", "sextile", "opposition"]) {
  try {
    const r = renderSkyAspectCard({ a: SKY_PL[i], b: SKY_PL[j], aspect: asp });
    if (/\{\{|natal/.test(r.body)) fail(`sky aspect ${SKY_PL[i]}-${asp}-${SKY_PL[j]}: bad output`);
    skyAsp++;
  } catch (e) { fail(`sky aspect ${SKY_PL[i]}-${asp}-${SKY_PL[j]}: ${e.message}`); }
}
console.log(`Rendered ${skyAsp} sky aspect cards.`);


// Bond transits: every transiting body x aspect x a spread of contact pairs
let bond = 0;
const BOND_PAIRS = [["venus","mars"],["moon","mercury"],["sun","saturn"],["mercury","mercury"]];
for (const tr of SKY_PL) for (const asp of ["conjunction","square","trine","sextile","opposition"]) for (const [pa, pb] of BOND_PAIRS) {
  try {
    const r = renderBondTransit({ transiting: tr, aspect: asp, endpointPlanet: pb, endpointOwner: "friend", activatedPlanets: [pa], otherName: "Sofia" });
    if (/\{\{|[\u2014\u2013]|natal/.test(r.body)) fail(`bond ${tr}/${asp}/${pa}-${pb}: bad output`);
    bond++;
  } catch (e) { fail(`bond ${tr}/${asp}/${pa}-${pb}: ${e.message}`); }
}
console.log(`Rendered ${bond} bond transit cards.`);


// Lilith sky placement: full sign grid
for (const sg of SIGNS) {
  try { const r = renderSkyPlacement({ planet: "lilith", sign: sg }); if (r.parts.length < 3 || /\{\{/.test(r.body)) fail(`lilith placement ${sg}`); }
  catch (e) { fail(`lilith placement ${sg}: ${e.message}`); }
}
console.log("Rendered 12 Lilith sky placements.");


// Lilith across transit surfaces
{
  let lt = 0;
  for (const asp of ["conjunction","square","trine","sextile","opposition"]) {
    for (const other of ["sun","moon","venus","saturn"]) {
      try { const a = renderTransitAspect({ transiting: "lilith", natal: other, aspect: asp }); if (/\{\{/.test(a.body)) fail(`lilith transiting ${asp}/${other}`); lt++; } catch (e) { fail(`lilith transiting ${asp}/${other}: ${e.message}`); }
      // Walker canon (owner 2026-07-27): natal-Lilith contacts render on conjunction/opposition only.
      if (asp === "conjunction" || asp === "opposition") {
        try { const b = renderTransitAspect({ transiting: other === "sun" ? "saturn" : other, natal: "lilith", aspect: asp, window: "Until Oct 16" }); if (/\{\{/.test(b.body)) fail(`lilith natal-target ${asp}/${other}`); lt++; } catch (e) { fail(`lilith natal-target ${asp}/${other}: ${e.message}`); }
      } else {
        try { renderTransitAspect({ transiting: other === "sun" ? "saturn" : other, natal: "lilith", aspect: asp }); fail(`lilith natal-target ${asp}/${other}: should SOURCE_GAP (conj/opp only)`); } catch (e) { if (!/SOURCE_GAP/.test(e.message)) fail(`lilith natal-target ${asp}/${other}: wrong error ${e.message}`); lt++; }
      }
    }
  }
  renderTransitLabel({ transiting: "saturn", natal: "lilith", aspect: "square" });
  for (const asp of ["trine","square"]) { const r = renderBondTransit({ transiting: "lilith", aspect: asp, endpointPlanet: "mars", endpointOwner: "friend", activatedPlanets: ["venus"], otherName: "Sofia" }); if (/\{\{/.test(r.body)) fail(`lilith bond ${asp}`); lt += 1; }
  for (const asp of ["conjunction","square","trine"]) { const r = renderSynastryAspect({ planetA: "lilith", planetB: "venus", aspect: asp, otherName: "Sofia" }); if (/\{\{/.test(r.body)) fail(`lilith synastry ${asp}`); lt += 1; }
  console.log(`Rendered ${lt} Lilith transit/synastry pieces.`);
}


// Friend-voice transit cards: full grid, no second-person leaks, authored library never leaks
{
  let fv = 0;
  for (const tr of SKY_PL) for (const nat of ["sun","moon","venus","saturn","lilith"]) for (const asp of ["conjunction","square","trine"]) {
    try {
      const r = renderTransitAspect({ transiting: tr, natal: nat, aspect: asp, voice: "Sofia" });
      if (/\b(you|your|yourself)\b/i.test(r.body + " " + r.headline)) fail(`friend transit ${tr}/${asp}/${nat}: second-person leak`);
      if (r.contentKey) fail(`friend transit ${tr}/${asp}/${nat}: authored card leaked into friend view`);
      fv++;
    } catch (e) {
      // Walker canon: natal-Lilith square/trine SOURCE_GAP by design (friend view too)
      if (nat === "lilith" && asp !== "conjunction" && /SOURCE_GAP/.test(e.message)) { fv++; }
      else fail(`friend transit ${tr}/${asp}/${nat}: ${e.message}`);
    }
  }
  for (const pl of ["jupiter","saturn","mars"]) for (let h = 1; h <= 12; h++) {
    const r = renderTransitHouse({ planet: pl, house: h, voice: "Sofia" });
    if (/\b(you|your)\b/i.test(r.body)) fail(`friend house ${pl}/${h}: second-person leak`);
    fv++;
  }
  console.log(`Rendered ${fv} friend-voice transit cards.`);
}


// Connections pairs: render BOTH directions for every pair and catch holder-slot agreement bugs
{
  let cx = 0;
  const AGREE = /(?<!between )(?<!of )(?<!around )(?<!to )(?<!for )(?<!with )(?<!near )\byou (?:feels|gives|seems|wants|paces|loves|builds|makes|takes|keeps|finds|meets|leans|comes)\b/;
  const pairKeys = [...new Set(rowsFileForTests.hookRows.filter(r => r.contentKey.startsWith("fallback-hook/synastry-pair/")).map(r => r.contentKey.split("/").slice(2, 4)))].map(a => a);
  const seen = new Set();
  for (const r of rowsFileForTests.hookRows) {
    if (!r.contentKey.startsWith("fallback-hook/synastry-pair/")) continue;
    const [a, b] = r.contentKey.split("/").slice(2, 4);
    if (seen.has(a + b)) continue; seen.add(a + b);
    for (const [pa, pb] of [[a, b], [b, a]]) {
      try {
        const out = renderSynastryAspect({ planetA: pa, planetB: pb, aspect: "trine", otherName: "Sofia" });
        if (AGREE.test(out.body)) fail(`connections pair ${pa}/${pb}: holder agreement bug (${out.body.match(AGREE)[0]})`);
        cx++;
      } catch (e) { /* some directions lack mode hooks; fine */ }
    }
  }
  console.log(`Rendered ${cx} Connections pair directions, agreement-checked.`);
}


// Per-rising lunation horoscopes: all 12 risings x 4 kinds, correct house math, eclipse canon
{
  let lh = 0;
  for (const rs of SIGNS) for (const kd of ["new-moon", "full-moon", "eclipse-solar", "eclipse-lunar"]) {
    const r = renderLunationHoroscope({ kind: kd, sign: "aquarius", risingSign: rs });
    if (/\{\{/.test(r.body)) fail(`lunation horoscope ${kd}/${rs}: slot leak`);
    if (kd.startsWith("eclipse") && /Let go of/.test(r.body)) fail(`lunation horoscope ${kd}/${rs}: release leaked into eclipse`);
    if (!kd.startsWith("eclipse") && !/Let go of/.test(r.body)) fail(`lunation horoscope ${kd}/${rs}: release missing`);
    lh++;
  }
  const aq = renderLunationHoroscope({ kind: "full-moon", sign: "aquarius", risingSign: "aquarius" });
  if (!aq.body.includes("1st house")) fail("lunation horoscope: house math wrong for same-sign rising");
  console.log(`Rendered ${lh} per-rising lunation horoscopes.`);
}


// Do/Don't engine: worked example from the spec (MP, July 17) + full seed coverage
{
  const mp = renderDoDont({ planet: "saturn", sign: "virgo", house: 4, transiting: "moon", weakPlanet: "venus", weakSign: "capricorn" });
  if (mp.do[0] !== "File the paperwork" || mp.do[1] !== "Organize one room") fail("dodont: spec example assembly wrong: " + JSON.stringify(mp));
  if (mp.dont.length !== 3) fail("dodont: expected 3 donts");
  let dd = 0;
  for (const pl of ["moon","venus","mars","mercury","saturn"]) for (const sg of SIGNS) for (const tr of SKY_PL) {
    const r = renderDoDont({ planet: pl, sign: sg, house: ((dd % 12) + 1), transiting: tr });
    if (r.do.length < 3 || r.dont.length < 2) fail(`dodont thin: ${pl}/${sg}/${tr}`);
    dd++;
  }
  console.log(`Assembled ${dd} Do/Don't lists.`);
}

console.log(`Rendered ${syn} synastry aspect combos, ${lib.authoredCards.length} authored cards checked.`);
console.log(failures === 0 ? "PASS: transit + synastry layer checks passed." : `${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
