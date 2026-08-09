# Automated Report Fulfillment Plan

**Status:** Draft for owner approval
**Last updated:** 2026-08-09
**Owner direction (2026-08-09):** purchased personalized reports must fulfill without per-report human review; the system must handle hundreds of orders.

## 1. The governance change, stated precisely

The existing regime (exact-wording owner approval before anything reaches a reader) remains fully in force for **shared app content**: cards, articles, authored rows, templates, doctrine tables, and anything served to more than one user.

For **purchased personalized reports**, control moves from approving outputs to approving the system. The owner's authority is exercised through five instruments, each already built or specified:

1. **Canonical prompts** — owner-ruled, version-pinned. A report is always generated from an exact, owner-approved prompt version. Changing a prompt requires owner sign-off and bumps the version; the version is recorded on every delivered report.
2. **Validators** — the owner's rules made mechanical: fact lock, possibility language with the scenario-block exception, DO-NOT-ASSUME, specificity ceiling, density and lexical budgets, banned vocabulary per domain, status-neutrality, no-persona, horizon-contract structure checks, Saturn-return gating, calendar-year-review boundaries. Hard gates, not warnings, in the fulfillment path.
3. **Fact-lock verification** — every attribution line and date in the output is checked against the frozen calculation bundle. An astrology error is a hard fail, mechanically detected.
4. **Automated judge** — a scoring pass against a rubric distilled from the owner's v1→FINAL review cycles (the named defect categories: astrology/chronology, factual traceability, vagueness, unnatural phrasing, repeated generated syntax, emotional temperature beyond what the astrology supports). Below-threshold units regenerate. The judge is calibration-evidence-driven: it is tuned on the owner's recorded accept/reject decisions, and never edits prose itself.
5. **Sampled audit** — the owner reviews a fixed sample (e.g. 5% weekly, plus the first N reports of any new domain, horizon, or prompt version). Audit findings become validator rules or prompt amendments, not one-off edits. This is how the system keeps learning her standard without her standing in the delivery path.

**Draft ruling for owner approval (verbatim, to be recorded in the phrasebank on approval):**

> Purchased personalized reports are fulfilled automatically. I approve the generation system — the version-pinned canonical prompts, validators, fact-lock, judge rubric, and audit protocol — rather than each output. A report that passes all gates is delivered without my review. My exact-wording approval regime continues to govern all shared app content, the calibration corpus, and every change to the prompts, validators, rubric, and audit protocol themselves.

## 2. The fulfillment pipeline

```
purchase (Stripe Checkout)
  → webhook → entitlements row (user, product, horizon, domain, window)
  → envelope created (user_reports) + consent/birth-data check
  → facts computed once per (user, window), frozen, engine-stamped
  → per-domain factor selection → manifestation-set resolution
  → WRITER CHAIN (three calls per unit or unit group):
      1. DRAFT    — canonical prompt version + facts + manifestation sets + owner exemplars
      2. CRITIQUE — separate call reviewing the draft against the owner defect checklist;
                    outputs named defects with locations, or "no defects"
      3. REVISE   — edits only the named defects, obeys the stop rule, leaves strong copy alone
  → VALIDATOR GATES (hard) → fail: re-enter chain with failure context, max 3 attempts
  → FACT-LOCK VERIFICATION (hard) → fail: regenerate
  → JUDGE THRESHOLD → below: regenerate, max 2 attempts
  → all green: status LIVE, delivered (in-app report view + email notification)
  → sampled-audit queue receives its percentage
  → exception queue receives anything that exhausts retries
```

Operational properties: end-to-end target minutes, not hours; retries carry the specific failure back into the regeneration prompt; every delivered report stores prompt version, facts hash, validator results, judge scores, and attempt count for auditability.

**The writer chain is the owner's editing process, automated.** The critique call's checklist is the owner's named defect categories (astrology/chronology, factual traceability, vagueness, unnatural phrasing, repeated generated syntax, emotional temperature beyond the astrology, keyword stacks, density violations) with owner before/after examples pasted in. The revise call receives the draft plus only the named defects and is bound by the stop rule: it may not rewrite sentences the critique did not name. Critique returning "no defects" skips the revise call. Generation proceeds section by section (each unit receives only its season's facts and its factors' manifestation sets) rather than whole-report-at-once; use the strongest available model for all three calls. No model training or fine-tuning is involved anywhere: draft, critique, and revise are ordinary API calls whose prompts are owner-editable text files. The audit loop's before/after findings feed the critique checklist's example library, which is how report quality continues to rise without system changes.

## 3. The exception queue (not a review queue)

Human attention is reserved for reports that fail out: exhausted retries, birth-time-unknown degradations needing a judgment call, consent problems, calculation anomalies flagged by the drift monitor. Expected volume at steady state: a small percentage. The buyer sees "your report is being prepared" with a delivery-time promise sized to include this path. This queue is triage, not editing — the standard fixes are regenerate-after-prompt-fix or refund, never hand-editing a single customer's prose (hand edits don't scale and bypass the system the ruling approves).

## 4. Missing infrastructure to build

1. **Billing**: Stripe Checkout + customer portal; products = (report type × horizon) SKUs; webhook → `entitlements` table (RLS: owner-read, service-write) → envelope trigger. Refund path revokes access.
2. **Orchestration**: a fulfillment worker (queue on the envelope table or a job runner) executing the pipeline with retries, idempotency, and status transitions the app can display ("preparing" → "ready").
3. **Judge runtime**: extend the existing judge scripts into a fulfillment-path judge with the report rubric; calibrate on the recorded v2–FINAL review decisions; owner signs off on the rubric and threshold before launch.
4. **Delivery**: report view route gated by entitlement (Phase F renderer); email notification; optional PDF later.
5. **Dashboards**: order volume, pass rates per gate, retry rates, judge score distributions, exception-queue depth, audit findings — the owner's window into the system she now governs.
6. **Cost controls**: per-report token budget, provider failover, generation kill-switch.

## 5. Launch sequence

1. Owner approves the §1 ruling and the judge rubric/threshold.
2. Build billing + orchestration + judge gate (one Codex phase; prompt to be written when the report-generation PR lands).
3. **Shadow launch**: fulfill 10–20 real charts end-to-end automatically; owner audits 100% of these (this is rubric calibration, not per-report review — the audit output is rule changes).
4. Thresholds tuned; audit sample drops to steady-state percentage; public launch.
5. Standing rhythm: weekly sample audit; every prompt/validator/rubric change is an owner-approved versioned release.

## 6. What this preserves

The owner's voice enters every report through the calibration corpus and canonical prompts; her judgment enters through the rubric and validators; her ongoing control lives in versioned system changes and the audit loop. What is removed is only her presence in the delivery path of each individual report — which is exactly what cannot scale, and exactly what the week of v1→FINAL work made removable: every defect she caught became a named, mechanical rule. That review cycle was the training run for this system.
