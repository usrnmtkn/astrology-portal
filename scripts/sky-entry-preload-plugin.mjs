/** Discover route code in the document, before the entry module waits for
 * React. Only direct Sky-list and Calendar visits receive download hints. */
export function skyEntryPreloadPlugin() {
  return {
    name: "tldr-sky-entry-preload",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle }) {
        const findModule = suffix => Object.values(bundle ?? {}).find(chunk => chunk.type === "chunk"
          && (chunk.facadeModuleId?.endsWith(suffix)
            || Object.keys(chunk.modules ?? {}).some(id => id.endsWith(suffix))));
        const app = findModule("/apps/web/src/App.tsx");
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
        const skyFiles = [...files];
        // These are already lazy Calendar modules. Hint their static code
        // dependencies only; prose and calculation assets stay demand-loaded.
        for (const suffix of ["/apps/web/src/routes/CalendarRoute.tsx", "/apps/web/src/features/calendar/LunarCalendar.tsx"]) {
          const chunk = findModule(suffix);
          if (!chunk) throw new Error(`Calendar preload could not locate ${suffix}.`);
          visit(chunk.fileName);
        }
        return [{ tag: "script", injectTo: "head", children:
          `(()=>{if(location.pathname!=="/")return;const files=/^#\\/?sky\\/?$/.test(location.hash)?${JSON.stringify(skyFiles)}:/^#\\/?calendar(?:[/?]|$)/.test(location.hash)?${JSON.stringify([...files])}:[];for(const file of files){const href="/"+file;if([...document.querySelectorAll('link[rel="modulepreload"]')].some(link=>link.getAttribute("href")===href))continue;const link=document.createElement("link");link.rel="modulepreload";link.crossOrigin="";link.href=href;document.head.appendChild(link);}})();`
        }];
      }
    }
  };
}
