import { readFile } from 'node:fs/promises';
import { compareLoading } from './lib/loading-comparison.mjs';
if (!process.argv[2]) throw new Error('Usage: node scripts/compare-app-loading.mjs /private/path/experiment.json');
const report = compareLoading(JSON.parse(await readFile(process.argv[2], 'utf8')));
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'pass') process.exitCode = 1;
