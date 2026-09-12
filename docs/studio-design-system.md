# Studio design system

The Content Studio uses the shared tokens in `apps/web/src/styles/theme.css`, scoped by `.admin-dashboard`. Its only component stylesheet is `apps/admin/src/studio-system.css`. The old admin sheets and adapter are disconnected: they are not imported by the standalone app, lazy dashboards, or the new sheet. Existing class names remain as markup hooks, not as inherited styling.

`StudioControls.tsx` supplies native button, input, and textarea components; `AdminNativeControls.tsx` supplies native selects and single-chevron disclosures. All controls forward native attributes and refs. Existing editing, review, and publication handlers remain in their owning components. This replacement was explicitly requested on 2026-09-11 after the earlier adapter pass.

This is a desktop adaptation of the [reviewed design reference](https://www.figma.com/design/Bz33AN27vnzcl6ISZOqRd5?node-id=2-154), authorized on 2026-09-11. The reference provides tonal surfaces, type roles, control variants and shape hierarchy. Its layout board is unfinished. The primary, selected, neutral surface, outline and semantic colors were read directly from the reference’s color-style definitions. Desktop spacing and responsive layouts are adaptations, not a pixel-identical mobile screen export. Google Sans, Google Sans Text and Google Symbols were unavailable in the reference; Studio uses system sans-serif and its existing Lucide icons without adding external font dependencies.

## Verified palette

Values read from the design file on 2026-09-11. Light surface levels 1–5 intentionally share one color in the reference.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#EFF1EF` | `#191C1B` |
| Surface levels 1 / 2 / 3 / 4 / 5 | `#FAFDFA` | `#1D2523` / `#1F2B28` / `#21312D` / `#22332F` / `#233732` |
| Primary / on primary | `#006B5B` / `#FFFFFF` | `#59DBC1` / `#00382E` |
| Selected / on selected | `#CDE8E0` / `#06201A` | `#334B45` / `#CDE8E0` |
| Text / secondary text | `#191C1B` / `#57605D` | `#C4C7C5` / `#A3ADA9` |
| Outline / divider | `#6F7976` / `#BFC9C4` | `#89938F` / `#3F4946` |
| Error / error container / on container | `#BA1A1A` / `#FFDAD6` / `#410002` | `#FFB4AB` / `#93000A` / `#FFDAD6` |
| Caution / container / on container | `#725B22` / `#FFDF98` / `#251A00` | `#E1C37F` / `#58440B` / `#FFDF98` |
| Valid | `#2F6A39` | `#96D69A` |

## Foundations

| Role | Token / contract |
| --- | --- |
| Canvas | `--workspace-canvas` |
| Section | `--workspace-surface` |
| Raised control or menu | `--workspace-raised` |
| Hover surface | `--workspace-hover` |
| Highest surface | `--workspace-surface-highest` |
| Primary action | `--workspace-primary`, `--workspace-on-primary` |
| Selected item | `--workspace-selected`, `--workspace-on-selected` |
| Status | `--workspace-positive`, `--workspace-warning`, `--workspace-danger` |
| Body and form input | 16px / 24px, regular system sans-serif |
| Label and action | 14px / 20px, regular system sans-serif |
| Metadata and code | 12px / 16px; monospace only for identifiers |
| Page and editor title | 22px / 28px, system sans-serif |
| Section heading | 16px / 24px; heading emphasis |
| Main section spacing | 24px |
| Nested surface inset | 16px |
| Field text inset | 16px; 48px reserved for the select chevron |
| Field/icon gap | 8px |
| Inline identifier padding | 4px vertical / 8px horizontal, intrinsic width |
| Outlined field height | 56px; textareas at least 160px, passage fields 240px |
| Action / chip / navigation height | 40px / 32px / 56px |
| Shape | 4px outlined fields, 8px chips and menus, 16px sections, 28px sheet/dialog corners, fully rounded action buttons |
| Editor | 960px maximum side sheet; full width on mobile; independent scrolling body |

Both themes resolve through the Studio's own `color-scheme`. Reader pages retain their separate typography and color contract. Form labels, table labels, navigation, status values and disclosures stay regular-weight and sentence case. Do not add bold labels or a monospace title treatment. Keep semantic headings even when they use the existing screen-reader-only class.

## Component rules

- Use `StudioButton`, `StudioInput`, and `StudioTextarea` for controls. Buttons default to `type="button"`; submit actions explicitly use `type="submit"`. Filled primary, tonal selected/secondary, outlined default, and destructive treatments share the same height and typography.
- Use `AdminSelect` for native option selection. Its wrapper provides one chevron; the select retains keyboard behavior, focus, disabled state and option semantics. Do not layer a second border around the select.
- Search icons occupy a separate track with an 8px gap. Only the outer search field owns the border and focus outline.
- `AdminDisclosureSummary` supplies one chevron. Do not add “More,” another disclosure icon, or a duplicate title.
- Keep primary, secondary and destructive action roles. Tabs have straight selection rules; menu items use 8px rounding. Full-screen dismissal backdrops have no rounding.
- Multi-line surface and template choices use 16px corners and insets, regular text, and the selected surface tone. Their outer edges align with the search and filters. Apply popup elevation to the menu itself, not its trigger wrapper.
- Use surface tone to separate groups. Within a group, align rows and use continuous separators instead of nesting individually bordered cards. Expanded table details retain the full table width.
- Use intrinsic-width code tokens that wrap long identifiers. Metadata fields and disclosure contents share their parent's left edge.
- Error boundaries, inline errors and notifications retain the active Studio palette. Invalid fields use the danger border; disabled fields retain readable text; keyboard focus uses the primary token.
- Preserve responsive structure: full-width source cards, wrapping actions, stacked narrow tables, and scrollable editor content between the header and footer.

## CSS maintenance

Shared primitives use low-specificity `:where()` selectors. Each component owns its layout in one base rule; explicit state and responsive variants describe changes in behavior. Do not append corrective rules or assign a component to competing grid and surface groups. Do not add another stylesheet or restore a legacy import. Add a component family to `studio-system.css` and reuse shared role tokens. Structural layout values such as grid tracks and fixed positioning live with the component; visual measurements belong in the shared theme.

## Verification

`npm run qa:css-audit` validates token references and rejects raw component visual values. `npx playwright test --config playwright.studio-style.config.ts` builds the current admin bundle and starts a fresh test server. `playwright.studio-web-entry.config.ts` verifies the main web entry and its error/loading boundaries with the same component system. The suite covers computed typography, semantic/visible heading order, mobile and desktop layouts, both themes, empty/populated rows, native controls, expanded details, focus restoration, error recovery and editor interactions with isolated fixtures.

The local design-review server on port 4286 uses recorded sample data with mutations disabled. It is not production or a complete CMS inventory.


## Responsive grid and spacing (September 11 follow-up)

- The shell uses a sidebar track and a flexible content track; the content width is capped by `--workspace-max-width`. Headers use an explicit title/action grid, with health links on a separate aligned row.
- Library filters use three equal columns. Placement and review filter grids use three columns at wide desktop widths, two at intermediate widths, and one below 720px. Four-field placement selectors retain a balanced two-by-two grid. Fields use the existing 16px grid gap and 8px label gap.
- Buttons align within their cells instead of stretching to a neighboring field or disclosure. Standard actions remain 40px high, fields 56px. Filter-row actions align with the fields.
- Section spacing remains 24px. Collapsed library guidance and inline filter disclosures use compact insets. Empty table messages use the same 16px inset as table cells.
- The Memory page has a toolbar grid and a bounded graph workspace. Toolbar and canvas edges align. Search owns one border. Errors and empty states use themed surfaces with separate message/action tracks; mobile stacks those tracks. The graph renderer keeps its dark plotting surface, while toolbar and recovery states use the selected Studio theme. The unrelated animated terminal background is no longer mounted.
- `studio-system.css` is the only active Studio component sheet; inactive legacy sheets were not carried forward as additional overrides.

Regression coverage checks button heights, column alignment, mobile stacking, table insets, Memory error/retry/search behavior, and populated graph geometry through fresh standalone and main-web builds. Fixtures are synthetic and do not verify production content availability.


## Tabs and collection filters

Use `StudioTabs` for mutually exclusive content panels: Sky workspaces, placement composition, Lunar Calendar views, and Composition scope/views. Each instance owns unique tab and panel IDs, one selected tab, and an explicitly labelled active panel. Left/Right and Home/End move focus; Enter/Space activates the focused view. Tab proceeds to the panel. This manual activation avoids changing content while someone is only exploring labels.

The visual reference uses a continuous neutral surface with a primary-color underline. The tab strip and active panel form one connected container: matching left/right edges and surface color, zero external gap, square adjoining corners, and padding inside the panel. Active labels use the regular ink color, with the same regular label typography as inactive tabs. Desktop columns share available width; on narrow screens, a single row scrolls horizontally. Tabs never inherit selected-button fills or rounded button corners. Height, underline width, padding, typography, surfaces, and colors reuse shared theme tokens. Nested tab panels do not accumulate horizontal insets, and hidden tab navigation does not add a panel surface.

Status, saved-collection, compatibility-family, fallback-family, and diagnostic-mode choices filter or configure a shared view. They use labelled button groups with `aria-pressed`. Addressable vocabulary categories remain navigation links with `aria-current`. Do not give these controls tab roles unless each choice owns a genuine content panel.

## Daily summary containers

The full-summary assembly and Sun–Moon composition sections sit inside the connected tab container. Within that panel, their shared surface class becomes a flat section with a top divider and block spacing; the panel owns the horizontal inset. Sentence editors and rendered previews sit in bordered canvas-colored surfaces using the panel inset. Preview metadata has its own divider and can wrap on mobile. Summary source rows use the shared card inset. Keep the section controls and their resulting preview inside one workbench without successive padded wrappers around every paragraph.

## Library sections and editor cards

Use `studio-surface studio-section` for a grouped section: one surface, the shared card inset, and the shared block gap. `studio-section-header` aligns explanatory copy and a related action in two tracks, stacking them on mobile. The fallback library groups its introduction, category choices, search, and sort in this surface. Search gets two grid shares and sort one; mobile stacks them. The page title remains the only visible repeated library title, while the inner heading stays available to screen readers.

Grouped fallback results own their card surfaces; the results wrapper adds no extra inset or background. Populated and empty cards align with the controls above. Mobile cards use the panel inset. Selected filter buttons retain their tonal fill on hover.

The shared editor groups its name and summary in one card. Standalone copy fields, review status, and guidance use the same surface family. Expanded guidance has one divider and no nested card padding. The scrolling body separates the fixed header and action bar. On mobile, footer actions use two equal columns with save state and publication actions spanning the row; DOM and keyboard order stay unchanged.

## Composition workbench spacing and typography

The connected panel owns the outer inset. Template selection and selected-template details use flat sections separated by one divider and the shared block gap. A single template choice fills its grid row; all choices align their text left. Search and destination controls reserve an intrinsic-width track for their action so Review remains one line.

Reader previews use the body font, size, weight, tracking, and leading throughout, including calculated values and editable phrases embedded in sentences. Editable phrases retain underlines. Technical source keys and the main-template token editor keep code typography. Metadata and legends use the shared meta role.

Preview surfaces and assembly slots use the panel inset, canvas surface, thin border, and control radius. Counts and token buttons wrap with the control gap; slot labels and runtime source details have explicit internal gaps. Header copy and actions stack into full-width rows below 720px so buttons and badges cannot squeeze descriptions into narrow columns. These rules use existing shared theme tokens.


## Page and form containment

Every workspace groups its introduction, navigation, filters, forms, and results into explicit surfaces. Add a component to the canonical surface family or use `studio-surface studio-section`; do not add a corrective stylesheet. A connected tab panel already owns its surface and inset, so embedded filter grids remain flat. Collections use one container per meaningful group rather than a card around each label or paragraph.

Review Queue groups its command bar, view choices, filter disclosure, and status choices separately with the shared section gap. Library, template, vocabulary, slot, Surface Map, and Connection controls follow the same containment contract. Surface Map source cards and its supporting catalog own their surfaces. Standalone coverage headers and the Memory toolbar use the same surface family as the main Studio.

Page-level errors render before the page header, using the shared alert palette and inset. Success notifications may remain transient toasts. Memory errors occupy the first full-width row of its toolbar. Authentication forms retain their existing access behavior inside the shared access card.

The route inventory regression opens all workspace routes and supported view variants, expands disclosures and hidden filters, and checks all five create editors in light/dark themes at desktop/mobile widths. It asserts visible content and form controls have a surface ancestor and that the page does not overflow horizontally. Standalone coverage and Memory tests verify their separate route shells and recovery states. These checks use isolated fixtures, not production data.

## Stylesheet integrity

Both Studio entry points load `studio-system.css`, which imports only the shared `theme.css` tokens. Reader CSS is loaded only on reader routes. The architecture audit rejects duplicate selectors within a breakpoint, repeated properties, repeated breakpoint sections, inline styles, component-local tokens, and legacy stylesheet imports. The only `!important` declarations enforce the HTML hidden attribute and reduced-motion preference; visual styling may not use them.

Component layout rules are consolidated for composition sections, preview cards, slots, source grids, editor metadata, and tab containers. Embedded template sections and standalone cards have explicit surface variants. Selected and disabled buttons are excluded from ordinary hover rules. All responsive rules live together at the end of the sheet.

## Composition variable identities

The madlib template, assembled reader preview, template-token list, assembly code badges, and reader drilldown use the same per-variable color mapping. The shared key lists each variable's readable name and source type. Colors identify variable names rather than source categories, so distinct calculated facts are visually separable. Repeated occurrences retain their color across views and audience changes. Source editing and keyboard inspection keep their existing behavior.

Six categorical ink/surface pairs are defined in the shared Studio theme, with separate light/dark values and at least 4.5:1 text contrast. A template's sorted unique variable names select from this palette; palettes repeat beyond six variables, so the visible names and accessible action labels remain the authoritative identifiers. Colored narrative text retains the body typography, wraps inline, and keeps action underlines. Hover must preserve the identity color. This is a categorical extension to the reviewed system, separate from semantic error/status colors.


## Disclosure surfaces and Sky variable definitions

Standalone expandable groups use `admin-workspace-details` in both closed and open states, including source history, related passages, composition guidance and editorial history. Inline table and toolbar disclosures remain inside their existing row or toolbar surface. Native `details` elements do not inherit the section grid helper; the browser retains their disclosure layout and hidden-content behavior.

The Sky variable key uses one raised definition list with 16px row insets and continuous separators. Variable names and descriptions align in two tracks on desktop and stack on mobile. Example values and availability labels have their own wrapping row. Variable badges and their rendered sentence values reuse the shared categorical palette and stable name mapping.
