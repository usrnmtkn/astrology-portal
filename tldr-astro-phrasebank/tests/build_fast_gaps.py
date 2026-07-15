#!/usr/bin/env python3
"""
build_fast_gaps.py — fill the 23 missing fast-planet x personal aspect-pairs.

Inner-planet combinations (Mercury/Venus/Sun/Mars to each other) not covered by the
earlier batches. Same slot shape as the aspect-pair bank so they render through the
transit templates and serve as natal aspects. Emits cc-aspect-pair-reviewed-fast.json.
"""
import json, os

VAL = {"conjunction":"conjunction","sextile":"supportive","trine":"supportive","square":"challenging","opposition":"challenging"}

# id-tail -> slots (shape depends on valence)
CH = {  # challenging: lived_scene | habitual(gerund) | specific_cost | meaning_bridge | practical_action
"mercury-square-venus":("what you think and what you value pull slightly apart, so your words come out sweeter or sharper than you mean","Softening the truth until it loses its point","a message that's pleasant but unclear","the friction is between honesty and harmony","Say the true thing kindly, rather than the kind thing instead of the true one"),
"mercury-opposition-venus":("your head and your heart give different answers about someone or something","Talking yourself into or out of a feeling","a decision that argues with what you actually want","logic and liking are pulling opposite ways","Let both the reason and the wanting have a say"),
"mercury-square-sun":("what you think and who you are get crossed, so you overthink your own decisions","Second-guessing yourself out loud","confidence spent arguing with your own plan","the friction is between the idea and the ego behind it","Decide, then stop relitigating it"),
"mercury-opposition-sun":("your thinking and your will keep facing off","Overexplaining to convince yourself","a plan talked to death","idea and identity are out of phase","Trust the decision once it's made"),
"mercury-square-mars":("your thoughts and your temper get crossed, so words come out sharp and quick","Firing off the reply before you mean to","a message you'd take back","the friction is between thinking and reacting","Draft it, wait, then send"),
"mercury-opposition-mars":("your ideas and your impulses pull opposite ways","Arguing to win rather than to understand","a debate that turns into a fight","thought and drive are out of phase","Slow the pace before it becomes a contest"),
"venus-square-sun":("what you find lovely and who you're trying to be don't quite match","Performing a taste that isn't yours","pleasure spent on appearances","the friction is between worth and self-image","Choose what you actually like, not what looks right"),
"venus-opposition-sun":("what you want and who you are keep facing off","Chasing approval instead of pleasure","a choice that impresses but doesn't satisfy","value and identity are out of phase","Pick the thing that pleases you, not the room"),
"venus-square-mars":("what you want and how you go after it get crossed, so desire and irritation run close","Pushing too hard, or going cold to protect yourself","a connection that's all friction or all stall","the friction is between affection and drive","Say what you want directly and let them respond"),
"venus-opposition-mars":("your affection and your drive keep pulling opposite ways, often through another person","Chasing what pulls away and cooling on what's offered","a push-pull that exhausts everyone","love and desire are out of phase","Want what's actually there, not what resists you"),
}
SU = {  # supportive: available_opening | underuse_pattern | deliberate_participation | meaning_bridge
"mercury-sextile-venus":("it's easy to say the warm, tactful thing","you keep the nice thought to yourself","Pay the compliment or smooth the conversation","grace and words cooperate now"),
"mercury-trine-venus":("charm and clarity flow together","you coast on pleasantries","Have the warm, honest conversation","taste and words agree easily"),
"mercury-sextile-sun":("your thoughts and your sense of purpose line up, so it's easy to say what you mean","you undersell the idea","Say the thing you actually think","mind and will cooperate"),
"mercury-trine-sun":("your mind and your identity move together, and you think clearly about your own direction","you sit on the clear plan","Put the idea into action","clear thinking about yourself comes easily"),
"mercury-sextile-mars":("your thinking and your drive cooperate, so you can say the sharp thing well and act on your ideas","you let the idea sit","Say it and do it while the energy's there","mind and action line up"),
"mercury-trine-mars":("your mind and your drive move well together, and decisive words come easily","you soften what you could say cleanly","Make the direct point","thinking and doing are in sync"),
"venus-sextile-sun":("what you value and who you are cooperate, so warmth and confidence come together","you hide what you enjoy","Let yourself want something and be seen wanting it","pleasure and identity agree"),
"venus-trine-sun":("your values and your identity flow together, and being yourself is pleasant","you downplay your own warmth","Enjoy being liked as you are","worth and self come easily"),
"venus-sextile-mars":("attraction and affection line up easily, so desire and warmth cooperate","you wait to be pursued","Reach for what and who you want","wanting and being liked agree"),
"venus-trine-mars":("desire and affection flow together with no resistance","you let the chemistry idle","Act on the attraction","wanting and warmth line up smoothly"),
"sun-sextile-mars":("your identity and your drive cooperate, so confident action comes easily","you hold the initiative back","Take the bold, well-aimed step","self and drive agree"),
"sun-trine-mars":("who you are and your drive move together, and action feels natural and unforced","you coast on the easy confidence","Put the energy toward a real goal","identity and drive line up"),
}
CO = {  # conjunction
"mercury-conjunction-venus":("your thinking and your affection run together, so words come out charming and you talk about what you love","the way you think and speak","the way you value and connect","Say the kind thing you mean, and don't let charm stand in for honesty"),
}

records=[]
def add(pair, slots):
    a=[x for x in ("conjunction","sextile","square","trine","opposition") if f"-{x}-" in pair][0]
    records.append({"id":f"cc/aspect-pair/{pair}","pair":pair.replace("-"," "),"aspect":a,"valence":VAL[a],
      "status":"REVIEWED_CLAUSE","template_family":"personalized_transit",
      "recommended_short_template":{"challenging":"4A","supportive":"4B","conjunction":"4C"}[VAL[a]],
      "slots":slots,"source_keys":[f"cc/aspect/{a}",f"cc/ref/aspect-psychology/{a}"],
      "tone_version":"marie-calibrated-v1","originalityCheck":"voiced",
      "review_note":"needs Marie/editorial final sign-off before serving"})

for p,(s,r,c,m,ac) in CH.items():
    add(p,{"lived_scene":s,"habitual_response":r,"specific_cost":c,"meaning_bridge":m,"practical_action":ac})
for p,(o,u,pa,m) in SU.items():
    add(p,{"available_opening":o,"underuse_pattern":u,"deliberate_participation":pa,"meaning_bridge":m})
for p,(e,fa,fb,ac) in CO.items():
    add(p,{"two_functions_becoming_entangled_scene":e,"function_a_lived":fa,"function_b_lived":fb,"concentration_action":ac})

out={"_meta":{"title":"Reviewed fast-planet gap-fill aspect-pairs (inner-planet combinations)","count":len(records),
      "tier":"REVIEWED_CLAUSE","tone_version":"marie-calibrated-v1"},"reviewed":records}
dest=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"phrasebank","cc-aspect-pair-reviewed-fast.json")
json.dump(out,open(dest,"w"),indent=2,ensure_ascii=False)
print(f"wrote {len(records)} fast-planet gap aspect-pairs -> {dest}")
