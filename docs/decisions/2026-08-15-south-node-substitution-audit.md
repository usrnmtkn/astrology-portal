# South Node substitution and axis-derivation audit

Date: 2026-08-15
Scope: governed evidence adapter and deterministic evidence resolution only
Deployment/provider calls: none

## Corrected production mapping

Both accepted Sky placement identifier forms now resolve to the real requested
object:

- `sky-placement-south-node-<sign>` -> `placement-sign/south_node/<sign>`
- `sky-south-node-in-<sign>` -> `placement-sign/south_node/<sign>`

The target usage is `primary`. No North Node object is included. All twelve
objects receive owner-approved South Node evidence from the V9 matrix. Those
rows keep prose in the title-case `Copy` field, which the governed resolver did
not previously extract. `Copy` occurs only in the two V9 JSON stores in the
indexed source corpus; recognizing it made 46 owner-approved V9 objects
readable, including the eleven South Node objects that had no separate source
document.

The removed mapping basis was
`current-sky-south-node-opposite-north-node-derived`. It occurred in the two
identifier branches above, returned opposite-pole doctrine as `primary`, and
was unsafe. It has no remaining runtime path.

## Derivation audit

The lexical `opposite` entries in `ASPECT_ALIASES` and `ASPECT_TOKEN` normalize
an explicitly requested opposition aspect. They do not substitute evidence and
are safe.

| Code path | Pairs covered | Geometry/identity | Semantic verdict | Allowed evidence use |
| --- | --- | --- | --- | --- |
| `axis-counterpart-sign` | Ascendant/Descendant | exact opposite sign | opposite pole, not the same meaning | `mechanism-reference`, `framingAllowed:false` |
| `axis-counterpart-sign` | Midheaven/Imum Coeli | exact opposite sign | opposite pole, not the same meaning | `mechanism-reference`, `framingAllowed:false` |
| `axis-counterpart-sign` | North Node/South Node | exact opposite sign | opposite developmental meaning | `mechanism-reference`, `framingAllowed:false` |
| `axis-counterpart-aspect` | Ascendant/Descendant aspects | same configuration after aspect mirroring | different pole and emphasis | `mechanism-reference`, `framingAllowed:false` |
| `axis-counterpart-aspect` | Midheaven/Imum Coeli aspects | same configuration after aspect mirroring | different pole and emphasis | `mechanism-reference`, `framingAllowed:false` |
| `axis-counterpart-aspect` | North Node/South Node aspects | same configuration after aspect mirroring | opposite developmental meaning | `mechanism-reference`, `framingAllowed:false` |

There is no audited axis substitution whose two ends have the same meaning.
Axis derivation can establish identity or geometry only. The derivation API now
labels every returned counterpart `semanticRelation:opposite-pole`,
`targetUsage:mechanism-reference`, and `framingAllowed:false`. Regression
fixtures cover all three axes and both placement/sign and aspect derivations.

## Generation-side source substitution: reported, not changed

`api/cron/generate-sky-placements.ts` still sends South Node source lookup to
the opposite North Node file. No generator code was changed in this pass.

The eleven signs with no dedicated South Node placement source file are:

- Aries
- Taurus
- Gemini
- Cancer
- Virgo
- Libra
- Scorpio
- Sagittarius
- Capricorn
- Aquarius
- Pisces

`packages/astro-knowledge/data/placements/sign/south-node-leo.json` is the sole
dedicated source. The current generator branch nevertheless substitutes the
opposite North Node path for every South Node request, including Leo, because
South Node is not in either earlier direct-source body set. Closing the content
gap requires owner-authored sources for the eleven signs above; switching the
generator to those sources (and the existing Leo source) remains a separate,
explicitly reviewed content change.

## Count reconciliation

- Production identifier quarantine before: 3,328.
- Production identifier quarantine after regeneration: 3,328 (3,216 catalog
  gaps, 28 surface-permission gaps, 60 evidence-empty, 24 unmapped shapes).
- Count change: zero. The eleven Sky South Node identifiers had already left
  the quarantine when the unsafe North Node substitution made them appear
  resolved. This correction changes their canonical target and doctrine, not
  their resolved/unresolved status.
- Catalog readable objects: 5,166 -> 5,212.
- Catalog unreadable baseline: 736 -> 690.
- Explanation: recognizing the governed V9 `Copy` field made exactly 46 V9
  objects readable. No approval, serving, or provider state changed.

The adapter is corrected. The generation-side source substitution is not.

## Subsequent shipping-safety correction

Later on 2026-08-15, before deployment, the shipping review removed the
generation-side substitution as well. The generator, cron provenance, and
reader boundary now agree on direct South Node sources. South Node in Leo uses
the existing owner-reviewed file. The other eleven signs return
`missing-source` before a provider call and remain unavailable until their own
sources are authored. No North Node prose is converted into South Node copy.
