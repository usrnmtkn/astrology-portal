/** Versioned laboratory settings. Throughput is bytes/second, not bits/second. */
export const LOADING_PROTOCOL = 'tldr-loading/v1';
export const profiles = Object.freeze({
  desktop: { viewport: { width: 1440, height: 1000 }, cpu: 1, latency: 40, download: 2_500_000, upload: 625_000 },
  mobile: { viewport: { width: 390, height: 844 }, cpu: 4, latency: 80, download: 200_000, upload: 93_750 },
  adverse: { viewport: { width: 390, height: 844 }, cpu: 8, latency: 150, download: 100_000, upload: 31_250 }
});
export const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length ? (sorted[mid] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2 : null;
};

// Seeded resampling keeps the report reproducible. Resample matched pairs,
// never independent baseline/candidate populations or pooled route/cache cells.
export function pairedInterval(deltas, iterations = 10_000) {
  let seed = 0x51ca1ab;
  const random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2 ** 32; };
  const samples = Array.from({ length: iterations }, () => median(deltas.map(() => deltas[Math.floor(random() * deltas.length)])))
    .sort((a, b) => a - b);
  return [samples[Math.floor(iterations * .025)], samples[Math.ceil(iterations * .975) - 1]];
}

/** Fail closed on missing/failed attempts, changed inputs, or incomplete pairs.
 * Inputs are one counterbalanced experiment, not two unrelated result files. */
export function compareLoading(experiment) {
  const invalid = message => ({ status: 'invalid', reasons: [message], cells: [] });
  if (experiment.protocol !== LOADING_PROTOCOL) return invalid('Unsupported measurement protocol.');
  if (!experiment.identity?.baseline || !experiment.identity?.candidate || !experiment.fixtureHash) return invalid('Pinned build and fixture identities are required.');
  if (!experiment.publicationHash || experiment.traced) return invalid('An unchanged publication identity and untraced timing runs are required.');
  if (!Array.isArray(experiment.requiredCells) || !experiment.requiredCells.length) return invalid('Required cells must be declared before running.');
  if (!Array.isArray(experiment.samples)) return invalid('Missing samples.');
  if (!Number.isInteger(experiment.plannedPairs) || experiment.plannedPairs < 1 || !experiment.completedAt) return invalid('A completed experiment and its planned pair count are required.');
  const cellKeys = experiment.requiredCells.map(({ scenario, profile, cache, milestone }) => JSON.stringify([scenario, profile, cache, milestone]));
  if (new Set(cellKeys).size !== cellKeys.length) return invalid('Duplicate required cell.');
  if (experiment.requiredCells.filter(cell => cell.primary).length !== 1) return invalid('Declare exactly one primary improvement before running.');
  if (experiment.samples.some(row => !experiment.requiredCells.some(cell => cell.scenario === row.scenario && cell.profile === row.profile && cell.cache === row.cache))) return invalid('Undeclared samples cannot be ignored.');
  const cells = [];
  for (const definition of experiment.requiredCells) {
    const { scenario, profile, cache, milestone } = definition;
    if (!profiles[profile] || !['fresh', 'reload'].includes(cache) || !['usable', 'content', 'fonts'].includes(milestone)) return invalid('Invalid cell definition.');
    if (JSON.stringify(experiment.profiles?.[profile]) !== JSON.stringify(profiles[profile])) return invalid('Laboratory profile differs from the frozen protocol.');
    const rows = experiment.samples.filter(row => row.scenario === scenario && row.profile === profile && row.cache === cache);
    const reasons = [];
    const contentIdentities = new Set(experiment.samples.filter(row => row.scenario === scenario && row.profile === profile && !row.error && !row.errors?.length).map(row => row.contentHash));
    if (contentIdentities.size !== 1) reasons.push('Required text changed across repeat visits or cache states');
    const pairs = new Map();
    for (const row of rows) {
      if (!['baseline', 'candidate'].includes(row.variant) || !Number.isInteger(row.pair) || row.pair < 0 || row.pair >= experiment.plannedPairs) return invalid('Invalid pair identity.');
      const pair = pairs.get(row.pair) ?? {};
      if (pair[row.variant]) return invalid('Duplicate attempt; reruns cannot replace failed samples.');
      pair[row.variant] = row;
      pairs.set(row.pair, pair);
      if (row.error || row.errors?.length || !Number.isFinite(row.marks?.[milestone]) || row.marks[milestone] < 0) reasons.push(`${row.variant} pair ${row.pair}: failed or incomplete attempt`);
      if (row.buildHash !== experiment.identity[row.variant] || row.fixtureHash !== experiment.fixtureHash) reasons.push('Build or fixture changed during measurement');
      if (row.publicationHash !== experiment.publicationHash) reasons.push('Publication identity changed during measurement');
    }
    if (pairs.size < 30) reasons.push(`Only ${pairs.size} pairs; 30 are required`);
    if (pairs.size !== experiment.plannedPairs) reasons.push('A planned pair is missing');
    const a = [], b = [], delta = [];
    for (const [id, pair] of pairs) {
      if (!pair.baseline || !pair.candidate) { reasons.push(`Unmatched pair ${id}`); continue; }
      if (pair.baseline.contentHash !== pair.candidate.contentHash || !pair.baseline.contentHash) reasons.push(`Content differs in pair ${id}`);
      if (pair.baseline.publicationHash !== pair.candidate.publicationHash || !pair.baseline.publicationHash) reasons.push(`Publication identity differs in pair ${id}`);
      const before = pair.baseline.marks?.[milestone], after = pair.candidate.marks?.[milestone];
      if (!Number.isFinite(before) || !Number.isFinite(after)) continue;
      a.push(before); b.push(after); delta.push(after - before);
    }
    const before = median(a), after = median(b), difference = median(delta);
    const interval = delta.length ? pairedInterval(delta) : [null, null];
    const tolerance = before == null ? 0 : Math.max(100, before * .03);
    const meaningful = before == null ? Infinity : Math.max(before * .10, before >= 2500 ? 250 : 50);
    // Even a statistically unresolved regression must not be called a pass.
    const regression = before != null && (after - before > tolerance || difference > tolerance);
    const improved = !reasons.length && interval[1] < 0 && before - after >= meaningful && -difference >= meaningful;
    const safe = !reasons.length && !regression && interval[1] <= tolerance;
    const status = reasons.length ? 'inconclusive' : regression ? 'regression' : definition.primary ? (improved ? 'improved' : 'inconclusive') : safe ? 'non-regressing' : 'inconclusive';
    cells.push({ ...definition, pairs: pairs.size, baselineMedianMs: before, candidateMedianMs: after,
      pairedMedianDeltaMs: difference, paired95IntervalMs: interval, regressionToleranceMs: tolerance,
      minimumImprovementMs: meaningful, status, reasons: [...new Set(reasons)] });
  }
  if (!experiment.requiredCells.some(cell => cell.primary)) return invalid('Declare the primary improvement before running.');
  return { status: cells.every(cell => ['improved', 'non-regressing'].includes(cell.status)) ? 'pass' : 'blocked', cells };
}
