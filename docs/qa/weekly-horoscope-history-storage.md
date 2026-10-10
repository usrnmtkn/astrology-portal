# Weekly history storage

Weekly generation keeps every original request, rejected draft, failure and
receipt. Repeated legacy rejections can retain copies of earlier generations
inside that history. Expanding that JSONB document for each lease, result save
and audit snapshot can exhaust the database's working memory.

`horoscope-history-storage.ts` losslessly encodes the historical fields with
Brotli and records the complete JSON byte count and SHA-256. It does not shorten
reader prose or discard evidence. Active requests, candidates, held requests and
the batch remain ordinary JSON, so provider-result checkpoints and cron discovery
retain their existing contracts. Server reads restore the complete original
fields before planning, review, evidence retrieval or editor projection. Invalid,
oversized, conflicting or damaged archives fail before generation.

Versioned Weekly checkpoints compare against the actual stored representation.
The first conversion replaces the snapshot once; later state changes send only
their delta. Uncertain acknowledgements still require an exact complete-document
readback. The immutable database audit retains previous raw versions and new
encoded versions. No database schema, privilege, publication gate or paid-retry
policy changes.

Verification:

- `test-horoscope-history-storage.mts`: complete source and rejected-passage
  equality, stable encoding, integrity failures, size limits, and lost-save
  acknowledgement with one write.
- `test-horoscope-durable-batch.mts`: the actual handlers complete twelve Gemini
  drafts and twelve checks from a legacy edition containing a large nested
  history; reload, manual edits and all history remain intact. Provider calls
  use isolated fixtures, not paid APIs.
- Native PostgreSQL checkpoint tests retain their full immutable-audit,
  exact-version and service-role checks. A protected local reproduction also
  measures conversion and steady-state checkpoints alongside concurrent reads.
- The unfiltered Content Studio API gate and a fresh production-entry browser
  recovery flow must pass on the release revision. A live batch is a separate
  acceptance check; fixture success does not establish provider reliability or
  editorial quality.

Raw database exports retain the encoded envelope. Maintenance tools must use
the same decoder before inspecting historical fields; they must not treat their
absence at the JSON path as lost history. Restore procedures must use a release
that understands this versioned envelope before resuming a saved batch.
