#!/usr/bin/env python3
"""
planetary_horoscope.py — the current-sky ("your horoscope") composer.

A transiting planet in a sign lands in a whole-sign house counted from the reader's rising
sign, and the reading is about that house's area of life for as long as the planet stays there.
Transiting PLANET (the mode + how long) x HOUSE (the area, by rising) = 60 short readings.
This is the fast/light layer; slow-body multi-year passages live in transit_house.py, and
dated exact hits live in transit_activation.py. No em dashes; non-deterministic.

house_of(sign, rising) = (SIGNS.index(sign) - SIGNS.index(rising)) % 12 + 1
"""
SIGNS = ["aries","taurus","gemini","cancer","leo","virgo",
         "libra","scorpio","sagittarius","capricorn","aquarius","pisces"]
ORD = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}

def house_of(sign, rising):
    return (SIGNS.index(sign) - SIGNS.index(rising)) % 12 + 1

# the area of life each house governs (concise, self-framed)
HOUSE_LIFE = {
 1:"you, your body, and how you start things",
 2:"money, worth, spending, and security",
 3:"communication, errands, learning, and your local world",
 4:"home, family, and your private life",
 5:"romance, creativity, play, and what you do for fun",
 6:"work, health, and daily routines",
 7:"partnership and your closest one-to-one dealings",
 8:"shared money, intimacy, and the things you don't say out loud",
 9:"travel, study, beliefs, and the bigger picture",
 10:"career, reputation, and where you're headed in public",
 11:"friends, groups, and the future you're building toward",
 12:"rest, reflection, and what happens behind the scenes",
}

# the transiting planet: how long it stays, the mode it sets, and how to use it
PLANET = {
 "sun":{"dur":"about a month","mode":"your attention, energy, and confidence gather here",
   "use":"put yourself and your energy where they count in this area"},
 "moon":{"dur":"a day or two","mode":"your mood and needs pass through here",
   "use":"tend to how you feel here, then let it move on"},
 "mercury":{"dur":"a couple of weeks","mode":"your thinking, talking, and errands center here",
   "use":"handle the conversations, messages, and details in this area"},
 "venus":{"dur":"a few weeks","mode":"warmth, pleasure, and what you value settle here",
   "use":"connect, enjoy, and smooth things over in this area"},
 "mars":{"dur":"about six weeks","mode":"your drive and initiative fire up here",
   "use":"act, push, and start things in this area, and watch for friction"},
}
FAST = list(PLANET.keys())

def compose_horoscope(planet, house=None, sign=None, rising=None):
    """Give either the resolved `house`, or `sign`+`rising` to compute it."""
    if house is None:
        if sign is None or rising is None:
            raise ValueError("need house, or sign+rising")
        house = house_of(sign, rising)
    p = PLANET[planet]; Planet = {"sun":"Sun","moon":"Moon"}.get(planet, planet.capitalize())
    the = {"sun":"The Sun","moon":"The Moon"}.get(planet, Planet)
    mode = p["mode"][0].upper() + p["mode"][1:]
    p1 = (f"{the} is moving through your {ORD[house]} house for {p['dur']}, so {HOUSE_LIFE[house]} "
          f"come into focus. {mode}.")
    p2 = f"A good use of it: {p['use']}."
    tr = {"planet": planet, "house": house, "readerAuthority": "composed-reviewed",
          "sourceKeys": [f"cc/planet/{planet}", f"cc/house/{house}"]}
    if sign is not None: tr["sign"] = sign
    if rising is not None: tr["rising"] = rising
    return {"title": f"{Planet} through your {ORD[house]} house",
            "eyebrow": {"label": "Your horoscope", "planet": planet, "house": house},
            "paragraphs": [p1, p2],
            "requires_birth_time": False,  # whole-sign house from rising sign only; no exact time needed
            "trace": tr}
