# Friend profile card and intro layout repair

The owner reported missing Compatibility card surfaces, a narrow displaced
Synastry explainer, and misplaced Transits guidance after PR #1503. The repair
branch starts at main `ce3347038e6796a3f2048ba14bd5823a304a67df` and preserves
the approved refined layout, subsequent Compatibility alignment, complete CMS
text, calculation behavior, house rings and report controls.

Two CSS rules change. Compatibility cards explicitly use the shared card
background and shadow. Children of the new profile intro reset legacy grid
coordinates, so the explainer, forecast when available, and guidance use the
intro's normal vertical stack instead of creating implicit rows and columns.

New browser assertions reproduced the reported failures before the CSS repair:
transparent card backgrounds, absent card shadows, an offset Transits child,
and a Synastry explainer in a narrow extra column. The first diagnostic also
used an incorrect 24px stack-gap expectation; the regression now compares actual
child separation with the shared computed row gap. That diagnostic and an
earlier sandbox-denied preview startup remain retained as failed attempts.

Validation after the repair:

- `npm run qa:css-audit` passed.
- A fresh app build (including web TypeScript) and eight browser journeys passed:
  all five tabs at 320, 390, 960 and 1440px, in both light and dark themes.
- Those journeys assert card background/shadow, intro child width, placement and
  stacking, existing overall columns and typography, tab navigation, reload,
  fullscreen chart parity and focus restoration. The source passages remain
  unchanged through navigation and reload.
- Desktop Compatibility cards, desktop Synastry in both themes, and mobile
  Synastry screenshots were visually inspected.

Browser checks use fictional account/service fixtures and an isolated network
guard. No owner-data write or paid generation occurs. Missing forecast content
is preserved as missing; this CSS repair does not supply new reader wording.

Hosted required gates and production acceptance remain pending. Local passing
evidence does not establish that the repair is deployed.
