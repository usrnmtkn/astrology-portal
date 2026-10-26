import assert from "node:assert/strict";
import { recoverContentStudioCopy } from "../apps/admin/src/contentStudioCopyRecovery.ts";
const baseline = { body_you: "You baseline", body_they: "Friend baseline", approval: { hash: "old" } };
const edited = { ...baseline, body_you: "Exact owner You revision" };
assert.deepEqual(recoverContentStudioCopy(baseline, edited, { ...baseline, approval: { hash: "new" } }), { ...edited, approval: { hash: "new" } });
assert.deepEqual(recoverContentStudioCopy(baseline, edited, { ...baseline, body_they: "Independent Friend edit" }), { ...edited, body_they: "Independent Friend edit" });
assert.deepEqual(recoverContentStudioCopy(baseline, edited, edited), edited, "A committed but timed-out save can be recovered.");
assert.throws(() => recoverContentStudioCopy(baseline, edited, { ...baseline, body_you: "Competing You revision" }), /body_you/);
assert.equal(baseline.body_you, "You baseline");
assert.deepEqual(recoverContentStudioCopy({ section: { body: "Old", title: "Old title" }, note: "Remove" },
  { section: { body: "", title: "Old title" } }, { section: { body: "Old", title: "New title" }, note: "Remove", approved: true }),
  { section: { body: "", title: "New title" }, approved: true }, "Nested disjoint edits, explicit clearing and deletion retain remote metadata.");
assert.throws(() => recoverContentStudioCopy({ section: { body: "Old" } }, { section: { body: "Local" } },
  { section: { body: "Remote" } }), /section.body/, "Nested competing prose must still refuse recovery.");
console.log("PASS: metadata refresh, disjoint edits, committed timeout, and same-field conflict protection");
