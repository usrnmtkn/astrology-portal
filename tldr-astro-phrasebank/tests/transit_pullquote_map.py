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

# ---------------------------------------------------------------------------
# AUDIT pools: additional (transiting_body, natal_target) themes filled from the
# full-corpus audit replacement lines (sources/marie-audit-replacements.json).
# These target the pairs the base POOLS left empty. Challenge lines -> hard
# aspects, affirming lines -> soft. All are scope=universal.
AUDIT_POOLS = {
 # MARS group -> drive / anger / courage / protection
 ("mars","jupiter"):    {"hard":["Do it, but don't confuse busyness with progress"], "soft":["The courage to choose differently lives here"], "conj":["What are you willing to fight for"]},
 ("mars","north node"): {"conj":["What are you willing to fight for"], "hard":["What are you willing to fight for"], "soft":["The courage to choose differently lives here"]},
 ("uranus","mars"):     {"conj":["If something falls apart now, it likely needed to"], "hard":["If something falls apart now, it likely needed to"], "soft":["The courage to choose differently lives here"]},
 ("jupiter","mars"):    {"conj":["The courage to choose differently lives here"], "hard":["Do it, but don't confuse busyness with progress"], "soft":["The courage to choose differently lives here"]},
 ("mercury","mars"):    {"hard":["What was the fight for"], "soft":["Say it badly if you have to"], "conj":["The body holds what the mind"]},
 ("neptune","mars"):    {"hard":["You are not meant to push harder right now"], "soft":["You're here to protect your energy"], "conj":["You are not meant to push harder right now"]},
 ("pluto","mars"):      {"hard":["This is about stopping the war with who you already are"], "soft":["You're here to protect your energy"], "conj":["Transformation isn't the breakdown"]},
 # MOON group -> emotional needs / care / receiving / home
 ("moon","sun"):        {"conj":["You're allowed to soften"], "hard":["You can't do everything alone anymore"], "soft":["You're allowed to soften"]},
 ("moon","venus"):      {"conj":["This is the kind of love that remembers your favorite song"], "hard":["You don't need to armor up to be loved"], "soft":["This is the kind of love that remembers your favorite song"]},
 ("moon","jupiter"):    {"conj":["This is the Jupiter of wells, wombs, kitchens, and kin"], "hard":["Real care needs a structure"], "soft":["This is the Jupiter of wells, wombs, kitchens, and kin"]},
 ("moon","mars"):       {"conj":["Mars in Cancer doesn't fight to win"], "hard":["The body holds what the mind"], "soft":["Mars in Cancer doesn't fight to win"]},
 ("moon","pluto"):      {"conj":["Your emotions aren't symptoms to cure"], "hard":["You can't do everything alone anymore"], "soft":["Your emotions aren't symptoms to cure"]},
 ("moon","uranus"):     {"conj":["You're allowed to soften"], "hard":["You can't do everything alone anymore"], "soft":["Success is remaining open when closing would have been easier"]},
 ("moon","chiron"):     {"conj":["You don't need to armor up to be loved"], "hard":["Without a supportive foundation"], "soft":["You don't need to armor up to be loved"]},
 ("moon","ic"):         {"conj":["This is the Jupiter of wells, wombs, kitchens, and kin"], "hard":["Without a supportive foundation"], "soft":["This is the Jupiter of wells, wombs, kitchens, and kin"]},
 ("moon","north node"): {"conj":["Connection begins with honesty"], "hard":["Connection begins with honesty"], "soft":["Connection begins with honesty"]},
 # MERCURY group -> mind / voice / being understood
 ("mercury","sun"):     {"hard":["Stop minimizing what you know"], "soft":["This is when your words become your commitments"], "conj":["Stop minimizing what you know"]},
 ("mercury","pluto"):   {"hard":["Words are choices that reveal alignment or avoidance"], "soft":["What do you know vs"], "conj":["The unspoken weighs heavy"]},
 ("mercury","midheaven"):{"hard":["You might want to be liked more than you want to be heard"], "soft":["This is when your words become your commitments"], "conj":["This is when your words become your commitments"]},
 ("mercury","chiron"):  {"hard":["Virgo's precision no longer needs to be a weapon"], "soft":["Your brain needs rest"], "conj":["Your brain needs rest"]},
 ("neptune","mercury"): {"hard":["Not everything that sounds good is true"], "soft":["Sometimes the only move is to make peace with not knowing"], "conj":["Sometimes the only move is to make peace with not knowing"]},
 # JUPITER group -> growth / faith / belonging / expansion
 ("jupiter","chiron"):  {"hard":["What will you create from the ashes"], "soft":["Not one of us is too much for the right connections"], "conj":["Boundary work becomes sacred"]},
 ("jupiter","ic"):      {"conj":["Jupiter in Cancer is about building trust"], "hard":["What will you create from the ashes"], "soft":["Jupiter in Cancer is about building trust"]},
 ("saturn","jupiter"):  {"hard":["What do you long for"], "soft":["Breathe—give the situation time to unfold"], "conj":["This is the rhythm of becoming"]},
 ("sun","jupiter"):     {"soft":["This world is deeply incomplete without your authentic voice"], "hard":["What do you long for"], "conj":["This world is deeply incomplete without your authentic voice"]},
 ("venus","jupiter"):   {"soft":["Not one of us is too much for the right connections"], "hard":["What do you long for"], "conj":["Not one of us is too much for the right connections"]},
 # NEPTUNE group -> surrender / intuition / disillusion
 ("neptune","sun"):     {"conj":["You don't need to articulate what you're feeling"], "hard":["You can't control your way to peace"], "soft":["You don't need to articulate what you're feeling"]},
 ("neptune","moon"):    {"conj":["This is where you let the ocean decide"], "hard":["You can't control your way to peace"], "soft":["This is where you let the ocean decide"]},
 ("neptune","ascendant"):{"conj":["What's in motion now is still unfolding"], "hard":["But you don't get to simply float here"], "soft":["What's in motion now is still unfolding"]},
 ("neptune","ic"):      {"conj":["This is the point where you let go"], "hard":["But you don't get to simply float here"], "soft":["This is where you let the ocean decide"]},
 # PLUTO group -> power / endings / rebirth
 ("pluto","sun"):       {"conj":["The old version of you is dead"], "hard":["The old version of you is dead"], "soft":["The past releases its grip"]},
 ("pluto","moon"):      {"conj":["Scorpio doesn't kill what's alive"], "hard":["Scorpio doesn't kill what's alive"], "soft":["The past releases its grip"]},
 ("pluto","ascendant"): {"conj":["The old version of you is dead"], "hard":["Transformation isn't the breakdown"], "soft":["What was once unclear now sharpens into focus"]},
 ("pluto","midheaven"): {"conj":["The structures we once relied on are breaking"], "hard":["The structures we once relied on are breaking"], "soft":["What was once unclear now sharpens into focus"]},
}

HARD = {"square", "opposition"}
SOFT = {"trine", "sextile"}

def valence_bucket(aspect):
    if aspect == "conjunction": return "conj"
    if aspect in HARD: return "hard"
    if aspect in SOFT: return "soft"
    return None

def _pool_order(pool, aspect):
    b = valence_bucket(aspect)
    order, seen = [], set()
    for key in [b, "conj", "hard", "soft"]:
        for sub in (pool.get(key) or []):
            if sub not in seen:
                seen.add(sub); order.append(sub)
    return order

def candidates(body, target, aspect):
    """Ordered list of identifying substrings to try for this pair (best first),
    starting with the aspect's own valence bucket then falling back. The base
    POOLS take priority; AUDIT_POOLS (fuller-corpus lines) fill what's left."""
    order, seen = [], set()
    for pool in (POOLS.get((body, target)), AUDIT_POOLS.get((body, target))):
        if not pool:
            continue
        for sub in _pool_order(pool, aspect):
            if sub not in seen:
                seen.add(sub); order.append(sub)
    return order
