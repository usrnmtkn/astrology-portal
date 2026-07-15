#!/usr/bin/env python3
"""
build_moon_reviews.py — Home / Today's Moon forecast: all 8 phases + all 12 signs.

Two separate modules (kept apart per the contract):
  moon_phase (8): cycle_role + phase_action        [home.moon_forecast.phase]
  moon_sign (12): embodied_guidance + care_prompt  [home.moon_forecast.sign]
Voice: Marie register, short embodied imperatives for the sign module.
Emits phrasebank/cc-moon-reviewed.json.
"""
import json, os

PHASE = {
"new-moon": ("the dark before the seed: the cycle resets and the month's story isn't written yet",
  "Set one quiet intention and begin small. Don't expect to see results yet"),
"waxing-crescent": ("the first fragile push past the New Moon, the intention taking its first breath",
  "Take one concrete step and protect the young thing from your own doubt"),
"first-quarter": ("the first real resistance, where the seed runs into an obstacle and needs a decision",
  "Push through the friction. Adjust the plan, don't abandon it"),
"waxing-gibbous": ("the refining stretch before fullness, where the details start to matter",
  "Refine, tweak, and stay with it. Trust the build"),
"full-moon": ("the peak, where whatever was seeded is lit up and impossible to ignore",
  "Witness it honestly and let something culminate or release. Don't start over"),
"waning-gibbous": ("the first exhale after the peak, time to share and digest what happened",
  "Give back what you learned and start letting go of what's done"),
"last-quarter": ("the turning-inward crisis, where what no longer fits has to be released",
  "Cut what's finished. Forgive, close the loop, make room"),
"balsamic": ("the last dark stretch, where the cycle composts and prepares for the next New Moon",
  "Rest, clear, and let it end. Don't start the new thing yet"),
}

SIGN = {
"aries": ("Move. Your feelings want action, so run them through your body before they turn into a fight",
  "Don't pick the fight just to feel something"),
"taurus": ("Slow down and get physical. Comfort, food, and calm are the medicine today",
  "Don't dig in just to prove you can't be moved"),
"gemini": ("Talk it out. Your feelings want words and a change of scene; text the friend, take the walk",
  "Don't outrun the feeling by staying busy"),
"cancer": ("Go gentle and go home. Cook, nest, call the person who feels safe",
  "You don't have to host everyone's feelings today"),
"leo": ("Warm yourself up. A little play, affection, or spotlight feeds you now",
  "Don't perform being fine; let yourself actually be seen"),
"virgo": ("Sort one small thing. Tidying a corner or a list settles the whole mood",
  "Don't turn self-improvement into self-criticism today"),
"libra": ("Restore some balance. Beauty, fairness, and a peaceful room steady you",
  "Don't keep the peace by abandoning your own preference"),
"scorpio": ("Let it be deep. Feel the real thing in private instead of forcing a smile",
  "Don't brood in a loop; let the feeling move and pass"),
"sagittarius": ("Get some room. A walk, a plan, or a horizon lifts the mood",
  "Don't promise the world just because you feel expansive"),
"capricorn": ("Do one useful thing. Competence is comfort for you today",
  "Don't mistake handling it for feeling it"),
"aquarius": ("Get a little distance. Space and perspective cool the feeling down",
  "Don't detach so far that you skip the feeling entirely"),
"pisces": ("Rest and let it flow. Music, water, art, and a nap are the medicine",
  "Guard your edges; you're soaking up everyone's weather today"),
}

records = []
for phase, (role, action) in PHASE.items():
    records.append({"id": f"cc/moon-phase/{phase}", "kind": "moon_phase", "phase": phase,
      "surface": "home.moon_forecast.phase", "status": "REVIEWED_CLAUSE",
      "slots": {"cycle_role": role, "phase_action": action},
      "source_keys": ["cc/ref/lunar-cycle"], "tone_version": "marie-calibrated-v1",
      "originalityCheck": "voiced original; phase only, no Moon-sign copy",
      "review_note": "needs Marie/editorial final sign-off before serving"})
for sign, (guid, care) in SIGN.items():
    records.append({"id": f"cc/moon-sign/{sign}", "kind": "moon_sign", "sign": sign,
      "surface": "home.moon_forecast.sign", "status": "REVIEWED_CLAUSE",
      "slots": {"embodied_guidance": guid, "care_prompt": care},
      "source_keys": [f"cc/sign/{sign}/lived-behaviors"], "tone_version": "marie-calibrated-v1",
      "originalityCheck": "voiced original; short embodied imperative, no phase copy",
      "review_note": "needs Marie/editorial final sign-off before serving"})

out = {"_meta": {"title": "Reviewed Moon phases (8) + Moon signs (12)",
        "modules": {"home.moon_forecast.phase": "8 phases", "home.moon_forecast.sign": "12 signs"},
        "count": len(records), "tier": "REVIEWED_CLAUSE", "tone_version": "marie-calibrated-v1"},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-moon-reviewed.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} Moon records (8 phases + 12 signs) -> {dest}")
