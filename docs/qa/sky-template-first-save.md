# First save of a Sky article template

A newly created Sky article template could save successfully and offer **Complete
edition** without rendering its edition builder. Reopening the saved source
initialized the form, but the first-save path did not.

Successful template saves now initialize a missing edition form inside the
existing editor-session guard. Opening a saved template uses the same initializer.
An existing form is retained, including its reference date, calculated facts,
manual fields and workspace identity. The existing saved-version and newer-typing
handling remains in place. Initializing this empty form does not calculate facts,
generate writing, compile an edition or publish anything.

`tests/visual/sky-template-first-save.spec.ts` uses the real Studio save and
inventory handlers with publication migrations in an isolated PGlite store. It
creates a valid Sun/Libra template through the editor, verifies that the builder
appears without reopening, and checks that later template saves preserve the
separate saved edition workspace. A held first-save response verifies that newer
typing survives and the next save uses the returned version.

The calculation response in this browser regression is explicitly synthetic;
these checks do not establish ephemeris correctness or production publication.
Started API transfers must finish before handler teardown, and failed requests,
unexpected HTTP errors and external destinations fail the run. The suite runs
without retries in the Content Studio browser job.

Required full API checks, exact-head hosted checks and deployed native acceptance
remain separate release gates. Template identities and calculated-sign validation
are unchanged. Registered ingress-format publishing and saved-template/12-house
companion publishing remain distinct live acceptance flows.
