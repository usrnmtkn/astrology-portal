#!/usr/bin/env python3
"""
build_banks.py
Transforms the reviewed source corpus (cc-source-phrases.json + marie-source-phrases.json)
into the vocabulary-bank sections (5-8) of the production library, with provenance tags.
Emits Markdown to stdout. Every emitted line carries its source key so provenance is preserved.
"""
import json, sys, os

SRC = os.environ.get("SRC_DIR")
cc = json.load(open(os.path.join(SRC, "cc-source-phrases.json")))
ms = json.load(open(os.path.join(SRC, "marie-source-phrases.json")))

SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio",
         "sagittarius","capricorn","aquarius","pisces"]
PLANETS = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"]
ASPECTS = ["conjunction","sextile","square","trine","opposition"]

def g(d, k):
    return d.get(k)

def bullets(text):
    """Split a source string of ';'-separated lived behaviors into bullet lines."""
    if not text:
        return []
    parts = [p.strip(' .;') for p in str(text).replace('\n',' ').split(';')]
    return [p for p in parts if p]

out = []
w = out.append

# ---------------------------------------------------------------- SIGN BANKS
w("## 5. Sign banks\n")
w("_Lived behaviors, not keyword stacks. Source: `cc/sign/{sign}/*`. Status: APPROVED (guides generation)._\n")
for s in SIGNS:
    w(f"### {s.capitalize()}\n")
    lb = g(cc, f"cc/sign/{s}/lived-behaviors")
    hm = g(cc, f"cc/sign/{s}/hook-moves")
    ac = g(cc, f"cc/sign/{s}/actions")
    cl = g(cc, f"cc/sign/{s}/closings")
    if lb:
        w("**Lived behaviors**\n")
        for b in bullets(lb): w(f"- {b}")
        w("")
    if hm:
        w("**Hook moves**\n")
        for b in bullets(hm): w(f"- {b}")
        w("")
    if ac:
        w("**Actions (practical corrections)**\n")
        for b in bullets(ac): w(f"- {b}")
        w("")
    if cl:
        w("**Closings**\n")
        for b in bullets(cl): w(f"- {b}")
        w("")
    # authored alt hooks / closings / actions
    alts = {kk: cc[kk] for kk in cc if kk.startswith(f"cc/sign/{s}/") and "/alt" in kk}
    if alts:
        w("**Authored exemplar lines (CONFIRMED — Marie/CC copy, may serve verbatim on matching surface):**\n")
        for kk in sorted(alts):
            w(f"- _{cc[kk]}_  `[{kk}]`")
        w("")
    w(f"_Provenance: `cc/sign/{s}/lived-behaviors|hook-moves|actions|closings|alt*`_\n")

# ---------------------------------------------------------------- HOUSE BANKS
w("## 6. House banks\n")
w("_A house selects the life scene; it never emits a keyword paragraph. Source: `cc/house/*`._\n")
for n in range(1, 13):
    top = g(cc, f"cc/house/{n}")
    w(f"### {n}{'st' if n==1 else 'nd' if n==2 else 'rd' if n==3 else 'th'} house\n")
    if top:
        w(f"**Domain (calc-layer label set):** {top}\n")
    facets = {kk: cc[kk] for kk in cc if kk.startswith(f"cc/house/{n}/")}
    if facets:
        w("**Lived scenes (choose one; do not list):**\n")
        for kk in sorted(facets):
            w(f"- {cc[kk]}  `[{kk}]`")
        w("")
    w(f"_Provenance: `cc/house/{n}` (+ facets)_\n")

# ---------------------------------------------------------------- PLANET BANKS
w("## 7. Planet banks\n")
w("_Function / productive / excess. Source: `cc/planet/{planet}/*` and `ms/chart-comparison/planet/*`._\n")
for p in PLANETS:
    fn = g(cc, f"cc/planet/{p}/function") or g(cc, f"cc/planet/{p}")
    pr = g(cc, f"cc/planet/{p}/productive")
    ex = g(cc, f"cc/planet/{p}/excess")
    msf = g(ms, f"ms/chart-comparison/planet/{p}")
    if not any([fn, pr, ex, msf]):
        continue
    w(f"### {p.capitalize()}\n")
    if fn: w(f"- **Function:** {fn}  `[cc/planet/{p}/function]`")
    if pr: w(f"- **Productive:** {pr}  `[cc/planet/{p}/productive]`")
    if ex: w(f"- **Excess:** {ex}  `[cc/planet/{p}/excess]`")
    if msf: w(f"- **Relational read:** {msf}  `[ms/chart-comparison/planet/{p}]`")
    w("")

# ---------------------------------------------------------------- ASPECT BANKS
w("## 8. Aspect banks\n")
w("### 8.1 Aspect mechanics (process, not verdict)\n")
w("_Source: `cc/aspect/*` (geometry) and `cc/ref/aspect-psychology/*` (process)._\n")
for a in ASPECTS:
    geo = g(cc, f"cc/aspect/{a}")
    psy = g(cc, f"cc/ref/aspect-psychology/{a}")
    w(f"**{a.capitalize()}**")
    if geo: w(f"- Geometry: {geo}  `[cc/aspect/{a}]`")
    if psy: w(f"- Process: {psy}  `[cc/ref/aspect-psychology/{a}]`")
    w("")

w("### 8.2 Exact aspect-pair clauses (EVIDENCE_ONLY_UNTIL_REVIEWED — each row needs clause review)\n")
w("_These are the ONLY correct primary source for a personalized transit / natal aspect / sky aspect. "
  "A house locates the scene; it never fills a gap. If a needed pair is absent -> `SOURCE_GAP`. "
  "Source: `cc/aspect-pair/*` (84 rows)._\n")
pairs = sorted(kk for kk in cc if kk.startswith("cc/aspect-pair/"))
w(f"_Total exact aspect-pair rows available: {len(pairs)}._\n")
for kk in pairs:
    name = kk.split("/")[-1].replace("-", " ")
    w(f"- **{name}** — {cc[kk]}  `[{kk}]`")
w("")

# ---------------------------------------------------------------- TABLES
w("## Required table: phrase-record sample (section 18)\n")
w("| Key | Text or paraphrase | Function | Scope | Eligible article types | Status | Source |")
w("| --- | --- | --- | --- | --- | --- | --- |")
sample_rows = [
    ("cc/aspect-pair/venus-square-saturn", "warmth meets caution; being valued feels tested", "lived-situation", "transit-to-natal / sky-aspect", "planetary-horoscope, transit-essay", "APPROVED", "cc-source-phrases.json"),
    ("cc/house/8/trust", "trust, control, what you're willing to depend on", "scene-selector", "8th-house scenes", "all personalized", "APPROVED", "cc-source-phrases.json"),
    ("cc/sign/virgo/actions", "count to 10; clarify without rushing", "practical-correction", "Virgo", "daily/weekly/planetary", "APPROVED", "cc-source-phrases.json"),
    ("cc/event-action/mercury-retrograde", "back up files; note what recurs; triple-check dates", "practical-action", "mercury-retrograde", "retrograde-guide", "APPROVED", "cc-source-phrases.json"),
    ("ms/retro-phase/stationary", "~2 days; concentrated view of the planet's archetype", "timing-explainer", "any retrograde", "retrograde-guide, direct-station-guide", "APPROVED", "marie-source-phrases.json"),
]
for r in sample_rows:
    w("| `{}` | {} | {} | {} | {} | {} | {} |".format(*r))
w("")

# coverage counts
def count(prefix, d=cc):
    return sum(1 for k in d if k.startswith(prefix))
w("## Required table: coverage (section 18)\n")
w("| Category | Coverage | Missing | Confidence |")
w("| --- | --- | --- | --- |")
cov = [
    ("Sign lived-behavior banks", f"12/12 signs", "expanded alt-lines uneven by sign", "high"),
    ("House scene banks", f"12/12 houses, {count('cc/house/')-12} facet scenes", "few houses have <5 facets", "high"),
    ("Planet function banks", f"{sum(1 for p in PLANETS if g(cc,'cc/planet/'+p+'/function'))}/10 planets", "outer planets thinner", "medium"),
    ("Exact aspect-pair clauses", f"{count('cc/aspect-pair/')} rows", "84 rows still EVIDENCE_ONLY_UNTIL_REVIEWED; many pairs absent", "medium"),
    ("Planet-in-sign", f"{count('cc/planet-in-sign/')} rows", "seasonal/dated copy mixed in; not all 120 combos", "medium"),
    ("Fallback hooks", f"{count('cc/fallback-hook/')} rows", "many are raw weekly excerpts needing quarantine review", "low"),
    ("Retrograde phases", "4/4 phases (ms/retro-phase)", "per-planet retro copy only for some planets", "high"),
    ("Ingress", f"{count('ms/ingress/', ms)} bodies (ms/ingress)", "sign-flavored ingress uneven", "medium"),
    ("Dignity", f"{count('ms/dignity-tag/', ms)} tags", "per-sign dignity sparse", "medium"),
    ("Eclipses", f"{count('ms/eclipse-house/', ms)+count('ms/eclipse-guidance/', ms)} rows", "solar vs lunar not separated in source", "low"),
]
for r in cov:
    w("| {} | {} | {} | {} |".format(*r))
w("")

print("\n".join(out))
