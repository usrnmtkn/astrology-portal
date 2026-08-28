# Composition Map Naming and IA Audit

Date: 2026-08-27

## Scope

Reviewed the materialized fallback architecture package (`v3-2026-08-27b`)
through the Content Studio Composition Map rules:

- 9,563 saved and package-backed rows
- 39 templates
- 30 Natal chart templates
- 6 Current Sky templates
- 3 Friends & relationships templates

The audit follows the reader-first order used by the interface: reader
destination, human template name, slot meaning, source type, then canonical
key. Stable machine keys are not renamed merely to improve display copy.

## Repairs Applied

- Recognize explicit `content_role: template` metadata before interpreting a
  historical key namespace. This preserves two valid empty-house templates
  stored under `fallback-hook/…` without misclassifying ordinary hooks.
- Map template slots to the canonical saved-source families used by the runtime
  resolver, including Sky placement frames, Sky sign copy and lore, current Sky
  aspects, transit type/effect hooks, retrograde hooks, compatibility domains,
  and placement-gerund vocabulary.
- Keep source type clear in the UI: saved hooks and phrases open their canonical
  editor; calculated values remain read-only.

These repairs reduced false-positive IA flags from 24 across 19 templates to
zero wiring gaps across all 39 packaged templates and 396 reachable variables.

## Resolved Runtime Declaration

`fallback-template/synastry.aspect-v3` previously declared `closingLine` and
`synAspectLine` even though the resolver returns the approved authored pair as
the complete body. Those unreachable declarations were removed from the
template graph. The remaining nested holder variables are calculated
relationship context, and every saved-copy variable now resolves to at least
one governed source row.

The deterministic audit now verifies three separate claims:

1. every packaged template is present in Composition Map;
2. every reachable saved-copy variable maps to a governed source family; and
3. every rendered saved-copy span deep-links to one exact source row.

This 39-template/396-variable result is intentionally scoped to Fallback
Architecture V3. The separate **Surfaces & systems** scope maps the broader app
rendering inventory. It currently lists 24 surfaces and supporting systems,
including Daily At-a-Glance, direct Sky content, calendar and weekly copy,
reports, CMS overrides, compatibility highlights, and the Friends Circle feed.
Code-composed or generated systems that still lack an atomic editor are marked
as gaps instead of being counted as fully editable.
