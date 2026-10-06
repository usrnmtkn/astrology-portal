import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { renderNatalPlacement, renderNatalAngle } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import { createFallbackRenderer } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.browser.ts";
import { createFallbackRenderer as createShippedRenderer } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { isNatalPlacementAngle, natalPlacementMotionIsFixed, natalPlacementPlanets, natalPlacementSigns, natalPlacementResolverDependencyKeys, natalPlacementSourceGroups } from "../apps/admin/src/natalPlacementSources.ts";

const root = "apps/web/src/content/fallbackArchitectureV3/";
const read = (name) => JSON.parse(fs.readFileSync(root + name, "utf8"));
const source = read("source-rows/fallback-source-rows-v3.json");
const interim = read("source-rows/placement-interim-fixes-v1.json");
const templates = read("templates/fallback-templates-v3.json");
templates.templates.push(...interim.templates);
const rows = { ...source, vocabularyRows: [...source.vocabularyRows, ...interim.vocabularyRows] };
const intros = rows.hookRows.filter(row => row.contentKey.startsWith("fallback-hook/natal/planet-intro/"));
const originalIntros = rows.hookRows.filter(row => row.contentKey.startsWith("fallback-hook/planet-intro/"));
const bundled = read("bundled-deferred-core-rows-v3.json");
const manifest = read("bundled-manifest-v3.json");
assert.equal(intros.length, originalIntros.length, "Every existing planet introduction needs a natal-owned source.");
assert.ok(intros.length >= 14);
for (const row of intros) {
  const { note, notes, source_migration, ...readerRecord } = row;
  assert.deepEqual(bundled.hookRows.find(candidate => candidate.contentKey === row.contentKey), readerRecord, `${row.contentKey}: shipped reader fields differ from the approved source`);
  assert.ok(manifest.keys.includes(`hook:${row.contentKey}`), `${row.contentKey}: absent from publication/source manifest`);
  const original = originalIntros.find(old => old.contentKey === row.source_keys[0]);
  assert.ok(original, `${row.contentKey}: missing original source provenance`);
  assert.equal(row.surface, "natal");
  assert.equal(row.body_you, original.body_you, "Reuse the complete approved introduction without rewriting.");
  assert.equal(row.body_they, original.body_they);
  for (const [field, hashField] of [["body_you", "bodyYouSha256"], ["body_they", "bodyTheySha256"]]) {
    assert.equal(row.source_migration[hashField], createHash("sha256").update(row[field]).digest("hex"));
  }
}

for (const planet of ["saturn", "neptune"]) {
  const sign = planet === "neptune" ? "capricorn" : "aries";
  const key = `fallback-hook/natal/planet-intro/${planet}`;
  const intro = intros.find(row => row.contentKey === key);
  const lived = rows.hookRows.find(row => row.contentKey === `fallback-hook/planet-lived/${planet}`);
  const dependencies = natalPlacementResolverDependencyKeys(planet, sign);
  assert.ok(dependencies.includes(key));
  assert.ok(!dependencies.includes(lived.contentKey));
  assert.ok(!dependencies.includes(`fallback-hook/planet-intro/${planet}`));
  const sources = natalPlacementSourceGroups(planet, sign).flatMap(group => group.sources);
  assert.ok(sources.some(source => source.key === key));

  for (const voice of ["you", "Maya"]) {
    const facts = { planet, sign, voice };
    const expected = voice === "you" ? intro.body_you : intro.body_they;
    const node = renderNatalPlacement(facts);
    assert.ok(node.body.startsWith(expected), `${planet}/${voice}: Node must use the natal introduction.`);
    assert.ok(!node.body.includes(lived.body));
    for (const [label, factory] of [["browser", createFallbackRenderer], ["shipped", createShippedRenderer]]) {
      assert.equal(factory(templates, rows).renderNatalPlacement(facts).body, node.body, `${label}: Node parity`);
      const missingIntroRows = { ...rows, hookRows: rows.hookRows.filter(row => row.contentKey !== key) };
      const missingIntroBody = factory(templates, missingIntroRows).renderNatalPlacement(facts).body;
      assert.ok(!missingIntroBody.includes(expected), `${label}: absent natal intro must leave the optional slot empty`);
      assert.ok(!missingIntroBody.includes(lived.body), `${label}: absent natal intro must not select shared copy`);
      const edited = { ...intro, body_you: "Synthetic natal You opening. Complete natal ending.", body_they: "Synthetic natal Friend opening. Complete natal ending." };
      const editedRows = { ...rows, hookRows: [...rows.hookRows.filter(row => row.contentKey !== key), edited] };
      const rendered = factory(templates, editedRows).renderNatalPlacement(facts).body;
      assert.ok(rendered.startsWith(voice === "you" ? edited.body_you : edited.body_they), `${label}: exact natal edit must reach reader`);
      assert.ok(!rendered.includes(lived.body));
      for (const review_status of ["needs_review", "rejected"]) {
        const unapproved = { ...editedRows, hookRows: editedRows.hookRows.map(row => row.contentKey === key ? { ...row, review_status } : row) };
        const body = factory(templates, unapproved).renderNatalPlacement(facts).body;
        assert.ok(!body.includes("Synthetic natal"), `${label}: unapproved introduction must stay out of reader copy`);
        assert.ok(!body.includes(lived.body), `${label}: missing natal copy must never select generic lived copy`);
      }
    }
  }
}
const planets = natalPlacementPlanets.filter(planet => !isNatalPlacementAngle(planet));
const angles = natalPlacementPlanets.filter(isNatalPlacementAngle);
assert.deepEqual(intros.map(row => row.contentKey.split("/").at(-1)).sort(), [...planets].sort(), "Every supported planet/point has exactly one natal introduction.");
const browsers = [createFallbackRenderer, createShippedRenderer].map(factory => factory(templates, rows));
const totals = { placements: 0, composed: 0, authored: 0, angles: 0, forcedFallbacks: 0 };
const byPlanet = {};

// Exercise real serving precedence, including complete passages, all house
// contexts, and valid direct/retrograde facts. Exact passages are not prepended
// with a second introduction; only composed sign paragraphs consume this slot.
for (const planet of planets) {
  const key = `fallback-hook/natal/planet-intro/${planet}`;
  const intro = intros.find(row => row.contentKey === key);
  assert.equal(intro.content_role, "fallback_hook");
  assert.ok(["approved", "approved_reuse", "reviewed"].includes(intro.review_status));
  byPlanet[planet] = { source: key, composed: 0, authored: 0 };
  for (const sign of natalPlacementSigns) for (const voice of ["you", "QA Friend"]) {
    const expected = voice === "you" ? intro.body_you : intro.body_they;
    assert.ok(expected?.trim(), `${key}/${voice}: complete audience copy is required`);
    const sources = natalPlacementSourceGroups(planet, sign).flatMap(group => group.sources);
    assert.ok(sources.some(source => source.key === key));
    for (const house of [undefined, ...Array.from({ length: 12 }, (_, index) => index + 1)]) {
      for (const isRetrograde of natalPlacementMotionIsFixed(planet) ? [false] : [false, true]) {
        const facts = { planet, sign, house, voice, isRetrograde };
        const label = JSON.stringify(facts);
        const dependencies = natalPlacementResolverDependencyKeys(planet, sign, house ? String(house) : "", isRetrograde ? "retrograde" : "direct");
        assert.ok(dependencies.includes(key), label);
        assert.ok(!dependencies.some(source => /^fallback-hook\/planet-(?:intro|lived)\//.test(source)), label);
        const rendered = renderNatalPlacement(facts);
        for (const browser of browsers) assert.equal(browser.renderNatalPlacement(facts).body, rendered.body, label);
        const composed = rendered.partKeys[0].startsWith("fallback-template/natal.");
        if (composed) assert.ok(rendered.parts[0].startsWith(expected), `${label}: wrong natal introduction`);
        else assert.ok(/^fallback-hook\/(?:natal-you-placement-(?:sign|complete)-final|placement-sign-lived)\//.test(rendered.partKeys[0]), `${label}: unexpected generic source`);
        totals.placements += 1;
        totals[composed ? "composed" : "authored"] += 1;
        byPlanet[planet][composed ? "composed" : "authored"] += 1;
      }
    }
  }
}

// All signs must also use the right short source if an authored override is
// absent. Synthetic sentinels identify a source independently of its prose.
const withoutExact = rows.hookRows.filter(row => !/^fallback-hook\/(?:natal-you-placement-(?:sign|complete)-final|placement-sign-lived)\//.test(row.contentKey));
const markedRows = { ...rows, hookRows: withoutExact.map(row => {
  if (row.contentKey.startsWith("fallback-hook/natal/planet-intro/")) return { ...row, body_you: `NATAL_YOU_${row.contentKey.split("/").at(-1)}`, body_they: `NATAL_FRIEND_${row.contentKey.split("/").at(-1)}` };
  if (/^fallback-hook\/planet-(?:intro|lived)\//.test(row.contentKey)) return { ...row, body: "WRONG_SHARED_INTRO", body_you: "WRONG_SHARED_INTRO", body_they: "WRONG_SHARED_INTRO" };
  return row;
}) };
for (const factory of [createFallbackRenderer, createShippedRenderer]) {
  const marked = factory(templates, markedRows);
  const absent = factory(templates, { ...markedRows, hookRows: markedRows.hookRows.filter(row => !row.contentKey.startsWith("fallback-hook/natal/planet-intro/")) });
  const held = ["needs_review", "rejected"].map(review_status => factory(templates, { ...markedRows, hookRows: markedRows.hookRows.map(row => row.contentKey.startsWith("fallback-hook/natal/planet-intro/") ? { ...row, review_status } : row) }));
  for (const planet of planets) for (const sign of natalPlacementSigns) for (const voice of ["you", "QA Friend"]) {
    const facts = { planet, sign, voice };
    const body = marked.renderNatalPlacement(facts).body;
    assert.ok(body.startsWith(`NATAL_${voice === "you" ? "YOU" : "FRIEND"}_${planet}`), JSON.stringify(facts));
    assert.ok(!body.includes("WRONG_SHARED_INTRO"));
    for (const renderer of [absent, ...held]) assert.doesNotMatch(renderer.renderNatalPlacement(facts).body, /NATAL_YOU_|NATAL_FRIEND_|WRONG_SHARED_INTRO/);
    totals.forcedFallbacks += 1;
  }
}

for (const angle of angles) for (const sign of natalPlacementSigns) for (const voice of ["you", "QA Friend"]) {
  const key = `fallback-hook/angle-intro/${angle}`;
  const intro = rows.hookRows.find(row => row.contentKey === key);
  assert.ok(intro, key);
  assert.ok(natalPlacementResolverDependencyKeys(angle, sign).includes(key));
  assert.ok(natalPlacementSourceGroups(angle, sign).flatMap(group => group.sources).some(source => source.key === key));
  const facts = { angle, sign, voice };
  const rendered = renderNatalAngle(facts);
  assert.ok(rendered.body.startsWith(voice === "you" ? intro.body_you : intro.body_they), JSON.stringify(facts));
  for (const browser of browsers) assert.equal(browser.renderNatalAngle(facts).body, rendered.body);
  totals.angles += 1;
}
console.log(JSON.stringify({ status: "PASS", totals, byPlanet }, null, 2));
