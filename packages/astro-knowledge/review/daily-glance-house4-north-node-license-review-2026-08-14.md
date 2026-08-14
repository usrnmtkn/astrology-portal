# Daily Glance house-4 / North-Node scene-license review

Date: 2026-08-14  
Status: SUPERSEDED BY OWNER RULING
Serving effect: none  
Writer effect: the exact revised fields are approved in
`daily-glance-house4-north-node-owner-ruling-2026-08-14.md`

This proposal is retained as review history. Its proposed meanings are not
operative and must not be treated as approved; the narrower owner ruling is the
canonical authority.

## Target calculated context

- Base Daily Glance key: `conjunction/north-node`
- Transit: Moon conjunct natal North Node
- Transit sign: Virgo
- Transit house: 4, only when birth-time-derived houses are reliable
- Natal North Node sign and house remain independent calculated inputs; this
  proposal does not assume either value.

The existing `scene-license/transit-sign/moon-virgo/v1` already licenses the
manner `check details` and `responds by trying to make the feeling useful or
correctable`. This review asks only for the missing aspect mechanism and
house-4 arena.

## Source audit

### Aspect mechanism evidence

1. `authored/transit-aspect/moon/north-node/conjunction` is approved reader
   copy dated 2026-07-28. Its narrow claims include:

   - a normally overlooked possibility can feel newly welcoming;
   - a barely admitted plan can suddenly feel worth protecting;
   - the short-lived feeling is useful for noticing, not necessarily deciding.

   Its migrated approval metadata is `owner_signoff_untraced`. The scene
   compiler does not currently accept authored transit rows as an executable
   mechanism tier.

2. `data/pairs/moon-nodes.json` supports the distinction between unfamiliar
   and wrong, but its status is `DRAFT`; it grants no executable permission.

3. `data/planetary/lunar-nodes.json` is reviewed planetary meaning, but it is
   broader than the exact Moon conjunction and cannot establish the compound
   behavior by itself.

Owner decision required: either approve the authored transit row as evidence
for this exact scene license or require a new approved LL aspect record. No
source promotion is inferred here.

## Proposed aspect license

License ID: `scene-license/aspect/moon-conjunction-north-node/v1`

Scope:

```json
{
  "type": "aspect",
  "transitPlanet": "moon",
  "aspect": "conjunction",
  "natalPoint": "north-node"
}
```

Proposed normalized meaning:

```json
{
  "domains": [],
  "roles": [],
  "settings": [],
  "objects": [],
  "actions": [
    "notice an unfamiliar possibility",
    "return attention to a plan they have barely admitted they want"
  ],
  "behaviors": [
    "treat a temporary emotional opening as information rather than a decision"
  ],
  "consequences": []
}
```

Approval fields remain:

```json
{
  "status": "review_needed",
  "inheritsSourceApproval": false,
  "ownerApproved": false,
  "writerEligible": false,
  "renderEligible": false
}
```

## House-4 evidence

The owner-approved LL row `4th house` describes:

- private life;
- home;
- family atmosphere;
- memories and roots;
- the private stability maintained when nobody is watching.

The existing approved `house/4` Daily Glance card is reader copy, not a scene
license. Its approval does not automatically approve normalized grants.

## Proposed house license

License ID: `scene-license/house/4/v1`

Scope:

```json
{
  "type": "house",
  "house": 4
}
```

Proposed normalized meaning:

```json
{
  "domains": ["private life", "home", "family"],
  "roles": ["family member"],
  "settings": ["home"],
  "objects": [],
  "actions": ["address a postponed problem in private life"],
  "behaviors": [],
  "consequences": []
}
```

Approval fields remain:

```json
{
  "status": "review_needed",
  "inheritsSourceApproval": false,
  "ownerApproved": false,
  "writerEligible": false,
  "renderEligible": false
}
```

## Ruling form

The owner may approve, revise, or reject each field independently. Approval of
these semantic licenses would authorize an offline writer packet only. It
would not approve reader copy and would not enable the contextual override
registry for serving.

### Aspect license ruling

- Evidence source decision:
- Actions:
- Behaviors:
- Consequences:
- Owner-approved for writer use: yes / no

### House-4 license ruling

- Domains:
- Roles:
- Settings:
- Objects:
- Actions:
- Owner-approved for writer use: yes / no

### Serving-copy ruling

No serving-copy ruling is requested in this document. A complete contextual
headline and body require a separate exact-wording approval.
