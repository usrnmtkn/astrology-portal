#!/usr/bin/env python3
"""
build_transit_revoice.py — CC-quality flowing paragraphs for transit/aspect DETAIL.

Adds an `expanded_narrative` to aspect-pair records: one warm, hook-first, flowing
paragraph (no creative headline — the title stays the plain astrology name). This is
the detail-page body; the short slots remain the compact-card summary.

DEMONSTRATION BATCH (~15 flagship aspects). On sign-off, extend to all ~470.
Run AFTER the aspect builders + tone_pass (patches in place). Emits nothing new;
writes expanded_narrative into the existing cc-aspect-pair-reviewed*.json files.
"""
import json, os, glob

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REVOICE = {
"cc/aspect-pair/mars-square-saturn":
 "Your drive keeps running into a wall right now, whether it's a limit, a delay, or a wave of self-doubt. It's frustrating, and pushing harder or freezing up will only wear you out. This is a moment for the long game: break the goal into smaller, steadier steps, and let the resistance show you exactly where you need to get stronger.",
"cc/aspect-pair/moon-conjunction-jupiter":
 "Your heart feels generous today, and it's easy to let the good in. Warmth, hope, and a little more faith than usual are all available to you, so let yourself feel held by them. Just keep an eye on the urge to overdo it, and enjoy the abundance without inflating the promises.",
"cc/aspect-pair/venus-square-saturn":
 "A relationship, or your sense of being valued, might feel tested, distant, or like more effort than it should be, and it's easy to read that chill as proof you're not wanted. More often it's just asking whether the connection holds up when you stop over-giving to keep the peace. Ask for what you need directly instead of pulling away, and let people show you they care through what they actually do.",
"cc/aspect-pair/saturn-conjunction-saturn":
 "The life you've built over the last cycle is getting weighed, and whatever isn't truly yours is starting to ask to be rebuilt on real ground. It can feel heavy, like the structures you leaned on are being tested against who you actually are now. This is your Saturn return: you stop borrowing authority and start becoming your own. Commit to the version of your life you'd actually choose, and let the rest go, even the parts you were proud of building.",
"cc/aspect-pair/sun-square-saturn":
 "Your momentum runs into a limit today, a duty, a delay, or someone with authority saying not yet, and it's easy to take it as a verdict on you. It isn't. It's a test of commitment. Do the boring, load-bearing part nobody claps for, because the confidence you build that way is the kind that actually holds.",
"cc/aspect-pair/moon-conjunction-mars":
 "Your feelings run hot and fast today, and a mood can move you to act before you've thought it through. That's powerful when it's aimed and reactive when it's not. Feel the intensity, then point it at something real, and move your body before the heat reaches your mouth.",
"cc/aspect-pair/pluto-conjunction-venus":
 "Love turns intense and consuming right now, and a connection can surface power, depth, or a pull you can't hold casually. It's magnetic, and it can tip toward control or obsession if you let it. Get honest about what you actually want from the bond before the intensity decides for you, and let it be deep without letting it become possession.",
"cc/aspect-pair/mars-conjunction-ascendant":
 "Your drive is right at the surface today, in how you meet people and how quickly you'll push or defend yourself. It reads as energetic, maybe a little confrontational, and that's fine as long as you know it's there. Aim the force at something real and have the hard conversation directly, rather than letting it leak out sideways.",
"cc/aspect-pair/saturn-conjunction-venus":
 "A relationship, or your sense of being valued, is being asked to get real and commit. Their reserve, or the effort it's taking, can read as depth or as a cold shoulder, and it's worth knowing which. Let the love build slowly if it's building, ask for what you need out loud, and call out the chill honestly when it's actually a chill.",
"cc/aspect-pair/uranus-square-sun":
 "Something restless is knocking against who you thought you were, and the urge to break free can feel urgent and sudden. The jolts are aimed at what no longer fits, not at everything you are. Instead of blowing up the whole life at once, change one real thing you can walk back, and let the freedom show you what it's actually pointing at.",
"cc/aspect-pair/neptune-conjunction-mercury":
 "Your thinking turns dreamy and impressionable right now, and it's easy to hear the version you were hoping for instead of the one that's true. Imagination is high, which is a gift for anything creative and a risk for anything you're signing. Enjoy the inspiration, and check every important detail against something solid before you commit.",
"cc/aspect-pair/jupiter-conjunction-venus":
 "Warmth and goodwill open up in love and money, and social life gets easy and pleasant. It's genuinely a generous stretch, so enjoy it, be generous back, and let yourself be liked. Just keep an eye on the urge to overspend or to promise more warmth than you can keep up.",
"cc/aspect-pair/mercury-square-pluto":
 "A conversation can turn into a quiet contest over who's right or whether your effort gets seen, and words can dig or maneuver more than usual. The real subject is usually recognition, and it responds to plainness, not pressure. Say the honest thing directly, because the maneuvering costs more than the point ever will.",
"cc/aspect-pair/moon-square-saturn":
 "A feeling runs into a cold wall today, and you can end up feeling unsupported, blocked, or just not enough. It's real weather, but it isn't the whole truth about your life. Comfort yourself first, then deal with the actual limit in front of you rather than the heavy mood around it.",
"cc/aspect-pair/venus-conjunction-mars":
 "Attraction and drive line up right now, so what you want and who you want it from stop being separate questions. Desire feels direct, a little bold, and easy to act on before you've thought it through. Pursue it plainly instead of dressing it up as something more acceptable, and let the rest of the connection catch up to the spark.",
}

# ---------------------------------------------------------------- composer
def cap(t):
    t = t.strip()
    return t[0].upper() + t[1:] if t else t

def low(t):
    t = t.strip()
    return t[0].lower() + t[1:] if t else t

def strip_end_period(t):
    return t.rstrip().rstrip(".")

def compose(rec):
    """Assemble an existing record's seam-clean slots into a flowing paragraph.
    Fixes capitalization and drops the clunky '{habitual} may intensify {cost}' frame."""
    s = rec.get("slots", {})
    def has(*ks): return all(k in s for k in ks)

    # challenging aspect (lived_scene / habitual gerund / cost / meaning / action)
    if has("lived_scene", "habitual_response", "specific_cost", "meaning_bridge", "practical_action"):
        return (f"{cap(s['lived_scene'])}. It's easy to fall into {low(s['habitual_response'])}, "
                f"which can cost you {low(strip_end_period(s['specific_cost']))}. "
                f"But {low(s['meaning_bridge'])}. {cap(s['practical_action'])}.")
    # supportive aspect (opening / underuse / participation / meaning)
    if has("available_opening", "underuse_pattern", "deliberate_participation", "meaning_bridge"):
        return (f"{cap(s['available_opening'])}, and {low(s['meaning_bridge'])}. "
                f"What's easy to miss is that {low(s['underuse_pattern'])}, so {low(s['deliberate_participation'])}.")
    # conjunction aspect
    if has("two_functions_becoming_entangled_scene", "function_a_lived", "function_b_lived", "concentration_action"):
        return (f"{cap(s['two_functions_becoming_entangled_scene'])}. It can be hard to separate "
                f"{low(s['function_a_lived'])} from {low(s['function_b_lived'])} right now, so "
                f"{low(s['concentration_action'])}.")
    # angle contact (4D)
    if has("angle_specific_scene", "behavioral_consequence", "proportionate_adjustment"):
        return (f"{cap(s['angle_specific_scene'])}. {cap(s['behavioral_consequence'])}. "
                f"{cap(s['proportionate_adjustment'])}.")
    # Uranus 4G
    if has("recurring_disruption_scene", "stability_pattern", "emerging_need", "liberating_meaning"):
        return (f"{cap(s['recurring_disruption_scene'])}. {cap(s['stability_pattern'])} may no longer "
                f"contain {low(s['emerging_need'])}, and {low(s['liberating_meaning'])}. "
                f"{cap(s.get('bounded_experiment',''))}.")
    # Neptune 4H
    if has("uncertain_lived_scene", "old_certainty", "new_orientation", "discernment_meaning"):
        return (f"{cap(s['uncertain_lived_scene'])}. {cap(s['old_certainty'])} may be losing definition "
                f"before {low(s['new_orientation'])} is ready, and {low(s['discernment_meaning'])}. "
                f"{cap(s.get('grounding_action',''))}.")
    # Pluto 4I
    if has("recurring_power_or_loss_scene", "control_pattern", "underlying_vulnerability", "transformational_meaning"):
        return (f"{cap(s['recurring_power_or_loss_scene'])}. {cap(s['control_pattern'])} has been protecting "
                f"{low(s['underlying_vulnerability'])}, but it may now be intensifying {low(s.get('specific_cost',''))}. "
                f"{cap(s['transformational_meaning'])}. {cap(s.get('practical_action',''))}.")
    # Saturn 4E
    if has("recurring_lived_scene", "repeating_pattern", "pressure_meaning", "practical_action"):
        para = (f"{cap(s['recurring_lived_scene'])}. {cap(s['repeating_pattern'])}. "
                f"{cap(s['pressure_meaning'])}. {cap(s['practical_action'])}.")
        if s.get("has_pass_context") and s.get("pass_context"):
            para += f" {cap(s['pass_context'])}"
        return para
    # Jupiter 4F
    if has("recurring_opportunity_scene", "trust_or_capacity_pattern", "capacity_being_developed", "deliberate_participation"):
        para = (f"{cap(s['recurring_opportunity_scene'])}. {cap(s['trust_or_capacity_pattern'])}. "
                f"{cap(s['capacity_being_developed'])}. {cap(s['deliberate_participation'])}.")
        if s.get("has_pass_context") and s.get("pass_context"):
            para += f" {cap(s['pass_context'])}"
        return para
    return None

def main():
    files = glob.glob(os.path.join(PKG, "phrasebank", "cc-aspect-pair-reviewed*.json"))
    data = {}; idx = {}
    for fp in files:
        d = json.load(open(fp)); data[fp] = d
        for r in d["reviewed"]:
            idx[r["id"]] = r
    hand = 0; composed = 0; skipped = 0
    for rid, r in idx.items():
        if rid in REVOICE:
            r["expanded_narrative"] = REVOICE[rid]; r["revoice_version"] = "CC-quality-v1-authored"; hand += 1
        else:
            para = compose(r)
            if para:
                r["expanded_narrative"] = para; r["revoice_version"] = "CC-quality-v1-composed"; composed += 1
            else:
                skipped += 1
    for fp, d in data.items():
        json.dump(d, open(fp, "w"), indent=2, ensure_ascii=False)
    print(f"revoiced: {hand} hand-authored + {composed} composed = {hand+composed} aspect records "
          f"({skipped} skipped for missing slots).")

if __name__ == "__main__":
    main()
