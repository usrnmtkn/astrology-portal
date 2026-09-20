import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  canonicalSkyWriteupTarget,
  parseSkyWriteupKey,
  remapSkyWriteupRow,
  sampleSkyWriteupRows
} from "./sky-writeup-variable-import-contract.mjs";
import { parseCsv, writeSample } from "./validate-sky-writeup-variable-import.mjs";

test("legacy writing-library keys remap onto live Sky Placement paths", () => {
  const planet = parseSkyWriteupKey("writing-library/planet/sun#planetDescriptor");
  assert.equal(planet.key, "sky-placement/article/sun/aries#ingress.sources.planetDescriptor");
  const season = parseSkyWriteupKey("writing-library/sign/virgo#zodiacSeason");
  assert.equal(season.key, "fallback-hook/zodiac-season/virgo#body");
  const placement = parseSkyWriteupKey("sky-placement/sun/aries#placementThesis");
  assert.equal(placement.key, "sky-placement/article/sun/aries#ingress.sources.placementThesis");
  const article = parseSkyWriteupKey("sky-placement/article/sun/virgo#tldrWhat");
  assert.equal(article.key, "sky-placement/article/sun/virgo#tldrWhat");
  assert.match(parseSkyWriteupKey("writing-library/planet/sun#notAField").error, /Unknown/);
});

test("share hosts stay on Aries for planet copy and Sun for sign copy", () => {
  assert.equal(
    canonicalSkyWriteupTarget({ body: "venus", variable: "planetFunction" }).contentKey,
    "sky-placement/article/venus/aries"
  );
  assert.equal(
    canonicalSkyWriteupTarget({ sign: "libra", variable: "signMethod" }).contentKey,
    "sky-placement/article/sun/libra"
  );
});

test("phrase fields hold back a second permission sentence instead of importing it", () => {
  const remapped = remapSkyWriteupRow({
    key: "writing-library/sign/gemini#signShadow",
    text: "the habit of staying scattered. You're allowed to not know yet.",
    importAction: "create"
  });
  assert.equal(remapped.text, "the habit of staying scattered");
  assert.match(remapped.heldBackText, /allowed/i);
  assert.equal(remapped.reviewStatus, "needs_review");
  assert.equal(remapped.importReady, true);
});

test("app-banned constructions block import-ready status", () => {
  const remapped = remapSkyWriteupRow({
    key: "sky-placement/chiron/aries#openingHook",
    text: "This is about the quiet pain that shaped your personality.",
    importAction: "create"
  });
  assert.equal(remapped.importReady, false);
  assert.match(remapped.lintFindings, /this is about/i);
});

test("version-of-you and permission closings block import-ready status", () => {
  const version = remapSkyWriteupRow({
    key: "sky-placement/article/sun/leo#ingress.sources.placementShadow",
    text: "You start performing the version of you that gets approval.",
    importAction: "create"
  });
  assert.equal(version.importReady, false);
  const permission = remapSkyWriteupRow({
    key: "sky-placement/article/sun/aquarius#ingress.sources.closingLine",
    text: "You don't have to sacrifice connection to be free.",
    importAction: "create"
  });
  assert.equal(permission.importReady, false);
});

test("live skip_if_present rows keep their wording", () => {
  const remapped = remapSkyWriteupRow({
    key: "writing-library/sign/virgo#signShadow",
    text: "the belief that if you could just get organized enough, you would finally feel okay. You do not have to fix everything to deserve rest.",
    importAction: "skip_if_present",
    reviewStatus: "approved"
  });
  assert.match(remapped.text, /You do not have to/);
  assert.equal(remapped.heldBackText, "");
  assert.equal(remapped.importReady, true);
});

test("sample spreadsheet uses canonical keys and stays import-ready", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sky-writeup-sample-"));
  const destination = path.join(dir, "sample.csv");
  const written = writeSample(destination);
  assert.equal(written.rows.every(row => row.importReady), true);
  const parsed = parseCsv(fs.readFileSync(destination, "utf8"));
  assert.equal(parsed.length, sampleSkyWriteupRows().length);
  assert(parsed.every(row => !row.key.startsWith("writing-library/")));
  assert(parsed.some(row => row.key.startsWith("fallback-hook/zodiac-season/")));
});
