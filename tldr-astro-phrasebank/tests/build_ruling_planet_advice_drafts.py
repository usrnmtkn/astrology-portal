#!/usr/bin/env python3
"""
build_ruling_planet_advice_drafts.py — the two NEW ruling-planet advice batches.

Provenance (per author note): these are Claude-drafted in session (2026-07-10), paraphrasing
Aesop Rock's themes, then Marie-reviewed. That is NOT the same as the verbatim CONFIRMED bank,
so they get their own tier and file:

  tier   = SESSION_APPROVED_DRAFT   (Claude-drafted, Marie-reviewed)
  status = DRAFT                    (pending dashboard confirmation)

They are imported as batch 3 and batch 4 -> keys {sign}-3 and {sign}-4, so they do NOT collide
with the existing CONFIRMED batches 1 and 2. Filename omits 'reviewed' so build transforms skip
it (these use contractions by design and must not be tone-passed or seam-linted).
"""
import json, os

RULER = {"aries":"mars","taurus":"venus","gemini":"mercury","cancer":"moon","leo":"sun",
         "virgo":"mercury","libra":"venus","scorpio":"pluto","sagittarius":"jupiter",
         "capricorn":"saturn","aquarius":"uranus","pisces":"neptune"}

# Batch 3 ("planetary target first, sharp imperative")
BATCH3 = {
"aries":"If you want to shape your life, you can't be passive about it. Beat the day to the punch. Wake up with intent and assert your energy before the world decides who you are for you.",
"taurus":"Milestones and accolades won't fill an internal void. If you're chasing achievements hoping they'll cure a quiet emptiness, stop and tend to the foundation directly. Your résumé can't do that work for you.",
"gemini":"Be careful about planting a flag on ground you think you've conquered. Ideas shift, people surprise you, and the territory moves. Stay agile. The moment you're certain you've figured it all out is the moment to look again.",
"cancer":"Don't fall in love with your own suffering just because it feels familiar. Fearing your own healing out of loyalty to the dark days that used to define you is a trap. You're allowed to evolve past the version of you that hurt.",
"leo":"Check the ego's favorite illusion: that you're the sole driver of everything around you. Currents bigger than you are carrying part of the load. Look honestly at what actually moves you, and steer from there.",
"virgo":"Just because you can optimize something doesn't mean you should. Over-engineering your life builds a machine that eventually runs you. Step back from the control panel and ask whether your systems serve you or trap you.",
"libra":"Some exits need to be clean. If a relationship is toxic enough to leave, don't hold a polite path open out of obligation or fear of looking harsh. Close it completely so your future peace isn't up for negotiation.",
"scorpio":"You owe nothing to conversations and rooms that drain you. When a situation feels wrong or hollow, trust your gut and leave. You don't need a polite excuse to exit. You can just go.",
"sagittarius":"No rescue team is coming. Not the windfall, not the savior, not the perfect break. Freedom starts the moment you accept that you navigate your own way out. That's not bleak. That's the adventure.",
"capricorn":"Stay anchored to the actual work. The world is loud with shortcuts and hype promising results for no effort. Ignore the noise, guard your work ethic, and keep mastering your craft.",
"aquarius":"You don't have to march with every trend or comment on every half-formed idea. Sitting out the noise isn't disengagement. A sharp mind can watch a fad pass without joining the parade.",
"pisces":"Some days you run on autopilot, numb and going through the motions. Don't punish yourself when the passion temporarily disappears. Keeping the rhythm going on an empty day counts. Sometimes surviving the day is the whole assignment.",
}

# Batch 4 (same register; the set the author labelled '-2')
BATCH4 = {
"aries":"Hesitation costs more than a wrong move. When the moment is high-stakes and instinct is driving, half-measures get you swallowed. Commit fully or don't move at all.",
"taurus":"Endurance is a strength until it becomes slow self-destruction. You don't have to quietly absorb every pressure just because you can carry it. When your body says it's at the limit, believe it.",
"gemini":"You don't have to crack every idea on the first pass. Forcing a breakthrough before it's ready is how minds burn out. If the concept is slippery right now, set it down and come back later. It will keep.",
"cancer":"When your defenses are up, your intensity can read as hostility to people who are only trying to get close. Learn the difference between guarding your peace and pushing away your people. The shell is for protection, not exile.",
"leo":"Confidence doesn't need volume. Loud posturing is fragile underneath and melts when it meets calm indifference. A steady, quiet presence cuts through more noise than a big display ever will.",
"virgo":"Cynicism is easy, and so is hiding inside your routines. Leave room for awe. Don't let your analytical mind or your frustration with people blind you to the enormous, beautiful things happening just outside your window.",
"libra":"Navigating hidden agendas, social codes, and keeping up appearances will drain you. Step back from the game. Strip away the pleasantries that exist only for show and see what remains. What remains is what matters.",
"scorpio":"Not everything you carry needs an audience. Some transformations deserve a private, sacred outlet, even if that's just the quiet of nature. Some realizations are yours alone, and you're allowed to guard them to the end.",
"sagittarius":"The vastness of everything doesn't have to frighten you out of the ride. If life is temporary and inherently wild, lean into the momentum. Treat the chaos as an adventure, not a threat.",
"capricorn":"Your life's work is not a dress rehearsal. If you're committing your time and your body to a purpose, give it full weight. Take the obligation seriously and do the labor it asks of you.",
"aquarius":"Freedom without a plan is just a different chaos. When you break loose from the rules or systems that held you, know how to handle the independence you fought for. Liberation needs its own infrastructure.",
"pisces":"Drifting into your inner world comes naturally, and escape is always available there. But your body is still anchored here, in this hour. Check back into your physical life regularly, before you float out of reach.",
}

def main():
    records = []
    for batch, table in ((3, BATCH3), (4, BATCH4)):
        for sign, text in table.items():
            records.append({
                "id": f"cc/ruling-planet-advice/{sign}-{batch}",
                "sign": sign, "ruler": RULER[sign], "batch": batch,
                "text": text,
                "tier": "SESSION_APPROVED_DRAFT",
                "status": "DRAFT",
                "surface": "ruling_planet_advice",
                "source": "Claude-drafted in session 2026-07-10, paraphrasing Aesop Rock themes; Marie-reviewed",
                "serving": "session-approved draft; pending dashboard confirmation before serving; not tone-passed or linted",
            })
    out = {"_meta": {"tier": "SESSION_APPROVED_DRAFT",
                     "note": "Two batches (3 + 4) of ruling-planet advice. Claude-drafted, Marie-reviewed, "
                             "Aesop-Rock-paraphrased. Distinct from the CONFIRMED verbatim bank. All rows DRAFT."},
           "tier": "SESSION_APPROVED_DRAFT",
           "advice": records}
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "phrasebank", "cc-ruling-planet-advice-drafts.json")
    json.dump(out, open(path, "w"), indent=1, ensure_ascii=False)
    print(f"wrote {len(records)} draft rows (batch 3 + 4) -> {os.path.basename(path)}")

if __name__ == "__main__":
    main()
