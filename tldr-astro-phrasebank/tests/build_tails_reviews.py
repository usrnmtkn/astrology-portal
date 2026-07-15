#!/usr/bin/env python3
"""
build_tails_reviews.py — small tails: transiting-node contacts + the four asteroids.

  node transits (12): transiting North/South Node conjunct natal points   [transits.node]
  asteroid cores (4) + asteroid-in-sign (48): Ceres/Pallas/Juno/Vesta      [me.natal_placement]
Rendered as paragraphs (seam/register checked). Emits phrasebank/cc-tails-reviewed.json.
"""
import json, os

SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"]

NN = {  # transiting North Node conjunct natal {point}: growth activation
"sun":("A door opens toward who you're becoming, and your sense of purpose gets a push","Say yes to the stretch that scares you a little"),
"moon":("Your emotional life gets pulled toward growth, and the right people and feelings show up to move you","Let yourself be moved instead of retreating to the familiar"),
"mercury":("Your mind and voice get pulled toward what you're meant to learn and say","Follow the conversation or the study that opens a door"),
"venus":("Love and worth get pulled toward growth, and a connection or value can move you forward","Reach for the relationship or pleasure that stretches you"),
"mars":("Your drive locks onto something you're genuinely meant to pursue","Point it at the goal that matters and go"),
"ascendant":("You're being pulled to step into a truer version of yourself in the world","Show up as who you're becoming, not who you were"),
"midheaven":("Your public path gets a push toward its real direction","Take the visible step toward what you're meant to build"),
}
SN = {  # transiting South Node conjunct natal {point}: old pattern resurfaces for release
"sun":("An old version of yourself resurfaces, comfortable but outgrown","Notice what you're ready to stop leading with"),
"moon":("Old emotional patterns and familiar comforts come back around","Feel them, then let the ones you've outgrown go"),
"venus":("An old love pattern or a familiar comfort resurfaces","Enjoy what's real and release what keeps you small"),
"mars":("An old way of asserting yourself comes back, easy but limiting","Notice where the familiar fight isn't yours anymore"),
"ascendant":("An old self-image resurfaces, comfortable and outdated","Check whether it's still who you are before you lead with it"),
}

CORE = {
"ceres":"nurture, care, and how you give and receive nourishment, plus loss and what helps you grieve",
"pallas":"wisdom, strategy, and creative pattern-recognition, how you solve problems",
"juno":"commitment and partnership, and what you need to feel secure in a bond",
"vesta":"devotion and focus, what you hold sacred and where you tend the flame",
}
SIGNTEXT = {
"ceres":{"aries":"You nurture through action and encouragement, and you feel cared for when someone champions you","taurus":"You nurture through comfort, food, and steady presence, and you feel cared for through touch and calm","gemini":"You nurture through words and staying in touch, and you feel cared for when someone really listens","cancer":"You nurture instinctively and deeply, and you feel cared for when home feels safe","leo":"You nurture with warmth and generous attention, and you feel cared for when you're celebrated","virgo":"You nurture through practical help, and you feel cared for when someone eases your load","libra":"You nurture through harmony and fairness, and you feel cared for when things are balanced and kind","scorpio":"You nurture with fierce loyalty and depth, and you feel cared for when someone can hold your intensity","sagittarius":"You nurture by encouraging freedom, and you feel cared for when someone gives you room","capricorn":"You nurture through reliability and providing, and you feel cared for when someone shows up consistently","aquarius":"You nurture by giving space and accepting difference, and you feel cared for when you're free to be yourself","pisces":"You nurture with boundless compassion, and you feel cared for when someone receives your feelings gently"},
"pallas":{"aries":"You solve problems by acting fast and cutting straight to it","taurus":"You solve problems patiently and practically, building the durable answer","gemini":"You solve problems by gathering information and connecting the dots","cancer":"You solve problems intuitively, reading the emotional pattern under the surface","leo":"You solve problems creatively and boldly, with a flair for the big move","virgo":"You solve problems through analysis and careful, precise refinement","libra":"You solve problems by weighing all sides and finding the fair balance","scorpio":"You solve problems by investigating what's hidden and going to the root","sagittarius":"You solve problems with the big-picture view and a leap of faith","capricorn":"You solve problems strategically and structurally, playing the long game","aquarius":"You solve problems with unconventional, systems-level thinking","pisces":"You solve problems intuitively and imaginatively, sensing the whole"},
"juno":{"aries":"In commitment you need independence and a partner who keeps it exciting","taurus":"In commitment you need stability, loyalty, and steady closeness","gemini":"In commitment you need mental connection and a partner who keeps talking","cancer":"In commitment you need emotional safety and a shared sense of home","leo":"In commitment you need warmth, loyalty, and to feel special to them","virgo":"In commitment you need reliability and a partner who shows love through effort","libra":"In commitment you need fairness, harmony, and true partnership","scorpio":"In commitment you need depth, total honesty, and unbreakable trust","sagittarius":"In commitment you need freedom, honesty, and room to grow together","capricorn":"In commitment you need loyalty, structure, and a partner who's building too","aquarius":"In commitment you need friendship, space, and acceptance of your independence","pisces":"In commitment you need tenderness, devotion, and a spiritual connection"},
"vesta":{"aries":"You devote yourself with fierce, pioneering focus to what you start","taurus":"You devote yourself steadily to what you build and value","gemini":"You devote yourself to learning, ideas, and the work of communication","cancer":"You devote yourself to home, family, and caring for your people","leo":"You devote yourself to creative expression and what you love wholeheartedly","virgo":"You devote yourself to craft, service, and getting the work right","libra":"You devote yourself to relationship, beauty, and keeping the peace sacred","scorpio":"You devote yourself intensely to what you're committed to, all or nothing","sagittarius":"You devote yourself to a belief, a quest, or the search for meaning","capricorn":"You devote yourself to your work, your goals, and your responsibilities","aquarius":"You devote yourself to a cause, a community, or a vision of the future","pisces":"You devote yourself to the spiritual, the creative, and the compassionate"},
}

records=[]
for point,(scene,action) in NN.items():
    records.append({"id":f"cc/node-transit/north-node-conjunction-{point}","kind":"node_transit","node":"north","natal_point":point,
      "surface":"transits.node","status":"REVIEWED_CLAUSE","title":f"Transiting North Node conjunct your {point.capitalize()}",
      "slots":{"scene":scene,"action":action},"source_keys":["cc/ref/nodes/north-node"],
      "tone_version":"marie-calibrated-v1","originalityCheck":"voiced","review_note":"needs Marie/editorial final sign-off before serving"})
for point,(scene,action) in SN.items():
    records.append({"id":f"cc/node-transit/south-node-conjunction-{point}","kind":"node_transit","node":"south","natal_point":point,
      "surface":"transits.node","status":"REVIEWED_CLAUSE","title":f"Transiting South Node conjunct your {point.capitalize()}",
      "slots":{"scene":scene,"action":action},"source_keys":["cc/ref/nodes/south-node"],
      "tone_version":"marie-calibrated-v1","originalityCheck":"voiced","review_note":"needs Marie/editorial final sign-off before serving"})
for ast,meaning in CORE.items():
    records.append({"id":f"cc/asteroid/{ast}","kind":"asteroid_core","asteroid":ast,
      "surface":"me.natal_placement","status":"REVIEWED_CLAUSE","title":ast.capitalize(),
      "slots":{"meaning":f"{ast.capitalize()} is {meaning}"},"source_keys":[f"cc/ref/asteroid/{ast}"],
      "tone_version":"marie-calibrated-v1","originalityCheck":"voiced","review_note":"needs Marie/editorial final sign-off before serving"})
for ast,signs in SIGNTEXT.items():
    for sign in SIGNS:
        records.append({"id":f"cc/asteroid/{ast}-in-{sign}","kind":"asteroid_in_sign","asteroid":ast,"sign":sign,
          "surface":"me.natal_placement","status":"REVIEWED_CLAUSE","title":f"{ast.capitalize()} in {sign.capitalize()}",
          "slots":{"story":signs[sign]},"source_keys":[f"cc/ref/asteroid/{ast}",f"cc/sign/{sign}/lived-behaviors"],
          "tone_version":"marie-calibrated-v1","originalityCheck":"voiced","review_note":"needs Marie/editorial final sign-off before serving"})

out={"_meta":{"title":"Reviewed small tails: transiting-node contacts + asteroids (Ceres/Pallas/Juno/Vesta)",
      "node_transits":len(NN)+len(SN),"asteroid_cores":len(CORE),"asteroid_in_sign":len(SIGNTEXT)*12,
      "count":len(records),"tier":"REVIEWED_CLAUSE","tone_version":"marie-calibrated-v1"},"reviewed":records}
dest=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"phrasebank","cc-tails-reviewed.json")
json.dump(out,open(dest,"w"),indent=2,ensure_ascii=False)
print(f"wrote {len(records)} tail records ({len(NN)+len(SN)} node transits + {len(CORE)} asteroid cores + {len(SIGNTEXT)*12} asteroid-in-sign) -> {dest}")
