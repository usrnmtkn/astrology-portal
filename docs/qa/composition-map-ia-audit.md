# Composition Map Naming and IA Audit

Date: 2026-08-27

## Scope

Reviewed the materialized fallback architecture package (`v3-2026-08-25c`)
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
one flag on one template.

## Remaining Owner Decision

`fallback-template/synastry.aspect-v3` declares optional `closingLine` copy,
but no saved source row or resolver assignment currently supplies it. The
runtime returns approved pair copy before this fallback template is used, so
removing or repurposing the slot would be an editorial architecture decision,
not a safe naming cleanup.

Choose one of these deliberate resolutions in a future content pass:

1. Remove `closingLine` from the template if the approved pair passage is the
   complete canonical unit.
2. Create a reviewed closing-source family and wire the resolver if a separate
   reusable close is still desired.

Until that decision is made, the Composition Map correctly keeps the template
under **Needs IA review**.
