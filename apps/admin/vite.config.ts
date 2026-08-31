import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const apiRoot = resolve(repoRoot, "api");

function localApiRoutePlugin() {
  return {
    name: "tldr-admin-local-api-routes",
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

export default defineConfig(({ command, mode }) => {
  const webEnv = loadEnv(mode, resolve(repoRoot, "apps/web"), "");
  const localContentSecret = command === "serve"
    ? process.env.CONTENT_GENERATION_SECRET ?? webEnv.CONTENT_GENERATION_SECRET ?? ""
    : "";

  return {
    plugins: [localApiRoutePlugin(), react()],
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
      exclude: ["swisseph-wasm"]
    },
    build: {
      manifest: true,
      rollupOptions: {
        output: {
          onlyExplicitManualChunks: true,
          manualChunks(id) {
            if (/apps\/admin\/src\/(?:AdminFilterDisclosure|AdminPaginatedCollection|NatalPlacementSourceFinder|NatalPlacementReaderPreview|TemplateReaderDrilldown|TemplateVariableReviewPanels)\.tsx$|apps\/admin\/src\/(?:compositionMap|templateVariableSources)\.ts$/u.test(id)) {
              return "admin-deferred-editor-tools";
            }
            if (/apps\/admin\/src\/(?:AspectPatternDiagnostics|AspectPatternWriteups|ReportFulfillmentAdminPanel|UnresolvedContentReview)\.tsx$/u.test(id)) {
              return "admin-deferred-review-tools";
            }
            if (/apps\/admin\/src\/(?:DailyFallbackWorkspaceGuide|PackagedHookCatalogResults|SkyV4StudioReviewPanel)\.tsx$/u.test(id)) {
              return "admin-deferred-fallback-tools";
            }
          }
        }
      },
      minify: "terser",
      terserOptions: {
        compress: {
          passes: 2
        },
        format: {
          comments: false
        }
      }
    }
  }
});
