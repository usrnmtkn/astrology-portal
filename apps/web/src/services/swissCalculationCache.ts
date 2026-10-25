type SwissCalculation = { values: Float64Array; returnedFlags: number };

/** Reuse only identical calls on the same fixed-configuration ephemeris instance.
 * Keep exact Julian days and flags; never round dates or share mutable results.
 * Capacity is a positive number of retained calculations.
 */
export function memoizeSwissCalculation<Engine extends object>(
  calculate: (engine: Engine, julianDay: number, body: number, flags: number) => SwissCalculation,
  capacity = 16_384
) {
  type Key = { julianDay: number; body: number; flags: number };
  const engines = new WeakMap<Engine, {
    values: Map<number, Map<number, Map<number, SwissCalculation>>>;
    keys: Key[];
    next: number;
  }>();
  return (engine: Engine, julianDay: number, body: number, flags: number): SwissCalculation => {
    let cache = engines.get(engine);
    if (!cache) engines.set(engine, cache = { values: new Map(), keys: [], next: 0 });
    // Numeric maps retain the exact IEEE-754 day. Avoid formatting and hashing
    // a long decimal string for every point in the same astronomical scan.
    let result = cache.values.get(body)?.get(flags)?.get(julianDay);
    if (!result) {
      // The calculation returns a fresh, validated vector. Errors throw before
      // insertion or eviction. Only this cache retains the original result.
      result = calculate(engine, julianDay, body, flags);
      // A ring keeps eviction constant-time even after many astronomical scans.
      const oldest = cache.keys[cache.next];
      if (oldest) {
        const group = cache.values.get(oldest.body)!;
        const dates = group.get(oldest.flags)!;
        dates.delete(oldest.julianDay);
        if (!dates.size) group.delete(oldest.flags);
        if (!group.size) cache.values.delete(oldest.body);
      }
      let group = cache.values.get(body);
      if (!group) cache.values.set(body, group = new Map());
      let dates = group.get(flags);
      if (!dates) group.set(flags, dates = new Map());
      dates.set(julianDay, result);
      cache.keys[cache.next] = { julianDay, body, flags };
      cache.next = (cache.next + 1) % capacity;
    }
    return { ...result, values: result.values.slice() };
  };
}
