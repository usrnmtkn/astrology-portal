#!/usr/bin/env python3
"""
build_synastry_reviews.py — synastry (two-chart compatibility).

Relational voice: addressed to "you" about "them" (their planet -> your planet).
  inter-aspects: the essential compatibility contacts, each at conjunction / harmonious
                 (trine, sextile) / hard (square, opposition).  render: scene. dynamic. navigation.
  house overlays: their planet in your Nth house (the 12 domains it activates).

Doctrine/voice grounded in ms/synastry-aspect, ms/synastry-bank (contribute/receive),
ms/synastry-house-overlay, and Hayden / Jansky / Suskin (folder). Emits
phrasebank/cc-synastry-reviewed.json.
"""
import json, os

# pair "A-B" (their A -> your B) -> valence -> (scene, dynamic, navigation)
PAIRS = {
"sun-sun": {
 "conjunction":("Your core selves point the same way, so you recognize each other fast and pull in the same direction","It's easy and validating, and it can also mean you compete for the same spotlight","Root for each other instead of racing; there's room for two"),
 "harmonious":("Your identities and goals cooperate without much effort","You back each other's direction naturally","Lean on how naturally you line up and build something together"),
 "hard":("Your core directions rub against each other, wanting different things at the same time","Respect can curdle into a contest of wills","Take turns being the one who's right")},
"sun-moon": {
 "conjunction":("Their identity sits right on your feelings, so who they are shapes your mood almost automatically","It can feel like being deeply understood, and it can also mean their day sets yours","Keep your own emotional weather; let them warm it, not run it"),
 "harmonious":("Their sense of self and your feelings fit together comfortably","You feel safe being yourself around them","This is real compatibility glue, so trust it"),
 "hard":("Their direction and your needs keep pulling different ways","Their confidence can unsettle your comfort","Name what you need out loud instead of quietly adjusting around them")},
"sun-venus": {
 "conjunction":("You find them genuinely lovely, and being around them feels warm and easy","Affection and admiration flow, sometimes tipping into idealizing them","Enjoy the warmth and still see them clearly"),
 "harmonious":("Your identity and their affection cooperate, so liking each other comes easily","A natural, pleasant warmth","Let the ease be part of the foundation"),
 "hard":("What you want to be and what they find lovely don't quite match","Affection is there but the taste or the timing is off","Say what actually pleases you instead of guessing")},
"sun-mars": {
 "conjunction":("Their drive lands right on your sense of self, energizing you and occasionally challenging you","Attraction and rivalry can run on the same wire","Point the shared energy at a goal, not at each other"),
 "harmonious":("Their initiative and your identity move well together","You spur each other to act","Take on something that needs both your engines"),
 "hard":("Their push and your ego keep colliding","It's stimulating and combustible","Fight fair, and burn the heat off physically rather than verbally")},
"sun-saturn": {
 "conjunction":("They steady you, and they can also weigh on you","Their standards land as support or as judgment depending on the day","Take the structure, refuse the shame"),
 "harmonious":("Their discipline and your direction build well together","They help you make it real and lasting","Let them be the structure under your fire"),
 "hard":("Their caution presses on your confidence, and you feel checked","They can ground you or dim you","Ask whether their limit is care or control, and answer that")},
"sun-pluto": {
 "conjunction":("Their intensity lands on your sense of self, transforming and sometimes overpowering you","Magnetic and heavy, with a pull toward control","Let them deepen you, not run you"),
 "hard":("Their intensity keeps pressing on who you are","Power and identity get tangled between you","Hold your own center inside the intensity")},
"moon-moon": {
 "conjunction":("You share very similar emotional rhythms, so you tend to feel things at the same time","Deeply comforting, and it can amplify a low mood between you","When you're both down, one of you names it so it doesn't spiral"),
 "harmonious":("Your emotional needs fit together easily","Home feels natural with them","This is quiet, durable compatibility"),
 "hard":("Your emotional needs and habits keep missing each other","What soothes one of you unsettles the other","Learn each other's actual comfort, not the one you'd assume")},
"moon-venus": {
 "conjunction":("Their affection lands on your need for closeness, and tenderness comes easily","A gentle, fond, nurturing warmth","Let the softness matter as much as the spark"),
 "harmonious":("Your feelings and their affection line up in a low-pressure way","Warmth is there when either of you reaches for it","Reach for it; it's freely given here"),
 "hard":("What you need and what they value pull slightly apart","Affection and comfort are a little crossed","Ask for the specific comfort instead of the grand gesture")},
"moon-mars": {
 "conjunction":("Their drive lands on your feelings, exciting and occasionally abrasive","Passion and irritation run close together","Move the heat before it becomes a fight about feelings"),
 "harmonious":("Their action and your feelings cooperate","They move you and you aim them","Let them help you act on what you feel"),
 "hard":("Their push keeps bruising your softer needs","You feel poked right where you're tender","They slow down, and you say the hurt directly")},
"moon-saturn": {
 "conjunction":("They ground your feelings, and they can also cool them","Their seriousness lands as steadiness or as coldness","Let them be safe, not stern, and tell them when it tips"),
 "harmonious":("Their steadiness and your feelings settle each other","They make your emotional world feel safe and durable","This is commitment glue, so lean on it"),
 "hard":("Their restraint presses on your emotional needs at an angle that keeps catching","Their caution can feel like rejection until you can feel the care under it","Name the need; don't wait for them to notice")},
"moon-pluto": {
 "conjunction":("Their intensity reaches your deepest feelings, and the bond gets profound fast","Deeply merging, with a risk of emotional control","Stay honest about needs so depth doesn't become dependency")},
"mercury-mercury": {
 "conjunction":("You think out loud together and finish each other's sentences","Constant, easy mental connection","Make sure you also sit in silence together sometimes"),
 "harmonious":("Your minds move well together","Conversation flows and ideas build","Use the easy talk to sort things out early"),
 "hard":("You think and talk in ways that keep catching on each other","Similar enough to engage constantly, different enough to misread","Slow down and check what they actually meant")},
"venus-venus": {
 "conjunction":("You value and enjoy similar things, and express affection in compatible ways","Liking each other comes naturally","Shared taste is a gift, so build a life around it"),
 "harmonious":("Your affections and tastes align","Ease, pleasure, and genuine enjoyment of each other","Let this be the low-drama center of the bond"),
 "hard":("What you each find lovely doesn't quite match","You love differently, and it can feel like a mismatch","Learn their love language instead of insisting on yours")},
"venus-mars": {
 "conjunction":("Their drive and desire land right on your affection, so wanting and being wanted move fast","Strong chemistry, easy to act on before you've thought it through","Enjoy the spark, and let the rest of the bond catch up to it"),
 "harmonious":("Their desire and your affection line up with almost no resistance","Attraction and warmth coordinate smoothly","This is the classic attraction glue, so enjoy it"),
 "hard":("Desire and affection are there, but the timing or the approach keeps clashing","Attraction and irritation coexist","Talk about pace and pursuit directly")},
"venus-saturn": {
 "conjunction":("They ask your affection to commit and get real","Their reserve reads as depth or as a cold shoulder","Let them slow-build the love, and call out the chill when it's chill"),
 "harmonious":("Their commitment and your affection sit easily together","A love that's warm and built to last","Define what you want and make it durable"),
 "hard":("Their caution keeps pressing on your warmth, so your affection can feel like pressure and their restraint like coldness","Love here is effortful and easily doubted","Ask for what you need directly, and let their actions prove the care")},
"venus-pluto": {
 "conjunction":("Their intensity lands on your affection, and the attraction goes deep fast","Magnetic and consuming, with a pull toward control or obsession","Let it be deep without letting it become possession"),
 "hard":("Their intensity and your affection make a charged, sometimes destabilizing pull","Jealousy or power can enter the love","Keep your autonomy inside the intensity")},
"mars-mars": {
 "conjunction":("You go after what you want in very similar ways, so you move in strong sync and also collide","Two identical drives that both want the wheel","Decide who leads on what before the trip, not during"),
 "harmonious":("Your drives cooperate and spur each other","You get things done together","Take on the ambitious thing as a team"),
 "hard":("Your drives keep clashing, wanting to move different ways at once","Friction, competition, and heat","Aim the fight at a shared task, not at each other")},
"mars-saturn": {
 "conjunction":("Their caution lands on your drive, so you feel both braked and steadied","They can discipline your action or frustrate it","Use their structure to aim your push, not to stop it"),
 "harmonious":("Their discipline and your drive build well","Steady, productive effort together","This is a good working-partnership dynamic"),
 "hard":("Their limits and your drive grind against each other","You feel blocked, and they feel rushed","Agree on the pace out loud")},
"saturn-ascendant": {
 "conjunction":("Their standards affect how freely you show up around them","They can help you get serious or make you self-conscious","Take the steadiness; don't make yourself smaller to fit their gravity"),
 "hard":("Their caution or criticism affects how freely you present yourself","You may over-prepare, and feel watched","Show up as yourself; their approval isn't the bar")},
"jupiter-venus": {
 "conjunction":("Their optimism lands on your affection, and the bond feels generous and warm","Easy enjoyment, with a risk of overpromising or overindulging","Enjoy the abundance without letting it inflate the promises")},
"ascendant-ascendant": {
 "conjunction":("Your first impressions click, and you come across to each other as familiar right away","An easy, instinctive rapport","Trust the early ease, and still let the real people show up over time")},
"neptune-ascendant": {
 "hard":("Their dreaminess and blurred edges land on how you show up, so it's not always clear how they actually see you","You can feel idealized or quietly misread, admired for a version of you that isn't quite real","Ask for the clear read instead of performing the image they project onto you")},
"mars-midheaven": {
 "conjunction":("Their drive lands right on your ambitions and pushes your public direction forward","They can light a fire under your goals, or steamroll them with their own agenda","Use their motivation as fuel, and keep your hand on the wheel of where you're going")},
}

VAL_ASPECTS = {"conjunction":["conjunction"], "harmonious":["trine","sextile"], "hard":["square","opposition"]}
ASPECT_VERB = {"conjunction":"conjunct","trine":"trine","sextile":"sextile","square":"square","opposition":"opposition"}

# ---------------------------------------------------------------------------
# Generative fallback so NO synastry card is ever empty. The app can surface an
# aspect between any two points within orb — every outer planet and both angles
# against everything — but PAIRS only bespoke-covers the common personal-planet
# contacts. For anything uncovered we compose scene/dynamic/navigation from the
# contribute/receive banks (Marie's own content model) plus a valence frame.
# Bespoke PAIRS always win where they exist.
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_RECS = json.load(open(os.path.join(PKG, "sources", "tldr-astro-records.json")))["records"]
CONTRIB, RECV = {}, {}
for _r in _RECS:
    _k = _r.get("key", "")
    if "synastry-bank/contribute/" in _k: CONTRIB[_k.split("/")[-1]] = _r.get("text", "")
    if "synastry-bank/receive/" in _k:    RECV[_k.split("/")[-1]] = _r.get("text", "")
# angles can also be the acting ("their") side; short voiced contribute phrases
CONTRIB.update({
 "ascendant":"their presence and the way they carry themselves",
 "midheaven":"their ambitions and public direction",
 "descendant":"what they look for in a partner",
 "ic":"their private world and where they come from"})
# short-form aliases the app may use for the angles
for _long, _short in (("ascendant","asc"), ("midheaven","mc"), ("descendant","dsc"), ("ic","ic")):
    if _long in CONTRIB: CONTRIB[_short] = CONTRIB[_long]
    if _long in RECV:    RECV[_short] = RECV[_long]

GEN_VERB = {"conjunction":"sit right on top of", "harmonious":"work smoothly with", "hard":"press against"}
GEN_DYN = {
 "conjunction":"This is one of the closest contacts between you, strong and constant, energizing at its best and a lot to hold at its worst",
 "harmonious":"It runs easily and asks little, quietly steadying the rest of the bond",
 "hard":"It catches often enough that you both feel it, and it keeps asking to be worked out"}
GEN_NAV = {
 "conjunction":"Let the closeness feed you without letting it run you",
 "harmonious":"Lean on how naturally this one lines up",
 "hard":"Name it directly instead of letting it build in silence"}

def _cap(s): return s[:1].upper() + s[1:] if s else s
def gen_slots(a, b, group):
    cont, rec = CONTRIB.get(a), RECV.get(b)
    if not cont or not rec: return None
    scene = f"{_cap(cont)} {GEN_VERB[group]} {rec}"
    return (scene, GEN_DYN[group], GEN_NAV[group])

# full body sets: planets contribute + receive; angles receive (and act, via the
# short phrases above). Iterate every ordered (their -> your) contact.
PLANETS = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"]
ANGLES  = ["ascendant","midheaven","descendant","ic","asc","mc","dsc"]
THEIR_BODIES = PLANETS + ANGLES
YOUR_BODIES  = PLANETS + ANGLES

# ms/synastry-house-overlay domains
OVERLAY = {
1:"how freely they act around you: your appearance, energy, and first moves",
2:"your money, priorities, and self-worth, and what feels worth the cost between you",
3:"your daily talk: texting, teasing, tone, errands, and how you coordinate",
4:"your home, privacy, and family expectations, and the emotional history you carry",
5:"dating, play, creativity, attention, and pleasure between you",
6:"your routines, chores, schedules, and who does what",
7:"agreements, cooperation, and direct negotiation between you",
8:"shared money, trust, dependency, and what each of you owes the other",
9:"your beliefs, travel, learning, and what you each think is right",
10:"your ambition, reputation, and public direction, for support or interference",
11:"friendship, shared goals, and where you each fit in the other's future",
12:"the private and unspoken: hidden attraction, avoided conflict, hard-to-name irritation",
}
ORD = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}

# canonical names for bespoke lookup (angle short-forms -> full)
CANON = {"asc":"ascendant","mc":"midheaven","dsc":"descendant"}
def title_name(x):
    return {"ic":"IC","asc":"Ascendant","mc":"MC","dsc":"Descendant","midheaven":"MC","ascendant":"Ascendant","descendant":"Descendant"}.get(x, x.capitalize())

records = []
seen = set()
bespoke_n = gen_n = 0
for a in THEIR_BODIES:
    for b in YOUR_BODIES:
        ca, cb = CANON.get(a, a), CANON.get(b, b)
        bespoke = PAIRS.get(f"{ca}-{cb}", {})
        for group in ("conjunction", "harmonious", "hard"):
            slots = bespoke.get(group)
            reviewed = slots is not None
            if slots is None:
                slots = gen_slots(a, b, group)
            if slots is None:
                continue
            scene, dyn, nav = slots
            for asp in VAL_ASPECTS[group]:
                rid = f"cc/synastry/{a}-{asp}-{b}"
                if rid in seen:
                    continue
                seen.add(rid)
                if reviewed: bespoke_n += 1
                else: gen_n += 1
                records.append({
                  "id": rid, "kind":"synastry_aspect",
                  "their_body":a, "your_body":b, "aspect":asp, "valence":group,
                  "surface":"synastry.inter_aspect",
                  "status":"REVIEWED_CLAUSE" if reviewed else "DRAFT",
                  "tier":"reviewed-voiced" if reviewed else "template-generated-grounded",
                  "generated": not reviewed,
                  "title": f"Their {title_name(a)} {ASPECT_VERB[asp]} your {title_name(b)}",
                  "slots":{"relational_scene":scene, "dynamic":dyn, "navigation":nav},
                  "source_keys":[f"ms/synastry-bank/contribute/{ca}", f"ms/synastry-bank/receive/{cb}", f"cc/aspect/{asp}"],
                  "doctrine_source":"ms/synastry banks + Hayden/Jansky/Suskin (doctrine only, voiced)",
                  "tone_version":"marie-calibrated-v1","originalityCheck":"voiced relational; no keyword seam",
                  "review_note":"needs Marie/editorial final sign-off before serving"})
for h, dom in OVERLAY.items():
    records.append({
      "id": f"cc/synastry/house-overlay-{h}", "kind":"synastry_house_overlay", "house":h,
      "surface":"synastry.house_overlay", "status":"REVIEWED_CLAUSE",
      "title": f"Their planet in your {ORD[h]} house",
      "slots":{"overlay_domain": f"When their planet falls in your {ORD[h]} house, they light up {dom}"},
      "compose_note":"combine with ms/synastry-bank/contribute/{planet} for the specific planet's flavor",
      "source_keys":[f"ms/synastry-house-overlay/{h}"], "tone_version":"marie-calibrated-v1",
      "originalityCheck":"voiced","review_note":"needs Marie/editorial final sign-off before serving"})

out = {"_meta":{"title":"Reviewed synastry (two-chart): inter-aspects + house overlays",
        "bespoke_pairs":len(PAIRS), "house_overlays":len(OVERLAY), "count":len(records),
        "inter_aspects_bespoke":bespoke_n, "inter_aspects_generated":gen_n,
        "coverage":"every their->your body contact (10 planets + Asc/MC/Desc/IC, incl. short aliases) at all 5 aspects; no empty cards",
        "voice":"relational, second person about 'them' (their planet -> your planet)",
        "render":"{relational_scene}. {dynamic}. {navigation}.",
        "tier":"bespoke = reviewed-voiced; fallback = template-generated-grounded (generated:true), DRAFT",
        "tone_version":"marie-calibrated-v1",
        "note":"Bespoke slots override; uncovered contacts compose scene/dynamic/navigation from the contribute/receive banks + a valence frame. House-overlay records give the domain; planet flavor composes from ms/synastry-bank/contribute/{planet}."},
       "reviewed":records}
dest = os.path.join(PKG, "phrasebank", "cc-synastry-reviewed.json")
json.dump(out, open(dest,"w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} synastry records ({bespoke_n} bespoke + {gen_n} generated inter-aspects + {len(OVERLAY)} overlays) -> {dest}")
