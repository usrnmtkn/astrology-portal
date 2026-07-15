#!/usr/bin/env python3
"""
natal_retrograde.py — emit logic for natal retrograde.

Personal planets (Mercury, Venus, Mars, Jupiter, Saturn, Chiron) always show their warm
section. Outer planets (Uranus, Neptune, Pluto) are low-weight modifiers: by default only
the Rx marker shows; the restrained sentence is emitted ONLY when the planet is personally
prominent (stationary / angular / closely aspecting a personal planet, the chart ruler, or
an angle / part of a major configuration), and only after house + aspect context.
"""
import os, json

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTER = {"uranus", "neptune", "pluto"}
PROMINENCE_KEYS = ("stationary", "angular", "aspects_personal", "aspects_chart_ruler", "in_major_config")

_BANK = None
def _bank():
    global _BANK
    if _BANK is None:
        _BANK = {r["body"]: r for r in json.load(
            open(os.path.join(PKG, "phrasebank", "cc-natal-retrograde-authored.json")))["reviewed"]}
    return _BANK

def is_prominent(prominence):
    """prominence: dict of bool flags (any of PROMINENCE_KEYS)."""
    return any(bool(prominence.get(k)) for k in PROMINENCE_KEYS)

def retrograde_section(planet, prominence=None):
    """Return the text to render for a natal retrograde, or None for 'Rx marker only'.
    Personal planets -> warm section text. Outer planets -> restrained sentence iff prominent."""
    rec = _bank().get(planet)
    if rec is None:
        return None
    if planet not in OUTER:
        return rec.get("text")                       # personal: always the warm section
    if prominence and is_prominent(prominence):
        return rec.get("restrained_sentence")        # outer + prominent: one restrained sentence
    return None                                      # outer, not prominent: Rx marker only
