/** Normalize transport syntax without losing PostgreSQL's fractional seconds. */
export function feedbackTimestamp(value) {
  if(typeof value!=='string')return value;
  const match=value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}(?::?\d{2})?)$/u);
  if(!match)return value;
  const [,date,time,fraction='',offset]=match;
  const local=new Date(`${date}T${time}Z`);
  if(!Number.isFinite(local.getTime())||local.toISOString().slice(0,19)!==`${date}T${time}`)return value;
  const zone=offset==='Z'?offset:offset.length===3?`${offset}:00`:offset.replace(/([+-]\d{2})(\d{2})$/u,'$1:$2');
  const instant=new Date(`${date}T${time}${zone}`);
  if(!Number.isFinite(instant.getTime())||instant.getUTCFullYear()<0||instant.getUTCFullYear()>9999)return value;
  const digits=fraction.replace(/0+$/u,'');
  return `${instant.toISOString().slice(0,19)}${digits?`.${digits}`:''}+00:00`;
}

/** Old v1 receipts hashed the exact SQL/JSON date spelling. */
export function legacyFeedbackTimestamps(value) {
  const normalized=feedbackTimestamp(value);
  const match=typeof normalized==='string'&&normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d+))?\+00:00$/u);
  if(!match)return [value];
  const [,date,time,digits='']=match;
  const fractions=new Set([digits]);
  for(const precision of [3,6,9])if(digits.length<=precision)fractions.add(digits.padEnd(precision,'0'));
  const values=new Set([value]);
  for(const separator of ['T',' '])for(const fraction of fractions)for(const zone of ['Z','+00:00','+00'])
    values.add(`${date}${separator}${time}${fraction?`.${fraction}`:''}${zone}`);
  return [...values];
}
