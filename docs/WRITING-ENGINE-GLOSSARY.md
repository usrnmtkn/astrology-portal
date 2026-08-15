# Writing engine glossary

Words that mean something specific in this codebase. Use these when you prompt
and there is no ambiguity about what you are asking for.

Where a term is a real identifier in the code, it is shown in `code font`.
Where it is a conversational label with no code behind it, that is said plainly.

---

## The big picture, in one line

**One governed kernel, many surface writers.** Everything shares evidence,
provenance and validation. Each surface owns its own prose decisions.

```
canonical ID -> evidence resolver -> governed packet -> surface strategy
  -> planner -> writer -> shared validation + surface validation
  -> advisory Reader Judge -> optional revision -> revalidation -> PENDING OWNER
```

---

## Naming the parts

| Say this | Means | Where it lives |
|---|---|---|
| **the kernel** | the shared, non-negotiable machinery: resolver, packet, gates, validation | `src/astro-writing/` |
| **the catalog** or **the index** | the 12,855-object canonical knowledge index | `packages/astro-knowledge/generated/knowledge-index.json` |
| **the resolver** | turns a canonical ID into governed evidence | `knowledge-resolver.js`, `buildPacket()` |
| **the packet** | the bounded, hashed evidence bundle handed to a model | the return of `buildPacket` |
| **the bridge** or **the adapter** | translates old production IDs into canonical IDs | `productionEvidenceAdapter.cjs` |
| **the pre-call gate** | the last check before any billed call | `productionPreCallGate.cjs`, `knowledgeEvidenceGate.mjs` |
| **surface strategy** | the per-surface prose contract | `surfaceStrategies.mjs` |
| **the voice evidence index** | examples of your sentence logic, retrieved for a surface | `phrase-resolver.js` (was "phrase index") |

Note: "phrase index" is the old name and still appears in filenames. **Voice
evidence index** is the term to use — the goal is not phrase reuse, it is
retrieving how you move from situation to consequence to useful next move.

---

## Canonical ID

The single naming scheme. Everything joins on this.

```
<kind>/<subject>/<object>/<relation>

transit-aspect/saturn/mercury/conjunction
natal-aspect/mars/venus/trine
placement-sign/chiron/aries
house-overlay/venus/4
transit-house/saturn/6
```

If two stores disagree about the ID, they cannot be joined and the content is
invisible. That was the original problem.

---

## Authority class — *how much a piece of evidence is trusted*

Derived from **provenance**, never from a `status` field. Six values, exact
strings:

| Class | Meaning |
|---|---|
| `owner-approved-prose` | you wrote it or explicitly approved it. Usable as voice. |
| `factual-evidence` | astrological fact from a verified source. Usable as meaning. |
| `voice-exemplar` | shows how you write. Usable as style, not as fact. |
| `negative-example` | shows what not to do. |
| `machine-proposal` | a model wrote it. Audit material, never prompt context. |
| `unverified` | mechanism reference only, never allowed to frame a card. |

**Source approval never inherits into copy approval.** A book being a
legitimate source does not make a sentence derived from it approved.

---

## Surface permission — *where a piece of evidence may go*

Exact strings: `friends-transit`, `friends-synastry`, `you-transit`,
`you-natal`, `sky`, `daily`, `synastry`, `composite`, `doctrine-only`,
`serving-source-only`, plus `<surface>:mechanism-reference`.

`doctrine-only` means it can inform reasoning but can never reach a reader.
Fail closed: a surface with no declared permission gets nothing.

---

## Temporality — *what tense the material licenses*

`temporary-window` (a transit), `lifelong-pattern` (natal),
`standing-between-two-people` (synastry).

Natal material may explain the mechanism of a transit but may never supply its
framing. A transit is something happening now, not who someone is.

---

## The three kinds of knowledge — never interchangeable

1. **Astrological truth** — what the placement means and what the source supports.
2. **Scene permission** — what concrete life details are licensed.
   `house -> licensed concept -> allowed realization -> causal guard -> provenance`
3. **Voice evidence** — how you turn material into prose.

A phrase from an approved horoscope is not astrological evidence. A house
license is not a writing template. A source interpretation is not
reader-facing copy.

---

## Judge vs gate — the distinction that matters most

| | **Deterministic gate** | **Reader Judge** |
|---|---|---|
| What it is | code, fixed rules | a model reading the draft |
| Authority | **blocks** | **advises only** |
| In code | `validateCopy.mjs`, `friendsTransitDeterministic.cjs` | `readerJudge: { authority: "advisory-only", mayBlock: false, mayRewrite: false }` |
| Can it stop a publish? | yes | no |
| Can it approve? | no | no |

**Only deterministic checks block. Judges advise. Nothing a model says grants
approval.**

Say **"the gate"** when you mean the hard rules. Say **"the Reader Judge"** when
you mean the advisory read. They are not the same thing and asking for one when
you mean the other changes what gets built.

Still outstanding: `api/cron/generate-sky-aspects.ts` auto-publishes at judge
score 3, and `report-fulfillment.ts` blocks on judge verdict. Both contradict
the rule above and are on the list to change.

---

## Approval states

| State | Meaning |
|---|---|
| `PENDING OWNER` | written, not approved, cannot serve |
| `REVIEWED` | passed review, still not serving |
| `owner-approved` / `exact_owner_approved` | you approved it, quotable as your voice |
| `runtimeEligible: false` | approved but deliberately not serving yet |
| serving-eligible | actually reaching readers |

These are separate gates in sequence. Approved does not mean serving.

---

## Guardrails you can name

| Say this | Means |
|---|---|
| **fail closed** | on doubt, refuse rather than guess |
| **the drift freeze** | `test-writing-kernel-drift.mjs` — no new file may call a provider, define its own `buildPacket`, or load example prose. Allowlist is shrink-only. |
| **the quarantine** | `config/production-identifier-quarantine.json` — known-failing IDs, shrink-only |
| **stale index** | `KNOWLEDGE_INDEX_STALE` — corpus changed without a rebuild; halts before billing |
| **the ledger** | billed-call log with an authorization cap, zero retries, stop on first failure |
| **impossible aspect** | `aspectPossibility.cjs` — cannot occur in that chart kind |

---

## Useful phrasings

- "Add this to the catalog as `owner-approved-prose`, permission `sky`" — precise.
- "Promote these to serving" — the approval step, not the writing step.
- "Run the gate on this" — deterministic validation.
- "What does the Reader Judge say?" — advisory read, no authority.
- "This is doctrine-only" — informs reasoning, never reaches a reader.
- "Rebuild the index" — `build-knowledge-index.mjs --write`, needed after any
  corpus edit.
- "Authorize N calls" — required before any billed run. I will not call a
  provider without it.
