import assert from 'node:assert/strict';
import { transitReportProseIntegrityIssue } from '../api/_lib/transit-report-prose-integrity.ts';
assert.match(transitReportProseIntegrityIssue('The advantage is practical: pleasure making one option easier to justify is easier to direct toward something useful.')!,/owner-rejected/);
const repeated='You benefit from saying the important part clearly and leaving enough space for the other person to respond to that exact point.';
assert.match(transitReportProseIntegrityIssue(`${repeated}\n\nA separate transit.\n\n${repeated}`)!,/repeats a complete sentence/);
assert.equal(transitReportProseIntegrityIssue('One conversation concerns a deadline. A later conversation concerns how the work is shared.'),null);
console.log('Rejected fragment and repeated-advice regressions passed.');
