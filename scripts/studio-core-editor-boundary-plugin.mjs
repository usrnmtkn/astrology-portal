const dashboard = '/apps/admin/src/GeneratedContentAdminDashboard.tsx';
const plainFields = '/apps/admin/src/SkyFallbackPlainFields.tsx';
const optionalEditors = ['/apps/admin/src/SkyFallbackFieldsEditor.tsx', '/apps/admin/src/StudioFormattingEditor.tsx'];
const sourcePath = id => id.replaceAll('\\', '/').split('?')[0];

/** Basic aspect editing must work once the dashboard has loaded. */
export function studioCoreEditorBoundaryPlugin() {
  let applicationBuild = false;
  return {
    name: 'studio-core-editor-boundary',
    apply: 'build',
    configResolved(config) {
      const input = config.build.rollupOptions.input ?? `${config.root}/index.html`;
      const entries = typeof input === 'string' ? [input] : Array.isArray(input) ? input : Object.values(input);
      applicationBuild = entries.some(entry => /\/apps\/(admin|web)\/index\.html$/u.test(sourcePath(entry)));
    },
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter(item => item.type === 'chunk');
      const renders = (chunk, source) => Object.entries(chunk.modules)
        .some(([id, metadata]) => sourcePath(id).endsWith(source) && metadata.renderedLength > 0);
      const owner = chunks.find(chunk => renders(chunk, dashboard));
      // Reader-only transport builds also reuse the website's Vite configuration.
      if (!owner) {
        if (applicationBuild) this.error('Studio core editor guard: dashboard is missing from the application build.');
        return;
      }

      const visited = new Set();
      const modules = new Set();
      const visit = file => {
        if (visited.has(file)) return;
        visited.add(file);
        const chunk = bundle[file];
        if (!chunk || chunk.type !== 'chunk') this.error(`Studio core editor guard: incomplete static import graph (${file}).`);
        for (const [id, metadata] of Object.entries(chunk.modules)) {
          if (metadata.renderedLength > 0) modules.add(sourcePath(id));
        }
        for (const dependency of chunk.imports) visit(dependency);
      };
      visit(owner.fileName);
      if (![...modules].some(id => id.endsWith(plainFields))) {
        this.error('Basic aspect fields must load with the Studio dashboard, without another optional download.');
      }
      for (const source of optionalEditors) {
        if ([...modules].some(id => id.endsWith(source))) {
          this.error(`Optional Studio editor entered the basic editing import graph: ${source.split('/').pop()}`);
        }
      }
    }
  };
}
