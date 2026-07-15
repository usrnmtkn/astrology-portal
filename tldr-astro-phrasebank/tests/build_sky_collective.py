#!/usr/bin/env python3
"""
build_sky_collective.py — the expanded collective-Sky layer.

Two SEPARATE surface contracts, authored independently (never card->detail reuse):

  sky.collective.card    -> one compact collective claim (14-30 words, one sentence)
  sky.collective.detail  -> a developed collective article composed from semantic
                            slots (per-variant), one coherent subject, we/us voice.

Variants: planet-in-sign, moon-in-sign, retrograde, station, current-sky aspect,
ingress/season. Each detail record stores NAMED semantic slots + a paragraphsPlan so
the composer can group them into 1-2 finished paragraphs (never one <p> per slot).

Every record carries an `event` id shared by its card and detail (same factual event
identity) and an `eventIdentity` used by the historical-lookback matcher. Emits:
  phrasebank/cc-sky-collective-card-reviewed.json
  phrasebank/cc-sky-collective-detail-reviewed.json

Collective voice only. Not for personalized horoscopes, natal, or personalized transits.
"""
import json, os

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL = {  # variant -> (detail templateId, eyebrow label, default paragraphsPlan)
 "planet-sign": ("sky.collective.planet-sign.detail.v1", "Placement",
                 [["anchor","manifestation","tension","invitation","closing"]]),
 "moon-sign":   ("sky.collective.moon-sign.detail.v1", "Placement",
                 [["embodiedAtmosphere","careOrProtectionNeed","recognizableCollectiveScene",
                   "directInvitation","closingReplenishment"]]),
 "retrograde":  ("sky.collective.retrograde.detail.v1", "Retrograde",
                 [["reviewSituation","whatReturnsOrComplicates","recognizableCollectiveScene",
                   "revisionInvitation"], ["phaseContext"]]),
 "station":     ("sky.collective.station.detail.v1", "Station",
                 [["pressureBecomesNoticeable","collectiveSlowdownOrTurn","recognizableScene",
                   "stationResponse"]]),
 "aspect":      ("sky.collective.aspect.detail.v1", "Aspect",
                 [["interactionAnchor","recognizableCollectiveSituation","aspectTensionOrOpening",
                   "proportionateResponse","closingSynthesis"]]),
 "ingress":     ("sky.collective.ingress.detail.v1", "Season",
                 [["thresholdClaim","whatChangesNow","collectiveScene",
                   "seasonQuestionOrInvitation","closingDirection"]]),
 "lunation":    ("sky.collective.lunation.detail.v1", "Lunation",
                 [["lunationAtmosphere","whatCulminatesOrBegins","recognizableCollectiveScene",
                   "lunationInvitation","closingRelease"]]),
}
TEMPLATE_VERSION = "2.2.1"

# event -> full pair spec.  card = compact claim.  clauses = detail semantic slots.
FIX = {
"sun-cancer": {
 "variant":"planet-sign","title":"Sun in Cancer","dateRange":"June 21 – July 22",
 "glyphs":["sun","cancer"],
 "eventIdentity":{"eventType":"planet-in-sign","bodies":["sun"],"sign":"cancer"},
 "card":"The collective mood turns inward and protective for a few weeks, and we care more about who feels safe and who feels left out.",
 "clauses":{
  "anchor":"For a few weeks the collective attention turns toward home, family, and the people we feel responsible for.",
  "manifestation":"Conversations that started about work or logistics keep circling back to who is being looked after and who is quietly carrying too much, and many of us feel the pull to check on someone before we check the next thing off a list.",
  "tension":"The warmth is real, and so is the risk of mistaking worry for closeness, or letting our own need for reassurance decide how much room anyone else gets.",
  "invitation":"It helps to say the tender thing out loud rather than hovering around it,",
  "closing":"since care lands most when it is offered in the open instead of managed quietly from a distance."}},

"moon-cancer": {
 "variant":"moon-sign","title":"Moon in Cancer","dateRange":"July 14 – July 16",
 "glyphs":["moon","cancer"],
 "eventIdentity":{"eventType":"moon-in-sign","bodies":["moon"],"sign":"cancer"},
 "card":"For a day or two our feelings sit close to the surface and home matters more than usual.",
 "clauses":{
  "embodiedAtmosphere":"Feelings sit closer to the surface than usual for the day or two the Moon spends in Cancer.",
  "careOrProtectionNeed":"Many of us want something familiar nearby, a known voice, a home-cooked meal, a little cover from noise we would shrug off on a busier day.",
  "recognizableCollectiveScene":"Small slights land harder and small comforts land deeper, and people reach for the people who already know them.",
  "directInvitation":"Let the softer mood set a slower pace,",
  "closingReplenishment":"and give the day one genuinely nourishing thing rather than powering through as if feelings were an interruption."}},

"mercury-retrograde-cancer": {
 "variant":"retrograde","title":"Mercury Retrograde in Cancer","dateRange":"August 2 – August 26",
 "glyphs":["mercury","cancer"],
 "eventIdentity":{"eventType":"retrograde","bodies":["mercury"],"sign":"cancer","direction":"retrograde"},
 "card":"Old conversations and unfinished feelings come back around, so it is a better stretch for repair than for launching something new.",
 "clauses":{
  "reviewSituation":"Something we thought was settled in our closest relationships comes back up for another look while Mercury moves backward through Cancer.",
  "whatReturnsOrComplicates":"An old message we never answered, a family misunderstanding, a feeling we filed away too quickly, all of it turns strangely present again.",
  "recognizableCollectiveScene":"Group threads resurface conversations from months ago, people half-apologize for things we had forgotten, and plans made in a hurry turn out to need a second pass.",
  "revisionInvitation":"This is the stretch for going back and saying the clearer version of what we meant, for checking the detail before assuming, and for letting a misread message be a question rather than a verdict.",
  "phaseContext":"The pull to reopen the past eases once Mercury steadies, so treat these weeks as time to mend and confirm rather than to sign, send, or announce the new thing."}},

"venus-virgo": {
 "variant":"planet-sign","title":"Venus in Virgo","dateRange":"August 8 – September 2",
 "glyphs":["venus","virgo"],
 "eventIdentity":{"eventType":"planet-in-sign","bodies":["venus"],"sign":"virgo"},
 "sourceIds":["ms/article/venus-in-virgo-2025","cc/planet-sign/venus-virgo"],
 "card":"We show affection through usefulness now, and love looks like remembering the small thing someone needed.",
 "clauses":{
  "anchor":"Affection gets quieter and more practical while Venus moves through Virgo, less the love that sweeps us off our feet and more love as a daily practice of care.",
  "manifestation":"We show we care by fixing the broken thing, remembering the appointment, and doing the dishes without being asked, and many of us feel most loved this month not by grand gestures but by the thousand small ways someone tends to what we actually need.",
  "tension":"The same eye for detail can tip into fault-finding, where helpful feedback edges into criticism that wounds and the running list of what is not quite right crowds out the pleasure of what is already good.",
  "invitation":"It is worth letting some things be good enough,",
  "closing":"and letting a small, well-timed gesture count as the real affection it already is."}},

"mars-gemini": {
 "variant":"planet-sign","title":"Mars in Gemini","dateRange":"June 28 – August 11",
 "glyphs":["mars","gemini"],
 "eventIdentity":{"eventType":"planet-in-sign","bodies":["mars"],"sign":"gemini"},
 "card":"We are all quicker to act and assert, ready to start before we are fully sure.",
 "clauses":{
  "anchor":"Conversations carry more voltage while Mars moves through Gemini.",
  "manifestation":"Ideas arrive quickly, replies come even faster, and many of us may feel pressure to act on the first version of a plan before the useful questions have been asked.",
  "tension":"That speed can sharpen an argument or give a stalled project the momentum it needed; the difference is whether motion has somewhere clear to go.",
  "invitation":"Give the restless energy a channel.",
  "closing":"Name the decision, verify the essential detail, and let curiosity improve the plan before urgency takes over."}},

"jupiter-leo": {
 "variant":"planet-sign","title":"Jupiter in Leo","dateRange":"June 30, 2026 – July 25, 2027",
 "glyphs":["jupiter","leo"],
 "eventIdentity":{"eventType":"planet-in-sign","bodies":["jupiter"],"sign":"leo"},
 "card":"There is more collective appetite for boldness and play, and we are drawn to whatever feels generous and warm.",
 "clauses":{
  "anchor":"There is more room for warmth, confidence, and outright play in the collective mood while Jupiter moves through Leo.",
  "manifestation":"People take bigger creative swings, celebrate more openly, and hand out praise more freely, and many of us feel encouraged to want something out loud instead of keeping it modest and small.",
  "tension":"Generosity and showmanship share a border, and the same expansiveness that lifts a room can tip into performance, where being seen starts to matter more than what is actually being made.",
  "invitation":"The move is to let the confidence serve the work,",
  "closing":"so the boldness leaves something real behind and not just a good entrance."}},

"saturn-aries": {
 "variant":"planet-sign","title":"Saturn in Aries","dateRange":"May 24, 2025 – April 12, 2028",
 "glyphs":["saturn","aries"],
 "eventIdentity":{"eventType":"planet-in-sign","bodies":["saturn"],"sign":"aries"},
 "sourceIds":["ms/article/saturn-enters-aries-2025","cc/planet-sign/saturn-aries"],
 "card":"We are being asked to get serious about acting for ourselves, and courage starts to feel like a responsibility.",
 "clauses":{
  "anchor":"After years of Saturn in Pisces asking us to grieve and surrender what was only ever held together by belief, the collective is being asked to move and grow up about initiative while Saturn crosses into Aries.",
  "manifestation":"Starting things, standing alone, and claiming what we want stop feeling optional and start carrying weight, and many of us notice that the courage we used to admire in other people is now being asked of us directly.",
  "tension":"Independence gets tested against its limits here, where the drive to do it all alone can harden into isolation, and impatience runs into the slow truth that real self-reliance takes time to build.",
  "invitation":"It helps to pick the one thing worth standing behind,",
  "closing":"and to remember that freedom here does not come from avoiding limits but from choosing which ones actually matter."}},

"chiron-taurus": {
 "variant":"planet-sign","title":"Chiron in Taurus","dateRange":"April 2018 – 2027",
 "glyphs":["chiron","taurus"],
 "eventIdentity":{"eventType":"planet-in-sign","bodies":["chiron"],"sign":"taurus"},
 "card":"A collective tenderness around worth and security surfaces, and the question of whether there is enough gets closer to the bone.",
 "clauses":{
  "anchor":"A sore spot around worth, safety, and having enough sits close to the surface while Chiron moves through Taurus.",
  "manifestation":"Conversations about money, bodies, and basic security carry more ache than the practical facts alone would explain, and many of us run into an old belief that our worth has to be earned or proven before we are allowed to rest.",
  "tension":"The wound and the medicine look almost the same here, because the reassurance we reach for outside, more savings, more proof, more solidity, rarely reaches the place that actually feels unsteady.",
  "invitation":"The gentler move is to let worth be something we practice rather than something we qualify for,",
  "closing":"and to notice the ordinary, already-present enough that fear tends to talk us out of seeing."}},

"saturn-station-retrograde-aries": {
 "variant":"station","title":"Saturn Stations Retrograde in Aries","dateRange":"July 13, 2026",
 "glyphs":["saturn","aries"],
 "eventIdentity":{"eventType":"station","bodies":["saturn"],"sign":"aries","direction":"retrograde"},
 "card":"Saturn pauses and turns inward, so the pressure we have been pushing against asks to be re-examined instead of forced.",
 "clauses":{
  "pressureBecomesNoticeable":"Saturn slows almost to a stop before turning backward, and the commitments we have been white-knuckling get quietly heavier for a few days.",
  "collectiveSlowdownOrTurn":"Forward push gives way to concentration, and then to review, as the collective is asked to stop proving it can carry the load and start asking whether the load is built right.",
  "recognizableScene":"Projects that were all momentum hit a natural pause, deadlines feel less like enemies and more like questions, and the thing we kept postponing finally has to be looked at.",
  "stationResponse":"Rather than forcing the next step, this is the moment to reexamine the structure itself, tighten what is sound, and set down the effort that was only holding up something we no longer believe in."}},

"mercury-station-direct-cancer": {
 "variant":"station","title":"Mercury Stations Direct in Cancer","dateRange":"August 26, 2026",
 "glyphs":["mercury","cancer"],
 "eventIdentity":{"eventType":"station","bodies":["mercury"],"sign":"cancer","direction":"direct"},
 "card":"Mercury turns forward again, so the conversations and decisions that stalled start moving, though not all at once.",
 "clauses":{
  "pressureBecomesNoticeable":"After weeks of doubling back, Mercury stands still and then turns forward again in Cancer.",
  "collectiveSlowdownOrTurn":"The long stretch of review gives way to concentration and, gradually, to motion, as the questions we kept reopening about home and belonging finally settle enough to act on.",
  "recognizableScene":"Stuck conversations loosen, a delayed answer arrives at last, and plans that felt frozen begin, slowly, to thaw.",
  "stationResponse":"Momentum returns unevenly, so it is worth confirming the important detail one more time before committing, and letting the first few days set direction rather than demanding full speed."}},

"sun-conjunct-mercury-cancer": {
 "variant":"aspect","title":"Sun Conjunct Mercury in Cancer","dateRange":"July 15, 2026",
 "glyphs":["sun","mercury"],
 "eventIdentity":{"eventType":"aspect-cycle","bodies":["sun","mercury"],"sign":"cancer","aspect":"conjunction"},
 "card":"Our attention and our words point the same way today, which makes it easier to say plainly what we actually mean.",
 "clauses":{
  "interactionAnchor":"Thought and attention travel together for a day or so as the Sun and Mercury align in Cancer.",
  "recognizableCollectiveSituation":"Whatever the collective is focused on is also what it wants to talk about, so feelings about home, safety, and belonging find unusually direct words, and a message many of us have been circling finally gets sent.",
  "aspectTensionOrOpening":"The closeness is clarifying and a little blinding at once, because when what we think and what we notice line up this neatly, it gets harder to tell a clear insight from a story we simply like.",
  "proportionateResponse":"It is a good day to say the honest, simple thing,",
  "closingSynthesis":"and to leave a small margin for the possibility that being articulate is not the same as being right."}},

"mars-square-saturn": {
 "variant":"aspect","title":"Mars Square Saturn","dateRange":"July 20, 2026",
 "glyphs":["mars","saturn"],
 "eventIdentity":{"eventType":"aspect-cycle","bodies":["mars","saturn"],"aspect":"square"},
 "card":"Drive and restraint pull against each other for a couple of days, and pushing harder tends to hit more resistance.",
 "clauses":{
  "interactionAnchor":"Effort and limitation grind against each other for a couple of days as Mars squares Saturn.",
  "recognizableCollectiveSituation":"The collective wants to move and something keeps saying not yet, so plans stall at the last step, effort runs into friction, and frustration builds where drive hits a wall it cannot simply push through.",
  "aspectTensionOrOpening":"This is speed against structure, and the square does not have to end in a standoff, because the same resistance that blocks a reckless move can also force a stronger, better-built one.",
  "proportionateResponse":"The workable response is to slow down without stopping and pick the obstacle that is actually load-bearing,",
  "closingSynthesis":"then spend the friction on the one thing worth the effort instead of burning it on everything at once."}},

"venus-trine-jupiter": {
 "variant":"aspect","title":"Venus Trine Jupiter","dateRange":"August 18, 2026",
 "glyphs":["venus","jupiter"],
 "eventIdentity":{"eventType":"aspect-cycle","bodies":["venus","jupiter"],"aspect":"trine"},
 "card":"Warmth and generosity come easily for a day or two, which makes it a good time to give and receive with less guarding.",
 "clauses":{
  "interactionAnchor":"Goodwill flows with unusual ease for a day or two as Venus trines Jupiter.",
  "recognizableCollectiveSituation":"People are quicker to say yes, to praise, and to extend the invitation, and the collective mood tips toward generosity, celebration, and a genuine wish to share whatever feels good.",
  "aspectTensionOrOpening":"Soft aspects open a door rather than do the walking, so the ease is real but passive, and a warm mood on its own does not turn into anything lasting unless someone actually reaches out.",
  "proportionateResponse":"That makes it a good moment to send the kind message, make the generous offer, or say yes to the connection,",
  "closingSynthesis":"so the goodwill becomes an actual gesture instead of a pleasant afternoon that quietly passes."}},

# --- two extra reviewed detail articles so the historical-lookback tests have real
# --- expanded hosts (Uranus-Gemini long cycle, Jupiter-Cancer recent cycle) ---
"uranus-gemini": {
 "variant":"planet-sign","title":"Uranus in Gemini","dateRange":"2026 – 2033",
 "glyphs":["uranus","gemini"],
 "eventIdentity":{"eventType":"planet-in-sign","bodies":["uranus"],"sign":"gemini"},
 "sourceIds":["ms/article/uranus-rx-gemini","cc/planet-sign/uranus-gemini"],
 "card":"The way we communicate gets more restless and experimental, and the old channels stop being able to hold it all.",
 "clauses":{
  "anchor":"Communication itself enters a more restless, experimental period while Uranus moves through Gemini.",
  "manifestation":"Ideas jump across new channels faster than customs or institutions can absorb them, and many of us feel both freed and overwhelmed by the sheer number of voices competing to define what is true.",
  "tension":"Freedom and disruption arrive together here, because every tool that opens a new way to speak also opens a new way to distort, and more access does not automatically mean more understanding.",
  "invitation":"The invitation is not simply to move faster but to get deliberate about which networks deserve our attention,",
  "closing":"and about what kind of freedom our tools are actually building."}},

"jupiter-cancer": {
 "variant":"planet-sign","title":"Jupiter in Cancer","dateRange":"June 9, 2025 – June 30, 2026",
 "glyphs":["jupiter","cancer"],
 "eventIdentity":{"eventType":"planet-in-sign","bodies":["jupiter"],"sign":"cancer"},
 "sourceIds":["ms/article/jupiter-in-cancer","cc/planet-sign/jupiter-cancer"],
 "card":"The collective grows more protective and home-minded, and questions of care and belonging get bigger than the private sphere.",
 "clauses":{
  "anchor":"After its restless stretch through Gemini, Jupiter turns inward in Cancer, and questions of care, belonging, and shelter expand beyond the private household.",
  "manifestation":"There is more collective appetite for safety, roots, and looking after one another, and conversations about housing, family, and who gets to feel at home grow louder and more public.",
  "tension":"Jupiter does not only bless, it amplifies, so the wish to keep everyone safe can inflate an old family wound and overshoot into an over-protection that quietly decides who counts as one of us and who is left outside.",
  "invitation":"The useful move is to let the widened care open the circle rather than fortify it,",
  "closing":"and to notice which forms of support have quietly become necessities rather than comforts."}},

# ---- INGRESS / SEASON (threshold: name what changes from the prior condition) ----
"libra-season": {
 "variant":"ingress","title":"Libra Season Begins","dateRange":"September 22 – October 23",
 "glyphs":["sun","libra"], "eyebrowLabel":"Season",
 "eventIdentity":{"eventType":"ingress","bodies":["sun"],"sign":"libra"},
 "sourceIds":["ms/article/libra-season-ritual","ms/ratm/libra-season","cc/ingress/libra-season"],
 "card":"The collective mood tips from fixing and perfecting toward balancing and relating, and fairness starts to matter more than being right.",
 "clauses":{
  "thresholdClaim":"The season turns as the Sun crosses into Libra, and the collective attention shifts from getting things right on our own toward the Aries–Libra balance of self and other.",
  "whatChangesNow":"The heads-down, fix-the-details focus of the last few weeks softens into a pull toward fairness, cooperation, and how our choices land on the people around us.",
  "collectiveScene":"Negotiations reopen, old agreements come back onto the table, and the quiet question in a lot of rooms changes from what do I want into whether the give and take is actually fair.",
  "seasonQuestionOrInvitation":"It is worth treating the other side of a disagreement as information rather than an obstacle,",
  "closingDirection":"since the balance this season asks for is a matter of reading the give and take honestly, then staying in the room long enough to settle it."}},

"mars-enters-cancer": {
 "variant":"ingress","title":"Mars Enters Cancer","dateRange":"August 12 – September 24",
 "glyphs":["mars","cancer"], "eyebrowLabel":"Ingress",
 "eventIdentity":{"eventType":"ingress","bodies":["mars"],"sign":"cancer"},
 "card":"Drive shifts gears as Mars leaves restless Gemini for Cancer, trading quick talk and scattered starts for something more protective and personal.",
 "clauses":{
  "thresholdClaim":"Collective drive changes character as Mars crosses from Gemini into Cancer.",
  "whatChangesNow":"The scattered, talk-it-out energy of the last several weeks gives way to something more protective and personal, where action follows feeling and people move to defend what and whom they care about.",
  "collectiveScene":"Arguments get less about winning the point and more about who felt hurt, and a lot of effort quietly redirects toward home, family, and keeping our own people safe.",
  "seasonQuestionOrInvitation":"Because this drive works sideways rather than head-on, it helps to name what we actually want instead of getting moody and defending it in code,",
  "closingDirection":"so the protectiveness becomes real care rather than a slow burn nobody is allowed to mention."}},

# ---- LUNATION / ECLIPSE (new/full moon + solar/lunar eclipse) ----
"new-moon-cancer": {
 "variant":"lunation","title":"New Moon in Cancer","dateRange":"July 24, 2026",
 "glyphs":["moon","cancer"], "eyebrowLabel":"Lunation",
 "eventIdentity":{"eventType":"lunation","bodies":["sun","moon"],"sign":"cancer","aspect":"new-moon"},
 "card":"A fresh start opens around home and belonging, the kind you commit to before there is anything to show for it.",
 "clauses":{
  "lunationAtmosphere":"The month resets in the dark of a Cancer New Moon, when the story of the next cycle has not been written yet.",
  "whatCulminatesOrBegins":"This is a beginning we feel before we can see it, a quiet pull to plant something around home, family, and the need to belong, with no proof yet that it will grow.",
  "recognizableCollectiveScene":"People start a conversation they have been putting off with the ones they live among, set a small intention about how they want to be cared for, or simply admit what they need.",
  "lunationInvitation":"It is a good moment to name one honest wish about safety or belonging and take the first unglamorous step toward it,",
  "closingRelease":"trusting that seeds planted in the dark still count, even when there is nothing yet to show anyone."}},

"full-moon-capricorn": {
 "variant":"lunation","title":"Full Moon in Capricorn","dateRange":"July 9, 2026",
 "glyphs":["moon","capricorn"], "eyebrowLabel":"Lunation",
 "eventIdentity":{"eventType":"lunation","bodies":["sun","moon"],"sign":"capricorn","aspect":"full-moon"},
 "card":"Something we have been building comes to a head in public view, and what is finished asks to be acknowledged and released.",
 "pullQuote":"A release of something that was never truly yours.",
 "clauses":{
  "lunationAtmosphere":"A Full Moon peaks in Capricorn while the Sun sits opposite in Cancer, lighting the whole Cancer–Capricorn axis, the pull between private life and public duty.",
  "whatCulminatesOrBegins":"What was seeded weeks or months ago reaches its peak here, where private effort runs up against public consequence and the results of our discipline, or our avoidance, finally show.",
  "recognizableCollectiveScene":"A long project ships or stalls in front of everyone, a status we chased either arrives or clearly will not, and the gap between what we perform and what we have actually built gets hard to hide.",
  "lunationInvitation":"Rather than starting something new, this is the time to acknowledge what is genuinely complete and let it go,",
  "closingRelease":"because a full lunation rewards honesty about what is finished far more than it rewards one more push."}},

"solar-eclipse-aries": {
 "variant":"lunation","title":"Solar Eclipse in Aries","dateRange":"March 2027",
 "glyphs":["moon","aries"], "eyebrowLabel":"Eclipse",
 "eventIdentity":{"eventType":"eclipse-cycle","bodies":["sun","moon"],"sign":"aries","aspect":"solar-eclipse"},
 "sourceIds":["ms/article/pisces-total-lunar-eclipse","ms/article/lunar-nodes-eclipses-2025","cc/lunation/solar-eclipse-aries"],
 "card":"A charged fresh start arrives around independence and identity, the kind of turning point that tends to move faster than we planned.",
 "clauses":{
  "lunationAtmosphere":"A solar eclipse is a New Moon with the volume turned up, laying down new foundations, landing this time in Aries on the Aries–Libra axis of the lunar nodes, where standing on our own and answering to others are always in question together.",
  "whatCulminatesOrBegins":"Beginnings that might normally take months to declare themselves can arrive suddenly, pushing questions of independence, nerve, and acting for ourselves to a turning point.",
  "recognizableCollectiveScene":"A decision we kept postponing gets made almost on its own, a door opens or closes faster than expected, and the collective conversation tilts toward who is willing to go first.",
  "lunationInvitation":"Eclipses reward staying awake over forcing outcomes, so it helps to notice what is genuinely shifting and let it, instead of grabbing the wheel out of anxiety,",
  "closingRelease":"The eclipse marks a turning point, not a verdict, and what begins here still has to be lived out in the ordinary weeks that follow."}},

"lunar-eclipse-libra": {
 "variant":"lunation","title":"Lunar Eclipse in Libra","dateRange":"September 2027",
 "glyphs":["moon","libra"], "eyebrowLabel":"Eclipse",
 "eventIdentity":{"eventType":"eclipse-cycle","bodies":["sun","moon"],"sign":"libra","aspect":"lunar-eclipse"},
 "sourceIds":["ms/article/pisces-total-lunar-eclipse","ms/article/lunar-nodes-eclipses-2025","cc/lunation/lunar-eclipse-libra"],
 "card":"A relationship or balance we have been holding reaches a sudden head, and something we have outgrown is ready to be released.",
 "pullQuote":"A release of something that was never truly yours.",
 "clauses":{
  "lunationAtmosphere":"A lunar eclipse is a Full Moon at full intensity, a moment of release and revelation, and this one falls in Libra, across the axis of self and other.",
  "whatCulminatesOrBegins":"Things that have been quietly out of balance in our relationships come to a head faster than usual, and what felt avoidable last week arrives like water that has been pressing against a dam for months.",
  "recognizableCollectiveScene":"A partnership tips one way or the other, a fairness we let slide gets named out loud, and endings that were already underway simply finish.",
  "lunationInvitation":"Eclipses ask us to observe more than to push, so the useful move is to tell the truth about where a balance has quietly broken and to let go of what is genuinely over,",
  "closingRelease":"trusting that what leaves under an eclipse is usually something we kept postponing until life finally did the letting go for us."}},
}

def build():
    cards, details = [], []
    for ev, spec in FIX.items():
        variant = spec["variant"]
        tpl_id, eyebrow_label, plan = TPL[variant]
        cards.append({
            "id": f"sky/card/{ev}",
            "event": ev,
            "surface": "sky.collective.card",
            "templateId": "sky.collective.card.v1",
            "compactClaim": spec["card"],
            "sourceIds": [f"cc/{variant}/{ev}"],
            "readerAuthority": "reviewed-exact",
            "status": "REVIEWED_CLAUSE",
            "review_note": "needs Marie/editorial final sign-off before serving",
        })
        det = {
            "id": f"sky/detail/{ev}",
            "event": ev,
            "surface": "sky.collective.detail",
            "templateId": tpl_id,
            "templateVersion": TEMPLATE_VERSION,
            "variant": variant,
            "eyebrow": {"label": spec.get("eyebrowLabel", eyebrow_label), "glyphs": spec["glyphs"]},
            "title": spec["title"],
            "dateRange": spec["dateRange"],
            "clauses": spec["clauses"],
            "paragraphsPlan": spec.get("paragraphsPlan", plan),
            "eventIdentity": spec["eventIdentity"],
            "readerAuthority": "reviewed-exact",
            "status": "REVIEWED_CLAUSE",
            "sourceIds": spec.get("sourceIds", [f"cc/{variant}/{ev}"]),
            "review_note": "needs Marie/editorial final sign-off before serving",
        }
        if spec.get("pullQuote"):
            det["pull_quote"] = {"text": spec["pullQuote"], "tier": "CONFIRMED",
                                 "source": "Marie Satori (CONFIRMED)",
                                 "use": "optional serve-verbatim closer"}
        details.append(det)
    json.dump({"_meta": {"title": "Collective Sky — compact cards (sky.collective.card)",
               "contract": "sky.collective.card.v1", "count": len(cards),
               "tier": "REVIEWED_CLAUSE", "voice": "collective we/us/our",
               "note": "compact claim is NOT paragraph one of the expanded article"},
               "reviewed": cards},
              open(os.path.join(PKG, "phrasebank", "cc-sky-collective-card-reviewed.json"), "w"),
              indent=2, ensure_ascii=False)
    json.dump({"_meta": {"title": "Collective Sky — expanded detail (sky.collective.detail)",
               "templateVersion": TEMPLATE_VERSION, "count": len(details),
               "tier": "REVIEWED_CLAUSE", "voice": "collective we/us/our",
               "variants": sorted({d["variant"] for d in details}),
               "note": "semantic slots composed into 1-2 paragraphs; never one <p> per slot"},
               "reviewed": details},
              open(os.path.join(PKG, "phrasebank", "cc-sky-collective-detail-reviewed.json"), "w"),
              indent=2, ensure_ascii=False)
    print(f"wrote {len(cards)} compact cards + {len(details)} expanded details "
          f"({len(TPL)} variants).")

if __name__ == "__main__":
    build()
