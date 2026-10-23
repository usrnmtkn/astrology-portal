import { isInitialSkyReaderHash } from "../apps/web/src/services/initialSkyRoute.mjs";

/** Discover App before the entry waits for React. Direct articles also preload
 * placement rows; the list starts those large downloads after App mounts so
 * its selected publication reads can begin sooner. */
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
        const appFiles = [...files];
        const placements = Object.values(bundle).find(chunk => chunk.type === "chunk"
          && Object.keys(chunk.modules ?? {}).some(id => id.endsWith("/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json")));
        if (!placements) throw new Error("Sky preload could not locate the built placement rows.");
        visit(placements.fileName);
        return [{ tag: "script", injectTo: "head", children:
          `(()=>{if(location.pathname!=="/"||!(${isInitialSkyReaderHash.toString()})(location.hash))return;const files=/^#\\/?sky\\/?$/.test(location.hash)?${JSON.stringify(appFiles)}:${JSON.stringify([...files])};for(const file of files){const href="/"+file;if([...document.querySelectorAll('link[rel="modulepreload"]')].some(link=>link.getAttribute("href")===href))continue;const link=document.createElement("link");link.rel="modulepreload";link.crossOrigin="";link.href=href;document.head.appendChild(link);}})();`
        }];
      }
    }
  };
}
