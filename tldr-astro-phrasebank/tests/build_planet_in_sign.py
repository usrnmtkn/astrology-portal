#!/usr/bin/env python3
"""
build_planet_in_sign.py — planet-in-sign, all 10 bodies x 12 signs (120).

Two framings, one authoring pass:
  - natal:      the SIGN layer of a Me/Natal placement ("you" temperament)  [me.natal_placement]
  - collective: Sky, in Marie's collective voice ("we/us/our")              [sky.planet_sign]

Sky voice per Marie's articles: first-person plural. e.g. "we're asked to release our
fantasies", "Mars is asking us to fight for emotional safety". Emits
phrasebank/cc-planet-in-sign-reviewed.json.
"""
import json, os

SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio",
         "sagittarius","capricorn","aquarius","pisces"]

# body -> sign -> (natal_sign_story ["you"], collective_shift ["we"])
P = {
"sun": {
 "aries":("Your identity comes through bold and direct: you'd rather start something than wait to be asked","We're all quicker to act and assert, ready to start before we're sure"),
 "taurus":("You know who you are slowly and solidly, and you don't move until it feels worth it","We slow down and reach for comfort and steadiness, and none of us wants to be rushed"),
 "gemini":("Your sense of self runs on curiosity and talk; you try on ideas the way others try on clothes","Our attention scatters and the chatter picks up, and we're all juggling more at once"),
 "cancer":("You're most yourself when you're caring for something, and you lead with feeling","We feel closer to the surface, and home and belonging pull at all of us"),
 "leo":("You come alive when you're seen; your identity wants warmth, play, and something to create","We want to be seen and to celebrate, and generosity spreads easily between us"),
 "virgo":("You know yourself through what you refine and improve; being useful is how you shine","We get more discerning and practical, and the urge to fix and refine rises in us"),
 "libra":("Your identity forms in relationship; you find yourself in the space between you and another","We turn toward fairness and each other, weighing both sides before we move"),
 "scorpio":("You're most yourself in the deep end, where things are real, private, and intense","We go deeper, and surface answers stop satisfying any of us"),
 "sagittarius":("Your sense of self needs room to roam: a bigger view, a truth to chase, a horizon","We get restless and hopeful, wanting somewhere bigger to aim"),
 "capricorn":("You know who you are by what you build and take responsibility for","We get serious and goal-minded, and we start counting the real cost of things"),
 "aquarius":("Your identity is a little outside the norm; you want to build things that shift the status quo","We turn future-facing and independent, and the group starts to matter more than standing out as an individual"),
 "pisces":("You're most yourself at the edges, where feeling, imagination, and compassion blur the lines","We get dreamier and more porous, and the lines between us soften"),
},
"moon": {
 "aries":("You feel things fast and hot, and you need to act on a mood before it cools","Our moods run quick and hot, with short fuses and fast recoveries"),
 "taurus":("You settle when life is calm and physical; comfort, food, and steadiness soothe you","We want comfort and calm, and slow, sensory ease feels best to all of us"),
 "gemini":("You process feelings by talking them out, and your mood shifts with the conversation","Our feelings get chatty and changeable, and naming them helps us"),
 "cancer":("Your feelings run the show, and safety comes from home and the people who feel like yours","We get tender and protective, and the pull toward home is strong for all of us"),
 "leo":("You need warmth and a little spotlight to feel okay; affection lands loudest for you","Our moods want warmth and recognition, and a generous gesture goes far between us"),
 "virgo":("You feel safest when things are handled; a tidy detail can settle your whole mood","We soothe ourselves by sorting and fixing, and small order calms our big feelings"),
 "libra":("You feel steady when things are fair and harmonious, and conflict unsettles you fast","We crave peace and balance, and friction feels louder than usual to all of us"),
 "scorpio":("Your feelings run deep and private, and you don't do shallow reassurance","Our moods intensify and go underground, and honesty means more to us than comfort"),
 "sagittarius":("You feel best with room to breathe and something to look forward to","We want freedom and something to look forward to, and being fenced in chafes"),
 "capricorn":("You steady yourself with structure, and you'd rather handle a feeling than sit in it","We toughen up emotionally, and comfort comes to us through competence, not coddling"),
 "aquarius":("You need space to feel from a little distance; you process feelings by understanding them","Our moods cool and detach, and room to think steadies us"),
 "pisces":("You soak up the emotional weather around you and feel everything at the edges","We get porous and impressionable, and the room's mood becomes our own"),
},
"mercury": {
 "aries":("You think fast and say it faster; your mind moves in quick, direct bursts","Our talk gets blunt and quick, and patience for long explanations drops"),
 "taurus":("You think slowly and thoroughly, and once you've decided, you don't budge easily","We think slower and steadier, and none of us wants to be rushed to a conclusion"),
 "gemini":("Your mind is quick, curious, and everywhere at once; you learn by talking and linking ideas","Our chatter and cross-talk spike, and our minds jump between tabs"),
 "cancer":("You think with your feelings, and memory and mood color how you take things in","Our talk gets personal and tender, and old memories thread into what we say"),
 "leo":("You think in big, confident strokes, and you speak to be heard and to inspire","We communicate warmer and more dramatically, and we all want the mic"),
 "virgo":("Your mind is precise and analytical; you notice the error everyone else missed","Our thinking sharpens and the details matter, and we want things spelled out right"),
 "libra":("You think in comparisons and both-sides, weighing every option before you commit","We weigh and second-guess, and decisions take all of us longer"),
 "scorpio":("Your mind digs; you're not satisfied until you've found what's really going on","Our thinking goes investigative, and we start questioning the surface story"),
 "sagittarius":("You think in big pictures and possibilities, sometimes past the inconvenient details","Our ideas get big and a little sloppy on specifics, and we're all philosophizing"),
 "capricorn":("Your thinking is structured and practical; you want the plan, not the brainstorm","Our talk gets serious and results-focused, and we want the bottom line"),
 "aquarius":("Your mind runs on the unexpected angle; you think in systems and against the grain","Our ideas get inventive and contrarian, and the obvious answer bores us"),
 "pisces":("You think in images and intuition, and facts blur into what feels true","Our thinking gets dreamy and impressionable, and it's easy for us to hear what we hope for"),
},
"venus": {
 "aries":("You love fast and direct, and you'd rather chase than be kept guessing","We flirt first and think later, and attraction gets bold and impatient"),
 "taurus":("You love steadily and sensually; loyalty, touch, and the good things say it best","We want comfort, beauty, and slow pleasure, and loyalty feels attractive to us"),
 "gemini":("You love through words and wit, and a good conversation is your love language","Connection gets playful and talkative, and banter is the whole flirtation for us"),
 "cancer":("You love by caring and being cared for; closeness means feeling safe with someone","Our affection turns tender and protective, and we all want to be looked after"),
 "leo":("You love generously and out loud; you want romance with a little grandeur","Our love gets warm and dramatic, and big gestures land for all of us"),
 "virgo":("You love through the practical: showing up, fixing, remembering the small things","We show love through small useful acts, and we pack a lunch instead of writing a poem"),
 "libra":("You love beauty, balance, and partnership itself; harmony is the point","We want fairness and grace in connection, and ugliness grates on us"),
 "scorpio":("You love all the way in: intense, loyal, and allergic to anything halfway","Our attraction deepens and gets possessive, and none of us wants a lukewarm bond"),
 "sagittarius":("You love freedom and adventure in a partner; keep it honest and keep it moving","We want room and fun in connection, and commitment talk feels heavy"),
 "capricorn":("You love with commitment and staying power; you invest where it can last","We get more serious about worth and commitment, and effort reads as love to us"),
 "aquarius":("You love as a friend first, and you need freedom inside the closeness","Our attractions get unconventional and a little cool, and we connect on our own terms"),
 "pisces":("You love romantically and boundlessly, seeing the best in whoever you fall for","We get dreamy and idealizing in love, so we all keep one foot on the ground"),
},
"mars": {
 "aries":("You go after what you want head-on, and sitting still is the hardest thing you do","We're all quicker to act and argue, and the energy runs high while the patience runs low"),
 "taurus":("You move slowly but you don't stop; your drive is stubborn and built to last","Our effort gets steady and immovable, and pushing anyone faster just digs us in"),
 "gemini":("Your energy goes into words and quick moves; you fight and flirt with your wit","Our action scatters into talk and errands, and we're all busy and a little scattered"),
 "cancer":("You act to protect what's yours, and your drive runs on feeling, not logic","Our energy turns protective and moody, and we act from the gut"),
 "leo":("You act with flair and pride; you want your effort seen and your courage recognized","Our drive gets bold and showy, and we all want to make a statement"),
 "virgo":("Your energy goes into doing it right; you work hard and sweat the details","Our effort turns precise and industrious, and we grind on the fine print"),
 "libra":("You act through others and hate a fight, so you push by persuading, not shoving","We push by persuading, not shoving, and open conflict feels especially costly to us"),
 "scorpio":("Your drive is intense and strategic; you go quiet, then you go all the way","Our energy goes deep and controlled, and the power moves happen under the surface"),
 "sagittarius":("You chase the big goal with enthusiasm, sometimes overshooting the practical part","We get restless and want to bolt toward something bigger"),
 "capricorn":("You work with discipline toward a real result; your ambition is patient and relentless","Our effort gets strategic and patient, and we play the long game"),
 "aquarius":("You act on principle and your own timing, and you resist being told how to move","Our energy gets independent and unpredictable, and we rebel against the usual way"),
 "pisces":("Your drive ebbs and flows with your mood; you move best toward something you believe in","Our motivation gets diffuse and inspired, and direct action feels harder for all of us"),
},
"jupiter": {
 "aries":("You grow by going first and betting on yourself; boldness tends to pay off for you","Our optimism gets brave and impulsive, and big swings feel possible to us"),
 "taurus":("You grow through patience and building; abundance comes to you slowly and stays","We favor steady growth and real comfort, and slow money and simple pleasures expand"),
 "gemini":("You grow through learning and connecting; your luck runs through ideas and people","Our curiosity and opportunities multiply, and we're all collecting ideas and contacts"),
 "cancer":("You grow through care and roots; your good fortune lives in home and belonging","We grow around home, family, and emotional generosity"),
 "leo":("You grow by expressing yourself fully; confidence and creativity open your doors","We hunger for expression and play, and permission to be big is in the air"),
 "virgo":("You grow through craft and usefulness; small, careful improvements compound for you","We grow through refinement and service, and getting the details right pays off for us"),
 "libra":("You grow through relationship and fairness; partnership expands your world","We grow through cooperation and beauty, and win-win feels available to us"),
 "scorpio":("You grow through depth and transformation; you gain by letting the shallow things go","Our growth goes deep and intense, and we grow by facing what's buried"),
 "sagittarius":("You grow by reaching for meaning and horizon; faith and adventure are your fuel","Our optimism and wanderlust surge, and we all want to believe in something bigger"),
 "capricorn":("You grow through discipline and structure; you earn your expansion the real way","Our growth gets serious and earned, and we build rather than gamble"),
 "aquarius":("You grow through vision and community; your luck runs through the unconventional","Our expansion gets progressive and collective, and the future feels wide open"),
 "pisces":("You grow through faith, art, and compassion; you gain by trusting the current","We grow through imagination and generosity, and our boundaries dissolve"),
},
"saturn": {
 "aries":("You build discipline around action: learning to start wisely, not just fast","Our lesson is patient courage, and reckless starts get corrected for all of us"),
 "taurus":("Your structure is around worth and security; you learn what's truly enough","Our lesson is real value and patience, and shortcuts around security fail us"),
 "gemini":("You build discipline around your mind and voice: say less, mean more","We learn to speak with care, and loose talk carries a cost now"),
 "cancer":("Your work is around emotional security: building a foundation you didn't inherit","We grow up about what we actually need, and the lesson is honest care"),
 "leo":("You learn to earn recognition rather than demand it; real confidence takes time","Our lesson is earned authority, and hollow performance gets exposed"),
 "virgo":("Your discipline is around service and standards: useful, not perfect","Our lesson is doing the real work, and over-perfecting becomes its own avoidance"),
 "libra":("You build structure around commitment and fairness; you learn what you owe and are owed","We learn durable fairness, and flimsy agreements get tested"),
 "scorpio":("Your work is around trust and control: learning what's safe to depend on","We reckon with what's been hidden, and the lesson is honest power"),
 "sagittarius":("You build discipline around belief: testing your faith instead of borrowing it","We question borrowed dogma, and the lesson is earned conviction"),
 "capricorn":("Your structure is around authority and time; you become your own hard-won authority","Our lesson is mature responsibility, and the long game is the only game"),
 "aquarius":("You build discipline around vision: turning ideals into things that actually hold","Our lesson is grounded reform, and big ideas have to be built, not just declared"),
 "pisces":("Your work is around faith and boundaries: giving form to the formless","We learn to structure compassion, and dissolving without a shape drains us all"),
},
"uranus": {
 "aries":("Your generation disrupts how people assert and begin; independence runs in your wiring","We're jolted toward bolder, more individual action, and sudden starts feel electric"),
 "taurus":("Your generation upends money, value, and the body; you rethink what security even means","We're shaken around money, land, and what counts as stable"),
 "gemini":("Your generation reinvents how people think and talk; the channels of communication mutate","We're reinventing how we think, talk, and move information"),
 "cancer":("Your generation redefines home and family; the old shape of belonging breaks open","We're rethinking home, roots, and what family is allowed to look like"),
 "leo":("Your generation reinvents self-expression and what it means to be seen","We break toward radical individuality and new kinds of visibility"),
 "virgo":("Your generation overhauls work, health, and systems; you disrupt the daily machine","We're shaking up work, health, and how things get done"),
 "libra":("Your generation reinvents relationship and fairness; old contracts get rewritten","We're rewriting partnership, equality, and what's fair"),
 "scorpio":("Your generation cracks open taboo, power, and shared resources","We're cracking open power, shared money, and what was kept hidden"),
 "sagittarius":("Your generation disrupts belief and truth; the old certainties get exploded","We break toward new beliefs and freer horizons"),
 "capricorn":("Your generation dismantles and rebuilds institutions; the structures themselves change","We're overhauling institutions, systems, and authority"),
 "aquarius":("Your generation is the disruptor archetype itself; you reinvent the collective","We leap toward technology, networks, and the new"),
 "pisces":("Your generation dissolves and reimagines faith and imagination","Our spirituality, art, and felt sense of reality shift under us"),
},
"neptune": {
 "aries":("Your generation dreams of the heroic and the new self; ideals wear armor","We long for bold new ideals, easily blurred into illusion"),
 "taurus":("Your generation romanticizes the earth, money, and the body; you dream of real abundance","We dream around value and nature, prone to material illusion"),
 "gemini":("Your generation idealizes information and connection; truth and story blur","A haze settles over our media and facts, and enchantment and misinformation both rise"),
 "cancer":("Your generation dreams of home and belonging, and grieves what never was","We long for home and roots, tender and easily idealized"),
 "leo":("Your generation romanticizes self-expression and glamour; the dream is to be luminous","We're enchanted by fame and creativity, dazzling and deceiving us"),
 "virgo":("Your generation dreams of the perfect system and pure service; ideals meet the details","We idealize health and work, then meet disillusion in the fine print"),
 "libra":("Your generation romanticizes love and fairness; the dream is perfect union","We long for ideal relationship, prone to rose-colored glasses"),
 "scorpio":("Your generation dreams into the depths, power, and the unseen; intensity and illusion mix","We're drawn to the hidden and taboo, which both reveals and misleads us"),
 "sagittarius":("Your generation romanticizes belief and the far horizon; faith can inspire or delude","We long for meaning and escape, visionary and easily lost"),
 "capricorn":("Your generation dreams of ideal structures and dissolves brittle ones","We grow disillusioned with institutions, and long for something truer"),
 "aquarius":("Your generation dreams of utopia and universal connection","We share a vision of a connected future, inspiring and slippery"),
 "pisces":("Your generation is the dreamer archetype itself; the veil is thinnest here","A spiritual tide rises in us, and compassion and confusion both run high"),
},
"pluto": {
 "aries":("Your generation transforms through raw will and the birth of the new self","We purge and rebuild how power and identity begin"),
 "taurus":("Your generation transforms money, value, and the body from the roots","We transform wealth, land, and security from the roots"),
 "gemini":("Your generation transforms thought and communication at the deepest level","We transform how we think and communicate"),
 "cancer":("Your generation transforms home, family, and belonging through upheaval","We transform home, nation, and roots through upheaval"),
 "leo":("Your generation transforms self-expression and the ego's power","We transform fame, leadership, and the self"),
 "virgo":("Your generation transforms work, health, and the systems of daily life","We transform labor, health, and how things function"),
 "libra":("Your generation transforms relationship, justice, and the terms of fairness","We transform partnership, justice, and the terms of fairness"),
 "scorpio":("Your generation is the transformer archetype itself; you regenerate through the depths","We descend and regenerate around power, intimacy, and shared resources"),
 "sagittarius":("Your generation transforms belief, truth, and the reach of the mind","We transform belief, meaning, and how far our reach extends"),
 "capricorn":("Your generation transforms institutions and authority from the foundation","We transform governments, systems, and power itself"),
 "aquarius":("Your generation transforms the collective, technology, and who holds power","We transform networks, technology, and who holds power"),
 "pisces":("Your generation transforms faith, imagination, and the dissolving of old worlds","We transform spirituality and the felt boundaries of reality"),
},
}

records = []
for body, signs in P.items():
    for sign, (natal, coll) in signs.items():
        records.append({
            "id": f"cc/planet-in-sign/{body}-in-{sign}",
            "body": body, "sign": sign, "status": "REVIEWED_CLAUSE",
            "surfaces": ["me.natal_placement", "sky.planet_sign"],
            "kind": "planet_in_sign",
            "natal_sign_story": natal,       # the SIGN layer of a natal placement ("you")
            "collective_shift": coll,        # sky.planet_sign, Marie collective voice ("we")
            "source_keys": [f"cc/planet/{body}", f"cc/sign/{sign}/lived-behaviors"],
            "doctrine_source": "Standard planet-function x sign-style (voiced original)",
            "tone_version": "marie-calibrated-v1",
            "originalityCheck": "voiced original; Sky in first-person-plural per Marie's articles",
            "review_note": "needs Marie/editorial final sign-off before serving",
        })

out = {"_meta": {"title": "Reviewed planet-in-sign (natal sign layer + Sky collective 'we' voice)",
        "count": len(records), "bodies": list(P.keys()), "signs": SIGNS,
        "serves": {"me.natal_placement": "natal_sign_story ('you'); house layer composed on top",
                   "sky.planet_sign": "collective_shift (Marie's 'we/us/our' collective voice)"},
        "tier": "REVIEWED_CLAUSE", "tone_version": "marie-calibrated-v1"},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-planet-in-sign-reviewed.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} planet-in-sign records (natal 'you' + Sky 'we') -> {dest}")
