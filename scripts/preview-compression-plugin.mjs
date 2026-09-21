import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

const types = { ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".html": "text/html", ".svg": "image/svg+xml", ".wasm": "application/wasm", ".data": "application/octet-stream" };

// Vercel compresses these assets; Vite preview otherwise sends their raw bytes.
// Apply only to built previews so throttled browser tests measure HTTP transfer,
// including compression, without altering the production artifact or dev server.
export function previewCompressionPlugin() {
  return {
    name: "tldr-preview-compression",
    async configurePreviewServer(server) {
      const root = await realpath(resolve(server.config.root, server.config.build.outDir));
      const compressed = new Map();
      server.middlewares.use(async (req, res, next) => {
        if (!["GET", "HEAD"].includes(req.method) || req.headers.range ||
          !String(req.headers["accept-encoding"] ?? "").split(",").some(value => /^\s*gzip\s*(?:;\s*q=(?!0(?:\.0*)?\s*$)[\d.]+)?\s*$/i.test(value))) return next();
        try {
          const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
          const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
          const type = types[extname(file)];
          if (!type || !file.startsWith(`${root}${sep}`) || !(await realpath(file)).startsWith(`${root}${sep}`)) return next();
          const info = await stat(file);
          if (!info.isFile()) return next();
          let entry = compressed.get(file);
          if (!entry || entry.mtimeMs !== info.mtimeMs) {
            entry = { mtimeMs: info.mtimeMs, bytes: gzipSync(await readFile(file)) };
            compressed.set(file, entry);
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", [".wasm", ".data"].includes(extname(file)) ? type : `${type}; charset=utf-8`);
          res.setHeader("Content-Encoding", "gzip");
          res.setHeader("Content-Length", entry.bytes.length);
          res.setHeader("Vary", "Accept-Encoding");
          res.setHeader("Cache-Control", "no-cache");
          res.end(req.method === "HEAD" ? undefined : entry.bytes);
        } catch { next(); }
      });
    }
  };
}
