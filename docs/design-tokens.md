# Design Tokens

## Fonts

TLDR Astro uses two text faces plus one symbol face:

- `Newsreader` via `var(--serif)` and `var(--font-display)` for display copy and titles.
- `Geist Mono` via `var(--mono)`, `var(--font-body)`, `var(--font-ui)`, and `var(--font-brand)` for body copy, UI, data, labels, and the wordmark.
- `Noto Sans Symbols` via `var(--symbols)` and `var(--font-glyph)` for astrological glyphs only.

The TLDR Astro wordmark is `18px` Geist Mono, weight `600`, with `-0.01em` letter spacing.

## Base Styles

Body text, UI controls, labels, chips, metadata, and data values use Geist Mono. Display headings, page titles, card titles, row titles, and editorial names use Newsreader. Glyph rules remain optically tuned and should not be normalized to the text scale.

Shared card titles use `18px`. Navigation links use `16px`. Tiny uppercase labels use `11px`.

Repeated content cards use `--card-bg`, `--card-border`, `--card-radius`, and `--card-shadow`. Table-like card rows reuse `--table-shadow`, which aliases `--card-shadow` unless a view intentionally overrides the whole table surface. Feature cards use `--feature-card-shadow`; overlays and dialogs use `--overlay-shadow` / `--modal-shadow`; nav and pill controls use `--nav-rest-shadow` / `--control-shadow`; tooltip shadows stay on `--tooltip-shadow`.

Avoid adding one-off `box-shadow` values in feature CSS. Add or reuse a semantic shadow token in `theme.css` first.

## Spacing And Cards

Use the shared spacing primitives before local values:

| Token / Use | Value |
| --- | ---: |
| Inline glyph/data gap | `--inline-gap` / `6px` |
| Card list gap | `--card-list-gap` / `8px` |
| Card row gap | `--card-row-gap` / `12px` |
| Standard row padding | `--card-row-padding` / `16px 20px` |
| Compact row padding | `--card-row-padding-compact` / `12px 16px` |
| Form field padding | `--form-field-padding` / `18px` |
| Modal panel padding | `--modal-panel-padding` / `28px` |
| Mobile overlay padding | `--mobile-overlay-padding` / `18px 18px 22px` |
| Snapshot card padding | `--snapshot-card-padding` / `10px 16px` |
| Snapshot icon size | `--snapshot-icon-size` / `44px` |

## Type Scale

| Token / Use | Size | Face |
| --- | ---: | --- |
| Tiny caps label | 11px | Geist Mono |
| Compact metadata | 12px | Geist Mono |
| Dense data / metadata | 13px | Geist Mono |
| Description / meta | 14px | Geist Mono |
| Body / controls | 15px | Geist Mono |
| Nav link / primary button | 16px | Geist Mono |
| Card and row title | 18px | Newsreader |
| Small display title | 20px | Newsreader |
| Large fixed title | 24px | Newsreader |
| Page and hero display | `clamp(...)` | Newsreader |
