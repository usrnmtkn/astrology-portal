# CODEX HANDOFF

Use `ANGLE-ASPECTS-60-FRIENDS-V1-OWNER-APPROVED.md` as the exact Friends copy authority.

Friends corpus SHA-256: `186fc623066981bd66a1cb7f4f00e2062391572b5f94ab1ad68b7842c5c135f2`
Friends JSON SHA-256: `acdd96d177b971d1a4cc9bb1c02130347a09fcd2036de499ea35c1a205cd5640`
You-revisions JSON SHA-256: `bba7b003351a7b145c16c17ec6b85226d74aba37124c53aa08a2da54f7f1b853`
V15 You canonical authority SHA-256: `3bbcd3e611d72a9754e9fdb4f4390ec860a670bc53af6b059ea23a212d37bfd4`

## Scope
- 60 separately authored Friends angle-aspect bodies, exact owner approved.
- 2 You supersessions: Sun square Ascendant and Moon square Midheaven.
- Preserve the other 58 V15 You bodies byte-identically.

## Hard rules
- Do not rewrite or pronoun-swap the Friends copy.
- Do not expose You bodies to Friends as a shortcut.
- Use the existing governed Friends storage/rendering contract; hard-stop if none exists.
- Do not create Descendant or IC runtime keys.
- No trine/sextile/quincunx/semisextile angle work in this batch.
- No planet-to-planet, Chiron, Lilith, Nodes, transit, synastry, calculation, ephemeris, or orb changes.
- Do not run full rematerialization.

## Required pre-write gate
Fetch current origin/main and use a clean worktree. Audit the current Friends natal-aspect storage/rendering path. Perform a read-only Content Studio impact audit before remote writes.

## Required validation
- Friends count 60/60 and unique 60/60.
- All Friends bodies exactly match the pinned corpus.
- Sun square Midheaven Friends renders.
- Moon square Midheaven Friends renders the approved replacement.
- Sun square Ascendant Friends renders.
- You Sun square Ascendant matches the approved supersession.
- You Moon square Midheaven matches the approved supersession.
- Other 58 V15 You bodies byte-identical.
- Friends never falls back to You when approved Friends copy exists.
- Pluto trine Midheaven remains out of scope/source-gap; do not fabricate it.
- Zero out-of-scope reader-copy drift.

Stop at the owner review wall before push/PR/merge/deploy unless separately authorized.
