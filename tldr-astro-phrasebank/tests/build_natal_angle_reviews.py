#!/usr/bin/env python3
"""
build_natal_angle_reviews.py — natal angles in sign (me.natal_angle): 4 angles x 12 signs = 48.

Ascendant  = how you meet the world / your manner / your body
Midheaven   = your public role, vocation, reputation, what you aim for
Descendant  = what you seek and meet in close others / partners
IC          = your roots, private base, what home means at the core
Voice: Marie register. Emits phrasebank/cc-natal-angle-reviewed.json.
"""
import json, os

SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio",
         "sagittarius","capricorn","aquarius","pisces"]

ASC = {  # how you come across / meet the world
"aries":"You come across as direct, quick, and a little bold; people meet your drive first",
"taurus":"You come across as steady, warm, and unhurried; people feel your calm before anything else",
"gemini":"You come across as quick, curious, and talkative; people meet your mind first",
"cancer":"You come across as gentle and protective; people feel your care before they know you",
"leo":"You come across as warm and magnetic; people notice your presence when you enter",
"virgo":"You come across as thoughtful, precise, and a little reserved; people meet your attention to detail",
"libra":"You come across as gracious and easy to like; people meet your charm and fairness first",
"scorpio":"You come across as intense and private; people feel there's more under the surface",
"sagittarius":"You come across as open, frank, and adventurous; people meet your optimism first",
"capricorn":"You come across as composed and capable; people sense you can be relied on",
"aquarius":"You come across as a little different and independent; people notice you don't quite follow the script",
"pisces":"You come across as soft, dreamy, and receptive; people feel your gentleness first",
}
MC = {  # public role / vocation / what you aim for
"aries":"In the world you aim to lead and pioneer; you're known for going first",
"taurus":"In the world you aim to build something lasting; you're known for being steady and dependable",
"gemini":"In the world you aim to connect and communicate; you're known for your ideas and versatility",
"cancer":"In the world you aim to nurture and protect; you're known for making people feel cared for",
"leo":"In the world you aim to be seen and to create; you're known for your presence and heart",
"virgo":"In the world you aim to be useful and get it right; you're known for competence and craft",
"libra":"In the world you aim to bring balance and beauty; you're known for fairness and grace",
"scorpio":"In the world you aim to transform and go deep; you're known for intensity and insight",
"sagittarius":"In the world you aim to teach and explore; you're known for vision and honesty",
"capricorn":"In the world you aim to achieve and take charge; you're known for authority and discipline",
"aquarius":"In the world you aim to innovate and reform; you're known for original, future-facing work",
"pisces":"In the world you aim to inspire and heal; you're known for imagination and compassion",
}
DESC = {  # what you seek / meet in close others
"aries":"You're drawn to partners with drive and courage; you meet yourself through their directness",
"taurus":"You're drawn to steady, grounding partners; you meet yourself through their calm reliability",
"gemini":"You're drawn to clever, talkative partners; you meet yourself through their curiosity",
"cancer":"You're drawn to nurturing, protective partners; you meet yourself through their care",
"leo":"You're drawn to warm, confident partners; you meet yourself through their generosity",
"virgo":"You're drawn to thoughtful, capable partners; you meet yourself through their steadiness",
"libra":"You're drawn to gracious, fair partners; you meet yourself through their balance",
"scorpio":"You're drawn to intense, all-in partners; you meet yourself through their depth",
"sagittarius":"You're drawn to free, adventurous partners; you meet yourself through their honesty",
"capricorn":"You're drawn to solid, committed partners; you meet yourself through their reliability",
"aquarius":"You're drawn to independent, unconventional partners; you meet yourself through their originality",
"pisces":"You're drawn to gentle, imaginative partners; you meet yourself through their compassion",
}
IC = {  # roots / private base / what home means
"aries":"At your roots you need independence and a place you can act freely; home is your launch pad",
"taurus":"At your roots you need stability and comfort; home is your sanctuary and your ground",
"gemini":"At your roots you need stimulation and connection; home is where ideas and people move through",
"cancer":"At your roots you need deep belonging and safety; home is the heart of everything for you",
"leo":"At your roots you need warmth and to feel special; home is where you're loved out loud",
"virgo":"At your roots you need order and calm; home is where you put the world right",
"libra":"At your roots you need harmony and beauty; home is your peaceful, balanced retreat",
"scorpio":"At your roots you need privacy and depth; home is where you can be fully, safely real",
"sagittarius":"At your roots you need freedom and openness; home is a base you can always leave and return to",
"capricorn":"At your roots you need structure and a foundation you built; home is your solid ground",
"aquarius":"At your roots you need space and your own kind of belonging; home is on your own terms",
"pisces":"At your roots you need quiet and a soft place to dissolve; home is your refuge from the world",
}

ANGLES = {"ascendant": ("Ascendant", ASC), "midheaven": ("Midheaven", MC),
          "descendant": ("Descendant", DESC), "ic": ("IC", IC)}
records = []
for angle, (title, table) in ANGLES.items():
    for sign in SIGNS:
        records.append({"id": f"cc/angle/{angle}-in-{sign}", "kind": "natal_angle",
          "angle": angle, "sign": sign, "surface": "me.natal_angle", "status": "REVIEWED_CLAUSE",
          "title": f"{title} in {sign.capitalize()}",
          "slots": {"angle_sign_story": table[sign]},
          "source_keys": [f"cc/angle/{angle}", f"cc/sign/{sign}/lived-behaviors"],
          "doctrine_source": "Standard angle x sign (voiced original)", "tone_version": "marie-calibrated-v1",
          "originalityCheck": "voiced original", "review_note": "needs Marie/editorial final sign-off before serving"})

out = {"_meta": {"title": "Reviewed natal angles in sign (Asc/MC/Desc/IC x 12 signs)",
        "count": len(records), "tier": "REVIEWED_CLAUSE", "tone_version": "marie-calibrated-v1"},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-natal-angle-reviewed.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} natal-angle records (4 angles x 12 signs) -> {dest}")
