#!/usr/bin/env python3
"""
consolidate.py — generate CONSOLIDATION-MANIFEST.md from ground truth.

Scans phrasebank/*.json, counts records, assigns tier (CONFIRMED = Marie's own words,
serve-verbatim; REVIEWED = composed/authored, needs Marie sign-off), groups by app surface,
and lists composers + harnesses. Optionally embeds the latest harness RESULT lines from a log
passed via HARNESS_LOG. Everything is read live so the manifest can never drift from the data.
"""
import os, sys, json, glob, datetime

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def count(d):
    for k in ("reviewed", "records", "cards", "templates", "readings", "quotes"):
        if isinstance(d.get(k), list):
            return len(d[k])
    # dict-keyed banks (e.g. clauses: {key: clause}) plus any list values
    n = 0
    for k, v in d.items():
        if k.startswith("_"):  # metadata blocks like _meta
            continue
        if isinstance(v, list):
            n += len(v)
        elif isinstance(v, dict):
            n += len(v)
    return n

def tier_of(fn, d=None):
    # prefer an explicit top-level tier, else infer from filename
    if d and d.get("tier"):
        return d["tier"]
    base = os.path.basename(fn)
    if base.startswith("ms-") or base.startswith("marie-confirmed"):
        return "CONFIRMED"
    return "REVIEWED"

# app surface -> [(file, surface label, composer/harness)]
GROUPS = [
 ("Natal — placements", [
   ("cc-planet-in-sign-reviewed.json", "Planet in sign", "—"),
   ("cc-planet-in-house-reviewed.json", "Planet in house", "—"),
   ("cc-natal-angle-reviewed.json", "Planet on the angles", "—"),
   ("cc-moon-reviewed.json", "Moon detail", "—"),
   ("cc-node-reviewed.json", "Lunar nodes", "—"),
   ("cc-chiron-reviewed.json", "Chiron (placement + aspect)", "—"),
   ("cc-natal-aspect.json", "Natal aspects (own-chart, 45 pairs)", "resolver/natal_aspect.py"),
   ("cc-tails-reviewed.json", "Asteroids / points", "—"),
   ("cc-ruler-sign-clauses.json", "Ruler-sign clause lookup (support)", "build_ruler_sign_clauses"),
   ("cc-ruling-planet-advice.json", "Chart-ruler advice (batches 1-2, verbatim)", "—"),
   ("cc-ruling-planet-advice-drafts.json", "Chart-ruler advice (batches 3-4, drafts)", "—"),
 ]),
 ("Natal — chart patterns", [
   ("cc-stellium-authored.json", "Stelliums", "—"),
   ("cc-intercepted-authored.json", "Intercepted signs", "—"),
   ("cc-empty-house-model.json", "Empty houses (composer model)", "resolver/empty_house.py"),
   ("cc-natal-retrograde-authored.json", "Natal retrogrades", "resolver/natal_retrograde.py"),
 ]),
 ("Transits", [
   ("cc-aspect-pair-reviewed*.json", "Transit-to-natal aspect bank", "—"),
   ("cc-transit-house.json", "Long-term house transit (84 bespoke)", "resolver/transit_house.py"),
   ("cc-transit-activation-model.json", "Transit activation composer (model)", "resolver/transit_activation.py"),
   ("cc-planetary-horoscope.json", "Planetary horoscope (current sky by rising)", "resolver/planetary_horoscope.py"),
 ]),
 ("Sky / horoscope surfaces", [
   ("cc-sky-collective-card-reviewed.json", "Collective Sky — card", "resolver/sky_collective.py"),
   ("cc-sky-collective-detail-reviewed.json", "Collective Sky — detail", "resolver/sky_collective.py"),
   ("cc-sky-events-reviewed.json", "Sky events (ingress/lunation/etc.)", "—"),
   ("sky-historical-lookback.json", "Historical lookback (admin-gated)", "resolver/admin_settings.py"),
   ("cc-horoscope-surface-templates.json", "Horoscope surface templates", "—"),
   ("cc-marie-site-templates.json", "Marie site voice lines + templates", "—"),
   ("cc-lunation-by-sign-authored.json", "Lunation by sign (authored)", "—"),
   ("ms-lunation-by-sign-confirmed.json", "Lunation by sign (Marie verbatim)", "—"),
 ]),
 ("Relationships", [
   ("cc-synastry-reviewed.json", "Synastry — inter-aspects + generic overlays", "—"),
   ("cc-synastry-overlay-full.json", "Synastry — house overlays (10x12)", "resolver/synastry_overlay.py"),
   ("cc-composite-reviewed.json", "Composite — planet in sign/house", "—"),
   ("cc-composite-aspect.json", "Composite — aspects, single-voice (fallback)", "resolver/composite_aspect.py"),
   ("cc-composite-typed.json", "Composite — aspects, 7 relationship types (partial: 6/45 pairs)", "resolver/composite_typed.py"),
 ]),
 ("Marie corpus (verbatim)", [
   ("marie-confirmed-quotes.json", "Confirmed pull-quotes", "—"),
   ("ms-satori-articles-confirmed.json", "Article quotes", "—"),
 ]),
 ("Authored library (fallback / slot / vocab)", [
   ("cc-fallback-hooks.json", "Authored fallback hooks (daily + event-fallback + fallback templates)", "tests/build_authored_library.py"),
   ("cc-slot-templates.json", "Mustache slot templates (1A..6O, verbatim)", "tests/build_authored_library.py"),
   ("cc-vocab.json", "Authored vocabulary (planet-in-sign, lived-behaviors, career, phrases, ...)", "tests/build_authored_library.py"),
   ("cc-authored-content.json", "Remaining authored records (transit/lunation/synastry/house-theme/...)", "tests/build_authored_library.py"),
   ("cc-moon-phase-bank.json", "Moon-phase scene/action fills (2A-2H, Marie lunation frame)", "tests/build_moon_phase_bank.py"),
   ("cc-slot-resolution-map.json", "Slot -> source resolution map (235 slots)", "tests/build_slot_resolution.py"),
 ]),
 ("Support / reference", [
   ("houses.json", "House reference data", "—"),
   ("reviewed-clauses.json", "Misc reviewed clauses", "—"),
   ("cc-transit-house-model.json", "Transit-house model doc", "—"),
 ]),
]

def files_for(pat):
    return sorted(glob.glob(os.path.join(PKG, "phrasebank", pat)))

def main():
    lines = []
    W = lines.append
    today = datetime.date.today().isoformat()
    W(f"# TLDR Astro — Consolidation Manifest\n")
    W(f"_Generated {today} from `phrasebank/` ground truth. Every count is read live._\n")

    grand = {"CONFIRMED": 0, "REVIEWED": 0, "SESSION_APPROVED_DRAFT": 0}
    surface_totals = []
    checklist = []

    for group, entries in GROUPS:
        W(f"\n## {group}\n")
        W("| Surface | Records | Tier | Composer / source |")
        W("|---|---:|---|---|")
        gtot = 0
        for pat, label, comp in entries:
            fs = files_for(pat)
            if not fs:
                W(f"| {label} | _missing_ | — | {comp} |")
                continue
            n = 0; tier = tier_of(fs[0], json.load(open(fs[0])))
            for f in fs:
                n += count(json.load(open(f)))
            gtot += n
            grand[tier] = grand.get(tier, 0) + n
            W(f"| {label} | {n} | {tier} | `{comp}` |")
            if tier == "REVIEWED" and n > 0:
                checklist.append((group, label, n))
        surface_totals.append((group, gtot))
        W(f"\n**{group} subtotal: {gtot} records**")

    total = grand["CONFIRMED"] + grand["REVIEWED"] + grand["SESSION_APPROVED_DRAFT"]
    W("\n## Totals\n")
    W("| Tier | Records | Meaning |")
    W("|---|---:|---|")
    W(f"| CONFIRMED | {grand['CONFIRMED']} | Marie's own words — serve verbatim, never re-linted |")
    W(f"| REVIEWED | {grand['REVIEWED']} | Composed / authored — **awaiting Marie sign-off** |")
    W(f"| SESSION_APPROVED_DRAFT | {grand['SESSION_APPROVED_DRAFT']} | Claude-drafted, Marie-reviewed — **DRAFT, pending dashboard confirmation** |")
    W(f"| **All** | **{total}** | |")

    hlog = os.environ.get("HARNESS_LOG")
    W("\n## Validation status\n")
    if hlog and os.path.exists(hlog):
        res = [l.rstrip() for l in open(hlog) if l.startswith("RESULT") or "checks passed" in l]
        for r in res:
            W(f"- {r}")
    else:
        W("- _(run `build_all.sh` and pass HARNESS_LOG to embed live results)_")

    W("\n## Marie sign-off checklist (REVIEWED → CONFIRMED)\n")
    W("Each line is a surface whose copy is composed/authored in Marie's voice and rules but has not yet been personally signed off. Signing off flips the tier and exempts it from tone re-linting.\n")
    for group, label, n in checklist:
        W(f"- [ ] **{label}** ({group}) — {n} records")

    out = os.path.join(PKG, "CONSOLIDATION-MANIFEST.md")
    open(out, "w").write("\n".join(lines) + "\n")
    print(f"wrote {out}")
    print(f"CONFIRMED={grand['CONFIRMED']}  REVIEWED={grand['REVIEWED']}  total={grand['CONFIRMED']+grand['REVIEWED']}")
    print(f"sign-off checklist items: {len(checklist)}")

if __name__ == "__main__":
    main()
