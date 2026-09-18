---
name: tldr-astro-live-ds
description: Build or extend TLDR Astro live-app UI from theme.css, DESIGN.md, and the live DS layers. Use when adding reader components, cards, patterns, or page shells, or when a DesignMD-style plan is requested for Sky, Calendar, You, Friends, or Learn.
---

# Live app design system

Use this skill for reader-app UI. Do not use Studio (`apps/admin/src/studio-ds`) tokens on Sky, Calendar, You, Friends, or Learn.

## Source of truth

1. `apps/web/src/styles/theme.css` — measured tokens
2. `apps/web/DESIGN.md` — agent-readable system; regenerate with `node scripts/generate-live-ds-design-md.mjs`
3. `docs/design-tokens.md` and `docs/live-design-system.md`

Do not copy Vercel, ElevenLabs, or other DesignMD brand palettes. DesignMD is a workflow: DESIGN.md + pattern specs + restyleable blocks. This product already has tokens, cards, and content.

## Layer rule

Tokens → Primitives → Components → Recipes → Patterns → Page templates.

Lower layers must not import higher layers. New work belongs in the lowest layer that fits. Keep one-off markup local until a second surface needs the same shape.

## Plan (local `plan_build`)

1. Name the route and renderer.
2. Read `planLiveBuild` in `apps/web/src/ds/catalog.ts`.
3. Pick an existing recipe (`readingCard`, `skyPlacement`, `aspectCard`, `transitCard`, `placementRow`).
4. If the brief asks for hero, pricing, testimonial, or a new type scale, stop. Those are catalog anti-patterns.

## Do not

- Add `h1`–`h6` or visible titles without the heading contract
- Hardcode color, spacing, radius, type, or shadow in component CSS
- Compress owner-authored copy to fit a card
- Import `@tryghost/shade`, Tailwind, shadcn, or DesignMD block implementations
- Mix Content Studio chrome into the reader theme
