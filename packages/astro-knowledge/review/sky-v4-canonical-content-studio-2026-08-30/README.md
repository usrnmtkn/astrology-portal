# SKY V4 canonical Content Studio staging record

Date: 2026-08-30

This change stages the owner's first canonical SKY V4 handoff for review. It does not authorize serving, promotion, or merge.

## Source authority

- Archive: `SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30.zip`
- Archive SHA-256: `a01f48a92b876ff4ff19673f35266f63cee6a90bc70bb5a8e1f22fc68b722dbc`
- Canonical JSON SHA-256: `9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750`
- Workbook SHA-256: `3f2c2c6b61c90ba42a625fb6d19f5f11c4d50eb28b632c10e98f83de8edd16d6`
- Package version: `SKY-V4-CANONICAL-CODEX-HANDOFF-CONTENT-STUDIO-EDITABLE-2026-08-30`

This package supersedes the earlier SKY V4 drafts and the work represented by PRs #450 and #452. Their copy was not used as source authority here.

## Governance boundary

- All imported rows are `needs_review`, `owner_approved: false`, and `serving_enabled: false`.
- The canonical package baseline is retained byte-for-byte and hashed per record.
- Content Studio edits create versioned, non-serving drafts. Identity, trigger, axis, source, and governance fields remain read-only.
- Status order is draft → editorial-reviewed → owner-approved → serving. This change does not perform any transition.
- Reader fallback order in the stage preview is canonical article → exact Hook/Lived/Turn → facts-only.
- No owner wording approval is inferred from mechanical QA or from inclusion in this package.

## Review wall

The PR must stop for the owner's rendered review. A separate owner ruling is required before any wording can be promoted or any serving switch can be enabled.
