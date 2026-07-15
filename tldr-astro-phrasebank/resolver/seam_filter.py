"""
seam_filter.py
--------------
Rejects clauses that betray keyword-composed / concatenated prose.

Enforces the phrase-lane rules from the correction note:

  5. A clause must be REJECTED when it produces seams such as:
        "X moves through Y circumstances"
        "X brings ..."
        "topics" / "conditions" / "meets"
        "This transit reveals ..."
        "This pattern is active now ..."

  "This transit reveals" is not ALWAYS wrong, but it should be rejected when it
  merely summarizes what the preceding paragraphs already demonstrated.

The filter distinguishes two kinds of failure:

  HARD  - the clause is structurally a keyword seam and is never allowed.
  SOFT  - the clause uses a "summary opener" that is only allowed when it
          introduces genuinely NEW information, not a restatement.

Everything here is deterministic and unit-testable; there is no model call.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import List


# --------------------------------------------------------------------------- #
# Banned structural seams (HARD). These are the fingerprints of a composer
# that has stitched planet/sign/house keywords into a sentence.
# --------------------------------------------------------------------------- #
HARD_SEAM_PATTERNS: List[re.Pattern] = [
    # "Saturn moves through 8th-house circumstances / conditions / topics / matters"
    re.compile(
        r"\b\w+\s+(?:moves?|moving|travels?|passes?|passing)\s+through\s+"
        r"[\w\s'-]*\b(circumstances|conditions|topics|matters|themes|areas|domains|territory)\b",
        re.I,
    ),
    # "Venus brings <keyword list>" / "Saturn brings ..."
    re.compile(r"\b[A-Z]\w+\s+brings\b", re.I),
    # bare keyword-category nouns used as connective glue
    re.compile(r"\b(topics|conditions)\b\s*:?\s*$", re.I),
    # "X meets Y" as a symbol-collision shorthand
    re.compile(r"\b\w+\s+meets\s+\w+\b", re.I),
    # "This pattern is active now"
    re.compile(r"\bthis\s+(pattern|energy|configuration|placement)\s+is\s+active\s+now\b", re.I),
    # "governs / rules the topics of a, b, and c" keyword dumps
    re.compile(r"\b(governs|rules)\s+(the\s+)?(topics|areas|matters)\s+of\b", re.I),
    # comma-run of >=3 abstract nouns with no verb ("trust, money, intimacy, shared resources")
    re.compile(
        r"^\s*(?:[A-Za-z][A-Za-z\s-]{1,20},\s*){3,}(?:and\s+)?[A-Za-z][A-Za-z\s-]{1,20}\.?\s*$",
        re.I,
    ),
]

# --------------------------------------------------------------------------- #
# Summary openers (SOFT). Allowed only if the clause adds new information.
# --------------------------------------------------------------------------- #
SOFT_SUMMARY_OPENERS: List[re.Pattern] = [
    re.compile(r"^\s*this\s+transit\s+reveals\b", re.I),
    re.compile(r"^\s*this\s+aspect\s+(shows|reveals|highlights)\b", re.I),
    re.compile(r"^\s*in\s+other\s+words\b", re.I),
    re.compile(r"^\s*what\s+this\s+means\s+is\b", re.I),
]

# Weak stock transitions that must never become MANDATORY beats. They are not
# banned outright, but the slot-suppressor (see lane_priority.py) uses this set
# to detect a beat that only echoes the previous one.
STOCK_TRANSITIONS: List[re.Pattern] = [
    re.compile(r"^\s*you\s+may\s+be\s+noticing\b", re.I),
    re.compile(r"^\s*maybe\s+you\b", re.I),
    re.compile(r"^\s*this\s+transit\s+reveals\b", re.I),
]


# Banned register words (reflexive AI/self-help filler). Per the voice spec + Marie's
# ban list. Lexical lint, separate from the structural seam patterns above.
BANNED_REGISTER = [
    re.compile(r"\bshrink(?:ing|s)?\b", re.I),
    re.compile(r"\btake up space\b", re.I),
    re.compile(r"\bhold space\b", re.I),
    re.compile(r"\balignment\b", re.I),
    re.compile(r"\bshow up as your (?:best|authentic) self\b", re.I),
    # older register Marie has moved away from (per author guidance):
    re.compile(r"\bauthentic self\b", re.I),
    re.compile(r"\bmasks?\b", re.I),               # social mask / wearing a mask
    re.compile(r"\bhighest self\b", re.I),
]


def check_register(text: str):
    """Return the matched banned-register word, or '' if clean."""
    for pat in BANNED_REGISTER:
        m = pat.search(text or "")
        if m:
            return m.group(0)
    return ""


@dataclass
class SeamResult:
    ok: bool
    reason: str = ""
    kind: str = ""  # "hard" | "soft" | ""
    matched: str = ""


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _similarity(a: str, b: str) -> float:
    a = re.sub(r"[^a-z0-9 ]", "", (a or "").lower())
    b = re.sub(r"[^a-z0-9 ]", "", (b or "").lower())
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def check_clause(clause: str, prior_context: str = "") -> SeamResult:
    """
    Validate a single clause.

    prior_context is the text of the beats already emitted for this card. A
    soft summary opener is rejected if the clause it introduces is >= 0.55
    similar to the prior context (i.e. it merely restates), per the note:
    reject "This transit reveals" when it summarizes what came before.
    """
    text = _normalize(clause)
    if not text:
        return SeamResult(ok=False, reason="empty clause", kind="hard")

    for pat in HARD_SEAM_PATTERNS:
        m = pat.search(text)
        if m:
            return SeamResult(
                ok=False,
                reason="keyword seam / concatenated keywords",
                kind="hard",
                matched=m.group(0),
            )

    for pat in SOFT_SUMMARY_OPENERS:
        m = pat.search(text)
        if m:
            body = text[m.end():]
            if _similarity(body, prior_context) >= 0.55 or not body.strip():
                return SeamResult(
                    ok=False,
                    reason="summary opener restates prior beats (no new information)",
                    kind="soft",
                    matched=m.group(0),
                )
            # allowed: it opens with a summary phrase but introduces new content
            return SeamResult(ok=True, kind="soft", matched=m.group(0))

    return SeamResult(ok=True)


def filter_beats(beats: List[str]) -> "FilterReport":
    """Run check_clause across an ordered list of beats, threading context."""
    report = FilterReport()
    context = ""
    for i, beat in enumerate(beats):
        res = check_clause(beat, prior_context=context)
        report.results.append((i, beat, res))
        if not res.ok:
            report.rejected.append((i, beat, res))
        context = _normalize(context + " " + beat)
    return report


@dataclass
class FilterReport:
    results: list = field(default_factory=list)
    rejected: list = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.rejected


if __name__ == "__main__":
    # quick self-check
    samples = [
        "Saturn moves through 8th-house circumstances of trust and shared money.",
        "Venus brings affection, money, and pleasure.",
        "trust, money, intimacy, shared resources",
        "Affection cools whenever the moment calls for reassurance you are not sure you can give.",
        "This transit reveals that affection cools when reassurance is needed.",  # restates
    ]
    for s in samples:
        print(check_clause(s, prior_context="affection cools when reassurance is needed"), "::", s)
