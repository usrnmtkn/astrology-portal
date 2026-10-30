import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'apps/web/src/content/fallbackArchitectureV3/resolver/lunationStudioRevision.mjs');
const reader = resolve(root, 'apps/web/src/content/lunationStudioRevision.ts');

/** Studio previews and the reader share the shipped contract, rather than bundling it twice. */
export function lunationReaderContractPlugin() {
  return { name: 'shared-lunation-reader-contract', enforce: 'pre',
    resolveId(id, importer) {
      if (!importer || !id.endsWith('/lunationStudioRevision.mjs')) return null;
      return resolve(dirname(importer.split('?')[0]), id) === source ? reader : null;
    }
  };
}
