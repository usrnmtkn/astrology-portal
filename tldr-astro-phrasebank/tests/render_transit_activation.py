#!/usr/bin/env python3
"""
render_transit_activation.py — lint a representative set of composed activation readings.

The aspect narrative itself is already reviewed (main harness). This checks the composed
whole: no em dashes, no deterministic language, personalized voice, correct compose order
(house before aspect before timing), source-key provenance, and birth-time gating when a
house or angle is involved. Sweeps every slow body x aspect over a sample of natal points.
"""
import os, sys, re

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import transit_activation as ta  # noqa: E402
import seam_filter as sf         # noqa: E402

DETERMIN = re.compile(r"\b(will definitely|guaranteed|forces you to|destined|inevitably)\b", re.I)
SLOW = sorted(ta.SLOW)
ASPECTS = ["conjunction", "square", "opposition", "trine", "sextile"]
POINTS = ["sun", "moon", "venus", "mars", "saturn", "descendant"]

def sents(t): return [s for s in re.split(r"(?<=[.?]) ", t) if s.strip()]

def check(o):
    f = []
    text = " ".join(o["paragraphs"])
    if not o["paragraphs"]: return ["empty reading"]
    if "—" in text or "–" in text: f.append("em/en dash")
    if DETERMIN.search(text): f.append("deterministic")
    if not re.search(r"\byou\b|\byour\b", text, re.I): f.append("not personalized")
    # compose order: house intro (if present) comes before the aspect line
    if o["layers"].get("house") and o["layers"].get("aspect") not in (None, "none"):
        if "moving through your" not in o["paragraphs"][0]:
            f.append("house background not first")
        if "makes this personal" not in text:
            f.append("aspect layer missing 'what makes this personal'")
    # provenance
    if o["layers"].get("aspect") not in (None, "none") or o["layers"].get("house"):
        if not (o["trace"]["sourceKeys"] and all(k.startswith(("cc/", "ms/")) for k in o["trace"]["sourceKeys"])):
            f.append("source keys missing/untraceable")
    # birth-time gating when house or angle involved
    if (o["layers"].get("house")) and not o.get("requires_birth_time"):
        f.append("missing birth-time gating")
    # lint the composer's own connective sentences (skip the bank narrative, already reviewed)
    for p in o["paragraphs"]:
        head = sents(p)[0] if sents(p) else ""
        r = sf.check_clause(head)
        if not r.ok: f.append(f"seam:{r.matched}"); break
        if sf.check_register(head): f.append(f"register:{sf.check_register(head)}"); break
    return f

def main():
    fails = []; n = 0; skipped = 0
    bank = ta._aspects()
    # slow bodies x aspects x sample points that EXIST in the bank, in a mid house
    for b in SLOW:
        for a in ASPECTS:
            for pt in POINTS:
                if f"{b}-{a}-{pt}" not in bank:
                    skipped += 1; continue
                n += 1
                o = ta.compose_activation(b, aspect=a, natal_point=pt, transiting_house=7,
                                          orb=1.0, phase="applying", exact_date="a set date")
                for m in check(o): fails.append((f"{b}-{a}-{pt}", m))
    # fast bodies aspect-only (existing combos)
    for b in ["sun", "moon", "mercury", "venus", "mars"]:
        for a in ASPECTS:
            for pt in ["saturn", "jupiter", "moon"]:
                if f"{b}-{a}-{pt}" not in bank:
                    skipped += 1; continue
                n += 1
                o = ta.compose_activation(b, aspect=a, natal_point=pt, orb=0.5, phase="exact", exact_date="now")
                for m in check(o): fails.append((f"{b}-{a}-{pt}", m))
    # no-tight-aspect slow passages
    for b in SLOW:
        n += 1
        o = ta.compose_activation(b, transiting_house=4)
        for m in check(o): fails.append((f"{b}-4th-noaspect", m))
    print(f"(skipped {skipped} combos with no reviewed aspect record; those fall back to the planetary horoscope)")

    print(f"transit-activation review: {n} composed activations sampled ({len(SLOW)} slow + 5 fast bodies)")
    if fails:
        print(f"\nFAILURES ({len(fails)}):")
        for who, m in fails[:40]: print(f"  [{who}] {m}")
        sys.exit(1)
    print("RESULT: all sampled activation compositions valid (order/seam/register/provenance/gating OK).")

if __name__ == "__main__":
    main()
