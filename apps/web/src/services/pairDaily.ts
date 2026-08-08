export type PairDailyVariantSeed = number;

function normalizedPairDailySeed(variant: PairDailyVariantSeed) {
  return Number.isFinite(variant)
    ? Math.max(1, Math.abs(Math.trunc(variant)))
    : 1;
}

export function selectPairDailyDriver<T>(
  drivers: readonly T[],
  variant: PairDailyVariantSeed
): T | null {
  if (drivers.length === 0) return null;

  return drivers[(normalizedPairDailySeed(variant) - 1) % drivers.length] ?? null;
}

function stablePairIdentityHash(readerChartId: string, friendChartId: string) {
  const seed = `${readerChartId}:${friendChartId}`;
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

/**
 * Keeps pair-daily copy stable on refresh while advancing one slot per ISO day.
 * The chart-pair hash supplies the stable offset; the UTC day supplies rotation.
 */
export function stablePairDailyVariant(
  readerChartId: string,
  friendChartId: string,
  isoDate: string
): PairDailyVariantSeed {
  const normalizedDate = isoDate.trim().slice(0, 10);
  const parsedDate = Date.parse(`${normalizedDate}T00:00:00Z`);
  const day = Number.isFinite(parsedDate) ? Math.floor(parsedDate / 86_400_000) : 0;

  // Return a stable positive seed rather than a fixed 1-3 slot. Each approved
  // frame family maps this seed across its own eligible row count.
  return ((stablePairIdentityHash(readerChartId, friendChartId) + day) % 2_147_483_647) + 1;
}
