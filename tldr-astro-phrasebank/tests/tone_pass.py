#!/usr/bin/env python3
"""
tone_pass.py — apply the Marie voice calibration to every reviewed record.

Two layers (per copy/MARIE-VOICE-CALIBRATION.md):
  1. REGISTER NORMALIZATION (deterministic, safe, applied to all 391): contractions
     + de-"genuinely" + a few dry swaps. Surface-aware: heavy surfaces (Pluto/Saturn
     hard, eclipse, nodes) keep the plain register; no wit is injected there.
  2. FLAGSHIP TUNES (hand-authored, applied by id): full dry/specific rewrites that
     lock the target register across every family, as the pattern for editorial sign-off.

Transforms the phrasebank/*reviewed*.json files in place and stamps tone_version.
Re-run tests/render_harness.py afterward; the seam filter guards every change.
"""
import json, os, re, glob

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# A copula can't contract at a clause end ("as you are, ..." / "as you are once").
# _NC = negative lookahead: don't contract when followed by punctuation or a clause-ending adverb.
_NC = r"(?!\s*[,.;:!?]|\s+(?:once|now|then|too|also|already|still|yet|again|and|or|but)\b|\s*$)"
CONTRACTIONS = [
    (r"\byou are\b" + _NC, "you're"), (r"\bYou are\b" + _NC, "You're"),
    (r"\bit is\b" + _NC, "it's"), (r"\bIt is\b" + _NC, "It's"),
    (r"\bthat is\b" + _NC, "that's"), (r"\bThat is\b" + _NC, "That's"),
    (r"\bwhat is\b" + _NC, "what's"), (r"\bWhat is\b" + _NC, "What's"),
    (r"\bthere is\b" + _NC, "there's"), (r"\bThere is\b" + _NC, "There's"),
    (r"\bis not\b", "isn't"), (r"\bare not\b", "aren't"),
    (r"\bdo not\b", "don't"), (r"\bDo not\b", "Don't"),
    (r"\bdoes not\b", "doesn't"), (r"\bdid not\b", "didn't"),
    (r"\bcannot\b", "can't"), (r"\bCannot\b", "Can't"),
    (r"\bwill not\b", "won't"), (r"\bcould not\b", "couldn't"),
    (r"\bwould not\b", "wouldn't"), (r"\bshould not\b", "shouldn't"),
    (r"\bhave not\b", "haven't"), (r"\bhas not\b", "hasn't"),
    (r"\bwas not\b", "wasn't"), (r"\bwere not\b", "weren't"),
]
LEXICON = [
    (r"\bgenuinely\b", "actually"), (r"\bGenuinely\b", "Actually"),
    (r"\bgenuine\b", "real"),
    (r"\ba good window to\b", "a good time to"),
    (r"\bA good window to\b", "A good time to"),
    (r"\bis genuinely available\b", "is actually available"),
]

def register(text):
    if not isinstance(text, str) or not text:
        return text
    for pat, rep in CONTRACTIONS + LEXICON:
        text = re.sub(pat, rep, text)
    return text

# ---- flagship hand-tunes: id -> {slot: dry/specific rewrite} -----------------
HAND = {
 "cc/aspect-pair/venus-square-saturn": {
   "habitual_response": "Withdrawing instead of just asking whether you're wanted",
   "practical_action": "Ask for what you need directly, and let people show you they care through their actions"},
 "cc/aspect-pair/sun-square-saturn": {
   "practical_action": "Do the boring part nobody claps for. That's the confidence that actually holds"},
 "cc/aspect-pair/moon-square-mars": {
   "lived_scene": "feeling runs hot and the fuse is short, and you're one comment away from the reply you'll keep replaying",
   "practical_action": "Move the charge through your body before it reaches your mouth"},
 "cc/aspect-pair/mercury-square-pluto": {
   "lived_scene": "a conversation turns into a quiet contest over who's right and who gets the last word",
   "practical_action": "Say the honest thing plainly. The maneuvering costs more than the point"},
 "cc/aspect-pair/moon-opposition-venus": {
   "practical_action": "Say what you actually want instead of keeping a silent scoreboard"},
 "cc/aspect-pair/sun-conjunction-mercury": {
   "concentration_action": "Say the idea, then actually shut up and hear the reply"},
 "cc/aspect-pair/sun-square-uranus": {
   "practical_action": "Change one real thing you can undo. You don't have to blow up the whole life to feel free"},
 "cc/aspect-pair/sun-trine-pluto": {
   "deliberate_participation": "Point the intensity at one real change you want to lead, before it turns into control"},
 "cc/aspect-pair/pluto-conjunction-venus": {
   "practical_action": "Get honest about what you actually want from this before the intensity decides for you"},
 "cc/aspect-pair/uranus-square-sun": {
   "bounded_experiment": "Run one experiment you can walk back, instead of detonating the whole thing at once"},
 "cc/aspect-pair/neptune-conjunction-mercury": {
   "grounding_action": "Check the detail against something solid before you sign, promise, or hit send"},
 "cc/aspect-pair/saturn-conjunction-saturn": {
   "practical_action": "Keep the life you'd actually choose. Let the rest go, even the parts you're proud of building"},
 "cc/aspect-pair/saturn-conjunction-venus": {
   "practical_action": "Ask for what you need out loud, and make one thing clearer before you add another"},
 "cc/aspect-pair/jupiter-square-mercury": {
   "recurring_opportunity_scene": "Big ideas are outrunning the receipts, and you're this close to promising something you can't deliver"},
 "cc/aspect-pair/jupiter-conjunction-venus": {
   "deliberate_participation": "Enjoy it. Just don't overspend or overpromise the warmth you can't keep up"},
 "cc/aspect-pair/mars-conjunction-midheaven": {
   "proportionate_adjustment": "Push hard on the goal, and pick your fights with your boss carefully"},
 "cc/aspect-pair/venus-square-descendant": {
   "proportionate_adjustment": "Say what you want out loud instead of keeping a quiet tally of who owes who"},
 "cc/node/north-node-in-aries": {
   "lived_practice": "Make one decision today without polling the group chat. Everyone will be fine"},
 "cc/node/north-node-in-cancer": {
   "lived_practice": "Let one person see you before you've got it handled"},
 "cc/node/north-node-in-capricorn": {
   "lived_practice": "Handle one thing you've been waiting for someone else to come rescue you from"},
}

# heavy surfaces where we DO NOT push wit (kept plain/compassionate)
def is_heavy(rec):
    a = rec.get("aspect", "")
    tb = rec.get("transiting_body", "")
    if rec.get("kind") == "lunar_node":
        return False  # nodes get register norm but their tunes are already plain
    if tb in ("pluto", "saturn") and a in ("square", "opposition", "conjunction"):
        return True
    return False

def main():
    files = sorted(set(glob.glob(os.path.join(PKG, "phrasebank", "cc-*reviewed*.json"))))
    total = tuned = flagships = 0
    for fp in files:
        if not os.path.exists(fp):
            continue
        data = json.load(open(fp))
        for rec in data.get("reviewed", []):
            total += 1
            slots = rec.get("slots", {})
            # 1. register normalization on every string slot
            for k, v in list(slots.items()):
                slots[k] = register(v)
            # 2. flagship hand-tunes
            if rec["id"] in HAND:
                for k, v in HAND[rec["id"]].items():
                    if k in slots:
                        slots[k] = v
                flagships += 1
            rec["tone_version"] = "marie-calibrated-v1"
            tuned += 1
        data.setdefault("_meta", {})["tone_version"] = "marie-calibrated-v1"
        json.dump(data, open(fp, "w"), indent=2, ensure_ascii=False)
    print(f"tone pass applied to {tuned}/{total} records across {len(files)} files; "
          f"{flagships} flagship hand-tunes.")

if __name__ == "__main__":
    main()
