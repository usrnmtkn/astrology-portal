import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = await mkdtemp(path.join(os.tmpdir(), "horizons-phase-regression-"));
const commands = ["10", "301", "199", "299", "499", "599", "699", "799", "899", "999", "2060"];
const date = "2026-03-08T09:30:00.000Z";
const later = "2026-03-08T15:30:00.000Z";
const cases = [
  { name: "fast Moon passes exact trine", first: 119.8641894, second: 0, nextFirst: 122.8790557, nextSecond: 0, aspect: "trine", phase: "applying" },
  { name: "approach from opposite orientation", first: 0, second: 120.9666161, nextFirst: 0, nextSecond: 117.7005148, aspect: "trine", phase: "applying" },
  { name: "cross quincunx", first: 148.6541173, second: 0, nextFirst: 151.6845707, nextSecond: 0, aspect: "quincunx", phase: "applying" },
  { name: "retrograde approach crosses square", first: 91.0608252, second: 0, nextFirst: 87.8561398, nextSecond: 0, aspect: "square", phase: "applying" },
  { name: "already separating", first: 120.5, second: 0, nextFirst: 123.5, nextSecond: 0, aspect: "trine", phase: "separating" },
  { name: "equal endpoint orbs still approach", first: 119, second: 0, nextFirst: 121, nextSecond: 0, aspect: "trine", phase: "applying" },
  { name: "conjunction crosses zero", first: 359.9, second: 0, nextFirst: 2.9, nextSecond: 0, aspect: "conjunction", phase: "applying" },
  { name: "opposition crosses signed-angle boundary", first: 179.9, second: 0, nextFirst: 182.9, nextSecond: 0, aspect: "opposition", phase: "applying" },
  { name: "relative motion includes target", first: 119.9, second: 0, nextFirst: 120, nextSecond: 0.5, aspect: "trine", phase: "separating" },
  { name: "both bodies wrap", first: 359.8, second: 0.1, nextFirst: 2.8, nextSecond: 0.3, aspect: "conjunction", phase: "applying" },
  { name: "exact at current time", first: 120, second: 0, nextFirst: 123, nextSecond: 0, aspect: "trine", phase: "exact" },
  { name: "conjunction already separating", first: 0.1, second: 0, nextFirst: 3.1, nextSecond: 0, aspect: "conjunction", phase: "separating" }
];

try {
  // These synthetic cache values exercise the reference adapter, not planetary
  // accuracy. Any unexpected live request fails the regression.
  const networkGuard = path.join(directory, "deny-network.mjs");
  await writeFile(networkGuard, "globalThis.fetch = async () => { throw new Error('Unexpected live request in synthetic regression'); };\n");
  for (const example of cases) {
    const cache = {};
    for (const [index, command] of commands.entries()) {
      cache[`${command}:${date}`] = { longitude: (index * 23 + 17) % 360, latitude: 0 };
      cache[`${command}:${later}`] = { longitude: (index * 23 + 17.1) % 360, latitude: 0 };
    }
    cache[`301:${date}`].longitude = example.first;
    cache[`599:${date}`].longitude = example.second;
    cache[`301:${later}`].longitude = example.nextFirst;
    cache[`599:${later}`].longitude = example.nextSecond;
    const cachePath = path.join(directory, "cache.json");
    await writeFile(cachePath, JSON.stringify(cache));
    const result = spawnSync(process.execPath, ["--import", networkGuard, "scripts/providers/nasa-horizons-provider.mjs"], {
      cwd: root,
      input: JSON.stringify({ date }),
      encoding: "utf8",
      env: { ...process.env, TLDR_ASTRO_HORIZONS_CACHE: cachePath }
    });
    assert.equal(result.status, 0, `${example.name}: provider failed`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.gaps.filter((gap) => gap.category === "planetary-position").length, 0, `${example.name}: unexpected request or missing cached body`);
    const fact = output.facts.find((candidate) => candidate.kind === "aspect"
      && candidate.planetOrPointId === "moon" && candidate.targetId === "jupiter"
      && candidate.aspectType === example.aspect);
    assert.ok(fact, `${example.name}: missing aspect`);
    assert.equal(fact.applyingSeparating, example.phase, example.name);
  }
  console.log(`NASA/JPL provider phase regression passed (${cases.length} synthetic cases; no network).`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
