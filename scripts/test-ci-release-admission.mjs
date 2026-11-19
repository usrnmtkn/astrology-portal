import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {releaseAdmissionCondition, releaseAdmitted, requireReleaseAdmission} from './ci-release-admission.mjs';

const context = {
  eventName:'pull_request', ref:'refs/pull/42/merge', refType:'branch',
  prNumber:42, activePr:'42',
};
const cases = [
  [context, true],
  [{...context, activePr:''}, false],
  [{...context, activePr:'43'}, false],
  [{...context, prNumber:43, headRef:'Feature/First'}, false],
  [{...context, eventName:'push', ref:'refs/heads/feature/first'}, false],
  [{...context, eventName:'push', ref:'refs/heads/main', activePr:''}, true],
  [{...context, eventName:'workflow_dispatch', ref:'refs/heads/main', activePr:''}, true],
  [{...context, eventName:'workflow_dispatch', ref:'refs/heads/feature/first'}, false],
  [{...context, eventName:'workflow_dispatch', ref:'refs/tags/feature/first',refType:'tag'}, false],
  [{...context, eventName:'workflow_dispatch', ref:'refs/tags/main',refType:'tag'}, false],
];
// GitHub string equality is case-insensitive; do not model it with JS equality.
const atom="(?:String\\([^)]*\\)|[A-Za-z][A-Za-z0-9_.]*|'[^']*')";
const expression=releaseAdmissionCondition.replace("format('{0}', github.event.pull_request.number)", 'String(github.event.pull_request.number)').replace(new RegExp(`(${atom})\\s*([!=]=)\\s*(${atom})`,'gu'),(_,left,operator,right)=>`${operator==='!='?'!':''}equal(${left},${right})`);
const equal=(left,right)=>typeof left==='string'&&typeof right==='string'?left.toLowerCase()===right.toLowerCase():left===right;
for(const [input, expected] of cases) {
  assert.equal(releaseAdmitted(input), expected);
  const github={ref:input.ref,ref_type:input.refType,event_name:input.eventName,event:{pull_request:{number:input.prNumber}}};
  const evaluate=new Function('github','vars','equal',`return ${expression};`);
  assert.equal(evaluate(github,{RELEASE_ACTIVE_PR:input.activePr},equal),expected,'pre-runner condition must agree with required-gate admission');
  if(expected) assert.doesNotThrow(()=>requireReleaseAdmission(input));
  else assert.throws(()=>requireReleaseAdmission(input),/RELEASE_HELD/u);
}

const workflows=JSON.parse(execFileSync('ruby',['-ryaml','-rjson','-rdate','-e',"puts JSON.generate(Dir['.github/workflows/*.yml'].to_h { |f| [f, YAML.safe_load(File.read(f), permitted_classes:[Date,Time], aliases:true)] })"],{encoding:'utf8'}));
const aggregateNames=new Set(['content-studio-api','browser-release-gate','project-privacy']);
let protectedRoots=0;
for(const [file,workflow] of Object.entries(workflows)) {
  const triggers=workflow.on ?? workflow.true;
  if(triggers && Object.hasOwn(triggers,'push') && !Object.hasOwn(triggers,'pull_request')) {
    assert.deepEqual(triggers.push?.branches,['main'],`${file}: automatic feature pushes must use PR admission instead of bypassing the queue`);
  }
  if(!triggers || !Object.hasOwn(triggers,'pull_request')) continue;
  for(const [name,job] of Object.entries(workflow.jobs)) {
    if(aggregateNames.has(name)) {
      assert(!String(job.if ?? '').includes('RELEASE_ACTIVE_PR'),`${file}: required gate must not skip admission`);
      assert(job.steps.some(step=>step.run==='node scripts/ci-release-admission.mjs' && step.env?.RELEASE_ACTIVE_PR==='${{ vars.RELEASE_ACTIVE_PR }}'),`${file}: required gate must fail closed for held candidates`);
      continue;
    }
    if(job.needs) continue;
    assert(String(job.if).includes(releaseAdmissionCondition),`${file}/${name}: heavy root job is missing pre-runner admission`);
    protectedRoots++;
  }
  assert.equal(workflow.concurrency?.['cancel-in-progress'],true,`${file}: newer revisions must cancel unfinished superseded checks`);
  assert(String(workflow.concurrency?.group).includes('github.event.pull_request.number'),`${file}: cancellation must be scoped to one PR`);
  assert(String(workflow.concurrency?.group).includes('github.event_name'),`${file}: dispatch must not cancel push checks`);
}
const archive=workflows['.github/workflows/personal-transit-writer-verify.yml'];
assert(Object.hasOwn(archive.on ?? archive.true,'workflow_dispatch'),'Legacy source snapshots remain available on explicit dispatch');
assert.equal(archive.jobs['source-snapshot'].if,"${{ github.ref_type == 'branch' && github.ref == 'refs/heads/feat/personal-transit-ai-writer-20260917' }}",'Manual archival must preserve its original branch scope');
for(const [file,name] of [['.github/workflows/content-studio-api.yml','content-studio-api'],['.github/workflows/visual-smoke.yml','browser-release-gate']]) {
  assert.equal(workflows[file].jobs[name].if,'${{ !cancelled() }}','required aggregate must inspect skipped or failed dependencies');
}
assert(protectedRoots>=18,'expected the complete PR workflow catalog');
console.log(`PASS ${cases.length} admission scenarios and ${protectedRoots} pre-runner workflow roots`);
