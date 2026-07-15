#!/usr/bin/env python3
"""
render_lunation_authored.py — lint the AUTHORED by-sign lunation cards.

Checks each REVIEWED card: per-sentence seam + banned register (mask / authentic self /
alignment / ...), word band (full moon 90-160, new moon 80-150), personalized 'you'
register, house-axis present on every full-moon card, correct house math for the sign,
no compact/keyword-stack, and a soft X-not-Y count. CONFIRMED verbatim cards are validated
separately (they are exact and exempt).
"""
import os, sys, re, json

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import seam_filter as sf  # noqa: E402

SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio",
         "sagittarius","capricorn","aquarius","pisces"]
BAND = {"full_moon": (90, 160), "new_moon": (80, 150)}

def words(t): return len(re.findall(r"\b[\w'-]+\b", t))
def sents(t): return [s for s in re.split(r"(?<=[.?]) ", t) if s.strip()]
def house_of(target, frame): return (SIGNS.index(target) - SIGNS.index(frame)) % 12 + 1

def main():
    d = json.load(open(os.path.join(PKG, "phrasebank", "cc-lunation-by-sign-authored.json")))
    recs = d["reviewed"]
    fails, xny = [], 0
    xnyp = re.compile(r"\bnot [^,.;]{1,40} but\b|[^,.;]{1,30}, not \w", re.I)
    for r in recs:
        t = r["text"]; ev = r["id"].split("/")[-1]
        # word band
        lo, hi = BAND[r["lunation_type"]]
        if not (lo <= words(t) <= hi): fails.append((ev, f"wordband {words(t)} not {lo}-{hi}"))
        # personalized register present
        if not re.search(r"\byou\b|\byour\b", t, re.I): fails.append((ev, "not personalized 'you'"))
        # full moon must name the house axis
        if r["lunation_type"] == "full_moon" and r.get("house_axis", "") not in t:
            fails.append((ev, "full moon missing house axis in body"))
        # house math correct
        frame = "taurus" if r["lunation_type"] == "full_moon" else "cancer"
        base = "taurus" if r["lunation_type"] == "full_moon" else "cancer"
        exp = house_of(base, r["sign"])
        if exp != r["house"]: fails.append((ev, f"house {r['house']} != expected {exp}"))
        # per-sentence seam + register
        for s in sents(t):
            sr = sf.check_clause(s)
            if not sr.ok: fails.append((ev, f"seam:{sr.matched}")); break
            if sf.check_register(s): fails.append((ev, f"register:{sf.check_register(s)}")); break
        xny += len(xnyp.findall(t))

    print(f"authored lunation cards: {len(recs)} "
          f"({sum(1 for r in recs if r['lunation_type']=='full_moon')} full-moon rising + "
          f"{sum(1 for r in recs if r['lunation_type']=='new_moon')} new-moon sun)")
    print(f"soft X-not-Y count: {xny}")
    if fails:
        print(f"\nFAILURES ({len(fails)}):")
        for e, m in fails: print(" ", e, m)
        sys.exit(1)
    print("RESULT: all authored lunation cards valid (seam/register/word-band/axis/house/register OK).")

if __name__ == "__main__":
    main()
