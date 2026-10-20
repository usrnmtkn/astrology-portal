import {readFileSync, realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, relative} from 'node:path';
import {calendarLazyEntries, calendarLazyImporters} from './admin-lazy-boundary-contract.mjs';

/** Static audit metadata only; no application code or source text is emitted. */
export function adminLazyBoundaryManifestPlugin(repoRoot) {
  const admin = realpathSync(resolve(repoRoot, 'apps/admin'));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const normalized = path => relative(admin, path).replaceAll('\\', '/');
  return {
    name: 'admin-lazy-boundary-manifest',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const entries = {};
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue;
          for (const [id, rendered] of Object.entries(chunk.modules)) {
            const key = normalized(id);
            if (!calendarLazyEntries.includes(key)) continue;
            const dynamicImporters = (this.getModuleInfo(id)?.dynamicImporters ?? []).map(normalized).sort();
            if (dynamicImporters.some(importer => importer !== calendarLazyImporters[key])) this.error('Unexpected Calendar dynamic importer.');
            entries[key] = {
              file: chunk.fileName,
              renderedLength: rendered.renderedLength,
              dynamicImporters,
              sourceSha256: hash(readFileSync(id)),
              chunkSha256: hash(chunk.code)
            };
          }
        }
        this.emitFile({type: 'asset', fileName: '.vite/admin-lazy-boundaries.json', source: JSON.stringify({schema:'admin-lazy-boundaries/v1', entries})});
      }
    }
  };
}
