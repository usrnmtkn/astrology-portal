import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepareBatchFiles } from '../src/astro-writing/personalTransitPreparation.mjs';

// Compatibility entry point, with the same preparation, dispatch and durable
// review state as the owner batch. It has no separate provider transport.
const [mode,directory,planPathOrAuthorization] = process.argv.slice(2);
if (mode === '--prepare') {
  const plan = JSON.parse(readFileSync(planPathOrAuthorization,'utf8'));
  const receipt = prepareBatchFiles({catalogPath:plan.catalogPath,sourcesPath:plan.sourcesPath ?? resolve('.private-documents/personal-transit.json'),
    inputPlanPath:planPathOrAuthorization,outputDirectory:directory});
  console.log(JSON.stringify({preparedRequests:receipt.passages,providerCalls:0}));
} else if (['--preflight','--dispatch-eight-once'].includes(mode)) {
  const { runDispatch } = await import('./transit-owner-batch/dispatch.mjs');
  await runDispatch(mode,directory,planPathOrAuthorization);
} else throw Error('EXPLICIT_MODE_REQUIRED');
