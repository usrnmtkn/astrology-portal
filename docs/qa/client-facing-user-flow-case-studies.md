# Client-Facing User Flow QA Case Studies

Date: 2026-07-16
Scope: TLDR Astro web app client-facing routes and controls.

## QA Persona

Virtual QA technician validating that a client can move through the public and signed-in app surfaces without dead ends, broken client state, or missing core content.

## Test Data

- Guest visitor: no profile in storage.
- Signed-in/local profile: "Marie Satori" seeded in localStorage with complete birth details, current location, and two friend charts.
- Default test location: Portsmouth, NH.
- Browser: Playwright Chromium desktop viewport, 1440 x 1000, plus a mobile viewport at 390 x 844 for compact navigation.

## Case Study 1: Guest Reads The Current Sky

Goal: A new visitor can land on Sky, understand that current-sky content loaded, and open a readable detail article.

Steps:
1. Clear profile state and open `/#sky`.
2. Confirm primary navigation, app shell, current sky chart, and the current-sky heading are visible.
3. Confirm the daily planetary placements list is populated.
4. Open the first placement detail.
5. Confirm a detail article appears with a back control and readable body copy.
6. Return to the Sky overview.

Expected result: The guest can read Sky content and return without a blank view, crash, or missing article body.

## Case Study 2: Guest Navigates Public Surfaces

Goal: A guest can move between public Sky, Calendar, and Settings surfaces.

Steps:
1. Open `/#sky`.
2. Open the Calendar route.
3. Confirm the lunar calendar route loads and renders either a ready calendar or a loading/empty status.
4. Open Settings from the overflow menu.
5. Confirm guest settings are visible.
6. Return to Sky from primary navigation.

Expected result: Public routes remain accessible without a profile and navigation updates the visible surface.

## Case Study 3: Signed-In User Reviews Their Chart

Goal: A returning user with a complete local profile can open the You page and inspect their natal chart content.

Steps:
1. Seed a local profile and open `/#you`.
2. Confirm the You page loads with the profile summary.
3. Confirm natal chart surface renders with placements or chart panels.
4. Switch between available You tabs.
5. Open a placement/article detail if present, then return.

Expected result: The signed-in user sees personalized chart content, usable tabs, and no setup dead end.

## Case Study 4: Signed-In User Compares Friend Charts

Goal: A user with saved friend charts can open the Friends workspace and inspect natal, synastry, and composite views.

Steps:
1. Seed a local profile and two manual friend charts.
2. Open `/#friends?tab=charts`.
3. Confirm the chart list shows saved friends.
4. Open the first friend chart.
5. Confirm Natal tab content appears.
6. Switch to Synastry and confirm relationship content appears.
7. Switch to Composite and confirm composite content appears.
8. Use the chart action menu and confirm edit/delete actions are exposed.

Expected result: Saved friend charts are selectable, relationship tabs render, and chart management controls are reachable.

## Case Study 5: Settings Persist Across Reload

Goal: User-facing preference controls change visible app state and persist in localStorage.

Steps:
1. Seed a local profile and open `/#settings`.
2. Change theme to dark from the Settings surface.
3. Toggle dyslexia-friendly font.
4. Reload the page.
5. Confirm dark theme and dyslexia preference remain active.
6. Return to Sky and confirm the app still renders.

Expected result: Preferences survive reload and do not break client navigation or rendering.

## Case Study 6: Calendar Day And Transit Exploration

Goal: A visitor can use the lunar calendar as an interactive feature, not only as a static screen.

Steps:
1. Open `/#calendar`.
2. Wait for the calendar route to render.
3. Switch between Week and Month views where controls are available.
4. Select a visible day.
5. Confirm the selected lunar day card updates.
6. Open a transit card if present and confirm the detail view appears.

Expected result: Calendar controls are interactive and detail content is reachable when events are present.

## Case Study 7: Guest Account Entry Points

Goal: A guest can reach account creation and login screens from the site menu, and local validation messaging is clear when live auth is not configured.

Steps:
1. Open `/#sky` as a guest.
2. Open the overflow menu and choose Login.
3. Confirm the login screen renders with email/password controls.
4. Toggle password visibility.
5. Switch to account creation.
6. Confirm birth city, birth date, birth time, and unknown-time controls render.
7. Submit without configured auth and confirm explanatory messaging appears.

Expected result: Account entry points do not dead-end, controls are reachable, and missing auth configuration produces a clear client-facing message.

## Case Study 8: Mobile Sky Navigation

Goal: A mobile visitor can use compact topbar controls for sky date shortcuts and menu navigation.

Steps:
1. Open `/#sky` at a mobile viewport.
2. Open the compact sky date/location control.
3. Confirm Today, Tomorrow, Date, and Location controls are visible.
4. Select Tomorrow and confirm the sky surface remains rendered.
5. Open the mobile overflow menu.
6. Navigate to Settings.

Expected result: Mobile-only controls are visible, tappable, and do not overlap or trap navigation.

## Case Study 9: Direct Links Restore Detail State

Goal: Direct URLs restore the intended client-facing feature state.

Steps:
1. Open `/#sky/placement/sun`.
2. Confirm the Sun placement detail article renders and can be closed.
3. Seed a friend chart and open `/#friends?tab=charts&chart=friend-nikki&view=synastry`.
4. Confirm Nikki's chart profile opens directly on Synastry.

Expected result: Deep links restore details and tab state without requiring manual navigation first.

## Case Study 10: Signed-In User Can Sign Out

Goal: A signed-in/local profile user can leave the account state through the menu.

Steps:
1. Seed a local profile and open `/#you`.
2. Open the overflow menu.
3. Select Sign out.
4. Confirm the account creation screen appears and signed-in-only primary navigation is removed.

Expected result: Sign-out clears local profile state and returns the user to the guest account surface.

## Case Study 11: Light And Dark Theme Visual Flow

Goal: Core client-facing screens render in both light and dark themes without blank states, broken navigation, or theme persistence issues.

Steps:
1. Seed a signed-in/local profile with friend charts.
2. Open Sky, You, Friends, Calendar, and Settings in light theme.
3. Capture visual evidence for each surface.
4. Repeat Sky, You, Friends, Calendar, and Settings in dark theme.
5. Confirm the app shell has the expected theme class for each capture.

Expected result: Both themes render the major client-facing surfaces, and screenshots are available for visual review.

## Case Study 12: Full Sky Chart Modal

Goal: A visitor can open the full current-sky chart from the Sky overview and return to the overview.

Steps:
1. Open `/#sky`.
2. Select View chart / Open full current sky chart.
3. Confirm the full chart modal renders with the full sky chart.
4. Close the modal.

Expected result: The modal opens, displays chart content, and closes without losing the Sky overview.

## Case Study 13: Profile Edit / Create Chart Setup Modal

Goal: A signed-in/local profile user can open the chart setup modal, inspect birth and current-city steps, and close it safely.

Steps:
1. Seed a local profile and open `/#you`.
2. Open Profile options and choose Edit details.
3. Confirm the Create your chart overview renders.
4. Open Add birth information and confirm birth detail controls render.
5. Toggle unknown birth time.
6. Close the modal.

Expected result: The profile setup modal is reachable, step controls render, and closing returns to the You page.

## Case Study 14: Friend Add Chart Modal Validation

Goal: A signed-in/local profile user can open the friend Add chart modal and receives helpful validation when required fields are missing.

Steps:
1. Seed a local profile and friend charts.
2. Open `/#friends?tab=charts`.
3. Select Add chart.
4. Confirm person/event chart controls, relationship, pronouns, date/time, place, and submit controls render.
5. Submit the empty form.
6. Confirm validation messaging appears.
7. Close the modal.

Expected result: The add chart form is reachable and validates missing required fields without crashing.

## Case Study 15: Friend Delete Confirmation Cancel

Goal: A signed-in/local profile user can open destructive chart deletion confirmation and cancel without removing data.

Steps:
1. Seed a local profile and friend charts.
2. Open `/#friends?tab=charts`.
3. Open Nikki's chart action menu.
4. Select Delete chart.
5. Confirm delete confirmation renders.
6. Cancel deletion.
7. Confirm Nikki still appears in the chart list.

Expected result: Destructive confirmation is explicit and cancel preserves the saved chart.

## Case Study 16: Friend Edit Chart Modal Cancel

Goal: A signed-in/local profile user can open an existing friend chart for editing and leave without changing saved data.

Steps:
1. Seed a local profile and friend charts.
2. Open `/#friends?tab=charts`.
3. Open Nikki's chart action menu.
4. Select Edit chart.
5. Confirm the edit modal renders with Nikki's saved name, chart type, relationship type, and Save chart action.
6. Close the modal.
7. Confirm Nikki still appears in the chart list.

Expected result: Existing chart details populate the edit form and closing the modal returns to the chart list without data loss.

## Case Study 17: Friend Event Chart Mode

Goal: A signed-in/local profile user can switch the Add chart form from a person chart to an event chart and receives event-specific validation.

Steps:
1. Seed a local profile and friend charts.
2. Open `/#friends?tab=charts`.
3. Select Add chart.
4. Change Chart type to Event.
5. Confirm the modal title, field labels, and submit action update for an event chart.
6. Confirm person-only controls such as relationship type and pronouns are removed.
7. Submit the empty form.
8. Confirm event-specific required-field validation appears.

Expected result: Event chart mode exposes the correct user-facing form state and validation messaging.

## Case Study 18: Guest Account Close Return

Goal: A guest can enter the account/login surface and safely return to Sky without completing account setup.

Steps:
1. Open `/#sky` as a guest.
2. Open the overflow menu and choose Login.
3. Confirm the Log in screen appears.
4. Close the account screen.
5. Confirm the Sky overview is visible again.

Expected result: Account entry is reversible and does not trap guests away from the core public experience.

## Case Study 19: Mobile Sky Date Picker

Goal: A mobile visitor can open the explicit date picker from compact Sky controls, navigate months, and close it.

Steps:
1. Open `/#sky` at a mobile viewport.
2. Open the compact sky date/location control.
3. Select Date.
4. Confirm the Select sky date picker appears.
5. Navigate to the next and previous months.
6. Close the date picker.
7. Confirm Sky remains visible.

Expected result: Mobile custom date controls are reachable, month navigation works, and closing returns to the Sky surface.

## Case Study 20: Keyboard Escape Dismissal

Goal: Keyboard users can dismiss transient menu and modal surfaces with Escape.

Steps:
1. Open `/#sky` at a mobile viewport.
2. Open the overflow menu.
3. Press Escape and confirm menu actions are dismissed.
4. Open the full current-sky chart modal.
5. Press Escape and confirm the modal closes.
6. Confirm the Sky overview remains visible.

Expected result: Keyboard dismissal works for major transient client-facing surfaces and focus returns to a usable page state.

## Case Study 21: Signed-In Current Location Editing

Goal: A signed-in/local profile user can change their current location from Settings and keep that value after reload.

Steps:
1. Seed a local profile and open `/#settings`.
2. Select Current location.
3. Confirm the Current location editor appears.
4. Enter a new city.
5. Save the location.
6. Confirm the new city appears in Settings.
7. Reload and confirm the city remains visible.

Expected result: Current location editing is reachable, saves locally, and persists across reload.

## Case Study 22: Guest Settings Controls

Goal: A guest can use display and astrology settings without creating an account.

Steps:
1. Open `/#settings` as a guest.
2. Confirm the saved/current location is shown.
3. Switch the theme to dark.
4. Toggle the gradient background setting.
5. Toggle journal prompts.
6. Switch house sign labels to glyph.

Expected result: Guest settings controls update visible state and remain usable without signed-in profile data.

## Case Study 23: Calendar Location Picker

Goal: A visitor can change the lunar calendar location and cancel a pending location edit.

Steps:
1. Open `/#calendar`.
2. Open the calendar location picker.
3. Enter a new city and update.
4. Confirm the calendar header shows the new city.
5. Reopen the location picker.
6. Enter another city and cancel.
7. Confirm the previously saved city remains selected.

Expected result: Calendar location updates are explicit, and cancel does not overwrite the active location.

## Case Study 24: Mobile Signed-In Friends Navigation

Goal: A signed-in/local profile user can reach Friends from the mobile menu and open a saved friend chart.

Steps:
1. Open `/#sky` at a mobile viewport with a seeded profile and friend charts.
2. Open the overflow menu.
3. Select Friends.
4. Confirm the Friends chart list appears.
5. Open River's chart.
6. Confirm River's chart profile and Natal tab are visible.

Expected result: Mobile signed-in navigation exposes Friends, and saved chart details open cleanly.

## Case Study 25: Mobile Guest Calendar Navigation

Goal: A mobile guest can reach Calendar from the menu and interact with calendar view/navigation controls.

Steps:
1. Open `/#sky` at a mobile viewport as a guest.
2. Open the overflow menu.
3. Select Calendar.
4. Confirm the lunar calendar and selected day panel appear.
5. Switch to Month view when available.
6. Navigate to the next month or week.

Expected result: Mobile Calendar remains usable for guests, including compact navigation and date-range controls.

## Case Study 26: You Mission Statement Detail

Goal: A signed-in/local profile user can open the mission statement detail article from the You page and return.

Steps:
1. Seed a local profile and open `/#you`.
2. Confirm the You page renders.
3. Open Your mission statement.
4. Confirm the detail article appears.
5. Close the article.
6. Confirm the You page returns.

Expected result: The mission statement card opens a readable detail article and closes back to You.

## Case Study 27: You Career Detail

Goal: A signed-in/local profile user can open the career detail article from the You page and return.

Steps:
1. Seed a local profile and open `/#you`.
2. Confirm the You page renders.
3. Open Your career pattern.
4. Confirm the detail article appears.
5. Close the article.
6. Confirm the You page returns.

Expected result: The career card opens a readable detail article and closes back to You.

## Case Study 28: You Natal Placement Detail

Goal: A signed-in/local profile user can open a natal placement detail from the You page and return.

Steps:
1. Seed a local profile and open `/#you`.
2. Confirm the You page renders.
3. Open the Sun in Aquarius placement.
4. Confirm a placement detail article renders.
5. Close the article.
6. Confirm the You page returns.

Expected result: Natal placement rows open readable detail articles and close back to the profile surface.

## Case Study 29: Friend Natal Placement Detail

Goal: A signed-in/local profile user can open a saved friend's natal placement detail article from the friend profile.

Steps:
1. Seed a local profile and friend charts.
2. Open Nikki's chart directly on the Natal tab.
3. Confirm Nikki's big-three section renders.
4. Open the first available natal placement detail.
5. Confirm the detail article appears.
6. Close the article and confirm Nikki's chart profile returns.

Expected result: Friend natal placement detail articles are reachable and return cleanly to the friend profile.

## Case Study 30: Empty Friends Chart List

Goal: A signed-in/local profile user with no saved friend charts sees a useful empty chart-list state.

Steps:
1. Seed a local profile without friend charts.
2. Open `/#friends?tab=charts`.
3. Confirm the Friends chart surface renders.
4. Confirm the No saved charts yet message is visible.
5. Confirm Add chart remains available.

Expected result: Empty friend chart state is informative and gives the user a clear next action.

## Case Study 31: Sky Fallback Copy Quality

Goal: Current-sky placement detail copy remains reader-facing when live/generated content is unavailable.

Steps:
1. Open `/#sky` with the deployed content API forced into fallback behavior.
2. Open the first placement detail.
3. Confirm the detail article contains substantial explanatory copy.
4. Confirm the copy does not expose implementation terms such as fallback-hook, slot-template, sourceSnapshot, backend/schema labels, undefined/null values, or review placeholders.

Expected result: Sky placement fallback copy reads like finished user-facing content, not internal scaffolding.

## Case Study 32: You Profile Detail Fallback Copy

Goal: Profile detail articles on You render useful fallback copy without backend/admin language.

Steps:
1. Seed a local profile and open `/#you`.
2. Open Your mission statement.
3. Confirm the article contains substantial reader-facing copy and no scaffold leakage.
4. Return to You.
5. Open Your career pattern.
6. Confirm the article contains substantial reader-facing copy and no scaffold leakage.

Expected result: You profile details remain polished when generated content is unavailable.

## Case Study 33: You Natal Placement Fallback Copy

Goal: Natal placement detail copy on You renders as complete interpretive content.

Steps:
1. Seed a local profile and open `/#you`.
2. Open the Sun in Aquarius placement.
3. Confirm the placement detail contains substantial reader-facing copy.
4. Confirm no fallback-hook, slot-template, undefined/null, generated-content, or review-placeholder language appears.

Expected result: Natal placement fallback copy is readable, complete, and free of internal content-system labels.

## Case Study 34: Friend Relationship Fallback Copy

Goal: Friend relationship tabs show useful fallback copy for synastry and composite views.

Steps:
1. Seed a local profile and friend charts.
2. Open Nikki's chart.
3. Switch to Synastry and inspect the visible explanatory copy.
4. Switch to Composite and inspect the visible explanatory copy.
5. Confirm both tabs avoid internal scaffolding and placeholder language.

Expected result: Relationship fallback copy is readable and client-facing across synastry and composite tabs.

Current QA finding: Composite relationship rows currently expose repeated "Interpretation in review." placeholders in placement/aspect fallback copy. The automated QA intentionally fails until those rows receive reader-facing fallback copy.

## Case Study 35: Calendar And Settings Fallback Copy

Goal: Calendar and Settings explanatory surfaces render clear fallback copy without content-system leakage.

Steps:
1. Open `/#calendar`.
2. Confirm the selected lunar day panel includes meaningful explanatory copy.
3. Open `/#settings`.
4. Confirm astrology/life-area settings include meaningful explanatory copy.
5. Confirm neither surface exposes fallback-hook, slot-template, backend/schema labels, undefined/null values, or review placeholders.

Expected result: Utility surfaces still feel editorially complete when live/generated content is unavailable.

## Case Study 36: Directional Copy Leakage

Goal: Reader-facing fallback copy should not surface directional or moralizing scaffold phrases.

Steps:
1. Seed a local profile and open `/#you`.
2. Open an Ascendant placement detail.
3. Confirm the article contains useful interpretive copy.
4. Confirm the copy does not use directional scaffolding such as "Notice how," "asks for attention," "this placement asks you to," "pay attention to," "watch for," or similar instruction-like phrasing.

Expected result: Placement fallback copy reads as finished interpretation instead of writer guidance or directive scaffold text.

Current QA finding: Ascendant placement fallback copy can surface "Notice how this placement asks for attention in real life." This is now flagged as directional copy leakage.

## Case Study 37: Synastry Detail Authored Copy Resolution

Goal: Synastry detail pages use authored relationship bundle copy before emergency fallback copy.

Steps:
1. Seed a local profile and friend charts.
2. Open a saved friend's chart from `/#friends?tab=charts`.
3. Switch to Synastry.
4. Open an `Ascendant square Mercury` contact detail.
5. Confirm the body uses the authored bundle wording about presence pressing against thinking and speech.
6. Confirm the body does not show emergency stitched boilerplate such as `puts first impressions`, `how information gets processed`, or `Recurring friction that asks for an adjustment`.

Expected result: Exact authored synastry bundle records win over emergency fallback copy on Synastry list rows and detail pages.

## Case Study 38: Desktop Web Viewport Core Flow

Goal: The desktop web viewport supports the core client-facing route flow without layout overflow.

Steps:
1. Seed a local profile and friend charts.
2. Open Sky at a 1440 x 1000 viewport.
3. Navigate to You, Friends > Synastry, Calendar, and Settings.
4. Capture screenshots for each surface.
5. Confirm each surface loads its expected primary region and does not create horizontal overflow.

Expected result: Desktop web users can move through the primary app surfaces without broken layout, missing content, or horizontal scrolling.

## Case Study 39: Mobile Viewport Core Flow

Goal: The mobile viewport supports the core client-facing route flow through menu navigation without layout overflow.

Steps:
1. Seed a local profile and friend charts.
2. Open Sky at a 390 x 844 viewport.
3. Use the menu to navigate to You, Friends > Synastry, Calendar, and Settings.
4. Capture screenshots for each surface.
5. Confirm each surface loads its expected primary region and does not create horizontal overflow.

Expected result: Mobile users can move through the primary app surfaces without broken layout, missing content, or horizontal scrolling.

## Case Study 40: Main Page Label And Spacing Consistency

Goal: Shared eyebrow and section-label styling stays consistent across the main client-facing pages, including both You tabs.

Steps:
1. Seed a local profile and friend charts.
2. Check desktop and mobile viewports.
3. Open Sky, You > Updates, You > Natal Chart, Friends chart detail, Calendar, and Settings.
4. Confirm each rendered shared label uses the global eyebrow contract for font, weight, tracking, line height, margin, padding, and uppercase treatment.
5. Confirm each surface has no horizontal overflow.
6. Capture screenshots for visual review.

Expected result: Eyebrows and section labels use one shared visual system across the app, and main pages remain readable on desktop and mobile.

## Execution Notes

Automated coverage for these case studies lives in `tests/visual/client-facing-user-flows.spec.ts`. The tests intentionally use accessible names, route hashes, and user-facing text where practical. They seed localStorage only for authenticated/profile-dependent flows so the app is exercised in a realistic client state without relying on external auth or database services.

Run the full client-facing QA report with:

```bash
npm run qa:client-report
```

The report runner executes the stable user-flow regression suite and the content/fallback-copy suite, then writes the latest markdown report to `test-results/client-facing-qa-report/latest.md`. It completes even when QA finds content issues so the report is always available; any suite marked `OPEN FINDINGS` should be treated as red for release until the bug is fixed or waived.

Visual artifacts are written to:

- Theme flow screenshots: `test-results/client-facing-theme-flow/`
- Responsive viewport screenshots: `test-results/client-facing-responsive-flow/`

Targeted commands are also available:

```bash
npm run qa:client-flows
npm run qa:content-copy
```
