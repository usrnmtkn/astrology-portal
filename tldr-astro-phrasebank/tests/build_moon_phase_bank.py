#!/usr/bin/env python3
"""
build_moon_phase_bank.py — fills the 15 moon-phase gap slots (templates 2A-2H).

Grounded in Marie's own lunation frame:
  New Moon  = "a quiet time of reflection, rest, and seeding new intentions"; "plant, don't harvest";
              "begin a 6-month story" (modifier/context-new-moon, guide-phrases).
  Full Moon = "a time of fruition, the apex or fulfillment of an intention"; "culminates or becomes
              undeniable, something completes or has to be faced" (modifier/context-full-moon).
  Waning    = "release rather than lean in harder"; "familiar and overused" (south-node frame).
The waxing/waning intermediate phases carry that same arc, phrased in her voice.

Grammar-fit to the 2A-2H mustache templates: role=scene / result -> noun phrase (subject/object);
role=action -> imperative fragment. scope={phase, role}; keys cc/moon-phase/{phase}/{role}/alt{n}.
"""
import os, json

# phase -> role -> [variants]  (each drops into the matching 2A-2H template slot)
BANK = {
 "new-moon": {
   "scene":  ["The thing you are only just beginning to want",
              "The quiet idea you have not said out loud yet"],
   "action": ["one small intention to plant",
              "a single seed to set rather than a harvest to force"],
 },
 "waxing-crescent": {
   "scene":  ["the fragile first effort you have started",
              "the beginning that is still finding its footing"],
   "action": ["Add one steady piece and leave it alone.",
              "Feed it a little and resist checking whether it has grown yet."],
 },
 "first-quarter": {
   "scene":  ["The first real obstacle",
              "The gap between the intention and the actual work"],
   "action": ["take the step you can defend",
              "move before every doubt has cleared"],
 },
 "waxing-gibbous": {
   "scene":  ["the thing you have been building",
              "the effort that is nearly, but not quite, there"],
   "action": ["Fix one detail rather than starting the whole thing over.",
              "Tighten what is close before you add anything new."],
 },
 "full-moon": {
   "scene":  ["What you seeded at the last new moon",
              "An intention you set weeks ago, now come to fruition"],
   "result": ["what has actually come to fruition",
              "the thing that has become undeniable"],
 },
 "waning-gibbous": {
   "result": ["what the last two weeks have taught you",
              "the result you can finally name now that the light has peaked"],
 },
 "last-quarter": {
   "scene":  ["A structure that served the beginning",
              "The plan you set at the new moon"],
   "action": ["Release the part you have outgrown instead of leaning on it harder.",
              "Revise what no longer fits and keep only what still works."],
 },
 "balsamic": {
   "scene":  ["the cycle that is winding down",
              "whatever is ready to end"],
   "result": ["what has become familiar and overused",
              "the comfortable habit you keep returning to"],
 },
}

PROV = ("Marie Satori lunation model: New/Full frames verbatim-grounded (context-new-moon, "
        "context-full-moon, guide-phrases); waxing/waning arc phrased in her voice.")

def row(phase, role, i, text):
    return {
        "content_key": f"cc/moon-phase/{phase}/{role}/alt{i}",
        "surface": "sky", "mode": "feed", "status": "DRAFT",
        "event_type": "vocab",
        "headline": "", "summary": "", "body": text,
        "sections": {}, "facts": {}, "knowledge_ids": [],
        "source_snapshot": {"contentType": "vocab", "category": "moon-phase",
                            "scope": {"phase": phase, "role": role},
                            "provenance": PROV, "sourceFile": "marie lunation frame",
                            "lane": "reference"},
        "prompt_version": "authored-moon-phase-v2.2",
        "block_type": None, "reviewer_notes": "", "tier": "REVIEWED",
    }

def main():
    recs = []
    for phase, roles in BANK.items():
        for role, variants in roles.items():
            for i, text in enumerate(variants, 1):
                recs.append(row(phase, role, i, text))
    out = {"tier": "REVIEWED",
           "_meta": {"note": "Moon-phase scene/action/result fills for templates 2A-2H (fills the 15 "
                             "gap slots). Grounded in Marie's lunation frame. scope={phase, role}.",
                     "count": len(recs), "source": "Marie lunation frame"},
           "reviewed": recs}
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "phrasebank", "cc-moon-phase-bank.json")
    json.dump(out, open(path, "w"), indent=1, ensure_ascii=False)
    print(f"wrote {len(recs)} moon-phase rows -> cc-moon-phase-bank.json")

if __name__ == "__main__":
    main()
