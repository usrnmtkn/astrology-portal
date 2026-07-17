import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webSrcRoot = path.join(repoRoot, "apps/web/src");
const legacyWebAdminSrcRoot = path.join(webSrcRoot, "admin");
const adminSrcRoot = path.join(repoRoot, "apps/admin/src");
const webViteConfigPath = path.join(repoRoot, "apps/web/vite.config.ts");
const adminViteConfigPath = path.join(repoRoot, "apps/admin/vite.config.ts");
const reportPath = path.join(repoRoot, "test-results/admin-web-boundary/latest.md");

const sourceExtensions = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const allowedAdminBridgeFiles = new Set([
  "apps/web/src/App.tsx",
  "apps/web/src/main.tsx"
]);
const allowedAdminSupportRoots = [
  "apps/web/src/content/",
  "apps/web/src/services/"
];

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function walkFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(filePath));
      continue;
    }
    if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) {
      files.push(filePath);
    }
  }
  return files;
}

function lineFindings(filePath, patterns, classify) {
  const source = fs.readFileSync(filePath, "utf8");
  const findings = [];
  source.split(/\r?\n/).forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        findings.push({
          file: toRepoPath(filePath),
          line: index + 1,
          text: line.trim(),
          ...classify(line)
        });
        break;
      }
    }
  });
  return findings;
}

function publicAdminReferences() {
  const files = walkFiles(webSrcRoot).filter((filePath) => !filePath.startsWith(`${legacyWebAdminSrcRoot}${path.sep}`));
  const patterns = [
    /["'`]\.\/admin\b/,
    /["'`]\.\.\/admin\b/,
    /["'`]\.\.\/\.\.\/admin\/src\b/,
    /admin\.css/,
    /\/api\/admin\//,
    /\/admin\/content/,
    /\/admin\/generated-content/,
    /GeneratedContentAdminDashboard/
  ];

  return files.flatMap((filePath) => {
    const repoPath = toRepoPath(filePath);
    return lineFindings(filePath, patterns, (line) => ({
      status: allowedAdminBridgeFiles.has(repoPath) ? "known-bridge" : "unexpected",
      reason: allowedAdminBridgeFiles.has(repoPath)
        ? "temporary monorepo bridge while the admin app is still mounted by the public Vite app"
        : "public app code references admin route, API, CSS, or component"
    }));
  });
}

function adminPublicImports() {
  const files = walkFiles(adminSrcRoot);
  const importPattern = /^\s*import\s+(?:type\s+)?(?:.+?\s+from\s+)?["']([^"']+)["']/;
  const findings = [];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8");
    const fromFile = toRepoPath(filePath);
    source.split(/\r?\n/).forEach((line, index) => {
      const match = line.match(importPattern);
      if (!match) return;

      const specifier = match[1];
      if (!specifier.startsWith(".")) return;

      const resolvedPath = path.normalize(path.join(path.dirname(filePath), specifier));
      const repoResolved = toRepoPath(resolvedPath);
      const isInternalAdmin = resolvedPath.startsWith(adminSrcRoot);
      const isAllowedShared = allowedAdminSupportRoots.some((root) => repoResolved.startsWith(root));
      const isCssImport = specifier.endsWith(".css");

      if (!isInternalAdmin && !isAllowedShared && !isCssImport) {
        findings.push({
          file: fromFile,
          line: index + 1,
          text: line.trim(),
          status: "unexpected",
          reason: `admin source imports non-admin web module "${specifier}"`
        });
      }
    });
  }

  return findings;
}

function devServerPortFindings() {
  const findings = [];
  const webViteConfig = fs.readFileSync(webViteConfigPath, "utf8");
  const adminViteConfig = fs.readFileSync(adminViteConfigPath, "utf8");

  [
    {
      app: "public web",
      file: toRepoPath(webViteConfigPath),
      source: webViteConfig,
      expectedPort: 5173
    },
    {
      app: "admin",
      file: toRepoPath(adminViteConfigPath),
      source: adminViteConfig,
      expectedPort: 5174
    }
  ].forEach(({ app, file, source, expectedPort }) => {
    if (!new RegExp(`port:\\s*${expectedPort}\\b`).test(source)) {
      findings.push({
        file,
        line: 1,
        text: "vite dev server config",
        status: "unexpected",
        reason: `${app} Vite config must reserve port ${expectedPort}`
      });
    }

    if (!/strictPort:\s*true\b/.test(source)) {
      findings.push({
        file,
        line: 1,
        text: "vite dev server config",
        status: "unexpected",
        reason: `${app} Vite config must set strictPort so it cannot drift onto the other app's port`
      });
    }
  });

  return findings;
}

const publicFindings = publicAdminReferences();
const adminImportFindings = adminPublicImports();
const devServerFindings = devServerPortFindings();
const unexpected = [...publicFindings, ...adminImportFindings, ...devServerFindings].filter((finding) => finding.status === "unexpected");
const knownBridges = publicFindings.filter((finding) => finding.status === "known-bridge");

const markdown = [
  "# Admin/Web Boundary Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  unexpected.length === 0 ? "Status: PASS" : "Status: FAIL",
  "",
  "## Scope",
  "",
  "- Public app source: `apps/web/src`.",
  "- Admin app source: `apps/admin/src`.",
  "- Dev server ports: public web must stay on `127.0.0.1:5173`; admin must stay on `127.0.0.1:5174`.",
  "- Allowed temporary bridges: `apps/web/src/App.tsx` and `apps/web/src/main.tsx`.",
  "- Allowed admin support imports while extraction is in progress: `apps/web/src/content/*` and `apps/web/src/services/*`.",
  "",
  "## Unexpected Coupling",
  "",
  unexpected.length === 0
    ? "No unexpected public-to-admin or admin-to-public imports were found."
    : unexpected.map((finding) => `- ${finding.file}:${finding.line} - ${finding.reason}: \`${finding.text}\``).join("\n"),
  "",
  "## Known Temporary Bridges",
  "",
  knownBridges.length === 0
    ? "No temporary bridges were found."
    : knownBridges.map((finding) => `- ${finding.file}:${finding.line} - ${finding.reason}: \`${finding.text}\``).join("\n"),
  "",
  "## Next Extraction Targets",
  "",
  "1. Extract shared content/services from `apps/web/src` into a package with an explicit public/admin contract.",
  "2. Remove the admin route shell from `apps/web/src/App.tsx` once traffic uses the admin app.",
  "3. Give admin API calls an explicit admin client boundary instead of raw `/api/admin/*` strings inside the dashboard component.",
  "4. Split admin Playwright flows and visual baselines into admin-owned scripts once `apps/admin` has its own Vite entry.",
  ""
].join("\n");

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, markdown);

console.log(markdown);

if (unexpected.length > 0) {
  process.exitCode = 1;
}
