#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  writingSurfaceAdminAccess,
  writingSurfaceSourceMap,
  writingSurfaceSourceRoleLabels
} from "../apps/admin/src/writingSurfaceSourceMap.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPaths = [
  path.join(repoRoot, "apps/admin/public/generated/admin-writing-surface-map-v1.json"),
  path.join(repoRoot, "apps/web/public/generated/admin-writing-surface-map-v1.json")
];
const payload = {
  schema: "admin-writing-surface-map/v1",
  surfaces: writingSurfaceSourceMap,
  access: writingSurfaceAdminAccess,
  roleLabels: writingSurfaceSourceRoleLabels
};

for (const outputPath of outputPaths) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
}
console.log(`Built Admin writing surface map: ${writingSurfaceSourceMap.length} surfaces.`);
