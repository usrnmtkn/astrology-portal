# Natal placement page — layer spec

The natal placement detail page (`me.natal_placement`) stacks layers in a fixed order. Serve each authored layer verbatim. Include a conditional layer only when its condition is true; otherwise skip it without an empty heading or placeholder.

## Layers

| # | Layer | Include when | Source | Field |
|---|-------|--------------|--------|-------|
| 1 | Sign — the body's function through the sign's style | always | `cc-planet-in-sign-reviewed.json` | `natal_sign_story` |
| 2 | House — that function in a concrete life area | always | `cc-planet-in-house-reviewed.json` | `house_integration` |
| 3 | Importance / sect | not authored yet | none | skip |
| 4 | Retrograde at birth | only if natally retrograde | `cc-natal-retrograde-authored.json` | `text` |
| 5 | Dignity note | not authored yet | none | skip |
| 5b | Ruler bridge | only when the traditional ruler's natal sign and house are known | `cc-slot-templates.json` template `5H` + planet-in-house clause | resolved text |
| 6 | Gifts and Challenges | handled by existing aspect lists | existing natal aspect content | existing rendering |

## Ruler Bridge

Use Marie's template `5H`:

`{{#has_ruler_bridge}}{{sign}} answers to {{ruler_body}} here. With {{ruler_body}} in {{ruler_sign}} in the {{ruler_house_ordinal}} house, {{ruler_bridge_same_subject}}.{{/has_ruler_bridge}}`

Resolve `ruler_body` with traditional domicile rulers only:

- Aries -> Mars
- Taurus -> Venus
- Gemini -> Mercury
- Cancer -> Moon
- Leo -> Sun
- Virgo -> Mercury
- Libra -> Venus
- Scorpio -> Mars
- Sagittarius -> Jupiter
- Capricorn -> Saturn
- Aquarius -> Saturn
- Pisces -> Jupiter

Resolve `ruler_sign` and `ruler_house_ordinal` from the calculated chart. Resolve `ruler_bridge_same_subject` from the planet-in-house authored clause for `{ruler_body}` in `{ruler_house_ordinal}`.

## Removed Layers

Do not use these removed banks:

- `cc-dignity-paragraphs.json`
- `cc-sect-paragraphs.json`
- `cc-ruler-bridge.json`
- `cc-aspect-leadins.json`

Do not render a synthesis paragraph. Do not runtime-compose natal placement prose from planet-topic plus sign-style vocabulary. Emergency hooks may still use vocabulary when no authored layer exists, but the placement scaffold itself serves only the approved fields above.
