#!/usr/bin/env python3
"""
simulate_render.py — render a template end-to-end against the real records + resolution map,
so we can SEE whether each surface reads well (not guess). Approximates the runtime resolver:
fact slots from a context dict, flags computed, interpretive slots looked up by (type,category,scope)
with the mapped select op, then fallback. Interpolates mustache {{slot}} and {{#flag}}..{{/flag}}.
"""
import os, re, json
from collections import defaultdict

PB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank")

def load():
    recs = []
    for f in ("cc-vocab","cc-authored-content","cc-fallback-hooks","cc-moon-phase-bank"):
        recs += json.load(open(os.path.join(PB, f+".json")))["reviewed"]
    idx = defaultdict(list)
    for r in recs:
        ss = r["source_snapshot"]; idx[(ss.get("contentType"), ss.get("category"))].append(r)
    tmpl = {t["source_snapshot"]["templateId"]: t
            for t in json.load(open(os.path.join(PB,"cc-slot-templates.json")))["reviewed"]}
    smap = json.load(open(os.path.join(PB,"cc-slot-resolution-map.json")))
    return idx, tmpl, smap

def lookup(idx, typ, cat, scope, op):
    rows = idx.get((typ, cat), [])
    def matches(r):
        s = r["source_snapshot"].get("scope") or {}
        return all(str(s.get(k)).lower() == str(v).lower() for k, v in scope.items())
    hits = [r for r in rows if matches(r)] or ([] if scope else rows)
    if not hits: return None
    body = hits[0]["body"]
    if op == "clause": return body.split(";")[0].strip()
    if op == "one_of": return body
    return body  # text

def resolve_slot(slot, spec, ctx, idx):
    src = spec["source"]; scope = {}
    for k, v in spec["scope_from"].items():
        scope[k] = ctx.get(v[1:]) if isinstance(v, str) and v.startswith("$") else v
    if any(vv is None for vv in scope.values()):
        return None
    val = lookup(idx, src["type"], src["category"], scope, spec["select"])
    if val is None and spec.get("fallback"):
        ft, fc = spec["fallback"].split("/", 1)
        val = lookup(idx, ft, fc, {k: v for k, v in scope.items() if k in ("planet","sign","house","aspect")}, "one_of")
    return val

def render(tid, ctx, idx, tmpl, smap):
    t = tmpl[tid]; body = t["body"]; res = smap["resolution"]; ov = smap["template_overrides"]
    fills = {}
    for slot in t["sections"]["slots"]:
        spec = ov.get(f"{tid}::{slot}") or res.get(slot)
        if not spec: continue
        if spec["kind"] == "fact": fills[slot] = ctx.get(slot, "{"+slot+"}")
        elif spec["kind"] == "interpretive":
            v = resolve_slot(slot, spec, ctx, idx); fills[slot] = v
    # flags: has_X true iff slot X resolved non-empty; is_X from ctx
    def flag(name):
        if name.startswith("has_"): return bool(fills.get(name[4:]))
        return bool(ctx.get(name))
    # conditional sections {{#flag}}..{{/flag}} and {{^flag}}..{{/flag}}
    def cond(m):
        neg, name, inner = m.group(1)=="^", m.group(2), m.group(3)
        return inner if (flag(name) ^ neg) else ""
    out = re.sub(r"\{\{([#^])(\w+)\}\}(.*?)\{\{/\2\}\}", cond, body, flags=re.S)
    out = re.sub(r"\{\{(\w+)\}\}", lambda m: str(fills.get(m.group(1)) or ctx.get(m.group(1)) or ""), out)
    return re.sub(r"[ \t]+\n", "\n", out).strip()

CASES = [
 ("6B",  {"body":"Sun","sign":"Cancer","start_date_display":"Jun 21","end_date_display":"Jul 22"}),
 ("1A",  {"sign":"Cancer","date_display":"Jul 14","editorial_headline":"Today"}),
 ("5A",  {"body":"Mars","sign":"Aries","house_ordinal":"1st"}),
 ("5R",  {"point_a":"Moon","point_b":"Saturn","aspect_name":"square"}),
 ("4E",  {"transiting_point":"Saturn","natal_house_ordinal":"10th","transitStart":"2026","transitEnd":"2028"}),
 ("2A",  {}),
 ("6E",  {"point_a":"Mars","point_b":"Pluto","aspect_name":"square","aspect_verb":"square"}),
]

def main():
    idx, tmpl, smap = load()
    for tid, ctx in CASES:
        print("="*70); print(f"TEMPLATE {tid}  ctx={ctx}"); print("-"*70)
        print(render(tid, ctx, idx, tmpl, smap)); print()

if __name__ == "__main__":
    main()
