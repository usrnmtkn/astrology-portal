#!/usr/bin/env python3
"""Contract-driven structural validator for the aspect-pattern spec.
Single source of truth = aspect-pattern-contract.json (read by all gate scripts).
Path-portable; prints resolved input files; fails on any structural violation."""
import re, sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TPL = ROOT / "aspect-pattern-templates-v3.5.md"
TABLES = ROOT / "aspect-pattern-tables-v1.md"
HANDOFF = ROOT / "CODEX-ASPECT-PATTERNS-V3-HANDOFF.md"
CONTRACT = ROOT / "aspect-pattern-contract.json"
print(f"Template: {TPL}\nTables:   {TABLES}\nHandoff:  {HANDOFF}\nContract: {CONTRACT}\n")

C = json.loads(CONTRACT.read_text())
FIELDS = C["fields"]; PREFIX = set(C["allowed_prefixes"]); PATTERNS = C["patterns"]
errors=[]
def err(where,msg,line=""): errors.append(f"[{where}] {msg}" + (f"\n      >> {line.strip()[:150]}" if line else ""))

lines = TPL.read_text().splitlines()

# ---- authored table checks ----
def parse_table(heading, columns):
    text=TABLES.read_text()
    match=re.search(rf"^## {re.escape(heading)}[^\n]*$",text,re.M)
    if not match:
        err("tables",f"required table '{heading}' missing")
        return []
    remaining=text[match.end():].splitlines()
    start=next((i for i,line in enumerate(remaining) if line.strip().startswith("|")),-1)
    if start < 0:
        err("tables",f"table '{heading}' has no rows")
        return []
    raw=[]
    for line in remaining[start:]:
        if not line.strip().startswith("|"): break
        raw.append(line)
    def cells(line): return [cell.strip() for cell in line.strip().strip("|").split("|")]
    if len(raw) < 3:
        err("tables",f"table '{heading}' is incomplete")
        return []
    if cells(raw[0]) != columns:
        err("tables",f"table '{heading}' columns must be {columns}",raw[0])
        return []
    rows=[]
    for line in raw[2:]:
        values=cells(line)
        if len(values) != len(columns):
            err("tables",f"table '{heading}' row has wrong cell count",line)
            continue
        rows.append(dict(zip(columns,values)))
    return rows

def validate_table(heading, columns, expected_planets):
    rows=parse_table(heading,columns)
    planets=[row["planet"] for row in rows]
    if planets != expected_planets:
        err("tables",f"table '{heading}' must contain the locked rows {expected_planets}; got {planets}")
    for row in rows:
        for column in columns[1:]:
            value=row[column].strip()
            where=f"{heading}/{row['planet']}/{column}"
            if not value:
                err(where,"required token value is blank")
                continue
            if "{" in value or "}" in value: err(where,"unresolved token in authored value",value)
            if "—" in value: err(where,"em dash in authored value",value)
            for banned in C["banned_words"]:
                if re.search(r"\b"+re.escape(banned)+r"\b",value,re.I):
                    err(where,f"banned word '{banned}'",value)
            if value.endswith((".","!","?",";",":")):
                err(where,"value must be a sentence fragment without terminal punctuation",value)

validate_table(
    "focal-demand-by-planet",
    ["planet","focal_demand","focal_interruption"],
    C["eligible_primary"],
)
validate_table(
    "pattern-narrative-by-planet",
    [
        "planet",
        "base_contribution",
        "lived_title",
        "lived_need",
        "incomplete_first_answer",
        "returning_lived_example",
    ],
    C["eligible_primary"],
)
validate_table(
    "background-anchor-by-planet",
    ["planet", "background_anchor"],
    ["Uranus", "Neptune", "Pluto"],
)

# ---- parse patterns -> section key -> text (+ level) ----
def parse():
    idx={}
    for i,l in enumerate(lines):
        m=re.match(r"## ([A-Z].*)$",l)
        if m and m.group(1).strip() in PATTERNS: idx[m.group(1).strip()]=i
    order=sorted(idx.items(),key=lambda x:x[1]); out={}
    for n,(name,st) in enumerate(order):
        end=order[n+1][1] if n+1<len(order) else len(lines)
        blk=lines[st:end]; sec={}; lvl=None
        for l in blk:
            if l.startswith("### Level 1"): lvl="L1"; continue
            if l.startswith("### Level 2"): lvl="L2"; continue
            if l.startswith("### Partial"): lvl="Partial"; continue
            if lvl=="Partial":
                m=re.match(r"^(L[12]):\s*(.*)$",l)
                if m: sec[f"partial_{m.group(1)}"]=(lvl,m.group(2))
                continue
            m=re.match(r"^(unknown_time L[12]):\s*(.*)$",l)
            if m: sec[m.group(1)]=(lvl,m.group(2)); continue
            m=re.match(r"^OVERRIDE (out_of_sign)[^:]*:\s*(.*)$",l)
            if m: sec["OVERRIDE out_of_sign"]=(lvl,m.group(2)); continue
            m=re.match(r"^([a-z_]+)(?:\s*\([^)]*\))?:\s*(.*)$",l)
            if m and m.group(1) in ("feel","shows_up","complicated","another_response","how_it_works","planet_roles","watch_for","reference_point"):
                sec[m.group(1)]=(lvl,m.group(2)); continue
            m=re.match(r"^(title|opening) ([a-z/]+):\s*(.*)$",l)
            if m: sec[f"{lvl}:{m.group(1)} {m.group(2)}"]=(lvl,m.group(3)); continue
        out[name]=(blk,sec)
    return out
P=parse()

# ---- registry drift: template TOKEN REGISTRY field names must equal contract fields ----
reg_fields=set()
inreg=False
for l in lines:
    if "TOKEN REGISTRY" in l: inreg=True; continue
    if inreg and l.startswith("## "): break
    m=re.match(r"^\s{2}([a-z_]+)\s*\|",l)
    if inreg and m: reg_fields.add(m.group(1))
missing_from_reg=set(FIELDS)-reg_fields
extra_in_reg=reg_fields-set(FIELDS)
if missing_from_reg: err("template",f"registry doc missing fields vs contract: {sorted(missing_from_reg)}")
if extra_in_reg: err("template",f"registry doc has fields not in contract: {sorted(extra_in_reg)}")

# ---- global checks ----
if "—" in TPL.read_text(): err("template","em dash present")
if not lines[0].lower().startswith("# aspect pattern templates v3.5"): err("template","header not canonical v3.5",lines[0])
for a in C["banned_aliases"]:
    for l in lines:
        if re.search(r"\{"+re.escape(a)+r"[.}]",l): err("template",f"banned alias {{{a}}}",l)

# ---- bidirectional token check ----
used=set()
for name,(blk,sec) in P.items():
    for pre,fld in re.findall(r"\{([a-zA-Z_0-9]+)\.([a-zA-Z_0-9]+)\}","\n".join(blk)):
        used.add((pre,fld))
        if pre not in PREFIX: err(name,f"token prefix '{pre}' not in namespace",f"{{{pre}.{fld}}}")
        if fld not in FIELDS: err(name,f"token field '{fld}' not registered",f"{{{pre}.{fld}}}")
used_fields={f for _,f in used}
declared=set(FIELDS)
unused=declared-used_fields-set(C["reserved_tokens"])
if unused: err("contract",f"registered fields never used (declared-but-unused): {sorted(unused)}")

# Member-intro sign needs must be composed by the resolver. A direct scaffold
# misattributes sign-only language to the named planet and is especially wrong
# for generation-level outer-planet placements.
for line in lines:
    for match in re.finditer(r"\byou need \{([a-zA-Z_0-9]+)\.sign_need\}", line, re.I):
        if match.group(1) not in {"apex", "focal"}:
            err("template",f"direct sign-need scaffold targets non-apex/non-focal role '{match.group(1)}'",line)

# ---- per-pattern: sections present, required-by-section, geometry-at-L2, unknown-time ----
GEOM=re.compile(r"\b(apex|empty leg|opposition|quincunx|sextile|trine by degree)\b",re.I)
COND_STEADY=re.compile(r"\bstead(y|ies|iness|ier)\b",re.I)
for name,spec in PATTERNS.items():
    blk,sec=P[name]
    # required sections exist
    for lvl,secs in spec["sections"].items():
        for s in secs:
            if s not in sec: err(name,f"required section '{s}' ({lvl}) missing")
            elif not sec[s][1].strip(): err(name,f"required section '{s}' is empty")
    # confidence branches + unknown-time bodies
    txt="\n".join(blk)
    for need in ["title wide:","opening wide:"]:
        if need not in txt: err(name,f"missing confidence branch: {need}")
    if "**Possible " not in txt: err(name,"partial title missing")
    if "unknown_time L1" not in sec: err(name,"unknown_time L1 body missing")
    if "unknown_time L2" not in sec: err(name,"unknown_time L2 body missing")
    for ov in spec["overrides"]:
        if ov=="out_of_sign" and "OVERRIDE out_of_sign" not in sec: err(name,"required OVERRIDE out_of_sign missing")
    # required tokens by EXACT section
    for s,toks in spec["required_by_section"].items():
        stext=sec.get(s,(None,""))[1]
        for t in toks:
            if "{"+t+"}" not in stext: err(name,f"required token {{{t}}} not in section '{s}'")
    # geometry terms only at L2 (check L1 body sections)
    for s in ["feel","shows_up","complicated","another_response"]:
        if s in sec:
            bare=re.sub(r"\{[^}]+\}"," ",sec[s][1])
            if GEOM.search(bare): err(name,f"geometry term in L1 section '{s}'",sec[s][1])
    # unknown-time: sign-resolved + no houses, both levels
    for u in ["unknown_time L1","unknown_time L2"]:
        if u in sec:
            t=sec[u][1]
            if not any(f".{sf}}}" in t for sf,fl in FIELDS.items() if fl["sign"]):
                err(name,f"{u} is sign-blind")
            if re.search(r"\.house_label\}|\.house_area\}|\.house_context\}",t):
                err(name,f"{u} references a HOUSE token (forbidden)")
    # banned words / steady / things / ask across body prose
    for s,(lvl,t) in sec.items():
        bare=re.sub(r"\{[^}]+\}"," ",t); low=bare.lower()
        for bw in C["banned_words"]:
            if re.search(r"\b"+re.escape(bw)+r"\b",low): err(name,f"banned word '{bw}' in {s}",t)
        if COND_STEADY.search(bare) and not re.search(r"(stable|strong|solid)[^.]*stead",low): err(name,f"conditional steady in {s}",t)
        if re.search(r"\bthings\b",low): err(name,f"vague 'things' in {s}",t)
        if re.search(r"\b(asks|asking)\b",low): err(name,f"ask/asking agency in {s}",t)

# ---- handoff checks ----
h=HANDOFF.read_text()
if "v3.5.md" not in h: err("handoff","does not name v3.5 canonical")
if "= 10 bodies" not in h: err("handoff","not locked to 10 primary bodies")
if re.search(r"=\s*11\b|11 rows each",h): err("handoff","stale 11-count")
if "—" in h: err("handoff","em dash")
for a in C["banned_aliases"]:
    if re.search(r"\{"+re.escape(a)+r"[.}]",h): err("handoff",f"banned alias {{{a}}}")
for rule in C["handoff_required_rules"]:
    if rule not in h: err("handoff",f"required rule/text missing: '{rule}'")

if errors:
    print(f"VALIDATOR: {len(errors)} error(s)\n")
    for e in errors: print(" - "+e)
    sys.exit(1)
print("VALIDATOR: PASS (0 errors)")
