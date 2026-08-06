export type PairDailyVariant = 1 | 2 | 3;

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
): PairDailyVariant {
  const normalizedDate = isoDate.trim().slice(0, 10);
  const parsedDate = Date.parse(`${normalizedDate}T00:00:00Z`);
  const day = Number.isFinite(parsedDate) ? Math.floor(parsedDate / 86_400_000) : 0;

  return ((stablePairIdentityHash(readerChartId, friendChartId) + day) % 3 + 1) as PairDailyVariant;
}
