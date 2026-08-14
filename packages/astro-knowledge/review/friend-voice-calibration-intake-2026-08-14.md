# Friend voice calibration intake — 2026-08-14

Status: intake ready; blocked on owner response and person-contract ruling; no corpus emitted

The 13-row calibration source is `TLDR-FRIEND-VOICE-CALIBRATION-DRAFT-V1.md`. The owner response packet is `TLDR-FRIEND-VOICE-CALIBRATION-OWNER-RESPONSE-V1.md`.

## Import contract

- The importer validates the immutable draft SHA-256 before reading any verdict.
- All 13 rows require exactly one verdict: `approve`, `edit`, or `cut`.
- `approve` adopts the draft passage byte-identically; `edit` adopts the owner's edit verbatim; `cut` excludes the row.
- At least four adopted passages are required before a calibration corpus can be emitted.
- Every adopted passage is recorded as `exact_owner_approved` with its source-record path, record SHA-256, payload SHA-256, and `surface: natal-friend`.
- Validation completes before any write. Blank, partial, ambiguous, reordered, or hash-drifted input refuses the whole import.

## Packet behavior

Friend writing packets retrieve only `surface: natal-friend` evidence. They require at least four exact-owner-approved passages before `generationAllowed` can be true. A Self packet cannot be reused as Friend evidence.

The approved Friend corpus does not exist yet, so Friend generation currently fails closed. No Friend copy was authored, altered, approved, served, indexed, or promoted by this intake work.

## Blocking owner ruling

The owner must choose whether Friend copy may address the reader as observer (for example, “You meet Name and within ten minutes…”) or must remain pure third person. The governed policy file `friend-voice-person-contract-policy-v1.json` remains `pending-owner-ruling` and the importer refuses to emit a corpus until the response and policy record agree.

