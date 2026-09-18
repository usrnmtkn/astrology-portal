# Plan: first-party DesignMD-style MCP for Studio and the live app

Owner direction, 2026-09-18: keep our content system; do not vendor DesignMD, Tailwind, shadcn, Ghost Shade, or another brand’s palette. Copy DesignMD’s *agent workflow* (measured tokens, pattern specs, restyleable blocks, a plan that an editor can run).

This document is the build plan. It is not permission to restyle reader copy or to merge until asked.

## Why this exists

DesignMD’s MCP works because an agent can ask for a system and get **real tokens plus named sections**, instead of inventing purple UI. We already started that locally:

- Live: `apps/web/DESIGN.md`, `apps/web/src/ds/*`, `planLiveBuild()`, `skills/tldr-astro-live-ds/SKILL.md`
- Studio: `apps/admin/src/studio-ds/*`, `docs/studio-design-system.md`, black-and-white + green chrome

Agents still miss it. The skill is not mandatory, Studio has no generated `DESIGN.md`, `planLiveBuild` is a keyword match, and existing pages are still the copy-from source. An MCP only helps if the catalog is specific enough that `plan_build` returns **this product’s** recipes, files, and anti-patterns.

## Non-goals

- Do not call designmd.co or install their hero/pricing/auth blocks.
- Do not mix Studio chrome tokens into Sky/You/Friends, or reader tokens into Studio.
- Do not generate, compress, or approve astrology copy. Writer skill stays separate.
- Do not restyle Memory graph fonts/CSS.
- Do not add a new visible type scale or raw color in feature CSS. New values go in `theme.css` (live) or `admin-theme.css` (Studio) first.
- `install_block` must not write JSX that bypasses existing cards, heading contracts, or CSS audits.

## Architecture

One local MCP server, required `product` argument on every tool: `live` | `studio`.

```
brief
  → plan_build(product, brief)
  → DESIGN.md + pattern ids + block ids + files to touch + tests to run
  → get_pattern / get_block (full spec)
  → agent implements against recipes
  → certify (token + layer + css audit)
```

Catalog lives in git, not in the model:

| Product | Token source | Agent file | Layers | Catalog |
| --- | --- | --- | --- | --- |
| `live` | `apps/web/src/styles/theme.css` | `apps/web/DESIGN.md` | `apps/web/src/ds/` | `packages/tldr-ds-mcp/catalog/live/` |
| `studio` | `apps/admin/src/admin-theme.css` | `apps/admin/DESIGN.md` (new, generated) | `apps/admin/src/studio-ds/` | `packages/tldr-ds-mcp/catalog/studio/` |

Shared package: `packages/tldr-ds-mcp` (stdio MCP, Node, no network). Cursor config points at `node packages/tldr-ds-mcp/server.mjs` with the repo root as cwd.

## Tool list (DesignMD-shaped, first-party data)

| Tool | Job |
| --- | --- |
| `plan_build` | Brief → product, surfaces, tokens file, pattern/block ids, skip list, ordered file plan, required tests |
| `get_design` | Full DESIGN.md + palette notes (Studio: `neutral` / `green`; live: light/dark from theme) |
| `search_patterns` | Search catalog by job (tabs, list, empty, filters, article, sidebar) |
| `get_pattern` | Structure, spacing tokens, states, variants, anti-patterns, exemplar file paths |
| `search_blocks` | Search product sections (sky-placement-card, natal-aspect-filters, review-queue-command-bar) |
| `get_block` | Recipe class names, primitive/pattern imports, heading rules, nested-card rules |
| `certify` | Wrapper: layer import rules, DESIGN.md `--check`, `qa:css-audit` subset. Fail closed on raw values or mixed palettes |

No `install_block` that pastes a whole page. If we add it later, it only returns a **patch recipe** (which existing component to wrap, which class string, which test). Agents still write the product code.

## Pattern spec shape (what `get_pattern` must return)

Each pattern markdown/JSON record:

1. **When to use** (one sentence, product-specific)
2. **Surfaces** (`Sky`, `Natal Aspects`, `Review Queue`, …)
3. **Structure** (named regions, not pixels)
4. **Tokens** (only CSS variables that exist in that product’s theme)
5. **States** (empty, loading, error, selected) pointing at existing components
6. **Anti-patterns** (nested cards inside tab panels; marketing heroes on reader routes; `Close …` icon-button on labeled nav; compressing owner copy)
7. **Exemplar** (path + class names that already ship)

Live starter set: tabs, top-nav, list/card row, calendar, empty, loading, article, modal, filter. Explicit `use: null` for hero and pricing.

Studio starter set: page header, filter bar, data table, surface section, tab panel (connected), finder-on-canvas vs finder-in-panel, empty state, editor sheet, sidebar chrome (light/dark × palette).

## `plan_build` quality bar

Replace keyword `includes()` with:

1. Resolve **product** (required).
2. Resolve **surface** from route/page names in the brief (`Natal Aspects`, `Sky`, `Review Queue`). If ambiguous, return `ask` and do not guess register (the 2026-08-15 Sky/natal incident).
3. Pick blocks whose `surfaces` include that surface.
4. Apply **containment rules** as data, not prose-only:
   - Studio tab panel already owns a surface → inner filters stay flat unless the catalog marks an exception (Sky catalog filters).
   - Canvas finders (Natal Aspects) → `surfaceSection`.
   - Inner `admin-natal-source-card` inside a surface → flatten to dividers.
5. Return tests: `qa:css-audit`, the relevant source test (`test-admin-natal-aspect-sources`, live visual specs), heading contract if titles change.

## Phases

### 0 — Catalog and parity (no MCP process yet)

- Generate `apps/admin/DESIGN.md` the same way as live (`scripts/generate-studio-ds-design-md.mjs` + `--check` in `qa:css-audit`).
- Move/expand `planLiveBuild` into catalog records with the spec fields above. Add `planStudioBuild`.
- Put `skills/tldr-astro-live-ds/SKILL.md` and a new `skills/tldr-astro-studio-ds/SKILL.md` in `AGENTS.md` for UI work (not for reader copy).
- One live exemplar and one Studio exemplar actually imported from `ds/` (empty + loading, or Natal Aspect filters) so agents have something to clone.

### 1 — Local MCP server

- `packages/tldr-ds-mcp`: read catalog + DESIGN.md from disk; implement the tools; tests with fixture briefs (`Natal Aspect filters`, `Sky placement card`, `Review Queue`).
- Cursor MCP config in the repo (stdio, no secrets).
- Fail if `product` omitted or if a returned token is missing from the theme file.

### 2 — Certify and enforcement

- `certify` runs the same checks CI already has; MCP tests assert a brief that asks for a hero is skipped; a brief that asks for Studio green does not retoken the live app.
- Optional later: PR comment or agent step that a UI change must cite `plan_build` output.

### 3 — Only after 0–2 are used on real tasks

- Richer blocks (Calendar forecast/details chrome, Friends tabs, editor sheet).
- `install_block` as a recipe printer, still not a page generator.
- Do not connect DesignMD’s hosted MCP except as optional *study*; never as a token source.

## Success

An agent given “add a filters row to Natal Aspects” gets: live vs studio, canvas card not tab-panel nesting, `surfaceSection`, existing `AdminSelect`, no new colors, tests to run. An agent given “landing hero like Vercel” gets a skip list and a refusal, not a new stylesheet.

## Out of scope until the owner asks

Implementing the package, wiring Cursor MCP, or migrating all existing pages onto primitives. This plan is the sequence; Phase 0 can start on the current branch when you say to build it.
