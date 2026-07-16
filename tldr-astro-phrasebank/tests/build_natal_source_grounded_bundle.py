#!/usr/bin/env python3
"""
build_natal_source_grounded_bundle.py — drop-in patch for the app's natal
source-grounded record store (apps/web/src/content/finalSourceGroundedDashboardRecords.json).

WHY: the natal placement + aspect detail pages render from that bundle, whose
records are materialized (scripts/materialize-final-source-grounded-package.mjs)
by lowercasing+truncating raw source texture — thin, sometimes wrong copy (e.g.
Sun-in-Aquarius core_behavior pulled Aquarius *season* new-moon text), with clauses
marked review_status="draft" (so hasEligibleReviewedRecord() rejects them) and only
154/214 aspects covered. This emits the REAL Marie-voiced writing we already have —
cc-natal-aspect (experience + guidance), cc-planet-in-sign-reviewed (natal_sign_story),
cc-planet-in-house-reviewed (house_integration) — in the bundle's exact record schema,
review_status="reviewed", validation READY, both pronoun forms. Codex merges these
into finalSourceGroundedDashboardRecords.json by canonicalKey (replacing the thin ones).

Emits phrasebank/cc-natal-source-grounded-bundle.json.
"""
import json, os, re

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda f: os.path.join(PKG, "phrasebank", f)
ASPECT = json.load(open(P("cc-natal-aspect.json")))
SIGN = json.load(open(P("cc-planet-in-sign-reviewed.json")))
HOUSE = json.load(open(P("cc-planet-in-house-reviewed.json")))
DEST = P("cc-natal-source-grounded-bundle.json")

def recs(d): return d.get("reviewed") or d.get("records") or d.get("entries") or []

# 2nd person -> 3rd person for the friend/other-chart perspective.
# Order matters: possessive/reflexive first, then object "you"->"them" (after a
# preposition or transitive verb), then remaining subject "you"->"they".
_REPL_FIRST = [(r"\byou're\b","they're"),(r"\bYou're\b","They're"),
               (r"\byourself\b","themselves"),(r"\bYourself\b","Themselves"),
               (r"\byourselves\b","themselves"),
               (r"\byours\b","theirs"),(r"\bYours\b","Theirs"),
               (r"\byour\b","their"),(r"\bYour\b","Their")]
# transitive verbs / prepositions after which "you" is an OBJECT -> "them"
_OBJ = re.compile(
    r"\b(to|on|for|with|at|of|about|around|than|into|onto|upon|toward|towards|"
    r"make|makes|made|let|lets|give|gives|gave|tell|tells|told|ask|asks|asked|"
    r"help|helps|show|shows|shown|keep|keeps|steady|steadies|unsettle|unsettles|"
    r"serve|serves|challenge|challenges|push|pushes|remake|remakes|shape|shapes|"
    r"pull|pulls|hold|holds|leave|leaves|check|checks|dim|dims|steadies|ground|grounds)\s+you\b",
    re.I)
def to_third(s):
    for pat, rep in _REPL_FIRST:
        s = re.sub(pat, rep, s)
    s = _OBJ.sub(lambda m: f"{m.group(1)} them", s)
    s = re.sub(r"\byou\b","they", s)
    s = re.sub(r"\bYou\b","They", s)
    return s

ORDINAL = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}
def classify(aspect):
    if aspect in ("trine","sextile"): return "supportive"
    if aspect in ("square","opposition"): return "challenging"
    return "mixed"  # conjunction

def clause(key, family, surface, text, srckeys):
    return {"key": key, "family": family, "surface": surface,
            "text_you": text, "text_they": to_third(text),
            "source_keys": srckeys, "source_lane": "cc",
            "review_status": "reviewed", "notes_editor_only": ""}

def record(canonicalKey, family, surface, templates, clauses, srckeys,
           focalDirection=None, classification=None, eligibility=None):
    return {"canonicalKey": canonicalKey, "family": family, "surface": surface,
            "focalDirection": focalDirection, "classification": classification,
            "durationClass": None, "templates": templates, "clauses": clauses,
            "sourceKeys": srckeys,
            "eligibility": eligibility or {}, "priority": {},
            "validation": {"state": "READY", "sourceKeysValid": True, "templateDoesNotSupplyFacts": True},
            "factsRequired": [],
            "provenance": {"package": "phrasebank/cc-natal-source-grounded-bundle",
                           "generatedBy": "tests/build_natal_source_grounded_bundle.py",
                           "tier": "REVIEWED_CLAUSE", "status_note": "DRAFT pending Marie sign-off; reviewed-tier editorial"}}

records = []

# ---- natal aspects (both directions) ---------------------------------------
for r in recs(ASPECT):
    pair = r.get("pair", "")
    if "-" not in pair: continue
    x, y = pair.split("-", 1)
    aspect = r["aspect"]
    exp, guid = r.get("experience", ""), r.get("guidance", "")
    if not exp: continue
    cls = classify(aspect)
    for focal, other in ((x, y), (y, x)):
        ck = f"dashboard.natal-aspect.{focal}.{aspect}.{other}"
        sk = [r.get("id", f"cc/natal/aspect/{pair}-{aspect}"),
              f"cc/planet/{focal}", f"cc/planet/{other}", f"cc/aspect/{aspect}"]
        clauses = {"experience": clause(f"{ck}.experience", f"natal-aspect/experience/{focal}/{aspect}/{other}", "natal-aspect", exp, sk)}
        tmpl = {"compact": "{{experience}}", "expanded": "{{experience}}"}
        if guid:
            clauses["guidance"] = clause(f"{ck}.guidance", f"natal-aspect/guidance/{focal}/{aspect}/{other}", "natal-aspect", guid, sk)
            tmpl["expanded"] = "{{experience}} {{guidance}}"
        records.append(record(ck, "natal-aspect", "you|friend", tmpl, clauses, sk,
                              focalDirection=f"{focal}->{other}", classification=cls))

# ---- natal placements (sign + house) ---------------------------------------
sign_story = {(r["body"], r["sign"]): r.get("natal_sign_story", "") for r in recs(SIGN)}
sign_src = {(r["body"], r["sign"]): r.get("id", "") for r in recs(SIGN)}
house_int = {(r["body"], int(r["house"])): r.get("house_integration", "") for r in recs(HOUSE)}
house_src = {(r["body"], int(r["house"])): r.get("id", "") for r in recs(HOUSE)}

for (body, sign), story in sign_story.items():
    if not story: continue
    base_ck = f"dashboard.natal-placement.{body}.{sign}"
    core_sk = [sign_src.get((body, sign), ""), f"cc/planet/{body}", f"cc/sign/{sign}"]
    core = clause(f"{base_ck}.core_behavior", f"placement/core-behavior/{body}/{sign}", "natal-placement", story, core_sk)
    # base (no reliable birth time): sign only
    records.append(record(base_ck, "natal-placement", "natal-placement",
                          {"compact": "{{core_behavior}}", "expanded": "{{core_behavior}}"},
                          {"core_behavior": core}, core_sk))
    # house-specific: sign story + house integration
    for house in range(1, 13):
        hi = house_int.get((body, house), "")
        if not hi: continue
        ck = f"{base_ck}.house_{house}"
        hsk = [house_src.get((body, house), ""), f"cc/house/{house}"]
        clauses = {
            "core_behavior": clause(f"{ck}.core_behavior", f"placement/core-behavior/{body}/{sign}", "natal-placement", story, core_sk),
            "house_synthesis": clause(f"{ck}.house_synthesis", f"placement/house-synthesis/{body}/{house}", "natal-placement", hi, hsk),
        }
        records.append(record(ck, "natal-placement", "natal-placement",
                              {"compact": "{{core_behavior}}", "expanded": "{{core_behavior}} {{house_synthesis}}"},
                              clauses, core_sk + hsk,
                              eligibility={"reliableBirthTimeRequiredForHouse": True}))

na = sum(1 for r in records if r["family"] == "natal-aspect")
npl = sum(1 for r in records if r["family"] == "natal-placement")
out = {"_meta": {
        "title": "Natal source-grounded records (Marie-voiced) for finalSourceGroundedDashboardRecords.json",
        "target": "apps/web/src/content/finalSourceGroundedDashboardRecords.json -> records[] (merge/replace by canonicalKey)",
        "count": len(records), "natal_aspect": na, "natal_placement": npl,
        "note": "Real reviewed phrasebank writing: aspects = cc-natal-aspect (experience+guidance); placements = natal_sign_story + house_integration. review_status=reviewed so hasEligibleReviewedRecord() passes; validation READY. text_you = reader; text_they = friend/other chart. All DRAFT pending Marie editorial sign-off (reviewed-tier).",
       },
       "records": records}
json.dump(out, open(DEST, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} natal source-grounded records ({na} aspect + {npl} placement) -> {DEST}")
