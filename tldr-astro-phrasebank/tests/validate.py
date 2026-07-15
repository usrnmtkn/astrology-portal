#!/usr/bin/env python3
"""
validate.py — verification for the TLDR Astro phrase-bank package.

Checks:
  1. resolver modules import and the collective vs personalized Sun-in-Cancer diverge.
  2. reviewed-clauses.json parses; every READER_READY narrative slot passes the seam filter.
  3. compact (card) copy differs from expanded (detail) copy where both exist.
  4. provenance integrity: every source_key referenced exists in the real source banks
     (cc-source-phrases.json / marie-source-phrases.json), or is a documented derived namespace.
  5. SOURCE_GAP entries carry no fabricated prose.
Exit non-zero on any failure.
"""
import json, os, sys, re

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(PKG, "resolver"))

SRC = os.environ.get("SRC_DIR")
fails, checks = [], 0
def check(name, cond, detail=""):
    global checks
    checks += 1
    print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f" :: {detail}" if detail and not cond else ""))
    if not cond:
        fails.append(name)

# 1. resolver + divergence
from surface_resolver import resolve, Request, Surface, house_for
import seam_filter, lane_priority, sect

coll = resolve(Request(Surface.SKY_PLANET_IN_SIGN, body="sun", current_sign="cancer"))
pers = resolve(Request(Surface.PLANETARY_HOROSCOPE_PERSONAL, body="sun", current_sign="cancer", rising_sign="gemini"))
check("resolver: collective Sun-in-Cancer uses planet-in-sign source",
      coll.primary_sources == ["cc/planet-in-sign/sun-in-cancer"])
check("resolver: Gemini-rising Sun-in-Cancer resolves to 2nd house",
      pers.house == 2, f"got {pers.house}")
check("resolver: collective and personalized recipes DIVERGE",
      coll.primary_sources != pers.primary_sources)
check("resolver: house math Cancer/Gemini-rising == 2", house_for("cancer", "gemini") == 2)
check("sect: copy suppressed without birth time+horizon",
      sect.chart_sect(sect.BirthData()) is None)
check("sect: transit sect-weighting flag is OFF (experimental)",
      sect.SECT_TRANSIT_WEIGHTING_ENABLED is False)

# 2/3/4/5 reviewed clauses
rc = json.load(open(os.path.join(PKG, "phrasebank", "reviewed-clauses.json")))
entries = rc["reviewed"]

NARRATIVE_SLOTS = {"expandedNarrative", "recognizableCollectiveSituation", "openingClaim",
                   "livedScenario", "integratedSignHouseStory", "recognizableMoment",
                   "compactSummary", "practicalResponse", "compassionateAgency",
                   "phaseAppropriateAction", "embodiedGuidance", "cycleRole"}

seam_fail = []
for e in entries:
    if e.get("status") != "READER_READY":
        continue
    prior = ""
    for slot, text in e.get("slots", {}).items():
        if slot in NARRATIVE_SLOTS and isinstance(text, str) and "{" not in text:
            res = seam_filter.check_clause(text, prior_context=prior)
            if not res.ok:
                seam_fail.append((e["id"], slot, res.reason))
            prior = (prior + " " + text)[-400:]
check("seam filter: all READER_READY narrative slots pass", not seam_fail,
      "; ".join(f"{i}/{s}:{r}" for i, s, r in seam_fail))

# compact != expanded
compact_fail = []
for e in entries:
    card = e.get("compactCardSlots", {})
    det = e.get("slots", {})
    cs = card.get("compactSummary")
    en = det.get("expandedNarrative")
    if cs and en and cs.strip() == en.strip():
        compact_fail.append(e["id"])
check("compact card differs from expanded narrative", not compact_fail, ",".join(compact_fail))

# provenance integrity
cc = json.load(open(os.path.join(SRC, "cc-source-phrases.json")))
ms = json.load(open(os.path.join(SRC, "marie-source-phrases.json")))
known = set(cc) | set(ms)
missing = []
for e in entries:
    for k in e.get("source_keys", []):
        if k not in known:
            missing.append((e["id"], k))
check("provenance: every source_key exists in the real source banks", not missing,
      "; ".join(f"{i}:{k}" for i, k in missing))

# SOURCE_GAP hygiene
gap_bad = []
for e in entries:
    if e.get("status") == "SOURCE_GAP":
        if e.get("slots") or e.get("source_keys"):
            gap_bad.append(e["id"])
check("SOURCE_GAP entries contain no fabricated prose or sources", not gap_bad, ",".join(gap_bad))

# at least the required fixtures are present and READER_READY (except the intended gap)
ids = {e["id"]: e for e in entries}
required_ready = ["transit.saturn-square-venus.long", "sky.sun-in-cancer.collective",
                  "home.sun-in-cancer.gemini-rising", "home.moon-forecast.phase.balsamic",
                  "home.moon-forecast.sign.cancer", "natal.sun-aquarius-9h.day"]
for r in required_ready:
    check(f"fixture present + READER_READY: {r}",
          r in ids and ids[r]["status"] == "READER_READY")
check("fixture present + SOURCE_GAP: transit.mars-conjunction-ascendant.short",
      ids.get("transit.mars-conjunction-ascendant.short", {}).get("status") == "SOURCE_GAP")

print(f"\n{checks - len(fails)}/{checks} checks passed.")
sys.exit(1 if fails else 0)
