import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Job-level evaluation happens before a runner, checkout or npm installation.
export const releaseAdmissionCondition = "(github.ref_type == 'branch' && github.ref == 'refs/heads/main') || (github.event_name == 'pull_request' && vars.RELEASE_ACTIVE_PR != '' && format('{0}', github.event.pull_request.number) == vars.RELEASE_ACTIVE_PR)";

export function releaseAdmitted({eventName, ref, refType, prNumber, activePr}) {
  if(refType === 'branch' && ref === 'refs/heads/main') return true;
  return eventName === 'pull_request' && Boolean(activePr) && String(prNumber) === activePr;
}

export function requireReleaseAdmission(context) {
  if(!releaseAdmitted(context)) {
    throw new Error('RELEASE_HELD: this candidate is waiting for the coordinator’s release slot; required checks remain blocked.');
  }
}

if(import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  requireReleaseAdmission({
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    refType: process.env.GITHUB_REF_TYPE,
    prNumber: event.number,
    activePr: process.env.RELEASE_ACTIVE_PR,
  });
  console.log('PASS release admission');
}
