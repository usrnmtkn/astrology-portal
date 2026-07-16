# CSS Consistency Audit

Date: 2026-07-16

Trigger: Visual QA flagged inconsistent eyebrow labels, padding, and margins across the app. The attached Friends > Transits screenshot shows the symptom clearly: `TRANSITS`, `PERSONAL TIMING`, and `SHORT-TERM THEMES` use similar visual language but do not feel governed by one spacing/type contract.

Runnable audit:

```bash
npm run qa:css-audit
```

Latest generated report:

`test-results/css-audit/latest.md`

## Current Result

Status: Active design-system cleanup with automated guardrails.

Latest automated audit counts:

- CSS files scanned: 31
- Eyebrow/section-label rules found: 50
- Eyebrow rule mismatches: 0
- Hardcoded spacing declarations: 574
- Hardcoded font-size declarations: 145
- Hardcoded border-radius declarations: 162
- Hardcoded box-shadow declarations: 14
- Hardcoded non-token letter-spacing declarations: 20

Progress from the initial audit:

- Eyebrow mismatches dropped from 29 to 0.
- Non-token tracking dropped from 33 to 20.
- Non-token radius declarations dropped from 224 to 162 after adding `--radius-circle` and tokenizing common client-facing pill/circle radii.
- Non-token font-size declarations dropped from 247 to 145 after tokenizing repeated small uppercase client labels and the Calendar type scale.
- Calendar spacing debt dropped from 85 to 56 after tokenizing repeated gaps, simple padding, and common margins.

## Expected Eyebrow Contract

All eyebrow-style labels should resolve through one shared contract:

- Font family: `var(--font-label)`
- Font size: `var(--text-section-label-size)`
- Font weight: `var(--weight-semibold)`
- Line height: `var(--leading-label)`
- Letter spacing: `var(--tracking-label)`
- Text transform: `uppercase`
- Margin: `0`
- Padding: `0`

Canonical selectors that should share this contract:

- `.eyebrow`
- `.section-label`
- `.aspect-section-label`
- `.friend-section-label`
- `.placements-heading .eyebrow`
- `.lunar-selected-card__eyebrow`
- `.admin-eyebrow`
- `.admin-nav-section-label`
- `.article-eyebrow`

## Primary Findings

1. Eyebrow styles now have a shared effective contract.

The audit still finds 50 rules that mention eyebrow/section-label selectors, but the final effective styles now resolve to the same tokenized contract.

2. Spacing is still mostly local instead of semantic.

Highest hardcoded spacing debt:

- `apps/admin/src/admin.css`: 334 declarations
- `apps/web/src/styles/lunar-calendar.css`: 56 declarations
- `apps/web/src/styles/friends.css`: 57 declarations
- `apps/web/src/styles/sky.css`: 43 declarations
- `apps/web/src/styles/responsive.css`: 31 declarations
- `apps/web/src/styles/auth.css`: 21 declarations
- `apps/web/src/styles/aspects.css`: 14 declarations

This explains why card interiors and section gaps can still feel similar but not identical.

3. Font sizes are partly tokenized but Calendar and Admin still carry the most raw values.

Highest hardcoded font-size debt:

- `apps/admin/src/admin.css`: 134 declarations
- `apps/web/src/styles/lunar-calendar.css`: 0 declarations after the current cleanup pass

4. Radius usage is improved but still mixed.

Common client-facing circles and pills now use `--radius-circle` and `--radius-pill`. Remaining radius debt is mostly admin, Calendar, auth, and a few one-off large panels.

5. Shadow usage is small but should be named.

The audit finds 14 raw shadows, mostly Admin plus moon-disc rendering. Admin shadows should move to semantic elevation tokens; moon-disc shadows may remain as named visual-effect tokens.

## Screenshot-Specific Diagnosis

Surface: Friends detail, Transits tab.

Visible issue:

- Outer section label `TRANSITS` sits with its own page-level offset.
- Feature card eyebrow `PERSONAL TIMING` sits inside a large card with different internal padding.
- Section label `SHORT-TERM THEMES` appears closer to the card below and uses a different vertical rhythm.
- The transit row card uses a large white surface with internal padding that does not line up optically with the card above.

Likely CSS owners:

- `apps/web/src/styles/friends.css`
- `apps/web/src/styles/aspects.css`
- `apps/web/src/styles/app-shell.css`
- `apps/web/src/styles/card-systems.css`
- `apps/web/src/styles/responsive.css`

## Fix Contract

Add or confirm these semantic tokens:

```css
:root {
  --label-eyebrow-font-size: var(--text-section-label-size);
  --label-eyebrow-line-height: var(--leading-label);
  --label-eyebrow-tracking: var(--tracking-label);
  --section-label-margin: 0;
  --section-label-gap-after: var(--space-2);
  --section-stack-gap: var(--space-6);
  --surface-card-padding: clamp(22px, 3vw, 34px);
  --surface-card-padding-compact: var(--card-row-padding);
}
```

Create one shared rule:

```css
:where(.eyebrow, .section-label, .aspect-section-label, .friend-section-label, .lunar-selected-card__eyebrow, .admin-eyebrow, .admin-nav-section-label) {
  margin: var(--section-label-margin);
  padding: 0;
  color: var(--card-meta-color);
  font-family: var(--font-label);
  font-size: var(--label-eyebrow-font-size);
  font-weight: var(--weight-semibold);
  line-height: var(--label-eyebrow-line-height);
  letter-spacing: var(--label-eyebrow-tracking);
  text-transform: uppercase;
}
```

Then remove or narrow local overrides.

## Recommended Fix Order

1. Continue tokenizing repeated spacing on client-facing cards, rows, and filter controls.
2. Continue reducing Calendar spacing by naming remaining compound padding patterns.
3. Normalize remaining client-facing radii that are not true one-off geometry.
4. Audit Admin separately because it has the largest CSS debt and may need a denser admin-specific spacing/type scale.
5. Convert remaining raw shadows into elevation/effect tokens.
6. Keep Playwright visual captures for Sky, You, Friends detail, Calendar, Settings, and Admin at desktop/mobile widths.

## QA Acceptance Criteria

- `npm run qa:css-audit` keeps eyebrow mismatches at 0.
- The same label component looks identical across Sky, You, Friends, Calendar, Settings, and Admin unless a named modifier explains the exception.
- Card top padding, label-to-title spacing, and section-to-card spacing use semantic tokens.
- No new raw `letter-spacing: 0.14em`, `0.08em`, etc. values are introduced outside token definitions.
- Pill and circular UI shapes use `--radius-pill` and `--radius-circle`.
- The Friends > Transits screenshot state no longer shows visibly different eyebrow rhythm between `TRANSITS`, `PERSONAL TIMING`, and `SHORT-TERM THEMES`.
