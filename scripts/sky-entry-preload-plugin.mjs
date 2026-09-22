/** Discover the existing App graph in the document, before the entry module
 * waits for React. Only root Sky list visits need these download hints. */
export function skyEntryPreloadPlugin() {
  return {
    name: "tldr-sky-entry-preload",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle }) {
        const app = Object.values(bundle ?? {}).find(chunk => chunk.type === "chunk"
          && (chunk.facadeModuleId?.endsWith("/apps/web/src/App.tsx")
            || Object.keys(chunk.modules ?? {}).some(id => id.endsWith("/apps/web/src/App.tsx"))));
        if (!app) throw new Error("Sky preload could not locate the built App entry.");
        const files = new Set();
        const visit = file => {
          if (files.has(file)) return;
          const chunk = bundle[file];
          if (!chunk || chunk.type !== "chunk") throw new Error(`Missing App dependency: ${file}`);
          files.add(file);
          for (const dependency of chunk.imports) visit(dependency);
        };
        visit(app.fileName);
        return [{ tag: "script", injectTo: "head", children:
          `(()=>{if(location.pathname!=="/"||!/^#\\/?sky\\/?$/.test(location.hash))return;for(const file of ${JSON.stringify([...files])}){const href="/"+file;if([...document.querySelectorAll('link[rel="modulepreload"]')].some(link=>link.getAttribute("href")===href))continue;const link=document.createElement("link");link.rel="modulepreload";link.crossOrigin="";link.href=href;document.head.appendChild(link);}})();`
        }];
      }
    }
  };
}
