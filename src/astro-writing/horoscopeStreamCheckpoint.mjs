// A server-side stream checkpoint advances the row version independently of
// browser polling. Only this exact change may continue the approved batch.
export function horoscopeStreamCheckpointOnly(previous, current) {
  const before=previous?.source_snapshot?.horoscopeGeneration?.active;
  const after=current?.source_snapshot?.horoscopeGeneration?.active;
  if(!before?.responseId||before.providerResult||!after?.providerResult
    ||after.providerResult.id!==before.responseId||previous.updated_at===current.updated_at)return false;
  if(before.config?.provider!=='anthropic'&&!(before.config?.provider==='gemini'&&before.config.transport==='checkpointed-stream/v1'))return false;
  const normalize=row=>{
    const copy=structuredClone(row);delete copy.updated_at;
    delete copy.source_snapshot.horoscopeStorageWriteId;
    delete copy.source_snapshot.horoscopeGeneration.active.providerResult;
    return copy;
  };
  const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
  return JSON.stringify(stable(normalize(previous)))===JSON.stringify(stable(normalize(current)));
}
