export function selectEligibleFriendTransits<T>(
  candidates: readonly T[],
  isEligible: (candidate: T) => boolean,
  limit = 8
): T[] {
  if (limit <= 0) return [];

  const selected: T[] = [];

  for (const candidate of candidates) {
    if (!isEligible(candidate)) continue;

    selected.push(candidate);
    if (selected.length >= limit) break;
  }

  return selected;
}
