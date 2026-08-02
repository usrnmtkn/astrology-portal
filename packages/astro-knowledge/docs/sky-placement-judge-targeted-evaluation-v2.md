# Sky Placement judge targeted evaluation v2

Status: blinded directional evaluation. No promotion capability and no runtime or governed-content mutation.

## Why v2 exists

The first A/B run found useful differences in natural-language diagnosis, but its approved set contained second-person Current Sky examples while the rubric prohibited second person. That conflict made the first run unsuitable as clean evidence of rule enforcement.

V2 removes the contradiction:

- Active `sky.placement.*` golds use collective language in every generated slot, including moves.
- The original owner-approved second-person versions remain intact in `voice/tldr-astro/fixtures/sky-placement-historical-second-person.json`.
- Historical originals are explicitly excluded from generation evidence and judge gold evidence.
- The active linter no longer grants the gold set a legacy second-person exemption.
- The judge states that otherwise-strong copy containing one prohibited pronoun must score below 3.

## Targeted frozen set

The eight cases produce 16 paired calls:

1. A corrected collective Current Sky gold.
2. A clear owner-written paragraph that should be preserved.
3. Otherwise strong copy with exactly one prohibited pronoun in moves.
4. Otherwise strong copy with exactly one prohibited pronoun in the hook.
5. Unsupported Chiron-in-Taurus career framing.
6. Unnatural personification.
7. A strong paragraph weakened by an unnecessary second conclusion.
8. One merely imperfect line that should receive a proportional diagnosis, not a wholesale rejection.

Both treatments receive byte-identical prompts, the same owner vocabulary palette, the same corrected gold evidence, the same output schema, and the same rubric. The pair remains Terra-low versus Sol-xhigh. The active runtime remains `gpt-4.1-mini`.

## Commands

```sh
npm run test:sky-placement-judge-targeted
npm run plan:sky-placement-judge-targeted
```

Authorized live run:

```sh
TLDR_ALLOW_LIVE_LLM_JUDGE=1 \
TLDR_ALLOW_LIVE_LLM_CALIBRATION=1 \
npm run evaluate:sky-placement-judge-targeted:live
```

The runner writes another anonymous owner packet and a separate sealed model key under `out/sky-placement-judge-targeted-v2/`. This one-sample targeted comparison is still not promotion-grade. A model change requires separate multi-sample calibration and explicit owner authorization.

## Initial targeted run

The targeted run completed on 2026-08-02:

- 8 frozen fixtures.
- 16 successful paired API calls.
- Byte-identical prompts within every pair.
- Combined estimated API cost: `$0.2209`.
- Model key status: sealed.
- Promotion eligibility: false.

The anonymous owner packet is ready in the untracked output directory. No model identity should be revealed until the new blind review is complete.
