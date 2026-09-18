# Live app design system

The reader app keeps its visual source of truth in `apps/web/src/styles/theme.css`. Content Studio has a separate chrome system. Do not mix those palettes.

This stack copies DesignMD's *workflow*, not its brand catalog. DESIGN.md files, pattern specs, and installable blocks are useful because they stop agents from inventing tokens. Vercel and ElevenLabs pages on DesignMD are examples of that format (colors, type, spacing, component notes, restyleable sections). They are not a visual target for Sky, Calendar, You, or Friends.

Do not vendor DesignMD, Tailwind, or shadcn. Do not install marketing blocks (hero, pricing, testimonial) into reader routes. Keep the existing content system.

## Layers

| Layer | Lives in | Job |
| --- | --- | --- |
| Tokens | `theme.css`, `apps/web/src/ds/tokens.ts` | Named visual roles. No new raw values. |
| Primitives | `apps/web/src/ds/primitives.tsx` | `Stack`, `Inline`, `Box`, `Grid`, `Container`, `Text` |
| Components | `apps/web/src/ds/components.ts` | Existing reader controls: segmented tabs, pills, loading, appearance |
| Recipes | `apps/web/src/ds/recipes.ts` | Class strings for cards and rows. No JSX. |
| Patterns | `apps/web/src/ds/patterns.tsx` | `ReadingCard`, `Tabs`, `EmptyState`, `LoadingState` |
| Page templates | `apps/web/src/ds/page-templates.tsx` | `ReadingPage`, `ArticlePage` using established layout classes |
| Catalog | `apps/web/src/ds/catalog.ts` | Local `planLiveBuild`: pattern + block picks from this product |

Each layer may use layers below it. A primitive must not import a pattern.

The agent-readable file is `apps/web/DESIGN.md`. Generate it with `node scripts/generate-live-ds-design-md.mjs`. `--check` belongs in the CSS gate.

## How to add UI

1. Read `apps/web/DESIGN.md` and `docs/design-tokens.md`.
2. Resolve the rendered surface (Sky, Calendar, You, Friends, Learn) before choosing a register or card.
3. Call `planLiveBuild` in `apps/web/src/ds/catalog.ts` or follow `skills/tldr-astro-live-ds/SKILL.md`.
4. Reuse a recipe or pattern. If none exists, add the lowest layer that fits.
5. Put any new visual value in `theme.css` first. Run `npm run qa:css-audit`.

DesignMD MCP (`plan_build`, `search_patterns`, `get_block`) is optional editor tooling. If it is connected, use it only to study structure. Map every token back to `theme.css` before shipping.

## Existing CSS contract

Narrative copy uses `--font-body`, `--text-body`, `--weight-regular`, `--leading-body`, and `--tracking-body`. Titles use `--font-display`. Labels and pills use the shared label/UI tokens. `--font-glyph` is reserved for symbols.
