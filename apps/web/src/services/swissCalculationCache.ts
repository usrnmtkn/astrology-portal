type SwissCalculation = { values: Float64Array; returnedFlags: number };

/** Reuse only identical calls on the same fixed-configuration ephemeris instance.
 * Keep exact Julian days and flags; never round dates or share mutable results.
 */
export function memoizeSwissCalculation<Engine extends object>(
  calculate: (engine: Engine, julianDay: number, body: number, flags: number) => SwissCalculation,
  capacity = 16_384
) {
  const engines = new WeakMap<Engine, { values: Map<string, SwissCalculation>; keys: string[]; next: number }>();
  return (engine: Engine, julianDay: number, body: number, flags: number): SwissCalculation => {
    if (capacity <= 0) return calculate(engine, julianDay, body, flags);
    let cache = engines.get(engine);
    if (!cache) engines.set(engine, cache = { values: new Map(), keys: [], next: 0 });
    const key = `${julianDay}|${body}|${flags}`;
    const cached = cache.values.get(key);
    if (cached) return { values: cached.values.slice(), returnedFlags: cached.returnedFlags };
    // Failed calculations throw before reaching the cache. The caller still
    // receives the original validated result and its actual ephemeris flags.
    const result = calculate(engine, julianDay, body, flags);
    // A ring keeps eviction constant-time even after many astronomical scans.
    const oldest = cache.keys[cache.next];
    if (oldest !== undefined) cache.values.delete(oldest);
    cache.keys[cache.next] = key;
    cache.next = (cache.next + 1) % capacity;
    cache.values.set(key, { values: result.values.slice(), returnedFlags: result.returnedFlags });
    return result;
  };
}
