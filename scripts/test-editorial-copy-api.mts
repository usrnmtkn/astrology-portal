// Manual owner prose is advisory; ingestion still separates notes from reader copy.
import './test-studio-owner-wording.mts';
import assert from 'node:assert/strict';
import {readerCopyIssues, separateOwnerArticle} from '../apps/web/src/content/editorialCopyBoundary.mjs';
assert(readerCopyIssues({body:'Editor notes: a deliberate quotation.'}).length);
assert.throws(()=>separateOwnerArticle('Here is your revised article: Synthetic.'),/Internal drafting notes/);
console.log('PASS manual publication preserves owner prose while automatic source ingestion retains its drafting-note boundary.');
