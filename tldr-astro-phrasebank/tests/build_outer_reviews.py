#!/usr/bin/env python3
"""
build_outer_reviews.py — outer-planet -> personal long transits.

Transiting Uranus / Neptune / Pluto to natal Sun, Moon, Mercury, Venus, Mars.
Each outer planet has its own long template and slot set (noun-phrase slots to
fit the template frames), grounded in doctrine (voice original):

  Uranus  -> 4G liberation/disruption : recurring_disruption_scene | stability_pattern |
             emerging_need | liberating_meaning | bounded_experiment
  Neptune -> 4H dissolution/uncertainty: uncertain_lived_scene | old_certainty |
             new_orientation | discernment_meaning | grounding_action
  Pluto   -> 4I transformation        : recurring_power_or_loss_scene | control_pattern |
             underlying_vulnerability | specific_cost | transformational_meaning | practical_action

Doctrine sources (meaning only): Robert Hand, Planets in Transit (per-aspect sections);
Liz Greene, The Outer Planets and Their Cycles & The Astrological Neptune; Uranus (Mari Silva);
Pluto: The Soul's Evolution. Aspect coverage: conjunction + hard (square/opposition) +
soft (trine/sextile) authored per pair; sextile derives from soft flagged act-on-it,
opposition from hard flagged felt-through-others.
"""
import json, os

DOCTRINE = ("Robert Hand, Planets in Transit; Liz Greene, The Outer Planets and Their Cycles / "
            "The Astrological Neptune; Pluto: The Soul's Evolution (doctrine only, voiced original)")

# ---- URANUS (4G): scene | stability_pattern | emerging_need | liberating_meaning | bounded_experiment
URANUS = {
"sun": {
 "conjunction": ("A restlessness with who you're supposed to be turns loud and sudden, and change you didn't plan starts arriving",
   "The steady identity you built", "a self that wants more room to be original",
   "This is less a breakdown than a wake-up: the life outgrew the role",
   "Change one real thing you can reverse and watch what the freedom shows you"),
 "hard": ("Sudden disruptions keep knocking against who you thought you were, and the pull to break free feels urgent",
   "The version of yourself you've been defending", "a freedom you keep postponing",
   "The jolts are aimed at what no longer fits, not at all of who you are",
   "Run one bounded experiment instead of detonating the whole structure"),
 "soft": ("A freer, more original version of yourself becomes easy to try on, and change feels exciting rather than threatening",
   "The routine that has held you", "the part of you ready to do it your own way",
   "Freedom is available here without a crisis to force it",
   "Take the unconventional option while it's this low-risk")},
"moon": {
 "conjunction": ("Your emotional life gets jolted awake, and old comforts suddenly feel too small to live in",
   "The domestic setup you've leaned on", "a need for emotional space you haven't named",
   "The restlessness is your feelings asking for a truer arrangement, not proof something's wrong",
   "Change one part of the home or routine and feel what opens up"),
 "hard": ("Feelings arrive without warning and the familiar refuge keeps getting disrupted",
   "The security you're gripping", "a need for room you've been denying",
   "The upheaval is pointing at where you've outgrown a comfort, not tearing down your base",
   "Give the restlessness a small, contained outlet before it forces a bigger break"),
 "soft": ("A fresh emotional freedom becomes available and you can care for yourself in a new way",
   "The old emotional habit", "a lighter, more independent way of feeling safe",
   "You can update how you find comfort without losing it",
   "Try the unfamiliar source of ease while it feels easy")},
"mercury": {
 "conjunction": ("Your thinking speeds up and jumps track, and sudden insights arrive faster than you can file them",
   "The way you've always reasoned", "a mind that wants to break its own patterns",
   "The mental jolt is an awakening, not a malfunction",
   "Write the flash of insight down before it scatters, then test one of them"),
 "hard": ("Your thoughts get erratic and impatient, and you want to blurt the disruptive thing",
   "The settled opinion you've held", "an idea that no longer fits the old frame",
   "The friction is your mind outgrowing a conclusion, not losing its grip",
   "Sleep on the impulse to upend the plan, then change one piece deliberately"),
 "soft": ("Original ideas come easily and you can think outside the usual channel",
   "The predictable approach", "a more inventive way of solving it",
   "Innovation is low-cost here if you reach for it",
   "Try the unconventional solution while the thinking is this open")},
"venus": {
 "conjunction": ("Attraction and taste turn sudden and electric, and what you want in love or money shifts overnight",
   "The relationship shape you settled into", "a need for freedom inside your connections",
   "The spark is asking you to update how you love, not to torch what's real",
   "Enjoy the novelty without mistaking a jolt for a foundation"),
 "hard": ("Your love life and values get unpredictable, and restlessness pulls at a steady arrangement",
   "The comfortable version of the relationship", "a desire for space you've been sitting on",
   "The disruption is testing what's alive in the bond, not condemning it",
   "Name the need for room directly instead of acting it out"),
 "soft": ("A freer, more unconventional warmth becomes available and you can revalue what matters without drama",
   "The habitual way you relate", "room to love or spend on your own terms",
   "You can loosen an old pattern here without losing the connection",
   "Try relating in the freer way while it feels natural")},
"mars": {
 "conjunction": ("Your drive turns impulsive and independent, and you want to act on your own terms right now",
   "The disciplined way you've channeled effort", "a need to move without asking permission",
   "The charged energy is initiative waking up, dangerous only when it's blind",
   "Point the surge at one bold, reversible move rather than a rash one"),
 "hard": ("Your actions get erratic and accident-prone, and frustration wants a sudden outlet",
   "The controlled way you usually push", "an impatience you've been sitting on",
   "The friction marks where your drive needs a new direction, not a reckless one",
   "Burn the restlessness on something physical before you force a break"),
 "soft": ("You can act freely and originally, and independent moves come off without a fight",
   "The routine way you take action", "the urge to do it your own way",
   "Bold, unconventional action is unusually low-risk now",
   "Take the independent initiative while the timing supports it")},
}

# ---- NEPTUNE (4H): scene | old_certainty | new_orientation | discernment_meaning | grounding_action
NEPTUNE = {
"sun": {
 "conjunction": ("Your sense of who you are goes soft at the edges, and your usual drive quietly loses its outline",
   "The confident self you present", "a gentler, less ego-driven sense of purpose",
   "This is your identity being rinsed of what was only performance, which feels like fog until it clears",
   "Ground the day in one concrete task while the bigger picture reforms"),
 "hard": ("Your direction gets murky and your confidence keeps slipping through your fingers",
   "The goal you were sure of", "a purpose you can't quite see yet",
   "The confusion is real, and the danger is deciding who you are from inside the haze",
   "Hold the big identity questions and just handle the next real thing in front of you"),
 "soft": ("Inspiration and compassion open easily, and a more spiritual sense of yourself flows in",
   "The narrow definition of success", "a wider, more meaningful sense of self",
   "You can dissolve an old rigidity here without losing yourself",
   "Give the vision one small concrete form so it doesn't only stay a mood")},
"moon": {
 "conjunction": ("Your feelings turn porous and dreamy, and it's hard to tell your mood from the room's",
   "The clear read you had on your needs", "a softer, more merged way of feeling",
   "The boundaries are dissolving, which is tender and disorienting at once",
   "Get quiet and name one feeling as yours before you act on any of them"),
 "hard": ("A vague emotional longing or disillusion settles in, and what you need keeps going out of focus",
   "The security you thought you had", "an emotional truth still taking shape",
   "The ache is information, and the trap is numbing it or chasing a fantasy of rescue",
   "Rest, and make no large emotional decision until the fog lifts"),
 "soft": ("Empathy and imagination flow gently, and caring for others feels natural and healing",
   "The guarded way you hold feelings", "a more open, compassionate way to relate",
   "You can soften an old defense here without being swept away",
   "Channel the tenderness into one creative or caring act")},
"mercury": {
 "conjunction": ("Your thinking turns dreamy and impressionable, and facts blur into what you wish were true",
   "The clear logic you rely on", "a more intuitive, imaginative way of knowing",
   "Imagination is rising, and with it the risk of believing the appealing version",
   "Check every important detail against something solid before you commit"),
 "hard": ("Your mind gets foggy and easily misled, and communication keeps slipping past each other",
   "The facts you were sure of", "an understanding that isn't settled yet",
   "The confusion is real; signing or promising on a hunch is where it bites",
   "Confirm in writing and postpone the binding decision"),
 "soft": ("Imaginative, intuitive thinking flows and you can picture what isn't there yet",
   "The strictly literal approach", "a more inspired way to see the problem",
   "You can loosen rigid thinking here without losing the thread",
   "Use the imagination on something you'll actually make")},
"venus": {
 "conjunction": ("Love and beauty turn luminous and idealized, and you see the best in someone or something",
   "The clear-eyed view of the relationship", "a more compassionate, less possessive way to love",
   "Idealization is rising, which is inspiring right up until it becomes a set-up for disappointment",
   "Enjoy the beauty and keep one foot in what's actually being offered"),
 "hard": ("A romantic fog or quiet disillusion settles over love or money, and what you value gets hard to see",
   "The picture you painted of them", "a truer sense of what you actually want",
   "The letdown is the fantasy correcting, not love itself failing",
   "Wait on the financial or romantic leap until you can see it plainly"),
 "soft": ("Romance, art, and compassion blend beautifully, and tenderness comes without effort",
   "The transactional view of worth", "a softer, more generous way to value things",
   "You can dissolve an old hardness in how you love here",
   "Make one beautiful thing or offer one act of grace")},
"mars": {
 "conjunction": ("Your drive goes quietly unclear, and the energy you count on keeps draining or diffusing",
   "The direct way you take action", "a subtler, more inspired kind of effort",
   "Your will is being softened, which reads as weakness but can become surrender to something larger",
   "Rest when you're depleted and aim the energy at something you actually believe in"),
 "hard": ("Your actions get undermined or misdirected, and motivation keeps leaking away",
   "The plan you were driving", "a direction you can't force into focus yet",
   "The frustration is your drive meeting fog, and pushing harder only tires you",
   "Do one small grounded action rather than forcing the whole campaign"),
 "soft": ("You can act from inspiration and compassion, and effort flows toward something meaningful",
   "The purely self-interested push", "a gentler motivation that still moves",
   "You can act in service of a vision here without losing momentum",
   "Put the energy behind the ideal while it's this available")},
}

# ---- PLUTO (4I): scene | control_pattern | underlying_vulnerability | specific_cost | transformational_meaning | practical_action
PLUTO = {
"sun": {
 "conjunction": ("A pressure to become someone truer builds, and a hollow version of yourself starts to fall away",
   "The image you've been holding together", "a fear of not mattering",
   "the exhaustion of defending a self that isn't quite real",
   "This is a death-and-rebirth of identity: what's false leaves so what's real can stand",
   "Let one outworn part of your self-image go instead of gripping for control"),
 "hard": ("Something confronts you at the root of who you are, and a power struggle over your own direction intensifies",
   "The need to stay in control of how you're seen", "a fear of powerlessness",
   "a reckoning that gets heavier the harder you grip",
   "The crisis is forcing a real transformation, not just testing you",
   "Face what's surfacing and release the part you can't actually control"),
 "soft": ("You can transform yourself deliberately, and a deep, quiet authority becomes available",
   "The habit of hiding your own power", "a fear of your own intensity",
   "influence left unused, turning into control",
   "Real change is available here without a collision to force it",
   "Point the intensity at one honest change you want to lead")},
"moon": {
 "conjunction": ("Buried feelings surface with real force, and something old and primal in your emotional life demands to be felt",
   "The way you manage and contain your feelings", "a fear of being overwhelmed",
   "brooding or a quiet compulsion that grips harder the more you resist",
   "This empties out an old emotional pattern so a truer one can form",
   "Let the deep feeling move through you instead of managing it away"),
 "hard": ("An emotional upheaval, often through home or family, brings a compulsive intensity you can't wave off",
   "The control you keep over your own needs", "a fear of dependence or loss",
   "a power struggle where the real subject is safety",
   "The pressure is transforming how you find security at the root",
   "Feel it fully, then choose your response rather than react from the grip"),
 "soft": ("You can be honest about the heavy thing and come out lighter, and deep feeling renews rather than drowns you",
   "The instinct to bury what's intense", "a fear of what's underneath",
   "depth avoided, calcifying into numbness",
   "You can transform an old emotional wound here without a crisis",
   "Say the true, buried thing and let it move you")},
"mercury": {
 "conjunction": ("Your thinking goes deep and relentless, and your mind fixes on getting to the bottom of something",
   "The need to control the narrative", "a fear of what the truth might cost",
   "obsessive rumination that mistakes digging for progress",
   "This transforms how you think by forcing the buried subject into the light",
   "Investigate honestly, then say the plain truth instead of maneuvering"),
 "hard": ("Conversations turn into contests for control, and a compulsive thought won't let you go",
   "The habit of using words to hold power", "a fear of being unheard or overpowered",
   "trust spent on a mental power play",
   "The pressure is remaking how you communicate at the root",
   "Say the honest thing directly and drop the maneuvering"),
 "soft": ("You can think penetratingly and use that depth to change something real",
   "The instinct to keep your insights hidden", "a fear of your own conclusions",
   "penetrating insight left unspoken",
   "Deep, transformative understanding is available cleanly here",
   "Put the insight to work on one real problem")},
"venus": {
 "conjunction": ("Love turns intense and consuming, and a connection surfaces power, depth, or a compulsion you can't casually hold",
   "The control you keep in how you love", "a fear of being truly known",
   "giving far more than you get and calling it devotion",
   "This transforms how you love by exposing what's been imbalanced",
   "Get clear on what you actually want from the bond before the intensity decides for you"),
 "hard": ("Jealousy, control, or an imbalance you've tolerated erupts, and a relationship or value gets forced into reckoning",
   "The power you hold or hand over in love", "a fear of loss or of not being enough",
   "resentment from an exchange that's been lopsided too long",
   "The upheaval is transforming what you value, not just breaking a bond",
   "Name the imbalance plainly instead of reacting to the charge"),
 "soft": ("You can deepen a connection and let what's shallow fall away without a fight",
   "The habit of keeping love safe and surface", "a fear of real intimacy",
   "closeness held back, going cold",
   "You can transform how you value and relate here cleanly",
   "Let one honest thing be said and let the depth in")},
"mars": {
 "conjunction": ("Your drive turns intense and unstoppable, and a will to prevail rises from somewhere deep",
   "The control you keep over your own force", "a fear of powerlessness",
   "a push that becomes domination, of a situation or a person",
   "This transforms how you use your power by showing you its real target",
   "Aim the intensity at real change rather than at winning, and don't torch a bridge you'll need"),
 "hard": ("Your drive collides with a power you can't overpower, and pushing harder only deepens a standoff that won't resolve cleanly",
   "The need to win the confrontation", "a fear of being controlled",
   "a scorched-earth fight that costs more than the point",
   "The struggle is transforming how you assert yourself at the root",
   "Channel the force into what you're building and refuse the pointless battle"),
 "soft": ("You can act with deep, focused power and move something that's been stuck",
   "The instinct to hold your full force back", "a fear of your own intensity",
   "real power left idle or leaking into control",
   "Deep, lasting action is available here without a collision",
   "Point the concentrated drive at one real, lasting change")},
}

ASPECTS_FOR = {"conjunction": ["conjunction"], "hard": ["square", "opposition"], "soft": ["trine", "sextile"]}
records = []

def add(outer, personal, aspect, slot_map, valence, template, derived=None, note=None):
    rec = {
      "id": f"cc/aspect-pair/{outer}-{aspect}-{personal}",
      "pair": f"{outer} {aspect} {personal}", "aspect": aspect,
      "valence": valence, "status": "REVIEWED_CLAUSE", "template_family": "personalized_transit",
      "recommended_long_template": template, "transiting_body": outer, "natal_body": personal,
      "slots": slot_map,
      "source_keys": [f"cc/aspect/{aspect}", f"cc/ref/aspect-psychology/{aspect}",
                      f"cc/ref/outer-planets/{outer}-transit"],
      "doctrine_source": DOCTRINE,
      "originalityCheck": "voiced original; doctrine-grounded; noun-phrase slots fit the long-template frames",
      "review_note": "needs Marie/editorial final sign-off before serving",
    }
    if derived: rec["derived_from"] = derived
    if note: rec["derivation_note"] = note
    records.append(rec)

VAL = {"conjunction": "conjunction", "square": "challenging", "opposition": "challenging",
       "trine": "supportive", "sextile": "supportive"}

# Uranus -> 4G
for personal, treat in URANUS.items():
    for group, t in treat.items():
        sm = {"recurring_disruption_scene": t[0], "stability_pattern": t[1], "emerging_need": t[2],
              "liberating_meaning": t[3], "bounded_experiment": t[4], "has_practical_action": True, "has_pass_context": False}
        for asp in ASPECTS_FOR[group]:
            note = None; der = None
            if asp in ("opposition",): note = "opposition read as the hard contact felt through other people / the outer world"
            if asp in ("sextile",): note = "sextile = the soft contact as an opportunity that only pays off when acted on"; der = f"cc/aspect-pair/uranus-trine-{personal}"
            add("uranus", personal, asp, sm, VAL[asp], "4G", der, note)

# Neptune -> 4H
for personal, treat in NEPTUNE.items():
    for group, t in treat.items():
        sm = {"uncertain_lived_scene": t[0], "old_certainty": t[1], "new_orientation": t[2],
              "discernment_meaning": t[3], "grounding_action": t[4], "has_practical_action": True, "has_pass_context": False}
        for asp in ASPECTS_FOR[group]:
            note = None; der = None
            if asp == "opposition": note = "opposition read as the hard contact felt through other people / the outer world"
            if asp == "sextile": note = "sextile = the soft contact as an opportunity that only pays off when acted on"; der = f"cc/aspect-pair/neptune-trine-{personal}"
            add("neptune", personal, asp, sm, VAL[asp], "4H", der, note)

# Pluto -> 4I
for personal, treat in PLUTO.items():
    for group, t in treat.items():
        sm = {"recurring_power_or_loss_scene": t[0], "control_pattern": t[1], "underlying_vulnerability": t[2],
              "specific_cost": t[3], "transformational_meaning": t[4], "practical_action": t[5],
              "has_practical_action": True, "has_pass_context": False}
        for asp in ASPECTS_FOR[group]:
            note = None; der = None
            if asp == "opposition": note = "opposition read as the hard contact felt through other people / the outer world"
            if asp == "sextile": note = "sextile = the soft contact as an opportunity that only pays off when acted on"; der = f"cc/aspect-pair/pluto-trine-{personal}"
            add("pluto", personal, asp, sm, VAL[asp], "4I", der, note)

out = {"_meta": {"title": "Reviewed outer-planet -> personal long transits",
        "transiting": ["uranus", "neptune", "pluto"], "natal": ["sun", "moon", "mercury", "venus", "mars"],
        "templates": {"uranus": "4G liberation", "neptune": "4H dissolution", "pluto": "4I transformation"},
        "authored_valences": ["conjunction", "hard (square/opposition)", "soft (trine/sextile)"],
        "count": len(records), "tier": "REVIEWED_CLAUSE", "doctrine_source": DOCTRINE,
        "note": "Slots are noun phrases fitted to the long-template frames (e.g. '{control_pattern} has been protecting {underlying_vulnerability}'). Outer-planet process dominates; aspect colors ease/friction."},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-aspect-pair-reviewed-outer.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} outer->personal long-transit clauses -> {dest}")
