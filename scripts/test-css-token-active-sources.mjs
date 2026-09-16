import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const script = fileURLToPath(new URL("./run-css-token-integrity-audit.mjs", import.meta.url));
const root = mkdtempSync(path.join(tmpdir(), "css-token-active-"));
const write = (file, text) => {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, text);
};
const run = () => spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", timeout: 15000 });
const studio = "apps/admin/src/studio-system.css";
const theme = "apps/admin/src/admin-theme.css";
try {
  write("apps/web/src/styles/theme.css", ":root { --ink: black; }");
  write(studio, '@import "./admin-theme.css"; .active { color: var(--ink); }');
  write(theme, ":root { --studio-ink: var(--ink); }");
  write("apps/admin/src/retired.css", ".unused { color: var(--retired-missing); }");
  let result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Disconnected historical stylesheets: 1/);
  const report = readFileSync(path.join(root, "test-results/css-audit/token-integrity.md"), "utf8");
  assert.match(report, /apps\/admin\/src\/retired\.css/);

  write(studio, '@import "./admin-theme.css"; @import url("./retired.css") layer(legacy);');
  result = run();
  assert.equal(result.status, 1, "Reconnecting an invalid historical stylesheet must fail.");
  assert.match(result.stdout, /Unresolved active token references: 1/);

  write(studio, '@import "./admin-theme.css"; .active { color: var(--unused-definition); }');
  write("apps/admin/src/retired.css", ":root { --unused-definition: black; }");
  assert.equal(run().status, 1, "Unshipped definitions cannot satisfy active references.");

  write(studio, '@import "./admin-theme.css";');
  write(theme, '@import url(./nested.css); :root { --studio-ink: var(--nested-ink); }');
  write("apps/admin/src/nested.css", '@import "./admin-theme.css"; :root { --nested-ink: var(--ink); }');
  assert.equal(run().status, 0, "Nested and cyclic imports must resolve without repeated scans.");
  write(theme, '@import "./missing.css";');
  assert.notEqual(run().status, 0, "Missing imports must fail closed.");
  write(theme, '@import "https://invalid.test/theme.css";');
  assert.notEqual(run().status, 0, "Uninspectable remote imports must fail closed.");
  console.log("PASS: active CSS imports, historical debt reporting, missing/remote imports, cycles and no hidden token definitions");
} finally { rmSync(root, { recursive: true, force: true }); }
