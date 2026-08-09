#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { createServer } from "vite";

class MemoryStorage {
  values = new Map();

  get length() {
    return this.values.size;
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }
}

const vite = await createServer({
  root: path.resolve("apps/web"),
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  logLevel: "error"
});

try {
  const cache = await vite.ssrLoadModule("/src/services/verifiedSkyCache.ts");
  const storage = new MemoryStorage();
  const now = Date.parse("2026-07-30T12:00:00.000Z");
  const location = {
    label: "New York City, NY",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York"
  };
  const cacheKey = cache.skySnapshotCacheKey(location, "2026-07-30");
  const provenance = {
    source: "local-swisseph-wasm",
    library: "swisseph-wasm",
    libraryVersion: "0.0.5",
    ephemerisFiles: ["swisseph.wasm", "swisseph.data", "semo_18.se1"],
    zodiac: "tropical",
    frame: "geocentric",
    houseSystem: "whole_sign",
    planetHouseSystem: "whole_sign",
    nodeType: "true",
    lilithType: "true",
    calculationVersion: "tldrastro-calculation-v3",
    actualEphemeris: "swiss",
    returnedEphemerisFlags: [258]
  };
  const fact = {
    id: "fact.position.sun.2026-07-30T11:55:00.000Z",
    kind: "position",
    calculatedAt: "2026-07-30T11:55:00.000Z",
    timeZone: "America/New_York",
    provenance,
    validationStatus: "verified-primary",
    planetOrPointId: "sun",
    targetType: "planet",
    longitude: 127,
    normalizedSign: "Leo",
    normalizedDegree: 7,
    directRetrograde: "direct",
    role: "current-sky"
  };
  const snapshot = {
    location,
    generatedAt: "2026-07-30T11:55:00.000Z",
    calculationProvenance: provenance,
    ascendant: "Libra",
    midheaven: "Cancer",
    moonPhase: "Full Moon",
    dominantElement: "Fire",
    positions: [{
      planet: "Sun",
      glyph: "☉",
      longitude: 127,
      sign: "Leo",
      signGlyph: "♌",
      degree: 7,
      house: 11,
      motion: "direct"
    }],
    aspects: [],
    facts: [fact]
  };

  assert.equal(
    cache.writeCachedSkySnapshot(cacheKey, snapshot, { now, storage }),
    true,
    "A fully validated current-sky snapshot should be cached."
  );
  assert.equal(cache.VERIFIED_SKY_CACHE_SCHEMA, "tldrastro-verified-sky-v2");

  const staleMeanLilithKey = cache.skySnapshotCacheKey(location, "2026-07-29");
  const staleProvenance = {
    ...provenance,
    lilithType: "mean",
    calculationVersion: "tldrastro-calculation-v2"
  };
  assert.equal(
    cache.writeCachedSkySnapshot(
      staleMeanLilithKey,
      {
        ...snapshot,
        calculationProvenance: staleProvenance,
        facts: [{ ...fact, provenance: staleProvenance }]
      },
      { now, storage }
    ),
    false,
    "A v2 mean-Lilith snapshot must fail closed instead of re-entering the verified cache."
  );

  const moshierFallbackKey = cache.skySnapshotCacheKey(location, "2026-07-28");
  const moshierProvenance = {
    ...provenance,
    actualEphemeris: "swiss",
    returnedEphemerisFlags: [260]
  };
  assert.equal(
    cache.writeCachedSkySnapshot(
      moshierFallbackKey,
      {
        ...snapshot,
        calculationProvenance: moshierProvenance,
        facts: [{ ...fact, provenance: moshierProvenance }]
      },
      { now, storage }
    ),
    false,
    "A Moshier fallback flag must fail closed instead of entering the verified cache as Swiss."
  );

  const restored = cache.readCachedSkySnapshot(cacheKey, {
    now: now + 5 * 60 * 1000,
    storage
  });
  assert.ok(restored, "A recent verified snapshot should be restored.");
  assert.equal(restored.cacheState.source, "last-known-verified");
  assert.equal(restored.cacheState.ageMs, 5 * 60 * 1000);
  assert.equal(restored.facts[0].snapshotSource, "local");
  assert.equal(restored.facts[0].hydrationState, "hydrated");
  assert.equal(restored.facts[0].cacheAgeMs, 5 * 60 * 1000);

  assert.equal(
    cache.readCachedSkySnapshot(cacheKey, {
      now: now + cache.VERIFIED_SKY_CACHE_MAX_AGE_MS + 1,
      storage
    }),
    null,
    "An expired current-sky snapshot must fail closed."
  );

  const invalidKey = cache.skySnapshotCacheKey(location, "2026-07-31");
  assert.equal(
    cache.writeCachedSkySnapshot(
      invalidKey,
      { ...snapshot, facts: [{ ...fact, validationStatus: "invalid" }] },
      { now, storage }
    ),
    false,
    "Invalid facts must never enter the verified cache."
  );

  const emptyFactsKey = cache.skySnapshotCacheKey(location, "2026-08-01");
  assert.equal(
    cache.writeCachedSkySnapshot(
      emptyFactsKey,
      { ...snapshot, facts: [] },
      { now, storage }
    ),
    false,
    "A snapshot with no immutable facts must never be considered verified."
  );

  const mismatchedFactsKey = cache.skySnapshotCacheKey(location, "2026-08-02");
  assert.equal(
    cache.writeCachedSkySnapshot(
      mismatchedFactsKey,
      {
        ...snapshot,
        facts: [{
          ...fact,
          calculatedAt: "2026-07-30T10:00:00.000Z"
        }]
      },
      { now, storage }
    ),
    false,
    "Facts calculated for a different snapshot timestamp must fail closed."
  );

  const otherLocationKey = cache.skySnapshotCacheKey(
    { ...location, latitude: 34.0522, longitude: -118.2437 },
    "2026-07-30"
  );
  assert.notEqual(cacheKey, otherLocationKey, "Cache keys must isolate locations.");
  assert.notEqual(
    cacheKey,
    cache.skySnapshotCacheKey(
      { ...location, timeZone: "America/Chicago" },
      "2026-07-30"
    ),
    "Cache keys must isolate timezone interpretations."
  );
  const natalCacheKey = cache.natalSkySnapshotCacheKey(
    location,
    new Date("1990-04-12T14:30:00.000Z")
  );
  assert.match(natalCacheKey, /:natal-1990-04-12T14:30:00\.000Z:/);
  assert.equal(
    cache.writeCachedSkySnapshot(natalCacheKey, snapshot, { now, storage }),
    true,
    "A verified natal snapshot should use the same validated cache envelope."
  );
  assert.ok(
    cache.readCachedSkySnapshot(natalCacheKey, {
      now: now + 7 * 24 * 60 * 60 * 1000,
      maxAgeMs: cache.VERIFIED_NATAL_SKY_CACHE_MAX_AGE_MS,
      storage
    }),
    "An immutable natal snapshot should remain available across visits."
  );

  const boundedStorage = new MemoryStorage();
  for (let index = 0; index <= cache.VERIFIED_SKY_CACHE_MAX_ENTRIES; index += 1) {
    const day = String(index + 1).padStart(2, "0");
    const key = cache.skySnapshotCacheKey(location, `2026-09-${day}`);
    assert.equal(
      cache.writeCachedSkySnapshot(key, snapshot, {
        now: now + index,
        storage: boundedStorage
      }),
      true
    );
  }
  assert.equal(
    boundedStorage.length,
    cache.VERIFIED_SKY_CACHE_MAX_ENTRIES,
    "The verified cache must evict its oldest entry."
  );

  console.log(JSON.stringify({
    ok: true,
    contract: "Only recent, non-empty, validated current-sky facts can be restored.",
    schema: cache.VERIFIED_SKY_CACHE_SCHEMA,
    maxAgeMinutes: cache.VERIFIED_SKY_CACHE_MAX_AGE_MS / 60000
  }, null, 2));
} finally {
  await vite.close();
}
