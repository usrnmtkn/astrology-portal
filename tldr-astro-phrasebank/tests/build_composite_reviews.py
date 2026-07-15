#!/usr/bin/env python3
"""
build_composite_reviews.py — composite chart (the relationship as its own entity).

REVOICED to lived relational scenes (not domain labels): each composite planet-in-house
is a recognizable dynamic in the bond, anchored on that house's relational arena and
developed, per the Marie principle. Doctrine: composites.txt (The Dark Pixie) — esp. its
per-house relational characters — + ms/composite/planet. Voice: the relationship as a
third thing ("this bond", "the two of you"). Emits phrasebank/cc-composite-reviewed.json.
"""
import json, os

ORD = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}

# planet core, revoiced with a felt line (not just a definition)
CORE = {
"sun":("The relationship's Sun","This is what the two of you become together that neither of you is alone. When the bond feels alive, this is the part that's shining; when it dims, this is what you've stopped feeding."),
"moon":("The relationship's Moon","This is the emotional climate of the bond, how safe it feels to be inside it. It's the difference between a relationship you can exhale in and one you're always a little braced around."),
"mercury":("The relationship's Mercury","This is how the two of you think and talk as a unit, whether words come easily and what you keep circling back to. When it flows, you can sort almost anything out loud; when it jams, small things turn into standoffs."),
"venus":("The relationship's Venus","This is the bond's capacity for pleasure and affection, the glue of genuinely liking each other. It's what keeps you choosing each other's company, not just staying."),
"mars":("The relationship's Mars","This is the bond's shared drive and its friction, how the two of you go after things and how you fight. Aimed well it's a team; aimed at each other it's a war."),
"saturn":("The relationship's Saturn","This is the backbone and the weight of the bond, what commits you and where it feels heavy or tested. It's the part that asks whether you'll still choose this when it's work."),
"jupiter":("The relationship's Jupiter","This is where the bond grows and feels generous, the room it gives you both to expand. It's the part of the relationship that makes your life bigger, not smaller."),
"uranus":("The relationship's Uranus","This is the bond's need for freedom and its knack for surprise, where routine kills it and space keeps it alive. It's the part that resists being made ordinary."),
"neptune":("The relationship's Neptune","This is the shared dream and the blind spot, the ideal you reach for together and the place you can quietly fool each other. It's where the bond is most magical and least clear."),
"pluto":("The relationship's Pluto","This is the bond's depth and its power dynamic, how it transforms you both and where control becomes a question. It's the part that changes you, for better or worse."),
}

# per-planet lived relational scene in each house (anchored on the house's relational arena)
H = {
"sun": {
 1:"This relationship becomes the main character of both your lives, the thing you build everything else around. That's the gift and the trap, so don't let the 'us' quietly eat the two people who made it.",
 2:"This bond runs on shared values and building something real, and it's genuinely good at growing something that lasts. But if you don't actually agree on what matters, you'll both dig in and try to win a fight nobody can.",
 3:"This is a relationship that lives in conversation, the running commentary, the texts, the ideas passed back and forth. The mental connection is real; the work is letting it get past clever and into honest.",
 4:"This bond wants to be home, and it can feel like family fast. But the fourth house is where the bodies are buried, so make sure you're building something of your own here, not re-running someone else's marriage.",
 5:"This relationship comes alive when you're playing, flirting, and making things together. It stays warm as long as you keep dating each other, and the day you stop courting is the day it starts feeling like roommates.",
 6:"This is a working relationship in the plainest sense, built on being useful to each other day to day. Watch the ledger, because the moment one of you is always giving and the other always taking, resentment moves in and doesn't leave.",
 7:"This bond is built for real partnership, two equals actually facing life together, and commitment comes easier here. Invitation, availability, and trust are also actions, so keep choosing each other on purpose.",
 8:"This is a serious, all-the-way-in relationship that changes both of you and refuses to stay shallow. The eighth house isn't a curse, it's a slow burn, so remember the word 'eventually' and don't try to control what only trust can hold.",
 9:"This relationship is about getting bigger together, travel, ideas, belief, the horizon. The ninth house is the house of freedom, and this bond needs it, so cage it and you'll lose it faster than you can explain.",
 10:"This is a couple with a public face and a shared ambition, the kind other people can see. Just remember status is the role you play for others, while the real relationship is the private thing underneath, so feed that one.",
 11:"This is a friendship-first bond built on a shared future and the goals you're both walking toward. The strength of a team like this isn't speed, it's endurance, so keep the friendship alive under everything else it becomes.",
 12:"A lot of this relationship lives out of sight, tender, private, half-spoken. There's real soul here, so watch the pull to keep it secret or to disappear into it, because what stays hidden between you tends to run the show.",
},
"moon": {
 1:"The two of you feel each other's moods before a word is said, and the relationship wears its heart right on its face. That's real intimacy, and it also means one person's bad day can flood the whole thing.",
 2:"Feeling safe here is tangled up with feeling secure, so comfort, money, and steadiness matter more than either of you likes to admit. Tend the practical and the emotional settles down with it.",
 3:"This bond talks its feelings through, and it needs the small daily check-ins to feel close. Silence reads as distance here, so keep the little conversations going even when there's nothing urgent to say.",
 4:"Emotionally this relationship is a home, and it can feel like family almost too fast. The comfort is deep, but the fourth house is where the bodies are buried, so watch where the old family patterns start running the two of you.",
 5:"This bond feels loved through play, flirting, and being genuinely delighted in. Your needs are not too much here, so keep expressing the warmth out loud instead of assuming it's understood.",
 6:"This relationship shows love in the unglamorous way, the small daily acts of tending each other. Just make sure the caretaking runs both directions, or one of you quietly empties out while the other stays full.",
 7:"Emotional safety here comes through partnership itself, the feeling of being met and matched. You steady each other, so when it wobbles, lean on being a team rather than retreating to separate corners.",
 8:"Feelings here run deep, private, and all in, and this bond reaches places neither of you shows anyone else. Vulnerability isn't weakness here, it's the whole point, so let it stay honest instead of tipping into jealousy or control.",
 9:"This relationship feels best with room, hope, and something to look forward to together. It needs freedom to stay warm, so don't mistake space for distance, they're not the same thing.",
 10:"The two of you feel closest while building something visible together, a shared standing, a goal, a project. Just don't let the project become the only room the feelings are allowed to live in.",
 11:"This bond feels like home inside a wider circle, friends, community, a future you're both aimed at. It's warmest when you belong to something together, not only to each other.",
 12:"The emotional life here is quiet and inward, and most of it happens under the surface. Say the unspoken things out loud sometimes, because tenderness that never gets named slowly turns into fog.",
},
"venus": {
 1:"Affection sits right on the surface here, and the two of you simply like being around each other. It's an easy, warm bond, so let the plain liking count as much as the grand loving.",
 2:"This relationship shows love through comfort and the good things shared, and your worth here isn't what you have, it's what you give and receive. Build a genuinely pleasant life together and mean it.",
 3:"Warmth here travels through words, wit, and the little kindnesses of daily talk. This bond loves out loud, so keep flirting in the conversation instead of going quiet and comfortable.",
 4:"This is love that wants to nest, cozy, domestic, home. It's tender and sweet, and it only stays that way if the shared space is somewhere you both actually want to be, not just end up.",
 5:"This relationship lights up through play and romance, dates, flirting, making things together. It stays warm as long as you keep dating each other, and the day the fun stops it starts feeling like a chore.",
 6:"Love here shows up as service, the quiet practical acts of tending each other's days. Just say the affection out loud too, because you don't need to fix everything to deserve love, and neither do they.",
 7:"This bond is built for partnership, and being an 'us' is genuinely the pleasure of it. For two people to complement each other, both have to be willing to receive as well as give, so keep it even.",
 8:"Attraction here runs deep and a little consuming, intimate and loyal and allergic to shallow. Let it be that deep without letting closeness quietly turn into possession.",
 9:"This is love with room in it, adventure, honesty, and a shared sense of what's beautiful and true. Keep exploring together, because sameness dulls this particular bond faster than conflict does.",
 10:"The two of you value building something worthwhile and visible together, and love shows up inside the shared ambition. Just keep some of the affection private, off the record, not only in the public project.",
 11:"This relationship loves like best friends, easy and accepting, warm without a lot of pressure. Keep the friendship at the center, because that's the room the affection actually lives in.",
 12:"There's a tender, almost otherworldly sweetness here, and the love can feel fated. Keep one foot on the ground, because it's easy to fall for the version of each other you imagined instead of the real one.",
},
"mars": {
 1:"The two of you spark, and there's real drive between you, sometimes as passion, sometimes as friction, often as both. Aim that heat at the life you're building, not at each other.",
 2:"The heat here gathers around money, values, and what's worth the effort. Decide together what you're actually building, or the drive curdles into a slow tug-of-war over whose priorities win.",
 3:"This bond argues and flirts in the same breath, quick, sharp, stimulating. Watch the tone, because clever turns into cutting fast, and words said in this relationship are hard to unsay.",
 4:"The friction here lives at home, around space, family, and the small daily terms of living together. Deal with the household stuff out loud and early, because it doesn't dissolve, it simmers.",
 5:"There's strong chemistry and a streak of playful competition here, and the passion is a real part of the draw. Keep it play, and don't let the need to win start mattering more than the wanting.",
 6:"The drive here pours into the daily grind, and the fights are almost always about chores, effort, and who does what. Split the load fairly on purpose, because that's the exact spot resentment starts.",
 7:"This bond clashes out in the open, which is actually healthy if you fight fair. Have it out cleanly and face to face, rather than letting the resentment go underground and come out sideways.",
 8:"The intensity here runs deep, around power, control, and what the two of you share. It's magnetic and combustible, so point it at transforming something real, not at winning the point.",
 9:"The energy here wants to move, travel, argue belief, chase something bigger. Aim the drive at a shared adventure, because turning it into a contest over who's right burns the bond down.",
 10:"The two of you are wired to build and achieve together, and the ambition is part of the attraction. Just make sure you're both pushing toward the same goal, not quietly competing for it.",
 11:"This bond does its best fighting for something, not with each other, channeling the drive into shared causes and goals. Put the energy toward something you both actually believe in.",
 12:"The anger here goes underground, unspoken and indirect and hard to name. Say the frustration plainly, because buried Mars doesn't disappear, it leaks out as everything except the truth.",
},
"saturn": {
 1:"This relationship is serious and defining, and it asks both of you to show up like adults from the start. It can feel heavy, but Saturn just wants you to act your age, and this is the kind of bond that lasts if you let it.",
 2:"Commitment here is tied to security and what you build slowly together, brick by unglamorous brick. It isn't flashy, but it's durable, so do the patient work and let it compound.",
 3:"The weight here settles on communication, and words can feel careful, measured, or stuck. Say the plain thing even when it's hard, because in this bond silence doesn't stay neutral, it hardens into distance.",
 4:"This bond takes home and family seriously, often with real weight carried over from the past. Build the foundation on purpose, because the fourth house is where the bodies are buried and old family scripts run quietly until you name them.",
 5:"Saturn cools the fun here, so romance and play take more effort and the whole thing can feel a little restrained. Put joy on the calendar if you have to, because this relationship won't manufacture it on its own.",
 6:"This is a duty-bound, hardworking relationship that runs on responsibility and shows up every day. Just make sure it isn't only obligation, because a bond that's all work eventually feels like a job you can't quit.",
 7:"Commitment is the whole theme here, and this bond is built to be real, defined, and lasting. It asks for honest limits and follow-through, and unlike most things, it actually rewards them.",
 8:"The seriousness here runs deep, around trust, shared resources, and control. It asks for total honesty about what's owed, and remember the word 'eventually', because this one doesn't survive on avoidance.",
 9:"This bond puts your beliefs and commitments to the test, sometimes across real distance or difference. Do the unglamorous work of aligning on what matters instead of assuming you already agree.",
 10:"This is a relationship with public weight and shared responsibility, a couple building a serious life in plain view. It's ambitious and durable, so carry the load together rather than keeping a private scoreboard.",
 11:"Saturn here makes the friendship and the shared future the serious part, the load-bearing wall. The strength of it isn't speed, it's endurance, and it lasts when the goals you're each chasing actually match.",
 12:"The weight here is quiet and private, old fears, unspoken duties, things each of you carries alone. Bring the hidden stuff into the light, because Saturn in the twelfth hardens whatever stays unsaid.",
},
"mercury": {
 1:"You figure this relationship out mostly by talking about it, and how you come across to each other gets negotiated out loud, in real time. Keep the channel open, because when this bond goes quiet it starts guessing, and it guesses wrong.",
 2:"The two of you mostly talk about the practical, money, plans, logistics, what's worth it. Get honest about the concrete stuff, because that's the conversation this bond keeps circling back to whether you schedule it or not.",
 3:"This bond is chatty, curious, and mentally alive, endless texts, inside jokes, half-finished thoughts. The connection is real, so just remember to feel it too, not only narrate it.",
 4:"The talk here keeps turning toward home, family, and the past. The fourth house is where the bodies are buried, so the important conversations are the old tender ones, and they don't stay buried politely.",
 5:"The two of you think and talk playfully, flirting through ideas and turning everything into a bit. Keep it clever and light, and let the banter be part of the romance instead of a substitute for it.",
 6:"This bond communicates about the daily details, who's doing what, the logistics, the fine print. Keep the practical talk kind, because this is exactly where petty friction likes to move in and set up house.",
 7:"The two of you think things through together as partners, out loud and as equals. Talk it out rather than deciding alone, because this bond genuinely sorts itself best in dialogue.",
 8:"The conversations here go deep and probing, into what usually stays hidden. It's powerful and can tip into interrogation, so use the depth to understand each other, not to corner each other.",
 9:"This bond loves the big talk, beliefs, ideas, plans, the whole horizon. Keep exploring out loud together, and don't let the debate over who's right replace the pleasure of thinking together.",
 10:"The two of you strategize, plan, and talk goals, the shared build. Talk strategy freely, and make sure you also talk about things that have nothing to do with the project.",
 11:"This relationship connects through shared ideas and a common picture of the future. Dream out loud together, because that vision is where the mental spark actually lives.",
 12:"A lot goes unsaid here, sensed instead of spoken. Put the quiet knowing into words sometimes, because too much left to telepathy in this bond becomes plain misunderstanding.",
},
"jupiter": {
 1:"This relationship makes you both feel bigger, luckier, more capable than you are alone. Enjoy the lift, and just don't let the good feeling talk the two of you into promising more than you can carry.",
 2:"The bond grows around abundance and shared resources, and there's genuine luck here with money and comfort. Build on it, and resist the Jupiter urge to overspend the goodwill.",
 3:"The two of you expand each other's minds, more ideas, more curiosity, more to talk about. Keep feeding it, because this bond grows through what you go explore together.",
 4:"This relationship makes home feel abundant and warm, a generous place to land. Let it be the soft place it wants to be, and let yourselves actually receive it.",
 5:"This is a joyful, big-hearted bond that's genuinely lucky in love and fun to be in. Enjoy the abundance, and just keep an eye on the tendency to overdo a good time until it stops being one.",
 6:"The growth here is quiet and daily, the steady practical generosity of tending each other. Small consistent kindness compounds here into something surprisingly large.",
 7:"This bond expands through partnership itself, and being an 'us' visibly opens doors for both of you. Say yes to the growth the relationship keeps offering.",
 8:"The two of you grow through depth and what you share, and this bond can genuinely transform both of your lives. Go in honestly, because the payoff here is the kind you can't fake your way to.",
 9:"This relationship is built to explore and believe, travel, meaning, the bigger picture. Keep reaching for the horizon together, because that reaching is the point of you.",
 10:"The bond grows through shared ambition and public success, a couple that rises as a team. Reach for it together and let the win belong to both of you, not to a scoreboard.",
 11:"This relationship expands through friends, community, and a hopeful shared future. It grows best when it's plugged into something bigger than just the two of you.",
 12:"The growth here is inward and quiet, spiritual, compassionate, mostly invisible. Trust the abundance you can't see yet, because in the twelfth it's real before it shows.",
},
"uranus": {
 1:"This is an unconventional bond that flat-out refuses to be made ordinary. Give it room to be strange, because routine is the thing that actually kills it.",
 2:"The two of you rethink money and security in your own way, and stable here looks nothing like the template. Let the arrangement be weird if weird is what works.",
 3:"This relationship crackles with surprising ideas and conversation that never quite settles. Keep it interesting, because this bond gets bored faster than almost anything else could hurt it.",
 4:"Home here is changeable and unconventional, and the two of you may live in ways other people don't understand. Let the domestic life be yours, not the default one you inherited.",
 5:"The romance here is electric and genuinely unpredictable, thrilling and impossible to schedule. Enjoy the charge, and don't expect it to behave or repeat on command.",
 6:"The daily routines here have to stay loose, because rigid structure suffocates this bond. Build a life with room to improvise, because 'we always do it this way' is where it dies.",
 7:"This partnership rewrites the rules of relationship, freedom held inside commitment. Let it be the unconventional 'us' it wants to be instead of forcing it into a shape it'll break out of.",
 8:"The two of you share things in unexpected, boundary-breaking ways, and even the depth here is unpredictable. Stay honest as the ground keeps shifting, because it will.",
 9:"This bond cracks open each other's beliefs and keeps reaching for the new. Keep questioning together, because the day you both stop, it goes flat.",
 10:"The couple you are in public is unconventional, and you build in your own way on your own timeline. Don't force it into a standard shape for the sake of the picture.",
 11:"This relationship is future-facing and a little radical, best among a wider unconventional circle. Let the shared vision of what's coming be the glue.",
 12:"The freedom here works underground, a restlessness that's hard to see until it moves. Give the quiet restlessness room, because cornered, it doesn't negotiate, it erupts.",
},
"neptune": {
 1:"There's a dreamy, almost fated quality here, and it can be genuinely hard to see each other clearly. Enjoy the magic, and keep checking it against the actual person in front of you.",
 2:"Money and values get foggy in this bond, easily idealized or quietly avoided. Be concrete about the practical, because this is exactly where the illusion ends up costing you.",
 3:"The two of you communicate through intuition as much as words, finishing each other's feelings. Confirm the important things out loud anyway, because in this bond assumption is where it goes wrong.",
 4:"Home has a soft, sanctuary-like, almost boundaryless quality. Keep a little structure, or the shared dream of home drifts into confusion about who's actually holding it up.",
 5:"The romance here is idealized and inspired, beautiful and a half-step from unreal. Love the real person, not just the gorgeous version of them you painted.",
 6:"The daily life here blurs, unclear roles, quiet self-sacrifice, martyrdom nobody named. Say out loud who does what, because vagueness here breeds a very real resentment.",
 7:"This bond idealizes partnership itself and quietly longs for perfect union. Hold the ideal loosely, because the actual relationship, flawed and specific, is the one that can love you back.",
 8:"The depth here is spiritual and dissolving, and the two of you can merge right past your own edges. Keep some boundaries inside the intimacy, because losing yourself isn't the same as loving them.",
 9:"This relationship shares a dream, a faith, a vision of what's true and meaningful. Keep it grounded, because it's easy to get beautifully, mutually lost in the ideal.",
 10:"The public image here can be more dream than substance, a story that looks perfect. Make sure there's a real, ordinary relationship holding up the beautiful picture.",
 11:"The two of you share an idealistic vision of the future and a wide, compassionate circle. Tether the dream to something you can actually build, or it stays a lovely idea.",
 12:"This is the most otherworldly, soul-level bond of them all, and most of it lives in the unseen. Stay honest, because the twelfth is exactly where the two of you can quietly fool each other.",
},
"pluto": {
 1:"This relationship transforms both of you right down at the level of identity, and it's intense from the first minute. Let it change you, without letting it consume the person it changed.",
 2:"The power here plays out around money, worth, and control of what's shared. Get honest about what's owed, because this is where the quiet power struggle likes to hide.",
 3:"The two of you get into deep, penetrating, sometimes obsessive conversations. Use the intensity to actually understand each other, not to dominate or extract.",
 4:"This bond reaches the roots, and it will stir up deep, old family material whether you asked it to or not. Face what surfaces, because burying it here only hands it more power.",
 5:"The passion here is consuming and all-or-nothing, and it doesn't do casual. Let it run deep without letting the intensity curdle into possession.",
 6:"The power dynamic here hides in the daily grind, control over routines, roles, whose way things get done. Share the power on purpose, because unwatched, it quietly concentrates in one of you.",
 7:"This is a fated, transformative partnership that permanently changes both of you. It's powerful, so keep it brutally honest about who's holding the reins.",
 8:"This is Pluto at home, deep, all-in, transformative to the core. The intimacy here can heal or control, and the only thing that decides which is your honesty.",
 9:"The two of you transform each other's beliefs and whole worldview, sometimes forcefully. Let the change be real without forcing your version down each other's throats.",
 10:"The power here is public, ambition, status, and control of the shared direction. Build together instead of quietly fighting over who steers.",
 11:"This bond transforms your sense of the future and your place among your people. Let it deepen you both, without one of you taking all the collective power.",
 12:"The deepest transformation here happens out of sight, in what's buried and unspoken. Bring it into the light, because hidden Pluto runs the whole show from the shadows.",
},
}

records = []
for body,(title,meaning) in CORE.items():
    records.append({"id":f"cc/composite/{body}", "kind":"composite_planet", "body":body,
      "surface":"composite.planet", "status":"REVIEWED_CLAUSE", "title":title.capitalize(),
      "slots":{"meaning":meaning},
      "source_keys":[f"ms/composite/planet/{body}", "cc/ref/composite/dark-pixie"], "tone_version":"marie-calibrated-v1",
      "originalityCheck":"voiced; felt, not purely definitional","review_note":"needs Marie/editorial final sign-off before serving"})
for body,houses in H.items():
    for h in range(1,13):
        records.append({"id":f"cc/composite/{body}-in-{ORD[h]}-house", "kind":"composite_planet_house",
          "body":body, "house":h, "surface":"composite.planet_house", "status":"REVIEWED_CLAUSE",
          "title":f"Composite {body.capitalize()} in the {ORD[h]} house",
          "slots":{"scene":houses[h]},
          "source_keys":[f"ms/composite/planet/{body}", "cc/ref/composite/dark-pixie", f"cc/house/{h}"],
          "tone_version":"marie-calibrated-v1","originalityCheck":"voiced lived relational scene, not a domain label",
          "review_note":"needs Marie/editorial final sign-off before serving"})

out = {"_meta":{"title":"Reviewed composite chart: planet cores + lived planet-in-house scenes",
        "planet_cores":len(CORE), "planet_in_house":len(H)*12, "count":len(records),
        "voice":"the relationship as its own entity; lived relational scenes anchored per house",
        "doctrine_source":"composites.txt (Dark Pixie) per-house relational characters + ms/composite/planet",
        "tier":"REVIEWED_CLAUSE","tone_version":"marie-calibrated-v1"},
       "reviewed":records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-composite-reviewed.json")
json.dump(out, open(dest,"w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} composite records ({len(CORE)} cores + {len(H)*12} lived planet-in-house scenes) -> {dest}")
