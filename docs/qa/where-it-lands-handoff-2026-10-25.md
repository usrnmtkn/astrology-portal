# Where it lands for you — October 25

Local presentation update for the Sky placement personalized reading, following
the owner's 8:36 PM screenshot and `Sky Where It Lands.dc.html`,
`Sky Where It Lands Compare.dc.html` and DS v2 section 19 from
`GitHub app design system (5).zip` (SHA-256
`01e3347c5201281917e11e741679fde0e9d54fd7e26b90d59a38cab3a2d6b7d0`).
Reference scripts were not executed. The amber context bridge is explicitly
placeholder copy in the handoff, so it was not imported into the reader.

Branch `codex/frontend-design-system-20261024`, HEAD `2baa1b170`, is 0 ahead /
35 behind freshly fetched main `c51d9c551`. The checkout includes concurrent
work. These results are local review evidence, not a merge or deployment claim.

## Presentation

- Sentence-case UI heading sits outside the card: 22px/600/1.25 desktop and
  20px on compact screens, with 12px/10px card clearance.
- The card uses shared 32px/28px radii and desktop 40px padding; compact padding
  is 28px top, 24px sides and 32px bottom. The house passage appears first.
- Aspect-only circles are 52px desktop and 44px compact, with semantic aspect
  colors, a 16px title gap and sans-serif 18px/17px semibold titles. Grouped
  nodal contacts retain both symbols and their complete source passages.
- Every narrative paragraph remains Newsreader 19px/1.5. The redundant
  “Aspects to the natal chart” label is removed; the heading outline is h2 → h3.
- Saved house/aspect wording, timing, source order, grouping, selection,
  calculation and publication logic are unchanged. No bridge sentence was
  invented, no timing sentence shortened and no owner content written.

## Acceptance

All 15 browser cases pass against a fresh production preview with
`reuseExistingServer: false`. Log:
`/private/tmp/tldrastro-where-it-lands-final-acceptance.log`.

The 390px/1440px light/dark matrix covers the exact Venus eighth-house source,
populated cards, house-only cards without current aspects, computed typography,
card geometry, visible/semantic label order, at least 7:1 narrative/title
contrast, no horizontal overflow and exact paragraph preservation after reload.
The existing Sun/Node journey checks all complete grouped passages against You,
including their opening/final sentences and refresh behavior. Missing Rising
still shows the twelve general horoscopes without a personalized card.

Web typecheck, CSS/token audit, full-detail integrity (1,880 protected
multi-paragraph passages, 15 consumers) and scoped whitespace checks pass.
Actual port-5173 Venus Scorpio UI matches the owner's eighth-house/Mars case;
the dark review tab remains open. Screenshot:
`test-results/where-it-lands-live-dark.png`. Test screenshots include all four
theme/width combinations and the house-only state.

Source inventory: `/private/tmp/tldrastro-where-it-lands-source.json`, SHA-256
`12a1b78b801231abba14b82bb36f424a8895e15afac0e569c99b42a34d7d370b`.

## Bundle limits

Matched builds use identical synthetic browser settings and a read-only Vite
load override of the three saved pre-change presentation files. CSS measures
131,389 → 131,674 gzip bytes (+285). The measured 300-byte CSS allocation leaves
126 bytes below the 131,800-byte cap. Startup CSS is unchanged at 57,129;
Sky detail grows 6,645 → 6,717, below its unchanged 6,750-byte limit.

Aggregate JavaScript measures 3,684,858 → 3,684,936 (+78). The baseline already
exceeds the unchanged 3,684,050-byte ceiling by 808 bytes; the final overage is
886. This shared-worktree release gate remains failing and is not waived.
All other bundle gates pass. No new dependency or performance claim.

This supersedes only the personalized-card presentation gap in the earlier
Calendar/journal review. Placeholder bridge copy, new Not Found screens and the
seven private synastry drafts are not changed or certified by this pass.
