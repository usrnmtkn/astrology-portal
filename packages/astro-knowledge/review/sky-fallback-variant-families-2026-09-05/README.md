# SKY continuous evergreen fallback variant families

Status: architecture/editor draft only
Serving changes: none
Reader-copy changes: none
Owner approval changes: none
Database schema changes: none

## Goal

Continuous Current Sky planet-in-sign fallbacks should be able to read like substantial evergreen articles without showing a different write-up when a reader refreshes the browser or returns on another day during the same astronomical event.

The proposed unit is a `sky-continuous-fallback-variant-family/v1` sidecar attached to the existing Content Studio placement record. It does not replace the current hash-bound reader record or its legacy `fallback.hook / fallback.lived / fallback.turn` fields in this phase.

## Editorial shape

A family contains one or more coherent lanes. A lane contains independently reviewable paragraph variants for:

1. Hook / opening
2. Development
3. Shadow / tension
4. Close

A complete lane must contain at least one non-empty variant in all four sections. Selection never mixes sections across lanes. Paragraphs may be substantially longer than the old three-sentence fallback fields; the editorial requirement is coherence, not shortness.

Each lane and each paragraph variant has a stable ID. These IDs are part of the rendered-selection provenance so an editor can reproduce the exact composition a reader would receive.

## Event lock

Selection policy: `event-locked-v1`.

The deterministic selection namespace is:

```text
{released family version}|{content key}|{immutable astronomical event instance ID}
```

The selector derives one lane and one variant for each of the four sections from that namespace. The same inputs always return the same exact composition.

This means page refreshes, sessions, devices, calendar dates inside the same transit, and user identity do not participate in variation selection.

The family version is intentionally part of the lock. A serving implementation must therefore pin the released family version for an astronomical event instance. Editing a future family draft must not change the family version or selection used by an already released event.

## Content Studio behavior in this phase

`SkyV4StudioReviewPanel` keeps the existing `Hook · Lived · Turn` fields visible and labels them as the legacy serving fallback.

The new `SkyFallbackVariantFamilyEditor` sits beside them and supports:

- family-version editing;
- lane IDs and human-readable lane labels;
- adding/removing lanes;
- adding/removing paragraph variants in each section;
- stable variant IDs;
- complete-lane readiness feedback;
- an explicit event-instance ID for preview;
- an event-locked preview showing the selected lane and all selected variant IDs.

Variant-family drafts are stored as:

```text
sections.skyFallbackVariantFamilyDraft
```

on the existing generated-content row. Saving the sidecar also retains an unchanged `sections.packageDraft` so the existing SKY V4 draft boundary remains active. No serving field, approval field, source baseline, or canonical package field is modified.

The preview endpoint is admin-only and always returns `servingEnabled: false`.

## What this PR deliberately does not do

- It does not seed or approve any astrology prose.
- It does not replace the current legacy fallback renderer.
- It does not change the 120 continuous correction records.
- It does not change the canonical reader-copy approval ledger or serving release.
- It does not choose event instance IDs in production.
- It does not promote a draft family to reader use.

## Required later release work

Before this architecture may serve reader copy:

1. Author and owner-review the paragraph families for the intended placement keys.
2. Define the production ephemeris event-instance identity for each supported event family.
3. Add a hash-bound owner approval for the exact family version and all paragraph IDs/text.
4. Add a serving release that pins event instance -> released family version.
5. Update the canonical reader resolver to prefer the released event-locked family only when a full event-specific article is unavailable.
6. Preserve the existing fallback/facts-only path if the released family is incomplete or unavailable.
7. Add production parity tests proving the same event never rerolls and an unreleased family can never render on reader routes.

Until those gates exist, this feature is a Content Studio authoring and preview surface only.
