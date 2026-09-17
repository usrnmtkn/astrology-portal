import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createTransitSynastryRenderer as shippedFactory } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { verifyTransitExactIsolation } from "./transit-exact-isolation-cases.mjs";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "transit-exact-isolation-"));
try {
  const outfile = path.join(temp, "browser.mjs");
  await build({ entryPoints: ["apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts"], outfile, bundle: true, format: "esm", platform: "node", logLevel: "silent" });
  const sourceFactory = (await import(pathToFileURL(outfile))).createTransitSynastryRenderer;
  for (const [name, factory] of [["browser source", sourceFactory], ["shipped artifact", shippedFactory]]) {
    console.log(`PASS ${name}: ${verifyTransitExactIsolation(factory)} exact-aspect edit isolation cases, both audiences, pass/variant precedence, draft exclusion, retirement and no input mutations.`);
  }
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
