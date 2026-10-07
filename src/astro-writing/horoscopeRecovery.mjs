// Longer than the API's 300-second maximum lifetime. A late handler is also
// fenced by the row version before it can dispatch or save a response.
export const HOROSCOPE_STARTUP_DEADLINE_MS = 310000;

export function horoscopeStartupRecovery(operation, now = Date.now()) {
  if (!operation || operation.workflow || operation.responseId) return null;
  const started = Date.parse(operation.startedAt);
  if (!Number.isFinite(started) || now - started < HOROSCOPE_STARTUP_DEADLINE_MS) return 'waiting';
  return operation.requestHash ? 'uncertain' : 'not_dispatched';
}

export function horoscopePendingReadings(edition, generation) {
  return edition.passages.filter(p => !p.headline.trim() && !p.body.trim() && !generation?.heldRequests?.[p.sign] && !generation?.candidateHolds?.[p.sign]);
}

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
    delete copy.source_snapshot.horoscopeGeneration.active.providerResult;
    return copy;
  };
  const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
  return JSON.stringify(stable(normalize(previous)))===JSON.stringify(stable(normalize(current)));
}
