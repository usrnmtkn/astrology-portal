import type { LocationInput, SkySnapshot } from "../types";
import { validateAstrologyFacts } from "./astrologyFacts";

export const VERIFIED_SKY_CACHE_SCHEMA = "tldrastro-verified-sky-v1";
export const VERIFIED_SKY_CACHE_PREFIX = "tldrastro:verifiedSky:v1";
export const VERIFIED_SKY_CACHE_MAX_AGE_MS = 30 * 60 * 1000;
export const VERIFIED_NATAL_SKY_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const VERIFIED_SKY_CACHE_MAX_ENTRIES = 24;

type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;

type VerifiedSkyCacheRecord = {
  schema: typeof VERIFIED_SKY_CACHE_SCHEMA;
  cacheKey: string;
  verifiedAt: string;
  snapshot: SkySnapshot;
};

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function finiteCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function isVerifiedSkySnapshot(value: unknown): value is SkySnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Partial<SkySnapshot>;
  const facts = snapshot.facts ?? [];
  const validation = validateAstrologyFacts(facts);

  return typeof snapshot.generatedAt === "string"
    && Number.isFinite(Date.parse(snapshot.generatedAt))
    && typeof snapshot.ascendant === "string"
    && typeof snapshot.midheaven === "string"
    && Array.isArray(snapshot.positions)
    && snapshot.positions.length > 0
    && Array.isArray(snapshot.aspects)
    && Boolean(snapshot.location)
    && finiteCoordinate(snapshot.location?.latitude)
    && finiteCoordinate(snapshot.location?.longitude)
    && Boolean(snapshot.calculationProvenance?.calculationVersion)
    && facts.length > 0
    && facts.every((fact) => (
      (
        fact.validationStatus === "verified-primary"
        || fact.validationStatus === "verified-independent"
      )
      && fact.calculatedAt === snapshot.generatedAt
      && fact.provenance.calculationVersion
        === snapshot.calculationProvenance?.calculationVersion
    ))
    && validation.ok;
}

function isCacheRecord(value: unknown, cacheKey: string): value is VerifiedSkyCacheRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<VerifiedSkyCacheRecord>;

  return record.schema === VERIFIED_SKY_CACHE_SCHEMA
    && record.cacheKey === cacheKey
    && typeof record.verifiedAt === "string"
    && Number.isFinite(Date.parse(record.verifiedAt))
    && isVerifiedSkySnapshot(record.snapshot);
}

function removeQuietly(storage: StorageLike, cacheKey: string) {
  try {
    storage.removeItem(cacheKey);
  } catch {
    return;
  }
}

function cacheKeys(storage: StorageLike) {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(`${VERIFIED_SKY_CACHE_PREFIX}:`)) {
      keys.push(key);
    }
  }

  return keys;
}

function pruneVerifiedSkyCache(storage: StorageLike) {
  const records = cacheKeys(storage)
    .map((cacheKey) => {
      try {
        const raw = storage.getItem(cacheKey);
        const parsed = raw ? JSON.parse(raw) : null;
        if (!isCacheRecord(parsed, cacheKey)) {
          removeQuietly(storage, cacheKey);
          return null;
        }
        return { cacheKey, verifiedAt: Date.parse(parsed.verifiedAt) };
      } catch {
        removeQuietly(storage, cacheKey);
        return null;
      }
    })
    .filter((record): record is { cacheKey: string; verifiedAt: number } => Boolean(record))
    .sort((a, b) => b.verifiedAt - a.verifiedAt);

  for (const record of records.slice(VERIFIED_SKY_CACHE_MAX_ENTRIES)) {
    removeQuietly(storage, record.cacheKey);
  }
}

export function skySnapshotCacheKey(location: LocationInput, date: string) {
  const latitude = Number.isFinite(location.latitude) ? location.latitude.toFixed(3) : "0";
  const longitude = Number.isFinite(location.longitude) ? location.longitude.toFixed(3) : "0";

  return `${VERIFIED_SKY_CACHE_PREFIX}:${date}:${latitude}:${longitude}:${location.timeZone ?? ""}`;
}

export function natalSkySnapshotCacheKey(location: LocationInput, birthDateTime: Date) {
  return skySnapshotCacheKey(location, `natal-${birthDateTime.toISOString()}`);
}

export function readCachedSkySnapshot(
  cacheKey: string,
  options: {
    now?: number;
    maxAgeMs?: number;
    storage?: StorageLike | null;
  } = {}
): SkySnapshot | null {
  const storage = options.storage ?? browserStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(cacheKey);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!isCacheRecord(parsed, cacheKey)) {
      removeQuietly(storage, cacheKey);
      return null;
    }

    const now = options.now ?? Date.now();
    const verifiedAtMs = Date.parse(parsed.verifiedAt);
    const ageMs = now - verifiedAtMs;
    const maxAgeMs = options.maxAgeMs ?? VERIFIED_SKY_CACHE_MAX_AGE_MS;

    if (ageMs < -5 * 60 * 1000 || ageMs > maxAgeMs) {
      removeQuietly(storage, cacheKey);
      return null;
    }

    return {
      ...parsed.snapshot,
      cacheState: {
        source: "last-known-verified" as const,
        schema: VERIFIED_SKY_CACHE_SCHEMA as typeof VERIFIED_SKY_CACHE_SCHEMA,
        verifiedAt: parsed.verifiedAt,
        ageMs: Math.max(0, ageMs)
      },
      facts: (parsed.snapshot.facts ?? []).map((fact) => ({
        ...fact,
        snapshotSource: "local" as const,
        hydrationState: "hydrated" as const,
        cacheAgeMs: Math.max(0, ageMs)
      }))
    };
  } catch {
    removeQuietly(storage, cacheKey);
    return null;
  }
}

export function writeCachedSkySnapshot(
  cacheKey: string,
  snapshot: SkySnapshot,
  options: {
    now?: number;
    storage?: StorageLike | null;
  } = {}
) {
  const storage = options.storage ?? browserStorage();
  if (!storage || !isVerifiedSkySnapshot(snapshot)) {
    return false;
  }

  const record: VerifiedSkyCacheRecord = {
    schema: VERIFIED_SKY_CACHE_SCHEMA,
    cacheKey,
    verifiedAt: new Date(options.now ?? Date.now()).toISOString(),
    snapshot: {
      ...snapshot,
      cacheState: undefined
    }
  };

  try {
    storage.setItem(cacheKey, JSON.stringify(record));
    pruneVerifiedSkyCache(storage);
    return true;
  } catch {
    return false;
  }
}
