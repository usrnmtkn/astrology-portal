# Complete natal Friend readings

The owner approved two independent Friend passages in
`thread:01a15ba7-f55b-78d1-9cb2-fe9f54b2efb4` on October 25, 2026:
Chiron in Taurus in house 12 and Lilith in Virgo in house 4. The passage bodies
and approval records remain in private storage. This change supplies their
existing Studio and reader route; it does not change the bundled You readings
or assign further rewrites.

Complete placement sources now expose an optional Friend field even when no
Friend passage has been saved. It accepts `{{ownerName}}`. Plain saves retain a
proposal and do not grant approval. Explicit Studio publication records a
separate, body-hashed Friend approval receipt without replacing the You receipt
or original source snapshot. The reader fills only the declared name variable;
it retains the authored pronouns, complete text and paragraph boundaries.
The exact planet, sign, house and motion selection stays unchanged.

## Verification

- `node --import tsx scripts/test-natal-placement-friend-publication.mts` exercises
  the actual save/reopen/publication handlers, stale-write refusal, reader
  retrieval, both package implementations, name substitution, motion isolation
  and unchanged You text. Its default fixtures contain synthetic prose.
- `tests/visual/natal-friend-publication.spec.ts` exercises the normal Studio
  controls with isolated actual-handler storage on mobile and desktop.
- The opt-in `Complete Friend natal placement bodies reach each person` browser
  cases accept `NATAL_FRIEND_READER_SNAPSHOT` pointing to a private isolated
  publication snapshot. They verify the complete approved passages, original
  You readings, reload, two names and paragraph boundaries in the real chart
  screens. Private passages and screenshots are excluded from Git.
- The required Studio API suite includes the new handler regression. Reader-copy
  boundary, package manifest/cache, natal routing and privacy checks also apply.

Local test publication is isolated from the production database. A passing
fixture is not evidence of a production publication or deployment.

## Rebased release and interface cost

The release is rebased on main
`947523bfc7459c0a5d002f07d170e7e5e04619f5`. The complete main API list retains
its original order, with the Friend publication regression appended once
(166 existing commands, 167 total). The rebased `5b7c32249` baseline passed the
full local API suite and eight fresh browser cases covering the exact private
approved pair and isolated Studio publication controls at 390/1440 pixels in
light/dark. Final-head checks remain required after the small release repair.

The matched native-Node CI fixture uses
`VITE_SUPABASE_URL=https://visual-smoke.supabase.test`,
`VITE_SUPABASE_ANON_KEY=visual-smoke-placeholder`, an empty
`VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_ENABLE_NATAL_ASPECT_PATTERNS=true`. With the same lockfile, main measures
843,756 aggregate gzip bytes and this feature measures 843,941: 185 added bytes.
Measurements use the repository guard's `gzipSync` at level 9. An alternate
Python zlib result is not release evidence.

The original 843,850-byte aggregate limit failed. This requested interface
allocates 250 bytes, making that limit 844,100 and leaving 159 bytes of measured
headroom. This accounts for added editor/name support; it is not a performance
improvement. Entry, largest-chunk, reader-startup, lazy-boundary, content-payload
and runtime limits are unchanged. No dependency or reader prose is added to
the repository. The private acceptance record retains exact source hashes,
dependency provenance, final measurements and remaining release gates.
