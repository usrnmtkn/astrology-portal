const incomingToken = location.hash.slice(1);
if (incomingToken) { sessionStorage.setItem('local-transit-batch-access', incomingToken); history.replaceState(null,'',location.pathname); }
const token = sessionStorage.getItem('local-transit-batch-access') ?? '';
let state;
const el = (tag, text, parent) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; parent?.append(node); return node; };
const detail = (label, text, parent) => { const d = el('details',undefined,parent); el('summary',label,d); el('pre',text,d); };
const message = text => { document.querySelector('#message').textContent = text; };
async function hash(text) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x => x.toString(16).padStart(2,'0')).join(''); }
async function request(path, action) {
  const response = await fetch(path, { method: action ? 'POST':'GET', headers: { authorization: `Bearer ${token}`, ...(action ? {'content-type':'application/json'} : {}) }, ...(action ? {body:JSON.stringify(action)}:{}) });
  const data = await response.json(); if (!response.ok) throw Error(data.error); return data;
}
async function load() { try { const data = await request('/api/batch'); state = data.batch; render(data.preferredEvidence.length); message('Local review desk. Generation and publication are unavailable here.'); } catch(e) { message(`Unable to load: ${e.message}`); } }
async function act(type, contact, passage, extra = {}) {
  try {
    const action = { type, expectedRevision: state.revision, ...extra };
    if (passage) Object.assign(action,{ contentKey:contact.contentKey,field:passage.field,expectedTextSha256:await hash(passage.currentText) });
    const data = await request('/api/review',action); state=data.batch; render(data.preferredEvidence.length); message(type === 'request-regeneration' ? 'Regeneration requested. No provider call was made.' : 'Saved locally. Production content is unchanged.');
  } catch(e) { message(`Not saved: ${e.message}. Your text remains in the editor. Reload to inspect a newer saved revision.`); }
}
function render(evidenceCount) {
  const overview=document.querySelector('#overview'); overview.replaceChildren();
  el('p',`${state.model.model} · ${state.model.generation_config.thinking_level} thinking · ${state.model.generation_config.max_output_tokens} output tokens · one initial request per passage`,overview);
  el('p',`4 contacts / 8 passage slots · revision ${state.revision} · ${evidenceCount} newly approved preferred examples`,overview);
  const friendBlocked=state.contacts.some(c=>c.passages.some(p=>p.perspective==='friend' && p.preparationStatus.startsWith('blocked')));
  el('p',friendBlocked ? 'Friend evidence is blocked: no preferred Friend examples. Owner decision on using You references is pending.' : state.friendEvidencePolicy==='owner-authorized-you-voice' ? 'Friend uses the selected You references for voice with the third-person destination contract, as authorized by the owner.' : 'Friend uses preferred owner-reviewed third-person evidence.',overview);
  if(state.inputReview?.calibration.required) el('p',`Meaning calibration: ${state.inputReview.calibration.status}. ${state.inputReview.calibration.pending.length} meanings await exact owner review.`,overview);
  detail('Model, batch policy and provenance',JSON.stringify({model:state.model,policy:state.policy,provenance:state.provenance,preparationSha256:state.preparationSha256},null,2),overview);
  const contacts=document.querySelector('#contacts'); contacts.replaceChildren();
  for (const contact of state.contacts) {
    const section=el('section',undefined,contacts); el('h2',contact.title,section); el('p',contact.contentKey,section);
    detail('Supplied meaning and its astrology sources',JSON.stringify({meaning:contact.passages[0].input.readerMeaning,sourceBasis:contact.privateMeaningReceipt.sourceBasis,reviewStatus:contact.privateMeaningReceipt.interpretationStatus,feedback:contact.currentFeedbackReceipt},null,2),section);
    const grid=el('div',undefined,section); grid.className='passages';
    for(const passage of contact.passages) {
      const article=el('article',undefined,grid);article.className='passage'; article.dataset.field=passage.field; article.dataset.key=contact.contentKey;
      el('h3',passage.perspective === 'you' ? 'You' : 'Friend',article);
      el('p',`${passage.status} · ${passage.original ? 'generated original saved' : passage.receipts.length ? 'generation attempt saved' : passage.preparationStatus}`,article);
      if(passage.receipts.at(-1)?.failure) el('p',`Saved generation failure: ${passage.receipts.at(-1).failure}. The raw response is preserved.`,article);
      el('p',passage.validation ? (passage.validation.passed ? 'Mechanical checks passed. Meaning and writing still require owner review; no semantic or voice pass has been established.' : passage.validation.findings.map(f=>`${f.code}: ${f.detail}`).join('\n')) : 'No generated passage yet. Output validation has not run.',article);
      if(passage.validation?.ownerReview.length) el('p',passage.validation.ownerReview.join('\n'),article);
      if(passage.validation?.contextualRules) {
        el('p','Approve exact saved text also confirms your review of the contextual rules below. Machine checks do not judge writing quality.',article);
        detail('Current contextual writing rules',passage.validation.contextualRules.map(rule=>rule.instruction).join('\n\n'),article);
      }
      const label=el('label','Owner edit',article); const area=el('textarea',undefined,label);area.rows=10;area.value=passage.currentText ?? '';area.disabled=!passage.original;
      const save=el('button','Save edit',article);save.disabled=!passage.original;save.onclick=()=>act('edit',contact,passage,{text:area.value});
      const approve=el('button','Approve exact saved text',article);approve.disabled=!passage.original || !passage.validation?.passed;approve.onclick=()=>act('approve',contact,passage,{confirmExactText:true});
      area.oninput=()=>{approve.disabled=area.value !== passage.currentText || !passage.validation?.passed;};
      const canReject=Boolean(passage.original || passage.receipts.length);
      const reasonLabel=el('label','Reason for rejection or regeneration',article);const reason=el('textarea',undefined,reasonLabel);reason.rows=2;reason.disabled=!canReject;
      for(const [type,label] of [['reject','Reject'],['request-regeneration','Reject / request regeneration']]) { const button=el('button',label,article);button.disabled=!canReject;button.onclick=()=>act(type,contact,passage,{reason:reason.value}); }
      detail('Untouched generated original',passage.original?.text ?? 'Not generated.',article);
      detail('Owner edits, approval and provider receipts',JSON.stringify({edits:passage.edits,approved:passage.approved,receipts:passage.receipts},null,2),article);
      detail('Complete generation input and exact request',JSON.stringify({requestSha256:passage.requestSha256,input:passage.input,request:passage.request},null,2),article);
      detail('Preferred evidence and destination contract',JSON.stringify({evidence:passage.evidence,contract:passage.contract},null,2),article);
    }
  }
  const complete=document.querySelector('#complete');complete.disabled=!state.contacts.every(c=>c.passages.every(p=>['approved','rejected'].includes(p.status)));complete.onclick=()=>act('complete-review');
}
document.querySelector('#reload').onclick=load;
load();
