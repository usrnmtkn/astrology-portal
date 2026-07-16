#!/usr/bin/env python3
"""
attach_pullquotes.py — attach Marie's CONFIRMED lines to matching records by theme.

Draws from phrasebank/marie-confirmed-quotes.json (her 127 own lines, tier CONFIRMED)
and attaches each to thematically-matching records as an optional `pull_quote` closer.
Matching is by sign / house / body / aspect / explicit id. Each line is capped so it
spreads to a few best homes (placements first) rather than repeating across dozens of
cards. One quote per record. Her words are never seam/register-linted.

Run AFTER builders + tone_pass.
"""
import json, os, glob, re, collections

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = 4  # max records per quote

SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio",
         "sagittarius","capricorn","aquarius","pisces"]
BODIES = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","chiron"]

# theme map: substring that identifies the quote  ->  tags
# tags: signs / houses / bodies / angles / ids  (a record matches on ANY)
THEME = [
 # worth / 2nd / Taurus / Venus
 ("Stop equating your worth with how much you own", {"houses":[2],"signs":["taurus"],"bodies":["venus"]}),
 ("Undercharging is not humility", {"houses":[2],"signs":["taurus"],"bodies":["venus"]}),
 ("Over-giving is not generosity", {"houses":[2,7],"bodies":["venus"]}),
 ("Stop proving your worth to people who can't even recognize their own", {"houses":[2],"signs":["taurus"]}),
 ("Your worth isn", {"houses":[2,8]}),
 ("Stop measuring your worth by your output", {"houses":[6,10],"signs":["virgo","capricorn"],"bodies":["saturn"]}),
 # boundaries / 7th / Libra
 ("Stop fearing that boundaries mean you don", {"houses":[7],"signs":["libra"],"bodies":["venus"]}),
 ("People who call you difficult", {"houses":[7],"signs":["libra","aries"]}),
 ("No relationship, no job, no amount of success", {"houses":[7],"signs":["libra"],"ids":["cc/aspect-pair/venus-square-saturn"]}),
 ("Stop saying yes before you", {"signs":["libra"],"houses":[7]}),
 ("Invitation, availability, and trust are also actions", {"houses":[7],"signs":["libra"]}),
 # voice / mind / Gemini / 3rd / Mercury
 ("Trust that your voice is enough", {"signs":["gemini"],"houses":[3],"bodies":["mercury"]}),
 ("Stop filling every silence with your voice", {"signs":["gemini"],"houses":[3],"bodies":["mercury"]}),
 ("Stop believing that speed equals intelligence", {"signs":["gemini"],"bodies":["mercury"]}),
 ("Let clarity be more important than charisma", {"bodies":["mercury"],"signs":["gemini"]}),
 # feelings / home / Cancer / 4th / Moon
 ("Your needs are not too much", {"signs":["cancer"],"houses":[4],"bodies":["moon"]}),
 ("Become the home you", {"signs":["cancer"],"houses":[4],"bodies":["moon"]}),
 ("If you've been sitting on your feelings", {"bodies":["moon"],"signs":["cancer"]}),
 ("The fourth house is where the bodies are buried", {"houses":[4]}),
 ("The fourth house is a place we can", {"houses":[4]}),
 ("Grief is so physical", {"houses":[4,8],"bodies":["moon"]}),
 # self / creativity / Leo / 5th / Sun
 ("You're allowed to make things that don", {"signs":["leo"],"houses":[5],"bodies":["sun"]}),
 ("You’re allowed to love without wondering", {"signs":["leo"],"houses":[5]}),
 # identity / Aries / 1st / Mars
 ("Let yourself want what you want", {"signs":["aries"],"houses":[1],"bodies":["mars"]}),
 ("Stop making yourself smaller to make others comfortable", {"signs":["aries"],"houses":[1]}),
 ("Stop calling it stress when it", {"bodies":["mars"],"signs":["aries","scorpio"]}),
 ("You don't know what can happen until you try", {"signs":["aries"],"bodies":["mars"]}),
 # transformation / 8th / Scorpio / Pluto
 ("Stop fearing that changing means losing yourself", {"signs":["scorpio"],"houses":[8],"bodies":["pluto","uranus"]}),
 ("The eighth house is not a scary influence", {"houses":[8]}),
 ("Eighth-house planets are not out to get you", {"houses":[8]}),
 ("Grieve the version of you", {"houses":[8],"signs":["scorpio"],"ids":["cc/aspect-pair/saturn-conjunction-saturn","cc/aspect-pair/pluto-conjunction-venus"]}),
 ("Vulnerability is not weakness", {"signs":["scorpio"],"houses":[8],"bodies":["chiron"]}),
 ("You don't need to fix everything to deserve love", {"signs":["virgo"],"bodies":["chiron"]}),
 # meaning / 9th / Sagittarius
 ("The ninth house is the house of freedom", {"houses":[9],"signs":["sagittarius"]}),
 # authority / 10th / Capricorn / Saturn / MC
 ("Authority is the power to make choices about your own life", {"houses":[10],"signs":["capricorn"],"angles":["midheaven"]}),
 ("Saturn doesn't want you to become faster", {"bodies":["saturn"],"signs":["capricorn"]}),
 ("Stop needing to appear unshakeable", {"houses":[10],"signs":["capricorn"],"ids":["cc/aspect-pair/sun-opposition-moon"]}),
 ("Your pace is not too slow", {"signs":["taurus","capricorn"],"bodies":["saturn"]}),
 ("Starting at the wrong time wastes more time", {"bodies":["saturn"]}),
 # community / 11th / Aquarius
 ("Stop fearing that belonging means losing your individuality", {"houses":[11],"signs":["aquarius"]}),
 ("The power of group work isn", {"houses":[11],"signs":["aquarius"]}),
 ("You’re realizing that authenticity and belonging aren", {"houses":[11],"signs":["aquarius"]}),
 # 12th / Pisces / Neptune
 ("Some truths are felt in the body", {"houses":[12],"signs":["pisces"],"bodies":["neptune"]}),
 ("Imagination is the only way you can contend with uncertainty", {"signs":["pisces"],"houses":[12],"bodies":["neptune"]}),
 ("If you're feeling drained or pulled inward", {"houses":[12],"signs":["pisces"]}),
 # doubt / fear / Chiron / Saturn
 ("Your doubts, even your very well studied doubts", {"bodies":["saturn","chiron"]}),
 ("Fear is not the enemy", {"bodies":["chiron"]}),
 ("You are enough even when you feel minuscule", {"signs":["virgo"],"houses":[6],"bodies":["chiron"]}),
 ("Some of our most courageous people are also the most scared", {"bodies":["chiron","mars"]}),
 # health / 6th / Virgo
 ("Stop wearing burnout like a badge of honor", {"houses":[6],"signs":["virgo","capricorn"],"bodies":["saturn"]}),
 ("self-care isn't some luxury you earn", {"houses":[6],"signs":["virgo"]}),
 ("Stop obsessing over the small details of daily life", {"signs":["virgo"],"houses":[6]}),
]

def record_tags(r):
    """Extract {signs, houses, bodies, angles} a record can match on."""
    signs, houses, bodies, angles = set(), set(), set(), set()
    rid = r["id"]
    m = re.search(r"-in-(" + "|".join(SIGNS) + r")\b", rid)
    if m: signs.add(m.group(1))
    m = re.search(r"-in-(\d+)-house", rid)
    if m: houses.add(int(m.group(1)))
    if r.get("angle"): angles.add(r["angle"])
    for b in (r.get("transiting_body"), r.get("natal_body"), r.get("body")):
        if b: bodies.add(b)
    for b in BODIES:
        if re.search(r"\b" + b + r"\b", rid): bodies.add(b)
    return signs, houses, bodies, angles

def matches(tags, theme):
    signs, houses, bodies, angles = tags
    return (any(s in signs for s in theme.get("signs", [])) or
            any(h in houses for h in theme.get("houses", [])) or
            any(b in bodies for b in theme.get("bodies", [])) or
            any(a in angles for a in theme.get("angles", [])))

def main():
    all_quotes = json.load(open(os.path.join(PKG, "phrasebank", "marie-confirmed-quotes.json")))["quotes"]
    corpus = [
        q for q in all_quotes
        if q.get("status") != "REFERENCE_ONLY"
        and "do not serve" not in str(q.get("serving", "")).lower()
    ]
    by_text = {q["text"]: q for q in corpus}
    def norm(s):
        return s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    def find(sub):
        s = norm(sub)
        for q in corpus:
            if s in norm(q["text"]):
                return q
        return None

    files = sorted(glob.glob(os.path.join(PKG, "phrasebank", "cc-*reviewed*.json")))
    data = {fp: json.load(open(fp)) for fp in files}
    recs = [r for d in data.values() for r in d["reviewed"]]
    tagcache = {r["id"]: record_tags(r) for r in recs}
    byid = {r["id"]: r for r in recs}

    attached = 0; used_quotes = 0; missing = []
    for sub, theme in THEME:
        q = find(sub)
        if q is None:
            missing.append(sub); continue
        picks = []
        # explicit ids first
        for rid in theme.get("ids", []):
            if rid in byid and "pull_quote" not in byid[rid]:
                picks.append(byid[rid])
        # then thematic matches, placements before aspects
        cand = [r for r in recs if "pull_quote" not in r and r not in picks and matches(tagcache[r["id"]], theme)]
        cand.sort(key=lambda r: (0 if r.get("kind") in ("lunar_node","chiron_placement") else 1, r["id"]))
        picks += cand
        picks = picks[:CAP]
        if picks:
            used_quotes += 1
        qn = norm(q["text"])[:40]
        for r in picks:
            # dedup: skip if this line is already woven into the record's body copy
            body = norm(" ".join(str(v) for v in r.get("slots", {}).values())
                        + " " + str(r.get("expanded_narrative", "")))
            if qn and qn in body:
                continue
            r["pull_quote"] = {"text": q["text"], "source": q["source"], "tier": "CONFIRMED",
                               "use": "optional serve-verbatim closer / standalone card"}
            attached += 1

    # ---- transit-to-natal pass ---------------------------------------------
    # The THEME map above is sign/house-keyed, so transit aspect-pair records
    # (body + aspect + natal point/angle) rarely matched. This pass matches them
    # by (transiting_body, natal_target) with per-aspect-valence quote choices.
    # Still CONFIRMED (verbatim Marie); capped per quote to limit repetition.
    import sys as _sys
    _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from transit_pullquote_map import candidates as transit_candidates
    TRANSIT_CAP = 2  # max TOTAL transit records per quote (collision-checker verifies)
    # seed usage with any transit-row quotes already placed by the THEME pass,
    # so the cap bounds a line's TOTAL footprint on the transit surface.
    transit_use = collections.Counter()
    for r in recs:
        if r["id"].startswith("cc/aspect-pair/") and isinstance(r.get("pull_quote"), dict):
            transit_use[r["pull_quote"]["text"]] += 1
    transit_attached = 0
    transit_missing = set()
    for r in recs:
        if "pull_quote" in r:
            continue
        if not r["id"].startswith("cc/aspect-pair/"):
            continue
        toks = (r.get("pair") or "").split()
        aspect = r.get("aspect")
        if len(toks) < 3 or not aspect:
            continue
        body = toks[0]
        target = " ".join(toks[2:])
        for sub in transit_candidates(body, target, aspect):
            q = find(sub)
            if q is None:
                transit_missing.add(sub); continue
            if q.get("scope", "universal") != "universal":
                continue  # sign-scoped lines never enter the universal transit pool
            if transit_use.get(q["text"], 0) >= TRANSIT_CAP:
                continue
            qn = norm(q["text"])[:40]
            body_txt = norm(" ".join(str(v) for v in r.get("slots", {}).values())
                            + " " + str(r.get("expanded_narrative", "")))
            if qn and qn in body_txt:  # already woven into the reading; skip
                continue
            r["pull_quote"] = {
                "text": q["text"], "source": q["source"], "tier": "CONFIRMED",
                "use": "optional serve-verbatim closer / standalone card",
                "match": "transit-theme auto-match; verbatim Marie; DRAFT pending editorial sign-off",
            }
            transit_use[q["text"]] = transit_use.get(q["text"], 0) + 1
            transit_attached += 1
            attached += 1
            break

    for fp, d in data.items():
        json.dump(d, open(fp, "w"), indent=2, ensure_ascii=False)
    total = sum(1 for r in recs if "pull_quote" in r)
    print(f"attached {attached} pull-quotes from {used_quotes} distinct CONFIRMED lines; "
          f"{total} records now carry one.")
    print(f"  transit pass: +{transit_attached} on transit aspect-pairs "
          f"({len(transit_use)} distinct quotes, cap {TRANSIT_CAP}/quote).")
    if transit_missing:
        print("  (transit substrings not found:", "; ".join(list(transit_missing)[:6]), ")")
    if missing:
        print("  (quotes not found for:", "; ".join(missing[:5]), "...)")

if __name__ == "__main__":
    main()
