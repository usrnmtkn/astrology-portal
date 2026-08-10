# Prompt: Report types addendum (General + Work & Money + Love & Connection deep-dives)

Copy everything below to Codex. It amends `docs/prompts/report-generation-implementation.md`; read that first, then this. If already mid-implementation, apply this as a scope amendment rather than restarting.

---

The product line now has three report types, each with its own canonical owner-ruled generation prompt. Model this as a second parameter, not a second pipeline.

## The two report types

**1. GENERAL** — the personalized report across all chart-earned life domains.
- Canonical prompt: `tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-OWNER.md` (required `REPORT_HORIZON` in {1_month, 4_months, 6_months, 12_months}).
- Deep 12-month rules: `tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md` (27-point standard).
- Reference implementation: `artifacts/marie-satori-year-ahead-2026-FINAL.md` (owner-authored final).

**2. WORK & MONEY DEEP-DIVE** — a separate paid product purchased in addition to the General report.
- Canonical prompt: `tldr-astro-phrasebank/TLDR-WORK-MONEY-DEEPDIVE-GENERATION-PROMPT-OWNER.md`.
- Reference implementation: `artifacts/marie-satori-work-money-2026-owner-v1.md` (owner-authored).
- Defining property: it re-runs factor selection against the COMPLETE calculated bundle, prioritizing work/money/business domains. It is never an excerpt or filter of the General report. Other domains enter only when they materially change the Work & Money story (e.g. a 4th-house eclipse that changes commute, hours, expenses, or which jobs remain practical).

**3. LOVE & CONNECTION DEEP-DIVE** — a separate paid product, same layering.
- Canonical prompt: `tldr-astro-phrasebank/TLDR-LOVE-CONNECTION-DEEPDIVE-GENERATION-PROMPT-OWNER.md`.
- Reference implementation: `artifacts/marie-satori-love-connection-2026-owner-v1.md` (owner-authored).
- Defining properties: relationship-status neutrality (must work for single, dating, partnered, separating, undefined, not looking; organized around the relationship experience, never around status); a three-tier factor-inspection system (direct love factors: Venus/Mars/Moon/Asc-Desc/5th-7th-8th rulers, houses, eclipses, SR signatures, profections; condition-changers: home, health/capacity, money, communication, career, distance, social circles; slow-planet relationship conditions with explicit per-planet non-assumptions); retrograde/eclipse relevance gates; sex-writing rules (concrete and sex-positive, never inventing dysfunction, infidelity, or fertility); banned vocabulary (soulmate, twin flame, your person); and the paid deep-dive rule (a quiet chart yields a shorter report; trust over page count). The prompt includes a Marie 2026 factor shortlist as inspect-then-gate verification data.
- The Love & Connection prompt's factor-tier structure is the template for how `domain-relevance` lists should be modeled generally: tiers with per-factor inspection notes and non-assumption lists, not flat keyword lists. Refactor the work_money relevance model to match if it was built flatter.

## Engineering model

- Generator signature gains `report_domain` in {general, work_money, love_connection} alongside `report_horizon`. One pipeline; the domain selects (a) which canonical prompt document is loaded verbatim as the ruling, (b) the factor-selection pass over the same frozen facts bundle, and (c) domain-specific validators.
- The facts bundle is computed once per (user, window) and shared: a user who buys both reports for the same window gets one calculation, two factor-selection passes, two envelopes. `user_reports.report_type` extends accordingly (e.g. `general_12m`, `general_1m`, ..., `work_money_12m`), or `report_type` + `report_domain` columns; pick the cleaner migration and say which.
- Deep-dive factor selection: score factors by domain relevance (work/money/business domain lists in the canonical prompt) rather than filtering the General report's chosen factors. A factor excluded from General can appear in the deep-dive and vice versa. Snapshot-test this property explicitly with the Marie fixture: the Work & Money reference includes the 4th-house eclipse through its commute/hours/expense consequences, and excludes the dating/spirituality material the General FINAL carries.
- Deep-dive-specific validators, additive to the general set: money-abstraction check (reject "abundance"/"scarcity"/"worth" as money analysis when not immediately translated to rate/hours/expenses/scope terms); isolated-one-liner formatting check (three or more consecutive single-sentence paragraphs that are questions or short declaratives triggers a warning, per the natural-paragraph rule); key-date format contract (DATE · TITLE · one sentence · attribution). The Work & Money key dates carry no category tags (WORK/SELF/etc.), since the whole report is the category; the General report keeps tags.
- The natural-paragraph formatting rule is currently ruled for the deep-dive only. Do not apply its validator to General; note in your summary that the owner may later promote it to global.
- Both types obey the shared invariants: coverage gate, specificity ceiling, life-status neutrality, involuntary change, chart-earned topics, planet logic, no persona, no em dashes, no "whether", multi-pass handling, density caps, governance, stop rule. Implement these once, shared.

## Extensibility

Design factor selection and prompt loading so a future deep-dive (e.g. Home & Family, Health & Capacity) is: one new canonical prompt document + one tiered domain-relevance model + optional domain validators. No pipeline changes. Love & Connection arriving as the third domain is the proof case; note in your summary whether it required anything beyond those three artifacts.

## Deep-dive validators, Love & Connection additions

Additive to the shared and deep-dive sets: banned-vocabulary check (soulmate, twin flame, divine union, "your person"); status-branching check (three or more "If you are single/partnered/..." constructions triggers a warning per the status-neutrality rule); sex-invention check (dysfunction/infidelity/pregnancy/fertility terms asserted rather than explicitly disclaimed); the natural-paragraph formatting check applies here as it does for work_money. Love & Connection key dates carry no category tags, same as work_money.

## Governance reminder

Both reference implementations are owner-authored and serve as calculation contracts and voice evidence. You author no reader-facing prose. All generated units land `needs_review`.
