import { readFile } from 'node:fs/promises';
import { median } from './lib/loading-comparison.mjs';
if (!process.argv[2]) throw new Error('Usage: node scripts/summarize-app-loading.mjs /private/results.json');
const experiment = JSON.parse(await readFile(process.argv[2], 'utf8'));
const groups = new Map();
for (const sample of experiment.samples) {
  const key = [sample.variant, sample.scenario, sample.profile, sample.cache].join(' / ');
  const group = groups.get(key) ?? []; group.push(sample); groups.set(key, group);
}
console.log(`Protocol: ${experiment.protocol}; environment: ${experiment.environment}; browser: ${experiment.browser}`);
console.log('Usable times include every recorded usable mark (count shown), including visits that later failed. Complete/font times describe successful attempts only. All failures remain counted. These are laboratory observations, not field percentiles.\n');
console.log('| Variant / scenario / profile / cache | Attempts | Failed | Usable median (n) | Complete median (min–max) | Fonts median |');
console.log('| --- | ---: | ---: | ---: | ---: | ---: |');
for (const [key, samples] of groups) {
  const good = samples.filter(sample => !sample.error && !sample.errors?.length);
  const values = name => good.map(sample => sample.marks?.[name]).filter(Number.isFinite);
  const format = value => value == null ? '—' : `${(value / 1000).toFixed(2)} s`;
  const content = values('content');
  const usable = samples.map(sample => sample.marks?.usable).filter(Number.isFinite);
  console.log(`| ${key} | ${samples.length} | ${samples.length - good.length} | ${format(median(usable))} (${usable.length}) | ${format(median(content))}${content.length ? ` (${format(Math.min(...content))}–${format(Math.max(...content))})` : ''} | ${format(median(values('fonts')))} |`);
}
