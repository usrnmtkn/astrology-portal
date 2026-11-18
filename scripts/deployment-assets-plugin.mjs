/** Keep an open page's asset graph on the deployment that supplied its HTML. */
export function deploymentAssetUrl(url, env = process.env) {
  if (env.VERCEL_SKEW_PROTECTION_ENABLED !== "1") return url;
  const id = env.VERCEL_DEPLOYMENT_ID;
  if (!id || !/^[A-Za-z0-9_-]+$/u.test(id)) {
    throw new Error("Skew Protection requires a valid VERCEL_DEPLOYMENT_ID at build time.");
  }
  const [path, fragment] = url.split("#", 2);
  return `${path}${path.includes("?") ? "&" : "?"}dpl=${id}${fragment === undefined ? "" : `#${fragment}`}`;
}

export function deploymentAssetsPlugin(env = process.env) {
  const enabled = env.VERCEL_SKEW_PROTECTION_ENABLED === "1";
  if (env.VERCEL === "1" && !enabled) {
    throw new Error("Enable Vercel Skew Protection and expose system environment variables before building Studio.");
  }
  // Validate before emitting any assets, including builds with no lazy imports.
  if (enabled) deploymentAssetUrl("/", env);
  return {
    name: "tldr-deployment-assets",
    apply: "build",
    // Run our final-byte hook before post-order audit manifests hash the chunks.
    enforce: "pre",
    config() {
      if (!enabled) return;
      return { experimental: { renderBuiltUrl(filename, { type }) {
        if (type === "asset") return deploymentAssetUrl(`/${filename}`, env);
      } } };
    },
    configResolved(config) {
      if (enabled && config.base !== "/") throw new Error("Deployment assets require the application's root base URL.");
    },
    transform(code, id) {
      if (!enabled || id !== "\0vite/preload-helper.js") return;
      // Vite 7 otherwise mistakes a tagged stylesheet for a JavaScript preload.
      const updated = code.replace(/\.endsWith\((["'])\.css\1\)/u, '.split(/[?#]/, 1)[0].endsWith(".css")');
      if (updated === code) this.error("Vite's CSS preload helper changed; verify deployment-pinned stylesheets before upgrading.");
      return { code: updated, map: null };
    },
    augmentChunkHash() { return enabled ? env.VERCEL_DEPLOYMENT_ID : undefined; },
    generateBundle: { order: "post", handler(_options, bundle) {
      if (!enabled) return;
      // Vite's asset URL hook handles HTML, CSS, workers and preload maps, but
      // Rollup's native static/dynamic imports need the same deployment tag.
      // Tag them after Vite discovers their CSS dependency graph. The deployment
      // ID participates in chunk hashing above, before this deterministic edit.
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        const edits = [];
        const visit = node => {
          if (!node || typeof node !== "object") return;
          if (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration", "ImportExpression"].includes(node.type)) {
            const source = node.source;
            if (typeof source?.value === "string" && /^\.{1,2}\/.*\.m?js(?:[?#]|$)/u.test(source.value)) {
              edits.push({ start: source.start, end: source.end, value: JSON.stringify(deploymentAssetUrl(source.value, env)) });
            }
          }
          for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === "object" && typeof value.type === "string") visit(value);
          }
        };
        visit(this.parse(chunk.code));
        for (const edit of edits.sort((a, b) => b.start - a.start)) chunk.code = chunk.code.slice(0, edit.start) + edit.value + chunk.code.slice(edit.end);
      }
    } }
  };
}
