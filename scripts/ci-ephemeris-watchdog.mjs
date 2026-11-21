import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repository = "usrnmtkn/astrology-portal";
export const workflow = "calculation-service-availability.yml";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const minute = 60_000;
const schema = "ephemeris-watchdog/v1";

function time(value) {
  const result = Date.parse(value);
  assert(Number.isFinite(result), "Invalid observation time");
  return result;
}

export function assess({ runs, health, mainHead }, now = Date.now()) {
  assert(/^[a-f0-9]{40}$/u.test(mainHead), "Missing exact main revision");
  assert(health?.schema === "ephemeris-monitor/v1" && typeof health.ok === "boolean", "Invalid health observation");
  assert(now - time(health.checkedAt) <= 2 * minute && time(health.checkedAt) <= now + 5_000, "Stale health observation");
  assert(Array.isArray(runs), "Missing workflow observations");
  const relevant = runs.filter(run => run.head_branch === "main" && ["schedule", "workflow_dispatch"].includes(run.event))
    .sort((a, b) => time(b.created_at) - time(a.created_at));
  for (const run of relevant) {
    assert(time(run.created_at) <= now + minute && time(run.updated_at) <= now + minute, "Future workflow observation");
  }
  const latest = relevant[0];
  const completed = relevant.find(run => run.status === "completed");
  const scheduled = relevant.find(run => run.event === "schedule");
  const active = relevant.find(run => run.status !== "completed");
  const overdue = !completed || now - time(completed.updated_at) > 30 * minute;
  const nativeScheduleOverdue = !scheduled || now - time(scheduled.created_at) > 30 * minute;
  const kinds = [];
  if (!health.ok) kinds.push("ephemeris-outage");
  if (nativeScheduleOverdue) kinds.push("native-schedule-overdue");
  if (overdue) kinds.push("monitor-overdue");
  if (active && now - time(active.created_at) > 20 * minute) kinds.push("monitor-stalled");
  if (completed && completed.conclusion !== "success" && (!health.ok || overdue)) kinds.push("monitor-failed");
  return { mainHead, healthOk: health.ok, kinds, overdue, active: Boolean(active),
    nativeScheduleOverdue,
    latestRun: latest ? { id: latest.id, head: latest.head_sha, status: latest.status, conclusion: latest.conclusion,
      createdAt: latest.created_at, updatedAt: latest.updated_at } : null };
}

function save(directory, state) {
  const temporary = path.join(directory, "state.next.json");
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(temporary, path.join(directory, "state.json"));
}

export async function withState(directory, action) {
  directory = path.resolve(directory);
  assert(directory !== root && !directory.startsWith(root + path.sep), "State must be outside the worktree");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  directory = fs.realpathSync(directory);
  const realRoot = fs.realpathSync(root);
  assert(directory !== realRoot && !directory.startsWith(realRoot + path.sep), "State must be outside the worktree");
  const lock = path.join(directory, "lock");
  try { fs.mkdirSync(lock, { mode: 0o700 }); } catch (error) {
    if (error.code === "EEXIST") throw new Error("Watchdog already running; retain the lock and inspect its owner before recovery");
    throw error;
  }
  try {
    fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { mode: 0o600 });
    const statePath = path.join(directory, "state.json");
    const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : { schema, sequence: 0 };
    assert.equal(state.schema, schema);
    const historyPath = path.join(directory, "attempts.jsonl");
    const last = fs.existsSync(historyPath) ? fs.readFileSync(historyPath, "utf8").trim().split("\n").at(-1) : null;
    assert.equal(last ? JSON.parse(last).sequence : 0, state.sequence, "Checkpoint/history mismatch requires operator recovery");
    const persist = (event) => {
      state.sequence += 1;
      save(directory, state);
      fs.appendFileSync(path.join(directory, "attempts.jsonl"), JSON.stringify({ sequence: state.sequence,
        at: new Date().toISOString(), ...event }) + "\n", { mode: 0o600 });
    };
    return await action(state, persist, directory);
  } finally { fs.rmSync(lock, { recursive: true }); }
}

export async function observe(state, persist, { collect, dispatch, repairSchedule = false, now }) {
  let observation;
  try {
    const input = await collect();
    now ??= Date.now();
    observation = assess(input, now);
  } catch {
    now ??= Date.now();
    observation = { kinds: ["observation-unavailable"], healthOk: null, overdue: null, active: null };
  }
  state.observation = { ...observation, checkedAt: new Date(now).toISOString() };
  if (observation.kinds.length) {
    if (!state.incident || state.incident.phase === "recovered") {
      state.incident = { id: randomUUID(), phase: "pending", openedAt: new Date(now).toISOString(),
        baseHead: observation.mainHead ?? null, kinds: observation.kinds, currentKinds: [], attempts: 0 };
      persist({ action: "incident-opened", id: state.incident.id, kinds: observation.kinds });
    }
    const escalated = observation.kinds.some(kind => ["ephemeris-outage", "observation-unavailable"].includes(kind) &&
      !state.incident.currentKinds.includes(kind));
    if (escalated && ["tested", "blocked", "monitoring"].includes(state.incident.phase)) {
      state.incident.phase = "pending";
      persist({ action: "incident-escalated", id: state.incident.id, kinds: observation.kinds });
    }
    state.incident.currentKinds = observation.kinds;
    state.incident.kinds = [...new Set([...state.incident.kinds, ...observation.kinds])];
  } else if (state.incident && state.incident.phase !== "recovered") {
    state.incident.phase = "recovered";
    state.incident.recoveredAt = new Date(now).toISOString();
    persist({ action: "incident-recovered", id: state.incident.id });
  }
  // Intent is durable before dispatch: an interrupted/unknown request is not replayed immediately.
  const dispatchDue = (observation.overdue || observation.healthOk === false) && !observation.active &&
    (!state.lastDispatch || now - time(state.lastDispatch.at) >= 30 * minute);
  if (repairSchedule && dispatchDue) {
    state.lastDispatch = { at: new Date(now).toISOString(), status: "intent", mainHead: observation.mainHead };
    persist({ action: "dispatch-intent", mainHead: observation.mainHead });
    try {
      await dispatch(observation.mainHead);
      state.lastDispatch.status = "accepted";
    } catch { state.lastDispatch.status = "unknown-or-failed"; }
    persist({ action: "dispatch-result", status: state.lastDispatch.status });
  }
  persist({ action: "observation", kinds: observation.kinds, healthOk: observation.healthOk });
  return { observation: state.observation, incident: state.incident ?? null, dispatch: state.lastDispatch ?? null };
}

function gh(args) {
  return execFileSync("gh", args, { cwd: root, encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] });
}

function git(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function candidateFingerprint(repo) {
  assert.equal(git(repo, ["remote", "get-url", "origin"]), `https://github.com/${repository}.git`, "Unexpected repository");
  const head = git(repo, ["rev-parse", "HEAD"]);
  const tree = git(repo, ["rev-parse", "HEAD^{tree}"]);
  const status = git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const digest = createHash("sha256").update(head).update(tree).update(status)
    .update(execFileSync("git", ["diff", "HEAD", "--binary", "--no-ext-diff"], { cwd: repo }));
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { cwd: repo, encoding: "utf8" }).split("\0").filter(Boolean).sort();
  for (const file of untracked) {
    const target = path.join(repo, file);
    assert(!fs.lstatSync(target).isSymbolicLink(), "Untracked symlinks cannot be frozen");
    digest.update(file).update(fs.readFileSync(target));
  }
  return { head, tree, clean: !status, fingerprint: digest.digest("hex") };
}

export const repairTests = [
  ["scripts/test-calculation-service-monitor.mjs"],
  ["scripts/test-ephemeris-incident.mjs"],
  ["scripts/test-production-api-health.mjs"],
  ["--import", "tsx", "scripts/test-ephemeris-health.mts"],
  ["--import", "tsx", "scripts/test-ephemeris-worker-health.mts"]
];

export async function verifyRepair(state, persist, repo, runTest) {
  assert.equal(state.incident?.phase, "investigating", "Claim the current incident before testing a repair");
  const frozen = candidateFingerprint(repo);
  const attempt = { action: "repair-verification", id: state.incident.id, candidate: frozen, tests: [], status: "running" };
  persist(attempt);
  try {
    for (const args of repairTests) {
      assert.deepEqual(candidateFingerprint(repo), frozen, "Candidate changed during verification");
      const test = { command: ["node", ...args], status: "running" };
      attempt.tests.push(test);
      persist(attempt);
      try { await runTest(args); } catch (error) { test.status = "failed"; throw error; }
      assert.deepEqual(candidateFingerprint(repo), frozen, "Candidate changed during verification");
      test.status = "passed";
      persist(attempt);
    }
    attempt.status = "passed";
    state.incident.phase = "tested";
    state.incident.candidate = frozen;
  } catch (error) {
    attempt.status = "failed";
    state.incident.phase = "blocked";
    throw error;
  } finally { persist(attempt); }
  return { candidate: frozen, phase: state.incident.phase, releaseReady: false,
    requiredExactHeadGates: ["content-studio-api", "browser-release-gate", "project-privacy"] };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  assert(["observe", "claim", "checkpoint", "verify"].includes(command), "Use observe, claim, checkpoint or verify with --state DIRECTORY");
  const options = {};
  for (let i = 0; i < args.length; i++) {
    assert(["--state", "--id", "--repo", "--phase", "--repair-schedule"].includes(args[i]), "Unknown argument");
    if (args[i] === "--repair-schedule") options.repairSchedule = true;
    else { assert(args[i + 1] && !args[i + 1].startsWith("--"), "Missing argument value"); options[args[i].slice(2)] = args[++i]; }
  }
  assert(options.state, "An explicit private state directory is required");
  const result = await withState(options.state, async (state, persist, directory) => {
    if (command === "observe") return observe(state, persist, {
      repairSchedule: options.repairSchedule,
      collect: async () => {
        const mainHead = JSON.parse(gh(["api", `repos/${repository}/git/ref/heads/main`])).object.sha;
        const runs = JSON.parse(gh(["api", `repos/${repository}/actions/workflows/${workflow}/runs?per_page=30`])).workflow_runs;
        const reportPath = path.join(directory, "health.json");
        fs.rmSync(reportPath, { force: true });
        try {
          execFileSync(process.execPath, [path.join(root, "scripts/monitor-calculation-service.mjs")], {
            cwd: root, timeout: 70_000, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env,
              PRODUCTION_BASE_URL: "https://tldrastro.vercel.app", CALCULATION_MONITOR_ATTEMPTS: "3",
              CALCULATION_MONITOR_DELAY_MS: "10000", CALCULATION_MONITOR_TIMEOUT_MS: "10000",
              CALCULATION_MONITOR_REPORT_PATH: reportPath, CALCULATION_MONITOR_SUMMARY_PATH: path.join(directory, "health.md") }
          });
        } catch { /* A failed health probe is evidence; a missing report is unknown. */ }
        return { mainHead, runs, health: JSON.parse(fs.readFileSync(reportPath, "utf8")) };
      },
      dispatch: async (expectedHead) => {
        assert.equal(JSON.parse(gh(["api", `repos/${repository}/git/ref/heads/main`])).object.sha, expectedHead, "Main advanced before dispatch");
        gh(["workflow", "run", workflow, "--repo", repository, "--ref", "main"]);
      }
    });
    assert(options.id && state.incident?.id === options.id, "Incident identity changed");
    if (command === "claim") {
      assert.equal(state.incident.phase, "pending", "Incident already claimed; resume its recorded attempt");
      state.incident.phase = "investigating";
      state.incident.attempts += 1;
      persist({ action: "investigation-claimed", id: options.id, attempt: state.incident.attempts });
      return state.incident;
    }
    if (command === "checkpoint") {
      assert.equal(state.incident.phase, "investigating", "Only the current investigator can checkpoint");
      assert(["blocked", "monitoring"].includes(options.phase), "Use blocked for operator action or monitoring for a mitigated scheduler gap");
      state.incident.phase = options.phase;
      persist({ action: "investigation-checkpoint", id: options.id, phase: options.phase });
      return state.incident;
    }
    assert(options.repo, "An isolated repair worktree is required");
    return verifyRepair(state, persist, path.resolve(options.repo), async (testArgs) => {
      const log = path.join(directory, `repair-${state.sequence}.log`);
      const fd = fs.openSync(log, "wx", 0o600);
      try { execFileSync(process.execPath, testArgs, { cwd: options.repo, timeout: 180_000, stdio: ["ignore", fd, fd] }); }
      finally { fs.closeSync(fd); }
    });
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Ephemeris watchdog stopped: ${error.message}`); process.exitCode = 1; });
}
