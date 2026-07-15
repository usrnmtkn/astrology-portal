#!/usr/bin/env python3
"""
build_authored_library.py — package the AUTHORED library (the day's work) for import.

Source of truth (do not paraphrase):
  sources/tldr-astro-records.json          2642 authored records (hooks, fallback, vocab, phrase, ...)
  sources/TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md   the mustache slot templates (1A .. 6O)

This REPLACES the earlier hand-written cc-fallback-hooks.json / cc-vocab.json, which were
parallel inventions. Every row here carries the authored text verbatim plus its full
provenance so Codex can map deterministically.

Buckets (as requested: fallback, slot, vocabulary):
  cc-fallback-hooks.json     type in {hook, fallback}          -> the fallback hooks
  cc-slot-templates.json     mustache templates (verbatim)     -> the slot layer
  cc-vocab.json              type in {vocab, phrase}           -> the vocabulary
  cc-authored-content.json   every other authored type         -> nothing dropped

Nothing serves: status DRAFT, tier REVIEWED, lane preserved from source.
"""
import os, re, json

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(PKG, "sources")
PB  = os.path.join(PKG, "phrasebank")

# App-legal enums (see repo migrations). surface must be one of these; block_type must be an
# allowed label or null. We keep the semantic surface in source_snapshot.originalSurface and only
# emit app-legal values so the four files import with no importer-side normalization.
ALLOWED_SURFACES = {"sky", "you", "natal", "synastry", "composite", "relationship", "modifier"}
# Only fallback rows get a non-null block_type (fallback_template is app-legal); everything else null.

# type -> (semantic_surface, mode, block_type, prompt_version)
TYPE_MAP = {
 "hook":            ("you",          "feed",   "fallback_template", "authored-hook-v2.2"),
 "fallback":        ("sky",          "feed",   "fallback_template", "authored-fallback-v2.2"),
 "vocab":           ("modifier",      "feed",   None,              "authored-vocab-v2.2"),
 "phrase":          ("modifier",      "feed",   None,              "authored-phrase-v2.2"),
 "transit":         ("you",          "feed",   None,              "authored-transit-v2.2"),
 "lunation":        ("sky",          "feed",   None,              "authored-lunation-v2.2"),
 "synastry":        ("synastry",     "in_depth",None,             "authored-synastry-v2.2"),
 "house-theme":     ("modifier",     "feed",   None,              "authored-house-theme-v2.2"),
 "aspect-pair":     ("you",          "in_depth",None,             "authored-aspect-pair-v2.2"),
 "timing":          ("sky",          "feed",   None,              "authored-timing-v2.2"),
 "action":          ("modifier",     "feed",   None,              "authored-action-v2.2"),
 "closing":         ("modifier",     "feed",   None,              "authored-closing-v2.2"),
 "modifier":        ("modifier",     "feed",   None,              "authored-modifier-v2.2"),
 "event":           ("sky",          "feed",   None,              "authored-event-v2.2"),
 "event-horoscope": ("sky",          "feed",   None,              "authored-event-horoscope-v2.2"),
 "event-action":    ("modifier",     "feed",   None,              "authored-event-action-v2.2"),
 "table-row":       ("modifier",     "feed",   None,              "authored-table-row-v2.2"),
 "structure":       ("modifier",     "feed",   None,              "authored-structure-v2.2"),
 "template":        ("modifier",     "feed",   None,              "authored-template-v2.2"),
}
FALLBACK_TYPES = {"hook", "fallback"}
VOCAB_TYPES    = {"vocab", "phrase"}

def to_row(rec):
    t = rec["type"]
    semantic, mode, block_type, pv = TYPE_MAP.get(t, ("modifier", "feed", None, "authored-v2.2"))
    surface = semantic if semantic in ALLOWED_SURFACES else "modifier"
    # Provenance vs lifecycle: Marie-verbatim rows (source status CONFIRMED) get tier CONFIRMED,
    # but EVERY row imports at lifecycle status DRAFT so nothing serves until human sign-off.
    raw_status = rec.get("status")
    tier = "CONFIRMED" if raw_status == "CONFIRMED" else "REVIEWED"
    return {
        "content_key": rec["key"],
        "surface": surface, "mode": mode,
        "status": "DRAFT",
        "event_type": t,
        "headline": "", "summary": "",
        "body": rec["text"],
        "sections": {}, "facts": {}, "knowledge_ids": [],
        "source_snapshot": {
            "contentType": t,
            "originalSurface": semantic,
            "originalStatus": raw_status,
            "category": rec.get("category"),
            "scope": rec.get("scope"),
            "condition": rec.get("condition"),
            "facet": rec.get("facet"),
            "variant": rec.get("variant"),
            "review": rec.get("review"),
            "provenance": rec.get("provenance"),
            "sourceFile": rec.get("sourceFile"),
            "sectionRef": rec.get("sectionRef"),
            "lane": rec.get("lane"),
        },
        "prompt_version": pv,
        "block_type": block_type,
        "reviewer_notes": "",
        "tier": tier,
    }

def parse_mustache_templates(md_path):
    """Extract every '## <id>. <name>' + following ```mustache block, verbatim."""
    text = open(md_path).read()
    rows = []
    # each template heading like: ## 6B. Collective planet in sign: inner planet
    pat = re.compile(r"^##\s+(\d+[A-Z])\.\s+(.+?)\s*$", re.M)
    heads = [(m.group(1), m.group(2), m.start()) for m in pat.finditer(text)]
    for i, (tid, name, start) in enumerate(heads):
        end = heads[i + 1][2] if i + 1 < len(heads) else len(text)
        chunk = text[start:end]
        blocks = re.findall(r"```mustache\n(.*?)```", chunk, re.S)
        if not blocks:
            continue
        body = blocks[0].rstrip("\n")
        slots = sorted(set(re.findall(r"\{\{[#^/]?([\w.]+)\}\}", body)))
        section = int(re.match(r"(\d+)", tid).group(1))
        surface = {1: "you", 2: "sky", 3: "you", 4: "you", 5: "natal", 6: "sky"}.get(section, "content")
        rows.append({
            "content_key": f"slot-template/{tid}",
            "surface": surface, "mode": "feed", "status": "DRAFT",
            "event_type": "slot-template",
            "headline": name, "summary": "",
            "body": body,
            "sections": {"slots": slots},
            "facts": {}, "knowledge_ids": [],
            "source_snapshot": {"contentType": "mustache-template", "templateId": tid,
                                "originalSurface": surface, "kind": "slot_template",
                                "sourceFile": "TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md"},
            "prompt_version": "mustache-madlib-v2.2",
            "block_type": None, "reviewer_notes": "",
            "tier": "REVIEWED",
        })
    return rows

def dump(path, rows, note):
    out = {"tier": "REVIEWED",
           "_meta": {"note": note, "count": len(rows), "source": "tldr-astro-records.json / MUSTACHE-MADLIBS-v2.2"},
           "reviewed": rows}
    json.dump(out, open(path, "w"), indent=1, ensure_ascii=False)

def main():
    records = json.load(open(os.path.join(SRC, "tldr-astro-records.json")))["records"]
    rows = [to_row(r) for r in records]

    fallback = [r for r in rows if r["event_type"] in FALLBACK_TYPES]
    vocab    = [r for r in rows if r["event_type"] in VOCAB_TYPES]
    other    = [r for r in rows if r["event_type"] not in (FALLBACK_TYPES | VOCAB_TYPES)]
    slots    = parse_mustache_templates(os.path.join(SRC, "TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md"))

    dump(os.path.join(PB, "cc-fallback-hooks.json"), fallback,
         "Authored fallback hooks (type=hook: daily + event-fallback; type=fallback: slot templates). "
         "Verbatim from tldr-astro-records.json; replaces the earlier hand-written hooks.")
    dump(os.path.join(PB, "cc-slot-templates.json"), slots,
         "Mustache slot templates (1A..6O) verbatim from MUSTACHE-MADLIBS-v2.2. body holds the "
         "template; sections.slots lists every interpolation slot. Interpretive slots resolve from "
         "cc-vocab.json / authored records; fact slots from calculated astrology.")
    dump(os.path.join(PB, "cc-vocab.json"), vocab,
         "Authored vocabulary (type=vocab: planet-in-sign, lived-behaviors, hook-moves, actions, "
         "closings, planet-vocab, career, ...; type=phrase: guide-phrase, pull-quote, ...). "
         "Verbatim from tldr-astro-records.json; replaces the earlier hand-written vocab.")
    dump(os.path.join(PB, "cc-authored-content.json"), other,
         "Remaining authored records (transit, lunation, synastry, house-theme, aspect-pair, timing, "
         "action, closing, modifier, event, table-row, structure, template) so nothing is dropped.")

    print(f"records={len(rows)}  fallback={len(fallback)}  slots={len(slots)}  vocab={len(vocab)}  other={len(other)}")

if __name__ == "__main__":
    main()
