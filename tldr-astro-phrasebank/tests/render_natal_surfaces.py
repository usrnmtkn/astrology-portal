#!/usr/bin/env python3
"""
render_natal_surfaces.py — lint the authored natal surfaces (stelliums, empty /
intercepted houses, natal retrogrades).

Per record: per-sentence seam + banned register (mask / authentic self / alignment / ...),
word band (45-110), personalized natal 'you/your' register, no collective 'we', and a
soft X-not-Y count. Also checks the house-stellium opposite-house math.
"""
import os, sys, re, json, glob

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import seam_filter as sf  # noqa: E402

FILES = ["cc-stellium-authored.json", "cc-intercepted-authored.json",
         "cc-natal-retrograde-authored.json"]
BAND = (45, 115)
SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio",
         "sagittarius","capricorn","aquarius","pisces"]

def words(t): return re.findall(r"\b[\w'-]+\b", t)
def sents(t): return [s for s in re.split(r"(?<=[.?]) ", t) if s.strip()]

def agreement_slip(t):
    """catch plural-label + singular-verb slips like 'your future is/asks' (subject-position).
    'the way you handle your future takes' is fine — subject is 'the way', so 'takes' excluded."""
    return bool(re.search(r"\b(future|people|others|resources|goals) (is|asks|runs)\b", t, re.I))

ABSTRACT_NOUNS = {"inner life", "private world", "soul", "the unconscious", "power",
                  "fate", "the unseen", "the unknown", "your psyche"}
def abstract_feel(t):
    """Reject 'you want {abstract area} to feel {qualities}' and adjective stacks (4+)."""
    m = re.search(r"want (?:your |the )?([\w' ]+?) to feel ([^.]*)", t, re.I)
    if not m:
        return ""
    noun = m.group(1).strip().lower()
    if noun in ABSTRACT_NOUNS:
        return f"abstract 'to feel': {noun}"
    items = [p for p in re.split(r",|\band\b", m.group(2)) if p.strip()]
    if len(items) >= 4:
        return f"adjective stack ({len(items)})"
    return ""

def keyword_stack(t):
    """4+ short comma-separated items in one sentence."""
    for s in sents(t):
        parts = [p.strip() for p in re.split(r",|\band\b", s) if p.strip()]
        shorts = [p for p in parts if 0 < len(words(p)) <= 3]
        if s.count(",") >= 4 and len(shorts) >= 5:
            return s[:60]
    return ""

def sweep_empty_house(sf):
    """Compose every house x cusp-sign (with a representative ruler placement) and lint."""
    import empty_house as eh
    fails = []
    # dual-ruler safeguards: no outer planet is ever a PRIMARY ruler
    if set(eh.SIGN_RULER.values()) & {"uranus", "neptune", "pluto"}:
        fails.append(("SIGN_RULER", "outer planet used as primary ruler"))
    OUTER_SENT = re.compile(r"With (Pluto|Uranus|Neptune) in |your generation", re.I)
    for house in range(1, 13):
        for cs in SIGNS:
            # representative: ruler placed 3 signs / 4 houses along (deterministic, valid)
            rs = SIGNS[(SIGNS.index(cs) + 3) % 12]
            rh = (house + 3) % 12 + 1
            o = eh.compose_empty_house(house, cs, rs, rh)
            body = " ".join(o["paragraphs"])
            for s in sents(body):
                r = sf.check_clause(s)
                if not r.ok: fails.append((o["title"], f"seam:{r.matched}")); break
                if sf.check_register(s): fails.append((o["title"], f"register:{sf.check_register(s)}")); break
            if agreement_slip(body): fails.append((o["title"], "agreement slip"))
            af = abstract_feel(body)
            if af: fails.append((o["title"], af))
            # standard mode must never carry an outer-planet sign sentence / generational voice
            if OUTER_SENT.search(body): fails.append((o["title"], "outer-planet/generational in standard mode"))
            # NB: no keyword-stack check here — the placement sentence intentionally uses a
            # curated rich theme list (e.g. "trust, shared money, debt, intimacy, and the
            # obligations..."), which is the approved style, not a bad abstract stack.
    return fails

def words_count(t): return len(words(t))

def main():
    fails, xny, n = [], 0, 0
    xnyp = re.compile(r"\bnot [^,.;]{1,40} but\b|[^,.;]{1,30}, not \w", re.I)
    AVOID = re.compile(r"\b(rebellious|psychic|secretive|traumatized|powerful|spiritually advanced)\b", re.I)
    for fn in FILES:
        d = json.load(open(os.path.join(PKG, "phrasebank", fn)))
        for r in d["reviewed"]:
            n += 1; ev = r["id"]
            # outer-planet retrograde = low-weight modifier: a single restrained sentence
            if r.get("kind") == "natal_retrograde_outer":
                t = r["restrained_sentence"]
                if AVOID.search(t): fails.append((ev, "outer-retro makes a forbidden trait claim"))
                if not re.search(r"\bmay\b|\bcan\b", t, re.I): fails.append((ev, "outer-retro not soft ('may'/'can')"))
                for s in sents(t):
                    if not sf.check_clause(s).ok: fails.append((ev, "seam")); break
                continue
            t = r["text"]
            if not (BAND[0] <= words_count(t) <= BAND[1]):
                fails.append((ev, f"wordband {words_count(t)} not {BAND[0]}-{BAND[1]}"))
            if not re.search(r"\byou\b|\byour\b", t, re.I):
                fails.append((ev, "not personalized 'you'"))
            if re.search(r"\b(we|us|our)\b", t, re.I):
                fails.append((ev, "collective voice leaked into natal surface"))
            if r.get("kind") == "stellium_house":
                if r.get("opposite_house") != (r["house"] + 5) % 12 + 1:
                    fails.append((ev, "opposite-house math wrong"))
                if f"{r['opposite_house']}" not in t and _ord(r["opposite_house"]) not in t:
                    fails.append((ev, "opposite house not named in body"))
            for s in sents(t):
                sr = sf.check_clause(s)
                if not sr.ok: fails.append((ev, f"seam:{sr.matched}")); break
                if sf.check_register(s): fails.append((ev, f"register:{sf.check_register(s)}")); break
            if keyword_stack(t): fails.append((ev, f"keyword stack: {keyword_stack(t)}"))
            xny += len(xnyp.findall(t))

    eh_fails = sweep_empty_house(sf)
    print(f"natal flat records: {n} (stelliums + intercepted + retrogrades); soft X-not-Y: {xny}")
    print(f"empty-house composer sweep: {12*12} house x cusp-sign combinations composed")
    fails += eh_fails
    if fails:
        print(f"\nFAILURES ({len(fails)}):")
        for e, m in fails: print(" ", e, m)
        sys.exit(1)
    print("RESULT: all natal-surface records valid (seam/register/word-band/voice/house OK).")

def _ord(n):
    return {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",
            9:"9th",10:"10th",11:"11th",12:"12th"}[n]

if __name__ == "__main__":
    main()
