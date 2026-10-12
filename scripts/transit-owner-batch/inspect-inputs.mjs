import { writeFileSync } from 'node:fs';
import semantics from '../../src/astro-writing/transitNatalSemantics.cjs';
import { identity } from '../../src/astro-writing/ownerTransitBatch.mjs';
import { loadInputPlan, loadCurrentFeedback, readerMeaningBasis } from '../../src/astro-writing/personalTransitInputControls.mjs';

const [planPath,outputPath]=process.argv.slice(2);
if(!planPath||!outputPath)throw Error('Usage: node inspect-inputs.mjs /private/input-plan.json /private/source-inspection.json');
const plan=loadInputPlan(planPath),feedback=loadCurrentFeedback(plan.feedbackFile);
const contentKeys=plan.calibration?.contentKeys ?? plan.selectedContacts;
const records=contentKeys.map(contentKey=>({contentKey,sourceBasis:readerMeaningBasis(semantics.resolveTransitNatalSemantics(identity(contentKey))),
  readerMeaning:null,interpretationStatus:'not-written',ownerApproved:false,
  corrections:feedback.corrections.filter(c=>!c.contentKeys.length||c.contentKeys.includes(contentKey)),
  rejectedPassages:feedback.rejections.filter(r=>r.contentKey===contentKey).map(r=>({sha256:r.sha256,source:r.source,reason:r.reason}))}));
writeFileSync(outputPath,JSON.stringify({scope:'Private source inspection only; no meanings inferred or drafts generated',inputPlanSha256:plan.sha256,feedbackSha256:feedback.sha256,selectedForNextFourContactTest:plan.selectedContacts,records,providerCalls:0},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({records:records.length,readerMeaningsCreated:0,providerCalls:0,outputPath}));
