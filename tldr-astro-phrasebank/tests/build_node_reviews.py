#!/usr/bin/env python3
"""
build_node_reviews.py — the natal lunar nodes (North Node growth axis).

The nodes are a natal AXIS, not an aspect: North Node = the growth direction the
chart is moving toward; South Node (always the opposite sign/house) = the familiar
past to release. Rendered on the Me/Natal surface as a placement paragraph:

    {growth_direction}. The easy pull backward is {release_pull}. {lived_practice}.

Authored: North Node through the 12 signs + through the 12 houses (24 placements),
each naming its South Node counterpoint. Doctrine (meaning only, voice original):
Elizabeth Spring, "North Node Astrology"; Dane Rudhyar, "The Lunar Nodes";
"Healing the Soul: Pluto, Uranus and the Lunar Nodes."
"""
import json, os

DOCTRINE = ("Elizabeth Spring, North Node Astrology; Dane Rudhyar, The Lunar Nodes; "
            "Healing the Soul: Pluto, Uranus and the Lunar Nodes (doctrine only, voiced original)")

SIGN_OPP = {"aries": "libra", "taurus": "scorpio", "gemini": "sagittarius", "cancer": "capricorn",
            "leo": "aquarius", "virgo": "pisces", "libra": "aries", "scorpio": "taurus",
            "sagittarius": "gemini", "capricorn": "cancer", "aquarius": "leo", "pisces": "virgo"}

# north-node sign -> growth_direction | release_pull | lived_practice
SIGN = {
"aries": ("Your growth is toward standing on your own two feet: acting on your own wants, starting things without a committee",
  "leaning on other people to decide, keeping the peace until you disappear",
  "Make one decision today without asking anyone first"),
"taurus": ("Your growth is toward steadiness and self-worth built slowly: knowing what's enough and letting life be simple",
  "living in crisis and entanglement, measuring yourself through other people's intensity or resources",
  "Build one calm, self-sufficient thing and let it stay uncomplicated"),
"gemini": ("Your growth is toward curiosity and real listening: asking, gathering the local facts, staying a student",
  "assuming you already know, preaching the big answer instead of hearing the actual question",
  "Ask one genuine question and let the answer change your mind"),
"cancer": ("Your growth is toward feeling and tending: letting yourself need people and build a real emotional home",
  "hiding inside control, status, and being the one who holds it all together",
  "Let one person see you before you have it handled"),
"leo": ("Your growth is toward heart and courage: creating from yourself and letting your individual warmth be seen",
  "dissolving into the group, staying detached and above it to avoid standing out",
  "Make one thing that is unmistakably yours and put your name on it"),
"virgo": ("Your growth is toward useful order: discernment, craft, and showing up for the practical, humble work",
  "escaping into fog, overwhelm, or martyrdom when the details ask something of you",
  "Do one small concrete task well instead of drifting past it"),
"libra": ("Your growth is toward partnership and fairness: considering the other person and building things with them",
  "the me-first reflex, deciding alone, treating cooperation as weakness",
  "Ask someone what they need before you push your own plan"),
"scorpio": ("Your growth is toward depth and honest intimacy: letting go, merging, facing what you'd rather not",
  "clinging to comfort, possessions, and the familiar to avoid real transformation",
  "Let one thing end or one truth surface instead of gripping the safe version"),
"sagittarius": ("Your growth is toward faith and meaning: trusting the bigger picture instead of drowning in every detail",
  "scattering into information and second-guessing, collecting opinions to avoid a direction",
  "Commit to one belief you can act on and stop polling for more data"),
"capricorn": ("Your growth is toward maturity and self-authority: taking responsibility and building a structure that's yours",
  "staying small and dependent, letting a mood or a caretaker run the decision",
  "Take charge of one thing you've been waiting for someone else to handle"),
"aquarius": ("Your growth is toward contribution and the wider circle: your gift in service of something past your own spotlight",
  "chasing approval and center stage, taking it personally when you're not the star",
  "Give to the group without needing the credit for it"),
"pisces": ("Your growth is toward trust and surrender: compassion, imagination, and letting some things be uncertain",
  "over-analysing, perfecting, and worrying every detail into the ground",
  "Let one imperfect thing be, and trust it will hold"),
}

# north-node house -> growth_direction | release_pull | lived_practice   (SN in opposite house)
HOUSE = {
1:  ("Your growth is toward being your own person: initiating, and letting yourself have wants of your own",
     "over-defining yourself through a partner or through what others need",
     "Start one thing for yourself before you check who it's for"),
2:  ("Your growth is toward your own resources and worth: building something steady that is genuinely yours",
     "depending on other people's money, power, or intensity",
     "Earn or make one thing on your own steam"),
3:  ("Your growth is toward everyday learning and connection: the near conversations, the local facts, the questions",
     "hiding behind the grand belief or the far-off answer",
     "Have the ordinary conversation and actually listen"),
4:  ("Your growth is toward a private emotional foundation: home, roots, and being cared for",
     "over-investing in status, career, and the public scoreboard",
     "Tend the home life you keep postponing for the résumé"),
5:  ("Your growth is toward personal creativity and joy: making, playing, and risking your own heart",
     "losing yourself in the group's goals and hopes",
     "Make or love one thing purely because it's yours"),
6:  ("Your growth is toward practical service and daily craft: the routine, the body, the useful work",
     "escaping into overwhelm, fantasy, or self-sacrifice",
     "Do the small daily thing that actually helps"),
7:  ("Your growth is toward partnership: cooperating, and letting another person genuinely matter",
     "going it alone and calling independence the only safe option",
     "Let someone in on a decision you'd normally make solo"),
8:  ("Your growth is toward depth and shared trust: intimacy, transformation, and letting go of control",
     "clinging to your own comfort, possessions, and the way things already are",
     "Merge or release one thing instead of guarding it"),
9:  ("Your growth is toward the bigger view: meaning and the horizon past your own street",
     "drowning in details, errands, and other people's opinions",
     "Follow one question somewhere larger than your inbox"),
10: ("Your growth is toward public contribution and responsibility: standing where you can be counted on",
     "retreating into the private and familiar when the world asks something of you",
     "Take one visible responsibility instead of staying behind the scenes"),
11: ("Your growth is toward community and the collective future: your gift among others",
     "performing for personal approval and centre stage",
     "Contribute to something shared without needing the spotlight"),
12: ("Your growth is toward surrender and inner life: rest, trust, and the unseen",
     "over-controlling the routine and worrying the details into the ground",
     "Let one thing be uncertain and unmanaged today"),
}

ORD = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th",
       8: "8th", 9: "9th", 10: "10th", 11: "11th", 12: "12th"}
HOUSE_OPP = {1: 7, 2: 8, 3: 9, 4: 10, 5: 11, 6: 12, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5, 12: 6}

records = []
def add(rid, title, sn_label, slots):
    records.append({
      "id": rid, "surface": "me.natal_placement", "kind": "lunar_node",
      "title": title, "south_node": sn_label, "status": "REVIEWED_CLAUSE",
      "slots": {"growth_direction": slots[0], "release_pull": slots[1], "lived_practice": slots[2]},
      "source_keys": ["cc/ref/nodes/north-node", "cc/ref/nodes/south-node"],
      "doctrine_source": DOCTRINE,
      "originalityCheck": "voiced original; doctrine-grounded",
      "review_note": "needs Marie/editorial final sign-off before serving",
    })

for s, sl in SIGN.items():
    add(f"cc/node/north-node-in-{s}", f"North Node in {s.capitalize()}",
        f"South Node in {SIGN_OPP[s].capitalize()}", sl)
for h, sl in HOUSE.items():
    add(f"cc/node/north-node-in-{h}-house", f"North Node in the {ORD[h]} house",
        f"South Node in the {ORD[HOUSE_OPP[h]]} house", sl)

out = {"_meta": {"title": "Reviewed natal lunar-node placements (North Node growth axis)",
        "coverage": "North Node x 12 signs + x 12 houses (each names its South Node counterpoint)",
        "surface": "me.natal_placement", "render": "{growth_direction}. The easy pull backward is {release_pull}. {lived_practice}.",
        "count": len(records), "tier": "REVIEWED_CLAUSE", "doctrine_source": DOCTRINE,
        "note": "The nodes are a natal axis, not an aspect; South Node is always the opposite sign/house."},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-node-reviewed.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} node placements (12 signs + 12 houses) -> {dest}")
