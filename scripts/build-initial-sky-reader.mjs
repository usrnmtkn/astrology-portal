import { build, loadConfigFromFile } from 'vite';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, root + 'apps/web/vite.config.ts');
await build({ ...loaded.config, configFile: false, root: root + 'apps/web',
  ssr: { noExternal: true },
  build: { ...loaded.config.build, ssr: root + 'scripts/initial-sky-reader-server-entry.ts',
    manifest: false, outDir: root + 'server/initial-sky-reader/dist', emptyOutDir: true,
    rollupOptions: { input: root + 'scripts/initial-sky-reader-server-entry.ts',
      output: { format: 'es', entryFileNames: 'initial-reader.mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } }
  }
});
