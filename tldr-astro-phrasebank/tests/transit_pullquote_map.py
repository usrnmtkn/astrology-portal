#!/usr/bin/env python3
"""
transit_pullquote_map.py — theme map for attaching CONFIRMED Marie quotes to
transit-to-natal aspect-pair records (cc-aspect-pair-reviewed*.json).

The main attach_pullquotes.py THEME map is keyed to sign/house tags, which the
transit aspect-pairs (body + aspect + natal point/angle) do not carry — so those
records were rarely matched. This map is keyed to (transiting_body, natal_target)
with per-aspect-valence quote choices, so hard aspects receive challenge lines and
soft aspects receive affirming lines.

Values are SUBSTRINGS that identify a verbatim Marie line in
marie-confirmed-quotes.json (same lookup style as attach_pullquotes.py). Every
line here is her own words: tier stays CONFIRMED. Attachment is capped and
collision-checked by the builder; nothing is generated.
"""

# (transiting_body, natal_target) -> {"conj":[..], "hard":[..], "soft":[..]}
# Each list is ordered best-first; entries are identifying substrings.
POOLS = {
 # SATURN
 ("saturn","saturn"): {"conj":["Grieve the version of you"], "hard":["You are being asked to reconsider how you show up"], "soft":["Your pace is not too slow"]},
 ("saturn","sun"):    {"conj":["Authority is the power to make choices"], "hard":["Saturn doesn't want you to become faster"], "soft":["Your pace is not too slow"]},
 ("saturn","moon"):   {"hard":["The pressure to always be strong"], "soft":["Your needs are not too much"], "conj":["If you're feeling drained or pulled inward"]},
 ("saturn","mercury"):{"hard":["Your doubts, even your very well studied doubts"], "soft":["authenticity and belonging aren"], "conj":["Just because fear helps us create narratives"]},
 ("saturn","venus"):  {"hard":["No relationship, no job, no amount of success"], "soft":["Undercharging is not humility"], "conj":["Stop proving your worth to people"]},
 ("saturn","mars"):   {"conj":["Stop wearing burnout like a badge of honor"], "hard":["Saturn doesn't want you to become faster"], "soft":["Action isn't quantified by disruption"]},
 ("saturn","jupiter"):{"hard":["Starting at the wrong time wastes more time"], "soft":["Trust in the natural flow of the universe"], "conj":["Starting at the wrong time wastes more time"]},
 ("saturn","ascendant"):{"hard":["Stop needing to appear unshakeable"], "soft":["Your pace is not too slow"], "conj":["Stop needing to appear unshakeable"]},
 ("saturn","midheaven"):{"conj":["Authority is the power to make choices"], "hard":["You are being asked to reconsider how you show up"], "soft":["Where work meets worth"]},
 ("saturn","descendant"):{"hard":["Who have you become in your relationships"], "soft":["Invitation, availability, and trust"], "conj":["Invitation, availability, and trust"]},
 ("saturn","ic"):     {"conj":["The fourth house is where the bodies are buried"], "hard":["There is always change in the fourth house"], "soft":["The fourth house is a place we can"]},
 # PLUTO
 ("pluto","sun"):     {"conj":["If the foundation crumbles, who do you become"], "hard":["Stop fearing that changing means losing yourself"], "soft":["A release of something that was never truly yours"]},
 ("pluto","moon"):    {"conj":["If you've been sitting on your feelings"], "hard":["Grief is so physical"], "soft":["A release of something that was never truly yours"]},
 ("pluto","mercury"): {"hard":["Start noticing patterns"], "soft":["Memories aren't stored and static"], "conj":["Start noticing patterns"]},
 ("pluto","venus"):   {"conj":["A lesson in worth, love, and what must be left behind"], "hard":["Stop proving your worth to people"], "soft":["What we crave, what we attract"]},
 ("pluto","mars"):    {"conj":["Stop fearing that changing means losing yourself"], "hard":["Stop calling it stress when it"], "soft":["Stop fearing that changing means losing yourself"]},
 ("pluto","ascendant"):{"conj":["The way you are seen is changing"], "hard":["If the foundation crumbles, who do you become"], "soft":["The way you are seen is changing"]},
 ("pluto","midheaven"):{"hard":["Where have you convinced yourself that growth means staying put"], "soft":["Where work meets worth"], "conj":["You are being asked to reconsider how you show up"]},
 ("pluto","descendant"):{"hard":["Who have you become in your relationships"], "soft":["It reveals why it was never truly yours"], "conj":["Who have you become in your relationships"]},
 ("pluto","ic"):      {"conj":["The fourth house is where the bodies are buried"], "hard":["What rises now is not new"], "soft":["The ones you said you were done with"]},
 # URANUS
 ("uranus","sun"):    {"conj":["Sudden insights about who you are"], "hard":["You just have to stop gripping onto where you"], "soft":["Stop fearing that changing means losing yourself"]},
 ("uranus","moon"):   {"hard":["If you're feeling drained or pulled inward"], "soft":["Let the endings and beginnings happen"], "conj":["If you're feeling drained or pulled inward"]},
 ("uranus","mercury"):{"hard":["Embrace the mishaps and make the most"], "soft":["Action isn't quantified by disruption"], "conj":["Embrace the mishaps and make the most"]},
 ("uranus","venus"):  {"conj":["love doesn't need you to put out your fire"], "hard":["Let yourself want what you want"], "soft":["love doesn't need you to put out your fire"]},
 ("uranus","mars"):   {"conj":["The boat needs to be rocked"], "hard":["The Aries Full Moon is raw. Be feral"], "soft":["The boat needs to be rocked"]},
 ("uranus","ascendant"):{"conj":["The way you are seen is changing"], "hard":["The walls around you are trembling"], "soft":["The way you are seen is changing"]},
 ("uranus","midheaven"):{"hard":["What’s shifting now is not negotiable"], "soft":["Where have you convinced yourself that growth means staying put"], "conj":["What’s shifting now is not negotiable"]},
 ("uranus","descendant"):{"hard":["Who have you become in your relationships"], "soft":["authenticity and belonging aren"], "conj":["Who have you become in your relationships"]},
 ("uranus","ic"):     {"conj":["If the foundation crumbles, who do you become"], "hard":["The walls around you are trembling"], "soft":["There is always change in the fourth house"]},
 # NEPTUNE
 ("neptune","sun"):   {"conj":["aligned with your soul"], "hard":["Imagination is the only way you can contend"], "soft":["aligned with your soul"]},
 ("neptune","moon"):  {"conj":["Become the home you"], "hard":["You are enough even when you feel minuscule"], "soft":["You are enough even when you feel minuscule"]},
 ("neptune","mercury"):{"hard":["Your doubts, even your very well studied doubts"], "soft":["Imagination is the only way you can contend"], "conj":["Imagination is the only way you can contend"]},
 ("neptune","venus"): {"conj":["Vulnerability is not weakness"], "hard":["This is not just about romance"], "soft":["You don't need to fix everything to deserve love"]},
 ("neptune","mars"):  {"hard":["Action isn't quantified by disruption"], "soft":["If you're feeling drained or pulled inward"], "conj":["If you're feeling drained or pulled inward"]},
 ("neptune","ascendant"):{"conj":["You are enough even when you feel minuscule"], "hard":["Stop needing to appear unshakeable"], "soft":["You are enough even when you feel minuscule"]},
 ("neptune","midheaven"):{"hard":["have you settled for what feels safe"], "soft":["aligned with your soul"], "conj":["aligned with your soul"]},
 ("neptune","descendant"):{"conj":["Vulnerability is not weakness"], "hard":["Invitation, availability, and trust"], "soft":["Invitation, availability, and trust"]},
 ("neptune","ic"):    {"conj":["Become the home you"], "hard":["The fourth house is a place we can"], "soft":["The fourth house is a place we can"]},
 # JUPITER
 ("jupiter","sun"):   {"conj":["Trust in the natural flow of the universe"], "hard":["You're allowed to make things that don"], "soft":["Trust in the natural flow of the universe"]},
 ("jupiter","moon"):  {"hard":["Let yourself heal in the quiet moments"], "soft":["Let yourself heal in the quiet moments"], "conj":["Let yourself heal in the quiet moments"]},
 ("jupiter","mercury"):{"hard":["Skilled in conversation"], "soft":["a curious mind that enjoys exploring"], "conj":["a curious mind that enjoys exploring"]},
 ("jupiter","venus"): {"conj":["Your worth isn"], "hard":["Let yourself want what you want"], "soft":["Let yourself want what you want"]},
 ("jupiter","mars"):  {"conj":["You don't know what can happen until you try"], "hard":["failure has never scared you"], "soft":["You don't know what can happen until you try"]},
 ("jupiter","chiron"):{"hard":["Some of our most courageous people are also the most scared"], "soft":["You don't need to fix everything to deserve love"], "conj":["You don't need to fix everything to deserve love"]},
 ("jupiter","ascendant"):{"conj":["You're allowed to make things that don"], "hard":["Let yourself want what you want"], "soft":["Let yourself want what you want"]},
 ("jupiter","midheaven"):{"conj":["aligned with your soul"], "hard":["You are being asked to reconsider how you show up"], "soft":["aligned with your soul"]},
 ("jupiter","descendant"):{"conj":["Invitation, availability, and trust"], "hard":["You’re allowed to love without wondering"], "soft":["Invitation, availability, and trust"]},
 ("jupiter","ic"):    {"conj":["Become the home you"], "hard":["The fourth house is a place we can"], "soft":["Become the home you"]},
 # SUN
 ("sun","mars"):      {"hard":["Action isn't quantified by disruption"], "soft":["You don't know what can happen until you try"], "conj":["failure has never scared you"]},
 ("sun","saturn"):    {"hard":["Saturn doesn't want you to become faster"], "soft":["Your pace is not too slow"], "conj":["Authority is the power to make choices"]},
 ("sun","pluto"):     {"hard":["Stop fearing that changing means losing yourself"], "soft":["A release of something that was never truly yours"], "conj":["If the foundation crumbles, who do you become"]},
 ("sun","uranus"):    {"hard":["Sudden insights about who you are"], "soft":["Stop fearing that changing means losing yourself"], "conj":["Sudden insights about who you are"]},
 ("sun","neptune"):   {"soft":["Imagination is the only way you can contend"], "hard":["Imagination is the only way you can contend"], "conj":["aligned with your soul"]},
 ("sun","jupiter"):   {"soft":["Trust in the natural flow of the universe"], "hard":["You're allowed to make things that don"], "conj":["Trust in the natural flow of the universe"]},
 ("sun","mercury"):   {"conj":["Trust that your voice is enough"]},
 ("sun","venus"):     {"conj":["Let yourself want what you want"]},
 ("sun","north node"):{"conj":["You are being asked to reconsider how you show up"]},
 ("sun","ascendant"): {"conj":["Trust that your voice is enough"], "hard":["Stop making yourself smaller"], "soft":["Trust that your voice is enough"]},
 ("sun","midheaven"): {"conj":["Where work meets worth"], "hard":["You are being asked to reconsider how you show up"], "soft":["Where work meets worth"]},
 ("sun","descendant"):{"conj":["Who have you become in your relationships"], "hard":["Who have you become in your relationships"], "soft":["Invitation, availability, and trust"]},
 ("sun","ic"):        {"conj":["Become the home you"], "hard":["The fourth house is a place we can"], "soft":["Become the home you"]},
 # MERCURY
 ("mercury","sun"):   {"hard":["Stop believing that speed equals intelligence"], "soft":["Trust that your voice is enough"], "conj":["Stop believing that speed equals intelligence"]},
 ("mercury","mars"):  {"hard":["Stop calling it stress when it"], "soft":["share your real opinion"], "conj":["The boat needs to be rocked"]},
 ("mercury","venus"): {"soft":["share your real opinion"], "hard":["Let clarity be more important than charisma"], "conj":["share your real opinion"]},
 ("mercury","pluto"): {"hard":["Start noticing patterns"], "soft":["Start noticing patterns"], "conj":["Start noticing patterns"]},
 ("mercury","chiron"):{"hard":["You are enough even when you feel minuscule"], "soft":["You are enough even when you feel minuscule"]},
 ("mercury","jupiter"):{"soft":["a curious mind that enjoys exploring"], "hard":["Skilled in conversation"], "conj":["a curious mind that enjoys exploring"]},
 ("mercury","ascendant"):{"conj":["Trust that your voice is enough"], "hard":["Stop filling every silence with your voice"], "soft":["Trust that your voice is enough"]},
 ("mercury","midheaven"):{"conj":["Let clarity be more important than charisma"], "hard":["Let clarity be more important than charisma"], "soft":["Let clarity be more important than charisma"]},
 ("mercury","descendant"):{"hard":["exhausting yourself being everyone"], "soft":["being understood requires constant explanation"], "conj":["being understood requires constant explanation"]},
 ("mercury","ic"):    {"conj":["Memories aren't stored and static"], "hard":["Memories aren't stored and static"], "soft":["Memories aren't stored and static"]},
 # VENUS
 ("venus","sun"):     {"hard":["Let yourself want what you want"], "soft":["Let yourself want what you want"]},
 ("venus","mars"):    {"conj":["Let yourself want what you want"], "hard":["stop apologizing for having needs"], "soft":["Let yourself want what you want"]},
 ("venus","pluto"):   {"hard":["Stop proving your worth to people"], "soft":["What we crave, what we attract"], "conj":["A lesson in worth, love, and what must be left behind"]},
 ("venus","north node"):{"conj":["surrounding yourself with people who see you"], "hard":["surrounding yourself with people who see you"], "soft":["shown up for your healing"]},
 ("venus","uranus"):  {"conj":["love doesn't need you to put out your fire"], "hard":["Let yourself want what you want"], "soft":["love doesn't need you to put out your fire"]},
 ("venus","neptune"): {"soft":["You don't need to fix everything to deserve love"], "hard":["Vulnerability is not weakness"], "conj":["Vulnerability is not weakness"]},
 ("venus","saturn"):  {"hard":["No relationship, no job, no amount of success"], "soft":["Undercharging is not humility"], "conj":["Over-giving is not generosity"]},
 ("venus","jupiter"): {"soft":["Your worth isn"], "hard":["Your worth isn"], "conj":["Your worth isn"]},
 ("venus","ascendant"):{"conj":["Let yourself want what you want"], "hard":["You don't need to fix everything to deserve love"], "soft":["Let yourself want what you want"]},
 ("venus","midheaven"):{"conj":["Where work meets worth"], "hard":["Where work meets worth"], "soft":["Where work meets worth"]},
 ("venus","descendant"):{"conj":["Who have you become in your relationships"], "hard":["No relationship, no job, no amount of success"], "soft":["Invitation, availability, and trust"]},
 ("venus","ic"):      {"conj":["Become the home you"], "hard":["Become the home you"], "soft":["Become the home you"]},
 # MARS
 ("mars","sun"):      {"conj":["failure has never scared you"], "hard":["Action isn't quantified by disruption"], "soft":["You don't know what can happen until you try"]},
 ("mars","jupiter"):  {"conj":["You don't know what can happen until you try"], "hard":["failure has never scared you"], "soft":["You don't know what can happen until you try"]},
 ("mars","north node"):{"conj":["You don't know what can happen until you try"]},
 ("mars","mercury"):  {"conj":["The boat needs to be rocked"], "hard":["Stop calling it stress when it"], "soft":["share your real opinion"]},
 ("mars","venus"):    {"conj":["Let yourself want what you want"], "hard":["stop apologizing for having needs"], "soft":["Let yourself want what you want"]},
 ("mars","ascendant"):{"conj":["The Aries Full Moon is raw. Be feral"], "hard":["The boat needs to be rocked"], "soft":["The Aries Full Moon is raw. Be feral"]},
 ("mars","midheaven"):{"conj":["Action isn't quantified by disruption"], "hard":["Action isn't quantified by disruption"], "soft":["Where work meets worth"]},
 ("mars","descendant"):{"conj":["People who call you difficult"], "hard":["People who call you difficult"], "soft":["The boat needs to be rocked"]},
 ("mars","ic"):       {"conj":["Stop calling it stress when it"], "hard":["Stop calling it stress when it"], "soft":["Stop calling it stress when it"]},
 # MOON
 ("moon","sun"):      {"conj":["Let yourself heal in the quiet moments"], "hard":["Stop pretending everything"], "soft":["Let yourself heal in the quiet moments"]},
 ("moon","mercury"):  {"conj":["Some truths are felt in the body"], "hard":["Some truths are felt in the body"], "soft":["Some truths are felt in the body"]},
 ("moon","mars"):     {"conj":["Stop calling it stress when it"], "hard":["Stop calling it stress when it"], "soft":["Stop calling it stress when it"]},
 ("moon","venus"):    {"conj":["Let yourself heal in the quiet moments"], "hard":["Let yourself want what you want"], "soft":["Let yourself heal in the quiet moments"]},
 ("moon","jupiter"):  {"conj":["Let yourself heal in the quiet moments"], "hard":["Let yourself heal in the quiet moments"], "soft":["Let yourself heal in the quiet moments"]},
 ("moon","saturn"):   {"conj":["If you're feeling drained or pulled inward"], "hard":["The pressure to always be strong"], "soft":["Your needs are not too much"]},
 ("moon","pluto"):    {"conj":["If you've been sitting on your feelings"], "hard":["If you've been sitting on your feelings"], "soft":["A release of something that was never truly yours"]},
 ("moon","uranus"):   {"conj":["If you're feeling drained or pulled inward"], "hard":["If you're feeling drained or pulled inward"], "soft":["Let the endings and beginnings happen"]},
 ("moon","neptune"):  {"conj":["You are enough even when you feel minuscule"], "hard":["You are enough even when you feel minuscule"], "soft":["You are enough even when you feel minuscule"]},
 ("moon","chiron"):   {"conj":["You are enough even when you feel minuscule"], "hard":["You are enough even when you feel minuscule"], "soft":["Let yourself heal in the quiet moments"]},
 ("moon","north node"):{"conj":["Some truths are felt in the body"], "hard":["Some truths are felt in the body"], "soft":["Some truths are felt in the body"]},
 ("moon","ascendant"):{"conj":["Stop pretending everything"], "hard":["Stop pretending everything"], "soft":["Your needs are not too much"]},
 ("moon","midheaven"):{"conj":["self-care isn't some luxury you earn"], "hard":["self-care isn't some luxury you earn"], "soft":["self-care isn't some luxury you earn"]},
 ("moon","descendant"):{"conj":["Stop absorbing everyone else"], "hard":["Stop absorbing everyone else"], "soft":["Your needs are not too much"]},
 ("moon","ic"):       {"conj":["Become the home you"], "hard":["The fourth house is a place we can"], "soft":["Become the home you"]},
 # CHIRON
 ("chiron","ascendant"):{"hard":["You are enough even when you feel minuscule"], "soft":["You are enough even when you feel minuscule"]},
 ("chiron","midheaven"):{"hard":["Stop measuring your worth by your output"], "soft":["Some of our most courageous people are also the most scared"]},
 ("chiron","descendant"):{"hard":["You don't need to fix everything to deserve love"], "soft":["Invitation, availability, and trust"]},
 ("chiron","ic"):     {"hard":["The fourth house is where the bodies are buried"], "soft":["The ones you said you were done with"]},
 ("chiron","north node"):{"soft":["This is a chance to stop that cycle"], "hard":["Some of our most courageous people are also the most scared"]},
}

HARD = {"square", "opposition"}
SOFT = {"trine", "sextile"}

def valence_bucket(aspect):
    if aspect == "conjunction": return "conj"
    if aspect in HARD: return "hard"
    if aspect in SOFT: return "soft"
    return None

def candidates(body, target, aspect):
    """Ordered list of identifying substrings to try for this pair (best first),
    starting with the aspect's own valence bucket then falling back."""
    pool = POOLS.get((body, target))
    if not pool:
        return []
    b = valence_bucket(aspect)
    order, seen = [], set()
    for key in [b, "conj", "hard", "soft"]:
        for sub in (pool.get(key) or []):
            if sub not in seen:
                seen.add(sub); order.append(sub)
    return order
