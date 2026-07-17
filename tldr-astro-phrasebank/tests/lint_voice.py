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
    "alignment", "activation",
    # words Marie explicitly rejected in context (feelings), keep banned:
    "settle", "settles", "settled", "settling", "steady", "steadier", "steadiness",
    "shrink", "shrinks", "shrinking",
]
# NOTE: "real / actually / truth / energy / comfort / navigate / performing / the version of you /
# healing / transformation / meaningful" are NOT banned. Marie uses them in her own posts. The old
# blocklist was banning her own vocabulary. Match the mechanics (WRITING-STANDARD.md), not a word list.
# phrase-level bans — only genuine generic-AI-astrology tells Marie does NOT use,
# plus the room-as-setting metaphor she flagged.
PHRASES = [
    "holding space", "leaning into", "your journey", "this energy invites",
    "the connection asks", "moves through your topics", "this placement becomes",
    "this is about", "the thread",
    # room-as-social-setting metaphor (NOT "room to breathe/roam", which is space)
    "the room", "a room", "room's", "in the room", "read the room", "reads the room",
    "the whole room", "everyone in the room",
]

REGEXES = []

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
    for pat, label in REGEXES:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            hits.append((label, m.group(0).replace("\n", " ").strip()))
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
