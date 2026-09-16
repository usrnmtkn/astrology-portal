# Editorial reference cleanup - 2026-09-16

This branch removes explicit named external editorial attributions, links,
comparison metadata, and positive outside-writer targets. The standalone
comparison document and database name-to-alias rewriting utility are removed.
A full-tree text guard replaces the former exemption-based attribution test.

Scope: source files only. No merge, deployment, migration, database write,
publication, approval-state change, or Git-history rewrite is performed.
Legacy `cc/...` content IDs, workbook provenance, and other abbreviated
source records remain. Their replacement requires a coordinated content
and persisted-ID migration; this is not a purge of those sources.
The scanner checks text and filenames; binary visual content is not covered.
Spreadsheet XML was separately checked and had no explicit name matches.

The staged content JSON changes only specified comparison/source metadata.
Locked transit entries change only source-link arrays. Reader strings,
review states, source-row keys and approvals are preserved.

Focused checks: reference policy, editorial policy compilation/freshness,
editorial decision regressions, adjacent-voice judge boundaries,
structural slot regressions, editorial-copy boundary, and knowledge/phrase
index freshness all passed. See the branch workflow logs for full output.

Broader-suite exit codes (zero means passed):

- baseline-placement: 1
- baseline-writer: 1
- content-studio-suite: 0
- reader-copy-suite: 0
- updated-placement: 1
- updated-writer: 1

The two baseline/updated comparisons have existing failures on the input snapshot.
No full-application pass or production verification is claimed.
