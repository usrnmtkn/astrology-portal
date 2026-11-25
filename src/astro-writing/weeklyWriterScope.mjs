export const WEEKLY_WRITER_SCOPE='weekly-writer-scope/v4-2026-11-03';

/** Generated planning prose is not a second voice source or paragraph script.
 * Full plans remain in the journal and independent full-set review. */
export function weeklyWriterConcerns(concerns) {
  return concerns.map(({sign,eventIds})=>({sign,eventIds}));
}

export function weeklyWriterArgumentScope(outline) {
  return Object.fromEntries(['thesis','scope_guard','scopeBreadth','approvedOutlineHash']
    .filter(key=>outline[key]!==undefined).map(key=>[key,outline[key]]));
}
