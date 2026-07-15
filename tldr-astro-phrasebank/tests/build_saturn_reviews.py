#!/usr/bin/env python3
"""
build_saturn_reviews.py — the Saturn return cycle + Saturn -> personal long transits.

Template 4E (restructuring) for all. Slots (noun/sentence to fit the 4E frame):
    recurring_lived_scene | repeating_pattern | pressure_meaning | practical_action | pass_context

Doctrine (meaning only, voice original): Tom Jacobs, "Saturn Returns: Thinking Astrologically"
(the return as becoming your own authority); Robert Hand, Planets in Transit (Saturn-to-Saturn
square = identity crisis / mid-course test; Saturn-to-personal sections).

Coverage:
  - Saturn cycle to natal Saturn (the RETURN family): conjunction (return ~29/58),
    square (waxing/waning crisis ~7/21/36/43/51), opposition (~14/44), trine, sextile.
  - Transiting Saturn -> natal Sun/Moon/Mercury/Venus/Mars, conjunction + hard + soft.
Keyed saturn-{aspect}-{point} (transiting Saturn first) so these are the LONG-TRANSIT
records, distinct from any natal-aspect reading of the same geometry.
"""
import json, os

DOCTRINE = "Tom Jacobs, Saturn Returns; Robert Hand, Planets in Transit (doctrine only, voiced original)"

# scene | repeating_pattern | pressure_meaning | practical_action | pass_context ('' = none)
RETURN = {
"conjunction": ("The life you built through the last cycle gets weighed, and whatever isn't truly yours starts asking to be rebuilt on real foundations",
  "A structure you inherited or defaulted into is being tested against who you actually are now",
  "This is the return: you stop borrowing authority and start becoming your own",
  "Commit to the version of your life you'd actually choose and let the rest fall away",
  "Because Saturn is slow and stations, the reckoning arrives in passes; treat each as a checkpoint, not a final grade"),
"hard": ("Something you started about seven years ago gets tested, and you begin questioning whether you're on the right track",
  "The doubt returns each time you avoid the unglamorous work the goal actually requires",
  "The friction is a mid-course correction, not a verdict on the whole plan",
  "Do the boring, load-bearing part of the commitment instead of starting over",
  "This square recurs across the cycle; each pass asks the same question from a new angle"),
"soft": ("The structures you've built quietly hold, and steady effort turns into something durable without a fight",
  "Discipline feels supportive rather than heavy right now",
  "This is a consolidation phase in the Saturn cycle, a good window to formalize what works",
  "Make the long-term commitment and build it properly",
  ""),
}

# Saturn -> personal:  point -> valence -> (scene, pattern, meaning, action, pass)
PERSONAL = {
"sun": {
 "conjunction": ("Your direction and confidence get weighed against reality, and a long effort reaches the point where it proves out or has to be rebuilt",
   "The responsibility you've been carrying gets heavier before it gets clearer",
   "This is a maturing of who you are, not a punishment, and it asks for real foundations under the identity",
   "Do the unglamorous part and let the confidence you build be earned rather than borrowed",
   "Over the passes, keep what's proven and quietly retire what isn't"),
 "hard": ("A limit, duty, or authority stands directly in your path, and the gap between where you are and where you want to be feels stark",
   "Every time you read the block as a verdict on your worth, it gets heavier",
   "The wall is information about pacing, not proof you're not enough",
   "Name what's actually in your control and put steady work there",
   "The pressure recurs until the structure holds; treat each pass as a test, not a sentence"),
 "soft": ("Steady effort on who you're becoming pays off, and discipline feels supportive rather than heavy",
   "The long build is quietly working",
   "This is a window to commit to something durable and make it official",
   "Make the long-term commitment to the direction and build it properly", "")},
"moon": {
 "conjunction": ("Your emotional life and home get serious, and you feel the weight of what you're responsible for holding",
   "A sense of being unsupported or alone with it keeps surfacing",
   "This is your emotional foundation being rebuilt on something real, which feels heavy before it feels safe",
   "Tend the actual need and build one dependable source of comfort rather than toughing it out alone",
   "Each pass asks you to take more honest responsibility for your own care"),
 "hard": ("Your needs collide with duty or someone's distance, and comfort feels rationed",
   "You keep dropping yourself to hold it together, or reading a cool moment as the whole truth",
   "The heaviness is real weather, not a permanent verdict on your emotional life",
   "Comfort yourself first, then deal with the actual limit rather than the feeling of it",
   "The mood recurs across passes; each time, handle the concrete constraint under it"),
 "soft": ("Your feelings settle into structure, and there's real comfort in routine and knowing where you stand",
   "Steadiness and care are cooperating",
   "A good window to build a dependable emotional foundation",
   "Put one steadying routine or boundary in place", "")},
"mercury": {
 "conjunction": ("Your thinking turns serious and careful, and you're asked to commit to a plan, a study, or a hard truth over time",
   "The seriousness can read as pessimism until you use it for precision",
   "This is your mind being disciplined, not shut down, and it rewards structure and follow-through",
   "Say the plain, structured version and do the detailed work the idea actually needs",
   "Across passes, the plan gets tested and refined rather than abandoned"),
 "hard": ("Your ideas run into skepticism, delay, or heavy self-doubt, and communication feels slow or blocked",
   "You keep taking the difficulty as proof the idea is hopeless",
   "The resistance is asking for precision and patience, not surrender",
   "Say the clear, bare-bones version and let it be enough for now",
   "The block recurs until the thinking is solid; each pass sharpens it"),
 "soft": ("Your thinking is clear, careful, and organized, and you can plan and say the precise thing",
   "Focus and follow-through are both online",
   "A window for the serious conversation or the detailed long-term work",
   "Use it to structure the plan you keep putting off", "")},
"venus": {
 "conjunction": ("A relationship, or your sense of being valued, gets weighed, and warmth cools right where you most want reassurance",
   "You withdraw instead of asking directly whether you're wanted",
   "This is love being asked to prove out through what people actually do, not a sentence of loneliness",
   "Ask for what you need directly and make one commitment clearer before adding another",
   "Over the passes, the bond either earns its structure or quietly shows it can't"),
 "hard": ("A relationship, expense, or commitment feels tested, distant, or effortful, and doubt about being wanted creeps in",
   "You judge the connection by its coldest moment and pull away",
   "The chill is a test of the bond, not proof you're unwanted",
   "Name what's sustainable instead of keeping the peace at your own expense",
   "The doubt recurs; each pass asks for a more honest limit"),
 "soft": ("Affection and commitment sit easily together, and your sense of worth feels stable and worth the effort",
   "Warmth and structure agree right now",
   "A good window to define what you want and make it durable",
   "Say what you want from the relationship and build it to last", "")},
"mars": {
 "conjunction": ("Your drive gets disciplined, and raw effort has to be organized into something that lasts",
   "Impatience with the slow, structured path keeps flaring",
   "This is your energy being trained, not blocked, and controlled effort now builds real capacity",
   "Move in smaller structured steps and finish what you start",
   "Across passes, the discipline compounds if you don't force it"),
 "hard": ("Your drive runs straight into a wall of limits, delay, or authority, and the friction is frustrating",
   "You either push recklessly or freeze, and both cost you",
   "The resistance marks exactly where your effort needs to get stronger",
   "Channel the energy into disciplined, bounded action instead of a reckless push",
   "The wall recurs until the effort is structured; each pass is a strength test"),
 "soft": ("Energy and discipline cooperate, and you can work hard without burning out",
   "Steady, productive drive is available",
   "A window to build something that needs sustained effort",
   "Put the energy into the long project now", "")},
}

ASPECTS_FOR = {"conjunction": ["conjunction"], "hard": ["square", "opposition"], "soft": ["trine", "sextile"]}
VAL = {"conjunction": "conjunction", "square": "challenging", "opposition": "challenging",
       "trine": "supportive", "sextile": "supportive"}
records = []

def add(natal, aspect, t, kind):
    scene, patt, mean, action, passc = t
    if passc and passc[-1] not in ".?!":
        passc = passc + "."   # template renders {{pass_context}} without terminal punctuation
    sm = {"recurring_lived_scene": scene, "repeating_pattern": patt, "pressure_meaning": mean,
          "practical_action": action, "has_practical_action": True,
          "has_pass_context": bool(passc), "pass_context": passc}
    rec = {
      "id": f"cc/aspect-pair/saturn-{aspect}-{natal}",
      "pair": f"saturn {aspect} {natal}", "aspect": aspect, "valence": VAL[aspect],
      "status": "REVIEWED_CLAUSE", "template_family": "personalized_transit",
      "recommended_long_template": "4E", "transiting_body": "saturn", "natal_body": natal,
      "kind": kind, "slots": sm,
      "source_keys": [f"cc/aspect/{aspect}", f"cc/ref/aspect-psychology/{aspect}",
                      "cc/ref/outer-planets/saturn-transit"],
      "doctrine_source": DOCTRINE,
      "originalityCheck": "voiced original; doctrine-grounded; fits the 4E restructuring frame",
      "review_note": "needs Marie/editorial final sign-off before serving",
    }
    if aspect == "opposition":
        rec["derivation_note"] = "opposition read as the restructuring felt through others / the outer world"
    if aspect == "sextile":
        rec["derivation_note"] = "sextile = the supportive Saturn phase as an opportunity that only pays off when acted on"
    records.append(rec)

# Saturn return cycle (Saturn -> natal Saturn)
for group, t in RETURN.items():
    for asp in ASPECTS_FOR[group]:
        add("saturn", asp, t, "saturn_return_cycle")
# Saturn -> personal
for point, treat in PERSONAL.items():
    for group, t in treat.items():
        for asp in ASPECTS_FOR[group]:
            add(point, asp, t, "saturn_to_personal")

out = {"_meta": {"title": "Reviewed Saturn return cycle + Saturn -> personal long transits",
        "template": "4E restructuring", "tier": "REVIEWED_CLAUSE", "doctrine_source": DOCTRINE,
        "count": len(records),
        "return_cycle": "saturn-{conjunction|square|opposition|trine|sextile}-saturn "
                        "(return ~29/58, waxing/waning square ~7/21/36/43/51, opposition ~14/44)",
        "note": "Keyed transiting-Saturn-first; these are the long-transit records for the Transits surface."},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-aspect-pair-reviewed-saturn.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} Saturn clauses (5 return-cycle + {len(records)-5} Saturn->personal) -> {dest}")
