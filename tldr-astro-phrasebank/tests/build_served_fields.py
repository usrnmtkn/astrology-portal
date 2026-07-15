#!/usr/bin/env python3
"""
build_served_fields.py — the reader-facing field contract + internal blacklist.

Root cause of the "internal note leaked / duplicate sections / terse copy" bugs: the app renders row
fields too literally, treating long INTERNAL fields (originalityCheck, review_note, doctrine_source,
compose_note, ordering/instruction notes) as body sections, and repeating one field across TLDR /
Overview / What-it-means.

This emits cc-served-fields.json: for each rich file, the ORDERED reader-facing fields, the footer
field, and the global internal blacklist that must NEVER render. It validates that every reader field
exists and carries prose, and lists the NO-PROSE files whose surfaces must serve from the floor.
"""
import os, json, re

PB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank")

# file -> {reader:[fields in render order], footer:field|None, surfaces:[...]}
# "note" is an OPTIONAL reader field (generational caveat; present only on outer-planet aspects).
OPTIONAL = {"note", "guidance"}
CONTRACT = {
 "cc-natal-aspect":            {"reader": ["experience", "guidance", "note"], "footer": "astro",
                                "surfaces": ["you.natal_aspect", "natal.aspect"]},
 "cc-aspect-pair-reviewed":    {"reader": ["expanded_narrative"], "footer": None,
                                "extras": ["pull_quote.text", "marie_advice.text"],
                                "surfaces": ["you.transit_to_natal", "sky.aspect"]},
 "cc-planet-in-sign-reviewed": {"reader_by_surface": {"natal": ["natal_sign_story"], "sky": ["collective_shift"]},
                                "footer": None, "surfaces": ["me.natal_placement", "sky.planet_sign"]},
 "cc-planet-in-house-reviewed":{"reader_by_surface": {"natal": ["house_integration"], "horoscope": ["home_scene"]},
                                "footer": None, "surfaces": ["me.natal_placement", "home.planetary_horoscope"]},
 "cc-composite-typed":         {"reader": ["meaning", "experience", "advice"], "footer": "astro",
                                "surfaces": ["friends.composite"]},
 "cc-composite-aspect":        {"reader": ["experience", "guidance", "note"], "footer": "astro",
                                "surfaces": ["friends.composite_aspect"]},
 "cc-natal-angles-authored":   {"reader": ["reading"], "footer": None,
                                "surfaces": ["me.natal_angle"]},
 "cc-sky-points-authored":     {"reader": ["collective_reading"], "footer": None,
                                "surfaces": ["sky.point_placement"]},
 # long-form natal placement scaffold (5K) — each row is a standalone paragraph
 "cc-dignity-paragraphs":      {"reader": ["body"], "footer": None, "surfaces": ["me.natal_placement.dignity"]},
 "cc-ruler-bridge":            {"reader": ["body"], "footer": None, "surfaces": ["me.natal_placement.ruler"]},
 # retrograde slot (5K par.4) reuses the pre-existing per-planet retrograde readings (.text)
 "cc-natal-retrograde-authored":{"reader": ["text"], "footer": None, "surfaces": ["me.natal_placement.retro"]},
 "cc-sect-paragraphs":         {"reader": ["body"], "footer": None, "surfaces": ["me.natal_placement.sect"]},
 "cc-aspect-leadins":          {"reader": ["body"], "footer": None, "surfaces": ["me.natal_placement.aspects"]},
}

# Fields that must NEVER be rendered to a reader, on ANY row (metadata, QA, provenance, instructions).
INTERNAL_BLACKLIST = [
 "id", "kind", "pair", "aspect", "valence", "canonical_aspect", "relationshipType", "typeLabel",
 "status", "surface", "surfaces", "sign", "house", "angle", "body", "their_body", "your_body",
 "house_domain", "title", "astro",  # title/astro render as heading/footer, not body
 "template_family", "recommended_short_template", "recommended_long_template", "slots",
 "source_keys", "originalityCheck", "tone_version", "revoice_version", "doctrine_source",
 "review_note", "compose_note", "trace", "fields", "eyebrow", "requires_birth_time",
]

# Files with NO clean reader-facing prose -> their surfaces MUST serve from the floor / a clean sibling,
# never from these unsigned slot/template rows (else placeholders/instructions leak).
NO_PROSE = {
 "cc-natal-angle-reviewed":  "angle placements -> serve cc-natal-angles-authored (48 authored readings)",
 "cc-planetary-horoscope":   "planetary horoscope -> serve cc-planet-in-house-reviewed.home_scene",
 "cc-composite-reviewed":    "composite placements -> serve cc-composite-typed",
 "cc-synastry-reviewed":     "synastry -> serve authored-content synastry (floor)",
}

def prose_fields(name):
    p = os.path.join(PB, name + ".json")
    if not os.path.exists(p): return {}
    recs = json.load(open(p)).get("reviewed", [])
    return recs

def main():
    problems = []
    for name, spec in CONTRACT.items():
        recs = prose_fields(name)
        if not recs: problems.append(f"{name}: file missing/empty"); continue
        reader = spec.get("reader", []) + [f for v in spec.get("reader_by_surface", {}).values() for f in v]
        for f in reader:
            present = [r for r in recs if isinstance(r.get(f), str) and len(r.get(f, "").strip()) > 20]
            if not present:
                problems.append(f"{name}: reader field '{f}' present in 0 rows")
            elif f not in OPTIONAL and len(present) < len(recs) * 0.5:
                problems.append(f"{name}: required reader field '{f}' present in only {len(present)}/{len(recs)} rows")
    out = {
      "version": "served-fields-v1",
      "note": "Reader-facing field whitelist per file (render in order). Everything in "
              "internal_blacklist must NEVER render. Files in no_prose have no clean served prose; "
              "their surfaces serve from the floor / a clean sibling. TLDR pill = a short derived "
              "summary shown ONCE; body = the reader fields; footer = astro. Never repeat a field "
              "across TLDR and body.",
      "contract": CONTRACT,
      "internal_blacklist": sorted(set(INTERNAL_BLACKLIST)),
      "no_prose_files": NO_PROSE,
      "instruction_markers": ["entries are ordered", "do not apply", "factual context when no reviewed",
                              "needs Marie", "needs editorial", "decomposed to slots",
                              "prohibited seams cleared", "combine with ms/", "recommended_",
                              "template_family", "revoice_version", "tone_version"],
    }
    json.dump(out, open(os.path.join(PB, "cc-served-fields.json"), "w"), indent=1, ensure_ascii=False)
    print(f"wrote cc-served-fields.json | contract files: {len(CONTRACT)} | "
          f"internal blacklist: {len(set(INTERNAL_BLACKLIST))} | no-prose files: {len(NO_PROSE)}")
    if problems:
        print("PROBLEMS:"); [print("  ", p) for p in problems]; raise SystemExit(1)
    print("OK: every reader field present with prose in >=50% of rows.")

if __name__ == "__main__":
    main()
