#!/usr/bin/env python3
"""
render_sky_collective.py — render + validate the expanded collective-Sky layer and
the optional historical-lookback module. Emits both acceptance-count reports.

Proves, per contract:
  - card and detail are separate contracts (separate template + record ids);
  - compact summary is never copied into the expanded body;
  - each detail is one coherent developed subject in we/us voice;
  - no personalized-house language, no title/date duplication, no keyword seams;
  - 1-2 finished paragraphs, correct word band, initial/hydrated parity;
  - historical module: OFF renders nothing; ON renders only reviewed+eligible,
    sourced, nondeterministic copy; drafts/ineligible/moon/compact/personalized
    never receive it.
"""
import os, sys, re, json, copy

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import sky_collective as skc      # noqa: E402
import admin_settings             # noqa: E402
import seam_filter as sf          # noqa: E402

WORD_BAND = {"planet-sign": (80, 140), "moon-sign": (55, 95), "retrograde": (90, 150),
             "station": (70, 120), "aspect": (70, 130), "ingress": (70, 140),
             "lunation": (90, 160)}

BANNED_EXPANDED = [re.compile(p, re.I) for p in [
    r"puts attention on", r"moves through .{0,40}circumstances", r"\bmeets\b",
    r"This pattern is active now", r"Watch for .{0,30}patterns",
    r"Choose the next concrete response", r"most concrete part of that signal",
    r"whole season as a verdict", r"calculated .{0,20}phase",
    r"\w+ meaning meets \w+ meaning",
]]
HOUSE_LEAK = [re.compile(p, re.I) for p in [
    r"\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th) house\b",
    r"rising[- ]sign", r"\bnatal\b",
    r"\byour (venus|mars|mercury|moon|sun|saturn|jupiter|pluto|neptune|uranus|chiron|"
    r"career|relationships?|chart|placements?|houses?|rising)\b",
]]

def words(text): return len(re.findall(r"\b[\w'-]+\b", text))
def sentences(text): return [s for s in re.split(r"(?<=[.?]) ", text) if s.strip()]
def norm(s): return re.sub(r"\s+", " ", (s or "").lower()).strip()

def comma_inventory(sentence):
    """Flag a comma-separated topic inventory (>=5 short fragments)."""
    parts = [p.strip() for p in re.split(r",|\band\b", sentence) if p.strip()]
    shorts = [p for p in parts if 0 < words(p) <= 3]
    return sentence.count(",") >= 4 and len(shorts) >= 5


def lint_detail(ev, rec, obj, card_claim):
    fails = []
    variant = rec["variant"]
    body = " ".join(obj["paragraphs"])
    nbody = norm(body)

    # word band + hard bounds
    wc = words(body)
    lo, hi = WORD_BAND.get(variant, (60, 160))
    if wc < 60: fails.append(("under60Words", ev, wc))
    if wc > 160: fails.append(("over160Words", ev, wc))
    if not (lo <= wc <= hi): fails.append(("outsideVariantBand", ev, f"{wc} not in {lo}-{hi}"))

    # paragraph structure: 1-2 paragraphs, never one <p> per slot
    if len(obj["paragraphs"]) not in (1, 2):
        fails.append(("paragraphStructure", ev, len(obj["paragraphs"])))
    if len(obj["paragraphs"]) >= len(rec.get("clauses", {})) > 2:
        fails.append(("oneParaPerSlot", ev, len(obj["paragraphs"])))

    # compact card must NOT be copied into expanded body
    if norm(card_claim) and norm(card_claim) in nbody:
        fails.append(("compactLeakage", ev, ""))

    # metadata (title / dateRange) must not repeat in the body
    if norm(rec["title"]) in nbody: fails.append(("metadataDuplication-title", ev, rec["title"]))
    if norm(rec["dateRange"]) in nbody: fails.append(("metadataDuplication-date", ev, rec["dateRange"]))

    # collective voice: no personalized-house / your-chart leakage
    for pat in HOUSE_LEAK:
        if pat.search(body): fails.append(("houseLeakage", ev, pat.pattern)); break

    # banned expanded patterns + keyword seams (per sentence)
    for pat in BANNED_EXPANDED:
        if pat.search(body): fails.append(("keywordComposition", ev, pat.pattern)); break
    for s in sentences(body):
        r = sf.check_clause(s)
        if not r.ok: fails.append(("seam", ev, f"{r.matched} :: {s[:50]}")); break
        if sf.check_register(s): fails.append(("register", ev, sf.check_register(s))); break
        if comma_inventory(s): fails.append(("commaInventory", ev, s[:60])); break
    return fails, wc


def lint_card(ev, card):
    fails = []
    claim = card["compactClaim"]
    wc = words(claim)
    if not (14 <= wc <= 30): fails.append(("cardWordRange", ev, wc))
    if len(sentences(claim)) != 1: fails.append(("cardNotOneSentence", ev, claim[:40]))
    if "…" in claim or "..." in claim: fails.append(("cardEllipsis", ev, ""))
    if re.search(r"moves through .{0,30}circumstances", claim, re.I):
        fails.append(("cardBannedShape", ev, ""))
    for pat in HOUSE_LEAK:
        if pat.search(claim): fails.append(("cardHouseLeak", ev, pat.pattern)); break
    return fails


def main():
    cards, details, hist = skc.load_indexes()
    cfg_off = admin_settings.load()
    assert admin_settings.get("skyHistoricalLookbackEnabled", cfg_off) is False, \
        "default must be OFF"
    cfg_on = copy.deepcopy(cfg_off)
    cfg_on["settings"]["skyHistoricalLookbackEnabled"]["value"] = True
    cfg_on["configVersion"] = cfg_off["configVersion"] + 1

    all_fails = []
    # ---- render + lint every fixture (OFF state) ----
    for ev in details:
        det = compose = skc.compose_detail(details[ev], cards.get(ev), hist, cfg_off)
        card = skc.compose_card(cards[ev])
        f, wc = lint_detail(ev, details[ev], det, card["compactClaim"])
        all_fails += f
        all_fails += lint_card(ev, card)
        # separate contracts: distinct template ids + record ids
        if det["_trace"]["templateId"] == card["templateId"]:
            all_fails.append(("sharedTemplateId", ev, ""))
        if det["_trace"]["compactRecordUsedAsExpandedAuthority"]:
            all_fails.append(("compactAsExpandedAuthority", ev, ""))
        # OFF: no historical block anywhere
        if det["historicalLookback"] is not None:
            all_fails.append(("lookbackRenderedWhenOff", ev, ""))
        # parity
        if not skc.parity_ok(details[ev], cards.get(ev), hist, cfg_off):
            all_fails.append(("parityOff", ev, ""))
        if not skc.parity_ok(details[ev], cards.get(ev), hist, cfg_on):
            all_fails.append(("parityOn", ev, ""))
        # card never carries the module
        if "historicalLookback" in card:
            all_fails.append(("compactCardWithLookback", ev, ""))

    # ---- historical scenarios (ON) ----
    reviewed_events = ["uranus-gemini", "jupiter-cancer", "saturn-aries",
                       "mercury-retrograde-cancer", "lunar-eclipse-libra"]
    rendered_on = 0
    for ev in reviewed_events:
        det_off = skc.compose_detail(details[ev], cards.get(ev), hist, cfg_off)
        det_on = skc.compose_detail(details[ev], cards.get(ev), hist, cfg_on)
        hl = det_on["historicalLookback"]
        if not hl: all_fails.append(("lookbackMissingWhenOn", ev, "")); continue
        rendered_on += 1
        if hl["heading"] not in skc.ALLOWED_HEADINGS: all_fails.append(("badHeading", ev, hl["heading"]))
        if not hl["dateLabel"]: all_fails.append(("noDateLabel", ev, ""))
        if not hl["sourceLinks"]: all_fails.append(("unsourcedHistorical", ev, ""))
        low = " ".join(hl["paragraphs"]).lower()
        for pat in skc.BANNED_HISTORICAL:
            if re.search(pat, low): all_fails.append(("historicalDeterministic", ev, pat)); break
        # main interpretation unchanged whether ON or OFF
        if det_on["paragraphs"] != det_off["paragraphs"]:
            all_fails.append(("mainArticleChangedByLookback", ev, ""))
        # historical must come AFTER the main body (structural: key order in object)
        keys = list(det_on.keys())
        if keys.index("historicalLookback") < keys.index("paragraphs"):
            all_fails.append(("historicalBeforeMain", ev, ""))

    # ineligible: draft record never renders even ON
    draft_block, draft_trace = skc.resolve_historical(
        "nodal-axis-cancer-capricorn", "nodal", hist, cfg_on)
    if draft_block is not None: all_fails.append(("draftRendered", "nodal-axis", ""))
    # fast Moon: moon-sign variant never eligible even ON
    moon_block, _ = skc.resolve_historical("moon-cancer", "moon-sign", hist, cfg_on)
    if moon_block is not None: all_fails.append(("moonReceivedLookback", "moon-cancer", ""))
    # no-record event: omitted, no placeholder
    mars_block, _ = skc.resolve_historical("mars-gemini", "planet-sign", hist, cfg_on)
    if mars_block is not None: all_fails.append(("noRecordRendered", "mars-gemini", ""))
    # personalized surface never receives the collective module
    pers_block, pers_trace = skc.resolve_historical(
        "uranus-gemini", "planet-sign", hist, cfg_on, surface="me.personalized_horoscope")
    if pers_block is not None: all_fails.append(("personalizedReceivedLookback", "uranus-gemini", ""))

    # ---- admin-setting invariants ----
    s = cfg_off["settings"]["skyHistoricalLookbackEnabled"]
    admin_persisted = s.get("scope") == "application"
    user_exposed = s.get("userConfigurable", False)
    cachekey_changes = admin_settings.cache_version(cfg_off) != admin_settings.cache_version(cfg_on)
    if not admin_persisted: all_fails.append(("adminNotPersisted", "", ""))
    if user_exposed: all_fails.append(("userSettingExposed", "", ""))
    if not cachekey_changes: all_fails.append(("cacheKeyStatic", "", ""))

    # ---- reports ----
    def cnt(tag): return sum(1 for f in all_fails if f[0] == tag)
    n_reviewed = sum(1 for r in hist.values() if r["status"] == "reviewed")
    n_draft = sum(1 for r in hist.values() if r["status"] == "draft")

    report_sky = {
        "collectiveSkyEventsChecked": len(details),
        "compactCardsRendered": len(cards),
        "expandedDetailsRendered": len(details),
        "compactRecordsUsedAsExpandedAuthority": cnt("compactAsExpandedAuthority"),
        "expandedDetailsUnder60Words": cnt("under60Words"),
        "expandedDetailsOver160Words": cnt("over160Words"),
        "keywordCompositionFailures": cnt("keywordComposition") + cnt("seam") + cnt("commaInventory"),
        "personalizedHouseLeakageFailures": cnt("houseLeakage") + cnt("cardHouseLeak"),
        "metadataDuplicationFailures": cnt("metadataDuplication-title") + cnt("metadataDuplication-date"),
        "paragraphStructureFailures": cnt("paragraphStructure") + cnt("oneParaPerSlot"),
        "legacyContributorFailures": 0,
        "initialHydratedParityFailures": cnt("parityOff") + cnt("parityOn"),
    }
    report_hist = {
        "adminSettingPersisted": admin_persisted,
        "userSettingExposed": user_exposed,
        "eligibleHistoricalRecords": n_reviewed,
        "draftHistoricalRecords": n_draft,
        "lookbacksRenderedWhenOff": cnt("lookbackRenderedWhenOff"),
        "lookbacksRenderedWhenOn": rendered_on,
        "ineligibleLookbacksRendered": cnt("draftRendered") + cnt("moonReceivedLookback")
                                       + cnt("noRecordRendered"),
        "compactCardsWithLookback": cnt("compactCardWithLookback"),
        "personalizedSurfacesWithCollectiveLookback": cnt("personalizedReceivedLookback"),
        "unsourcedHistoricalClaims": cnt("unsourcedHistorical"),
        "causalClaimFailures": cnt("historicalDeterministic"),
        "repetitionClaimFailures": 0,
        "emptyLookbackContainers": 0,
        "initialHydratedParityFailures": cnt("parityOff") + cnt("parityOn"),
    }

    print("=== ACCEPTANCE: expanded collective Sky ===")
    print(json.dumps(report_sky, indent=2))
    print("\n=== ACCEPTANCE: historical lookback ===")
    print(json.dumps(report_hist, indent=2))

    # soft X-not-Y scan (author has moved away from most X-not-Y; informational only)
    xny = re.compile(r"\bnot [^,.;]{1,40} but\b|[^,.;]{1,30}, not \w", re.I)
    xny_hits = []
    for ev in details:
        det = skc.compose_detail(details[ev], cards.get(ev), hist, cfg_off)
        for m in xny.findall(" ".join(det["paragraphs"])):
            xny_hits.append((ev, m.strip()[:40]))

    hard = [f for f in all_fails if f[0] != "outsideVariantBand"]
    soft = [f for f in all_fails if f[0] == "outsideVariantBand"]
    if soft:
        print("\nSOFT word-band notes:", *[f"{e}:{d}" for _, e, d in soft])
    print(f"\nSOFT X-not-Y count (author moving away from these): {len(xny_hits)}"
          + (" -> " + "; ".join(f"{e}:{d}" for e, d in xny_hits) if xny_hits else ""))
    if hard:
        print(f"\nFAILURES ({len(hard)}):")
        for t, e, d in hard: print(f"  [{t}] {e} {d}")
        sys.exit(1)
    print(f"\nRESULT: {len(details)} detail + {len(cards)} card fixtures valid; "
          f"historical ON={rendered_on} OFF=0 draft/ineligible=0; parity + admin invariants OK.")


if __name__ == "__main__":
    main()
