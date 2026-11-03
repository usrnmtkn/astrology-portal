import { memoryGraphReferencePlugin } from "../../scripts/memory-graph-reference-plugin.mjs";
import { adminLazyBoundaryManifestPlugin } from "../../scripts/admin-lazy-boundary-manifest-plugin.mjs";
import { studioCoreEditorBoundaryPlugin } from "../../scripts/studio-core-editor-boundary-plugin.mjs";
import { lunationReaderContractPlugin } from '../../scripts/lunation-reader-contract-plugin.mjs';
import { browserOnlySwissEphemerisPlugin, trimSwissEphemerisWebDataPlugin, serveFullSwissEphemerisDataInDevPlugin, versionedSwissAssetsPlugin } from "../web/vite.config";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { appStartupHtmlPlugin } from "../../scripts/app-startup-html-plugin.mjs";
import { deploymentAssetsPlugin } from "../../scripts/deployment-assets-plugin.mjs";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const apiRoot = resolve(repoRoot, "api");
const vercelApiRewrites = (JSON.parse(readFileSync(resolve(repoRoot, "vercel.json"), "utf8")).rewrites ?? [])
  .filter((rule: { source?: string; destination?: string }) => rule.source?.startsWith("/api/") && rule.destination?.startsWith("/api/"));

function rewriteLocalApiPath(requestPath: string) {
  const match = vercelApiRewrites.find((rule: { source?: string }) => rule.source === requestPath);
  return match?.destination ?? requestPath;
}

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
        const requestPath = rewriteLocalApiPath(new URL(req.url ?? "/", "http://localhost").pathname);

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
  for (const [key, value] of Object.entries(webEnv)) {
    if (value && !process.env[key]) process.env[key] = value;
  }
  const localContentSecret = command === "serve"
    ? process.env.CONTENT_GENERATION_SECRET ?? webEnv.CONTENT_GENERATION_SECRET ?? ""
    : "";
  let startupModules: Set<string> | undefined;
  const sourceDraftModule = (id: string) => /apps\/admin\/src\/(?:transitNatalExactDraft|calendarPlanetaryDraft|compatibilityAspectDraft|connectionTransitSources|missingFriendsSource|bondEffectExactDraft|transitNatalPackagedSource|adminHookCatalogData|skyPlacementAspectBridgeDraft|studioSourceDraft)\.ts$/u.test(id);
  const deferredIcon = (id: string) => /\/lucide-react\/dist\/esm\/icons\/(?:bold|circle-check|circle-help|columns-2|italic|list-ordered|list|log-in|redo-2|undo-2)\.js$/u.test(id);
  const deferredSource = (id: string) => /\/(?:skyArticleHoroscopes\.mjs|skyPlacementAspectBridge\.ts|studioMemoryIdentity\.ts)$/u.test(id)
    || /apps\/admin\/src\/(?:calendarPreviewCalculation\.ts|SkyPlacementAspectBridgeStudio\.tsx)$/u.test(id);
  const startupPartition: Plugin = {
    name: 'studio-startup-partition',
    buildStart() { startupModules = undefined; },
    generateBundle(_options, bundle) {
      const visited = new Set<string>();
      const visit = (file: string) => {
        const chunk = bundle[file];
        if (!chunk || chunk.type !== 'chunk' || visited.has(file)) return;
        visited.add(file);
        for (const dependency of chunk.imports) visit(dependency);
        for (const [id, metadata] of Object.entries(chunk.modules)) {
          if (metadata.renderedLength > 0 && (deferredSource(id) || sourceDraftModule(id) || deferredIcon(id))) {
            this.error(`Deferred Studio module entered startup: ${id.slice(id.lastIndexOf('/') + 1)}`);
          }
        }
      };
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) visit(chunk.fileName);
      }
    }
  };

  return {
    plugins: [startupPartition, lunationReaderContractPlugin(), studioCoreEditorBoundaryPlugin(), adminLazyBoundaryManifestPlugin(repoRoot), memoryGraphReferencePlugin(), appStartupHtmlPlugin(), deploymentAssetsPlugin(), localApiRoutePlugin(), browserOnlySwissEphemerisPlugin(), trimSwissEphemerisWebDataPlugin(), serveFullSwissEphemerisDataInDevPlugin(), versionedSwissAssetsPlugin(), {
      name: "studio-swiss-ephemeris-assets",
      generateBundle() {
        for (const name of ["swisseph.wasm", "swisseph.data"]) this.emitFile({ type: "asset", fileName: `wasm/${name}`, source: readFileSync(resolve(repoRoot, "apps/web/public/wasm", name)) });
      }
    }, react()],
    worker: { format: "es", plugins: () => [deploymentAssetsPlugin(), browserOnlySwissEphemerisPlugin(), trimSwissEphemerisWebDataPlugin()] },
    assetsInclude: ["**/*.wasm"],
    define: {
      __LOCAL_CONTENT_GENERATION_SECRET__: JSON.stringify(localContentSecret)
    },
    resolve: {
      alias: [{
        find: /^(?:.*\/)?publicReaderConfiguration(?:\.ts)?$/u,
        replacement: resolve(repoRoot, "apps/admin/src/publicReaderConfiguration.ts")
      }]
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
          experimentalMinChunkSize: 2048,
          manualChunks(id, { getModuleInfo }) {
            // Keep source-only helpers deferred even when their unused exports are imported statically.
            if (!startupModules) {
              startupModules = new Set<string>();
              const visit = (moduleId: string) => {
                if (startupModules!.has(moduleId) || deferredSource(moduleId) || sourceDraftModule(moduleId) || deferredIcon(moduleId)) return;
                startupModules!.add(moduleId);
                for (const dependency of getModuleInfo(moduleId)?.importedIds ?? []) visit(dependency);
              };
              visit(resolve(repoRoot, 'apps/admin/index.html'));
            }
            if (startupModules.has(id)) return "index";
            // Coalesce small shared chunks without pulling deferred source models into startup.
            if (deferredSource(id)) {
              if (/\/(?:skyArticleHoroscopes\.mjs|skyPlacementAspectBridge\.ts|studioMemoryIdentity\.ts)$/u.test(id)) return "admin-source-drafts";
              return id.slice(id.lastIndexOf('/') + 1).replace(/\.(?:mjs|tsx|ts)$/u, '');
            }
            // Required edition helpers share one leaf chunk. The editor keeps
            // its source entry and optional writing/recovery panels stay separate.
            if (/apps\/admin\/src\/HoroscopeSavedEditions\.tsx$/u.test(id)
              || /apps\/admin\/src\/(?:horoscopeEditionDraft|horoscopeEditionDeletion)\.ts$/u.test(id)
              || /apps\/web\/src\/content\/horoscopeEditions\.mjs$/u.test(id)
              || /src\/shared\/features\/horoscopes\/HoroscopeLocation\.tsx$/u.test(id)
              || /src\/astro-writing\/horoscopeWriterCatalog\.mjs$/u.test(id)) return "horoscopeEditionManagement";
            if (/apps\/admin\/src\/(?:HoroscopeWritingStudio|HoroscopeSaveRecovery)\.tsx$/u.test(id)) return "HoroscopeWritingStudio";
            // Profile metadata and reconciliation load with their editing panels.
            if (/src\/astro-writing\/(?:horoscopeWritingProfiles|monthlyHoroscopeGuidance|seasonalComposition|horoscopeStreamCheckpoint)\.mjs$/u.test(id)
              || /apps\/admin\/src\/horoscopeEditReconciliation\.ts$/u.test(id)) return "HoroscopeWritingStudio";
            // The same summary workspaces use these two small source loaders.
            // Share their transport without moving the complete JSON artifacts.
            if (/apps\/admin\/src\/(?:skySummarySourceBank|skyMoonSummarySources)\.ts$/u.test(id)) return "admin-sky-summary-workspace";
            // These two panels render together in the deferred Sky summary workspace.
            if (/apps\/admin\/src\/(?:SkySummaryWorkspace|SkyDailySummaryStudio|SkyDebilityStudio|SkySummaryAssemblyStudio|SkyDebilityCompositionMap|SkyInlineTemplate|skyDebilityComposition|skyIngressTldrSources)\.(?:ts|tsx)$/u.test(id)) return "admin-sky-summary-workspace";
            // Calendar editing, preview and their exclusive models share one lazy workspace.
            if (/apps\/admin\/src\/(?:SkyForecastTemplateStudio|CalendarPassageEditor|CalendarPassageTemplateEditor|CalendarTemplatePreview|CalendarOverviewEditor|CalendarVariableText)\.tsx$/u.test(id)
              || /apps\/admin\/src\/(?:calendarPreviewModel|calendarOverviewTemplate)\.ts$/u.test(id)
              || /src\/shared\/features\/calendar\/calendarPassageAssembly\.ts$/u.test(id)) return "admin-calendar-workspace";
            // Draft factories load together when a source editor is opened.
            if (sourceDraftModule(id)) {
              return "admin-source-drafts";
            }
            // Shared controls render immediately and remain outside this lazy group.
            // Editor and publication panels share a deferred workspace.
            if (/apps\/admin\/src\/(?:ArticleBlockStyleFields|ConnectionTransitStudio|FriendsTransitSectionFinder|LunationHoroscopeRelations|NatalPlacementSourceFinder|NatalPlacementReaderPreview|StudioSavedVariableWording|TemplateSavedWording|TemplateReaderDrilldown|TemplateVariableReviewPanels|TemplateVariablesRail)\.tsx$|apps\/admin\/src\/(?:compositionMap|emptyHouseSources|templateVariableSources)\.ts$/u.test(id)) {
              return "review";
            }
            // Review panels and owner publication share one deferred workspace chunk.
            if (/apps\/admin\/src\/(?:TransitNatalReaderPreview|AspectPatternDiagnostics|AspectPatternWriteups|ReportFulfillmentAdminPanel|UnresolvedContentReview|HoroscopePublicationReview|HoroscopeGenerationDetails|WeeklyBatchEditorial|StudioEditorReviewPanels|ReviewWorkflowPanel)\.tsx$/u.test(id) || /\/apps\/admin\/src\/(?:ownerPublication|aspectPatternSaveReceipt)\.ts$/u.test(id)) {
              return "review";
            }
            // Fallback editors share the owner-publication workspace; combining
            // their deferred code avoids repeating its controls and copy in gzip.
            if (/apps\/admin\/src\/(?:FallbackHoroscopeStudio|fallbackHoroscopeSources|FallbackCompositionCheck|DailyFallbackWorkspaceGuide|DailyGlanceStudio|dailyGlanceFriendPreview|PackagedHookCatalogResults|SkyV4StudioReviewPanel)\.(?:ts|tsx)$/u.test(id)) {
              return "review";
            }
          }
        }
      },
      minify: "terser",
      terserOptions: {
        ecma: 2020,
        compress: {
          passes: 5,
          // Retaining shared functions compresses better across the Studio chunks.
          inline: 1,
          reduce_funcs: false
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
