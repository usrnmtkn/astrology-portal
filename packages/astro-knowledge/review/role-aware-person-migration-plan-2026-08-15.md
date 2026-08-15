# Role-aware person migration plan — 2026-08-15

Status: plan and renderer foundation only. No fallback row is tagged or migrated by this scope.

## Baseline

The canonical source contains 720 vocabulary rows and 4,377 hook rows. The audit in `role-aware-person-migration-audit-2026-08-15.json` applies a deliberately conservative rule:

- a row may be tagged automatically with no person roles only when its prose has no personal pronoun, no legacy person slot, and no differing voice fields;
- every other row requires human, family-level role verification.

Results:

| Corpus | Rows | Automatic no-person tag | Cannot auto-tag |
|---|---:|---:|---:|
| Vocabulary | 720 | 658 | 62 |
| Hooks | 4,377 | 815 | 3,562 |
| Total | 5,097 | 1,473 | 3,624 |

Of the 3,624 manual-review rows, 3,609 contain an untyped personal pronoun. The classifications overlap: 2,216 hooks also have different voice fields and 307 contain legacy person placeholders whose semantic role cannot be inferred safely.

## Tagging approach

1. Add a `person_roles` declaration to each reusable fragment and replace only personal references with role tokens. Preserve every non-person byte and the fragment's meaning.
2. Treat an empty `person_roles` list as an explicit reviewed assertion that the fragment has no personal reference. It is not the same as missing metadata.
3. Migrate by coherent family, never by a corpus-wide pronoun replacement. Each family record lists source hashes, role assignments, rendered Self/Friend samples, and ambiguous rows.
4. Require owner review for any row where a pronoun could refer to `viewer`, `chartSubject`, or `otherPerson` in more than one plausible way.
5. Keep prior `body`, `body_you`, and `body_they` values as comparison evidence until the family is verified. Do not use prior Self passage structure to create Friend passages.

## Verification method

Every migration phase must prove:

- canonical source metadata hashes match the reviewed manifest;
- Self output is byte-identical for all migrated rows;
- Friend render uses the display name on the first passage reference and the stored pronoun preference thereafter;
- name and pronoun renderings both use correct verb agreement;
- viewer-role language remains second person on Friend surfaces;
- no untyped personal pronoun or unresolved role token reaches output;
- `otherPerson` absence fails closed;
- Node/browser renderers produce identical output;
- the passage-level `pronoun-swap-derivation` and Friend-entry gates remain blocking.

## Phased order

### Phase 0 — foundation (this scope)

Land the typed role renderer, agreement tests, name/pronoun policy, ambiguity refusal, owner entry-point ruling, deterministic audit, and this plan. No source-row tags and no serving changes.

### Phase 1 — the current vocabulary leak

After the owner approves the Part A review table, promote the approved interim `body_they` variants to stop the live leak. Then prepare a separate role-tagging manifest for those same rows. The role-tagging PR must verify all renderings and remove the interim `body_they` fields in the same change.

Coverage: the 41 audit hits, including explicit disposition of the lexical `thank-you` false positive and the two owner-ruling rows.

### Phase 2 — remaining vocabulary families

Apply the 658 no-person assertions mechanically under hash lock. Review the remaining 21 manual vocabulary rows not covered by Phase 1 by family. Run all 720 rows through Self-byte-parity and Friend-person checks.

### Phase 3 — high-use shared hooks

Prioritize natal placement, natal aspect, empty-house, daily do/don't, and personal-transit hook families. Migrate one family per review record. Render real Self and Friend compositions, including `she`, `he`, and `they` fixtures and both name-first and subsequent-pronoun positions.

### Phase 4 — remaining hooks

Apply verified no-person assertions and review all other hook families in surface order. A surface may switch to role rendering only when every required fragment in that surface is tagged; mixed string-replacement and role rendering is prohibited.

### Phase 5 — cleanup

Remove obsolete string-level person helpers only after all call sites are role-tagged. Retain grammatical lint as a regression check, not as a transformer. Confirm the 41 interim `body_they` fields are gone and no Friend passage is derived from Self copy.

## Stop conditions

Stop a family migration on any source-hash drift, Self output change, unresolved role, name/pronoun agreement mismatch, or possible pronoun antecedent with more than one role. Ambiguous rows remain review-gated and the consuming surface fails closed for those slots.
