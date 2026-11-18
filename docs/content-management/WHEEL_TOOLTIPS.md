# Interactive wheel tooltip sources

Open **Content Studio → Zodiac Wheel → Tooltips** (`/admin/content#wheel-tooltips`).
Choose a tooltip group and wording source, then **Edit tooltip wording**. Opening
an unsaved starter does not create a database row. The source label is editor
metadata; **Tooltip wording** is the text shown by the wheel.

The catalog in `apps/web/src/content/wheelTooltipCatalog.ts` registers the shared
`cms/wheel-tooltip/` sources: hover titles/details, house-ruler sentences, dignity
phrases, guide-link labels and retrograde wording. Sky, You and Friend wheels use
the same sources where applicable. This section does not edit placement articles
or change chart calculations, traditional rulers, aspect geometry or profile pronoun selection.

Choose **Edit variable wording** or the **Variable wording** group to edit the
wording inside `ownerPossessive`, `possessive`, `houseOrdinal` and
`rulerHouseOrdinal`. The ten sources cover You title/body forms, Friend name
possessives, each pronoun form, the selected house and the ruler's house.
The correct form is selected from the active profile; its wording is editable.
Friend name formatting keeps `{{ownerName}}`, using the wheel’s existing first-name form. House formatting keeps at least one
calculated token: `{{house}}` (number) or `{{houseOrdinal}}` (ordinal), or both.
This permits wording such as `House {{house}}` without fixing a house number.
These forms apply to the house-ruler popup title and body, including other houses
ruled; the chart's selected house, ruler and ruler's house remain calculated.

Other sources keep every listed `{{variable}}`. Variables can move or repeat; insert buttons
place them into the wording field. Values come from the active chart. Guide links
remain React elements with fixed destinations. HTML, unknown variables, omitted
required variables and empty bodies cannot publish. The server validates the
canonical catalog rather than trusting client-supplied variable metadata.

**Save draft** stores a non-serving source. Saving a published source as a draft
hides the affected tooltip until publication. **Save & publish** explicitly makes
the saved wording reader-eligible. Existing app wording remains until first
publication. After publication, retirement, missing exact revisions or invalid
sources hide the affected tooltip rather than silently restoring older wording.
Version checks reject stale saves and keep the editor's unsaved text.

Before saving, choose **Preview on wheel** below the wording field. Current and
retained unsaved source edits override published wording only inside this preview,
updating as you type. **Preview wording** edits the same unsaved source beside the wheel
on wider screens, or above it on mobile. Focusing this field brings the pair
into view together. Choose your chart or a cloud-saved friend, a preview voice, and a
house. The normal wheel and publication state remain unchanged. Closing the
preview unmounts the wheel; it does not save a draft. Invalid sources do not
render stale copy in the preview.

The wheel also navigates the editor. Selecting a house updates **House** and the
read-only **Ruler’s house** from the chart, adapting the current title/opening/
placement source to that house's actual facts. Click a ruler-popup title or its
opening sentence to select that source in **Tooltip group**, **Wording source**,
and the wording field. The source selectors are also available inside the
preview, and can move to a compatible calculated house without resetting the
chart or voice. If a source has no matching house in the chart, the preview says so.

Navigation retains complete unsaved source drafts in this editor's memory and
previews those edits together. Returning to a source restores its wording and
original version for stale-write protection. **Save draft** and **Save & publish**
apply only to the selected source; navigation never saves another source.
Closing the whole editor or reloading still warns about retained unsaved changes.
The retained draft set is discarded on confirmed editor close, not stored as
chart data, browser preview state or CMS rows.

Preview chart inputs are read through the browser's normal verified session,
filtered to its owner under existing access policies. Birth inputs stay in
component memory and use the normal Swiss Ephemeris worker. No profile, chart
cache, CMS row or publication is written. Unknown birth times do not produce
houses or house-ruler popups. A sign-out or account change clears chart data;
failed reads/calculations offer a retry without changing the editor text.

The optional local safe preview executes no local API handlers and loads no
server credentials. Public reader requests omit session headers. A narrow set of
Studio CRUD requests forwards only the browser's normal signed-in session to the
original production API, which verifies owner authorization. Emergency secrets,
service-role credentials, generation APIs and arbitrary routes are unsupported.
Saving or publishing there changes the normal shared Studio store; synthetic QA
uses an isolated in-memory API store instead.

Verification: `npm run test:wheel-tooltip-studio-api`,
`node --import tsx scripts/test-wheel-tooltip-preview.mts`,
`node scripts/test-public-reader-preview.mjs`, and the Studio cases in
`tests/visual/interactive-zodiac-wheel.spec.ts`.
