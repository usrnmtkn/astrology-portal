#!/usr/bin/env python3
"""
build_lunation_by_sign.py — CONFIRMED by-sign lunation cards (Marie, verbatim).

Exact transcriptions of published by-sign lunation cards:
  - Libra New Moon, by SUN sign (12/12) — exemplifies me.lunation.new-moon-by-sun.v1
  - Taurus Full Moon (Nov 5, 2025), by RISING sign (4/12 supplied) —
    exemplifies me.lunation.full-moon-by-rising.v1 (always names the house axis)

Tier CONFIRMED: serve-verbatim, never tone-passed or seam/register-linted (they contain
some older phrasing the author has since moved away from — preserved because they are her
exact words). Each record carries the house the lunation falls in for that sign, verified
against the card's own life-area language. Emits phrasebank/ms-lunation-by-sign-confirmed.json.
"""
import json, os

URL_NM = "https://mariesatori.com/blogs/astrology/libra-new-moon-2025"
URL_FM = "https://mariesatori.com/blogs/astrology/full-moon-in-taurus"

# Libra New Moon — keyed by SUN sign -> (house Libra falls in, verbatim text)
NEW_MOON_LIBRA = {
 "aries": (7, "This New Moon is all about your relationships and partnerships. You might be noticing where you've been doing too much in your relationships or accepting less than you deserve just to avoid arguments. It's time to stop picking fights when you feel overwhelmed by closeness, stop choosing people who need to be \"fixed\" instead of equals. You learned early that love might disappear if you showed too much of yourself, so you either hold back completely or push people away first. When someone gets close, you might feel like you can't breathe, get irritated over small things, or suddenly find major flaws in them. This month, when you feel the urge to start an argument or pull away, pause and ask yourself what you're really worried about. It's most likely about feeling too vulnerable."),
 "taurus": (6, "This New Moon focuses on your daily life, health routines, and how you help others. You might be seeing where trying to be perfect and always saying yes to people has hurt your well-being. The universe is supporting you to learn new ways of taking care of yourself and being productive that feel more natural to you. You probably feel guilty every time you consider saying no to someone, even when you're already overwhelmed. Your shoulders might tense up when someone asks for help because part of you wants to say yes and part of you knows you can't handle one more thing. This month, practice this phrase: \"Let me check my schedule and get back to you.\" This buys you time to think about whether you can genuinely help without resenting it later."),
 "gemini": (5, "This New Moon lights up your creativity, self-expression, and what brings you joy. You might be realizing where you've been creating things just to impress others rather than because you genuinely feel inspired. You might feel emotionally blocked around being seen or judged for your real creative voice. You're probably really good at being clever and entertaining, but when someone asks what you really think or feel about something, you might freeze up or deflect with humor. This month, try sharing something you're genuinely curious about but don't have figured out yet. The fear that you're not smart enough is usually just fear of being ordinary or boring."),
 "cancer": (4, "This New Moon affects your home, family, and emotional foundation. You might be seeing where you've been managing everyone else's feelings while ignoring your own. Your protective instincts are heightened, but so is your courage to set emotional boundaries. It's time to stop being the family therapist who soaks up everyone's drama, release guilt about wanting privacy or space from family duties, and let go of the belief that loving someone means never disappointing them. When you let go of these caretaking patterns, you create space for intimacy based on choice rather than guilt."),
 "leo": (3, "This New Moon focuses on your communication, learning, and local community. You might be noticing where you've been dimming your natural brightness to fit in or avoid standing out too much. You've probably been called \"too much\" at some point, so now you automatically dial yourself down in groups. You might notice yourself agreeing with opinions you don't share or staying quiet when you have something interesting to say. If someone seems uncomfortable with your energy, that's data about compatibility, not a sign that you need to dim your fire."),
 "virgo": (2, "This New Moon illuminates your values, money, and self-worth. You might be seeing where perfectionism has become a prison that keeps you from receiving good things in life. Old emotional patterns around not having enough or not being worthy enough are being challenged. You probably feel uncomfortable asking for money, charging what you're worth, or even wanting nice things because some part of you thinks you haven't earned it yet. If you feel guilty about wanting financial security or nice things, remind yourself that money is just a tool that gives you options and reduces stress. This month, practice charging appropriately for your time and skills."),
 "libra": (1, "This New Moon is happening in your sign, affecting your identity and self-expression. You might be seeing where you've been shape-shifting to please others instead of developing who you really are. It's time to stop automatically copying others' energy to get approval, release the exhausting habit of being what you think people want you to be, and let go of the fear that having strong preferences makes you difficult. The right people will appreciate knowing what you want instead of having to guess. If someone gets upset when you express preferences, that tells you something important about whether they want to know the real you or just want you to be agreeable."),
 "scorpio": (12, "This New Moon affects your spirituality, hidden patterns, and what you need to release. You might be discovering unconscious relationship patterns that have been sabotaging your connections without you realizing it. Deep emotions are being stirred up, bringing buried feelings to the surface. It's time to stop testing people's loyalty through emotional intensity or pulling away, release the belief that being vulnerable equals being weak or manipulative, and let go of the fear that being truly known will lead to abandonment. When you let go of these protective patterns, you create space for relationships based on trust rather than control."),
 "sagittarius": (11, "This New Moon focuses on your friendships, groups, and future vision. You might be seeing where you've been compromising your authentic vision to belong to groups that don't really match your values. You might feel emotionally attached to old friendships that no longer support your growth. It's time to stop staying in social circles that require you to be less adventurous or curious, release the fear that following your vision will leave you isolated."),
 "capricorn": (10, "This New Moon affects your career and public reputation. You might be seeing where you've been building success through strategies that compromise your values. You've probably built your success by being reliable, capable, and professional. But lately, it might feel like you're playing a role at work that doesn't fully reflect who you are. This month, try letting a bit more of your self show. If you notice fear about being seen as too emotional or unprofessional, remember where that comes from... old stories about what success is supposed to look like. In reality, people connect with honesty."),
 "aquarius": (9, "This New Moon focuses on your beliefs, higher learning, and expansion. You might be seeing where you've been thinking about relationships instead of feeling emotional connection. Let yourself feel without labeling or explaining it. This month, practice just being present with emotions, yours and other people's, without trying to fix, understand, or solve anything. When someone opens their heart to you, resist the urge to fix or advise. Just listen. Let the silence hold what words can't."),
 "pisces": (8, "This New Moon affects your intimacy, transformation, and shared resources. You might be seeing where you've been giving your power away in close relationships by being overly adaptable. You might feel emotional resistance to claiming your power in partnerships. It's time to stop absorbing others' emotions and problems as if they were your own, release the belief that love requires losing yourself in another person, and let go of the fear that having boundaries will push people away. When you let go of these merging patterns, you discover that healthy interdependence is more intimate than losing yourself. Your path forward is about teaching others that intimacy includes keeping your individual essence while sharing deep connection, helping heal collective patterns around love and power."),
}

# Taurus Full Moon — keyed by RISING sign -> (house, axis label, verbatim text)
FULL_MOON_TAURUS = {
 "aries": (2, "2nd/8th", "The Full Moon lands in your 2nd house, highlighting the 2nd/8th house axis of personal resources versus shared wealth. If you lost income, that's genuinely destabilizing. You need money to live. And also: your worth isn't determined by your earning capacity. Both things are true. This might be the moment to look at financial support you've been too proud to access. Unemployment benefits, family loans, debt renegotiation. Mars opposing Uranus suggests your ideas about self-sufficiency might be keeping you stuck. What if independence doesn't mean doing it all alone? There might be resources available that you haven't considered yet. Uranus wants to liberate you from rigid ideas about how money should work."),
 "taurus": (1, "1st/7th", "The Full Moon lands in your 1st house, highlighting the 1st/7th house axis of self versus partnership. You're at maximum visibility. The Mars-Uranus opposition probably shook up a close partnership. This Full Moon illuminates the gap between how you show up for yourself versus in relationships. If you've been reaching for shopping or comfort food when emotions get uncomfortable, that pattern is visible now. Your body carries information you might not have words for yet. This could be a moment to let someone see you when things aren't together. \"I'm struggling with this,\" instead of \"Everything's fine.\" You might be ready to release the composed exterior that costs too much to maintain, and the relationships where you do all the fixing."),
 "gemini": (12, "12th/6th", "The Full Moon lands in your 12th house, highlighting the 12th/6th house axis of rest versus daily work. The exhaustion you've been outrunning, the emotions you've been staying too busy to feel, all of it becomes visible now. You've been running on adrenaline and stress hormones for longer than you realized. This Full Moon illuminates the cost. Your body knows the difference between sustainable effort and survival mode. As you navigate job searching or income rebuilding, experiment with building rest into the foundation instead of treating it as something earned. You might be ready to let go of the belief that rest is earned, the busyness that protects you from feeling."),
 "cancer": (11, "11th/5th", "The Full Moon lands in your 11th house, highlighting the 11th/5th house axis of community versus creative self-expression. Which connections are authentic and which aren't. You might be noticing a pattern where you edit yourself in group settings. Agreeing when you disagree, staying quiet when you have something to say. Your body registers this self-editing. Fitting in has felt more important than being fully yourself. This could be a week to experiment with small moments of honesty or stepping back from commitments that drain you. Maybe this Full Moon is inviting you to release the friendships that only work when you're accommodating, the creative projects shaped by imagined approval."),
}

records = []
for sign, (house, text) in NEW_MOON_LIBRA.items():
    records.append({
        "id": f"ms/lunation/new-moon-libra/{sign}",
        "lunation_type": "new_moon", "lunation_sign": "libra",
        "keyed_by": "sun", "sign": sign, "house": house,
        "template_match": "me.lunation.new-moon-by-sun.v1",
        "text": text, "tier": "CONFIRMED",
        "source": f"Marie Satori — Libra New Moon ({sign.title()})", "url": URL_NM,
        "serving": "serve-verbatim; never tone-passed or linted",
    })
for sign, (house, axis, text) in FULL_MOON_TAURUS.items():
    records.append({
        "id": f"ms/lunation/full-moon-taurus/{sign}-rising",
        "lunation_type": "full_moon", "lunation_sign": "taurus",
        "keyed_by": "rising", "sign": sign, "house": house, "house_axis": axis,
        "template_match": "me.lunation.full-moon-by-rising.v1",
        "text": text, "tier": "CONFIRMED",
        "source": f"Marie Satori — Taurus Full Moon ({sign.title()} Rising)", "url": URL_FM,
        "serving": "serve-verbatim; never tone-passed or linted",
    })

out = {"_meta": {"title": "By-sign lunation cards (Marie, CONFIRMED verbatim)",
        "count": len(records),
        "new_moon_libra_by_sun": len(NEW_MOON_LIBRA),
        "full_moon_taurus_by_rising": len(FULL_MOON_TAURUS),
        "tier": "CONFIRMED",
        "note": "Exact published cards. Full-Moon cards always name the house axis. "
                "Preserved verbatim even where they use phrasing the author has since "
                "moved away from; excluded from tone_pass and seam/register lints.",
        "gaps": "Taurus Full Moon supplied for aries/taurus/gemini/cancer rising; "
                "remaining 8 rising signs exist on-site and can be added when supplied."},
       "cards": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "phrasebank", "ms-lunation-by-sign-confirmed.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} CONFIRMED by-sign lunation cards "
      f"({len(NEW_MOON_LIBRA)} new-moon by sun + {len(FULL_MOON_TAURUS)} full-moon by rising) -> {dest}")
