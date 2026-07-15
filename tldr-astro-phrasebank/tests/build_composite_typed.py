#!/usr/bin/env python3
"""
build_composite_typed.py — emit the relationship-type-aware composite lived layer to JSON.

One record per (pair, valence, type) that has been authored. Each carries the shared meaning
(same for every type), the type-specific experience + advice, and the astro footer. Aspects map
to valence buckets: conjunction->fused, square/opposition->friction, trine/sextile->flowing;
the JSON uses a canonical aspect per bucket (opposition shares friction, sextile shares flowing).
Tier REVIEWED (composed; awaiting sign-off). This is a partial rollout: 6 of 45 pairs so far.
"""
import os, sys, json
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import composite_typed as ct

CANON = {"fused": "conjunction", "friction": "square", "flowing": "trine"}

def main():
    records = []
    for pair, vals in ct.LIVED.items():
        a, b = pair.split("-")
        for val, types in vals.items():
            aspect = CANON[val]
            for t in ct.TYPES:
                if t not in types:
                    continue
                o = ct.compose_typed(a, b, aspect, t)
                records.append({
                    "id": f"cc/composite-typed/{pair}/{val}/{t}",
                    "pair": pair, "valence": val, "canonical_aspect": aspect,
                    "relationshipType": t, "typeLabel": ct.LABELS[t],
                    "title": o["title"], "meaning": o["meaning"],
                    "experience": o["paragraphs"][0], "advice": o["paragraphs"][1],
                    "astro": o["astro"], "paragraphs": o["paragraphs"], "trace": o["trace"],
                })
    out = {"tier": "REVIEWED",
           "_meta": {"surface": "composite_typed",
                     "note": "Relationship-type-aware composite lived layer. Shared meaning + per-type "
                             "experience/advice. Romantic language gated to romantic. PARTIAL rollout.",
                     "types": ct.TYPES, "pairs_authored": sorted(ct.LIVED.keys()),
                     "pairs_total": 45, "cells_authored": len(records)},
           "reviewed": records}
    path = os.path.join(PKG, "phrasebank", "cc-composite-typed.json")
    json.dump(out, open(path, "w"), indent=1, ensure_ascii=False)
    print(f"wrote {len(records)} typed composite cells ({len(ct.LIVED)}/45 pairs) -> {os.path.basename(path)}")

if __name__ == "__main__":
    main()
