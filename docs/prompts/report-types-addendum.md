# Prompt: Report types addendum (General + Work & Money deep-dive)

Copy everything below to Codex. It amends `docs/prompts/report-generation-implementation.md`; read that first, then this. If already mid-implementation, apply this as a scope amendment rather than restarting.

---

The product line now has two report types, each with its own canonical owner-ruled generation prompt. Model this as a second parameter, not a second pipeline.

## The two report types

**1. GENERAL** — the personalized report across all chart-earned life domains.
- Canonical prompt: `tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-OWNER.md` (required `REPORT_HORIZON` in {1_month, 4_months, 6_months, 12_months}).
- Deep 12-month rules: `tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md` (27-point standard).
- Reference implementation: `artifacts/marie-satori-year-ahead-2026-FINAL.md` (owner-authored final).

**2. WORK & MONEY DEEP-DIVE** — a separate paid product purchased in addition to the General report.
- Canonical prompt: `tldr-astro-phrasebank/TLDR-WORK-MONEY-DEEPDIVE-GENERATION-PROMPT-OWNER.md`.
- Reference implementation: `artifacts/marie-satori-work-money-2026-owner-v1.md` (owner-authored).
- Defining property: it re-runs factor selection against the COMPLETE calculated bundle, prioritizing work/money/business domains. It is never an excerpt or filter of the General report. Other domains enter only when they materially change the Work & Money story (e.g. a 4th-house eclipse that changes commute, hours, expenses, or which jobs remain practical).

## Engineering model

- Generator signature gains `report_domain` in {general, work_money} alongside `report_horizon`. One pipeline; the domain selects (a) which canonical prompt document is loaded verbatim as the ruling, (b) the factor-selection pass over the same frozen facts bundle, and (c) domain-specific validators.
- The facts bundle is computed once per (user, window) and shared: a user who buys both reports for the same window gets one calculation, two factor-selection passes, two envelopes. `user_reports.report_type` extends accordingly (e.g. `general_12m`, `general_1m`, ..., `work_money_12m`), or `report_type` + `report_domain` columns; pick the cleaner migration and say which.
- Deep-dive factor selection: score factors by domain relevance (work/money/business domain lists in the canonical prompt) rather than filtering the General report's chosen factors. A factor excluded from General can appear in the deep-dive and vice versa. Snapshot-test this property explicitly with the Marie fixture: the Work & Money reference includes the 4th-house eclipse through its commute/hours/expense consequences, and excludes the dating/spirituality material the General FINAL carries.
- Deep-dive-specific validators, additive to the general set: money-abstraction check (reject "abundance"/"scarcity"/"worth" as money analysis when not immediately translated to rate/hours/expenses/scope terms); isolated-one-liner formatting check (three or more consecutive single-sentence paragraphs that are questions or short declaratives triggers a warning, per the natural-paragraph rule); key-date format contract (DATE · TITLE · one sentence · attribution). The Work & Money key dates carry no category tags (WORK/SELF/etc.), since the whole report is the category; the General report keeps tags.
- The natural-paragraph formatting rule is currently ruled for the deep-dive only. Do not apply its validator to General; note in your summary that the owner may later promote it to global.
- Both types obey the shared invariants: coverage gate, specificity ceiling, life-status neutrality, involuntary change, chart-earned topics, planet logic, no persona, no em dashes, no "whether", multi-pass handling, density caps, governance, stop rule. Implement these once, shared.

## Extensibility

Design factor selection and prompt loading so a future deep-dive (e.g. Love, Home & Family) is: one new canonical prompt document + one domain-relevance list + optional domain validators. No pipeline changes. Note in your summary what adding a third domain would require.

## Governance reminder

Both reference implementations are owner-authored and serve as calculation contracts and voice evidence. You author no reader-facing prose. All generated units land `needs_review`.
