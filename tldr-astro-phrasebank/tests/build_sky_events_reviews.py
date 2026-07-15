#!/usr/bin/env python3
"""
build_sky_events_reviews.py — Sky: retrogrades/stations + ingresses.

  retrograde (per planet): what it reconsiders + practical    [sky.retrograde_station]
  retro phase (4): pre-shadow / station / passage / post-shadow
  ingress (per body): what shifts when the body changes signs  [sky.ingress_calendar]
    (the destination-sign flavor is composed from planet-in-sign collective_shift at render)
Voice: Marie register. Emits phrasebank/cc-sky-events-reviewed.json.
"""
import json, os

RETRO = {
"mercury":("Mercury retrograde: how you think, talk, and plan comes up for review, and old threads and miscommunications resurface",
  "Back up, double-check, and reread before you send. Reflect and revise, don't launch"),
"venus":("Venus retrograde: love, worth, and what you value come up for review, and old flames and old wants resurface",
  "Revisit rather than begin. Hold off on the big haircut or the new relationship for now"),
"mars":("Mars retrograde: your drive and how you assert come up for review, and stalled effort and old anger resurface",
  "Slow down and rethink the strategy. Don't force it or start the fight now"),
"jupiter":("Jupiter retrograde: your beliefs, your growth, and where you've overextended come up for review",
  "Reassess what you're expanding and why. Grow inward before you grow outward"),
"saturn":("Saturn retrograde: the structures, rules, and commitments you live by come up for review",
  "Reassess your commitments and where you've been too hard on yourself. This is patient inner work"),
"uranus":("Uranus retrograde: your need for freedom and change turns inward and gets rethought",
  "Notice where you want change on the inside before you upend anything outside"),
"neptune":("Neptune retrograde: your ideals, dreams, and illusions come up for a clearer look",
  "Let a fantasy correct gently. See what's real without throwing out the dream"),
"pluto":("Pluto retrograde: your relationship to power and transformation turns inward",
  "Face the buried thing quietly. The real change this cycle is internal"),
"chiron":("Chiron retrograde: an old wound resurfaces for a deeper round of healing",
  "Tend the tender place instead of pushing past it"),
}

PHASE = {
"pre-shadow":("About two weeks before the station, the planet slows through the ground it will retrace, and the theme it's about to review starts previewing itself",
  "Act with clear purpose and a little extra care. Note what starts feeling sticky now"),
"station":("For a couple of days the planet stands still, a concentrated dose of its pure archetype before it turns",
  "Pause and pay attention. This is the turning point, not the time to push"),
"retrograde-passage":("The planet moves backward through familiar ground, and its themes turn inward for reflection and repair",
  "Reflect, revise, and mend rather than initiate. Don't sign or launch the big new thing"),
"post-shadow":("The planet moves forward again through the reviewed ground, testing what you learned",
  "Wait for the shadow to clear before you launch. Apply what the review taught you"),
}

INGRESS = {
"sun":"The Sun changes signs, so the season turns and the collective focus moves to a new set of themes",
"moon":"The Moon changes signs every couple of days, so the emotional weather shifts flavor",
"mercury":"Mercury changes signs, so how everyone thinks, talks, and gets around shifts flavor",
"venus":"Venus changes signs, so what feels attractive, pleasurable, and worth spending on shifts",
"mars":"Mars changes signs, so what everyone's driven toward, and how they fight for it, shifts",
"jupiter":"Jupiter changes signs about once a year, so the collective's growth and luck move to a new area of life",
"saturn":"Saturn changes signs every couple of years, so where the collective gets serious and tested shifts",
"uranus":"Uranus changes signs after years, so a whole area of life opens up for disruption and reinvention",
"neptune":"Neptune changes signs after years, so a whole area of life takes on a dreamier, more dissolving tone",
"pluto":"Pluto changes signs after many years, so a whole domain begins a long, deep transformation",
}

records = []
for planet,(scene,action) in RETRO.items():
    records.append({"id": f"cc/retrograde/{planet}", "kind":"retrograde", "body":planet,
      "surface":"sky.retrograde_station", "status":"REVIEWED_CLAUSE",
      "slots":{"recognizable_situation":scene, "practical_response":action},
      "source_keys":[f"cc/event-action/{planet}-retrograde", f"ms/retrograde/{planet}"],
      "tone_version":"marie-calibrated-v1","originalityCheck":"voiced original",
      "review_note":"needs Marie/editorial final sign-off before serving"})
for phase,(scene,action) in PHASE.items():
    records.append({"id": f"cc/retro-phase/{phase}", "kind":"retro_phase", "phase":phase,
      "surface":"sky.retrograde_station", "status":"REVIEWED_CLAUSE",
      "slots":{"phase_situation":scene, "practical_response":action},
      "source_keys":[f"ms/retro-phase/{phase}"], "tone_version":"marie-calibrated-v1",
      "originalityCheck":"voiced original","review_note":"needs Marie/editorial final sign-off before serving"})
for body,frame in INGRESS.items():
    records.append({"id": f"cc/ingress/{body}", "kind":"ingress", "body":body,
      "surface":"sky.ingress_calendar", "status":"REVIEWED_CLAUSE",
      "slots":{"threshold_shift":frame},
      "compose_note":"append the destination-sign flavor from cc/planet-in-sign/{body}-in-{sign}.collective_shift",
      "source_keys":[f"ms/ingress/{body}", f"cc/planet/{body}"],
      "tone_version":"marie-calibrated-v1","originalityCheck":"voiced original",
      "review_note":"needs Marie/editorial final sign-off before serving"})

out = {"_meta":{"title":"Reviewed Sky events: retrogrades/stations + ingresses",
        "retrogrades":len(RETRO), "retro_phases":len(PHASE), "ingresses":len(INGRESS),
        "count":len(records), "tier":"REVIEWED_CLAUSE", "tone_version":"marie-calibrated-v1",
        "note":"Ingress destination-sign flavor composes from planet-in-sign collective_shift."},
       "reviewed":records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-sky-events-reviewed.json")
json.dump(out, open(dest,"w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} sky-event records ({len(RETRO)} retro + {len(PHASE)} phases + {len(INGRESS)} ingress) -> {dest}")
