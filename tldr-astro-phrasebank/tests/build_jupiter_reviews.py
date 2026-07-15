#!/usr/bin/env python3
"""
build_jupiter_reviews.py — transiting Jupiter -> natal personal points (long transits).

Template 4F (opening/expansion). Slots (fit the 4F frame):
    recurring_opportunity_scene | trust_or_capacity_pattern | capacity_being_developed |
    deliberate_participation | pass_context

Doctrine (meaning only, voice original): Robert Hand, Planets in Transit (Jupiter sections).
Jupiter = growth, opportunity, goodwill, confidence, with the shadow of overreach /
overindulgence on the hard aspects. Conjunction + hard (square/opposition) + soft (trine/sextile).
"""
import json, os

DOCTRINE = "Robert Hand, Planets in Transit (Jupiter sections; doctrine only, voiced original)"

# point -> valence -> (scene, trust_or_capacity_pattern, capacity_being_developed, deliberate_participation, pass_context)
DATA = {
"sun": {
 "conjunction": ("Confidence and opportunity open up around who you are, and doors you'd stopped knocking on start to give",
   "You can afford to aim higher than usual right now", "a bigger, more generous version of yourself that can hold the growth",
   "Say yes to the opportunity, sized to what you can actually honor",
   "Because Jupiter's openings come in passes, take them as they arrive rather than all at once"),
 "hard": ("A wave of confidence swells, and the temptation is to promise or take on more than you can carry",
   "The optimism is real; the scale is the thing to watch", "the judgment to grow without overreaching",
   "Take the big swing, but keep it one honest size",
   "The overreach urge returns across the passes; each one is a chance to right-size the ambition"),
 "soft": ("Growth and good fortune come easily to who you are, and expansion feels natural rather than forced",
   "Doors open through simply showing up as yourself", "an ease with being seen and backed",
   "Step into the opportunity while it's this available", "")},
"moon": {
 "conjunction": ("A warm, generous, hopeful feeling expands your emotional life, and you want to nurture and be nurtured",
   "Well-being and optimism are genuinely available", "a bigger emotional generosity toward yourself and others",
   "Let the warmth in and share it, without overdoing the comfort",
   "Take the good feeling in waves rather than trying to make it permanent"),
 "hard": ("Your feelings swell, and you promise the world on a good mood or overdo the comfort to feel full",
   "The generosity is real; the excess is the risk", "the ability to feel abundant without overindulging",
   "Enjoy the lift and keep the emotional commitments realistic",
   "The urge to overdo returns; each pass, feel the fullness without inflating it"),
 "soft": ("A hopeful, feel-good warmth flows easily and is easy to share",
   "Emotional generosity comes without effort", "a settled sense of enough",
   "Spread the warmth around while it's flowing", "")},
"mercury": {
 "conjunction": ("Your thinking expands and ideas connect, and you can see the bigger picture and explain it well",
   "Optimism and mental reach are high", "a broader, more confident mind",
   "Aim the mental energy at a real question and say the idea before it's perfect",
   "Take the insights as they come across the passes"),
 "hard": ("Big ideas and optimism run ahead of the details, and you exaggerate or overpromise on a confident hunch",
   "The vision is real; the follow-through is the gap", "the discernment to dream big and still deliver",
   "Make the bold claim real by keeping it to what you can back up",
   "The exaggeration urge recurs; each pass, ground the big idea in one fact"),
 "soft": ("Ideas flow and explaining things feels natural and expansive",
   "Mental growth comes easily now", "a wider, more generous way of thinking",
   "Pitch the idea or start the study while the mind is this open", "")},
"venus": {
 "conjunction": ("Warmth, generosity, and a little luck open up in love and money, and social life gets easy and pleasant",
   "Good feeling and goodwill are genuinely available", "a more generous, open-hearted way of relating",
   "Enjoy it and be generous without overextending",
   "Take the pleasures and connections as they come across the passes"),
 "hard": ("Affection and appetite swell, and the temptation is to overindulge, overspend, or promise more warmth than you can sustain",
   "The generosity is real; the excess is the trap", "the ability to enjoy abundance without overdoing it",
   "Enjoy the pleasure and keep it to a size you won't regret",
   "The overindulgence urge recurs; each pass, savor without overreaching"),
 "soft": ("Warmth, social ease, and a little luck in love and money flow without effort",
   "Connection and pleasure come easily", "a natural generosity that draws good things in",
   "Say yes to the pleasant, well-aligned opportunity", "")},
"mars": {
 "conjunction": ("Confident, enterprising energy expands your drive, and bold moves feel not just possible but easy",
   "The appetite for more and the energy to chase it are both high", "the ability to take a big swing and follow through",
   "Take the ambitious action, sized to what you can actually complete",
   "Take the openings to move as they come rather than all at once"),
 "hard": ("Drive and confidence swell together, and the risk is overreaching, overcommitting, or biting off more than you can chew",
   "The enthusiasm is real; the overreach is the danger", "the judgment to be bold without being reckless",
   "Take the big swing, but scale it to what you can follow through on",
   "The urge to overreach recurs; each pass, match the ambition to the capacity"),
 "soft": ("Confident, well-aimed energy flows and enterprising action comes off smoothly",
   "Effort turns into progress without a fight", "an easy, generous confidence in action",
   "Spend the energy on the ambitious thing while the timing supports it", "")},
}

ASPECTS_FOR = {"conjunction": ["conjunction"], "hard": ["square", "opposition"], "soft": ["trine", "sextile"]}
VAL = {"conjunction": "conjunction", "square": "challenging", "opposition": "challenging",
       "trine": "supportive", "sextile": "supportive"}
records = []

def add(point, aspect, t):
    scene, trust, capacity, participation, passc = t
    capacity = "What grows here is " + capacity  # 4F renders capacity as its own sentence
    if passc and passc[-1] not in ".?!":
        passc = passc + "."
    sm = {"recurring_opportunity_scene": scene, "trust_or_capacity_pattern": trust,
          "capacity_being_developed": capacity, "deliberate_participation": participation,
          "has_practical_action": True, "has_pass_context": bool(passc), "pass_context": passc}
    rec = {
      "id": f"cc/aspect-pair/jupiter-{aspect}-{point}",
      "pair": f"jupiter {aspect} {point}", "aspect": aspect, "valence": VAL[aspect],
      "status": "REVIEWED_CLAUSE", "template_family": "personalized_transit",
      "recommended_long_template": "4F", "transiting_body": "jupiter", "natal_body": point,
      "slots": sm,
      "source_keys": [f"cc/aspect/{aspect}", f"cc/ref/aspect-psychology/{aspect}",
                      "cc/ref/outer-planets/jupiter-transit"],
      "doctrine_source": DOCTRINE,
      "originalityCheck": "voiced original; doctrine-grounded; fits the 4F expansion frame",
      "review_note": "needs Marie/editorial final sign-off before serving",
    }
    if aspect == "opposition":
        rec["derivation_note"] = "opposition read as the expansion felt through other people / the outer world"
    if aspect == "sextile":
        rec["derivation_note"] = "sextile = the opening as an opportunity that only pays off when acted on"
    records.append(rec)

for point, treat in DATA.items():
    for group, t in treat.items():
        for asp in ASPECTS_FOR[group]:
            add(point, asp, t)

out = {"_meta": {"title": "Reviewed Jupiter -> personal long transits",
        "transiting": "jupiter", "natal": ["sun", "moon", "mercury", "venus", "mars"],
        "template": "4F opening/expansion", "tier": "REVIEWED_CLAUSE", "doctrine_source": DOCTRINE,
        "count": len(records),
        "note": "Jupiter expands the natal function; hard aspects carry the overreach/overindulgence shadow. Keyed transiting-Jupiter-first."},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-aspect-pair-reviewed-jupiter.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} Jupiter->personal long-transit clauses -> {dest}")
