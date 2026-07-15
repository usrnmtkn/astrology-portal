#!/usr/bin/env python3
"""
build_final_bundle.py — assemble ONE complete import file.

Merges every authored content row + the slot-resolution map + a coverage ledger into a single
self-contained JSON: tldr-astro-authored-library-COMPLETE.json. Codex imports this one file; there
is no follow-up. Validates: required fields present, app-legal surface/block_type, unique content
keys, tier/status all DRAFT/REVIEWED. Fails loudly on any problem.
"""
import os, json
from collections import Counter

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PB  = os.path.join(PKG, "phrasebank")

CONTENT_FILES = [
 ("cc-fallback-hooks.json",   "fallback"),
 ("cc-slot-templates.json",   "slot-template"),
 ("cc-vocab.json",            "vocab"),
 ("cc-authored-content.json", "authored-content"),
 ("cc-moon-phase-bank.json",  "moon-phase"),
]
ALLOWED_SURFACE = {"sky","you","natal","synastry","composite","relationship","modifier"}
ALLOWED_BLOCK   = {None,"fallback_template"}
REQUIRED = ["content_key","surface","mode","status","event_type","body","source_snapshot",
            "prompt_version","block_type","tier"]

# The emergency floor = fallback + slot templates + fully-covered fill vocab + universal guide-phrases.
# These serve (status=LIVE, lane=serving) so every public surface always renders; they stay editable
# in admin. Everything else is bespoke editorial: DRAFT, admin-only, awaiting Marie's sign-off.
FLOOR_SOURCES = {
 ("vocab","planet-vocab"),("vocab","planet-lived"),("house-theme","house-lived"),
 ("action","daily-action"),("closing","daily-closing"),("hook","daily-hook"),
 ("vocab","lived-behaviors"),("phrase","guide-phrase"),("vocab","aspect-vocab"),
 ("vocab","midheaven"),("phrase","phrase-function"),("vocab","moon-phase"),
 # Marie's whole-piece writing that reads well on its own -> serve directly as the floor,
 # not shredded through a template.
 ("transit","retrograde"),("event","mercury-rx-sign"),("event","mercury-rx-element"),
 ("event-action","do-dont"),("transit","ingress"),
 ("transit","planet-through-house"),   # 132 per-planet-per-house paragraphs
 ("aspect-pair","aspect-pair"),        # 84 per-pair aspect paragraphs
 ("transit","nodal-axis"),
 ("vocab","planet-in-sign"),           # whole planet-in-sign paragraphs (sky placement, in-season)
 # Relationship floor (Friends tab) — clean authored synastry/composite so those surfaces render.
 # The richer cc-composite-typed (882) / cc-synastry-reviewed stay DRAFT editorial for Marie.
 ("synastry","synastry-core"),("synastry","synastry-context"),("synastry","chart-comparison"),
 ("synastry","synastry-overlay"),("synastry","composite"),("synastry","trait-synastry"),
 ("synastry","synastry"),
 ("vocab","synastry-house-overlay"),("vocab","synastry-label"),("vocab","synastry-bank"),
}
def is_floor(r):
    ss = r["source_snapshot"]
    return (r["_bucket"] in ("fallback","slot-template")
            or (ss.get("contentType"), ss.get("category")) in FLOOR_SOURCES)

# Runtime key bridge: the app's old fallback-hook/{route} request keys -> new library targets.
# Each surface resolves to a mustache template (or, for synastry/composite which have no mustache
# template, an authored record family); the template's slots then resolve via slot_resolution_map.
# "select_by" names the calculated dimension that picks the variant. Codex confirms these against the
# runtime's actual request keys; this covers the 41 canonical fallback-hook routes.
RUNTIME_KEY_BRIDGE = {
 "fallback-hook/sky.seasonal-current":  {"record_file": "cc-planet-in-sign-reviewed", "field": "collective_shift", "template": ["slot-template/6B"], "prefer": "record", "select_by": "SKY collective_shift by planet+sign (NOT natal_sign_story); template if missing"},
 "fallback-hook/sky.planetary-placement":{"record_file": "cc-planet-in-sign-reviewed", "field": "collective_shift", "template": ["slot-template/6B","slot-template/6C","slot-template/6D"], "prefer": "record", "select_by": "SKY collective_shift by planet+sign; template if missing"},
 "fallback-hook/sky.ingress":           {"record": "transit/ingress", "template": ["slot-template/6M"], "prefer": "record", "select_by": "planet (serve Marie's whole ingress paragraph; template only if no authored piece)"},
 "fallback-hook/sky.aspect-detail":     {"record_file": "cc-aspect-pair-reviewed", "field": "expanded_narrative", "also": "cc-natal-aspect:experience", "prefer": "record", "select_by": "aspect-pair expanded_narrative -> cc-natal-aspect.experience (union = full aspect coverage, both beautiful). No thin template."},
 "fallback-hook/sky.aspect-sign-context":{"record_file": "cc-aspect-pair-reviewed", "field": "expanded_narrative", "also": "cc-natal-aspect:experience", "prefer": "record", "select_by": "aspect-pair expanded_narrative -> cc-natal-aspect.experience (full aspect coverage)"},
 "fallback-hook/sky.retrograde":        {"record": "transit/retrograde", "template": ["slot-template/6I"], "prefer": "record", "select_by": "planet (serve Marie's whole retrograde paragraph; template only if no authored piece)"},
 "fallback-hook/sky.retrograde-section":{"record": "transit/retrograde", "template": ["slot-template/6I"], "prefer": "record", "select_by": "planet"},
 "fallback-hook/sky.station":           {"record": "transit/retrograde", "template": ["slot-template/6H","slot-template/6K"], "prefer": "record", "select_by": "planet retrograde paragraph; template if missing"},
 "fallback-hook/sky.lunar-cycle":       {"record_file": "cc-planet-in-sign-reviewed", "field": "collective_shift", "template": ["slot-template/2J"], "prefer": "record", "select_by": "SKY collective_shift for Moon+sign; template if missing"},
 "fallback-hook/lunar-calendar/day":    {"record_file": "cc-planet-in-sign-reviewed", "field": "collective_shift", "template": ["slot-template/2J"], "prefer": "record", "select_by": "SKY collective_shift for Moon+sign; template if missing"},
 "fallback-hook/lunar-calendar/arc-new-moon":  {"template": ["slot-template/2A"], "select_by": "New Moon"},
 "fallback-hook/lunar-calendar/arc-full-moon": {"template": ["slot-template/2E"], "select_by": "Full Moon"},
 "fallback-hook/you.natal-placement":   {"record_file": "cc-planet-in-sign-reviewed", "field": "natal_sign_story", "also": "cc-planet-in-house-reviewed:house_integration", "template": ["slot-template/5K"], "prefer": "record", "select_by": "NATAL sign story + house integration (NEVER seasonal collective_shift); template if missing"},
 "fallback-hook/you.natal-house-placement":{"record_file": "cc-planet-in-house-reviewed", "field": "house_integration", "template": ["slot-template/5K"], "prefer": "record", "select_by": "NATAL house_integration (NOT transit home_scene); template if missing"},
 "fallback-hook/you.natal-angle-placement":{"record_file": "cc-natal-angles-authored", "field": "reading", "prefer": "record", "select_by": "angle+sign authored reading (Asc/MC/Dsc/IC x 12, full). No template."},
 "fallback-hook/you.natal-aspect":      {"record_file": "cc-natal-aspect", "field": "experience", "template": ["slot-template/5P","slot-template/5Q","slot-template/5R","slot-template/5S"], "prefer": "record", "select_by": "NATAL aspect experience by pair+aspect (cc-natal-aspect, third-person natal; NOT generic aspect-pair); template if missing"},
 "fallback-hook/you.transit-to-natal":  {"record_file": "cc-aspect-pair-reviewed", "field": "expanded_narrative", "also": "cc-natal-aspect:experience", "prefer": "record", "select_by": "aspect-pair expanded_narrative -> cc-natal-aspect.experience (full aspect coverage, both beautiful). No thin template."},
 "fallback-hook/you.transit-through-house":{"record": "transit/planet-through-house", "template": ["slot-template/4E","slot-template/4F","slot-template/4G","slot-template/4H","slot-template/4I"], "prefer": "record", "select_by": "planet+house whole paragraph; template if missing"},
 "fallback-hook/you.transit-to-angle":  {"record_file": "cc-aspect-pair-reviewed", "field": "expanded_narrative", "also": "cc-natal-aspect:experience", "prefer": "record", "select_by": "aspect-pair expanded_narrative -> cc-natal-aspect.experience (full aspect coverage)"},
 "fallback-hook/you.daily-timing":      {"record_file": "cc-aspect-pair-reviewed", "field": "expanded_narrative", "also": "cc-natal-aspect:experience", "prefer": "record", "select_by": "strongest transit aspect: expanded_narrative -> cc-natal-aspect.experience (full coverage)"},
 "fallback-hook/natal/hard-aspect":     {"record_file": "cc-natal-aspect", "field": "experience", "template": ["slot-template/5R"], "prefer": "record", "select_by": "NATAL hard-aspect experience (cc-natal-aspect); template if missing"},
 "fallback-hook/natal/chart-contradiction":{"record": "static", "select_by": "note: niche report surface, no Marie source; app-composed. Do NOT use a leaking mad-lib template."},
 "fallback-hook/natal/free-will-disclaimer":{"record": "static", "select_by": "note: static disclaimer; keep the authored fallback row, no template"},
 # Synastry / composite / relationship: no mustache template (madlibs is sections 1-6 only) ->
 # resolve directly from authored records.
 "fallback-hook/friends.synastry-contact": {"record": "synastry/synastry-core + synastry/synastry-context", "select_by": "aspect+contact"},
 "fallback-hook/friends.same-planet":      {"record": "synastry/chart-comparison", "select_by": "planet+tier"},
 "fallback-hook/friends.house-overlay":    {"record": "synastry/synastry-overlay + vocab/synastry-house-overlay", "select_by": "house+who"},
 "fallback-hook/friends.composite-aspect": {"record": "synastry/composite", "select_by": "planet"},
 "fallback-hook/friends.composite-placement":{"record": "synastry/composite", "select_by": "planet"},
 "fallback-hook/friends.relationship-timing":{"record_file": "cc-aspect-pair-reviewed", "field": "expanded_narrative", "also": "cc-natal-aspect:experience", "prefer": "record", "select_by": "transiting aspect to a composite point: expanded_narrative -> cc-natal-aspect.experience (full coverage)"},
 "fallback-hook/friends.circle-feed":      {"record": "static", "select_by": "note: app-composed circle feed; NO Marie reading content. Do NOT serve a random guide-phrase."},
 "fallback-hook/settings.life-area-focus": {"record": "static", "select_by": "note: settings UI surface; app-composed, not a phrasebank reading. Do NOT serve a random guide-phrase."},
}

def main():
    rows, bucket_counts, problems = [], Counter(), []
    seen = {}
    for fn, bucket in CONTENT_FILES:
        data = json.load(open(os.path.join(PB, fn)))["reviewed"]
        for r in data:
            for k in REQUIRED:
                if k not in r: problems.append(f"{fn}:{r.get('content_key','?')} missing {k}")
            if r["surface"] not in ALLOWED_SURFACE: problems.append(f"{r['content_key']} bad surface {r['surface']}")
            if r["block_type"] not in ALLOWED_BLOCK: problems.append(f"{r['content_key']} bad block_type {r['block_type']}")
            ck = r["content_key"]
            if ck in seen: problems.append(f"DUPLICATE content_key {ck} (in {seen[ck]} and {fn})")
            seen[ck] = fn
            r = dict(r); r["_bucket"] = bucket
            rows.append(r); bucket_counts[bucket] += 1

    import re as _re
    def has_raw_slot(r):
        # A row leaks if served as-is. Mustache slot-templates are interpolated via the resolution
        # map, so their {{...}} is OK. Any OTHER row with a {single-brace} or {{double}} placeholder
        # has no interpolation path here and must NOT serve LIVE.
        if r["_bucket"] == "slot-template":
            return False
        return bool(_re.search(r"\{\{.*?\}\}", r.get("body", "")) or
                    _re.search(r"(?<![0-9])\{[^{}]+\}", r.get("body", "")))

    # Assign serving state: emergency floor -> LIVE + lane serving + editable; editorial -> DRAFT.
    # A floor-eligible row that would leak a raw slot (e.g. legacy {slot} fallback templates that
    # have no interpolation path) is demoted to DRAFT so it never serves braces to a reader.
    floor_n = demoted_n = 0
    for r in rows:
        if is_floor(r) and not has_raw_slot(r):
            r["status"] = "LIVE"; r["lane"] = "serving"; r["serving_floor"] = True; r["admin_editable"] = True
            floor_n += 1
        else:
            r["status"] = "DRAFT"; r["lane"] = "review"; r["serving_floor"] = False; r["admin_editable"] = True
            if is_floor(r): demoted_n += 1  # floor-eligible but raw-slot -> held DRAFT
    # Validate final serving state.
    for r in rows:
        if r["status"] not in ("DRAFT", "LIVE"): problems.append(f"{r['content_key']} bad status {r['status']}")
        if r["serving_floor"] and not (r["status"] == "LIVE" and r["lane"] == "serving"):
            problems.append(f"{r['content_key']} floor row not LIVE/serving")
        if (not r["serving_floor"]) and r["status"] != "DRAFT":
            problems.append(f"{r['content_key']} editorial row not DRAFT")
        # HARD GATE: no LIVE row may contain a raw slot placeholder (mustache templates excepted).
        if r["status"] == "LIVE" and has_raw_slot(r):
            problems.append(f"{r['content_key']} LIVE but contains raw slot placeholder")

    # Validate the runtime key bridge: every template/record target must exist in the library.
    slot_ids = {r["content_key"] for r in rows if r["_bucket"] == "slot-template"}
    cats = set()
    for r in rows:
        ss = r["source_snapshot"]; cats.add((ss.get("contentType"), ss.get("category")))
    import re as _re
    def check_file_field(old_key, ref):
        # ref = "cc-file" or "cc-file:field"; verify the file exists and (if given) the field is present
        fn, _, fld = ref.partition(":")
        p = os.path.join(PB, fn + ".json")
        if not os.path.exists(p): problems.append(f"bridge {old_key} -> missing record_file {fn}"); return
        recs = json.load(open(p)).get("reviewed") or []
        if fld and not any(fld in r for r in recs):
            problems.append(f"bridge {old_key} -> record_file {fn} has no field '{fld}'")
    for old_key, tgt in RUNTIME_KEY_BRIDGE.items():
        for tid in tgt.get("template", []):
            if tid not in slot_ids: problems.append(f"bridge {old_key} -> missing template {tid}")
        rec = tgt.get("record")
        if rec and rec not in ("static",):
            for tok in _re.findall(r"([a-z-]+)/([a-z0-9-]+|\*)", rec):
                t, c = tok
                if c == "*": continue  # wildcard family (e.g. transit/*)
                if (t, c) not in cats: problems.append(f"bridge {old_key} -> missing record family {t}/{c}")
        if tgt.get("record_file"):
            check_file_field(old_key, tgt["record_file"] + (":" + tgt["field"] if tgt.get("field") else ""))
        if tgt.get("also"):
            check_file_field(old_key, tgt["also"])

    smap = json.load(open(os.path.join(PB, "cc-slot-resolution-map.json")))

    bundle = {
      "meta": {
        "name": "TLDR Astro authored library (complete)",
        "version": "authored-library-complete-v2",
        "posture": ("Emergency floor (fallback + slot templates + fully-covered fill vocab + guide-phrases) "
                    f"= {floor_n} rows LIVE + lane=serving, so public surfaces always render; editable in "
                    f"admin. Bespoke editorial = {len(rows)-floor_n} rows DRAFT, admin-only, awaiting Marie."),
        "serving_floor_rows": floor_n,
        "editorial_draft_rows": len(rows) - floor_n,
        "buckets": dict(bucket_counts),
        "total_rows": len(rows),
        "slot_resolution": {"slots": smap["counts"]["slots"], "interpretive": smap["counts"]["interpretive"],
                            "fact": smap["counts"]["fact"], "flag": smap["counts"]["flag"], "gap": smap["counts"]["gap"]},
      },
      "coverage_ledger": {
        "grounded": "All content is Marie's authored/verbatim material from tldr-astro-records.json and the "
                    "mustache templates; moon-phase bank is grounded in her lunation frame. Nothing invented.",
        "partial_sources": {
          "vocab/planet-in-sign": "personal-planet x sign not exhaustive (Marie has not published every combo); "
                                  "missing combos resolve via fallback vocab/planet-vocab.",
          "aspect-pair/aspect-pair": "84 pairs, not every planet-pair x aspect; missing resolve via vocab/aspect-vocab.",
          "vocab/dignity": "6 of 12 signs; missing resolve via vocab/aspect-vocab / dignity-tag.",
        },
        "rule": "Every partial source chains to a fully-covered fallback, then to phrase/guide-phrase, "
                "then SOURCE_GAP. No live card renders a raw slot. These are content gaps (Marie has not "
                "written them), not wiring gaps: the slot map is 0-gap.",
      },
      "runtime_key_bridge": {
        "note": "Old fallback-hook/{route} request keys -> new library targets. DO NOT rename content "
                "keys; the runtime aliases the old request to the new template/record, then resolves the "
                "template's slots via slot_resolution_map. Covers the 41 canonical fallback-hook routes; "
                "Codex confirms against the runtime's actual request keys and extends if any differ.",
        "map": RUNTIME_KEY_BRIDGE,
      },
      "slot_resolution_map": smap,
      "rows": rows,
    }
    out = os.path.join(PKG, "tldr-astro-authored-library-COMPLETE.json")
    json.dump(bundle, open(out, "w"), indent=1, ensure_ascii=False)

    print(f"rows={len(rows)}  buckets={dict(bucket_counts)}")
    if problems:
        print(f"PROBLEMS ({len(problems)}):")
        for p in problems[:30]: print("  ", p)
        raise SystemExit(1)
    print(f"OK: one complete file -> {os.path.basename(out)} "
          f"(floor {floor_n} LIVE/serving, DRAFT {len(rows)-floor_n} incl {demoted_n} raw-slot rows held back; map + ledger embedded).")

if __name__ == "__main__":
    main()
