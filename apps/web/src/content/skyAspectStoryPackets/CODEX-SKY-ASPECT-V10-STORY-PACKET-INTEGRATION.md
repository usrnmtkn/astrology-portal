# Codex: Integrate the V10.1 Exact-Aspect Story Packets Without Rewriting Copy

## Objective

Replace the earlier `soft` / `hard` / `conjunction` paragraph assembly with the supplied 225 exact-aspect story packets.

Each planet pair has five independently authored packets:

- conjunction
- sextile
- trine
- square
- opposition

The complete five-sentence packet is the authored unit. Do not mix sentences between packets.

## Authoritative files

1. `sky-aspect-exact-story-packets.json`
   - Canonical machine-readable source.
   - Import every user-facing field exactly.
2. `SKY-ASPECT-EXACT-STORY-PACKETS.md`
   - Human editorial review source.
3. `sky-aspect-exact-story-packets-audit.json`
   - Structural and copy-integrity audit.
4. `sky-aspect-v10-word-choice-audit.json`
   - Exact record of the targeted V10 phrase refinements.

V10.1 adds a governed, selective collective bridge. It does not change any of
the 225 five-sentence story bodies.

Earlier clause libraries, broad soft/hard packets, and compiled previews are not authoritative for this layer.

## Absolute copy rule

Do not rewrite, regenerate, shorten, expand, paraphrase, grammar-polish, or improve any user-facing sentence in the supplied packets.

If a sentence appears to need a change:

1. Report the packet `id`.
2. Quote the existing sentence.
3. Explain the concern outside the copy field.
4. Leave the source unchanged.

Do not call an AI model to produce, repair, or complete story-packet copy.

## Editorial status

- `approved-user-locked`: the five Sun–Moon packets approved directly by the user. Preserve them byte-for-byte and protect them with snapshot tests.
- `editorially-refined-review-ready`: the other 220 packets after the V10 word-choice pass. Import them into draft or shadow-review state. Do not relabel them as user-approved.

The V10 pass made targeted phrase-level changes. It did not replace the stories, alter the five-sentence structure, or convert editorial review into user approval.

## Resolver key

Resolve one record using:

```text
canonicalPlanetA + exactAspect + canonicalPlanetB
```

Example:

```text
sky.mercury.square.saturn
```

Canonical planet order must match the supplied record IDs. If runtime input arrives in reverse order, normalize the pair before lookup without reversing or rewriting the packet language.

## Rendering contract

The required story order is:

```text
humanMoment
developmentDetail
planetaryDynamic
aspectMechanic
conditionalConsequence
```

The canonical `body` already contains that order and spacing. Prefer rendering `body` directly.

Do not:

- select a sentence from another pair or aspect;
- hash-select a generic aspect mechanic;
- combine a sextile opening with a trine ending;
- combine a square opening with an opposition ending;
- append a second generic consequence;
- add a sentence such as `Two forces bind together under the conjunction`;
- expose editorial status, hashes, audit fields, or source instructions in reader copy.

## Calculated fact and selective collective lead

The default unpersonalized Sky rendering may place an immutable calculated fact
before the complete packet:

```text
Right now, {{planetALabel}} in {{signA}} {{aspectVerb}} {{planetBLabel}} in {{signB}}.
```

When `collectiveLeadEligible` is `true`, the unpersonalized Sky card may instead
render the record's exact `optionalCollectiveFactLead`:

```text
Right now, {{planetALabel}} in {{signA}} {{aspectVerb}} {{planetBLabel}} in {{signB}}, and on a collective level, {{humanMomentLowercase}}
```

The collective version replaces both:

1. the standalone calculated fact sentence; and
2. `sentenceRoles.humanMoment`.

After it, render `developmentDetail`, `planetaryDynamic`, `aspectMechanic`, and
`conditionalConsequence` in that order. Do not render the canonical `body`
after the combined lead because that would repeat `humanMoment`.

When `collectiveLeadEligible` is `false`, `optionalCollectiveFactLead` is
`null`. Render the standalone fact sentence and the complete canonical `body`.

Never use the collective lead:

- in natal, transit-to-natal, synastry, composite, or other personalized copy;
- when `collectiveLeadEligible` is `false`;
- more than once per card;
- as a separate sentence beginning `On a collective level`;
- with a collective sentence invented at runtime.

Planet, sign, exact aspect, orb, phase, date, and timing are calculated facts supplied by the runtime. Do not infer them from story copy.

## Sign-specific sentence rule

A sign-specific resolver may replace only `planetaryDynamic`, and only when the replacement:

1. remains inside the event established by the packet;
2. preserves both planetary roles;
3. supports the exact aspect movement;
4. introduces no new conflict, promise, or consequence;
5. has been reviewed inside the complete five-sentence preview.

If a compatible sign-specific sentence is unavailable, render the supplied base `planetaryDynamic`. Never generate one at runtime.

## Required tests

### Source integrity

- Exactly 225 records.
- Exactly 45 planet pairs.
- Exactly 45 records per exact aspect.
- Exactly five sentences per packet.
- Unique record IDs, bodies, and authored sentences.
- Every eligible record has one exact combined collective fact lead.
- Every ineligible record has `optionalCollectiveFactLead: null`.
- Canonical SHA-256 matches the supplied audit.

### Locked copy

- Snapshot all five `approved-user-locked` Sun–Moon records.
- Fail CI if imported copy differs from the supplied JSON.

### Resolver behavior

- Each canonical pair resolves all five exact aspects.
- Reversed input resolves the correct canonical record.
- Missing sign data uses the base packet without failure.
- A trine never resolves a sextile packet.
- A square never resolves an opposition packet.
- No legacy soft/hard packet is reachable.

### Admin and preview behavior

- Show exact aspect as a first-class filter.
- Show `editorialStatus`.
- Show the complete five-sentence body in one preview.
- Preview sign-specific sentence substitutions inside the complete paragraph.
- Keep `editorially-refined-review-ready` records out of LIVE until the user approves them.

## Acceptance

The work is complete only when:

1. all 225 records are imported without copy changes;
2. the resolver selects one complete packet by canonical pair and exact aspect;
3. the old 135-packet assembly cannot supply reader copy;
4. locked-copy and resolver tests pass;
5. the admin can review the 220 refined records without silently publishing them;
6. no runtime AI generation writes or repairs packet copy.

Implement the integration and tests. Do not return a plan in place of the changes.
