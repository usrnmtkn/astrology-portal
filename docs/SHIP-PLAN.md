# Shipping the writing engine

The engine is built. This is the plan for putting it in front of readers, in
stages, each one reversible.

**Definition of done for the whole thing:** every Sky card is written from
governed evidence, and nothing reaches a reader without your approval. Five
stages. Only stage 1 is on the critical path today.

---

## Stage 1 — Canary 0. Deploy and prove the kernel loads.

**Prompt change:** none. Prompt bytes are byte-identical at canary 0; the gate
is allow/deny only.

**Reader-visible change in the deployment:** the placement blackout. 19 legacy
bases and 1 topper stop rendering because they carry the old `auto-publish`
gate. Replacements generate as drafts for your review. Canary 0 does not cause
or reverse this boundary; the deployed reader/writer contract does.

**Source-safety prerequisite:** South Node may never borrow opposite North Node
prose. The existing South Node in Leo source is used directly. The other eleven
signs have no source file and fail closed before billing; the cron skips them
and continues to eligible candidates.

Steps, from `docs/runbooks/sky-canary-rollout.md`:

1. Merge a reviewed, clean release PR to `main`; let the Vercel Git integration
   deploy that exact commit. Never deploy this dirty feature worktree directly.
2. `npm run smoke:writing-kernel` against the deployed bundle. This is the
   whole point of the stage — it proves the resolver can load the index in the
   serverless environment, which no local test can prove.
3. Check the sky-aspect cron logs for `KNOWLEDGE_INDEX_MISSING`. This tells you
   whether that cron has been failing since it was migrated.
4. Set `WRITING_KERNEL_GOVERNED_SURFACES=sky`, canary percent 0.
5. Watch one full cron cycle. The 2026-08-15 snapshot suggests roughly
   `requested 4, candidates 151, generated 4, needsReview 4`, but source-gap
   skips and database changes must be reported rather than forced to fit it.

**Done when:** the smoke passes and one cron cycle completes with no gate
failures.

**Rollback:** canary 0 removes governed evidence from prompts after the
environment change redeploys. It does not restore legacy placement visibility
and it does not bypass the gate. A gate or reader-boundary regression requires
rolling back the deployment to the last known-good `main` commit.

**If the smoke fails,** the bundle is still missing something the resolver
reads. That is the finding this stage exists to produce, and it costs one
deploy rather than a reader-visible incident.

---

## Stage 2 — Canary 10. The first governed prose.

Prerequisite: stage 1 clean for a full cycle.

Set canary percent to 10. The bucket is a deterministic hash of the content key,
so the same cards stay in the cohort run to run. A card is not simultaneously
governed and ungoverned: compare the selected 10% with the 90% control cohort
and with preserved pre-canary artifacts. Treat target mix as a confounder.

**What to look for:** not "is it better" but "is it different in the way we
expect". Governed cards should carry more specific astrological grounding. If
they read the same, the evidence is not reaching the writer and something is
wrong upstream. If they read worse, that is a real signal and worth stopping on.

**Done when:** you have read enough governed cards to have a view.

**Rollback:** canary percent 0.

---

## Stage 3 — Widen. 25, 50, 100.

One step per review, no fixed schedule. At 100, every Sky card is written from
governed evidence.

Live cohort data is useful but does not replace an identical-target parity run.
The bounded parity run remains the cleanest way to isolate the prompt change;
it still requires separate billed-call authorization.

---

## Stage 4 — The other surfaces.

Sky is the only surface currently in `MIGRATION_READY_SURFACES`. Promoting
another one requires:

1. Its surface strategy declared in `surfaceStrategies.mjs`.
2. Its validation profile real, not a label — the placement register work is
   the template for what "real" means.
3. Its identifiers proven against `test-production-identifier-coverage.mjs`.
4. The same canary sequence, from 0.

Likely order by readiness: **you-transit** and **you-natal** first (identifiers
already largely resolve), then **synastry** and **composite** (3,216 of the
3,328 quarantined identifiers are catalog gaps in these namespaces, so they need
content before they need wiring), then **reports** last because they are the
paying path and a stricter gate turns a failed job into a terminal exception
with money already spent.

---

## Stage 5 — Close the content gaps.

Independent of the rollout, and can run in parallel at any point:

- 11 South Node sign sources — Aries, Taurus, Gemini, Cancer, Virgo, Libra,
  Scorpio, Sagittarius, Capricorn, Aquarius, and Pisces
- 12 Midheaven sign entries and the corresponding IC meaning work. Axis
  geometry can identify the opposite sign, but IC meaning cannot inherit
  Midheaven prose.
- A Lilith phrasebank file — the only one of the four bodies without one
- 78 Lilith lived-review records to promote into the catalog
- An angles article
- 11 impossible composite phrasebank objects to delete
- `sky-aspect/*` wording approval — 198 records sitting at `unverified`
- 3,216 catalog gaps, almost all Chiron/Lilith/node/angle combinations in
  synastry and composite

These do not block eligible Sky targets in stages 1-3. The eleven South Node
targets remain ineligible and fail closed until their own sources exist.

---

## What could still go wrong, and what it would look like

| Signal | Means | Do |
|---|---|---|
| Smoke fails with `KNOWLEDGE_INDEX_MISSING` | bundle still incomplete | add the missing path, redeploy — no reader impact |
| Cron 500s at canary 0 | a gate is rejecting real production input | read the error name; return prompt canary to 0, and roll back the deployment if the gate itself is broken |
| Governed cards read the same as ungoverned | evidence is not reaching the writer | check `governedPromptEnabled` and packet size for a real card |
| A quarantine or baseline count moves unexplained | usually a symptom, not a win | trace it before accepting — twice now this was the only visible sign of a real bug |
| Placement section stays empty | the review backlog is not being worked | 20 legacy rows plus new drafts; promote from the admin queue |

---

## Where the real risk sits

Both code and content can fail. The kernel is designed to fail closed, but the
canary controls prompt selection only, and environment rollback requires a
redeploy. The reader-boundary change is independent of the canary.

The risk is in **content that is present but wrong**, because that fails silently
and looks like success. Three examples from building this: 2,368 owner-approved
rows silently dropped by a loader, a whole store unreadable because its column
name was not listed, and South Node cards about to be written from North Node
doctrine. Each was invisible until a number moved and someone asked why.

So the habit that matters after shipping is the same one that mattered while
building: **when a count changes and you did not intend it, find out why before
accepting it.**
