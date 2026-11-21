import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = value => createHash("sha256").update(value).digest("hex");

export function actionableFailures(result) {
  if (!result?.observation) return ["checker-failure"];
  const { observation, dispatch } = result;
  const failures = [];
  if (observation.healthOk === false) failures.push("ephemeris-outage");
  if (observation.healthOk === null) failures.push("observation-unavailable");
  if (observation.kinds.includes("monitor-stalled")) failures.push("monitor-stalled");
  if (observation.overdue && !observation.active && dispatch?.status === "unknown-or-failed") failures.push("monitor-dispatch-failed");
  return failures;
}

export async function tick(delivery, persist, { observe, wake, now = () => new Date().toISOString() }) {
  let result;
  try { result = await observe(); } catch { result = null; }
  const failures = actionableFailures(result);
  if (!failures.length) {
    if (delivery.episode) { delivery.episode = null; persist({ action: "alarm-cleared" }); }
    delivery.checkedAt = now();
    return { healthOk: result.observation.healthOk, wakeRequested: false, failures };
  }
  delivery.episode ??= { id: randomUUID(), notifiedKinds: [], openedAt: now() };
  const episode = delivery.episode;
  const added = failures.filter(kind => !episode.notifiedKinds.includes(kind));
  delivery.checkedAt = now();
  if (!added.length) return { wakeRequested: false, failures, episode: episode.id };
  episode.notifiedKinds.push(...added);
  episode.lastAttempt = { at: now(), status: "intent" };
  persist({ action: "wake-intent", episode: episode.id, failures: added });
  try {
    episode.lastAttempt.status = await wake({ episode: episode.id, failures,
      incidentId: result?.incident?.id ?? null, mainHead: result?.observation?.mainHead ?? null });
  } catch { episode.lastAttempt.status = "unknown-or-failed"; }
  persist({ action: "wake-result", episode: episode.id, status: episode.lastAttempt.status });
  return { wakeRequested: true, failures, episode: episode.id, deliveryStatus: episode.lastAttempt.status };
}

export function validateRuntime(config) {
  assert.equal(config.schema, "ephemeris-local-checker/v1");
  for (const field of ["runtime", "manifest", "state", "node", "codex", "repo", "prompt"]) {
    assert(typeof config[field] === "string" && path.isAbsolute(config[field]), `An absolute ${field} path is required`);
  }
  const manifest = fs.readFileSync(config.manifest);
  assert.equal(sha256(manifest), config.manifestSha256, "Runtime manifest changed");
  const runtime = fs.realpathSync(config.runtime);
  for (const [name, digest] of Object.entries(JSON.parse(manifest).files)) {
    const file = fs.realpathSync(path.resolve(runtime, name));
    assert(file.startsWith(runtime + path.sep), "Runtime path escaped its snapshot");
    assert.equal(sha256(fs.readFileSync(file)), digest, `Runtime file changed: ${name}`);
  }
  assert.equal(sha256(fs.readFileSync(config.prompt)), config.promptSha256, "Investigation instructions changed");
}

export function agentArguments(repo, output, selfTest = false) {
  return ["-c", 'model_provider="openai"', "exec", "--ephemeral", "--json", "--cd", repo,
    ...(selfTest ? ["--sandbox", "read-only"] : ["--approve-for-me"]),
    "--output-last-message", output, "-"];
}

export function accountEnvironment(environment = process.env) {
  const safe = { ...environment };
  for (const name of ["OPENAI_API_KEY", "CODEX_API_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY"]) delete safe[name];
  return safe;
}

async function investigate(config, event, selfTest = false) {
  const lock = path.join(config.state, "investigator.lock");
  try { fs.mkdirSync(lock, { mode: 0o700 }); } catch (error) {
    if (error.code === "EEXIST") return;
    throw error;
  }
  const output = path.join(config.state, "investigations", event.episode);
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  const result = { status: "starting", episode: event.episode, startedAt: new Date().toISOString(), selfTest };
  try {
    fs.writeFileSync(path.join(lock, "owner.json"), JSON.stringify({ pid: process.pid, ...result }), { mode: 0o600 });
    validateRuntime(config);
    const environment = accountEnvironment();
    const auth = spawnSync(config.codex, ["login", "status"], { env: environment, encoding: "utf8", timeout: 15_000 });
    assert(auth.status === 0 && /Logged in using ChatGPT/u.test(`${auth.stdout}\n${auth.stderr}`), "ChatGPT account login is required; API-key execution is disabled");
    let repo = config.repo;
    if (!selfTest) {
      const git = args => execFileSync("git", args, { cwd: config.repo, encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"] }).trim();
      assert.equal(git(["remote", "get-url", "origin"]), "https://github.com/usrnmtkn/astrology-portal.git");
      git(["fetch", "--no-prune", "--no-tags", "origin", "refs/heads/main:refs/remotes/origin/main"]);
      result.baseHead = git(["rev-parse", "origin/main"]);
      repo = path.join(output, "worktree");
      git(["worktree", "add", "--detach", repo, result.baseHead]);
      result.worktree = repo;
    }
    const prompt = selfTest ? "Transport self-test only. Reply exactly EPHEMERIS_WORKER_OK. Do not use tools, modify files, make provider calls, investigate an outage or release anything."
      : `${fs.readFileSync(config.prompt, "utf8")}\n\nFailure receipt: ${JSON.stringify(event)}\nIsolated worktree: ${repo}\nPrivate evidence: ${output}`;
    const fd = fs.openSync(path.join(output, "execution.jsonl"), "wx", 0o600);
    try {
      execFileSync(config.codex, agentArguments(repo, path.join(output, "result.txt"), selfTest), {
        input: prompt, cwd: repo, env: environment, timeout: selfTest ? 120_000 : 900_000, stdio: ["pipe", fd, fd]
      });
      result.status = "completed";
    } finally { fs.closeSync(fd); }
  } catch (error) {
    result.status = "failed";
    result.error = error.message;
  } finally {
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(output, "status.json"), JSON.stringify(result, null, 2) + "\n", { mode: 0o600 });
    fs.rmSync(lock, { recursive: true });
    if (!selfTest) spawnSync("/usr/bin/osascript", ["-e", 'display notification "Ephemeris investigation finished. Review the saved local findings before any release." with title "Ephemeris monitor"'], { timeout: 10_000 });
  }
  console.log(JSON.stringify(result));
}

export function startInvestigation(config, event, spawnWorker = spawn) {
  if (fs.existsSync(path.join(config.state, "investigator.lock"))) return "investigator-already-active";
  const eventPath = path.join(config.state, `failure-${event.episode}.json`);
  fs.writeFileSync(eventPath, JSON.stringify(event, null, 2), { mode: 0o600 });
  const child = spawnWorker(config.node, [fileURLToPath(import.meta.url), "--investigate", config.configFile, eventPath],
    { detached: true, stdio: "ignore", env: accountEnvironment() });
  assert(child.pid, "Could not start the bounded investigation process");
  child.unref();
  return "investigation-started";
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  assert(["--config", "--investigate", "--self-test"].includes(mode), "Use --config FILE, --investigate FILE RECEIPT, or --self-test FILE");
  const config = { ...JSON.parse(fs.readFileSync(args[1], "utf8")), configFile: path.resolve(args[1]) };
  fs.mkdirSync(config.state, { recursive: true, mode: 0o700 });
  if (mode !== "--config") {
    const event = mode === "--self-test" ? { episode: `self-test-${randomUUID()}` } : JSON.parse(fs.readFileSync(args[2], "utf8"));
    return investigate(config, event, mode === "--self-test");
  }
  const lock = path.join(config.state, "tick.lock");
  try { fs.mkdirSync(lock, { mode: 0o700 }); } catch (error) {
    if (error.code === "EEXIST") return;
    throw error;
  }
  try {
    const stateFile = path.join(config.state, "delivery.json");
    const delivery = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : { schema: "ephemeris-delivery/v1" };
    assert.equal(delivery.schema, "ephemeris-delivery/v1");
    const save = () => {
      const temporary = path.join(config.state, "delivery.next.json");
      fs.writeFileSync(temporary, JSON.stringify(delivery, null, 2) + "\n", { mode: 0o600 });
      fs.renameSync(temporary, stateFile);
    };
    const result = await tick(delivery, event => {
      save();
      fs.appendFileSync(path.join(config.state, "delivery-attempts.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...event }) + "\n", { mode: 0o600 });
    }, {
      observe: async () => {
        validateRuntime(config);
        return JSON.parse(execFileSync(config.node, [path.join(config.runtime, "scripts/ci-ephemeris-watchdog.mjs"),
          "observe", "--state", config.state, "--repair-schedule"], {
          timeout: 180_000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
        }));
      },
      wake: async event => startInvestigation(config, event)
    });
    save();
    console.log(JSON.stringify({ ...result, checkedAt: delivery.checkedAt }));
  } finally { fs.rmSync(lock, { recursive: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Deterministic ephemeris checker stopped: ${error.message}`); process.exitCode = 1; });
}
