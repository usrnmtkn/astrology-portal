"""
lane_priority.py
----------------
Source-to-slot contract enforcement + optional-beat slot suppression.

Phrase-lane rules from the correction note:

  1. Exact combination source FIRST:
        cc/aspect-pair/venus-square-saturn
        cc/planet-in-sign/sun-in-cancer
  2. Contextual records SECOND:
        cc/house/8
        cc/house/2
        cc/ref/outer-planets/saturn-transit
  3. Supporting records may REFINE the exact interpretation, but may not become
     independently concatenated sentences.
  4. Raw keywords remain METADATA ONLY.
  5. Seams are rejected (see seam_filter.py).

Slot / beat rules:
  * The template has up to six slots:
        1 headline
        2 timing and optional pass
        3 recognizable situation
        4 interpretive bridge
        5 optional practical response
        6 factual footer
  * It does NOT require six visibly separate beats every time.
  * Suppress any slot that merely repeats the preceding thought.
  * "You may be noticing / Maybe you / This transit reveals" must NOT become
    mandatory stock transitions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from difflib import SequenceMatcher
from enum import IntEnum
from typing import List, Optional

from seam_filter import STOCK_TRANSITIONS, check_clause


class Lane(IntEnum):
    EXACT = 0        # cc/aspect-pair/*, cc/planet-in-sign/*  (primary source)
    CONTEXT = 1      # cc/house/*, cc/ref/*                    (supporting only)
    KEYWORD = 2      # raw keyword metadata                    (never prose)


EXACT_PREFIXES = ("cc/aspect-pair/", "cc/planet-in-sign/", "cc/planet-in-house/",
                  "cc/moon-phase/", "cc/moon-sign/", "cc/daily/")
CONTEXT_PREFIXES = ("cc/house/", "cc/ref/", "cc/angle/", "cc/sign/")
KEYWORD_PREFIXES = ("cc/keyword/", "kw/")


def lane_of(source_id: str) -> Lane:
    sid = source_id.strip()
    if sid.startswith(EXACT_PREFIXES):
        return Lane.EXACT
    if sid.startswith(CONTEXT_PREFIXES):
        return Lane.CONTEXT
    return Lane.KEYWORD


@dataclass
class Record:
    source_id: str
    role: str            # "situation" | "refine" | "footer" | "keyword" ...
    text: str = ""

    @property
    def lane(self) -> Lane:
        return lane_of(self.source_id)


class SourceGap(Exception):
    """Raised (or returned as a sentinel) when no exact-pair source exists."""


SOURCE_GAP = "SOURCE_GAP"


def select_primary(records: List[Record]) -> Optional[Record]:
    """
    The lived situation MUST come from an exact-combination source. If none is
    present the caller should return SOURCE_GAP rather than assembling prose
    from keywords or houses.
    """
    exact = [r for r in records if r.lane is Lane.EXACT and r.role == "situation"]
    return exact[0] if exact else None


def enforce_lanes(records: List[Record]) -> List[str]:
    """
    Return the error messages for any lane violations:
      * a CONTEXT record used as an independent 'situation' sentence
      * a KEYWORD record used as prose at all
    """
    errors: List[str] = []
    for r in records:
        if r.lane is Lane.KEYWORD and r.role not in ("keyword", "metadata"):
            errors.append(f"{r.source_id}: raw keyword used as prose (role={r.role})")
        if r.lane is Lane.CONTEXT and r.role == "situation":
            errors.append(
                f"{r.source_id}: context record used as an independent situation "
                f"sentence (allowed role: 'refine' / 'locate' only)"
            )
    return errors


# --------------------------------------------------------------------------- #
# Slot / beat suppression
# --------------------------------------------------------------------------- #

class Slot(IntEnum):
    HEADLINE = 1
    TIMING = 2
    SITUATION = 3
    BRIDGE = 4
    RESPONSE = 5
    FOOTER = 6


@dataclass
class Beat:
    slot: Slot
    text: str
    optional: bool = False


def _sim(a: str, b: str) -> float:
    import re
    a = re.sub(r"[^a-z0-9 ]", "", (a or "").lower())
    b = re.sub(r"[^a-z0-9 ]", "", (b or "").lower())
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


@dataclass
class ComposeReport:
    emitted: List[Beat] = field(default_factory=list)
    suppressed: List[tuple] = field(default_factory=list)  # (Beat, reason)
    rejected: List[tuple] = field(default_factory=list)     # (Beat, SeamResult)

    @property
    def text(self) -> str:
        return "\n\n".join(b.text for b in self.emitted)


# HEADLINE, SITUATION and FOOTER are load-bearing; the rest may be suppressed.
REQUIRED_SLOTS = {Slot.HEADLINE, Slot.SITUATION, Slot.FOOTER}


def compose(beats: List[Beat], redundancy_threshold: float = 0.6) -> ComposeReport:
    """
    Compose a card from candidate beats, enforcing:
      * seam filter on every beat
      * suppression of any OPTIONAL beat that merely repeats a prior thought
      * suppression of a beat that is only a stock transition adding nothing
      * required slots are never suppressed for redundancy (but still seam-checked)
    """
    report = ComposeReport()
    context = ""

    for beat in sorted(beats, key=lambda b: b.slot):
        seam = check_clause(beat.text, prior_context=context)
        if not seam.ok:
            report.rejected.append((beat, seam))
            continue

        is_required = beat.slot in REQUIRED_SLOTS and not beat.optional

        if not is_required:
            # suppress if it just echoes prior context
            if context and _sim(beat.text, context) >= redundancy_threshold:
                report.suppressed.append((beat, "redundant with prior beat"))
                continue
            # suppress a stock transition that carries no new subject
            stripped = beat.text
            for pat in STOCK_TRANSITIONS:
                m = pat.match(stripped)
                if m:
                    tail = stripped[m.end():].strip(" ,.—-")
                    if not tail or _sim(tail, context) >= redundancy_threshold:
                        report.suppressed.append((beat, "empty stock transition"))
                        beat = None
                        break
            if beat is None:
                continue

        report.emitted.append(beat)
        context = (context + " " + beat.text).strip()

    return report
