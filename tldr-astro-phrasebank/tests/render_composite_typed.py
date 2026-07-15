#!/usr/bin/env python3
"""
render_composite_typed.py — lint + preview the relationship-type-aware composite readings.

Checks each authored (pair, valence, type) cell: no em dashes, no deterministic language,
personalized voice, seam/register clean, and the ROMANTIC-GATING rule — romantic vocabulary
may appear only in the romantic type. Prints a preview of every authored cell across all types.
"""
import os, sys, re
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import composite_typed as ct
import seam_filter as sf

DETERMIN = re.compile(r"\b(will definitely|guaranteed|forces you to|destined|inevitably)\b", re.I)

def sents(t): return [s for s in re.split(r"(?<=[.?]) ", t) if s.strip()]

def check(o):
    f = []
    body = " ".join(o["paragraphs"][:2])  # experience + advice (footer is boilerplate)
    if "—" in body or "–" in body: f.append("em/en dash")
    if DETERMIN.search(body): f.append("deterministic")
    if not re.search(r"\byou\b|\byour\b", body, re.I): f.append("not personalized")
    for s in sents(body):
        r = sf.check_clause(s)
        if not r.ok: f.append(f"seam:{r.matched}"); break
        reg = sf.check_register(s)
        if reg: f.append(f"register:{reg}"); break
    # romantic gating: non-romantic types must not use romantic vocabulary
    if o["relationshipType"] != "romantic":
        low = body.lower()
        hits = [w for w in ct.ROMANTIC_LEX if re.search(r"\b" + re.escape(w) + r"\b", low)]
        if hits: f.append(f"romantic-language in {o['relationshipType']}: {hits}")
    return f

def main():
    fails = []; n = 0
    for pair, vals in ct.LIVED.items():
        a, b = pair.split("-")
        for val, types in vals.items():
            aspect = "square" if val == "friction" else ("conjunction" if val == "fused" else "trine")
            for t in ct.TYPES:
                if t not in types: continue
                n += 1
                o = ct.compose_typed(a, b, aspect, t)
                for m in check(o): fails.append((f"{pair}/{val}/{t}", m))
    print(f"typed composite cells linted: {n}")
    if fails:
        print(f"\nFAILURES ({len(fails)}):")
        for who, m in fails: print(f"  [{who}] {m}")
        sys.exit(1)
    print("RESULT: all typed composite cells valid (dash/determinism/voice/seam/register/romantic-gating OK).")

    # preview the flagship across all seven types
    print("\n" + "=" * 70)
    print("PREVIEW — Composite Moon square Sun, by relationship type")
    print("=" * 70)
    print("\nSHARED MEANING (same for every type):")
    print("  " + ct.meaning("moon-sun", "square"))
    for t in ct.TYPES:
        o = ct.compose_typed("moon", "sun", "square", t)
        print(f"\n--- {o['typeLabel']} ---")
        for p in o["paragraphs"]:
            print("  " + p)

if __name__ == "__main__":
    main()
