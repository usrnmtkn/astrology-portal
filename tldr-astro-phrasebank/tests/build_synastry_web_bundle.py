#!/usr/bin/env python3
"""
build_synastry_web_bundle.py — drop-in patch for the app's relationship knowledge
bundle (packages/astro-knowledge/dist/relationships-web.json -> synastryAspects).

WHY: the Friends > Compatibility "EXACT DYNAMICS" lanes (What flows / Challenges /
Mixed) render each contact's body from the relationship knowledge bundle. Its
synastryAspects records only carry an abstract DRAFT `plainTranslation` in "A/B"
language with empty summaryShort/summaryDeep, and no angle/outer coverage — so
every cross-planet contact renders blank (only same-planet contacts survive, via a
hardcoded code fallback). This emits reader-facing Marie-voice summaryShort/
summaryDeep for every contact, in the bundle's own record shape, sourced from the
complete cc-synastry-reviewed. Codex merges these into synastryAspects (match by id).

Record shape (matches packages/astro-knowledge synastryAspects entries):
  { id: "A-<their>_B-<your>_<aspect>", planetA, planetB, aspect,
    summaryShort, summaryDeep, status }
Emits phrasebank/cc-synastry-web-bundle.json.
"""
import json, os

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(PKG, "phrasebank", "cc-synastry-reviewed.json")
DEST = os.path.join(PKG, "phrasebank", "cc-synastry-web-bundle.json")

# points the app actually forms synastry aspects between (App.tsx):
#   personal: sun moon mercury venus mars | social/outer: jupiter saturn uranus neptune pluto | angles: ascendant midheaven
APP_POINTS = {"sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","ascendant","midheaven"}
# fold short aliases to the canonical names the bundle uses
CANON = {"asc":"ascendant","mc":"midheaven"}

recs = json.load(open(SRC))["reviewed"]
out = []
seen = set()
for r in recs:
    if r.get("kind") != "synastry_aspect":
        continue
    a = CANON.get(r["their_body"], r["their_body"])
    b = CANON.get(r["your_body"], r["your_body"])
    if a not in APP_POINTS or b not in APP_POINTS:
        continue
    asp = r["aspect"]
    rid = f"A-{a}_B-{b}_{asp}"
    if rid in seen:
        continue
    seen.add(rid)
    s = r["slots"]
    scene, dyn, nav = s["relational_scene"], s["dynamic"], s["navigation"]
    out.append({
        "id": rid,
        "planetA": a, "planetB": b, "aspect": asp,
        "summaryShort": scene.rstrip(".") + ".",
        "summaryDeep": f"{scene.rstrip('.')}. {dyn.rstrip('.')}. {nav.rstrip('.')}.",
        "tier": r.get("tier", "template-generated-grounded"),
        "status": "DRAFT",
    })

bundle = {
    "_meta": {
        "title": "Synastry aspect bodies for relationships-web.json (Marie-voiced)",
        "target": "packages/astro-knowledge -> synastryAspects[*].summaryShort/summaryDeep (merge by id)",
        "count": len(out),
        "voice": "relational, second person about 'them' (their planet -> your planet)",
        "note": "summaryShort = scene; summaryDeep = scene. dynamic. navigation. Bespoke pairs are richer; the rest compose from Marie's contribute/receive banks. All DRAFT pending editorial sign-off.",
        "coverage": "every their->your contact among the 12 points the app aspects (5 personal + 5 social/outer + Asc/MC), all 5 aspects",
    },
    "synastryAspects": out,
}
json.dump(bundle, open(DEST, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(out)} synastry aspect bodies -> {DEST}")
