# Coverage audit — what's complete, partial, and missing

> **UPDATE 2.** Synastry (99: inter-aspects + house overlays), composite (130: planet cores + planet-in-house), the small tails (transiting-node contacts, Ceres/Pallas/Juno/Vesta, 23 fast-planet gap pairs) are now built. And every one of the **470 transit/aspect records now carries a CHANI-quality flowing `expanded_narrative`** (15 hand-authored premium + 455 composed from the seam-clean slots, fixing capitalization and the clunky assembly frame; plain title kept, no creative headline). Bank total: **1,167 reviewed records + 127 CONFIRMED quotes**. Full pipeline `tests/build_all.sh` is green: 2216/2216 harness, 17/17 suite. Synastry and composite are the only formerly-missing surfaces, now done.



> **UPDATE (partials completed).** The four partial surfaces below have now been built out to full matrices: **natal placements** (sign layer 120 + house layer 120, which compose), **Sky collective planet-in-sign** (120), **Sky retrogrades** (9 planets + 4 phases) and **ingresses** (10), **Home planetary horoscope** (120), **Moon phase** (8) and **Moon sign** (12), and **natal angles** (48). Bank is now **851 reviewed records**, harness **1244/1244**, suite 17/17. The only surfaces still open are **synastry** and **composite** (never started), plus two small nuances noted at the bottom. The table below is the pre-update snapshot; the ✅/⚠️ marks in the right margin note the new status.

Original short answer (now largely closed): the transit-to-natal / aspect layer was broad and deep (472 reviewed aspect records), plus nodes and Chiron; the partial surfaces have since been filled; **synastry and composite remain not started.**

## Status by surface

| Surface | Status | Have (reviewed) | Needed for full coverage | Doctrine on hand |
| --- | --- | --- | --- | --- |
| **Transit → natal aspects** (`transits.personalized`) | ✅ broad | 472 aspect records — every body as transiting, all 5 aspects, + all four angles | fast-planet (Moon/Mercury/Venus/Sun/Mars) to every natal point is partial; transiting-node contacts missing | Hand *Planets in Transit* ✓ |
| **Natal aspects** (`me.natal_aspect`) | ✅ broad | same 472 pairs serve this | — | Hamaker-Zondag ✓ |
| **Natal nodes** | ✅ | 24 (NN × 12 signs + 12 houses) | node transits (transiting node → natal) | Spring, Rudhyar ✓ |
| **Chiron** | ✅ | 49 (placements + personal aspects) + 20 (→ angles) | — | folder Chiron material ✓ |
| **Natal placements** — body in sign + house synthesis (`me.natal_placement`) | ⚠️ **exemplars only (2)** | Sun-in-Aquarius-9th + a couple | the **core "Me" page**: ~120 planet-in-sign + house synthesis + sect/dignity/retro/ruler modifiers | CHANI layer-order logic ✓, cc/planet-in-sign + cc/house evidence ✓ |
| **Natal angles** — Asc/MC/Desc/IC in sign (`me.natal_angle`) | ❌ **missing** | 0 | 4 angles × 12 signs = 48 | ms/midheaven (12) evidence, general doctrine |
| **Sky collective planet-in-sign** (`sky.planet_sign`) | ⚠️ 1 fixture | Sun-in-Cancer collective | 10 bodies × 12 signs = 120 | cc/planet-in-sign evidence ✓ |
| **Current-sky aspects** (`sky.aspect`) | ⚠️ 1 fixture | Moon-conj-NN | the 472 pairs can reframe collectively; needs a collective pass | Hand/Hamaker-Zondag ✓ |
| **Retrogrades / stations** (`sky.retrograde_station`) | ⚠️ 2 fixtures | Mercury Rx Cancer, pre-shadow | per planet × phase (pre-shadow/station/Rx/post) × sign | ms/retro-phase (4) ✓, ms/mercury-rx, ms/retrograde/* ✓ |
| **Ingresses / calendar** (`sky.ingress_calendar`) | ❌ **missing** | 0 | per body ingress framing + calendar events | ms/ingress (9) ✓, cc/event-action ✓ |
| **Home — daily horoscope** | ⚠️ 1 fixture | Gemini-rising example | 12 rising signs (or per-transit daily synthesis) | cc/sign banks ✓ |
| **Home — Moon phase** | ⚠️ 2 of 8 | Balsamic, Full | all 8 phases | ms/retro + general ✓ |
| **Home — Moon sign** | ⚠️ 1 of 12 | Cancer | 12 signs | cc/sign banks ✓ |
| **Home — planetary horoscope** (personalized by rising house) | ⚠️ 2 fixtures | Sun/Moon in Cancer → Gemini-rising 2nd | 10 bodies × 12 houses (~120) | resolver + cc/house ✓ |
| **Synastry** (two-chart) | ❌ **not started** | 0 | inter-aspects (A planet × B planet), house overlays (12), the relational frame | **rich folder**: Hayden, Jansky, Suskin, ms/synastry-aspect + ms/synastry-house-overlay ✓ |
| **Composite** (relationship chart) | ❌ **not started** | 0 | composite planet in sign/house + composite aspects | composites.pdf/txt, ms/composite/planet ✓ |

Legend: ✅ broad · ⚠️ partial (fixtures/exemplars only) · ❌ missing.

## The honest summary

- **Done well:** the aspect engine — transit-to-natal and natal aspects across every body and angle (472), plus nodes and Chiron. This is the hardest, highest-volume layer and it's solid.
- **Biggest gap that matters:** the **natal placement matrix** (`Sun in X in the Nth house` for every placement). The screenshots show this is a core "Me" page, and right now it's only exemplars. The doctrine and evidence for it are all on hand.
- **Sky + Home** are wired (templates, resolver, fixtures) but need their content matrices filled (planet-in-sign collective, retrograde phases, ingresses; Moon phases/signs, daily, planetary-horoscope).
- **Synastry and composite are entirely unbuilt** — but the reference folder is unusually rich for them (three synastry books + a composites text + the ms/ synastry & composite evidence banks), so they're very doable.

## Now open (after the partials pass)

- **Synastry** (two-chart) — still 0. Rich doctrine on hand (Hayden, Jansky, Suskin + `ms/synastry-*`).
- **Composite** (relationship chart) — still 0. `composites.txt` + `ms/composite/*` on hand.
- **Two small nuances, by design:**
  - **Daily horoscope** stays a *composition* surface (date + the day's transits + rising-sign flavor), not a static 12-row matrix — the template + one fixture is the right shape; it assembles at runtime from the aspect bank + `cc/sign` flavor.
  - **Natal placement modifiers** (sect / dignity / natal-retrograde / ruler bridge) are the conditional layers on top of the sign+house synthesis. Sect eligibility logic exists (`resolver/sect.py`); the dignity/retro/ruler *clauses* are a small remaining authoring set (~a few dozen conditional lines).

## Suggested order to close it out (remaining)
1. **Synastry** — new surface: inter-aspects (A planet × B planet) + house overlays + relational voice/template.
2. **Composite** — new surface: composite planet in sign/house + composite aspects.
3. **Natal placement modifier clauses** (dignity/retro/ruler) — small, finishes the Me page.

## (historical) original suggested order

1. **Natal placement matrix** (highest product value — the Me page): planet-in-sign synthesis + house integration + the conditional modifiers (sect/dignity/retro/ruler) already specified in the contract.
2. **Sky collective** (planet-in-sign 120, retrograde phases, ingresses) — Sky tab.
3. **Home matrices** (Moon phase ×8, Moon sign ×12, planetary-horoscope ×~120, daily).
4. **Natal angles** (48) — small, quick.
5. **Synastry** (inter-aspects + house overlays) — new surface, needs its own template + relational voice.
6. **Composite** — new surface.

Each is gated by `SOURCE_GAP` today, so nothing fabricates in the meantime.
