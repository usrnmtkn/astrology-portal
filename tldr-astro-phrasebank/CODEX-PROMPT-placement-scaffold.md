# Codex prompt — natal placement scaffold

Use `PLACEMENT-SCAFFOLD-SPEC.md` as the authority for the natal placement detail page.

The page must stack only authored, reader-facing layers:

1. Sign story from `cc-planet-in-sign-reviewed.json` field `natal_sign_story`.
2. House integration from `cc-planet-in-house-reviewed.json` field `house_integration`.
3. Natal retrograde from `cc-natal-retrograde-authored.json` field `text`, only when the natal planet is retrograde.
4. Conditional ruler bridge using slot template `5H` from `cc-slot-templates.json`, resolved from the chart's traditional sign ruler and the ruler's actual natal placement.

Do not restore the removed AI-authored banks:

- `cc-dignity-paragraphs.json`
- `cc-sect-paragraphs.json`
- `cc-ruler-bridge.json`
- `cc-aspect-leadins.json`

Do not render a synthesis paragraph. Do not compose runtime prose from planet-topic plus sign-style vocab. The emergency fallback hooks may use vocab, but the primary placement scaffold must serve the authored fields verbatim and skip any unavailable conditional layer cleanly.

Verification:

- Run `node scripts/generate-placement-scaffold-data.mjs`.
- Run `node scripts/test-placement-scaffold-rendering.mjs`.
- Confirm no placement page renders internal text such as `reviewed placement bank`, `Use the calculated`, `entries are ordered`, or `Do not apply`.
