type SwissCalculation = { values: Float64Array; returnedFlags: number };

/** Reuse only identical calls on the same fixed-configuration ephemeris instance.
 * Keep exact Julian days and flags; never round dates or share mutable results.
 * Capacity is a positive number of retained calculations.
 */
export function memoizeSwissCalculation<Engine extends object>(
  calculate: (engine: Engine, julianDay: number, body: number, flags: number) => SwissCalculation,
  capacity = 16_384
) {
  const engines = new WeakMap<Engine, { values: Map<string, SwissCalculation>; keys: string[]; next: number }>();
  return (engine: Engine, julianDay: number, body: number, flags: number): SwissCalculation => {
    let cache = engines.get(engine);
    if (!cache) engines.set(engine, cache = { values: new Map(), keys: [], next: 0 });
    const key = `${julianDay}|${body}|${flags}`;
    let result = cache.values.get(key);
    if (!result) {
      // The calculation returns a fresh, validated vector. Errors throw before
      // insertion or eviction. Only this cache retains the original result.
      result = calculate(engine, julianDay, body, flags);
      // A ring keeps eviction constant-time even after many astronomical scans.
      cache.values.delete(cache.keys[cache.next]);
      cache.keys[cache.next] = key;
      cache.next = (cache.next + 1) % capacity;
      cache.values.set(key, result);
    }
    return { ...result, values: result.values.slice() };
  };
}
