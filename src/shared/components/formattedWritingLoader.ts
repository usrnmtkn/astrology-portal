type WritingModule = typeof import('./FormattedWritingContent.js');
let prepared: WritingModule | undefined;
let pending: Promise<WritingModule> | undefined;

/** Share the same complete renderer without importing React into data startup.
 * Once prepared, readers use it synchronously instead of suspending on a new
 * React.lazy promise for a module that has already finished downloading. */
export function loadFormattedWriting() {
  return pending ??= import('./FormattedWritingContent.js').then(module => {
    prepared = module;
    return module;
  }).catch(error => { pending = undefined; throw error; });
}
export function preparedFormattedWriting() { return prepared?.default; }
