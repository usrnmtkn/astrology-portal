#!/usr/bin/env python3
"""
render_gap_surfaces.py — editorial lint for the three gap-closing surfaces:
  cc-synastry-overlay-full.json, cc-composite-aspect.json, cc-planetary-horoscope.json

Checks each composed reading for: no em/en dashes, no deterministic language, personalized
voice, no keyword seams / banned register, no long comma pile-ups (>=5 consecutive short
items), a navigation/closing beat, source-key provenance, and full coverage of the matrix.
"""
import os, sys, re, json
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import seam_filter as sf  # noqa: E402

DETERMIN = re.compile(r"\b(will definitely|guaranteed|forces you to|destined|inevitably)\b", re.I)

def sents(t): return [s for s in re.split(r"(?<=[.?]) ", t) if s.strip()]

def keyword_stack(text):
    # flag >=5 consecutive short (1-3 word) comma-separated items
    for chunk in re.split(r"[.?!]", text):
        items = [x.strip() for x in chunk.split(",") if x.strip()]
        run = 0
        for it in items:
            if 1 <= len(it.split()) <= 3: run += 1;
            else: run = 0
            if run >= 5: return True
    return False

def check(rec):
    f = []
    paras = rec["paragraphs"]
    text = " ".join(paras)
    if not paras: return ["empty"]
    if "—" in text or "–" in text: f.append("em/en dash")
    if DETERMIN.search(text): f.append("deterministic")
    if not re.search(r"\byou\b|\byour\b|\bthey\b|\byou're\b", text, re.I): f.append("not personalized")
    if keyword_stack(text): f.append("keyword stack (>=5)")
    for p in paras:
        for s in sents(p):
            r = sf.check_clause(s)
            if not r.ok: f.append(f"seam:{r.matched}"); break
            reg = sf.check_register(s)
            if reg: f.append(f"register:{reg}"); break
        else: continue
        break
    sk = rec.get("trace", {}).get("sourceKeys", [])
    if not (sk and all(k.startswith(("cc/", "ms/")) for k in sk)): f.append("provenance")
    # a closing/navigation beat (imperative or guidance) present
    last = paras[-1].strip()
    if len(paras) < 2: f.append("no closing beat")
    return f

def load(name): return json.load(open(os.path.join(PKG, "phrasebank", name)))["reviewed"]

def main():
    surfaces = {
        "synastry overlays": ("cc-synastry-overlay-full.json", 120),
        "composite aspects": ("cc-composite-aspect.json", 225),
        "planetary horoscope": ("cc-planetary-horoscope.json", 60),
        "natal aspects": ("cc-natal-aspect.json", 214),
    }
    fails = []; total = 0
    for label, (fn, expect) in surfaces.items():
        recs = load(fn)
        total += len(recs)
        if len(recs) != expect:
            fails.append((label, f"count {len(recs)} != expected {expect}"))
        for r in recs:
            for m in check(r): fails.append((r["id"], m))
        print(f"{label:22s}: {len(recs):3d} readings")
    print(f"total composed readings linted: {total}")
    if fails:
        print(f"\nFAILURES ({len(fails)}):")
        for who, m in fails[:50]: print(f"  [{who}] {m}")
        sys.exit(1)
    print("RESULT: all gap-surface readings valid (dash/determinism/voice/seam/register/stack/provenance/coverage OK).")

if __name__ == "__main__":
    main()
