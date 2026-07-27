#!/usr/bin/env python3
"""Structural render matrix: per-role label-blind (sign) + house-blind audits on
every surface (known L1/L2, unknown L1/L2), plus confidence-branch structural checks.
Path-portable; reads the shared contract; prints resolved inputs."""
import re, json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
TPL=ROOT/"aspect-pattern-templates-v3.3.md"; CONTRACT=ROOT/"aspect-pattern-contract.json"
print(f"Template: {TPL}\nContract: {CONTRACT}\n")
C=json.loads(CONTRACT.read_text()); FIELDS=C["fields"]; PATTERNS=C["patterns"]
SIGN_FIELDS={f for f,fl in FIELDS.items() if fl["sign"]}
HOUSE_FIELDS={f for f,fl in FIELDS.items() if fl["house"]}
lines=TPL.read_text().splitlines()

SIGNBEH={"Cancer":"guards-and-withdraws","Capricorn":"takes-charge-and-structures"}
HOUSEBEH={4:"around-home-base",10:"around-public-standing"}
ROLE={"Sun":"identity","Moon":"needs","Mars":"drive","Saturn":"limits","Venus":"values",
 "Mercury":"thinking","Jupiter":"belief","Uranus":"disruption","Neptune":"imagination","Pluto":"power"}
def val(pre,fld,ch):
    d=ch[pre]; s=d["sign"]; h=d["house"]; p=d["planet"]
    return {"planet":p,"sign":s,"opposes":d.get("opposes","Saturn"),
      "house_label":f"the {h}th house","house_area":f"HA-{HOUSEBEH[h]}","house_context":f"HC-{HOUSEBEH[h]}",
      "role_gloss":f"RG-{ROLE.get(p,'x')}",
      "sign_house_pull":f"{SIGNBEH[s]}-{HOUSEBEH[h]}","sign_house_response":f"{SIGNBEH[s]}-{HOUSEBEH[h]}",
      "sign_pull":SIGNBEH[s],"sign_behavior":SIGNBEH[s],"response_example":SIGNBEH[s],
      "pressure_response":SIGNBEH[s],"balancing_move":SIGNBEH[s],"behavior":SIGNBEH[s],
      "apex_pressure":f"{SIGNBEH[s]}-{HOUSEBEH[h]}-c","repeating_question":f"{SIGNBEH[s]}-{HOUSEBEH[h]}-q",
      "focal_demand":f"{SIGNBEH[s]}-{HOUSEBEH[h]}-d","focal_interruption":f"{SIGNBEH[s]}-{HOUSEBEH[h]}-i",
      "area":f"opparea-{HOUSEBEH[h]}"}.get(fld,f"?{fld}?")
TOK=re.compile(r"\{([a-zA-Z_0-9]+)\.([a-zA-Z_0-9]+)\}")
def render(t,ch): return TOK.sub(lambda m: val(m.group(1),m.group(2),ch),t)

# parse sections
def parse():
    idx={}
    for i,l in enumerate(lines):
        m=re.match(r"## ([A-Z].*)$",l)
        if m and m.group(1).strip() in PATTERNS: idx[m.group(1).strip()]=i
    order=sorted(idx.items(),key=lambda x:x[1]); out={}
    for n,(name,st) in enumerate(order):
        end=order[n+1][1] if n+1<len(order) else len(lines); blk=lines[st:end]; sec={}; lvl=None
        for l in blk:
            if l.startswith("### Level 1"): lvl="L1"; continue
            if l.startswith("### Level 2"): lvl="L2"; continue
            if l.startswith("### Partial"): lvl="Partial"; continue
            if lvl=="Partial":
                m=re.match(r"^(L[12]):\s*(.*)$",l)
                if m: sec[f"partial_{m.group(1)}"]=m.group(2)
                continue
            m=re.match(r"^(unknown_time L[12]):\s*(.*)$",l)
            if m: sec[m.group(1)]=m.group(2); continue
            m=re.match(r"^OVERRIDE (out_of_sign)[^:]*:\s*(.*)$",l)
            if m: sec["out_of_sign"]=m.group(2); continue
            m=re.match(r"^([a-z_]+)(?:\s*\([^)]*\))?:\s*(.*)$",l)
            if m and m.group(1) in ("feel","shows_up","complicated","another_response","how_it_works","planet_roles","watch_for","reference_point"):
                sec[m.group(1)]=m.group(2); continue
            m=re.match(r"^(opening) ([a-z/]+):\s*(.*)$",l)
            if m: sec[f"opening {m.group(2)}"]=m.group(3)
        out[name]=sec
    return out
P=parse()

def base_chart(roles):
    ch={}
    for i,r in enumerate(roles):
        ch[r]={"planet":list(ROLE)[i%len(ROLE)],"sign":"Cancer","house":4,"opposes":"Saturn"}
    if "oa1" in ch: ch["oppositionA"]=dict(ch["oa1"])
    if "ob1" in ch: ch["oppositionB"]=dict(ch["ob1"])
    return ch
def flip(ch,role,key,newv):
    ch2={k:dict(v) for k,v in ch.items()}; ch2[role][key]=newv
    if role in("oa1","oa2"): ch2["oppositionA"]=dict(ch2["oa1"])
    if role in("ob1","ob2"): ch2["oppositionB"]=dict(ch2["ob1"])
    return ch2
def strip_houses(t): return re.sub(r"\d+th house","the house",t)

SURF={"known_L1":["feel","shows_up","complicated","another_response"],
      "known_L2":["how_it_works","planet_roles","watch_for","reference_point"],
      "unknown_L1":["unknown_time L1"],"unknown_L2":["unknown_time L2"]}
fails=[]; rows=0
for name,spec in PATTERNS.items():
    sec=P[name]; roles=spec["roles"]; ch=base_chart(roles)
    for surf,keys in SURF.items():
        text="\n".join(sec[k] for k in keys if k in sec and sec[k])
        if not text: continue
        for r in roles+["oppositionA","oppositionB"]:
            if r not in ch: continue
            # only audit a role on a surface if a sign token for it appears there
            has_sign=any(f"{{{r}.{sf}}}" in text for sf in SIGN_FIELDS)
            if has_sign:
                a=render(text,ch); b=render(text,flip(ch,r,"sign","Capricorn"))
                rows+=1
                if a==b: fails.append(f"{name}/{surf}: SIGN change on {r} does not alter body")
            # house audit only on known surfaces
            if surf.startswith("known"):
                has_house=any(f"{{{r}.{hf}}}" in text for hf in HOUSE_FIELDS)
                if has_house:
                    a=strip_houses(render(text,ch)); b=strip_houses(render(text,flip(ch,r,"house",10)))
                    rows+=1
                    if a==b: fails.append(f"{name}/{surf}: HOUSE change on {r} does not alter body")
    # confidence structural checks
    if "opening strong" in sec: fails.append(f"{name}: has a separate 'opening strong' (strong must reuse exact verbatim)")
    if "opening wide" not in sec: fails.append(f"{name}: missing wide opening")
    # partial must be ABBREVIATED: it may reference a resolved clause, but must not
    # reproduce the FULL canonical feel section (all of its required tokens).
    ptext=(sec.get("partial_L1") or "")+" "+(sec.get("partial_L2") or "")
    feel_req=spec["required_by_section"].get("feel",[])
    if len(feel_req)>1 and all("{"+t+"}" in ptext for t in feel_req):
        fails.append(f"{name}: partial body reproduces the entire canonical feel section")
    # overrides render without unresolved braces
    for ov in spec["overrides"]:
        if ov=="out_of_sign":
            if "out_of_sign" not in sec: fails.append(f"{name}: out_of_sign override missing")
            else:
                r=render(sec["out_of_sign"],base_chart(roles))
                if "{" in r: fails.append(f"{name}: out_of_sign override has unresolved token")

print(f"ran {rows} sign/house audits across 6 patterns x 4 surfaces")
if fails:
    print(f"\nRENDER MATRIX: {len(fails)} failure(s)")
    for f in fails: print("  - "+f)
    raise SystemExit(1)
print("RENDER MATRIX: PASS - every sign-bearing role changes the body on every surface; confidence branches structurally sound")
