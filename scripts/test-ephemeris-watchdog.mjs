import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assess, observe, withState, candidateFingerprint, verifyRepair, repairTests } from "./ci-ephemeris-watchdog.mjs";
import { actionableFailures, tick, startInvestigation, validateRuntime, agentArguments, accountEnvironment } from "./ci-run-ephemeris-watchdog.mjs";
import { createHash } from "node:crypto";

const now = Date.now();
const ago = minutes => new Date(now - minutes * 60_000).toISOString();
const head = "a".repeat(40);
const run = (minutes = 3, overrides = {}) => ({ id: 12, head_branch: "main", head_sha: head, event: "schedule",
  status: "completed", conclusion: "success", created_at: ago(minutes + 1), updated_at: ago(minutes), ...overrides });
const input = (runs = [run()], ok = true) => ({ mainHead: head, health: { schema: "ephemeris-monitor/v1", ok, checkedAt: ago(0) }, runs });
assert.deepEqual(assess(input(), now).kinds, []);
assert(assess(input([run(90)]), now).kinds.includes("monitor-overdue"));
assert(assess(input([], false), now).kinds.includes("ephemeris-outage"));
assert(assess(input([run(1, { event: "workflow_dispatch", head_branch: "feature" })]), now).overdue);
assert(assess(input([run(1, { status: "in_progress", created_at: ago(25) })]), now).kinds.includes("monitor-stalled"));
assert.throws(() => assess({ ...input(), health: { ...input().health, checkedAt: ago(3) } }, now), /Stale/u);
assert.throws(() => assess({ ...input(), mainHead: "unknown" }, now), /revision/u);
const actualClock = Date.now;
try {
  let clock = now;
  Date.now = () => clock;
  const slow = await observe({}, () => {}, { collect: async () => {
    clock += 20_000;
    return { ...input([], false), health: { ...input().health, ok: false, checkedAt: new Date(clock).toISOString() } };
  } });
  assert.equal(slow.observation.healthOk, false, "A bounded retry window must be evaluated at probe completion, not before it started");
  assert(slow.observation.kinds.includes("ephemeris-outage"));
} finally { Date.now = actualClock; }

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ephemeris-watchdog-test-"));
const stateDirectory = path.join(temporary, "state");
const repo = path.join(temporary, "repo");
fs.mkdirSync(repo);
const git = args => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try {
  let source = input();
  let dispatched = 0;
  const collect = async () => source;
  const dispatch = async expected => { assert.equal(expected, head); dispatched++; };
  let incidentId;
  await withState(stateDirectory, async (state, persist) => {
    const tick = (extra = {}) => observe(state, persist, { collect, dispatch, now, ...extra });
    assert.equal((await tick()).incident, null, "Healthy startup stays quiet");
    source = input([run(120)]);
    await tick();
    assert.equal(dispatched, 0, "Read-only observation must never dispatch");
    await tick({ repairSchedule: true });
    assert.equal(dispatched, 1, "Missed monitor receives a main-only dispatch");
    incidentId = state.incident.id;
    await tick({ repairSchedule: true });
    assert.equal(dispatched, 1, "Repeated outage must not flood dispatches");
    assert.equal(state.incident.id, incidentId, "Repeated incident must retain its investigation checkpoint");
    source = input([run(1, { event: "workflow_dispatch" })]);
    const fallback = await tick();
    assert.equal(fallback.incident.id, incidentId, "Fallbacks retain one scheduler investigation");
    assert(fallback.observation.nativeScheduleOverdue, "A fallback run must not pretend native scheduling recovered");
    source = input();
    const recovered = await tick();
    assert.equal(recovered.incident.phase, "recovered");
    source = input([run()], false);
    await tick({ repairSchedule: true, now: now + 60_000 });
    assert.notEqual(state.incident.id, incidentId, "Later outage has a new investigation identity");
    assert.equal(dispatched, 1, "Cooldown also covers a later outage");
    state.incident.phase = "monitoring";
    state.incident.currentKinds = ["native-schedule-overdue"];
    await tick();
    assert.equal(state.incident.phase, "pending", "A new app outage escalates an already mitigated scheduler incident");
    await tick({ repairSchedule: true, now: now + 31 * 60_000, collect: async () => input([run()], false) });
    // Health is stale at the later clock; unknown data is never dispatch authority.
    assert.equal(dispatched, 1);
    await tick({ repairSchedule: true, dispatch: async () => { throw new Error("ambiguous transport failure"); },
      now: now + 31 * 60_000, collect: async () => ({ ...input([run()], false), health: { ...input().health, ok: false, checkedAt: new Date(now + 31 * 60_000).toISOString() } }) });
    assert.equal(state.lastDispatch.status, "unknown-or-failed");
    await tick({ repairSchedule: true });
    assert.equal(dispatched, 1, "An ambiguous dispatch cannot be immediately replayed");
    source = input([run(90, { status: "queued" })]);
    await tick({ repairSchedule: true });
    assert.equal(dispatched, 1, "An active/stalled monitor is investigated instead of enqueuing more jobs");
    await assert.rejects(withState(stateDirectory, async () => {}), /already running/u);
  });
  assert(!fs.existsSync(path.join(stateDirectory, "lock")), "Lock is released after completion");
  await assert.rejects(withState(path.resolve(path.dirname(new URL(import.meta.url).pathname), "../artifacts/watchdog-state"), async () => {}), /outside/u);
  const history = fs.readFileSync(path.join(stateDirectory, "attempts.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(history.filter(entry => entry.action === "dispatch-intent").length, 2);
  assert(history.some(entry => entry.action === "incident-recovered"));
  assert(history.every((entry, index) => entry.sequence === index + 1));

  git(["init", "--quiet"]);
  git(["remote", "add", "origin", "https://github.com/usrnmtkn/astrology-portal.git"]);
  fs.writeFileSync(path.join(repo, "example.txt"), "original\n");
  git(["add", "example.txt"]);
  git(["-c", "user.name=Watchdog fixture", "-c", "user.email=fixture@example.invalid", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "Synthetic fixture"]);
  const baseline = candidateFingerprint(repo);
  fs.writeFileSync(path.join(repo, "untracked.txt"), "first\n");
  const untracked = candidateFingerprint(repo);
  assert.notEqual(baseline.fingerprint, untracked.fingerprint);
  fs.writeFileSync(path.join(repo, "untracked.txt"), "second\n");
  assert.notEqual(untracked.fingerprint, candidateFingerprint(repo).fingerprint, "Untracked content is part of the frozen candidate");
  const state = { incident: { id: "fixture", phase: "investigating" } };
  const receipts = [];
  const persist = event => receipts.push(structuredClone(event));
  let tests = 0;
  const verified = await verifyRepair(state, persist, repo, async () => { tests++; });
  assert.equal(tests, repairTests.length);
  assert.equal(verified.releaseReady, false, "Local tests never authorize release");
  assert.deepEqual(verified.requiredExactHeadGates, ["content-studio-api", "browser-release-gate", "project-privacy"]);
  state.incident.phase = "investigating";
  await assert.rejects(verifyRepair(state, persist, repo, async () => { fs.appendFileSync(path.join(repo, "example.txt"), "changed\n"); }), /changed/u);
  assert.equal(state.incident.phase, "blocked", "A changing tree cannot inherit passing evidence");
  state.incident.phase = "investigating";
  await assert.rejects(verifyRepair(state, persist, repo, async () => { throw new Error("fixture test failed"); }), /fixture test failed/u);
  assert.equal(receipts.at(-1).status, "failed");
  assert.equal(receipts.at(-1).tests[0].status, "failed", "Original test failure remains in attempt history");

  const delivery = {};
  let queued = 0;
  let observation = { observation: { healthOk: true, kinds: [], overdue: false, active: false }, incident: null };
  const deliveryHistory = [];
  const check = extra => tick(delivery, event => deliveryHistory.push(structuredClone(event)), {
    observe: async () => observation, wake: async () => { queued++; return "queued-resume-requested"; }, ...extra
  });
  await check();
  assert.equal(queued, 0, "Healthy checks must not invoke an agent");
  observation = { observation: { healthOk: true, kinds: ["native-schedule-overdue", "monitor-overdue"], overdue: true, active: false }, dispatch: { status: "accepted" } };
  await check();
  assert.equal(queued, 0, "An automatically handled schedule gap must not invoke an agent");
  observation.observation.healthOk = false;
  await check();
  await check();
  assert.equal(queued, 1, "A sustained outage queues exactly one investigation");
  observation.observation.healthOk = true;
  await check();
  assert.equal(queued, 1, "Healthy recovery must not spend an agent turn");
  observation.observation.healthOk = false;
  await check();
  assert.equal(queued, 2, "A later outage queues a new investigation");
  await check({ observe: async () => { throw new Error("checker unavailable"); } });
  assert.equal(queued, 3, "An unhandled checker error escalates once");
  await check({ observe: async () => { throw new Error("still unavailable"); } });
  assert.equal(queued, 3);
  assert.deepEqual(actionableFailures({ observation: { healthOk: true, kinds: ["monitor-stalled"], overdue: true, active: true } }), ["monitor-stalled"]);
  assert.deepEqual(actionableFailures({ observation: { healthOk: true, kinds: [], overdue: true, active: false }, dispatch: { status: "unknown-or-failed" } }), ["monitor-dispatch-failed"]);
  await check({ observe: async () => ({ observation: { healthOk: true, kinds: [], overdue: false } }) });
  let uncertain = 0;
  const uncertainWake = async () => { uncertain++; throw new Error("ambiguous queue"); };
  await check({ wake: uncertainWake });
  await check({ wake: uncertainWake });
  assert.equal(uncertain, 1, "An uncertain queue response is not replayed");
  assert(deliveryHistory.some(event => event.action === "alarm-cleared"));

  const digest = value => createHash("sha256").update(value).digest("hex");
  const prompt = path.join(temporary, "instructions.txt");
  fs.writeFileSync(prompt, "Bounded local repairs only; retain exact-head CI safeguards.");
  const config = { schema: "ephemeris-local-checker/v1", codex: "/synthetic/codex", repo,
    configFile: path.join(temporary, "config.json"), prompt, promptSha256: digest(fs.readFileSync(prompt)),
    state: temporary, runtime: repo, node: "/synthetic/node", manifest: path.join(temporary, "manifest.json") };
  fs.writeFileSync(config.manifest, JSON.stringify({ files: { "example.txt": digest(fs.readFileSync(path.join(repo, "example.txt"))) } }));
  config.manifestSha256 = digest(fs.readFileSync(config.manifest));
  validateRuntime(config);
  const calls = [];
  const fakeWorker = (binary, args, options) => { calls.push({ binary, args, options }); return { pid: 123, unref() {} }; };
  assert.equal(startInvestigation(config, { episode: "fixture", failures: ["ephemeris-outage"] }, fakeWorker), "investigation-started");
  assert(calls[0].args.includes("--investigate"));
  assert.equal(calls[0].options.detached, true);
  fs.mkdirSync(path.join(temporary, "investigator.lock"));
  assert.equal(startInvestigation(config, { episode: "fixture" }, fakeWorker), "investigator-already-active");
  assert.equal(calls.length, 1, "One investigator owns a failure at a time");
  fs.rmdirSync(path.join(temporary, "investigator.lock"));
  const command = agentArguments(repo, "/private/result.txt");
  assert(command.includes("--ephemeral"));
  assert(command.includes("--approve-for-me"));
  assert(!command.includes("--dangerously-bypass-approvals-and-sandbox"));
  assert(agentArguments(repo, "/private/result.txt", true).includes("read-only"));
  assert.deepEqual(accountEnvironment({ PATH: "fixture", OPENAI_API_KEY: "fake", CODEX_API_KEY: "fake", OPENROUTER_API_KEY: "fake" }), { PATH: "fixture" });
  fs.appendFileSync(prompt, " changed");
  assert.throws(() => validateRuntime(config), /instructions changed/u);
  fs.appendFileSync(path.join(repo, "example.txt"), "changed again");
  assert.throws(() => validateRuntime(config), /Runtime file changed/u);
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
console.log("Ephemeris watchdog passed: deterministic healthy checks make zero agent calls; outage-only queues, dispatches, recovery, locks, integrity, failures and changing candidates verified with remote actions intercepted.");
