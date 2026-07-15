#!/usr/bin/env python3
"""
build_chiron_reviews.py — Chiron, the wounded healer.

Two record types, both rendered as a Me/Natal paragraph:
  - PLACEMENTS: Chiron in sign (12) + Chiron in house (12).  slots: the_wound | the_gift | lived_practice
      render: "{the_wound}. {the_gift}. {lived_practice}."
  - ASPECTS to personal points (Sun/Moon/Mercury/Venus/Mars), conjunction + hard + soft.
      slots: wound_scene | recurring_pattern | healing_move
      render: "{wound_scene}. {recurring_pattern}. {healing_move}."

Doctrine (meaning only, voice original): the wounded-healer archetype (Chiron = the core
wound that never fully closes but becomes wisdom/mentorship for others), per the Chiron
material across the reference folder (Liz Greene, Outer Planets & Their Cycles; Healing the
Soul; Forrest, Book of the Moon). Emits phrasebank/cc-chiron-reviewed.json.
"""
import json, os

DOCTRINE = "Wounded-healer doctrine (Chiron), per reference folder Chiron material (doctrine only, voiced original)"

SIGN = {
"aries": ("Your oldest wound is around your right to exist and assert: a sense that stepping forward invites rejection",
  "It makes you the one who can give other people permission to want things out loud, because you know what it costs",
  "Do one small brave thing before you feel ready, and let it count"),
"taurus": ("Your oldest wound is around worth and security: a nagging sense you're not enough as you are",
  "You help others feel their own value without earning it, because you've had to rebuild yours",
  "Name one thing you're worth that has nothing to do with what you produce"),
"gemini": ("Your oldest wound is around your mind and voice: a fear you're not smart enough, or that what you say won't land",
  "You listen and explain in a way that helps others feel heard, because you know the ache of not being",
  "Say the half-formed thought out loud once, before you edit it into silence"),
"cancer": ("Your oldest wound is around belonging and care: a sense that home wasn't safe, or that your needs were too much",
  "You can make others feel held, because you know exactly what it's like not to be",
  "Let someone care for you before you've earned it by caring for them first"),
"leo": ("Your oldest wound is around being seen: a fear that your real self isn't special enough to love",
  "You help others shine without shame, because you know the fear of being too much and not enough at once",
  "Share one thing you made without pre-apologizing for it"),
"virgo": ("Your oldest wound is around never being good enough: a voice that says you're broken or not yet ready",
  "You can offer others real acceptance and useful help, because you know that voice intimately",
  "Leave one thing imperfect on purpose and notice your entire world doesn't fall apart"),
"libra": ("Your oldest wound is around relationship and being wanted: a fear that love requires you to disappear",
  "You help others find fairness and real connection, because you've felt the cost of one-sided love",
  "State one preference in a relationship instead of managing theirs"),
"scorpio": ("Your oldest wound is around trust and power: a betrayal or loss that taught you closeness isn't safe",
  "You can go to the depths with others without flinching, because you've been there",
  "Let one person a little further in than feels safe"),
"sagittarius": ("Your oldest wound is around meaning and faith: a sense that the story you were given failed you",
  "You help others find their own meaning, because you had to rebuild yours from scratch",
  "Act on one belief you've tested yourself, not one you were handed"),
"capricorn": ("Your oldest wound is around achievement and authority: a sense you only matter when you produce",
  "You can show others their worth isn't their output, because you're still learning it",
  "Rest once without earning it, and let that be allowed"),
"aquarius": ("Your oldest wound is around belonging: a lifelong sense of being the outsider who doesn't quite fit",
  "You make room for other outsiders, because you know how it feels to stand at the edge",
  "Let yourself belong somewhere before you decide you don't fit"),
"pisces": ("Your oldest wound is around boundaries and disillusion: a longing for something ideal that reality keeps puncturing",
  "You meet others' pain with rare compassion, because you feel it so directly",
  "Protect one boundary today without guilt for having it"),
}

HOUSE = {
1: ("Your core wound sits on your very identity and how you meet the world, so you may feel fundamentally not-okay in your own skin",
    "You help others accept themselves as they are", "Show up as yourself once without adjusting for the room"),
2: ("Your core wound sits on worth and resources, so you rarely feel quite secure or valuable enough",
    "You help others feel their own value", "Claim one thing you're worth beyond your bank balance"),
3: ("Your core wound sits on your voice and mind, so you carry a fear of not being understood",
    "You help others feel heard", "Say the thing you'd usually swallow"),
4: ("Your core wound sits on home and belonging, so the foundation felt unsafe",
    "You make others feel at home", "Build one small piece of the safety you didn't get"),
5: ("Your core wound sits on self-expression and being seen, so creating can feel unworthy",
    "You free others to create and play", "Make one thing just for you and share it anyway"),
6: ("Your core wound sits on health, usefulness, and never-good-enough daily work",
    "You help others heal and accept their limits", "Do the ordinary task without punishing yourself for how it went"),
7: ("Your core wound sits on partnership, so you fear being unwanted or losing yourself in love",
    "You help others find real, fair connection", "Stay yourself inside one close relationship"),
8: ("Your core wound sits on trust, intimacy, and shared power, so depth can feel dangerous",
    "You can hold others through their darkest material", "Let one person see the part you keep hidden"),
9: ("Your core wound sits on meaning and belief, so an old story failed you",
    "You help others build their own faith", "Live one belief you actually tested"),
10: ("Your core wound sits on achievement and public worth, so you feel you only matter when you succeed",
     "You show others their worth beyond status", "Let your value stand without the résumé for one day"),
11: ("Your core wound sits on community and belonging, so you feel like the perpetual outsider",
     "You make space for other outsiders", "Let yourself belong to one group without keeping the exit in view"),
12: ("Your core wound sits on the unseen and hidden pain, an ache you can't quite locate",
     "You meet others' invisible suffering with compassion", "Tend one quiet, private ache instead of ignoring it"),
}

# personal -> valence -> (wound_scene, recurring_pattern, healing_move)
ASPECT = {
"sun": {
 "conjunction": ("your core identity sits right on an old wound about being seen or worthy, often a father wound",
   "you overcompensate to prove yourself, or dim yourself to stay safe", "Let yourself be seen as you are in one small way, wound and all"),
 "hard": ("an old wound about who you are keeps getting pressed, and confidence feels hard-won",
   "you read every setback as proof of the old inadequacy", "Do the thing anyway; the wound doesn't get the final say"),
 "soft": ("you can reach the old identity wound without being swamped, and turn it into wisdom",
   "the pain is close enough to feel and steady enough to use", "Offer someone the courage you had to learn")},
"moon": {
 "conjunction": ("your emotional needs sit on an old wound about nurture or safety, often a mother wound",
   "you tend everyone else's feelings to avoid your own unmet need", "Let yourself need something, and let someone meet it"),
 "hard": ("an old wound about care and belonging keeps aching, and comfort feels unreliable",
   "you assume your needs are too much and hide them", "Name one need out loud instead of managing it alone"),
 "soft": ("you can feel the old emotional wound gently and offer real care from it",
   "tenderness and healing are close to the surface", "Comfort someone the way you needed to be comforted")},
"mercury": {
 "conjunction": ("your mind and voice are tied to an old wound about being heard or smart enough",
   "you over-explain to prove yourself, or go silent to avoid being wrong", "Say the imperfect thought and let it be enough"),
 "hard": ("an old wound about your intelligence or voice keeps getting poked",
   "you brace for being dismissed before anyone dismisses you", "Speak once without armoring the sentence first"),
 "soft": ("you can speak from the old wound in a way that helps others feel understood",
   "honest words come more easily than usual", "Say the true thing that would have helped you to hear")},
"venus": {
 "conjunction": ("your sense of worth and desirability sits on an old wound about being wanted or lovable",
   "you earn love by over-giving, or expect rejection and pull away first", "Let one person value you without you paying for it first"),
 "hard": ("an old wound about love and worth keeps getting tender",
   "you read distance as proof you're unlovable and over-function to fix it", "Receive one kindness without immediately returning it"),
 "soft": ("you can feel the old love-wound gently and help others feel worthy",
   "warmth and self-acceptance are within reach", "Give someone the acceptance you're still learning to give yourself")},
"mars": {
 "conjunction": ("your drive and anger are wired to an old wound about power or the right to assert",
   "you suppress your anger until it leaks, or overassert to cover the wound", "Say the direct, angry-enough thing cleanly, once"),
 "hard": ("an old wound about your potency or right to act keeps getting struck",
   "you flinch from conflict, then resent yourself for it", "Take one clean action you'd normally talk yourself out of"),
 "soft": ("you can act from the old wound without being ruled by it, and help others find their fight",
   "healthy assertion is unusually available", "Stand up for someone the way you needed someone to stand up for you")},
}

ORD = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}
ASPECTS_FOR = {"conjunction":["conjunction"],"hard":["square","opposition"],"soft":["trine","sextile"]}
VAL = {"conjunction":"conjunction","square":"challenging","opposition":"challenging","trine":"supportive","sextile":"supportive"}
records = []

def placement(rid, title, slots):
    records.append({"id": rid, "surface": "me.natal_placement", "kind": "chiron_placement",
      "title": title, "status": "REVIEWED_CLAUSE",
      "slots": {"the_wound": slots[0], "the_gift": slots[1], "lived_practice": slots[2]},
      "source_keys": ["cc/ref/chiron/wounded-healer"], "doctrine_source": DOCTRINE,
      "tone_version": "marie-calibrated-v1", "originalityCheck": "voiced original; doctrine-grounded",
      "review_note": "needs Marie/editorial final sign-off before serving"})

def aspect(personal, asp, slots, note=None):
    rec = {"id": f"cc/aspect-pair/chiron-{asp}-{personal}", "pair": f"chiron {asp} {personal}",
      "aspect": asp, "valence": VAL[asp], "surface": "me.natal_aspect", "kind": "chiron_aspect",
      "status": "REVIEWED_CLAUSE", "transiting_body": "chiron", "natal_body": personal,
      "slots": {"wound_scene": slots[0], "recurring_pattern": slots[1], "healing_move": slots[2]},
      "source_keys": [f"cc/aspect/{asp}", f"cc/ref/aspect-psychology/{asp}", "cc/ref/chiron/wounded-healer"],
      "doctrine_source": DOCTRINE, "tone_version": "marie-calibrated-v1",
      "originalityCheck": "voiced original; doctrine-grounded",
      "review_note": "needs Marie/editorial final sign-off before serving"}
    if note: rec["derivation_note"] = note
    records.append(rec)

for s, sl in SIGN.items():
    placement(f"cc/chiron/chiron-in-{s}", f"Chiron in {s.capitalize()}", sl)
for h, sl in HOUSE.items():
    placement(f"cc/chiron/chiron-in-{h}-house", f"Chiron in the {ORD[h]} house", sl)
for personal, treat in ASPECT.items():
    for group, sl in treat.items():
        for asp in ASPECTS_FOR[group]:
            note = None
            if asp == "opposition": note = "opposition read as the wound met through other people"
            if asp == "sextile": note = "sextile = the accessible-wound opening that only helps when acted on"
            aspect(personal, asp, sl, note)

out = {"_meta": {"title": "Reviewed Chiron placements + Chiron -> personal aspects (the wounded healer)",
        "placements": "Chiron x 12 signs + x 12 houses", "aspects": "Chiron to Sun/Moon/Mercury/Venus/Mars",
        "render_placement": "{the_wound}. {the_gift}. {lived_practice}.",
        "render_aspect": "{wound_scene}. {recurring_pattern}. {healing_move}.",
        "count": len(records), "tier": "REVIEWED_CLAUSE", "doctrine_source": DOCTRINE,
        "tone_version": "marie-calibrated-v1"},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-chiron-reviewed.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} Chiron records ({sum(1 for r in records if r['kind']=='chiron_placement')} placements + "
      f"{sum(1 for r in records if r['kind']=='chiron_aspect')} aspects) -> {dest}")
