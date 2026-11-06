import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { loadEnv, preview } from "vite";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const webRoot = resolve(repoRoot, "apps/web");
const publicOrigin = "https://tldrastro.vercel.app";
const publicReads = new Map([
  ["/api/content-reader", "POST"],
  ["/api/content-publications", "GET"],
  ["/api/sky-reader", "GET"],
  ["/api/sky", "GET"],
  ["/api/calendar", "GET"],
  ["/api/astrology-facts", "GET"]
]);
const studioRoutes = new Map([
  ["/api/admin/generated-content-inventory", ["GET"]],
  ["/api/admin/generated-content", ["GET", "POST", "PATCH"]],
  ["/api/admin/package-source", ["GET"]],
  ["/api/admin/content-live-status", ["POST"]],
  ["/api/admin/content-publication", ["POST"]],
  ["/api/admin/content-history", ["GET"]]
]);

function studioSessionHeaders(headers) {
  const token = headers["x-content-admin-session"];
  if (typeof token !== "string" || token.length > 16_384 || headers.authorization !== `Bearer ${token}`
    || headers["x-content-generation-secret"] || !/^[\w-]+\.[\w-]+\.[\w-]+$/u.test(token)) return null;
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    // A routing filter only. The original backend verifies the signature and
    // owner access; decoded claims never grant local access or run a handler.
    if (claims.role !== "authenticated" || typeof claims.sub !== "string" || !claims.sub
      || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000) return null;
    return { authorization: `Bearer ${token}`, "x-content-admin-session": token };
  } catch { return null; }
}

// Never imports local API handlers. Public reads carry no session. The small
// Studio allowlist uses only the browser's normal session, at its original API.
export function publicReaderPreviewPlugin(fetcher = fetch) {
  return {
    name: "tldr-public-reader-preview",
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? "/").split("?")[0];
        if (path !== "/api" && !path.startsWith("/api/")) return next();
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        const publicRead = publicReads.get(path) === req.method;
        const studio = studioRoutes.get(path)?.includes(req.method);
        const sessionHeaders = studio ? studioSessionHeaders(req.headers) : null;
        if (!publicRead && !(studio && sessionHeaders)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "This preview requires your signed-in owner session for supported Studio actions." }));
          return;
        }
        try {
          let body;
          if (["POST", "PATCH"].includes(req.method)) {
            const chunks = [];
            let size = 0;
            for await (const chunk of req) {
              size += chunk.length;
              if (size > (studio ? 1_000_000 : 40_000)) {
                res.statusCode = 413;
                res.end(JSON.stringify({ error: "Preview request is too large." }));
                return;
              }
              chunks.push(chunk);
            }
            body = Buffer.concat(chunks);
          }
          const upstream = await fetcher(new URL(req.url, publicOrigin), {
            method: req.method,
            headers: { accept: "application/json", ...(body ? { "content-type": "application/json" } : {}), ...(sessionHeaders ?? {}) },
            body,
            redirect: "error",
            signal: AbortSignal.timeout(30_000)
          });
          res.statusCode = upstream.status;
          res.end(Buffer.from(await upstream.arrayBuffer()));
        } catch {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: "Preview API request failed." }));
        }
      });
    }
  };
}

export function publicBrowserEnvironment(source) {
  const isPublicKey = key => {
    if (key.startsWith("sb_publishable_")) return true;
    try { return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon"; }
    catch { return false; }
  };
  const keys = [source.VITE_SUPABASE_PUBLISHABLE_KEY, source.VITE_SUPABASE_ANON_KEY].filter(Boolean);
  if (!keys.length || keys.some(key => !isPublicKey(key)) || !source.VITE_SUPABASE_URL) {
    throw new Error("Public Supabase browser configuration is required.");
  }
  const env = {};
  for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_ANON_KEY", "VITE_MAPBOX_ACCESS_TOKEN", "VITE_PHONE_AUTH_ENABLED"]) {
    if (source[name]) env[name] = source[name];
  }
  env.VITE_ENABLE_NATAL_ASPECT_PATTERNS = "true";
  return env;
}

async function main() {
  const publicEnv = publicBrowserEnvironment(loadEnv("development", webRoot, "VITE_"));
  const env = { ...Object.fromEntries(["PATH", "HOME", "TMPDIR"].filter(name => process.env[name]).map(name => [name, process.env[name]])), ...publicEnv };
  const child = spawn("npm", ["run", "build:web"], { cwd: repoRoot, env, stdio: "inherit" });
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
  if (code !== 0) throw new Error("Reader preview build failed.");

  // Bypass the development Vite config entirely: no local route execution, env
  // loading, source-file serving, or inherited server credentials in the preview.
  for (const name of Object.keys(process.env)) if (!["PATH", "HOME", "TMPDIR"].includes(name)) delete process.env[name];
  const server = await preview({
    configFile: false, envDir: false, root: webRoot,
    plugins: [publicReaderPreviewPlugin()],
    build: { outDir: resolve(webRoot, "dist") },
    preview: { host: "127.0.0.1", port: 5173, strictPort: true }
  });
  server.printUrls();
  console.log("Safe preview: no local API handlers or server credentials; public reads and owner-session Studio editing only.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
