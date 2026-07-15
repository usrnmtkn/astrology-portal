#!/usr/bin/env python3
"""
build_outer_angle_reviews.py — the transpersonal planets (Uranus/Neptune/Pluto) to the four angles.

Completes the angle matrix: the classical seven bodies x 4 angles were done in
cc-aspect-pair-reviewed-angles.json; this adds the slow outer planets, whose
transits to an angle are among the most significant life events.

Rendered as the natal/transit angle paragraph (scene. consequence. adjustment.).
Authored: conjunction, square, trine per (outer x angle). Derived by geometry:
opposition to an angle == conjunction to the opposite angle; sextile == trine flagged act-on-it.
Doctrine (meaning only, voice original): Robert Hand, Planets in Transit; Liz Greene,
The Outer Planets and Their Cycles.
"""
import json, os

DOCTRINE = "Robert Hand, Planets in Transit; Liz Greene, The Outer Planets and Their Cycles (doctrine only, voiced original)"
OPP = {"ascendant": "descendant", "descendant": "ascendant", "midheaven": "ic", "ic": "midheaven"}

# outer -> angle -> valence -> (scene, consequence, adjustment)
DATA = {
"uranus": {
 "ascendant": {
   "conjunction": ("who you are and how you show up is being rewired, and you can't go back to the old version",
     "you feel the pull to break the image people have of you", "Let the change happen in one real, reversible step instead of all at once"),
   "square": ("how you present keeps colliding with a restlessness you can't sit still inside",
     "the urge to blow something up to feel free spikes", "Change one bounded thing before you upend the whole life"),
   "trine": ("you can reinvent how you come across without a crisis to force it",
     "a freer, more original you is easy to try on", "Take the unconventional move while it's this low-risk")},
 "midheaven": {
   "conjunction": ("your public path is being disrupted, and the career you built may no longer fit who you're becoming",
     "you feel done with the role before you have the next one", "Experiment at the edges before you torch the whole position"),
   "square": ("your ambition keeps jolting against a structure that won't hold you anymore",
     "the itch to quit or reinvent gets loud", "Test a bounded change instead of a dramatic exit"),
   "trine": ("an original, unconventional path opens in your work",
     "you can do it your own way and be backed for it", "Take the unusual professional opening now")},
 "descendant": {
   "conjunction": ("your closest relationships get shaken awake, and the terms you settled into stop fitting",
     "you or a partner needs room the old arrangement didn't allow", "Renegotiate the space out loud instead of bolting"),
   "square": ("a close relationship keeps disrupting the stability you counted on",
     "freedom and closeness feel briefly at war", "Name the need for room directly instead of acting it out"),
   "trine": ("a fresh, freer way of relating becomes available",
     "you can connect without losing yourself", "Try the unconventional relationship shape while it's easy")},
 "ic": {
   "conjunction": ("your home and roots get disrupted, and where you belong is up for redefinition",
     "you feel the urge to move, change the setup, or break from the family script", "Change one real thing about the base before you uproot it all"),
   "square": ("home and family keep jolting against your need for independence",
     "the old foundation feels too tight", "Loosen one household constraint instead of walking out"),
   "trine": ("you can rebuild home life in a freer, more original way",
     "the private base updates without a crisis", "Redesign one part of home the way you actually want it")}},
"neptune": {
 "ascendant": {
   "conjunction": ("the edges of who you are go soft, and the clear self-image you had starts to dissolve",
     "people read you differently, and you're less sure how you come across", "Ground the day in one concrete task while the identity reforms"),
   "square": ("how you present keeps blurring, and you're easily misread or misled about yourself",
     "confusion about who you are creeps in", "Handle the next real thing instead of deciding who you are from inside the fog"),
   "trine": ("a softer, more compassionate way of being yourself flows in",
     "you can dissolve an old rigidity in how you show up", "Give the gentler self one concrete form")},
 "midheaven": {
   "conjunction": ("your sense of vocation dissolves and reforms, and the old definition of success loses its hold",
     "you're pulled toward meaning over status, sometimes into fog", "Take one grounded professional step while the calling clarifies"),
   "square": ("your public direction keeps going out of focus, and effort seems to drain into mist",
     "motivation and clarity both slip", "Do one concrete, checkable task instead of forcing the whole vision"),
   "trine": ("an inspired, meaningful direction opens in your work",
     "you can bring imagination and compassion into what you do", "Give the vocation one real, tangible form")},
 "descendant": {
   "conjunction": ("a close relationship turns idealized and porous, and the line between you and them blurs",
     "you see the best in them, sometimes more than is there", "Enjoy the tenderness and keep one foot in what's actually offered"),
   "square": ("a close relationship keeps dissolving into confusion, projection, or quiet disillusion",
     "who owes what and who is who gets murky", "Wait to decide until you can see the person plainly"),
   "trine": ("compassion and imagination flow easily with a close other",
     "you can love more openly and gently", "Offer one real act of grace")},
 "ic": {
   "conjunction": ("home and roots go dreamy and undefined, and your sense of where you belong loosens",
     "the private base feels both softer and less solid", "Keep one concrete anchor at home while things reshape"),
   "square": ("home or family keeps dissolving into confusion or a longing you can't place",
     "the foundation feels foggy", "Handle one practical home thing rather than the whole diffuse mood"),
   "trine": ("home becomes a source of peace, imagination, and quiet retreat",
     "your private base softens in a healing way", "Make one restful, beautiful corner of home")}},
"pluto": {
 "ascendant": {
   "conjunction": ("who you are is being rebuilt from the ground, and a hollow version of your identity is being stripped away",
     "you feel intense, exposed, and unable to fake it", "Let the false layer go instead of gripping for control"),
   "square": ("how you show up keeps colliding with a demand to get real about power and honesty",
     "a confrontation with a hollow self-image intensifies", "Let what's false fall away rather than defending it"),
   "trine": ("you can transform how you come across with a deep, quiet authority",
     "your presence carries real weight without a fight", "Point the intensity at one honest change you want to lead")},
 "midheaven": {
   "conjunction": ("your public role is being transformed, and a version of your ambition has to die for a truer one to rise",
     "power, exposure, or a reckoning enters your career", "Rebuild the vocation on what's real, and release what was only status"),
   "square": ("your ambition keeps colliding with a power you can't overpower",
     "a control struggle in your work intensifies", "Aim the drive at real change, not at winning the power fight"),
   "trine": ("you can transform your public standing with focused, lasting power",
     "deep influence builds without a collision", "Take the ambitious rebuild while the depth is available")},
 "descendant": {
   "conjunction": ("your closest relationships are transformed, and what's been imbalanced or hidden surfaces with force",
     "intensity, power, and honesty enter a close bond", "Get clear on what you actually want before the intensity decides"),
   "square": ("a close relationship keeps forcing a reckoning with control, trust, or power",
     "jealousy or an old imbalance erupts", "Name the imbalance plainly instead of reacting to the charge"),
   "trine": ("you can deepen a relationship and let what's shallow fall away without a fight",
     "real intimacy becomes available cleanly", "Let one honest thing be said and let the depth in")},
 "ic": {
   "conjunction": ("home, family, and your roots are transformed, and something buried in the foundation surfaces to be dealt with",
     "old family power dynamics or a deep purge of the base come up", "Face what surfaces and rebuild the foundation on truth"),
   "square": ("home or family keeps forcing a confrontation with old, buried power",
     "a foundational control struggle intensifies", "Deal with the specific buried thing instead of the whole history"),
   "trine": ("you can transform your home and roots at a deep level without a crisis",
     "the private base is rebuilt cleanly and for good", "Do the deep home or family repair while it's this workable")}},
}

ASPECT_VERB = {"conjunction": "conjoins", "square": "squares", "trine": "trines",
               "opposition": "opposes", "sextile": "sextiles"}
VAL = {"conjunction": "conjunction", "square": "challenging", "trine": "supportive",
       "sextile": "supportive", "opposition": "challenging"}
records = []

def emit(body, angle, aspect, slots, derived=None, note=None):
    rec = {
      "id": f"cc/aspect-pair/{body}-{aspect}-{angle}", "pair": f"{body} {aspect} {angle}",
      "aspect": aspect, "valence": VAL[aspect], "status": "REVIEWED_CLAUSE",
      "template_family": "personalized_transit", "recommended_template": "4D",
      "angle": angle, "body": body, "transiting_body": body,
      "slots": {"angle_specific_scene": slots[0], "behavioral_consequence": slots[1],
                "proportionate_adjustment": slots[2]},
      "source_keys": [f"cc/aspect/{aspect}", f"cc/ref/aspect-psychology/{aspect}",
                      f"cc/ref/outer-planets/{body}-transit"],
      "doctrine_source": DOCTRINE, "tone_version": "marie-calibrated-v1",
      "originalityCheck": "voiced original; doctrine-grounded",
      "review_note": "needs Marie/editorial final sign-off before serving",
    }
    if derived: rec["derived_from"] = derived
    if note: rec["derivation_note"] = note
    records.append(rec)

for body, angles in DATA.items():
    for angle, av in angles.items():
        emit(body, angle, "conjunction", av["conjunction"])
        emit(body, angle, "square", av["square"])
        emit(body, angle, "trine", av["trine"])
        t = av["trine"]
        emit(body, angle, "sextile", (t[0], t[1] + ", but only if you take the opening", t[2]),
             derived=f"cc/aspect-pair/{body}-trine-{angle}",
             note="sextile = the harmonious contact as an opportunity that only pays off when acted on")
        opp = OPP[angle]; cav = DATA[body][opp]["conjunction"]
        emit(body, angle, "opposition",
             (cav[0], cav[1] + ", felt from the opposite side of the axis", cav[2]),
             derived=f"cc/aspect-pair/{body}-conjunction-{opp}",
             note=f"opposition to the {angle} is geometrically a conjunction to the {opp}; read through the opposite pole")

out = {"_meta": {"title": "Reviewed outer-planet -> angle contacts",
        "transiting": ["uranus", "neptune", "pluto"], "angles": ["ascendant", "midheaven", "descendant", "ic"],
        "authored_valences": ["conjunction", "square", "trine"],
        "derived_valences": {"sextile": "trine flagged act-on-it", "opposition": "conjunction to opposite angle"},
        "count": len(records), "tier": "REVIEWED_CLAUSE", "doctrine_source": DOCTRINE,
        "tone_version": "marie-calibrated-v1",
        "note": "Completes the angle matrix for the transpersonal planets. Rendered as the angle paragraph."},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-aspect-pair-reviewed-outer-angles.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} outer->angle contacts (3 outers x 4 angles x 5 aspects) -> {dest}")
