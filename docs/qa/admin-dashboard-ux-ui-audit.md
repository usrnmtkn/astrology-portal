# Admin Dashboard UX/UI Audit

Date: 2026-07-16

## Scope

Audited the Content Studio dashboard surfaces:

- Studio Home
- Articles
- Exact Content
- Composite Review
- Templates
- Slots
- Vocabulary & Phrases
- Fallback Hooks
- Surface Map
- Review Queue
- Connection
- App Behavior
- Release Notes

## Findings

### Color Semantics Were Overloaded

Several unrelated states used similar accent colors. Primary actions, selected filters, reviewed rows, online API state, and source-map readiness could all read as the same kind of success/action. This made it hard to tell whether a control was clickable, selected, healthy, or warning-like.

Standard applied:

- Blue: primary action, selected navigation, selected filters, reviewed/reader-ready state.
- Green: live/online/success state.
- Amber: draft, needs review, fallback preview, warning.
- Red: danger, error, fallback needed.
- Gray: neutral, secondary, archived, disabled.

### Button Hierarchy Was Inconsistent

Some secondary actions used strong color, some primary actions looked neutral, and import/export/download controls competed with create/save actions.

Standard applied:

- Default buttons are neutral.
- Create/save/open-primary actions use blue.
- Publish/live actions use green.
- Delete/archive/destructive actions use red.
- Download/export/reset/source-secondary actions use neutral.

### Inputs And Selects Were Visually Uneven

Form fields varied by page in height, radius, background, font weight, and focus treatment. Search shells and standard inputs also read differently despite serving the same role.

Standard applied:

- Inputs, selects, textareas, search shells, title fields, metadata fields, and status selects share the same background, border, radius, font, minimum height, placeholder color, and focus ring.
- Labels use the same uppercase mono style and muted color.
- Disabled controls are visually subdued and use the same cursor behavior.

### Segmented Controls And Tabs Needed One Contract

Status pills, fallback section filters, vocabulary tabs, lunar filters, template tabs, and source-map filters used different active treatments.

Standard applied:

- Inactive segmented controls are neutral.
- Active/selected/pressed segmented controls use blue.
- Count badges remain neutral unless inside the selected control.
- `aria-selected`, `aria-pressed`, and `.active` are treated consistently.

### Status Pills Needed Release-State Meaning

Reviewed and live were previously visually close. Draft and needs-review also competed with neutral filter styles.

Standard applied:

- `LIVE` is green.
- `REVIEWED` and reader-ready are blue.
- `DRAFT` and needs-review are amber.
- Error and fallback-needed are red.
- Archived is gray.

### Popovers And Menus Needed Standard Surface Styling

Create menus, drawer toolbars, and sticky editor footers used custom backgrounds and shadows that felt separate from the admin system.

Standard applied:

- Popovers and drawer toolbars now use the same dark surface, border, radius, and shadow.
- Menu items use neutral hover states and do not rely on bold text for hierarchy.

## Changes Made

- Added a final admin UX/UI standard component layer in `apps/admin/src/admin.css`.
- Standardized semantic color tokens for admin controls.
- Normalized buttons, forms, focus states, segmented controls, popovers, nav, status pills, table headers, code pills, and warning surfaces.
- Preserved existing page structure to avoid risky large markup rewrites.

## QA Checks

Run:

```bash
npm run qa:admin-report
npm run qa:form-typography
npm run qa:css-audit
```

Expected:

- Admin flows pass.
- No form typography blockers.
- CSS audit may still report historical hardcoded color/font declarations in older rules, but the final component layer should win visually for dashboard controls.

## Follow-Up Watchlist

- Replace older duplicated CSS blocks with component classes once the dashboard component is split into smaller files.
- Convert repeated ad-hoc action groups into explicit component classes: primary, secondary, success, danger.
- Add visual regression snapshots for each admin page after the final visual direction is approved.

## Form Workspace Follow-Up — 2026-08-26

The Content Studio editor forms were reviewed again at desktop, narrow-drawer,
and mobile sizes. The follow-up found that long-form inputs had too little
hierarchy, publishing metadata created an unnecessarily tall single column,
and the save/review/publish controls disappeared below long related-content
workspaces.

Changes applied:

- Summary and body fields now use distinct editing heights so short framing
  copy and long-form prose no longer look interchangeable.
- Summary and body fields show live word and character counts.
- Technical publishing and routing fields use a two-column desktop layout and
  return to one column on mobile.
- The editor action bar remains visible while the form scrolls and reports
  saved, unsaved, new-draft, and saving states.
- Review and publish actions have distinct semantic treatments while Save
  remains the primary draft action.
- Form controls have larger targets, clearer hover/focus/disabled states, and
  more compact mobile drawer chrome.

Regression coverage now checks the sticky action bar, saved/unsaved state, and
field metrics in the existing Content Studio editor flow.
