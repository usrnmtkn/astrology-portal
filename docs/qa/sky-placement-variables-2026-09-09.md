# Sky Placement variables and source identity

The SKY V4 `placementArticle` field is a saved evergreen main passage for one
planet/sign pair. It takes priority over that record’s shorter fallback
sections. Its label describes its role in assembly, not a dated edition or a
claim that every sentence is a verbatim owner-authored original. The immutable
canonical corpus and approved correction packages retain the writing provenance.
This change does not edit those sources or their approval records.

Content Studio > Sky Write-ups > choose planet/sign/motion > Composition Map:

- **Main template** names each source block, for example “Saturn in Aries ·
  Fallback opening,” followed by `sky-placement/article/saturn/aries#fallback.hook`.
  It shows saved text and variable substitution in assembly order. The source
  identifier is a reference to a field, not an inline mustache token.
- **Reader preview** substitutes the selected placement identity and motion.
  It remains a saved-source preview, which may include drafts. It is not proof
  of publication and does not invent an event date.
- In a placement article or fallback section editor, expand **Sky variable
  key** to insert a variable at the cursor or replace selected text. The
  reference gives each token’s meaning and availability. Custom sections use
  the same reference, validation, and runtime substitution.

| Inline variable | Reader value |
| --- | --- |
| `{{planetTitle}}` | Calculated placement’s planet name without “the” or Rx |
| `{{signTitle}}` | Calculated placement’s zodiac sign |
| `{{motion}}` | `direct` or `retrograde` for that occurrence |
| `{{entryDate}}` | Calculated sign-residency entry date with year |
| `{{exitDate}}` | Calculated final sign-residency exit date with year |

Dates are sign-residency dates, not retrograde station dates. They use the
existing reader adapter’s calculation and date formatting. In a preview with
no calculated occurrence, date tokens remain marked as unresolved. The reader
rejects a selected passage with missing facts; it does not remove a token and
leave a broken sentence. An unused fallback path is not evaluated when the
main article is selected.

The initial variable scope is the continuous placement article and evergreen
fallback sections. It does not add variables to TLDR fields, shared retrograde
modifiers, natal passages, vocabulary, or dated article editions. Existing
supported placeholders in other families retain their own contracts. Unknown
variables and conditional-block syntax are rejected by the save API and
reported inline in the editor. Publication revalidates the contract.

## Verification

- `scripts/test-sky-placement-variables.mts`: source, browser entry, and shipped
  artifact parity; article/fallback paths; direct/Rx; missing and unknown facts;
  unused fallback isolation; unchanged canonical corpus.
- `scripts/test-sky-placement-studio-api.mts`: save/publish/readback through the
  real API handler and reader loader, with isolated in-memory storage. Tests
  built-in and custom fields, subsequent revisions, and invalid input rejection.
- `tests/visual/sky-placement-variables.spec.ts`: named source blocks, raw and
  substituted text, caret insertion, field switching, validation, empty state,
  and typography at 390/1440 px in light/dark themes.
- Existing composition, evergreen, content, typecheck, and CSS checks apply.

No production CMS rows or database settings are changed by this work. Runtime
package version: `v3-2026-09-09a`.
