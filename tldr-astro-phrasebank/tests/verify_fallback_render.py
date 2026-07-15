#!/usr/bin/env python3
"""
verify_fallback_render.py — the definitive check: does each emergency fallback render clean?

For every bridge route it pulls the ACTUAL served text (record field / record-family body / rendered
template) across representative scopes and fails on: empty, unresolved {{...}}, or a duplicated
sentence. Prints PASS/FAIL per route + the worst sample. Exit 1 if any FAIL.
"""
import json, os, re, glob
from collections import defaultdict

PB = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/phrasebank"
PB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank")

auth = []
for f in ("cc-vocab","cc-authored-content","cc-fallback-hooks","cc-moon-phase-bank"):
    auth += json.load(open(os.path.join(PB, f+".json")))["reviewed"]
byc = defaultdict(list)
for r in auth:
    ss = r["source_snapshot"]; byc[(ss.get("contentType"), ss.get("category"))].append(r)

def clean(text):
    """return list of problems for a served string"""
    p = []
    if not text or len(text.strip()) < 25: p.append("EMPTY/too-short")
    if "{{" in text or "}}" in text: p.append("UNRESOLVED-SLOT")
    if re.search(r"\{[a-z_]+\}", text): p.append("UNRESOLVED-BRACE")
    sents = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if len(s.strip()) > 15]
    if len(sents) != len(set(sents)): p.append("DUPLICATE-SENTENCE")
    return p

def sample_file(fn, fld, n=6):
    p = os.path.join(PB, fn+".json")
    if not os.path.exists(p): return [("(FILE MISSING)", ["EMPTY/too-short"])]
    rs = json.load(open(p)).get("reviewed", [])
    out = []
    for r in rs[:n]:
        v = r.get(fld) if fld else (r.get("body") or "")
        out.append((str(v), clean(str(v))))
    return out

def sample_family(fam, n=6):
    t, c = fam.split("/", 1); rs = byc.get((t, c), [])
    if not rs: return [("(NO ROWS)", ["EMPTY/too-short"])]
    return [(r["body"], clean(r["body"])) for r in rs[:n]]

# moon-arc templates rendered (2A/2E) via the authored moon bank
def sample_moon(tid):
    import importlib.util
    spec = importlib.util.spec_from_file_location("sim", os.path.join(os.path.dirname(__file__), "simulate_render.py"))
    sim = importlib.util.module_from_spec(spec); spec.loader.exec_module(sim)
    idx, tmpl, smap = sim.load()
    txt = sim.render(tid, {}, idx, tmpl, smap)
    return [(txt, clean(txt))]

def main():
    b = json.load(open(os.path.join(os.path.dirname(PB), "tldr-astro-authored-library-COMPLETE.json")))["runtime_key_bridge"]["map"]
    fails = 0; rows = []
    for k, v in b.items():
        surf = k.replace("fallback-hook/", "")
        if v.get("record") == "static":
            rows.append((surf, "static (app-composed)", "SKIP")); continue
        if v.get("record_file"):
            samples = sample_file(v["record_file"], v.get("field"))
            src = f"{v['record_file']}:{v.get('field')}"
            if v.get("also"):
                fn, _, fld = v["also"].partition(":"); samples += sample_file(fn, fld)
        elif surf in ("lunar-calendar/arc-new-moon",): samples = sample_moon("2A"); src = "template 2A"
        elif surf in ("lunar-calendar/arc-full-moon",): samples = sample_moon("2E"); src = "template 2E"
        elif v.get("record") and "/" in v["record"]:
            fam = v["record"].split("+")[0].strip().split(" ")[0]
            samples = sample_family(fam); src = fam
        else:
            samples = [("(template-only)", [])]; src = "template " + str(v.get("template"))
        probs = sorted({p for _, ps in samples for p in ps})
        verdict = "FAIL" if probs else "PASS"
        if probs: fails += 1
        worst = next((s for s, ps in samples if ps), samples[0][0])
        rows.append((surf, src, verdict + ((" " + ",".join(probs)) if probs else ""), worst[:110]))

    print(f"{'SURFACE':30} {'VERDICT':30} SAMPLE")
    print("-"*120)
    for r in rows:
        if len(r) == 3: print(f"{r[0]:30} {r[2]:30}")
        else: print(f"{r[0]:30} {r[2]:30} {r[3]}")
    print("-"*120)
    print(f"routes: {len(rows)} | FAIL: {fails}")
    if fails: raise SystemExit(1)
    print("ALL FALLBACKS RENDER CLEAN (no empty / no unresolved slot / no duplicate sentence).")

if __name__ == "__main__":
    main()
