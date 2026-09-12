/** Shared import/API boundary. Detect notes; never rewrite submitted reader prose. */
export const READER_FIELDS = /^(?:headline|title|heading|subtitle|summary|introduction|body(?:_?(?:you|they|sky))?|copy|article|tldr|text|markdown|compiledMarkdown|passage|paragraphs|bullets|opening|tension|development|close|try_this|fact_line|hook|lived|turn|guidance|advice|reading|experience|archetype_meaning|workplace_translation|role_examples|growth_edge|best_use|stress_behavior|unfinished_lesson)$/iu;
const EDITOR_FIELDS = /^(?:source.*|.*notes|provenance|.*history|baseline|review.*|approval.*|.*policy|facts|metadata|flags|prompt.*|model|provider|editorial.*|import.*|audit.*)$/iu;
const RULES = [
  ['resolver specification', /^\s*(?:[a-z][a-z0-9_]* resolves as (?:interpretive|fact|gap|calculated|structural)\b|SOURCE_GAP:\s*[a-z0-9_]+ has no authored source)/u],
  ['engine instruction', /\(Engine note:/iu],
  ['drafting label', /\b(?:layer two evergreen|needs_review)\b|^\s*#*\s*(?:Templated article|Bespoke edition)\s*[—–-]/imu],
  ['workflow summary', /^\s*(?:REVIEWED|DRAFT|APPROVED|CONFIRMED|SOURCE_ONLY)\s*[·|]/u],
  ['editorial instruction', /(?:Block architecture per|No axis paragraph on this surface, per the ruling|Your published blocks, aspect threads moved to slots|Twelve rising blocks, authored per edition|On approval:\s*imports|pending engine confirmation|^#{1,6}\s+(?:Status|Assembly rules for|Serving rules)\b|^\s*(?:Editor(?:ial)?|Drafting|Import|Batch) notes?:)/imu],
  ['annotated template slot', /\{\{\s*[A-Za-z][A-Za-z0-9]*\s*:/u],
  ['instruction inside template variable', /\{\{\s*[A-Za-z][A-Za-z0-9_]*\s+\S[^{}]*\}\}/u],
  ['AI response wrapper', /^\s*(?:Here is|Here's) (?:your|the) (?:revised |updated |requested )?(?:draft|article|copy|passage)\b|^\s*As an AI\b/iu],
];
export function editorialTextIssues(text) {
  if (typeof text !== 'string') return [];
  return RULES.filter(([, pattern]) => pattern.test(text)).map(([reason]) => reason);
}
export function readerCopyFields(value, path = '', inheritedReader = false) {
  if (typeof value === 'string') return inheritedReader ? [{path, text:value}] : [];
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((child, i) => readerCopyFields(child, `${path}[${i}]`, inheritedReader));
  return Object.entries(value).flatMap(([key, child]) => EDITOR_FIELDS.test(key) ? []
    : readerCopyFields(child, path ? `${path}.${key}` : key, inheritedReader || READER_FIELDS.test(key)));
}
export function readerCopyIssues(row) {
  return readerCopyFields(row).flatMap(({path,text}) => editorialTextIssues(text).map(reason => ({path,reason})));
}
export function assertCleanReaderCopy(row) {
  const issue = readerCopyIssues(row)[0];
  if (issue) throw new Error(`Internal drafting notes in ${issue.path} (${issue.reason}). Move them to editor-only notes before saving or publishing.`);
}

/** Only the reviewed owner-resource Markdown format is eligible for extraction.
 * Unknown formats fail at the boundary instead of guessed prose deletion.
 * Every removed byte is recoverable in originalText; prose is not paraphrased.
 */
export function separateOwnerArticle(text, {editorOnly = false} = {}) {
  const originalText = text;
  const notes = [];
  const slotDescriptions = {};
  if (editorOnly) return {body:'', headline:'', notes:[text], originalText, slotDescriptions, editorOnly:true};
  let body = text;
  if (/^# (?:Templated article|Bespoke edition)\b/u.test(body)) {
    const start = [...body.matchAll(/^# (?!Templated article|Bespoke edition).+$/gmu)][0];
    if (!start) throw new Error('Article import has no reader article heading. Classify it as editor-only material.');
    notes.push(body.slice(0,start.index)); body=body.slice(start.index);
  }
  const end = body.search(/^## (?:PART [23]\b|Status\s*$)/mu);
  if (end >= 0) {notes.push(body.slice(end)); body=body.slice(0,end).replace(/\n---\s*$/u,'');}
  body=body.replace(/^\*\((?:Block architecture per|No axis paragraph on this surface, per the ruling|Your published blocks, aspect threads moved to slots|Twelve rising blocks, authored per edition)[^\n]*\)\*\s*\n/gmu, note => {notes.push(note); return '';});
  body=body.replace(/ \(dates pending engine confirmation\)/gu, note => {notes.push(note); return '';});
  // Balanced scanner: a slot description may itself contain {{nestedSlots}}.
  let output='', cursor=0;
  while (cursor<body.length) {
    const start=body.indexOf('{{',cursor);
    if (start<0) {output+=body.slice(cursor);break;}
    output+=body.slice(cursor,start);
    let depth=1, end=start+2;
    while(end<body.length && depth) {
      if(body.startsWith('{{',end)){depth++;end+=2;}
      else if(body.startsWith('}}',end)){depth--;end+=2;}
      else end++;
    }
    if(depth) throw new Error('Unclosed article variable; import stopped.');
    const token=body.slice(start,end), match=token.match(/^\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*:([\s\S]*)\}\}$/u)
      // Known owner-edition annotation; unknown prose inside a variable fails below.
      ?? token.match(/^\{\{(aspectHits) (placed per house)\}\}$/u);
    if(match){notes.push(token); (slotDescriptions[match[1]] ??= []).push(match[2].trim());output+=`{{${match[1]}}}`;}
    else output+=token;
    cursor=end;
  }
  body=output.trim();
  assertCleanReaderCopy({body});
  return {body, headline:body.match(/^# (.+)$/mu)?.[1]?.trim() ?? '', notes, originalText, slotDescriptions, editorOnly:false};
}
