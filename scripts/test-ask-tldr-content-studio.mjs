import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));

const api = read("api/admin/ask-tldr.ts");
const studio = read("apps/admin/src/AskTldrStudio.tsx");
const adminMain = read("apps/admin/src/main.tsx");
const webMain = read("apps/web/src/main.tsx");
const primitives = read("apps/admin/src/AdminStudioPrimitives.tsx");
const migration = read("apps/web/supabase/migrations/20260907071500_ask_tldr_owner_preview_content_studio.sql");
const model = readJson("config/ask-tldr/answer-model-v1.json");
const manifest = readJson("config/ask-tldr/manifest.json");

assert.equal(model.runtimeEnabled, false, "Owner preview must not enable Ask TLDR reader runtime.");
assert.equal(model.ownerApproved, false, "Owner preview must not silently approve the answer model.");
assert.equal(model.promotionAuthorized, false, "Owner preview must not silently authorize promotion.");
assert.equal(manifest.runtimeEnabled, false, "Question taxonomy remains non-serving during owner preview.");

assert.match(adminMain, /lazy\(\(\) => import\("\.\/AskTldrStudio"\)\)/u);
assert.match(adminMain, /\/admin\/content\/ask-tldr/u);
assert.match(webMain, /function isAskTldrPath\(\)/u, "Deployed web entry must recognize the Ask TLDR Studio path.");
assert.match(webMain, /import\("\.\.\/\.\.\/admin\/src\/AskTldrStudio"\)/u, "Deployed web entry must mount the owner-preview Studio component.");
assert.match(primitives, /href="\/admin\/content\/ask-tldr"/u);
assert.match(primitives, />\s*Ask TLDR\s*</u);

assert.match(api, /isContentAdminAuthorized\(req\)/u, "Ask TLDR admin API must use the Content Studio owner gate.");
assert.match(api, /ownerPreviewOnly:\s*true/u);
assert.match(api, /runtimeEnabled:\s*false/u);
assert.doesNotMatch(api, /runtimeEnabled:\s*true/u);
assert.doesNotMatch(api, /promotionAuthorized\s*=\s*true/u);
assert.doesNotMatch(api, /status:\s*["']LIVE["']/u, "Owner preview must never write LIVE Ask TLDR rows.");

assert.match(api, /generated_interpretations\?select=/u, "Ask TLDR must reuse the existing Content Studio generated_interpretations table.");
assert.doesNotMatch(api, /generated_content\?select=/u, "Ask TLDR must not invent a second generated-content table.");
assert.match(api, /surface:\s*"ask_tldr"/u);
assert.match(api, /mode:\s*"question"/u, "Question wording must persist as a Content Studio overlay.");
assert.match(api, /mode:\s*"preview"/u, "Generated owner previews must persist as internal review drafts.");
assert.match(api, /status:\s*"DRAFT"/u);
assert.match(api, /immutableRouting/u, "Question wording edits must preserve routing metadata.");
assert.match(api, /baseDisplayQuestion/u, "Question overlays must retain package-source wording.");

assert.match(migration, /'studio-draft'/u, "Ask TLDR migration must preserve the existing Content Studio draft mode.");
assert.match(migration, /'question'/u);
assert.match(migration, /'preview'/u);
assert.match(migration, /'ask_tldr'/u);
assert.match(migration, /surface <> 'ask_tldr' or status <> 'LIVE'/u, "The database must make Ask TLDR owner-preview rows structurally non-serving.");
assert.doesNotMatch(migration, /disable row level security/iu, "Ask TLDR migration must not weaken RLS.");
assert.doesNotMatch(migration, /create policy/iu, "Ask TLDR owner preview must not add a public reader policy.");

assert.match(api, /createTldrAstroReportFactsClient\(\)\.reportWindow/u, "Preview must use the existing report-window calculation service.");
assert.match(api, /prepareEvergreenAskTldrCalibration/u);
assert.match(api, /prepareFreeTextAskTldrCalibration/u);
assert.match(api, /runAskTldrClassifierCalibration/u);
assert.match(api, /runPreparedAskTldrAnswerCalibration/u);
assert.match(api, /maxCalls:\s*1/u, "Free-text classification must remain a one-call bounded calibration.");
assert.match(api, /maxCalls:\s*2/u, "Writer + judge must remain a two-call bounded calibration.");
assert.match(api, /factLock:\s*input\.result\.factLock/u);
assert.match(api, /judge:\s*input\.result\.judge/u);
assert.match(api, /releasePacket:\s*input\.result\.releasePacket/u);

assert.match(api, /type ChartMode = "owner" \| "test"/u, "Preview must support owner and test-chart calculation modes.");
assert.match(api, /function testChartContext/u);
assert.match(api, /function chartFingerprint/u);
assert.match(api, /chartFingerprint:\s*input\.chartFingerprint/u);
assert.match(api, /function configuredOwnerEmails/u, "Preview-domain Content Studio access must be able to resolve the configured owner without cross-origin localStorage.");
assert.match(api, /ownerEmails\.length !== 1/u, "Admin-secret owner lookup must fail closed unless there is exactly one configured owner email.");
assert.match(api, /auth\/v1\/admin\/users\?page=1&per_page=1000/u, "Owner fallback must resolve only the server-configured owner through Supabase Admin.");
assert.match(api, /SUPABASE_SERVICE_ROLE_KEY/u, "Owner fallback must stay server-side behind the service role.");
assert.match(api, /if \(!token && process\.env\.CONTENT_GENERATION_SECRET\)/u, "Owner fallback must only run for the already-authorized Content Studio secret path when no browser session exists.");
assert.match(api, /toLowerCase\(\) === ownerEmail/u, "Owner fallback must exact-match the configured owner email rather than select an arbitrary user.");
const savePreviewBlock = api.slice(api.indexOf("async function savePreviewDraft"), api.indexOf("async function saveQuestionOverlay"));
assert.doesNotMatch(savePreviewBlock, /birthDate|birthTime|latitude|longitude|timeZone/u, "Saved review drafts must not persist test-chart birth data.");

assert.match(studio, /Owner preview only/u);
assert.match(studio, /Runtime:/u);
assert.match(studio, /Preview/u);
assert.match(studio, /Questions \(/u);
assert.match(studio, /Draft review \(/u);
assert.match(studio, /Advanced routing \(read-only\)/u);
assert.match(studio, /Generate owner preview/u);
assert.match(studio, />My chart</u);
assert.match(studio, />Test chart</u);
assert.match(studio, /Birth data is sent only to the calculation service/u);
assert.match(studio, /Compare with previous revision/u, "Draft Review must support revision comparison.");
assert.match(studio, /chartFingerprint/u, "Revision comparison must stay scoped to the same chart fingerprint.");
assert.match(studio, /Approve preview/u);
assert.match(studio, /Reject preview/u);
assert.match(studio, /evidence inspector/u);
assert.match(studio, /Public runtime remains disabled/u);

const pillarFiles = manifest.pillarFiles;
assert.equal(pillarFiles.length, 9);
const questions = pillarFiles.flatMap((file) => readJson(`config/ask-tldr/pillars/${file}`).questions);
assert.equal(questions.length, 54, "Content Studio must surface the complete governed evergreen question set.");
assert.equal(new Set(questions.map((question) => question.id)).size, 54, "Ask TLDR Content Studio question IDs must remain unique.");

console.log("Ask TLDR Content Studio contract passed: 54 governed questions are wording-editable, owner/test-chart previews use bounded calculated calibration, preview-domain admin access can resolve exactly one configured owner without cross-origin session storage, revision drafts are comparable without persisting test birth data, generated_interpretations keeps existing RLS, and the database forbids LIVE Ask TLDR rows.");
