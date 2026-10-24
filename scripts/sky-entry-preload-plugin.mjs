import { isInitialSkyReaderHash } from "../apps/web/src/services/initialSkyRoute.mjs";
import {buildSync} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';

/** Discover App before the entry waits for React. Direct articles also preload
 * placement rows; the list starts those large downloads after App mounts so
 * its selected publication reads can begin sooner. */
export function skyEntryPreloadPlugin() {
  const primer=buildSync({entryPoints:[fileURLToPath(new URL('../apps/web/src/initialSkyRequestPrimer.ts',import.meta.url))],
    bundle:true,write:false,format:'iife',platform:'browser',minify:true,target:'es2022',metafile:true});
  if(gzipSync(primer.outputFiles[0].contents).length>4_000
    ||Object.keys(primer.metafile.inputs).some(id=>/react|supabase|App\.tsx|generatedContent|contentPublications/u.test(id))) {
    throw new Error('The inline Sky request entry must stay small and independent of UI, sources and login.');
  }
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
        const bootstrap = Object.values(bundle).find(chunk => chunk.type === "chunk"
          && chunk.facadeModuleId?.endsWith("/initialSkyBootstrap.ts"));
        if (!bootstrap) throw new Error("Sky preload could not locate the independent data entry.");
        const files = new Set();
        const visit = file => {
          if (files.has(file)) return;
          const chunk = bundle[file];
          if (!chunk || chunk.type !== "chunk") throw new Error(`Missing App dependency: ${file}`);
          files.add(file);
          for (const dependency of chunk.imports) visit(dependency);
        };
        // Discover the small request bootstraps before the component graph.
        // Their existing shared promises let the mounted reader join the same
        // calculation and complete publication-ledger reads.
        visit(bootstrap.fileName);
        const bootstrapFiles = [...files];
        if ([...files].some(file => Object.keys(bundle[file].modules ?? {}).some(id => /\/(?:main\.tsx|react(?:-dom)?\/)/u.test(id)))) {
          throw new Error("Sky data entry must start independently of the component entry.");
        }
        visit(app.fileName);
        const appFiles = [...files];
        const readerStyles = Object.values(bundle).find(asset => asset.type === "asset"
          && /^assets\/styles-[^/]+\.css$/u.test(asset.fileName));
        if (!readerStyles) throw new Error("Sky preload could not locate the reader stylesheet.");
        const placements = Object.values(bundle).find(chunk => chunk.type === "chunk"
          && Object.keys(chunk.modules ?? {}).some(id => id.endsWith("/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json")));
        if (!placements) throw new Error("Sky preload could not locate the built placement rows.");
        visit(placements.fileName);
        return [{ tag: "script", injectTo: "head-prepend", children:
          `(()=>{if(location.pathname!=="/"||!(${isInitialSkyReaderHash.toString()})(location.hash))return;const boot=${JSON.stringify(bootstrapFiles)};const files=!location.hash||/^#\\/?sky\\/?$/.test(location.hash)?${JSON.stringify(appFiles)}:${JSON.stringify([...files])};const preload=(items,priority)=>{for(const file of items){const href="/"+file;if([...document.querySelectorAll('link[rel="modulepreload"]')].some(link=>link.getAttribute("href")===href))continue;const link=document.createElement("link");link.rel="modulepreload";link.crossOrigin="";link.fetchPriority=priority;link.href=href;document.head.appendChild(link);}};preload(boot,"high");window.addEventListener("tldr:sky-bootstrap-started",()=>{const style=document.createElement("link");style.rel="preload";style.as="style";style.fetchPriority="high";style.href="/${readerStyles.fileName}";document.head.appendChild(style);preload(files,"low");},{once:true});})();`
        }, {tag:"script",injectTo:"head-prepend",children:primer.outputFiles[0].text}, { tag: "script", injectTo: "head-prepend", children:
          `if(location.pathname==="/"&&(${isInitialSkyReaderHash.toString()})(location.hash)&&!new URL(location.href).searchParams.has("code"))void import("/${bootstrap.fileName}").catch(()=>{});`
        }];
      }
    }
  };
}
