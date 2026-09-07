# Chiron/Jupiter repeat-save investigation — September 7, 2026

The production PATCH at 14:27:27.318 UTC returned HTTP 409. The preceding save returned 200 at 14:18:49, a publish attempt returned 504 at 14:18:54, and a retry returned 200 at 14:19:07. The database retained the first published wording, last updated at 14:19:16.750192 UTC; the owner's second wording was absent. Logs establish a rejected version check and an earlier timeout, but do not reveal the exact client version token or prove which tab held it.

The editor retained unsaved text but put request errors in the page-level notification outside the editor. It offered no safe refresh of a stale saved version. The complete real Chiron package record, including approval metadata and both placeholder sets, passes API validation; prose validation was not the failing gate.

## Change

Package revision saves now recover once from version conflicts or uncertain timeouts. They fetch the current row, merge changes against the editor-open baseline, retain current remote metadata and disjoint text edits, and retry with the current version token. A competing change to the same field blocks recovery. Archived rows cannot be revived this way. The database compare-and-swap remains intact. No force save or conflict bypass was introduced.

An open You transit article also refreshes its stored passage when the reader content version changes. The browser regression delays hydration until after opening the calculated Chiron/Jupiter entry, then checks the complete opening and ending without closing and reopening the article.

Save and publish errors also appear inside the editor. Copy stays in the fields on failure. Recovery is bounded to one attempt.

## Owner copy repair

The owner supplied complete You and Friend passages in task `01a07b0b-8090-7f11-81de-cfeefbe5644c` on September 7. The exact copy, hashes and word counts are in `docs/content-management/owner-copy/chiron-jupiter-hard-2026-09-07.json`.

A single conditional production database repair updated row `4b35a69f-4de9-4b5a-bcea-261df6ce6324`, key `authored/transit-aspect/chiron/jupiter/hard`. The update required the previously read timestamp, retained its original package and edit history, added the owner receipt and both voice hashes, and updated the canonical record plus its display mirrors. It returned LIVE / serving at 15:26:32.577389 UTC. No other content row was modified. This repair used the database connector; it is separate from the automated editor/API tests.

You: 131 words, SHA-256 `0184fb4ac62a4b508447558083b4484582c58381f89ab902edf26283188afafe`.
Friend: 133 words, SHA-256 `b2871d9656249b9dfd43fe545b7f68273b3de510b6ad3387179188d463724786`.

This release changes the Studio revision workflow and the live CMS record. It does not replace the bundled package baseline or change resolver behavior; offline fallback limitations from the preceding freshness audit still apply.

## Validation

- Three-way merge: metadata-only refresh, disjoint edits, already-committed timeout, and rejection of competing same-field edits.
- Actual API handler: complete Chiron source record, sequential edits and publications, canonical You/Friend readback.
- Actual reader loader and shipped renderer: exact full You and Friend text with calculated slots substituted.
- Browser: stale-version rejection, recovery with the returned database version, second edit/publish, protected conflict, retained unsaved text, and visible mobile error.
- Full Content Studio API/editor regression suite, TypeScript, and CSS/token audit passed.

The broad `test:content` gate stops at the previously documented unresolved-queue assertion (`test-content-unresolved-studio.mts:36`). Its knowledge-package build prerequisite passed. No assertion or budget was weakened.
