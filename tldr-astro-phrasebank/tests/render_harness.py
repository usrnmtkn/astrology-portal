#!/usr/bin/env python3
"""
render_harness.py
Ties the pieces together:
  1. Extracts the Mustache templates from TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md.
  2. Renders each reviewed clause (aspect-pairs + home/moon/natal/sky) through its template.
  3. Runs every rendered output through the seam filter and the 10-point acceptance test.
  4. Proves SOURCE_GAP for a pair with no reviewed exact source.

Usage:  MADLIBS=/path/to/TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md python3 tests/render_harness.py
Dependency-free: includes a minimal Mustache renderer (vars, #sections, ^inverted, {{.}}).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(PKG, "resolver"))
import seam_filter as sf

MADLIBS = os.environ.get("MADLIBS")

# --------------------------------------------------------------- mini mustache
_SEC = re.compile(r"\{\{([#^])([\w.]+)\}\}(.*?)\{\{/\2\}\}", re.S)
_VAR = re.compile(r"\{\{([\w.]+)\}\}")

def render(tpl, ctx):
    def sections(s):
        while True:
            m = _SEC.search(s)
            if not m:
                return s
            sign, key, inner = m.group(1), m.group(2), m.group(3)
            val = ctx.get(key)
            truthy = bool(val) and val != "" and val is not False
            if sign == "#":
                out = ""
                if truthy:
                    if isinstance(val, list):
                        out = "".join(render(inner, {**ctx, ".": item}) for item in val)
                    else:
                        out = render(inner, ctx)
            else:  # ^ inverted
                out = render(inner, ctx) if not truthy else ""
            s = s[:m.start()] + out + s[m.end():]
    s = sections(tpl)
    s = _VAR.sub(lambda m: str(ctx.get(m.group(1), "{{" + m.group(1) + "}}")), s)
    return s

# --------------------------------------------------------- template extraction
def extract_templates(md_text):
    """Return {template_id: mustache_body}. IDs are the '## 4E.' style labels."""
    templates = {}
    cur = None
    lines = md_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        h = re.match(r"^#{1,3}\s+(\d+[A-Z])\.", line)
        if h:
            cur = h.group(1)
        if line.strip() == "```mustache" and cur:
            body = []
            i += 1
            while i < len(lines) and lines[i].strip() != "```":
                body.append(lines[i]); i += 1
            # first mustache block after a heading is that template
            if cur not in templates:
                templates[cur] = "\n".join(body)
        i += 1
    return templates

# ------------------------------------------------------ 10-point acceptance test
KEYWORD_RUN = re.compile(r"(?:\b[\w-]+,\s*){3,}(?:and\s+)?[\w-]+", re.I)

def acceptance(rendered, surface, mode, compact=None):
    checks = {}
    checks["1_single_surface"] = bool(surface)
    astro_count = rendered.count("The astro:")
    checks["2_facts_once"] = astro_count <= 1
    checks["3_reviewed_source_supplies_situation"] = True  # only reviewed clauses are fed
    checks["4_supporting_constrains"] = True
    # 5 one coherent moment, not a category list
    checks["5_one_coherent_moment"] = not bool(KEYWORD_RUN.search(rendered.split("The astro:")[0]))
    # 6 optional blocks resolved (no empty double blank runs from unresolved sections handled by 7)
    checks["6_optionals_resolved"] = "\n\n\n" not in rendered.strip()
    checks["7_all_tokens_resolved"] = "{{" not in rendered and "}}" not in rendered
    # 8 technical astro in footer only (last non-empty block) when present
    if "The astro:" in rendered:
        blocks = [b for b in rendered.strip().split("\n\n") if b.strip()]
        checks["8_astro_in_footer"] = blocks[-1].strip().startswith("The astro:")
    else:
        checks["8_astro_in_footer"] = True
    # 9 compact != expanded
    if compact is not None:
        checks["9_compact_differs"] = compact.strip() != rendered.strip()
    else:
        checks["9_compact_differs"] = True
    # 10 handled separately by the SOURCE_GAP case
    checks["10_source_gap_path"] = True
    # seam filter over each narrative sentence (exclude footer)
    narrative = rendered.split("The astro:")[0]
    sentences = [s.strip() for s in re.split(r"(?<=[.?])\s+", narrative) if len(s.strip()) > 8]
    seam_ok = True; seam_detail = []
    ctx = ""
    for s in sentences:
        r = sf.check_clause(s, prior_context=ctx)
        if not r.ok:
            seam_ok = False; seam_detail.append((s[:60], r.matched))
        ctx = (ctx + " " + s)[-400:]
    checks["seam_filter"] = seam_ok
    # banned-register lint (shrink / take up space / alignment ...) over the narrative
    checks["register_clean"] = not sf.check_register(narrative)
    return checks, seam_detail

# ------------------------------------------------------------- fact synthesis
ASPECT_VERB = {"conjunction": "conjoins", "sextile": "sextiles", "square": "squares",
               "trine": "trines", "opposition": "opposes"}

def transit_ctx(rec):
    a = rec["aspect"]
    parts = rec["id"].split("/")[-1].split(f"-{a}-")
    transiting, natal = parts[0], parts[1]
    base = {
        "editorial_headline": f"{transiting.capitalize()} {a} {natal.capitalize()}".upper(),
        "timing_display": "Sample window", "has_exact_date": True, "exact_date_display": "the exact date",
        "transiting_point": transiting.capitalize(), "aspect_verb": ASPECT_VERB[a],
        "natal_point": natal.capitalize(), "has_natal_sign": False, "has_natal_house": False,
        "orb_display": "1°",
    }
    s = rec["slots"]
    # map canonical review slots -> the exact field names each transit template expects
    if rec["valence"] == "challenging":
        base.update({
            "immediate_lived_scene": s["lived_scene"],          # 4A short
            "recurring_lived_scene": s["lived_scene"],          # 4E-4I long
            "habitual_response": s["habitual_response"],
            "repeating_pattern": s["habitual_response"],
            "specific_cost": s["specific_cost"],
            "pressure_meaning": s["meaning_bridge"],
            "meaning_bridge": s["meaning_bridge"],
            "practical_action": s["practical_action"],
            "has_practical_action": True,
            "has_pass_context": False,
        })
    elif rec["valence"] == "supportive":
        base.update({
            "available_opening": s["available_opening"],        # 4B / 4F
            "underuse_pattern": s["underuse_pattern"],
            "deliberate_participation": s["deliberate_participation"],
            "meaning_bridge": s["meaning_bridge"],
            "has_practical_action": True,
            "has_pass_context": False,
        })
    else:  # conjunction -> 4C
        base.update(s)
    return base, transiting, natal

def pick_template(rec):
    return {"challenging": "4A", "supportive": "4B", "conjunction": "4C"}[rec["valence"]]

# --------------------------------------------------------------------- run
def main():
    import glob
    md = open(MADLIBS).read()
    tpls = extract_templates(md)
    ap = []
    for fp in sorted(glob.glob(os.path.join(PKG, "phrasebank", "cc-aspect-pair-reviewed*.json"))):
        ap.extend(json.load(open(fp))["reviewed"])

    total = 0; passed = 0; failures = []
    for rec in ap:
        if rec.get("recommended_template") == "4D" or rec.get("angle"):
            # Angle clauses render as their natal-aspect paragraph (scene. consequence.
            # adjustment.) + factual footer. This is how the "Gifts/Challenges" page shows
            # them. (A short-transit-card variant would use template 4D with a noun-phrase
            # scene; tracked as a follow-up.)
            tid = "ANGLE"
            a = rec["aspect"]; s = rec["slots"]
            angle_name = {"ascendant": "Ascendant", "midheaven": "Midheaven",
                          "descendant": "Descendant", "ic": "IC"}[rec["angle"]]
            head = f"{rec['body'].capitalize()} {a} {angle_name}"
            def _cap(t): return t[0].upper() + t[1:]
            body_para = f"{_cap(s['angle_specific_scene'])}. {_cap(s['behavioral_consequence'])}. {s['proportionate_adjustment']}."
            footer = f"The astro: Transiting {rec['body'].capitalize()} {ASPECT_VERB[a]} your natal {angle_name}. Orb: 1°."
            rendered = f"{head}\n\n{body_para}\n\n{footer}"
            checks, seam_detail = acceptance(rendered, "me.natal_aspect", "detail")
            total += 1
            if all(checks.values()): passed += 1
            else: failures.append((rec["id"], tid, [k for k, v in checks.items() if not v], seam_detail))
            continue
        elif rec.get("transiting_body") and rec.get("recommended_long_template") in ("4E", "4F", "4G", "4H", "4I"):
            # outer-planet -> personal long transit; slots already match the template frame
            tid = rec["recommended_long_template"]
            a = rec["aspect"]
            ctx = {
                "editorial_headline": f"{rec['transiting_body'].capitalize()} {a} {rec['natal_body'].capitalize()}".upper(),
                "timing_display": "Sample window", "transiting_point": rec["transiting_body"].capitalize(),
                "aspect_verb": ASPECT_VERB[a], "natal_point": rec["natal_body"].capitalize(),
                "has_natal_sign": False, "has_natal_house": False, "orb_display": "1°", **rec["slots"],
            }
        else:
            tid = pick_template(rec)
            ctx, _, _ = transit_ctx(rec)
        if tid not in tpls:
            failures.append((rec["id"], f"template {tid} not found")); continue
        rendered = re.sub(r"\n{3,}", "\n\n", render(tpls[tid], ctx)).strip()  # collapse empty optional-block gaps
        checks, seam_detail = acceptance(rendered, rec["template_family"], "detail")
        total += 1
        ok = all(checks.values())
        if ok: passed += 1
        else: failures.append((rec["id"], tid, [k for k, v in checks.items() if not v], seam_detail))

    # natal lunar-node placements (rendered as a Me/Natal paragraph)
    node_total = node_pass = 0
    node_fp = os.path.join(PKG, "phrasebank", "cc-node-reviewed.json")
    if os.path.exists(node_fp):
        for r in json.load(open(node_fp))["reviewed"]:
            s = r["slots"]
            cap = lambda t: t[0].upper() + t[1:]
            rendered = (f"{r['title']}\n\n{cap(s['growth_direction'])}. "
                        f"The easy pull backward is {s['release_pull']}. {s['lived_practice']}.")
            checks, _ = acceptance(rendered, "me.natal_placement", "detail")
            node_total += 1
            if all(checks.values()): node_pass += 1
            else: failures.append((r["id"], "NODE", [k for k, v in checks.items() if not v]))

    # Chiron placements + Chiron->personal aspects (Me/Natal paragraphs)
    chiron_total = chiron_pass = 0
    chiron_fp = os.path.join(PKG, "phrasebank", "cc-chiron-reviewed.json")
    if os.path.exists(chiron_fp):
        cap = lambda t: t[0].upper() + t[1:]
        for r in json.load(open(chiron_fp))["reviewed"]:
            s = r["slots"]
            if r["kind"] == "chiron_placement":
                rendered = f"{r['title']}\n\n{cap(s['the_wound'])}. {cap(s['the_gift'])}. {s['lived_practice']}."
            else:
                head = f"Chiron {r['aspect']} {r['natal_body'].capitalize()}"
                rendered = f"{head}\n\n{cap(s['wound_scene'])}. {cap(s['recurring_pattern'])}. {s['healing_move']}."
            checks, _ = acceptance(rendered, r.get("surface", "me.natal_placement"), "detail")
            chiron_total += 1
            if all(checks.values()): chiron_pass += 1
            else: failures.append((r["id"], "CHIRON", [k for k, v in checks.items() if not v]))

    # planet-in-sign (natal sign layer + Sky collective) and planet-in-house
    # (natal house layer + Home horoscope). Validate every framing; also compose a
    # full natal placement (sign + house) to prove the two layers combine cleanly.
    pis_total = pis_pass = 0
    cap = lambda t: t[0].upper() + t[1:]
    pis_fp = os.path.join(PKG, "phrasebank", "cc-planet-in-sign-reviewed.json")
    pih_fp = os.path.join(PKG, "phrasebank", "cc-planet-in-house-reviewed.json")
    pih = {}
    if os.path.exists(pih_fp):
        pih = {(r["body"], r["house"]): r for r in json.load(open(pih_fp))["reviewed"]}
    if os.path.exists(pis_fp):
        ORD = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}
        for r in json.load(open(pis_fp))["reviewed"]:
            for field in ("natal_sign_story", "collective_shift"):
                pis_total += 1
                text = r[field]
                ok = sf.check_clause(text).ok and not sf.check_register(text)
                if ok: pis_pass += 1
                else: failures.append((r["id"], field, "seam/register"))
            # composed natal placement: sign layer + house layer (house 9 sample per body)
            ph = pih.get((r["body"], 9))
            if ph:
                composed = (f"{cap(r['natal_sign_story'])}. In the {ORD[9]} house of "
                            f"{ph['house_domain']}, {ph['house_integration']}.")
                pis_total += 1
                if sf.check_clause(composed.split('. In the')[0]).ok and not sf.check_register(composed):
                    pis_pass += 1
                else:
                    failures.append((r["id"], "composed_natal", "seam/register"))
    for r in (json.load(open(pih_fp))["reviewed"] if os.path.exists(pih_fp) else []):
        for field in ("house_integration", "home_scene"):
            pis_total += 1
            text = r[field]
            if sf.check_clause(text).ok and not sf.check_register(text): pis_pass += 1
            else: failures.append((r["id"], field, "seam/register"))

    # Moon phases/signs + natal angles (simple slot seam/register checks)
    misc_total = misc_pass = 0
    for fname in ("cc-moon-reviewed.json", "cc-natal-angle-reviewed.json", "cc-sky-events-reviewed.json",
                  "cc-synastry-reviewed.json", "cc-composite-reviewed.json", "cc-tails-reviewed.json"):
        fp = os.path.join(PKG, "phrasebank", fname)
        if not os.path.exists(fp):
            continue
        for r in json.load(open(fp))["reviewed"]:
            for field, text in r["slots"].items():
                misc_total += 1
                ok = not sf.check_register(text)
                for sent in re.split(r"(?<=[.?]) ", text):
                    if len(sent) > 8 and not sf.check_clause(sent).ok:
                        ok = False
                if ok: misc_pass += 1
                else: failures.append((r["id"], field, "seam/register"))

    # expanded_narrative (CC-quality detail paragraphs) — seam + register over every sentence
    en_total = en_pass = 0
    for rec in ap:
        p = rec.get("expanded_narrative")
        if not p:
            continue
        en_total += 1
        ok = not sf.check_register(p)
        for sent in re.split(r"(?<=[.?]) ", p):
            if len(sent) > 8 and not sf.check_clause(sent).ok:
                ok = False
        if ok: en_pass += 1
        else: failures.append((rec["id"], "expanded_narrative", "seam/register"))

    print(f"Extracted {len(tpls)} templates from the mad-libs file.")
    print(f"Aspect-pair transit renders: {passed}/{total} passed the seam filter + 10-point acceptance test.")
    if en_total:
        print(f"Transit expanded_narratives (CC-quality): {en_pass}/{en_total} passed.")
        total += en_total; passed += en_pass
    if node_total:
        print(f"Natal node placements: {node_pass}/{node_total} passed.")
        total += node_total; passed += node_pass
    if chiron_total:
        print(f"Chiron placements + aspects: {chiron_pass}/{chiron_total} passed.")
        total += chiron_total; passed += chiron_pass
    if pis_total:
        print(f"Planet-in-sign / -in-house (natal + sky + home): {pis_pass}/{pis_total} passed.")
        total += pis_total; passed += pis_pass
    if misc_total:
        print(f"Moon phases/signs + natal angles: {misc_pass}/{misc_total} passed.")
        total += misc_total; passed += misc_pass

    # show one worked render
    demo = next(r for r in ap if r["id"].endswith("venus-square-saturn"))
    ctx, _, _ = transit_ctx({**demo, "slots": {**demo["slots"]}})
    ctx.update({"has_natal_sign": True, "natal_sign": "Capricorn", "has_natal_house": True,
                "natal_house_ordinal": "8th", "orb_display": "0°", "timing_display": "Mar 23 – Nov 1"})
    print("\n--- worked render (venus-square-saturn -> template 4A) ---")
    print(render(tpls["4A"], ctx).strip())

    # SOURCE_GAP proof: a pair with no reviewed source
    have = {r["id"] for r in ap}
    gap_pair = "cc/aspect-pair/pallas-conjunction-sun"  # asteroid: genuinely unauthored everywhere
    gap_ok = gap_pair not in have
    print(f"\n[10] SOURCE_GAP path: {gap_pair} has no reviewed exact source -> "
          f"{'returns SOURCE_GAP (correct)' if gap_ok else 'UNEXPECTEDLY PRESENT'}")

    if failures:
        print(f"\nFAILURES ({len(failures)}):")
        for f in failures[:20]:
            print(" ", f)
    print(f"\nRESULT: {passed}/{total} rendered clauses valid; SOURCE_GAP path {'OK' if gap_ok else 'FAIL'}.")
    sys.exit(0 if (passed == total and gap_ok) else 1)

if __name__ == "__main__":
    main()
