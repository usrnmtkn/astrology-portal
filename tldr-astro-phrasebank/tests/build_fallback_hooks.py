#!/usr/bin/env python3
"""
build_fallback_hooks.py — saved fallback-hook rows, as SLOT TEMPLATES.

The app's fallback-hook system is slot-based: {{planet}}, {{sign}}, {{planetTopic}},
{{signStyle}}, {{signNeed}}, {{houseTopic}}, {{aspect}}, {{moonSign}}, {{personA}} ... are
interpolated from the calculated chart/sky/relationship context at render time (and
{{planetTopic}}/{{signStyle}}/{{signNeed}} resolve from the vocab rows in build_vocab.py).
So these rows are TEMPLATES with {{slots}}, not fully generic prose. Slots per route follow
the app's Slot Dictionary "safe slots". Emitted in the admin-API shape:

  content_key = fallback-hook/{key}, event_type=fallback-hook, block_type=fallback_template,
  prompt_version=fallback-hook-template-v1, source_snapshot={contentType:"template", hook:"{key}"}

Voice: written to the same standard as the composite/natal aspect prose — experience-first,
plainspoken, warm, specific. A fallback fires when the tailored row is missing, so the slots
stay; the writing around them should still read like Marie wrote it. No em dashes; no
"brings"/"meets" seams; no banned register; soft certainty (tends to / can / often).
Grammar note: {{signStyle}} resolves to a phrase like "with directness, courage, and a fast
start" (use after a verb: "leans {{signStyle}}"); {{signNeed}} resolves to "to act, lead, and
be first" (use as "wanting {{signNeed}}"). Tier REVIEWED (imports DRAFT).
"""
import os, json

# hook key -> (surface, mode, headline, summary, body) with {{slots}}
HOOKS = {
 "sky.seasonal-current": ("sky", "feed", "{{sign}} season",
   "The Sun is in {{sign}} now, and it colors the mood for everyone.",
   "The Sun sits in {{sign}} for about a month, so the shared mood leans {{signStyle}}. You feel it in what pulls your attention and in what suddenly takes more effort than usual. Put your energy where {{sign}} is strong and let the quieter corners of your life wait their turn."),
 "sky.lunar-cycle": ("sky", "feed", "The Moon in {{moonSign}}",
   "A {{moonPhase}} Moon in {{moonSign}} sets the emotional tone.",
   "With the Moon in {{moonSign}}, feelings lean toward wanting {{signNeed}}, and the {{moonPhase}} phase sets how strongly that pull runs. This is mood, not fact, so it passes quickly. Notice what you are reaching for today and give yourself a small, honest piece of it."),
 "lunar-calendar/day": ("sky", "feed", "Today's Moon in {{moonSign}}",
   "The day's emotional weather, set by the {{moonPhase}} Moon.",
   "The Moon spends today in {{moonSign}}, against the wider backdrop of {{sunSign}} season, and the {{moonPhase}} phase shades how it lands. Some hours will feel easy and some will not. Follow what you are drawn to and let your energy go where the day already wants to take it."),
 "lunar-calendar/arc-new-moon": ("sky", "feed", "New moon in {{moonSign}}",
   "A quiet fresh start in {{moonSign}}.",
   "This new moon in {{moonSign}} opens a stretch that runs all the way to {{arcTargetSign}} weeks from now. You do not have to do anything yet. Name the one thing you want more of, say it plainly to yourself, and let the coming weeks do the slow work of growing it."),
 "lunar-calendar/arc-full-moon": ("sky", "feed", "Full moon in {{moonSign}}",
   "A peak along the {{moonSign}} and {{oppositeSign}} axis.",
   "This full moon in {{moonSign}} pulls against {{oppositeSign}}, so a tension you have been carrying between the two comes into the open. Whatever you set in motion at the new moon tends to reach its turning point around now. Look at what the light shows you before you decide anything."),
 "sky.planetary-placement": ("sky", "feed", "{{planet}} in {{sign}}",
   "How {{planet}} is coloring the collective mood.",
   "{{planet}} is in {{sign}} right now, so its themes take on that sign's flavor and show up {{signStyle}} for everyone at once. This is background weather rather than anything aimed at you. Watch for where it turns up in the ordinary parts of your week."),
 "sky.ingress": ("sky", "feed", "{{planet}} enters {{sign}}",
   "A shift in tone as {{planet}} moves into {{sign}}.",
   "Around {{ingressDate}}, {{planet}} changes signs into {{sign}}, and its themes start to express a little differently for a while. The change is gradual rather than overnight. Notice what begins to feel different once it settles in."),
 # Per-planet ingress templates (resolve cc/ingress/{planet}); {{sign}}/{{signStyle}} fill at render.
 # Timescale is planet-accurate; outer-planet ingresses carry a generational caveat.
 "sky.ingress.sun": ("sky", "feed", "Sun enters {{sign}}",
   "A monthlong shift in tone as the Sun enters {{sign}}.",
   "The Sun moves into {{sign}} for about a month, so the season starts to work {{signStyle}}. This is the backdrop everyone shares for a few weeks. Notice what {{sign}} tends to care about and let it set your pace."),
 "sky.ingress.moon": ("sky", "feed", "Moon enters {{sign}}",
   "A brief change in mood as the Moon enters {{sign}}.",
   "The Moon slips into {{sign}} for a couple of days, so the collective mood starts to move {{signStyle}} for a short stretch. It is a passing tone more than a real event. Notice the shift in feeling and let it pass as quickly as it came."),
 "sky.ingress.mercury": ("sky", "feed", "Mercury enters {{sign}}",
   "The tone of talk and plans shifts as Mercury enters {{sign}}.",
   "Mercury enters {{sign}} for a couple of weeks, so talk, plans, and small decisions start to run {{signStyle}}. Think of it as the tone of how information is moving right now. Adjust how you say things to fit it."),
 "sky.ingress.venus": ("sky", "feed", "Venus enters {{sign}}",
   "Taste and affection shift as Venus enters {{sign}}.",
   "Venus enters {{sign}} for a few weeks, so taste, affection, and small pleasures start to lean {{signStyle}}. It colors what feels appealing more than the big decisions. Enjoy what this stretch makes attractive."),
 "sky.ingress.mars": ("sky", "feed", "Mars enters {{sign}}",
   "Drive takes on a new edge as Mars enters {{sign}}.",
   "Mars enters {{sign}} for about six weeks, so drive and temper both start to act {{signStyle}}. It shapes how people push, compete, and begin things for a while. Pick your battles to match the tone rather than fight it."),
 "sky.ingress.jupiter": ("sky", "feed", "Jupiter enters {{sign}}",
   "A yearlong chapter of growth opens as Jupiter enters {{sign}}.",
   "Jupiter enters {{sign}} for roughly a year, so growth and appetite start to reach {{signStyle}}. This is a longer chapter, not a passing mood. Notice what {{sign}} opens up and lean toward the room it offers."),
 "sky.ingress.saturn": ("sky", "feed", "Saturn enters {{sign}}",
   "A multiyear chapter of work begins as Saturn enters {{sign}}.",
   "Saturn enters {{sign}} for about two and a half years, so the themes of {{sign}} become the area that gets tested and made to earn its keep. It is a long, slow chapter. Expect steady work here rather than quick results."),
 "sky.ingress.uranus": ("sky", "feed", "Uranus enters {{sign}}",
   "A generational shift as Uranus enters {{sign}}.",
   "Uranus enters {{sign}} for around seven years, so {{sign}} becomes where change and new thinking gather for a whole cohort. This is generational weather more than a personal event. You feel it in your own life mainly where {{sign}} touches your chart closely."),
 "sky.ingress.neptune": ("sky", "feed", "Neptune enters {{sign}}",
   "A slow generational shift as Neptune enters {{sign}}.",
   "Neptune enters {{sign}} for about fourteen years, so the themes of {{sign}} slowly take on a haze of imagination and longing for a whole generation. The shift is subtle and very long. You feel it personally mainly where {{sign}} sits close to something in your own chart."),
 "sky.ingress.pluto": ("sky", "feed", "Pluto enters {{sign}}",
   "An era-defining shift as Pluto enters {{sign}}.",
   "Pluto enters {{sign}} for fifteen to twenty years, so {{sign}} becomes the ground for deep, structural change across a whole generation. This is era-defining weather, not a personal transit. It reaches your own life most where {{sign}} connects to a personal planet or an angle."),
 "sky.aspect-detail": ("sky", "feed", "{{planetA}} {{aspect}} {{planetB}}",
   "{{planetA}} and {{planetB}} are in conversation right now.",
   "{{planetA}} is {{aspect}} {{planetB}} in the sky, so their themes mix for a stretch of days. The contact is {{applying}} and about {{orb}} from exact, which is why it feels sharper as it closes in. Watch for where that pairing shows up in the mood around you."),
 "sky.aspect-sign-context": ("sky", "feed", "{{planetA}} in {{signA}}, {{planetB}} in {{signB}}",
   "The signs behind the current aspect.",
   "{{planetA}} is working {{signAStyle}} from {{signA}}, while {{planetB}} works {{signBStyle}} from {{signB}}. Those two styles are what give the current aspect its particular feel, and they explain why it lands the way it does rather than some other way."),
 "sky.retrograde": ("sky", "feed", "{{planet}} retrograde",
   "A review season for {{planet}}'s themes.",
   "{{planet}} is {{retrogradeStatus}}, so for a while its themes turn back on themselves. This is a better window to revisit and repair {{planetTopic}} than to launch something brand new there. Loose ends you thought were behind you may ask for another look. The forward motion comes back soon enough."),
 "sky.station": ("sky", "feed", "{{planet}} stations {{direction}}",
   "A slow, charged turning point for {{planet}}.",
   "Around {{stationDate}}, {{planet}} slows almost to a stop before it turns {{direction}} in {{sign}}, and its themes tend to feel loud and stuck for a few days on either side. Go easy with {{planetTopic}} while it finds its footing. Things tend to move again once the turn is complete."),
 "sky.retrograde-section": ("sky", "feed", "The current retrogrades",
   "What to keep in mind while planets move backward.",
   "There are {{count}} planets retrograde at the moment, and {{fastestPlanet}} is the first to turn forward again. While they are all backing up, their areas of life tend to move in fits and starts. Treat this as a season for finishing and refining what already exists rather than starting from scratch."),
 "you.natal-placement": ("you", "in_depth", "{{planet}} in {{sign}}",
   "How {{planet}} works in your chart.",
   "You were born with {{planet}} in {{sign}}, so {{planetTopic}} tends to show up {{signStyle}} for you. This is not a passing mood, it is part of your wiring, steady across your whole life. Once you can name the pattern, you can work with it on purpose instead of being surprised by it each time."),
 "you.natal-house-placement": ("you", "in_depth", "{{planet}} in your {{house}} house",
   "Where {{planet}}'s themes play out for you.",
   "With {{planet}} in your {{house}} house, {{planetTopic}} tends to concentrate around {{houseTopic}}. That is the corner of life where this part of you does most of its living, for better and worse. When you want to work with {{planet}}, this is the arena to watch."),
 "you.natal-angle-placement": ("you", "in_depth", "{{angle}} in {{sign}}",
   "A defining edge of how you meet the world.",
   "With your {{angle}} in {{sign}}, {{angleTopic}} comes across {{signStyle}}. This sits right at the surface, so it shapes first impressions and long-range aims alike. People often read this in you before they know anything else, sometimes before you have said a word."),
 "you.natal-aspect": ("you", "in_depth", "{{planetA}} {{aspect}} {{planetB}}",
   "How two parts of you work together.",
   "This aspect links {{planetATopic}} with {{planetBTopic}}, two parts of you that share the same nervous system. On easy days they back each other up, on hard days they talk over each other. It is a permanent feature of how you are built, so the work is learning the rhythm rather than fixing a flaw."),
 "you.transit-to-natal": ("you", "feed", "{{transitPlanet}} {{aspect}} your {{natalPoint}}",
   "A passing sky event lands on something personal.",
   "Right now {{transitPlanet}} is {{aspect}} your natal {{natalPoint}}, putting {{transitPlanetTopic}} in direct contact with {{natalPointTopic}}. This is {{timingIntensity}} and {{timingPhase}}, so it colors the days more than it rewrites anything. Notice what it stirs up in you, take what is useful from it, and trust that it moves on."),
 "you.transit-through-house": ("you", "feed", "{{transitPlanet}} through your {{house}} house",
   "A longer chapter in one area of your life.",
   "From {{transitStart}} to {{transitEnd}}, {{transitPlanet}} crosses your {{house}} house, so {{houseTopic}} becomes the part of life quietly under construction. This is a slow chapter, not a single event, and you may only see its shape looking back. Notice what you keep wanting to build or let go of there."),
 "you.transit-to-angle": ("you", "feed", "{{transitPlanet}} {{aspect}} your {{angle}}",
   "A noticeable shift at a sensitive point.",
   "{{transitPlanet}} is {{aspect}} your {{angle}}, and contacts to the angles tend to be felt more plainly than an ordinary transit. Something around {{angleTopic}} can come into focus and ask for a response. This is {{timingIntensity}} and {{timingPhase}}. Give it room instead of forcing a quick answer."),
 "you.daily-timing": ("you", "feed", "Your timing today",
   "The strongest personal signal in the sky right now.",
   "The clearest note in your day is {{transitPlanet}} {{aspect}} your {{natalPoint}}, which sets {{transitPlanetTopic}} against {{natalPointTopic}}. The window runs {{window}}, about {{orb}} from exact. Lean on the part that feels supportive and go a little gentler where it grates, then let the day carry on."),
 "natal/hard-aspect": ("natal", "in_depth", "{{planetA}} {{aspect}} {{planetB}}",
   "A source of friction that is also a source of skill.",
   "This hard aspect sets {{planetATopic}} at odds with {{planetBTopic}}, so holding the two together takes real effort, often around {{lifeArea}}. It can feel like a fault line, but it rarely is one. This is usually the exact place you end up most capable, because you have had to practice here your whole life."),
 "natal/chart-contradiction": ("natal", "in_depth", "A contradiction in your chart",
   "Two true things about you that seem to conflict.",
   "Every chart holds parts that pull opposite ways, and {{placement}} is one of yours. You can honestly be two contradictory things depending on what is being touched in the moment. Trying to pick one and call it the real you tends to miss the point. Holding both is usually closer to the truth."),
 "natal/free-will-disclaimer": ("natal", "article", "How to read this",
   "Your chart describes tendencies, not fate.",
   "This {{reportType}} maps leanings and patterns, not a script you are stuck with. It can tell you what tends to come easily and what tends to cost you effort, but the choices stay yours. Keep what rings true, set aside what does not, and treat the whole thing as a mirror to think with rather than a verdict to accept."),
 "friends.synastry-contact": ("synastry", "in_depth", "{{friendPlanet}} {{aspect}} your {{yourPlanet}}",
   "One way you and {{friendName}} affect each other.",
   "{{friendName}}'s {{friendPlanet}} is {{aspect}} your {{yourPlanet}}, so {{friendPlanetTopic}} and {{yourPlanetTopic}} keep landing on each other whenever you two are close. It describes a genuine pull or friction between you, not a verdict on the whole bond. It is one strong thread among many, real on its own but not the whole story of you two."),
 "friends.same-planet": ("synastry", "in_depth", "You both have strong {{planet}}",
   "Where you and {{friendName}} meet on common ground.",
   "You and {{friendName}} both run a strong {{planet}}, so you tend to recognize something of yourself in the other person. In {{relationshipContext}}, that likeness can be a comfort, and it can also double a blind spot you happen to share. Watch for both, the ease and the echo."),
 "friends.house-overlay": ("synastry", "in_depth", "Their {{planet}} in your {{house}} house",
   "The area of your life they light up.",
   "When this person's {{planet}} falls in your {{house}} house, they tend to switch on {{houseTopic}} for you, often without either of you trying. It shows where their presence is felt most in your day-to-day. Some people land in your work, some in your home, some in your heart, and this is where this one lands."),
 "friends.composite-aspect": ("composite", "in_depth", "Composite {{planetA}} {{aspect}} {{planetB}}",
   "How the relationship itself is wired here.",
   "In your composite chart, {{planetA}} is {{aspect}} {{planetB}}, which describes the relationship as its own third thing, separate from either of you alone. How it actually plays out depends on the kind of bond you have. In {{relationshipContext}}, it tends to surface in the everyday situations that context is already built around."),
 "friends.composite-placement": ("composite", "in_depth", "Composite {{planet}} in {{sign}}",
   "A defining feature of the relationship.",
   "Your composite {{planet}} sits in {{sign}}, in the {{house}} house, and it points to a lasting quality of the relationship itself rather than of either person. In {{relationshipContext}}, that quality shows up in the small, repeated moments of how you two operate, more than in any single dramatic one."),
 "friends.relationship-timing": ("relationship", "feed", "Timing for the relationship",
   "A passing influence on the connection.",
   "{{transitPlanet}} is {{aspect}} {{natalPoint}} in the relationship's own chart, opening a passing stretch of extra ease or extra strain between you. None of it is fixed and none of it is the last word. Notice what is stirring right now, handle it kindly, and let the rougher passages pass."),
 "friends.circle-feed": ("relationship", "feed", "Your circle right now",
   "A quick read across the people in your orbit.",
   "A shared theme of {{topic}} is running through your circle just now, touching {{peopleAffected}}. Think of it as a nudge rather than an order. It may be the day to reach out to someone, tend a bond that has gone quiet, or give a person a little more room than usual."),
 "settings.life-area-focus": ("you", "feed", "Your focus: {{topic}}",
   "Where you have pointed your attention.",
   "You have asked to keep an eye on {{topic}}, so your readings will lean that way and surface more of what touches this part of life. Nothing is hidden from you, it is just weighted toward what you care about most right now. You can change where the emphasis sits whenever your priorities move."),
}

def main():
    records = []
    for key, (surface, mode, headline, summary, body) in HOOKS.items():
        records.append({
            "content_key": f"fallback-hook/{key}",
            "surface": surface, "mode": mode, "status": "DRAFT",
            "event_type": "fallback-hook",
            "headline": headline, "summary": summary, "body": body,
            "sections": [], "facts": {}, "knowledge_ids": [],
            "source_snapshot": {"contentType": "template", "hook": key},
            "prompt_version": "fallback-hook-template-v1",
            "block_type": "fallback_template", "reviewer_notes": "",
            "tier": "REVIEWED",
        })
    out = {"tier": "REVIEWED",
           "_meta": {"surface": "fallback_hooks",
                     "note": "Saved fallback-hook rows as SLOT TEMPLATES ({{slot}}), replacing local "
                             "fallbackHooks.ts placeholders. Prose rewritten to the composite/natal aspect "
                             "standard while keeping every interpolation slot. Slots per the app Slot Dictionary; "
                             "{{planetTopic}}/{{signStyle}}/{{signNeed}} resolve from cc-vocab.json. Static "
                             "routes only; dynamic lunation/season-arc families handled in-repo. surface/mode "
                             "per registry; Codex confirms exact values.",
                     "count": len(records), "prompt_version": "fallback-hook-template-v1"},
           "reviewed": records}
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "phrasebank", "cc-fallback-hooks.json")
    json.dump(out, open(path, "w"), indent=1, ensure_ascii=False)
    print(f"wrote {len(records)} slot-templated fallback-hook rows -> cc-fallback-hooks.json")

if __name__ == "__main__":
    main()
