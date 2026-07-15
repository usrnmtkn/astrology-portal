#!/usr/bin/env python3
"""
synastry_overlay.py — composer for house overlays (one person's planet in the other's house).

Their PLANET (what they add) x your HOUSE (the area of your life it lights up) = 120 readings.
House domains reuse the reviewed cc-synastry house-overlay phrasing. Relational voice
("they / your / between you"). No em dashes; non-deterministic.
"""
ORD = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}

# the area of YOUR life their planet lights up (reused from the reviewed overlay bank)
HOUSE_AREA = {
 1:"how you present and move: your appearance, energy, and first moves",
 2:"your money, priorities, and self-worth, and what feels worth the cost between you",
 3:"your daily talk: texting, teasing, tone, errands, and how you coordinate",
 4:"your home, privacy, and family expectations, and the emotional history you carry",
 5:"dating, play, creativity, attention, and pleasure between you",
 6:"your routines, chores, schedules, and who does what",
 7:"agreements, cooperation, and direct negotiation between you",
 8:"shared money, trust, dependency, and what each of you owes the other",
 9:"your beliefs, travel, learning, and what you each think is right",
 10:"your ambition, reputation, and public direction",
 11:"friendship, shared goals, and where you each fit in the other's future",
 12:"the private and unspoken: hidden attraction, avoided conflict, hard-to-name irritation",
}

# what THEIR planet adds to that area: essence + gift + tension + navigation
PLANET = {
 "sun":{"essence":"warmth, vitality, and a strong sense of self",
   "gift":"they can energize and affirm this part of your life, so you feel more alive and seen here",
   "tension":"their ego and yours can clash here, or their presence can start to overshadow your own",
   "navigation":"Let them light this area up without letting it become all about them."},
 "moon":{"essence":"feeling, care, and emotional attunement",
   "gift":"they can make this part of your life feel safe, nurtured, and understood",
   "tension":"moods and old sensitivities can flare here, and you may soak up each other's feelings",
   "navigation":"Let the care flow both ways, and name a feeling before it hardens into a mood."},
 "mercury":{"essence":"talk, curiosity, and mental connection",
   "gift":"conversation flows here and you think each other's thoughts, so this area is easy to coordinate",
   "tension":"nitpicking, overthinking, or talking past each other can crop up here",
   "navigation":"Keep the exchange curious rather than corrective."},
 "venus":{"essence":"affection, pleasure, and a sense of what is lovely",
   "gift":"this part of your life feels warmer, more attractive, and more enjoyable together",
   "tension":"indulgence, jealousy, or a rush to smooth things over can show up here",
   "navigation":"Enjoy the sweetness, and let honesty share the space with harmony."},
 "mars":{"essence":"drive, heat, and the urge to act",
   "gift":"they can energize and motivate this area, and the spark between you can be strong here",
   "tension":"friction, competition, or plain irritation can flare here more easily",
   "navigation":"Aim the heat at a shared goal rather than at each other."},
 "jupiter":{"essence":"generosity, optimism, and room to grow",
   "gift":"they can expand this part of your life, opening it up and making it feel more possible",
   "tension":"overpromising, excess, or taking this area for granted can creep in",
   "navigation":"Let the growth be real, and keep one foot on the ground."},
 "saturn":{"essence":"structure, seriousness, and staying power",
   "gift":"they can steady and commit to this area, giving it real weight and durability",
   "tension":"they can also feel restrictive, critical, or heavy here",
   "navigation":"Let the commitment be a foundation rather than a cage."},
 "uranus":{"essence":"excitement, freedom, and the unexpected",
   "gift":"they can wake this area up, so it feels alive, novel, and free",
   "tension":"instability, unpredictability, or sudden distance can unsettle this area",
   "navigation":"Enjoy the spark, and ask for the consistency you also need."},
 "neptune":{"essence":"romance, imagination, and a dreamy softness",
   "gift":"this part of your life can feel magical, tender, and deeply connected",
   "tension":"idealization, confusion, or quiet disappointment can cloud this area",
   "navigation":"Enjoy the enchantment while keeping your eyes open."},
 "pluto":{"essence":"intensity, depth, and transformative power",
   "gift":"they can profoundly deepen this area and change you through it",
   "tension":"control, obsession, or a power struggle can concentrate here",
   "navigation":"Let the depth transform you without letting it become a grip."},
}

def compose_overlay(planet, house):
    p = PLANET[planet]; Planet = {"sun":"Sun","moon":"Moon"}.get(planet, planet.capitalize())
    the = {"sun":"their Sun","moon":"their Moon"}.get(planet, f"their {Planet}")
    p1 = f"With {the} in your {ORD[house]} house, they light up {HOUSE_AREA[house]}. What they add to it is {p['essence']}."
    p2 = f"At its best, {p['gift']}. The catch is that {p['tension']}."
    p3 = p["navigation"]
    return {"title": f"Their {Planet} in your {ORD[house]} house",
            "eyebrow": {"label": "Synastry overlay", "planet": planet, "house": house},
            "paragraphs": [p1, p2, p3],
            "trace": {"planet": planet, "house": house,
                      "sourceKeys": [f"cc/synastry/house-overlay-{house}", f"cc/planet/{planet}"],
                      "readerAuthority": "composed-reviewed"}}
