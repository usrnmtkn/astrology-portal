#!/usr/bin/env python3
"""
lint_voice.py — flag banned/soft words before any reader-facing copy ships.
Enforces WRITING-STANDARD.md "Do not use". Reads text from a file arg or stdin.
Usage: echo "the draft" | python3 tests/lint_voice.py   (exit 1 if any hit)
"""
import sys, re

# word-level bans (whole word, case-insensitive)
BANNED = [
    "settle", "settles", "settled", "settling",
    "steady", "steadier", "steadiness",
    "comfort", "comforts", "comforting", "comfortable",
    "warmth", "cool", "cools", "cooled", "cooling",
    "real", "really", "true", "truly", "truth", "truthful",
    "energy", "alignment", "activation", "navigating", "native",
    "physical",  # as in "life is physical"
]
# phrase-level bans
PHRASES = [
    "the catch", "holding space", "leaning into", "your journey", "the thread",
    "this is about", "this placement", "moves through your topics",
    "emotional clarity", "lasting stability", "meaningful growth",
    "of a thing", "the whole truth", "at its core", "the essence of",
]

def lint(text):
    hits = []
    for w in BANNED:
        for m in re.finditer(rf"\b{re.escape(w)}\b", text, re.IGNORECASE):
            s = max(0, m.start() - 25); e = min(len(text), m.end() + 25)
            hits.append((w, text[s:e].replace("\n", " ").strip()))
    low = text.lower()
    for p in PHRASES:
        i = low.find(p)
        if i != -1:
            hits.append((p, text[max(0, i-15):i+len(p)+15].replace("\n", " ").strip()))
    if "—" in text:
        hits.append(("em dash", "— present"))
    return hits

if __name__ == "__main__":
    text = open(sys.argv[1]).read() if len(sys.argv) > 1 else sys.stdin.read()
    hits = lint(text)
    if not hits:
        print("CLEAN"); sys.exit(0)
    for w, ctx in hits:
        print(f"  [{w}]  …{ctx}…")
    print(f"{len(hits)} banned term(s) found.")
    sys.exit(1)
