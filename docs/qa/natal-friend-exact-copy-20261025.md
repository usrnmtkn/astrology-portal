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
