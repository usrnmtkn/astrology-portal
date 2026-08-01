import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const apiRoot = resolve(repoRoot, "api");
const adminAppRoot = resolve(repoRoot, "apps/admin");

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
    plugins: [suppressUnrelatedMonorepoHotUpdatesPlugin(), localApiRoutePlugin(), react()],
    assetsInclude: ["**/*.wasm"],
    build: {
      manifest: true,
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
            if (id.includes("fallbackArchitectureV3/bundled-manifest-v3.json")) {
              return "fallback-content-manifest";
            }
            if (id.includes("fallbackArchitectureV3/source-rows/transit-synastry") || id.includes("fallbackArchitectureV3/source-rows/bond-language")) {
              return "fallback-content-relationships";
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
