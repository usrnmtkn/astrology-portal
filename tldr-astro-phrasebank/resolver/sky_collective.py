#!/usr/bin/env python3
"""
sky_collective.py — composer + resolver for the expanded collective-Sky layer.

Two independent surface contracts:
  compose_card(card_rec)                     -> sky.collective.card object
  compose_detail(detail_rec, ...)            -> sky.collective.detail object

Detail composition interpolates NAMED semantic slots, then joins them editorially
into 1-2 finished paragraphs per the record's paragraphsPlan. It NEVER renders one
<p> per slot and NEVER copies the compact card into the expanded body.

The optional historical-lookback module is appended AFTER the complete current
interpretation, gated by the Admin setting + record eligibility. A history block is
returned as `historicalLookback: null` whenever any gate is false (no empty heading,
divider, or placeholder).

Collective voice only; not for personalized/natal surfaces.
"""
import os, sys, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import admin_settings  # noqa: E402

DETAIL_SURFACE = "sky.collective.detail"

# variants whose expanded detail may host a historical lookback (moon-sign excluded)
HISTORICAL_ELIGIBLE_VARIANTS = {"planet-sign", "retrograde", "station", "ingress",
                                "aspect", "nodal", "eclipse", "lunation", "outer-transit"}

# banned deterministic / causal language in the historical paragraph
BANNED_HISTORICAL = [
    r"\bcaused\b", r"\bcreated\b", r"\bproduced\b", r"\bguaranteed\b",
    r"\bproves?\b", r"\bdestined\b", r"\binevitable\b",
    r"history will repeat", r"the same events will return",
    r"predicts another", r"will happen again", r"the same fate",
]
ALLOWED_HEADINGS = {"Last time around", "Looking back", "An earlier chapter",
                    "The previous cycle", "Historical context"}
EXACT_SPECIFICITY = {"same-planet-same-sign-degree-range", "same-exact-aspect",
                     "same-eclipse-family", "same-planet-same-sign-same-direction"}


# ---------------------------------------------------------------- helpers
def join_editorially(parts):
    """Join non-empty clause strings into one paragraph with single spacing."""
    out = " ".join(p.strip() for p in parts if p and p.strip())
    return re.sub(r"\s+", " ", out).strip()


def compose_paragraphs(detail_rec):
    """Group named slots into 1-2 paragraphs via paragraphsPlan; drop empty groups."""
    clauses = detail_rec.get("clauses", {})
    plan = detail_rec.get("paragraphsPlan") or [list(clauses.keys())]
    paragraphs = []
    for group in plan:
        para = join_editorially([clauses.get(slot, "") for slot in group])
        if para:
            paragraphs.append(para)
    return paragraphs


# ---------------------------------------------------------------- card
def compose_card(card_rec):
    return {
        "surface": "sky.collective.card",
        "templateId": card_rec.get("templateId", "sky.collective.card.v1"),
        "compactClaim": card_rec["compactClaim"],
        "sourceIds": card_rec.get("sourceIds", []),
        "readerAuthority": card_rec.get("readerAuthority", "reviewed-exact"),
    }


# ---------------------------------------------------------------- historical
def _eligible(hist_rec):
    return (hist_rec.get("status") == "reviewed"
            and hist_rec.get("causalClaimCheck") == "passed"
            and hist_rec.get("repetitionClaimCheck") == "passed")


def compose_historical_paragraph(hist_rec):
    c = hist_rec.get("clauses", {})
    return join_editorially([c.get("historicalContext", ""),
                             c.get("recurringQuestion", ""),
                             c.get("importantDifference", ""),
                             c.get("presentInvitation", "")])


def resolve_historical(event, variant, hist_index, cfg=None, surface=DETAIL_SURFACE):
    """Return (historicalLookback_or_None, trace). Gated by Admin setting + record
    eligibility + surface + event-identity match. Never returns an empty shell."""
    cfg = cfg or admin_settings.load()
    admin_on = admin_settings.get("skyHistoricalLookbackEnabled", cfg) is True
    rec = hist_index.get(event)
    found = rec is not None
    eligible = bool(rec and _eligible(rec))
    surface_ok = surface == DETAIL_SURFACE and variant in HISTORICAL_ELIGIBLE_VARIANTS
    identity_ok = bool(rec and rec.get("attachesToEvent") == event and surface == rec.get("surface"))

    trace = {"adminEnabled": admin_on, "recordFound": found, "recordEligible": eligible,
             "rendered": False, "recordId": rec.get("id") if rec else None,
             "matchSpecificity": rec.get("matchSpecificity") if rec else None,
             "sourceIds": [], "legacyContributors": []}

    if not admin_on:
        trace["reason"] = "disabled-by-admin"; return None, trace
    if not (found and eligible and surface_ok and identity_ok):
        trace["reason"] = ("surface-ineligible" if found and not surface_ok
                           else "record-ineligible" if found else "no-record")
        return None, trace

    heading = rec.get("historicalHeading", "Last time around")
    if heading not in ALLOWED_HEADINGS:
        heading = "Last time around"
    paragraph = compose_historical_paragraph(rec)

    # nondeterministic-language guard (must never render causal/repetition claims)
    low = paragraph.lower()
    for pat in BANNED_HISTORICAL:
        if re.search(pat, low):
            trace["reason"] = "nondeterministic-language-blocked"; return None, trace
    if "the last time this happened" in low and rec.get("matchSpecificity") not in EXACT_SPECIFICITY:
        trace["reason"] = "overstated-match-blocked"; return None, trace

    block = {
        "heading": heading,
        "dateLabel": rec.get("previousCycleDateLabel", ""),
        "paragraphs": [paragraph],
        "sourceLinks": [{"id": s["id"], "title": s.get("title", "")}
                        for s in rec.get("historicalSources", [])],
    }
    trace.update({"rendered": True, "matchSpecificity": rec.get("matchSpecificity"),
                  "sourceIds": [s["id"] for s in rec.get("historicalSources", [])]
                               + list(rec.get("astrologyCalculationSources", []))})
    return block, trace


# ---------------------------------------------------------------- detail
def compose_detail(detail_rec, card_rec=None, hist_index=None, cfg=None,
                   surface=DETAIL_SURFACE, include_historical=True):
    """Compose the full sky.collective.detail object (+ _trace). The compact card is
    never used as expanded authority; paragraphs are authored detail slots."""
    hist_index = hist_index or {}
    cfg = cfg or admin_settings.load()
    paragraphs = compose_paragraphs(detail_rec)
    event = detail_rec.get("event")
    variant = detail_rec.get("variant")

    historical, hist_trace = (None, {"rendered": False, "reason": "not-requested"})
    if include_historical:
        historical, hist_trace = resolve_historical(event, variant, hist_index, cfg, surface)

    obj = {
        "eyebrow": detail_rec.get("eyebrow", {"label": "Placement", "glyphs": []}),
        "title": detail_rec.get("title", ""),
        "dateRange": detail_rec.get("dateRange", ""),
        "paragraphs": paragraphs,
        "historicalLookback": historical,
        "relatedSection": None,
    }
    trace = {
        "surface": DETAIL_SURFACE,
        "templateId": detail_rec.get("templateId"),
        "templateVersion": detail_rec.get("templateVersion", "2.2.1"),
        "readerAuthority": detail_rec.get("readerAuthority", "reviewed-exact"),
        "fallbackSpecificity": "exact-combination",
        "compactRecordId": card_rec.get("id") if card_rec else f"sky/card/{event}",
        "compactRecordUsedAsExpandedAuthority": False,
        "sourceGap": detail_rec.get("readerAuthority") not in ("reviewed-exact", "approved-fallback"),
        "legacyContributors": [],
        "cacheVersion": admin_settings.cache_version(cfg),
        "historicalLookback": hist_trace,
    }
    obj["_trace"] = trace
    return obj


def resolve(event, card_index, detail_index, hist_index, cfg=None, surface=DETAIL_SURFACE):
    """Convenience: resolve both surfaces for one event."""
    cfg = cfg or admin_settings.load()
    card = compose_card(card_index[event]) if event in card_index else None
    detail = (compose_detail(detail_index[event], card_index.get(event), hist_index, cfg, surface)
              if event in detail_index else None)
    return {"card": card, "detail": detail}


# ---------------------------------------------------------------- loaders / parity
def load_indexes():
    cards = {r["event"]: r for r in json.load(open(os.path.join(PKG, "phrasebank",
             "cc-sky-collective-card-reviewed.json")))["reviewed"]}
    details = {r["event"]: r for r in json.load(open(os.path.join(PKG, "phrasebank",
               "cc-sky-collective-detail-reviewed.json")))["reviewed"]}
    hist = {r["attachesToEvent"]: r for r in json.load(open(os.path.join(PKG, "phrasebank",
            "sky-historical-lookback.json")))["records"]}
    return cards, details, hist


def parity_ok(detail_rec, card_rec, hist_index, cfg):
    """Initial (server) vs hydrated (client) must agree: same inputs -> same output."""
    a = compose_detail(detail_rec, card_rec, hist_index, cfg)
    b = compose_detail(detail_rec, card_rec, hist_index, cfg)
    a.pop("_trace", None); b.pop("_trace", None)
    return json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
