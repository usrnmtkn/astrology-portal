#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv.find((value) => value.startsWith("--input="))?.slice(8)
  ?? path.join(repoRoot, "packages/astro-knowledge/generated/content-unresolved-queue-v1.json"));
const outputPath = path.resolve(process.argv.find((value) => value.startsWith("--out="))?.slice(6)
  ?? path.join(repoRoot, "packages/astro-knowledge/generated/content-unresolved-dashboard-v1.html"));
const checkOnly = process.argv.includes("--check");

function surfaceFor(item) {
  const key = String(item.contentKey ?? "");
  if (key.includes("daily-") || key.startsWith("daily-glance-variant/")) return "Daily Glance";
  if (key.includes("synastry") || key.includes("compat") || key.includes("relationship") || key.includes("bond-")) return "Friends / Relationships";
  if (key.includes("natal") || key.includes("placement")) return "Natal / Placements";
  if (key.includes("lunation") || key.includes("eclipse") || key.includes("moon-phase")) return "Lunations";
  if (key.includes("sky-") || key.includes("transit") || key.includes("timing")) return "Sky / Transits";
  return "Other";
}

const report = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const items = report.items.map((item) => ({ ...item, surface: surfaceFor(item) }));
const surfaceCounts = Object.fromEntries([...new Set(items.map((item) => item.surface))].sort()
  .map((surface) => [surface, items.filter((item) => item.surface === surface).length]));
const payload = JSON.stringify({ ...report, items, surfaceCounts }).replaceAll("<", "\\u003c");
const serialized = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>TLDR Astro unresolved content</title>
<style>body{font:15px/1.45 system-ui,sans-serif;margin:32px;color:#171822;background:#f7f7fa}h1{margin-bottom:4px}.summary{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.pill{background:#fff;border:1px solid #ddd;border-radius:999px;padding:8px 12px}input,select{font:inherit;padding:9px;margin:0 8px 14px 0}table{width:100%;border-collapse:collapse;background:#fff}th,td{text-align:left;vertical-align:top;padding:10px;border-bottom:1px solid #e5e5ea}th{position:sticky;top:0;background:#fff}code{font-size:12px}small{color:#606273}</style></head>
<body><h1>Unresolved content review</h1><small>Generated from the governed unresolved queue. This dashboard is read-only.</small>
<div class="summary" id="summary"></div><input id="search" placeholder="Search key or source"><select id="surface"><option value="">All surfaces</option></select><select id="reason"><option value="">All reasons</option></select>
<table><thead><tr><th>Surface</th><th>Content key</th><th>Reason</th><th>Status</th><th>Source</th></tr></thead><tbody id="rows"></tbody></table>
<script>const data=${payload};const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const search=document.querySelector("#search"),surface=document.querySelector("#surface"),reason=document.querySelector("#reason"),rows=document.querySelector("#rows");
document.querySelector("#summary").innerHTML='<span class="pill"><b>'+data.count+'</b> unresolved</span>'+Object.entries(data.surfaceCounts).map(([k,v])=>'<span class="pill">'+esc(k)+': <b>'+v+'</b></span>').join("");
Object.keys(data.surfaceCounts).forEach(v=>surface.insertAdjacentHTML("beforeend",'<option>'+esc(v)+'</option>'));Object.keys(data.reasonCounts).forEach(v=>reason.insertAdjacentHTML("beforeend",'<option>'+esc(v)+'</option>'));
function render(){const q=search.value.toLowerCase();const filtered=data.items.filter(i=>(!surface.value||i.surface===surface.value)&&(!reason.value||i.reason===reason.value)&&(!q||JSON.stringify(i).toLowerCase().includes(q)));rows.innerHTML=filtered.map(i=>'<tr><td>'+esc(i.surface)+'</td><td><code>'+esc(i.contentKey)+'</code></td><td>'+esc(i.reason)+'</td><td>'+esc(i.reviewStatus)+'</td><td><code>'+esc(i.sourcePath+i.objectPath)+'</code></td></tr>').join("")}
[search,surface,reason].forEach(el=>el.addEventListener("input",render));render();</script></body></html>\n`;

if (checkOnly) {
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (existing !== serialized) {
    console.error("Content unresolved dashboard is stale. Run npm run build:content-unresolved-dashboard.");
    process.exit(1);
  }
  console.log(`Content unresolved dashboard is current (${items.length} items).`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} (${items.length} unresolved items).`);
}
