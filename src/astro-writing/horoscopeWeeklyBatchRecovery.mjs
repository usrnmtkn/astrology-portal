const canonical=value=>JSON.stringify(stable(value));
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;

// Reconcile only the operation this approved Weekly batch just sent. Changes to
// instructions, model, facts, another passage or rejection history revoke consent.
// An unconfirmed POST is never sent again merely because storage is unchanged.
export function horoscopeWeeklyBatchRecovery(previous,current,{action,sign,planHash}) {
  if(previous?.id!==current?.id||current?.status!=='DRAFT'
    ||current?.sections?.horoscopeEdition?.window?.period!=='weekly')return false;
  const before=previous.source_snapshot?.horoscopeGeneration??{};
  const after=current.source_snapshot?.horoscopeGeneration??{};
  const old=before.active,next=after.active;
  let completed=false;
  if(next){
    if(next.sign!==sign||next.planHash!==planHash)return false;
    if(old){
      if(next.id===old.id){
        if(action==='continue'&&next.state==='ready')return false;
        const fixed=operation=>{
          const copy=structuredClone(operation);
          for(const key of ['state','responseId','requestHash','startedAt','providerResult','startupDiagnostic'])delete copy[key];
          return copy;
        };
        if(canonical(fixed(old))!==canonical(fixed(next))
          ||old.responseId&&old.responseId!==next.responseId
          ||old.requestHash&&old.requestHash!==next.requestHash)return false;
      }else{
        const writer=structuredClone(next.writerOperation),original=structuredClone(old);
        // The provider may checkpoint between a lost browser response and the
        // recovery read. Its payload is tied to the same saved response ID.
        if(writer?.providerResult&&writer.providerResult.id!==old.responseId)return false;
        if(writer)delete writer.providerResult;delete original.providerResult;
        if(next.phase!=='review'||next.receipt?.operationId!==old.id
          ||canonical(writer)!==canonical(original))return false;
      }
    }else if(action!=='generate')return false;
  }else{
    // Only an exact saved review candidate can advance to another sign after a
    // lost acknowledgement. A failure, release or unknown outcome needs recovery.
    const receipt=after.readings?.[sign],passage=current.sections.horoscopeEdition.passages.find(p=>p.sign===sign);
    completed=old?.phase==='review'&&Boolean(receipt?.rhetoricalReview?.responseId)
      &&receipt?.operationId===old.receipt?.operationId
      &&(!old.responseId||receipt.rhetoricalReview.responseId===old.responseId)
      &&receipt.rhetoricalReview.candidateHash===old.candidateHash
      &&receipt.rhetoricalReview.evidenceHash===old.evidenceHash
      &&passage?.headline===old.candidate?.headline&&passage?.body===old.candidate?.body;
    if(!completed)return false;
  }
  const normalize=row=>{
    const copy=structuredClone(row),generation=copy.source_snapshot.horoscopeGeneration??{};
    delete copy.updated_at;delete generation.active;
    // Starting a retry archives the previous failure once and clears lastError.
    if(action==='generate'){
      const legacy=before.lastError;
      if(legacy&&generation.failures?.at(-1)?.operation?.id===legacy.operation?.id
        &&!(before.failures??[]).some(f=>f.operation?.id===legacy.operation?.id))generation.failures.pop();
      if(generation.lastError==null||canonical(generation.lastError)===canonical(legacy))delete generation.lastError;
    }
    if(!generation.failures?.length)delete generation.failures;
    if(completed){
      delete copy.body;
      copy.sections.horoscopeEdition.passages=copy.sections.horoscopeEdition.passages.filter(p=>p.sign!==sign);
      if(generation.readings){delete generation.readings[sign];if(!Object.keys(generation.readings).length)delete generation.readings;}
    }
    if(generation.lastError==null)delete generation.lastError;
    copy.source_snapshot.horoscopeGeneration=generation;
    return copy;
  };
  return canonical(normalize(previous))===canonical(normalize(current));
}
