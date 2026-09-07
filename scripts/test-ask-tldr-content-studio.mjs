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
const reportModelClient = read("api/_lib/report-model-client.ts");
const provider = read("api/_lib/ask-tldr-provider.ts");
const voiceReceipt = read("api/_lib/ask-tldr-voice-receipt.ts");
const questionWriter = read("api/_lib/ask-tldr-question-bound-writer.ts");
const questionJudge = read("api/_lib/ask-tldr-question-bound-judge.ts");
const judge = read("api/_lib/ask-tldr-judge.ts");
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
assert.match(api, /maxCalls:\s*4/u, "Writer/judge calibration must authorize one bounded rewrite and re-judge.");
assert.match(provider, /CORRECTIVE REVISION PASS/u, "A below-threshold judge result must feed a bounded corrective writer pass.");
assert.match(provider, /revision_writer/u);
assert.match(provider, /revision_judge/u);
assert.match(provider, /input\.authorization\.maxCalls < 4/u, "The correction cycle must never exceed the explicit four-call cap.");
assert.match(api, /factLock:\s*input\.result\.factLock/u);
assert.match(api, /judge:\s*input\.result\.judge/u);
assert.match(api, /releasePacket:\s*input\.result\.releasePacket/u);
assert.match(api, /revision:\s*input\.result\.revision/u);

assert.match(questionWriter, /APPLICATION STANDARD/u, "Guidance writers must translate advice into an applicable next move.");
assert.match(questionWriter, /decision, request, preparation step, boundary, question, or observable action/u);
assert.match(questionWriter, /must not invent a personal event or history/u);
assert.match(questionJudge, /APPLICATION STANDARD FOR practical_usefulness/u, "The judge must grade the same application standard used by the writer.");
assert.match(questionJudge, /Abstract coaching verbs alone do not earn a 4/u);
assert.match(judge, /practical_usefulness:\s*4/u, "Practical usefulness must clear the release-quality floor instead of passing at a fixable 3.");

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

assert.match(api, /approve_feedback/u, "Draft Review must have an explicit owner-feedback promotion action.");
assert.match(api, /revoke_feedback/u, "Owner-promoted feedback must be revocable.");
assert.match(api, /ask-tldr-owner-feedback\.v1/u);
assert.match(api, /approvedOwnerCorrections/u, "Approved Studio feedback must be selected for later generations.");
assert.match(voiceReceipt, /ownerCorrections\?: AskTldrOwnerCorrection\[\]/u, "Runtime owner corrections must enter the hashed voice receipt.");
assert.match(voiceReceipt, /\.\.\.dynamic, \.\.\.packaged/u, "Approved runtime feedback must outrank packaged corrections.");
assert.match(studio, /Use note in future \{pillarLabel\} answers/u, "Owner notes must require a separate explicit promotion action.");
assert.match(studio, /Rejecting a preview does not teach future answers by itself/u, "Rejecting a draft must not silently become durable model guidance.");
assert.match(studio, /Stop using note in future \{pillarLabel\} answers/u, "Owner feedback promotion must be reversible.");

assert.match(reportModelClient, /function requireOpenAiKey\(\)/u, "Report transport must explicitly require the direct OpenAI credential.");
assert.match(reportModelClient, /process\.env\.OPENAI_API_KEY/u, "Direct OpenAI must remain the report transport credential.");
assert.match(reportModelClient, /https:\/\/api\.openai\.com\/v1\/responses/u, "Report model calls must use the direct OpenAI Responses endpoint.");
assert.match(reportModelClient, /Preview deployment/u, "Missing Preview credentials must explain that a Vercel redeploy is required after env changes.");
assert.doesNotMatch(reportModelClient, /ai-gateway\.vercel\.sh/u, "Ask TLDR/report preview must not silently fall through to Vercel AI Gateway billing.");
assert.doesNotMatch(reportModelClient, /AI_GATEWAY_API_KEY/u, "Report model transport must not depend on a second Vercel AI billing credential.");
assert.doesNotMatch(reportModelClient, /getVercelOidcToken/u, "Report model transport must not use Vercel OIDC as an alternate billing path.");

assert.match(studio, /Owner preview only/u);
assert.match(studio, /Runtime:/u);
assert.match(studio, /Model: <strong>\{payload\.modelTransport\.label\}<\/strong>/u);
assert.match(studio, /Preview/u);
assert.match(studio, /Questions \(/u);
assert.match(studio, /Draft review \(/u);
assert.match(studio, /Advanced routing \(read-only\)/u);
assert.match(studio, /Generate owner preview/u);
assert.match(studio, />My chart</u);
assert.match(studio, />Test chart</u);
assert.match(studio, /Birth data is sent only to the calculation service/u);
assert.match(studio, /Rewritten once after the first judge block/u);
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

console.log("Ask TLDR Content Studio contract passed: 54 governed questions are wording-editable, owner/test-chart previews use bounded calculated calibration, guidance answers must include an application layer, judge-blocked drafts get one bounded rewrite and re-judge, explicitly promoted owner notes enter future writer/judge voice receipts for the same pillar, preview-domain admin access resolves the configured owner, report model calls stay on direct OpenAI, revision drafts are comparable without persisting test birth data, generated_interpretations keeps existing RLS, and the database forbids LIVE Ask TLDR rows.");