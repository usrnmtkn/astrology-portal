#!/usr/bin/env python3
"""
render_transit_house.py — EDITORIAL review of the long-term house-transit readings.

Beyond grammar/determinism, flags: em dashes, keyword stacks, vague constructions, generic
reassurance, unexplained stock conclusions, readings with no recognizable experience,
clauses with no bank provenance, and missing birth-time gating. Also enforces the required
structure: names what the transit makes harder to avoid, gives 2-3 experiences, shows both
the useful and difficult expression, and closes on a concrete response.

Reports authored coverage (authored / 84). Un-authored (body, house) pairs are pending, not
failures.
"""
import os, sys, re

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import transit_house as th  # noqa: E402
import seam_filter as sf    # noqa: E402

BAND = (90, 220)
DETERMIN = re.compile(r"\b(will definitely|guaranteed|always will|forces you to|destined|inevitably)\b", re.I)
VAGUE = re.compile(r"asks what is actually real|what is actually real|presses down|"
                   r"the settled version|goes to the root|will not leave it untouched|in the same breath", re.I)
REASSURE = re.compile(r"this is not (?:a )?punishment|everything happens for a reason|trust the process|"
                      r"the universe (?:has|wants)|everything will be fine|meant to be", re.I)
STOCK = re.compile(r"build something that lasts|built to last|something that lasts|meant to last|"
                   r"something more truly yours", re.I)

def words(t): return len(re.findall(r"\b[\w'-]+\b", t))
def sents(t): return [s for s in re.split(r"(?<=[.?]) ", t) if s.strip()]

def keyword_stack(t):
    """Flag a genuine stack: a run of 5+ consecutive short (<=3 word) comma items. A couple
    of short concrete lists in a sentence (e.g. 'a partner, close friend, client, or associate')
    are fine — only an unbroken pile-up trips this."""
    for s in sents(t):
        run = maxrun = 0
        for it in s.split(","):
            wc = len(re.findall(r"\b[\w'-]+\b", re.sub(r"\b(and|or)\b", "", it)))
            if 0 < wc <= 3:
                run += 1; maxrun = max(maxrun, run)
            else:
                run = 0
        if maxrun >= 5:
            return s[:60]
    return ""

def review(body, house):
    """Return list of editorial failures for one reading."""
    o = th.compose_transit_house(body, house)
    f = []
    text = " ".join(o["paragraphs"]); r = o["fields"]
    # structure (required fields)
    for key in ("p1_theme", "experiences", "difficult", "useful", "response", "source_keys"):
        if not r.get(key): f.append(f"missing {key}")
    # two or three recognizable experiences
    if len(re.findall(r"\bmay\b|\bmight\b", r.get("experiences",""), re.I)) < 2:
        f.append("fewer than 2 recognizable experiences")
    # birth-time gating
    if not o.get("requires_birth_time"): f.append("missing birth-time gating")
    # provenance (traceable to CC/Marie banks)
    if not (r.get("source_keys") and all(k.startswith(("cc/", "ms/")) for k in r["source_keys"])):
        f.append("clause not traceable to CC/Marie banks")
    # editorial red flags
    if "—" in text or "–" in text: f.append("em/en dash")
    if VAGUE.search(text): f.append(f"vague construction: {VAGUE.search(text).group(0)}")
    if REASSURE.search(text): f.append(f"generic reassurance: {REASSURE.search(text).group(0)}")
    if STOCK.search(text): f.append(f"unexplained stock conclusion: {STOCK.search(text).group(0)}")
    if DETERMIN.search(text): f.append("deterministic language")
    if keyword_stack(text): f.append(f"keyword stack: {keyword_stack(text)}")
    # therapy-word drift: 'wound'/'heal' must not replace lived experience (not 'health')
    tw = len(re.findall(r"\b(?:wounds?|wounded|heals?|healed|healing|healer)\b", text, re.I))
    if tw > 2: f.append(f"therapy-word overuse (wound/heal x{tw})")
    if not (BAND[0] <= words(text) <= BAND[1]): f.append(f"wordband {words(text)}")
    if not re.search(r"\byou\b|\byour\b", text, re.I): f.append("not personalized 'you'")
    for s in sents(text):
        sr = sf.check_clause(s)
        if not sr.ok: f.append(f"seam:{sr.matched}"); break
        if sf.check_register(s): f.append(f"register:{sf.check_register(s)}"); break
    return f

def main():
    authored = [(b, h) for b in th.PLANET for h in range(1, 13) if th.is_authored(b, h)]
    fails = []
    for b, h in authored:
        for msg in review(b, h):
            fails.append((f"{b} {th.ORD[h]}", msg))
    total = len(th.PLANET) * 12
    print(f"transit-by-house editorial review: {len(authored)}/{total} authored "
          f"({sorted(set(b for b,_ in authored))})")
    if fails:
        print(f"\nEDITORIAL FAILURES ({len(fails)}):")
        for who, msg in fails: print(f"  [{who}] {msg}")
        sys.exit(1)
    print(f"RESULT: all {len(authored)} authored readings pass editorial review.")

if __name__ == "__main__":
    main()
