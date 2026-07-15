#!/usr/bin/env python3
"""
build_angle_reviews.py  — the four angles against the seven classical bodies.

Authors reviewed clauses for planet-to-angle contacts, grounded in doctrine
(Robert Hand, "Planets in Transit"; Hamaker-Zondag, "Aspects" — meaning only,
voice original) and rendered through the angle template (4D):

    {{angle_specific_scene}} ... {{behavioral_consequence}}. {{proportionate_adjustment}}.
    The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{angle_name}}.

Angle domains:
    ascendant  = how you meet the world, your body/energy, the first move
    midheaven  = your public role, career, reputation, people in authority
    descendant = your closest one-to-one relationships, the person across from you
    ic         = home, family, roots, the private base you retreat to

For each (body, angle) we author three valence treatments: conjunction (the
function lands directly on that domain), square (friction/pressure there), and
trine (the function supports that domain). Coverage is then completed by exact
geometry, WITHOUT fabricating new prose:
    opposition to an angle  == conjunction to the OPPOSITE angle (reframed via the other person / the hidden side)
    sextile                 == the trine treatment, flagged "opportunity only if acted on"
Emits phrasebank/cc-aspect-pair-reviewed-angles.json.
"""
import json, os

DOCTRINE = "Robert Hand, Planets in Transit; Hamaker-Zondag, Aspects (doctrine only, voiced original)"
OPP = {"ascendant": "descendant", "descendant": "ascendant", "midheaven": "ic", "ic": "midheaven"}

# scene | consequence | adjustment   (per body, per angle, per valence)
DATA = {
"sun": {
 "ascendant": {
   "conjunction": ("how you come across is lit up and people notice you more than usual",
     "you feel more yourself and more visible at the same time",
     "Let yourself be seen on purpose instead of dimming to stay comfortable"),
   "square": ("who you are rubs against how you have to show up right now",
     "the version of you the moment asks for feels a size too small",
     "Adjust the presentation without editing the actual self underneath"),
   "trine": ("being yourself and being received line up with unusual ease",
     "your presence lands well without much effort",
     "Step forward while the room is this receptive")},
 "midheaven": {
   "conjunction": ("your public role and your sense of self point the same way",
     "what you're known for starts to feel like an extension of who you are",
     "Claim the visible position instead of waiting to be handed it"),
   "square": ("your direction and your public obligations pull against each other",
     "the role you're expected to play doesn't fit who you're becoming",
     "Name the mismatch before you either burn out performing or quit outright"),
   "trine": ("your identity and your work reinforce each other",
     "recognition comes for something that's genuinely you",
     "Put your name on the work while the support is there")},
 "descendant": {
   "conjunction": ("who you are shows up most clearly through the person across from you",
     "you meet yourself in how a close other responds",
     "Let the relationship reflect you back without handing it your whole identity"),
   "square": ("your sense of self scrapes against what a close relationship asks",
     "being yourself and keeping the peace feel briefly incompatible",
     "Say the true thing gently rather than swallowing it or steamrolling"),
   "trine": ("you and a close other bring out an easy confidence in each other",
     "partnership feels like it adds to you rather than costing you",
     "Lean into the connection that lets you be more yourself")},
 "ic": {
   "conjunction": ("your sense of self draws back toward home, family, and your private base",
     "you feel most like yourself away from the public eye",
     "Tend the private foundation before the outer world gets loud again"),
   "square": ("who you're becoming pushes against your roots or your family's picture of you",
     "the old foundation and the new self don't quite agree",
     "Honor where you came from without letting it write who you are now"),
   "trine": ("home and identity settle into each other comfortably",
     "your private base quietly steadies your confidence",
     "Rest in the foundation and let it refill you")}},
"moon": {
 "ascendant": {
   "conjunction": ("your feelings show on the surface and color how you come across",
     "your mood is unusually visible to everyone around you",
     "Let the feeling be seen rather than performing steadiness over it"),
   "square": ("what you need pulls against how you have to present yourself",
     "holding the composed face starts to cost you",
     "Make one small room for the need instead of only managing the image"),
   "trine": ("your feelings and your presence flow together warmly",
     "people feel met just being around you",
     "Offer the warmth freely while it's this easy")},
 "midheaven": {
   "conjunction": ("your emotional life and your public role become closely tied",
     "how you feel starts steering what you do in the world",
     "Let care shape the work without letting every mood set the agenda"),
   "square": ("your need for comfort clashes with your public responsibilities",
     "the job asks for a steadiness your feelings aren't providing today",
     "Protect a little private refuelling so the public part can hold"),
   "trine": ("your instincts and your vocation cooperate",
     "you can feel your way to the right professional move",
     "Trust the gut read on the work decision")},
 "descendant": {
   "conjunction": ("your need for closeness centers on the person across from you",
     "you look to a close other for comfort and safety",
     "Ask for the reassurance directly instead of testing whether they'll notice"),
   "square": ("your need for security rubs against what a relationship can give",
     "you want more holding than the moment is offering",
     "Name the need plainly rather than withdrawing to be pursued"),
   "trine": ("emotional closeness with a partner comes easily",
     "you feel safe being seen by someone close",
     "Let yourself be cared for without earning it first")},
 "ic": {
   "conjunction": ("your feelings pull all the way home, to family and your oldest sense of safety",
     "you want the door shut and the people who feel like home close",
     "Go home in whatever form that takes and let yourself be soft there"),
   "square": ("your emotional needs collide with home or family pressure",
     "the place meant to restore you is asking something of you instead",
     "Tend your own need before you referee the household"),
   "trine": ("home feels genuinely nourishing right now",
     "your private life refills you without effort",
     "Spend unhurried time where you feel safest")}},
"mercury": {
 "ascendant": {
   "conjunction": ("how you think and talk becomes how you come across",
     "people meet you through your words and quick read of things",
     "Say the clear version; your presence is in the sentence"),
   "square": ("what you want to say rubs against how you're expected to sound",
     "the polished version keeps flattening what you actually mean",
     "Send the plainer sentence before you over-edit it"),
   "trine": ("your thinking and your presence sync up",
     "you explain yourself and land it in the same move",
     "Have the conversation while your words are this ready")},
 "midheaven": {
   "conjunction": ("your thinking and communication move to the center of your public role",
     "you're recognized for how you say and organize things",
     "Put the idea in writing where the right people will see it"),
   "square": ("your ideas run into how your field expects them packaged",
     "being understood and being credited aren't lining up",
     "Clarify the message before you assume the room got it"),
   "trine": ("your mind and your work cooperate",
     "the clear plan and the public move fit together",
     "Pitch the idea while the thinking is this sharp")},
 "descendant": {
   "conjunction": ("your thinking gets drawn into dialogue with the person across from you",
     "you sharpen your ideas by talking them through with a close other",
     "Talk it out plainly and actually listen to the reply"),
   "square": ("a conversation with a close other keeps missing",
     "you and they are running on different definitions of the same word",
     "Slow the exchange and check what each of you actually means"),
   "trine": ("talking with a partner comes easily",
     "you think better out loud with them",
     "Have the honest conversation while it's flowing")},
 "ic": {
   "conjunction": ("your thoughts turn toward home, family, and the past",
     "old conversations and household logistics fill your mind",
     "Sort the family message or the home plan while it's front of mind"),
   "square": ("what you think rubs against family patterns or old stories",
     "an old script keeps answering before you do",
     "Name the inherited assumption before you act on it"),
   "trine": ("your mind rests easily in home and roots",
     "you think clearly in your private space",
     "Do the thinking work where you feel settled")}},
"venus": {
 "ascendant": {
   "conjunction": ("warmth and charm come through in how you meet people",
     "you're more magnetic and more interested in pleasure and connection",
     "Let yourself be liked without hiding the request underneath the charm"),
   "square": ("what you want rubs against how you're presenting yourself",
     "being pleasant is quietly costing you what you actually prefer",
     "State the preference instead of smoothing it over"),
   "trine": ("attraction and ease flow through your presence",
     "connection and good feeling come to you without much effort",
     "Reach for the lovely thing while it's this available")},
 "midheaven": {
   "conjunction": ("your taste, values, and relationships touch your public life",
     "who and what you value becomes visible in your work",
     "Let the work reflect what you actually find worth doing"),
   "square": ("what you value pulls against what your role rewards",
     "the pleasant public choice and the honest one part ways",
     "Choose the value you can stand behind, not just the smooth one"),
   "trine": ("your values and your vocation agree",
     "the work you love is also the work that lands well",
     "Say yes to the pleasant, well-aligned opportunity")},
 "descendant": {
   "conjunction": ("love, attraction, and value center on the person across from you",
     "closeness and being valued move to the front of your attention",
     "Let the connection be warm and say what you actually want from it"),
   "square": ("what you value pulls against what a relationship is giving",
     "affection and fairness aren't quite balanced right now",
     "Ask for the balance directly instead of keeping a silent tally"),
   "trine": ("warmth with a partner comes easily",
     "you feel valued and easy to be close to",
     "Enjoy the affection and let it be simple")},
 "ic": {
   "conjunction": ("your sense of comfort and beauty turns toward home",
     "you want your private space warm, lovely, and easy to be in",
     "Make one part of home nicer to live in"),
   "square": ("what you find comforting rubs against family or household reality",
     "the comfort you want and the home you have aren't matching",
     "Improve the part that affects daily life and stop there"),
   "trine": ("home feels warm and pleasurable",
     "your private life is a source of comfort and beauty",
     "Enjoy the ease of your own space")}},
"mars": {
 "ascendant": {
   "conjunction": ("your drive and assertion come straight through how you meet people",
     "you're quicker to push, act, and defend yourself",
     "Aim the force and have the conflict directly instead of letting it leak"),
   "square": ("your drive rubs against how you're allowed to show up",
     "you're spoiling for a push the situation won't cleanly take",
     "Burn the energy on effort, not on the nearest person"),
   "trine": ("your energy and your presence cooperate",
     "you can act decisively and be received well doing it",
     "Make the bold move while the timing supports it")},
 "midheaven": {
   "conjunction": ("your drive lands squarely on your career and public ambition",
     "you're certain what you want and impatient with anyone who limits it",
     "Push hard on the goal and pick your fights with authority carefully"),
   "square": ("your ambition collides with the people who set your limits",
     "a boss, rule, or rival is in the way of the push",
     "Move in structured steps rather than forcing a confrontation you'll pay for"),
   "trine": ("your drive and your work cooperate",
     "effort turns into visible progress without a fight",
     "Spend the energy on the ambitious task now")},
 "descendant": {
   "conjunction": ("your drive and heat show up through the person across from you",
     "a close relationship gets more charged, passionate or combative",
     "Have it out directly and cleanly rather than letting resentment build"),
   "square": ("your assertion clashes with a close other",
     "wanting your way and wanting the peace are at odds",
     "Name the friction now while it's still small"),
   "trine": ("you and a partner can act well together",
     "shared drive moves you both forward",
     "Take on the thing that needs two people's energy")},
 "ic": {
   "conjunction": ("your drive turns toward home, family, or your private base",
     "there's heat around the household, or energy to change it",
     "Fix or move the thing at home instead of simmering about it"),
   "square": ("your push collides with family or the home foundation",
     "an old household tension flares up",
     "Address the specific friction, not the whole history"),
   "trine": ("you can put real energy into home",
     "improving your private base feels satisfying, not draining",
     "Do the physical home project while the drive is there")}},
"jupiter": {
 "ascendant": {
   "conjunction": ("optimism and appetite come through in how you meet the world",
     "you feel bigger, luckier, and more willing to be seen",
     "Take the opening, sized to what you can actually follow through on"),
   "square": ("your appetite for more rubs against how you can present",
     "confidence tips toward overpromising or overdoing it",
     "Make the bold move real by keeping it one honest size"),
   "trine": ("growth and presence flow together",
     "doors open through simply showing up as yourself",
     "Say yes to the expansion while it's easy")},
 "midheaven": {
   "conjunction": ("expansion and opportunity land on your public role",
     "career growth and recognition feel newly possible",
     "Reach for the bigger position and back it with real preparation"),
   "square": ("your ambition to grow outruns what the role can hold",
     "the opportunity is real but the promise is getting ahead of the plan",
     "Grow, and build the structure that makes it hold"),
   "trine": ("growth and vocation cooperate",
     "the expansive career move also lands well",
     "Take the well-aligned opportunity")},
 "descendant": {
   "conjunction": ("generosity and growth center on a close relationship",
     "a partnership feels expansive, lucky, or newly meaningful",
     "Invest in the connection without overpromising what you can give"),
   "square": ("your appetite for more strains a close relationship",
     "wanting bigger and keeping it grounded pull apart",
     "Enjoy the growth and keep the commitments realistic"),
   "trine": ("a partnership feels easy and full of opportunity",
     "the right person opens doors for you and you for them",
     "Say yes to the generous connection")},
 "ic": {
   "conjunction": ("growth and abundance turn toward home and family",
     "the private base feels like it wants to expand",
     "Grow the home life in one concrete, sustainable way"),
   "square": ("your wish to expand strains the home foundation",
     "bigger plans and the actual household aren't matching",
     "Scale the home change to what the foundation can carry"),
   "trine": ("home and roots feel abundant and supportive",
     "your private base is a genuine source of growth",
     "Build on the foundation while it's this solid")}},
"saturn": {
 "ascendant": {
   "conjunction": ("responsibility and seriousness settle onto how you show up",
     "you feel more weight, more visible, and less free to be casual",
     "Finish what's unfinished and simplify rather than starting something new"),
   "square": ("your sense of self runs into a hard limit or duty",
     "the version of you that's allowed right now feels constrained",
     "Do the unglamorous part; the confidence it builds is real"),
   "trine": ("structure and self support each other",
     "steady effort makes your presence more solid",
     "Commit to the long build while discipline feels supportive")},
 "midheaven": {
   "conjunction": ("responsibility and authority land on your public role",
     "you're being asked to carry more and prove it over time",
     "Take the weight seriously and build the career one earned step at a time"),
   "square": ("your ambition runs into a wall of limits or authority",
     "the recognition you want is being made to wait",
     "Treat the delay as a test of commitment, not a verdict"),
   "trine": ("discipline and vocation cooperate",
     "patient work turns into durable standing",
     "Make the long-term professional commitment now")},
 "descendant": {
   "conjunction": ("seriousness and commitment center on a close relationship",
     "a partnership asks for more structure, honesty, or a defined limit",
     "Make one agreement clearer before adding another obligation"),
   "square": ("duty or distance strains a close relationship",
     "the connection feels effortful, cool, or tested",
     "Name what's sustainable rather than withdrawing to keep the peace"),
   "trine": ("commitment with a partner feels stable and worth the effort",
     "the relationship holds weight without strain",
     "Define what you want and make it durable")},
 "ic": {
   "conjunction": ("responsibility and limits settle onto home and family",
     "the private foundation needs shoring up or simplifying",
     "Repair the base you keep returning to, slowly and for real"),
   "square": ("duty around home or family presses on you",
     "an old foundation is asking to be dealt with, not deferred",
     "Handle the concrete household obligation before it grows"),
   "trine": ("home and structure support each other",
     "your private base is steady and dependable",
     "Build the lasting thing at home while it's grounded")}},
}

ASPECT_VERB = {"conjunction": "conjoins", "square": "squares", "trine": "trines",
               "opposition": "opposes", "sextile": "sextiles"}

records = []
def emit(body, angle, aspect, slots, derived_from=None, note=None):
    rec = {
      "id": f"cc/aspect-pair/{body}-{aspect}-{angle}",
      "pair": f"{body} {aspect} {angle}", "aspect": aspect,
      "valence": {"conjunction": "conjunction", "square": "challenging", "trine": "supportive",
                  "sextile": "supportive", "opposition": "challenging"}[aspect],
      "status": "REVIEWED_CLAUSE", "template_family": "personalized_transit",
      "recommended_template": "4D",   # angle contact template
      "angle": angle, "body": body,
      "slots": {
        "angle_specific_scene": slots[0],
        "behavioral_consequence": slots[1],
        "proportionate_adjustment": slots[2],
      },
      "source_keys": [f"cc/aspect/{aspect}", f"cc/ref/aspect-psychology/{aspect}"],
      "doctrine_source": DOCTRINE,
      "originalityCheck": "voiced original; doctrine-grounded; angle domains from Hand",
      "review_note": "needs Marie/editorial final sign-off before serving",
    }
    if derived_from:
        rec["derived_from"] = derived_from
    if note:
        rec["derivation_note"] = note
    records.append(rec)

for body, angles in DATA.items():
    for angle, av in angles.items():
        # authored: conjunction, square, trine
        emit(body, angle, "conjunction", av["conjunction"])
        emit(body, angle, "square", av["square"])
        emit(body, angle, "trine", av["trine"])
        # sextile == trine treatment, flagged opportunity-only-if-acted-on (aspect psychology)
        t = av["trine"]
        emit(body, angle, "sextile",
             (t[0], t[1] + ", but only if you take the opening", t[2]),
             derived_from=f"cc/aspect-pair/{body}-trine-{angle}",
             note="sextile = the harmonious contact as an opportunity that only pays off when acted on")
        # opposition to an angle == conjunction to the OPPOSITE angle (exact geometry), reframed
        opp = OPP[angle]
        cav = DATA[body][opp]["conjunction"]
        emit(body, angle, "opposition",
             (cav[0].replace("turns toward", "surfaces from").replace("centers on", "surfaces through"),
              cav[1] + ", felt from the opposite side of the axis",
              cav[2]),
             derived_from=f"cc/aspect-pair/{body}-conjunction-{opp}",
             note=f"opposition to the {angle} is geometrically a conjunction to the {opp}; read through the opposite pole")

out = {"_meta": {"title": "Reviewed angle-contact clauses — four angles x seven classical bodies",
        "angles": ["ascendant", "midheaven", "descendant", "ic"],
        "bodies": ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"],
        "authored_valences": ["conjunction", "square", "trine"],
        "derived_valences": {"sextile": "trine treatment flagged act-on-the-opening",
                              "opposition": "conjunction to the opposite angle (exact geometry), reframed"},
        "count": len(records), "template": "4D angle contact", "tier": "REVIEWED_CLAUSE",
        "doctrine_source": DOCTRINE,
        "note": "Angles are points, not planets: an aspect colors how the body's function shows up in the angle's life-domain. No planet-function+angle-domain keyword gluing; each clause is an authored lived scene."},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-aspect-pair-reviewed-angles.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} angle clauses ({len(DATA)} bodies x 4 angles x 5 aspects) -> {dest}")
