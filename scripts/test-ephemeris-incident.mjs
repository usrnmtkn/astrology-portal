import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/calculation-service-availability.yml", import.meta.url), "utf8");
const source = workflow.split("          script: |\n")[1].split("\n").map(line => line.replace(/^ {12}/u, "")).join("\n");
const execute = new (Object.getPrototypeOf(async () => {}).constructor)("github", "context", "require", "process", source);
assert.match(workflow, /7,22,37,52 \* \* \* \*/u);
assert.match(workflow, /always\(\) && github.ref == 'refs\/heads\/main'/u);
assert.match(workflow, /CALCULATION_MONITOR_REPORT_PATH/u);
let incident;
const writes = [];
const github = {
  paginate: async () => incident ? [incident] : [],
  rest: { issues: {
    listForRepo() {},
    async create(input) { writes.push(["create", input]); incident = { number: 7, state: "open", ...input }; return { data: incident }; },
    async update(input) { writes.push(["update", input]); incident = { ...incident, ...input }; },
    async createComment(input) { writes.push(["comment", input]); }
  } }
};
const context = { serverUrl: "https://github.com", repo: { owner: "fixture-owner", repo: "fixture-repo" }, runId: 1 };
const require = () => ({ existsSync: () => false });
async function run(passed) {
  writes.length = 0;
  await execute(github, context, require, { env: { AVAILABILITY_OUTCOME: passed ? "success" : "failure", ALERT_LOGINS: "fixture-owner" } });
  return writes.map(([action]) => action);
}
assert.deepEqual(await run(true), [], "Healthy startup must not create an incident");
assert.deepEqual(await run(false), ["create", "update"], "First outage creates one notification without a duplicate comment");
assert.equal(incident.state, "open");
assert.deepEqual(await run(false), [], "A sustained outage must stay quiet");
assert.deepEqual(await run(true), ["update", "comment"], "Recovery closes the incident and records one transition");
assert.equal(incident.state, "closed");
assert.deepEqual(await run(true), [], "Stable recovery must stay quiet");
assert.deepEqual(await run(false), ["update", "comment"], "A later outage reopens the same incident");
assert.equal(incident.number, 7);
console.log("Ephemeris incident workflow passed: outage, deduplication, recovery, and reopen; all GitHub writes intercepted.");
