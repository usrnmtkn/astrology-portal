#!/usr/bin/env python3
"""
attach_marie_advice.py — place Marie's CONFIRMED ruling-planet-advice by THEME.

The 24 advice pieces are placed where they fit thematically (not by their sign label),
attached as an optional CONFIRMED `marie_advice` field on matching records across the
whole bank (placements, aspects, nodes, chiron, ...). One advice per record, capped so
each piece spreads to a few best homes. Her words; never linted or tone-passed.

Run AFTER the builders + tone_pass + revoice.
"""
import json, os, glob, re

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = 5
SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"]
BODIES = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","chiron"]

# advice id -> theme tags (signs / houses / bodies / ids)
THEME = {
 "cc/ruling-planet-advice/aries-1":  {"bodies":["mars"],"houses":[1,6],"ids":["cc/aspect-pair/mars-square-saturn"]},   # reactive day, first hour
 "cc/ruling-planet-advice/taurus-1": {"houses":[2],"signs":["taurus"],"ids":["cc/node/north-node-in-taurus","cc/chiron/chiron-in-2-house"]},  # worth beyond achievement
 "cc/ruling-planet-advice/gemini-1": {"bodies":["mercury"],"signs":["gemini"],"ids":["cc/aspect-pair/mercury-square-pluto"]},  # opinions hardening
 "cc/ruling-planet-advice/cancer-1": {"signs":["cancer"],"ids":["cc/node/south-node-conjunction-moon","cc/aspect-pair/moon-conjunction-saturn"]},  # clinging to hard times
 "cc/ruling-planet-advice/leo-1":    {"houses":[10],"signs":["leo"],"ids":["cc/angle/midheaven-in-leo"]},  # credit the help/luck
 "cc/ruling-planet-advice/virgo-1":  {"signs":["virgo"],"houses":[6],"ids":["cc/chiron/chiron-in-virgo"]},  # over-systematizing
 "cc/ruling-planet-advice/libra-1":  {"houses":[7],"ids":["cc/aspect-pair/venus-square-saturn","cc/chiron/chiron-in-libra","cc/aspect-pair/saturn-square-descendant"]},  # finish leaving
 "cc/ruling-planet-advice/scorpio-1":{"signs":["scorpio"],"houses":[8],"ids":["cc/aspect-pair/mars-square-pluto"]},  # leave the bad room
 "cc/ruling-planet-advice/sagittarius-1":{"houses":[9],"signs":["sagittarius"],"ids":["cc/node/north-node-in-sagittarius"]},  # take the next step
 "cc/ruling-planet-advice/capricorn-1":{"ids":["cc/aspect-pair/saturn-conjunction-saturn","cc/aspect-pair/saturn-square-saturn"],"signs":["capricorn"]},  # do the repetitive work
 "cc/ruling-planet-advice/aquarius-1":{"bodies":["uranus"],"signs":["aquarius"],"houses":[11]},  # don't over-follow hype
 "cc/ruling-planet-advice/pisces-1": {"signs":["pisces"],"houses":[12],"ids":["cc/aspect-pair/neptune-conjunction-moon"]},  # getting through a low period is work
 "cc/ruling-planet-advice/aries-2":  {"bodies":["mars"],"ids":["cc/aspect-pair/mars-square-saturn","cc/node/north-node-in-aries"]},  # commit fully, stop half-in
 "cc/ruling-planet-advice/taurus-2": {"signs":["taurus"],"ids":["cc/chiron/chiron-in-6-house","cc/aspect-pair/saturn-conjunction-mars"]},  # stop proving you can survive
 "cc/ruling-planet-advice/gemini-2": {"bodies":["mercury"],"ids":["cc/aspect-pair/neptune-conjunction-mercury","cc/aspect-pair/mercury-square-saturn"]},  # overthinking, leave it alone
 "cc/ruling-planet-advice/cancer-2": {"ids":["cc/chiron/chiron-in-cancer","cc/aspect-pair/moon-square-saturn","cc/chiron/chiron-conjunction-moon"]},  # defenses, who's actually there
 "cc/ruling-planet-advice/leo-2":    {"signs":["leo"],"houses":[5],"ids":["cc/chiron/chiron-conjunction-sun"]},  # confidence, let work speak
 "cc/ruling-planet-advice/virgo-2":  {"signs":["virgo"],"ids":["cc/chiron/chiron-in-6-house"]},  # cynicism, look up
 "cc/ruling-planet-advice/libra-2":  {"signs":["libra"],"houses":[7]},  # rooms of social calculation
 "cc/ruling-planet-advice/scorpio-2":{"signs":["scorpio"],"ids":["cc/node/north-node-in-scorpio","cc/aspect-pair/pluto-conjunction-sun"]},  # private change, let it be yours
 "cc/ruling-planet-advice/sagittarius-2":{"signs":["sagittarius"],"houses":[9],"bodies":["jupiter"]},  # go far enough to be surprised
 "cc/ruling-planet-advice/capricorn-2":{"signs":["capricorn"],"ids":["cc/aspect-pair/saturn-conjunction-sun"]},  # keep showing up after the excitement
 "cc/ruling-planet-advice/aquarius-2":{"signs":["aquarius"],"bodies":["uranus"],"ids":["cc/node/north-node-in-aquarius"]},  # build a life sturdy for independence
 "cc/ruling-planet-advice/pisces-2": {"signs":["pisces"],"houses":[12],"ids":["cc/aspect-pair/neptune-conjunction-sun"]},  # disappearing into thought, come back
}

def record_tags(r):
    signs, houses, bodies = set(), set(), set()
    rid = r["id"]
    for k in ("sign",):
        if r.get(k): signs.add(r[k])
    m = re.search(r"-in-(" + "|".join(SIGNS) + r")\b", rid);
    if m: signs.add(m.group(1))
    m = re.search(r"\b(" + "|".join(SIGNS) + r")-\d\b", rid)
    if m: signs.add(m.group(1))
    if r.get("house"): houses.add(int(r["house"]))
    m = re.search(r"-in-(\d+)-house", rid)
    if m: houses.add(int(m.group(1)))
    for b in (r.get("transiting_body"), r.get("natal_body"), r.get("body")):
        if b: bodies.add(b)
    for b in BODIES:
        if re.search(r"\b" + b + r"\b", rid): bodies.add(b)
    return signs, houses, bodies

def matches(tags, theme):
    signs, houses, bodies = tags
    return (any(s in signs for s in theme.get("signs", [])) or
            any(h in houses for h in theme.get("houses", [])) or
            any(b in bodies for b in theme.get("bodies", [])))

def main():
    advice = {a["id"]: a for a in json.load(open(os.path.join(PKG, "phrasebank", "cc-ruling-planet-advice.json")))["advice"]}
    files = sorted(glob.glob(os.path.join(PKG, "phrasebank", "cc-*reviewed*.json")))
    data = {fp: json.load(open(fp)) for fp in files}
    recs = [r for d in data.values() for r in d["reviewed"]]
    byid = {r["id"]: r for r in recs}
    tags = {r["id"]: record_tags(r) for r in recs}

    attached = 0
    for aid, theme in THEME.items():
        a = advice.get(aid)
        if not a: continue
        picks = [byid[i] for i in theme.get("ids", []) if i in byid and "marie_advice" not in byid[i]]
        cand = [r for r in recs if "marie_advice" not in r and r not in picks and matches(tags[r["id"]], theme)]
        cand.sort(key=lambda r: (0 if r.get("kind") in ("lunar_node","chiron_placement","planet_in_house") else 1, r["id"]))
        picks += cand
        for r in picks[:CAP]:
            r["marie_advice"] = {"text": a["text"], "tier": "CONFIRMED", "source": a["source"],
                                 "use": "optional CONFIRMED expanded advice; serve verbatim"}
            attached += 1
    for fp, d in data.items():
        json.dump(d, open(fp, "w"), indent=2, ensure_ascii=False)
    total = sum(1 for r in recs if "marie_advice" in r)
    print(f"placed {attached} CONFIRMED advice attachments from {len(THEME)} pieces; {total} records now carry one.")

if __name__ == "__main__":
    main()
