#!/usr/bin/env python3
"""
build_natal_retrograde.py — Me/Natal RETROGRADE-by-planet (authored, needs sign-off).

PERSONAL planets (Mercury, Venus, Mars, Jupiter, Saturn, Chiron): a warm section on the
planet's placement page (CC-style) — heading "{Planet} was retrograde when you were
born." + an encouraging paragraph that reframes retrograde as inward / non-linear growth.

OUTER planets (Uranus, Neptune, Pluto): each is retrograde for roughly half the year, so
the Rx label alone carries little personal weight. They are LOW-WEIGHT conditional
modifiers, NOT defining traits:
  - default (not prominent): show the Rx marker only, no behavioral claim.
  - prominent (stationary / angular / close aspect to a personal planet, the chart ruler,
    or an angle / part of a major configuration): after house + aspect context is
    established, add ONE restrained sentence about the process being private, recurring
    internally, or slow to become visible. Soft language only ("may" / "can").

Never claim retrograde makes someone more rebellious, psychic, secretive, traumatized,
powerful, or spiritually advanced. The Sun and Moon never retrograde (omitted).
Emits phrasebank/cc-natal-retrograde-authored.json. Tier REVIEWED_CLAUSE.
"""
import json, os

# personal planets -> warm full section
PERSONAL = {
"mercury":"You think in spirals, not straight lines. With natal Mercury retrograde, understanding arrives on its own schedule: you turn things over, revisit them, and often grasp them more deeply than people who answered faster. Your mind does its best work in review and reflection. Trust that your slower, more inward way of knowing is a real intelligence, worth every extra beat it takes.",
"venus":"Love and worth are things you come to from the inside out. With natal Venus retrograde, affection and self-value don't always announce themselves easily; you tend to revisit old bonds and reexamine what you truly want before you can move forward. What you build this way is rare: a sense of worth that no one handed you. The tender work is letting what you feel inside reach the people it's meant for.",
"mars":"Your drive runs on an inner current. With natal Mars retrograde, desire and initiative gather quietly before they show; you rehearse, you strategize, and you often act with more precision than people who charge straight ahead. Directness can feel awkward, so your strength tends to work underground. Give it a clean, deliberate outlet, and that patience becomes a real advantage instead of a slow burn.",
"jupiter":"Growth, for you, has never run in a straight line. With natal Jupiter retrograde, the path to meaning loops and doubles back, and that is exactly how it is meant to go for you. Your faith and your luck get built slowly from the inside, through reflection, experiment, and the freedom to fail and begin again. What you arrive at is a wisdom you actually own, and optimism tends to find its way back to you.",
"saturn":"You answer to an inner authority. With natal Saturn retrograde, the standards you hold yourself to live inside you, often stricter than anything the world would impose, along with old doubts about whether you measure up. Structure and self-trust get built slowly, brick by brick, from within. As you ease the inner critic, its voice becomes guidance instead of punishment, and the authority you quietly earned becomes yours to claim.",
"chiron":"You heal from the inside out. With natal Chiron retrograde, the tender place you carry gets tended privately, often for years, before you ever speak it aloud, and you may become a quiet healer for others while your own sore spot stays hidden. The medicine grows within. The tender work is letting your own healing be as visible and cared for as the help you give so freely to everyone else.",
}

# outer planets -> low-weight conditional modifier (restrained sentence, gated on prominence)
OUTER_RESTRAINED = {
"uranus":"With Uranus retrograde, you may question rules privately for a long time before anyone sees you change course.",
"neptune":"With Neptune retrograde, you may sense that something does not add up before you can explain what feels wrong, and it can take time to admit when a hope, promise, or belief no longer matches what is happening.",
"pluto":"With Pluto retrograde, you may notice pressure, resentment, or control long before you name it, and you can live with the tension quietly until the arrangement has to change.",
}
PROMINENCE = [
 "stationary near the birth moment",
 "angular: conjunct the Ascendant, Midheaven, Descendant, or IC",
 "close aspect to the Sun, Moon, Mercury, Venus, or Mars",
 "close aspect to the chart ruler",
 "part of a major natal configuration",
]
AVOID_CLAIMS = ["rebellious", "psychic", "secretive", "traumatized", "powerful", "spiritually advanced"]

records = []
for planet, text in PERSONAL.items():
    records.append({"id": f"cc/natal-retrograde/{planet}", "kind": "natal_retrograde",
        "body": planet,
        "heading": f"{planet.capitalize()} was retrograde when you were born.",
        "text": text, "tier": "REVIEWED_CLAUSE", "surface": "me.natal_retrograde",
        "section_placement": "warm section on the planet's placement page (me.natal_placement)",
        "register": "natal second-person, growth-affirming",
        "doctrine_source": "A Spiritual Approach to Astrology + standard (voiced original)",
        "review_note": "authored; needs Marie/editorial sign-off"})

for planet, sentence in OUTER_RESTRAINED.items():
    records.append({"id": f"cc/natal-retrograde/{planet}", "kind": "natal_retrograde_outer",
        "body": planet, "weight": "low-weight natal modifier",
        "default": "show the Rx marker only; do not generate a defining retrograde trait",
        "restrained_sentence": sentence,
        "emit_when": PROMINENCE,
        "context_order": "name the outer planet's house, then any close aspect, then (only if prominent) this one restrained retrograde sentence",
        "caveat": "each outer planet is retrograde for roughly half the year",
        "avoid_claims": AVOID_CLAIMS,
        "soft_language": "use 'may' and 'can'",
        "tier": "REVIEWED_CLAUSE", "surface": "me.natal_retrograde",
        "generational": True,
        "review_note": "authored; needs Marie/editorial sign-off"})

out = {"_meta": {"title": "Natal retrograde by planet (authored, REVIEWED)", "count": len(records),
        "personal_sections": len(PERSONAL), "outer_modifiers": len(OUTER_RESTRAINED),
        "tier": "REVIEWED_CLAUSE", "surface": "me.natal_retrograde",
        "outer_policy": "Uranus/Neptune/Pluto are low-weight modifiers: Rx marker by default, one "
                        "restrained sentence only when stationary, angular, closely aspecting a "
                        "personal planet / chart ruler / angle, or part of a major configuration.",
        "caveat": "each outer planet is retrograde for roughly half the year",
        "omitted": "Sun and Moon never retrograde",
        "note": "Serve after sign-off."},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "phrasebank", "cc-natal-retrograde-authored.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(PERSONAL)} personal warm sections + {len(OUTER_RESTRAINED)} outer low-weight "
      f"modifiers -> {dest}")
