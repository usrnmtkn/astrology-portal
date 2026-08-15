# Governed writing kernel with surface-specific strategies

Date: 2026-08-14
Status: adopted architecture; deterministic foundation active; production migration remains gated

## Decision

TLDR Astro does not have one universal writer. It has one governed writing
kernel and multiple surface-specific writing strategies.

The kernel owns the rules that must never drift:

- canonical astrology identity and temporality;
- provenance, source hashes, and stale-source checks;
- evidence authority and surface permissions;
- owner-approved voice and phrase evidence;
- approved scene permissions;
- provider-boundary evidence gates;
- shared deterministic language validation;
- advisory Reader Judge isolation;
- review state, owner approval, and fail-closed behavior.

Each surface owns the choices that should differ:

- structure and length;
- scene density and point of view;
- collective, personal, relationship, or article register;
- advice and ending policy;
- aspect, house, and timing routing;
- surface-specific escalation and validation rules.

Centralization may not turn those choices into one prose planner. The desired
flow is:

```text
canonical target
  -> governed evidence packet
       astrological truth
       scene permission
       surface-approved voice evidence
  -> surface strategy
  -> surface planner and writer
  -> shared deterministic validation
  -> surface-specific validation
  -> advisory Reader Judge
  -> optional revision
  -> deterministic revalidation
  -> PENDING OWNER
```

## Evidence roles are not interchangeable

1. **Astrological truth** supports what the placement, aspect, house, or event
   means. It is not automatically reader-facing prose.
2. **Scene permission** licenses a kind of manifestation for a specific
   surface. It is not a noun slot or sentence template.
3. **Voice evidence** shows how the owner shapes prose. It cannot add an
   astrological claim or grant a scene permission.

The Friends house model remains:

```text
house -> licensed concept -> allowed realization -> causal guard -> provenance
```

No registry value may be treated as a phrasebank token.

## Current enforcement

- `surfaceStrategies.mjs` declares surface-owned planning, voice, and
  validation profiles. Reader Judge authority is fixed to advisory-only.
- `voiceEvidence.mjs` is the shared retrieval boundary. Owner examples must be
  explicitly approved and match the surface family/register.
- Phrase evidence is currently enabled only for Friends transit. Other
  surfaces receive no reusable phrases until their retrieval policy is
  explicitly approved. This prevents Daily cadence, long-form cadence, and
  relationship cadence from leaking into one another.
- `validateCopy.mjs` runs shared language and corpus-grammar gates. Specialized
  Friends checks continue to layer on top rather than becoming universal.
- Every writer, reviewer, and reviser call made through
  `runWritingPipeline.mjs` receives the governed evidence packet and the
  applicable voice-evidence hashes.
- Cold/Reader Judge findings remain nonblocking and cannot rewrite. Owner exact
  wording approval remains the only prose-approval authority.

## Production boundary

`api/_lib/content-generation.ts` still has surface-specific production
planners and should keep them. It must migrate to the kernel's evidence
contract before the architecture is called complete, but that migration must
be performed per surface because current production `knowledgeIds` are legacy
aliases and some requests contain multiple simultaneous sky objects.

The production migration is not allowed to:

- infer one canonical target from ambiguous legacy aliases;
- silently drop secondary sky objects;
- enable phrase evidence for an unapproved surface;
- add Gemini to production as a side effect;
- change serving or approval state.

Required production sequence:

1. map each production request to one or more canonical ids deterministically;
2. add a governed multi-object packet where a surface genuinely needs one;
3. preserve the surface's existing planner through a production adapter;
4. require source and packet hashes at every provider boundary;
5. migrate one surface at a time with parity and fail-closed tests.

Until those mappings exist, production remains a separate consumer rather
than pretending to satisfy the central contract with incomplete evidence.

## Governance

Review drafts, later voice-pass proposals, rejected candidates, workbooks, and
model judgments remain audit evidence. Their presence in the repository never
makes them voice evidence. Nothing in this decision grants writer eligibility,
render eligibility, approval, or serving status.
