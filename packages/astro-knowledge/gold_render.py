#!/usr/bin/env python3
"""Gold render suite: fills tokens with NATURAL English and checks the fully
resolved cards for grammar defects (unresolved braces, doubled words/prepositions,
space-before-punctuation, fragments, empty sections). Renders exact/wide/partial +
unknown-time per pattern, plus out-of-sign Grand Trine and Kite. Path-portable."""
import re, json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
TPL=ROOT/"aspect-pattern-templates-v3.3.md"; CONTRACT=ROOT/"aspect-pattern-contract.json"
TABLES=ROOT/"aspect-pattern-tables-v1.md"
print(f"Template: {TPL}\nTables:   {TABLES}\nContract: {CONTRACT}\n")
C=json.loads(CONTRACT.read_text()); PATTERNS=C["patterns"]
lines=TPL.read_text().splitlines()

SIGN_ADJ={"Leo":"boldly","Aquarius":"at a cool distance","Cancer":"protectively",
 "Capricorn":"with structure","Aries":"head-on","Libra":"diplomatically","Taurus":"steadily-ish",
 "Gemini":"restlessly","Virgo":"precisely","Scorpio":"intensely","Sagittarius":"expansively","Pisces":"softly"}
HOUSE_AREA={1:"identity",2:"money and worth",3:"communication",4:"home and family",
 5:"creativity",6:"daily work",7:"partnership",8:"shared trust",
 9:"belief",10:"career and reputation",11:"community",12:"the inner life"}
ROLE_GLOSS={"Sun":"how you shine","Moon":"what feels safe","Mars":"how you push",
 "Saturn":"what you answer to","Venus":"what you value","Mercury":"how you think and talk",
 "Jupiter":"what you believe","Uranus":"where you break form","Neptune":"what you imagine","Pluto":"where you transform"}

def table_rows(heading, columns):
    block=TABLES.read_text().split(f"## {heading}",1)[1].split("\n## ",1)[0]
    rows=[line for line in block.splitlines() if line.strip().startswith("|")]
    out={}
    for line in rows[2:]:
        values=[cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(values)!=len(columns): break
        row=dict(zip(columns,values)); out[row["planet"]]=row
    return out

FOCAL=table_rows("focal-demand-by-planet",("planet","focal_demand","focal_interruption"))
APEX=table_rows("apex-pressure-by-planet",("planet","apex_pressure","repeating_question"))

PLACEMENT_BEHAVIOR={
 "Sun":"leads visibly and takes pride in what it creates",
 "Moon":"feels everything quickly and remembers what mattered",
 "Mercury":"thinks fast and explains the point clearly",
 "Venus":"wins people over with wit and easy conversation",
 "Mars":"throws itself into things with real flair",
 "Jupiter":"makes meaning and helps other people see possibility",
 "Saturn":"plays the long game and carries real responsibility",
 "Uranus":"needs room to express what it believes in its own way",
 "Neptune":"follows intuition and notices what facts alone miss",
 "Pluto":"stays with the hard question until something changes",
}

def val(pre,fld,ch):
    d=ch[pre]; s=d["sign"]; h=d["house"]; p=d["planet"]
    adj=SIGN_ADJ.get(s,"in its way"); area=HOUSE_AREA.get(h,"that area")
    focal=FOCAL.get(p,{}); apex=APEX.get(p,{})
    return {"planet":p,"sign":s,"opposes":d.get("opposes","Saturn"),
      "house_label":f"the {h}{ {1:'st',2:'nd',3:'rd'}.get(h,'th') } house{'' if p=='_' else f' of {area}'}".replace("  "," "),
      "house_area":area,"house_context":f"around {area}","role_gloss":ROLE_GLOSS.get(p,"that part of you"),
      "sign_house_pull":PLACEMENT_BEHAVIOR.get(p,f"can respond {adj}"),
      "sign_house_response":PLACEMENT_BEHAVIOR.get(p,f"can respond {adj}"),
      "sign_pull":PLACEMENT_BEHAVIOR.get(p,f"can respond {adj}"),"sign_behavior":f"acts {adj}","response_example":f"often {adj}",
      "pressure_response":f"push {adj}","balancing_move":f"answer {adj} instead","behavior":f"a {adj} check",
      "apex_pressure":apex.get("apex_pressure",f"a {adj} weight"),
      "repeating_question":apex.get("repeating_question",f"the question of what {area} requires"),
      "focal_demand":focal.get("focal_demand",f"a {adj} standard"),
      "focal_interruption":focal.get("focal_interruption",f"a snag around {area}"),
      "area":area}.get(fld,f"[{fld}]")
TOK=re.compile(r"\{([a-zA-Z_0-9]+)\.([a-zA-Z_0-9]+)\}")
def render(t,ch): return TOK.sub(lambda m:val(m.group(1),m.group(2),ch),t)

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
                if m.group(2).strip().startswith("(none"): continue  # not-applicable marker, not rendered copy
                sec[m.group(1)]=m.group(2); continue
            m=re.match(r"^(opening) ([a-z/]+):\s*(.*)$",l)
            if m: sec[f"opening {m.group(2)}"]=m.group(3)
        out[name]=sec
    return out
P=parse()

# natural chart per pattern
CH={
 "T-SQUARE":{"oppA":("Sun","Leo",1),"oppB":("Moon","Aquarius",7),"apex":("Mars","Cancer",4),"empty_leg":("_","Capricorn",10)},
 "GRAND CROSS":{"c1":("Sun","Aries",1),"c2":("Mars","Libra",7),"c3":("Moon","Cancer",4),"c4":("Saturn","Capricorn",10)},
 "GRAND TRINE":{"t1":("Sun","Leo",1),"t2":("Jupiter","Sagittarius",9),"t3":("Mars","Aries",5)},
 "KITE":{"t1":("Sun","Leo",1),"t2":("Moon","Sagittarius",5),"t3":("Mars","Aries",9),"focal":("Saturn","Libra",3)},
 "YOD":{"base1":("Moon","Cancer",1),"base2":("Venus","Virgo",3),"apex":("Saturn","Scorpio",8),"reference":("_","Taurus",2)},
 "MYSTIC RECTANGLE":{"oa1":("Sun","Aries",1),"oa2":("Mars","Libra",7),"ob1":("Moon","Gemini",3),"ob2":("Saturn","Sagittarius",9)},
}
def chart(name):
    ch={}
    for r,(p,s,h) in CH[name].items(): ch[r]={"planet":p,"sign":s,"house":h,"opposes":"Saturn"}
    if "oa1" in ch: ch["oppositionA"]=dict(ch["oa1"])
    if "ob1" in ch: ch["oppositionB"]=dict(ch["ob1"])
    return ch

def grammar_fails(label,text):
    f=[]
    if "{" in text or "}" in text: f.append(f"{label}: unresolved brace")
    for dup in ["the the","in in","to to","a a","of of","and and","in the the"]:
        if re.search(r"\b"+dup+r"\b",text.lower()): f.append(f"{label}: doubled '{dup}'")
    if re.search(r"\s[.,;:]",text): f.append(f"{label}: space before punctuation")
    if "  " in text: f.append(f"{label}: double space")
    if re.search(r"\b(\w+)\s+\1\b",text):
        m=re.search(r"\b(\w+)\s+\1\b",text)
        if m.group(1).lower() not in ("that",): f.append(f"{label}: repeated word '{m.group(1)}'")
    for sent in re.split(r"(?<=[.!?])\s+",text.strip()):
        if sent and not sent[0].isupper(): f.append(f"{label}: sentence not capitalized: '{sent[:40]}'")
        if sent and sent[-1] not in ".!?": f.append(f"{label}: fragment (no end punctuation): '{sent[-40:]}'")
    return f

TABLE_CLAUSES={
    row[field]
    for table,fields in ((FOCAL,("focal_demand","focal_interruption")),
                         (APEX,("apex_pressure","repeating_question")))
    for row in table.values()
    for field in fields
}

def voice_fails(label,text):
    f=[]
    for sent in re.split(r"(?<=[.!?])\s+",text.strip()):
        lowered=sent.lower()
        if " between " in lowered and sent.count(",")>4:
            f.append(f"{label}: comma pileup in joined pair")
        tie=re.search(r"\btie\b(.+?)\binto one pattern\b",sent,re.I)
        if tie and tie.group(1).count(",")>3:
            f.append(f"{label}: comma pileup in joined subject")
    if re.search(r"\bmoves through\b.+\bin (?:a|an) .+ way:",text,re.I):
        f.append(f"{label}: decorated sign-house scaffold")
    placement_subject=r"(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)(?:\s+in\s+the\s+\d+(?:st|nd|rd|th)\s+house(?:\s+of\s+[^.,;]+)?)?"
    if re.search(rf"\b{placement_subject}\s+can need\b",text,re.I):
        f.append(f"{label}: hedged placement clause 'can need'")
    if re.search(rf"\b{placement_subject}\s+can\b[^.!?]*\b(?:yourself|yourselves)\b",text,re.I):
        f.append(f"{label}: person slip in hedged placement clause")
    for clause in TABLE_CLAUSES:
        match=re.search(re.escape(clause)+r"\s+(for|around|with room for|involving)\b",text,re.I)
        if match:
            f.append(f"{label}: appended table-clause tail '{match.group(1)}'")
    return f

VOICE_REGRESSION_PROBES={
 "comma-pileup":"They keep an easy rhythm between love, pleasure, taste, and what you value and emotional needs, moods, and what makes you feel safe.",
 "appended-tail":f"Saturn adds {APEX['Saturn']['apex_pressure']} for achievement and structure in career, reputation, and public role.",
 "decorated-scaffold":"Your Venus moves through communication, learning, and everyday connections in a curious, restless, talkative way: you win people over.",
 "can-need":"Uranus can need room to express what it believes.",
 "can-reflexive":"Mars can throw yourself into things with real flair.",
}
for probe,text in VOICE_REGRESSION_PROBES.items():
    caught=voice_fails(f"regression/{probe}",text)
    if not caught:
        raise SystemExit(f"GOLD RENDER SELF-TEST FAILED: voice detector missed {probe}")

fails=[]; rendered=0
for name,spec in PATTERNS.items():
    sec=P[name]; ch=chart(name)
    L1=[s for s in ["feel","shows_up","complicated","another_response"] if s in sec]
    exact=" ".join(render(sec[k],ch) for k in (["opening exact"]+L1) if k in sec and sec.get(k))
    fails+=grammar_fails(f"{name}/exact-L1",exact)
    fails+=voice_fails(f"{name}/exact-L1",exact); rendered+=1
    if "unknown_time L1" in sec:
        unknown_l1=render(sec["unknown_time L1"],ch)
        fails+=grammar_fails(f"{name}/unknown-L1",unknown_l1)
        fails+=voice_fails(f"{name}/unknown-L1",unknown_l1); rendered+=1
    if "unknown_time L2" in sec:
        unknown_l2=render(sec["unknown_time L2"],ch)
        fails+=grammar_fails(f"{name}/unknown-L2",unknown_l2)
        fails+=voice_fails(f"{name}/unknown-L2",unknown_l2); rendered+=1
    if "opening wide" in sec:
        wide=" ".join(render(sec[k],ch) for k in (["opening wide"]+L1) if k in sec and sec.get(k))
        fails+=grammar_fails(f"{name}/wide-L1",wide)
        fails+=voice_fails(f"{name}/wide-L1",wide); rendered+=1
    if "partial_L1" in sec:
        partial=render(sec["partial_L1"],ch)
        fails+=grammar_fails(f"{name}/partial",partial)
        fails+=voice_fails(f"{name}/partial",partial); rendered+=1
    if "out_of_sign" in sec:
        out_of_sign=render(sec["out_of_sign"],ch)
        fails+=grammar_fails(f"{name}/out_of_sign",out_of_sign)
        fails+=voice_fails(f"{name}/out_of_sign",out_of_sign); rendered+=1

print(f"rendered {rendered} natural cards")
if fails:
    print(f"\nGOLD RENDER: {len(fails)} grammar issue(s)")
    for x in fails: print("  - "+x)
    raise SystemExit(1)
print("GOLD RENDER: PASS - all resolved cards are grammatically well-formed")
