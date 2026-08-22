import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const apiRoot = resolve(repoRoot, "api");
const adminAppRoot = resolve(repoRoot, "apps/admin");
const swissEphFullDataPath = resolve(repoRoot, "node_modules/swisseph-wasm/wasm/swisseph.data");

const swissEphFullDataManifest = 'files:[{filename:"/sweph/seas_18.se1",start:0,end:223002},{filename:"/sweph/seasnam.txt",start:223002,end:10153224},{filename:"/sweph/sefstars.txt",start:10153224,end:10286461},{filename:"/sweph/seleapsec.txt",start:10286461,end:10286743},{filename:"/sweph/semo_18.se1",start:10286743,end:11591514},{filename:"/sweph/seorbel.txt",start:11591514,end:11597371},{filename:"/sweph/sepl_18.se1",start:11597371,end:12081426}],remote_package_size:12081426';
const swissEphWebDataManifest = 'files:[{filename:"/sweph/seas_18.se1",start:0,end:223002},{filename:"/sweph/seleapsec.txt",start:223002,end:223284},{filename:"/sweph/semo_18.se1",start:223284,end:1528055},{filename:"/sweph/seorbel.txt",start:1528055,end:1533912},{filename:"/sweph/sepl_18.se1",start:1533912,end:2017967}],remote_package_size:2017967';

function trimSwissEphemerisWebDataPlugin() {
  return {
    name: "tldr-trim-swiss-ephemeris-web-data",
    apply: "build" as const,
    enforce: "pre" as const,
    transform(code, id) {
      if (!id.includes("swisseph-wasm/wasm/swisseph.js")) {
        return undefined;
      }

      if (!code.includes(swissEphFullDataManifest)) {
        throw new Error("The swisseph-wasm data manifest changed; review the web data trim before building.");
      }

      return code.replace(swissEphFullDataManifest, swissEphWebDataManifest);
    }
  };
}

function browserOnlySwissEphemerisPlugin() {
  const wasmNodeBootstrap = 'if(ENVIRONMENT_IS_NODE){const{createRequire}=await import("module");var require=createRequire(import.meta.url)}';
  const sourceNodeBranch = /    \/\/ In Node\.js environment, we need to help locate the WASM and data files\n    if \(typeof process[^]*?    \} else \{\n      \/\/ Browser environment\n([^]*?)\n    \}\n\n    this\.SweModule/u;

  return {
    name: "tldr-browser-only-swiss-ephemeris",
    apply: "build" as const,
    enforce: "pre" as const,
    transform(code, id) {
      if (id.includes("swisseph-wasm/src/swisseph.js")) {
        const match = code.match(sourceNodeBranch);
        if (!match) {
          throw new Error("The swisseph-wasm environment branch changed; review the browser-only build transform.");
        }
        return code.replace(
          sourceNodeBranch,
          `    // The Vite target is browser-only; omit the dependency's Node path resolver.\n${match[1]}\n\n    this.SweModule`
        );
      }

      if (id.includes("swisseph-wasm/wasm/swisseph.js")) {
        if (!code.includes(wasmNodeBootstrap)) {
          throw new Error("The swisseph-wasm Node bootstrap changed; review the browser-only build transform.");
        }
        return code.replace(
          wasmNodeBootstrap,
          'if(ENVIRONMENT_IS_NODE){throw new Error("The web Swiss Ephemeris bundle cannot run in Node.js")}'
        );
      }

      return undefined;
    }
  };
}

function serveFullSwissEphemerisDataInDevPlugin() {
  return {
    name: "tldr-serve-full-swiss-ephemeris-data-in-dev",
    apply: "serve" as const,
    enforce: "pre" as const,
    configureServer(server) {
      const fullData = readFileSync(swissEphFullDataPath);

      server.middlewares.use((req, res, next) => {
        const requestPath = new URL(req.url ?? "/", "http://localhost").pathname;

        if (requestPath !== "/wasm/swisseph.data" || !["GET", "HEAD"].includes(req.method ?? "GET")) {
          next();
          return;
        }

        res.statusCode = 200;
        res.setHeader("content-type", "application/octet-stream");
        res.setHeader("content-length", String(fullData.byteLength));
        res.setHeader("cache-control", "no-cache");
        res.end(req.method === "HEAD" ? undefined : fullData);
      });
    }
  };
}

function suppressUnrelatedMonorepoHotUpdatesPlugin() {
  return {
    name: "tldr-suppress-unrelated-monorepo-hot-updates",
    handleHotUpdate(context) {
      if (context.file.startsWith(`${apiRoot}/`) || context.file.startsWith(`${adminAppRoot}/`)) {
        return [];
      }

      return undefined;
    }
  };
}

function localApiRoutePlugin() {
  return {
    name: "tldr-local-api-routes",
    enforce: "pre" as const,
    configureServer(server) {
      const localApiMiddleware = async (req, res, next) => {
        const requestPath = new URL(req.url ?? "/", "http://localhost").pathname;

        if (!requestPath.startsWith("/api/")) {
          next();
          return;
        }

        const routePath = requestPath
          .replace(/^\/api\//, "")
          .split("/")
          .map((segment) => segment.replace(/[^A-Za-z0-9_-]/g, ""))
          .filter(Boolean)
          .join("/");
        const routeFile = resolve(apiRoot, `${routePath}.ts`);

        if (!routeFile.startsWith(`${apiRoot}/`) || !existsSync(routeFile)) {
          next();
          return;
        }

        try {
          const routeModule = await server.ssrLoadModule(pathToFileURL(routeFile).href);
          const handler = routeModule.default;

          if (typeof handler !== "function") {
            throw new Error(`API route ${requestPath} does not export a default handler.`);
          }

          await handler(req, res);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          server.config.logger.error(`[api] ${requestPath} failed: ${message}`);

          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
          }

          if (!res.writableEnded) {
            res.end(JSON.stringify({ error: message }));
          }
        }
      };

      server.middlewares.use(localApiMiddleware);

      const middlewareStack = (server.middlewares as { stack?: unknown[] }).stack;
      if (Array.isArray(middlewareStack)) {
        const layer = middlewareStack.pop();
        if (layer) {
          middlewareStack.unshift(layer);
        }
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, dirname(fileURLToPath(import.meta.url)), "");

  for (const [key, value] of Object.entries(localEnv)) {
    process.env[key] ??= value;
  }

  return {
    plugins: [
      suppressUnrelatedMonorepoHotUpdatesPlugin(),
      localApiRoutePlugin(),
      serveFullSwissEphemerisDataInDevPlugin(),
      browserOnlySwissEphemerisPlugin(),
      trimSwissEphemerisWebDataPlugin(),
      react()
    ],
    assetsInclude: ["**/*.wasm"],
    resolve: {
      dedupe: ["react", "react-dom"]
    },
    build: {
      manifest: true,
      // Large data registries are route-split and governed by gzip budgets.
      // Use a raw-size advisory that reflects the largest intentional registry.
      chunkSizeWarningLimit: 2200,
      modulePreload: {
        resolveDependencies(_url, deps) {
          return deps.filter((dep) => !dep.includes("swisseph-"));
        }
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("vite/preload-helper")) {
              return "vendor";
            }
            if (
              id.includes("fallbackArchitectureV3/bundled-manifest-v3.json")
              || id.includes("fallbackArchitectureV3/bundled-core-manifest-v3.json")
            ) {
              return "fallback-content-manifest";
            }
            if (id.includes("fallbackArchitectureV3/bundled-deferred-core-rows-v3.json")) {
              return "fallback-content-deferred-core";
            }
            if (id.includes("fallbackArchitectureV3/bundled-shared-placement-rows-v3.json")) {
              return "fallback-content-shared-placement";
            }
            if (id.includes("fallbackArchitectureV3/bundled-empty-house-rows-v3.json")) {
              return "fallback-content-empty-house";
            }
            if (id.includes("fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json")) {
              return "fallback-content-transit";
            }
            if (id.includes("fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json")) {
              return "fallback-content-relationships-authored";
            }
            if (
              id.includes("fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json")
              || id.includes("fallbackArchitectureV3/source-rows/bond-language")
            ) {
              return "fallback-content-relationships-hooks";
            }
            if (
              id.includes("fallbackArchitectureV3/bundled-sky-placement-rows-v3.json")
              || id.includes("fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json")
            ) {
              return "fallback-content-sky-placement";
            }
            if (
              id.includes("fallbackArchitectureV3/bundled-sky-core-rows-v3.json")
              || id.includes("fallbackArchitectureV3/bundled-sky-authored-cards-v3.json")
            ) {
              return "fallback-content-sky-core";
            }
            if (
              id.includes("fallbackArchitectureV3/source-rows/sky-")
              || id.includes("fallbackArchitectureV3/source-rows/lunation-")
              || id.includes("fallbackArchitectureV3/source-rows/station-cards-")
            ) {
              return "fallback-content-sky";
            }
            if (id.includes("fallbackArchitectureV3/source-rows/") || id.includes("fallbackArchitectureV3/templates/")) {
              return "fallback-content-core";
            }
            if (id.includes("@tldr/astro-knowledge") || id.includes("packages/astro-knowledge")) {
              if (id.includes("shared-web.json")) {
                return "astro-knowledge-shared";
              }
              if (id.includes("sky-runtime-web.json")) {
                return "astro-knowledge-sky";
              }
              if (id.includes("natal-insights-web.json")) {
                return "astro-knowledge-natal-insights";
              }
              if (id.includes("natal-transits-web.json")) {
                return "astro-knowledge-natal-transits";
              }
              if (id.includes("natal-placements-web.json")) {
                return "astro-knowledge-natal-placements";
              }
              if (id.includes("relationships-synastry-web.json")) {
                return "astro-knowledge-relationships-synastry";
              }
              if (id.includes("relationships-composite-web.json")) {
                return "astro-knowledge-relationships-composite";
              }
              if (id.includes("sky-web.json")) {
                return "astro-knowledge-sky";
              }
              if (id.includes("natal-web.json")) {
                return "astro-knowledge-natal";
              }
              if (id.includes("relationships-web.json")) {
                return "astro-knowledge-relationships";
              }
              if (id.includes("sky.json")) {
                return "astro-knowledge-sky";
              }
              if (id.includes("natal.json")) {
                return "astro-knowledge-natal";
              }
              if (id.includes("relationships.json") || id.includes("synastry.json") || id.includes("composite.json")) {
                return "astro-knowledge-relationships";
              }
              if (id.includes("web.json")) {
                return "astro-knowledge-web";
              }
              return "astro-knowledge";
            }
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
              return "react";
            }
            if (id.includes("node_modules/@supabase")) {
              return "supabase";
            }
            if (id.includes("node_modules/lucide-react")) {
              return "icons";
            }
            if (id.includes("node_modules/libphonenumber-js")) {
              return "phone-auth";
            }
            if (id.includes("node_modules/swisseph-wasm")) {
              return "swisseph";
            }
            if (id.includes("node_modules")) {
              return "vendor";
            }
          }
        }
      }
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      fs: {
        // swisseph-wasm resolves its .data and .wasm files relative to the
        // workspace-level node_modules directory in development.
        allow: [repoRoot]
      }
    },
    optimizeDeps: {
      exclude: ["swisseph-wasm"]
    }
  };
});
