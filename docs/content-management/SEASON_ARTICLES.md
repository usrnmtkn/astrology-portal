# Year-specific season articles

A complete annual season essay uses one normal article row:
`article/manual/{sign}-season-{year}`. Sign identifiers are lowercase; the
validated year range is 1900–2200. This identity is shared by the Studio,
Sky and Calendar. It does not replace a default placement reading, an ingress
visit edition, or a reusable writing template.

## Authoring and discovery

Open **Calendar Write-ups → Season write-ups**, select the season and year,
and open the saved article or start a new one. Selecting **Sun** and its sign
in **Sky Write-ups** exposes the same year-specific article control above the
planet/sign workspace. Both entry points open the standard article editor.
The title and complete body remain owner-authored; an absent optional summary
stays empty. Saving and publishing use the existing version-checked article
and publication controls.

The picker waits for its exact saved key before offering creation. A failed
read disables creation and offers retry. A saved-content signal invalidates
the previous result, so reopening after a save or publication uses the latest
row version. It never creates a row merely by opening or changing filters.

The **This visit**, **Default reading** and **Writing setup** tabs retain
their existing identities and purpose. Existing Scorpio drafts, placement
copy and templates are preserved. There is no automatic migration or copy
replacement between those records and an annual essay.

## Reader access

The Sun placement detail and Sun-ingress Calendar event both reference the
same article. The year comes from the calculated ingress in the selected
time zone, including a Capricorn season that begins in December and extends
into January. No season date table or duplicated article body is introduced.
The link appears only when the exact article is live, reviewed, serving and
eligible under the existing publication ledger. Missing, draft, held or
unavailable articles do not produce a reader link.

Following either link opens the normal full article reader. Its outer page
is transparent so the white article card sits directly on the app gradient.
The article width, spacing and typography retain the shared reader styles.

## Verification

`scripts/test-season-article.mts` checks identities, calculated year/time-zone
boundaries, Capricorn, source discovery and Studio destinations. It is part
of the full `test:content-studio-api` suite. The four browser journeys in
`tests/visual/season-article.spec.ts` use isolated storage and actual handlers
to cover both Studio entry points, save/reopen/republication, reload, future
year empty state, read failure/retry, and both reader links into the complete
article. Fixtures contain synthetic prose, not owner copy.

The deferred season editor is required to stay outside the initial Studio
import graph. The integrated bundle allowance is based on matched independent
builds, recorded in `scripts/admin-bundle-budgets.json`; reader, CSS and
publication restrictions remain enforced.
