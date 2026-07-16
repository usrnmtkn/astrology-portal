import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webSrcRoot = path.join(repoRoot, "apps/web/src");
const adminSrcRoot = path.join(webSrcRoot, "admin");
const adminAppSrcRoot = path.join(repoRoot, "apps/admin/src");
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
  const files = walkFiles(webSrcRoot).filter((filePath) => !filePath.startsWith(`${adminSrcRoot}${path.sep}`));
  const patterns = [
    /["'`]\.\/admin\b/,
    /["'`]\.\.\/admin\b/,
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

function adminAppTemporaryImports() {
  if (!fs.existsSync(adminAppSrcRoot)) {
    return [];
  }

  const files = walkFiles(adminAppSrcRoot);
  const patterns = [
    /\.\.\/\.\.\/web\/src\/admin\/GeneratedContentAdminDashboard/,
    /apps\/web\/src\/admin/
  ];

  return files.flatMap((filePath) =>
    lineFindings(filePath, patterns, () => ({
      status: "known-bridge",
      reason: "temporary admin app shell bridge until dashboard source moves into apps/admin"
    }))
  );
}

const publicFindings = publicAdminReferences();
const adminImportFindings = adminPublicImports();
const adminAppFindings = adminAppTemporaryImports();
const unexpected = [...publicFindings, ...adminImportFindings, ...adminAppFindings].filter((finding) => finding.status === "unexpected");
const knownBridges = [...publicFindings, ...adminAppFindings].filter((finding) => finding.status === "known-bridge");

const markdown = [
  "# Admin/Web Boundary Audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  unexpected.length === 0 ? "Status: PASS" : "Status: FAIL",
  "",
  "## Scope",
  "",
  "- Public app source: `apps/web/src`, excluding `apps/web/src/admin`.",
  "- Admin dashboard source: `apps/web/src/admin`.",
  "- Admin app shell: `apps/admin/src`.",
  "- Allowed temporary bridges: `apps/web/src/App.tsx` and `apps/web/src/main.tsx`.",
  "- Allowed admin app bootstrap bridge: `apps/admin/src/main.tsx` importing the existing web dashboard.",
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
  "1. Move dashboard source from `apps/web/src/admin` into `apps/admin/src`.",
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
