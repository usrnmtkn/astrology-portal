import { memoryGraphReferencePlugin } from "../../scripts/memory-graph-reference-plugin.mjs";
import { browserOnlySwissEphemerisPlugin, trimSwissEphemerisWebDataPlugin, serveFullSwissEphemerisDataInDevPlugin } from "../web/vite.config";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { appStartupHtmlPlugin } from "../../scripts/app-startup-html-plugin.mjs";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const apiRoot = resolve(repoRoot, "api");

function localApiRoutePlugin() {
  return {
    name: "tldr-admin-local-api-routes",
    enforce: "pre" as const,
    configurePreviewServer(server) {
      // Vite preview serves static files; it cannot execute the admin handlers.
      // Never let an API request fall through to index.html with HTTP 200.
      server.middlewares.use((req, res, next) => {
        if (!new URL(req.url ?? "/", "http://localhost").pathname.startsWith("/api/")) return next();
        res.statusCode = 503;
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        res.end(JSON.stringify({ ok: false, error: "This static Studio preview has no API server. Start the Content Studio development server or open a deployed Studio to edit saved content." }));
      });
    },
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
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          res.setHeader("cache-control", "no-store");
          res.end(JSON.stringify({ ok: false, error: "API route not found." }));
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

export default defineConfig(({ command, mode }) => {
  const webEnv = loadEnv(mode, resolve(repoRoot, "apps/web"), "");
  const localContentSecret = command === "serve"
    ? process.env.CONTENT_GENERATION_SECRET ?? webEnv.CONTENT_GENERATION_SECRET ?? ""
    : "";

  return {
    plugins: [memoryGraphReferencePlugin(), appStartupHtmlPlugin(), localApiRoutePlugin(), browserOnlySwissEphemerisPlugin(), trimSwissEphemerisWebDataPlugin(), serveFullSwissEphemerisDataInDevPlugin(), {
      name: "studio-swiss-ephemeris-assets",
      generateBundle() {
        for (const name of ["swisseph.wasm", "swisseph.data"]) this.emitFile({ type: "asset", fileName: `wasm/${name}`, source: readFileSync(resolve(repoRoot, "apps/web/public/wasm", name)) });
      }
    }, react()],
    worker: { format: "es", plugins: () => [browserOnlySwissEphemerisPlugin(), trimSwissEphemerisWebDataPlugin()] },
    assetsInclude: ["**/*.wasm"],
    define: {
      __LOCAL_CONTENT_GENERATION_SECRET__: JSON.stringify(localContentSecret)
    },
    server: {
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
      fs: {
        allow: [repoRoot]
      }
    },
    optimizeDeps: {
      exclude: ["swisseph-wasm", "@supermemory/memory-graph"]
    },
    build: {
      manifest: true,
      rollupOptions: {
        output: {
          onlyExplicitManualChunks: true,
          manualChunks(id) {
            if (id.includes("node_modules/thinking-orbs/")) return "thinking-orbs";
            // Shared controls are rendered immediately. Keeping them in this
            // lazy group pulls the whole editor group into the startup graph.
            if (/apps\/admin\/src\/(?:NatalPlacementSourceFinder|NatalPlacementReaderPreview|TemplateReaderDrilldown|TemplateVariableReviewPanels)\.tsx$|apps\/admin\/src\/(?:compositionMap|templateVariableSources)\.ts$/u.test(id)) {
              return "admin-deferred-editor-tools";
            }
            if (/apps\/admin\/src\/(?:AspectPatternDiagnostics|AspectPatternWriteups|ReportFulfillmentAdminPanel|UnresolvedContentReview)\.tsx$/u.test(id)) {
              return "admin-deferred-review-tools";
            }
            if (/apps\/admin\/src\/(?:DailyFallbackWorkspaceGuide|DailyGlanceStudio|dailyGlanceFriendPreview|PackagedHookCatalogResults|SkyV4StudioReviewPanel)\.(?:ts|tsx)$/u.test(id)) {
              return "admin-deferred-fallback-tools";
            }
          }
        }
      },
      minify: "terser",
      terserOptions: {
        ecma: 2020,
        compress: {
          passes: 5
        },
        format: {
          comments: false,
          ascii_only: true,
          wrap_func_args: false
        }
      }
    }
  }
});
