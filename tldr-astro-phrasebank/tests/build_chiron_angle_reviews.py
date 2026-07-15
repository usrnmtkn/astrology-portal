#!/usr/bin/env python3
"""
build_chiron_angle_reviews.py — Chiron to the four angles (completes the Chiron matrix).

Chiron on an angle puts the core wound on a life-domain threshold. Rendered as the
angle paragraph (scene. consequence. adjustment.) like the other angle sets.
Conjunction/square/trine authored; opposition + sextile derived by geometry.
Output filename joins the aspect-pair glob so it renders through the 4D angle branch.
Doctrine: wounded-healer archetype (voice original).
"""
import json, os

DOCTRINE = "Wounded-healer doctrine (Chiron), reference folder Chiron material (doctrine only, voiced original)"
OPP = {"ascendant": "descendant", "descendant": "ascendant", "midheaven": "ic", "ic": "midheaven"}

DATA = {
"ascendant": {
  "conjunction": ("the wound sits right on the surface, in your body and how you meet the world, so you can feel visibly different or marked",
    "you either hide the tender part or lead with it", "Let people meet the real, unpolished you in one small way"),
  "square": ("an old wound about your right to simply exist keeps rubbing against how you have to show up",
    "you brace for rejection before you've even entered the room", "Show up as yourself once, without the armor"),
  "trine": ("you can wear the old wound lightly, and it becomes part of what makes you approachable",
    "people feel safe with you because you're not pretending to be unhurt", "Let the healed-enough wound be visible; it's a gift")},
"midheaven": {
  "conjunction": ("the wound sits on your public role and worth, so being seen for your work touches an old inadequacy",
    "you overwork to prove yourself, or hide the work so no one can judge it", "Do the visible work anyway, wound and all"),
  "square": ("an old wound about achievement and being good enough collides with your public path",
    "you read professional setbacks as proof you don't belong", "Take the next real step; the wound doesn't decide your worth"),
  "trine": ("you can turn the old worth-wound into work that genuinely helps others",
    "your vocation carries real compassion because you know the ache", "Build the public work that heals what wounded you")},
"descendant": {
  "conjunction": ("the wound shows up through your closest relationships, so a partner can mirror your tender spot",
    "you attract wounded others to heal, or fear you're only wanted when useful", "Let one relationship be mutual, not a rescue"),
  "square": ("an old wound about being wanted keeps getting pressed in close relationships",
    "you over-give to secure love, then quietly resent it", "Ask for what you need instead of earning your place"),
  "trine": ("you can bring real healing to a close relationship without losing yourself",
    "your care lands because you know the wound firsthand", "Offer someone the acceptance in a relationship that you needed")},
"ic": {
  "conjunction": ("the wound reaches all the way home, so the family foundation itself felt unsafe or wounding",
    "you either recreate the old wound at home or overprotect against it", "Build one small piece of the safety you didn't get"),
  "square": ("an old family wound keeps rubbing against the home you're trying to build now",
    "the past reaches into your present base uninvited", "Name the inherited wound instead of passing it on"),
  "trine": ("you can heal the family wound and make home a genuinely safe place",
    "your private base becomes the refuge you always needed", "Make home the safety you can now give yourself")},
}

ASPECT_VERB = {"conjunction": "conjoins", "square": "squares", "trine": "trines", "opposition": "opposes", "sextile": "sextiles"}
VAL = {"conjunction": "conjunction", "square": "challenging", "trine": "supportive", "sextile": "supportive", "opposition": "challenging"}
records = []

def emit(angle, aspect, slots, derived=None, note=None):
    rec = {"id": f"cc/aspect-pair/chiron-{aspect}-{angle}", "pair": f"chiron {aspect} {angle}",
      "aspect": aspect, "valence": VAL[aspect], "status": "REVIEWED_CLAUSE",
      "template_family": "personalized_transit", "recommended_template": "4D",
      "angle": angle, "body": "chiron", "transiting_body": "chiron",
      "slots": {"angle_specific_scene": slots[0], "behavioral_consequence": slots[1], "proportionate_adjustment": slots[2]},
      "source_keys": [f"cc/aspect/{aspect}", f"cc/ref/aspect-psychology/{aspect}", "cc/ref/chiron/wounded-healer"],
      "doctrine_source": DOCTRINE, "tone_version": "marie-calibrated-v1",
      "originalityCheck": "voiced original; doctrine-grounded", "review_note": "needs Marie/editorial final sign-off before serving"}
    if derived: rec["derived_from"] = derived
    if note: rec["derivation_note"] = note
    records.append(rec)

for angle, av in DATA.items():
    emit(angle, "conjunction", av["conjunction"])
    emit(angle, "square", av["square"])
    emit(angle, "trine", av["trine"])
    t = av["trine"]
    emit(angle, "sextile", (t[0], t[1] + ", but only if you take the opening", t[2]),
         derived=f"cc/aspect-pair/chiron-trine-{angle}",
         note="sextile = the harmonious contact as an opportunity that only pays off when acted on")
    opp = OPP[angle]; cav = DATA[opp]["conjunction"]
    emit(angle, "opposition", (cav[0], cav[1] + ", felt from the opposite side of the axis", cav[2]),
         derived=f"cc/aspect-pair/chiron-conjunction-{opp}",
         note=f"opposition to the {angle} is geometrically a conjunction to the {opp}; read through the opposite pole")

out = {"_meta": {"title": "Reviewed Chiron -> angle contacts (completes the Chiron matrix)",
        "angles": ["ascendant", "midheaven", "descendant", "ic"], "authored_valences": ["conjunction", "square", "trine"],
        "count": len(records), "tier": "REVIEWED_CLAUSE", "doctrine_source": DOCTRINE, "tone_version": "marie-calibrated-v1"},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-aspect-pair-reviewed-chiron-angles.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} Chiron->angle contacts -> {dest}")
