import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "vite";
import { parseAst } from "rollup/parseAst";
import { deploymentAssetUrl, deploymentAssetsPlugin } from "./deployment-assets-plugin.mjs";

const env = { VERCEL_SKEW_PROTECTION_ENABLED: "1", VERCEL_DEPLOYMENT_ID: "dpl_studio_a" };
assert.equal(deploymentAssetUrl("/assets/editor.js?existing=1#section", env), "/assets/editor.js?existing=1&dpl=dpl_studio_a#section");
assert.equal(deploymentAssetUrl("/assets/editor.js", {}), "/assets/editor.js");
assert.throws(() => deploymentAssetsPlugin({ VERCEL_SKEW_PROTECTION_ENABLED: "1" }), /DEPLOYMENT_ID/u);
assert.throws(() => deploymentAssetsPlugin({ VERCEL: "1" }), /Skew Protection/u);

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "deployment-assets-")));
try {
  mkdirSync(path.join(root, "public"));
  writeFileSync(path.join(root, "public/logo.svg"), "<svg/>");
  writeFileSync(path.join(root, "index.html"), '<img src="/logo.svg"><script type="module" src="/main.js"></script>');
  writeFileSync(path.join(root, "main.js"), `import {shared} from './shared.js';import './main.css';globalThis.shared=shared;globalThis.openPanel=()=>import('./panel.js');globalThis.prose='./not-an-import.js';globalThis.worker=()=>new Worker(new URL('./worker.js',import.meta.url),{type:'module'});`);
  writeFileSync(path.join(root, "shared.js"), "export const shared='Synthetic shared dependency';");
  writeFileSync(path.join(root, "panel.js"), "import {shared} from './shared.js';import './panel.css';export const label=shared+' Synthetic panel';");
  writeFileSync(path.join(root, "worker.js"), "globalThis.openWorkerPanel=()=>import('./worker-panel.js');postMessage('Synthetic worker');");
  writeFileSync(path.join(root, "worker-panel.js"), "export const copy='Synthetic worker panel';");
  writeFileSync(path.join(root, "main.css"), "body {background-image:url('./picture.svg');}");
  writeFileSync(path.join(root, "picture.svg"), "<svg><title>Synthetic asset</title></svg>");
  writeFileSync(path.join(root, "panel.css"), ".panel { display: block; }");

  for (const enabled of [false, true]) {
    const result = await build({ configFile: false, envFile: false, root, logLevel: "silent",
      plugins: [deploymentAssetsPlugin(enabled ? env : {})],
      worker: { format: "es", plugins: () => [deploymentAssetsPlugin(enabled ? env : {})] },
      build: { write: false, minify: false, assetsInlineLimit: 0, rollupOptions: { output: {
        manualChunks: id => id.endsWith("/shared.js") ? "shared" : undefined
      } } }
    });
    const output = result.output;
    const files = new Map(output.map(file => [file.fileName, file]));
    const all = output.map(file => file.type === "chunk" ? file.code : String(file.source)).join("\n");
    assert.equal(all.includes("?dpl="), enabled);
    const html = String(files.get("index.html").source);
    assert.match(html, /src="\/logo.svg"/u, "Public files are not deployment-pinned by accident.");
    const main = output.find(file => file.type === "chunk" && file.isEntry);
    assert.match(main.code, /["']\.\/not-an-import\.js["']/u, "Ordinary strings must retain exact bytes.");
    const imports = [];
    const visit = node => {
      if (!node || typeof node !== "object") return;
      if (node.type === "ImportExpression" || node.type === "ImportDeclaration") {
        if (typeof node.source?.value === "string") imports.push(node.source.value);
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object" && value.type) visit(value);
      }
    };
    for (const file of output) {
      if (file.type === "chunk") visit(parseAst(file.code));
      else if (file.fileName.endsWith(".js")) visit(parseAst(String(file.source)));
    }
    assert(imports.some(url => /panel-/u.test(url)), "The fixture retains a real deferred panel.");
    assert(imports.some(url => /shared-/u.test(url)), "The fixture retains a real shared static import.");
    assert(imports.some(url => /worker-panel-/u.test(url)), "The worker retains its own deferred import graph.");
    for (const specifier of imports) {
      const url = new URL(specifier, "https://fixture.invalid/assets/entry.js");
      assert.equal(url.searchParams.get("dpl"), enabled ? env.VERCEL_DEPLOYMENT_ID : null);
      assert(files.has(url.pathname.slice(1)), `Import resolves to a real emitted file: ${specifier}`);
    }
    if (enabled) {
      for (const url of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/gu)) assert(url[1].includes("?dpl=dpl_studio_a"));
      assert.match(all, /picture-[^"'\s)]+\.svg\?dpl=dpl_studio_a/u);
      assert.match(all, /worker-[^"'\s)]+\.js\?dpl=dpl_studio_a/u);
      assert.match(all, /panel-[^"'\s)]+\.css\?dpl=dpl_studio_a/u);
    }
  }
  console.log("PASS real Vite asset graph: static/dynamic imports, HTML, CSS, worker and preload requests retain deployment identity; local builds and prose remain unchanged.");
} finally { rmSync(root, { recursive: true, force: true }); }
