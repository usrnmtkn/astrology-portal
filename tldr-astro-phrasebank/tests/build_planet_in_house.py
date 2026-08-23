#!/usr/bin/env python3
"""
build_planet_in_house.py — planet-in-house, all 10 bodies x 12 houses (120).

The HOUSE layer, serving two surfaces:
  - natal placement: house_integration, composed on the planet-in-sign layer
  - home planetary horoscope: home_scene, in Marie's horoscope voice
      ("You've been ... This week ...", concrete, second person, no vague verbs)
Emits phrasebank/cc-planet-in-house-reviewed.json.
"""
import json, os

ORD = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}
DOMAIN = {1:"self and how you meet the world",2:"money, worth, and what you value",
 3:"your mind, siblings, and daily talk",4:"home, family, and roots",5:"creativity, romance, and play",
 6:"work, health, and routine",7:"partnership and close others",8:"shared resources, intimacy, and depth",
 9:"travel, study, and belief",10:"career and public life",11:"friends, networks, and the future",
 12:"the private, the unseen, and rest"}

# body -> house -> (house_integration [natal], home_scene [Marie horoscope voice])
H = {
"sun": {
 1:("your identity and vitality live right out front, in how you show up and take the lead","You've been letting the room set the tone. This week, how you show up is the whole story, so lead with it"),
 2:("your sense of self is tied to what you earn, own, and feel you're worth","You've been quietly measuring yourself by your bank balance. This week a purchase or a bill makes worth and money feel like the same thing, and they're not"),
 3:("you shine through your voice, your ideas, and the daily back-and-forth","You've been sitting on something you want to say. This week the conversation or the message wants out, so say it plainly"),
 4:("your core self is rooted in home, family, and your private base","You've been pouring everything into the outside world. This week you feel most like yourself at home, away from the noise"),
 5:("your identity wants to create, play, romance, and be seen making something","You've been playing it safe. This week the urge to make something, or to flirt, gets loud, so let yourself"),
 6:("you find yourself through useful work, routine, and tending the body","You've been running on autopilot. This week the daily grind and your body ask for attention, and small fixes matter"),
 7:("you meet yourself through partnership and the person across from you","You've been going it alone. This week a close relationship holds up a mirror, and you meet yourself in how someone responds"),
 8:("your identity deepens through what's shared, intimate, and transformed","You've been keeping things on the surface. This week something shared, trusted, or hidden asks you to get honest"),
 9:("your sense of self needs the bigger view: belief, study, and horizon","You've been circling a bigger question about where your life is headed. This week it gets concrete: a class, a trip, or a belief you're ready to act on"),
 10:("you're most yourself in the open, in your work and public standing","You've been under-owning your work. This week your public role and reputation are lit up, and what you're known for matters"),
 11:("your identity lives in the group, the network, and the future you're building","You've been drifting from your people. This week friends, community, and a future plan pull focus, so show up for them"),
 12:("your core self works quietly, behind the scenes, in the unseen and the restful","You've been pushing through on empty. This week you need more solitude than usual, and the real work happens quietly"),
},
"moon": {
 1:("your feelings show on the surface and shape how you come across","You've been managing how you come across. This week your mood shows whether you mean it to or not, so let it"),
 2:("your emotional security is tied to money, comfort, and what you own","You've been tying your sense of safety to your bank balance. This week feeling secure and feeling solvent run together, so tend both"),
 3:("you feel through talking, and your moods move with your daily conversations","You've been keeping a feeling to yourself. This week a conversation stirs it up, so say the tender thing plainly"),
 4:("your emotional core lives at home, in family and the need to belong","You've been away from home too much. This week you need to go home, in whatever form that takes, and be soft there"),
 5:("you need creative expression and affection to feel emotionally fed","You've been all business. This week your heart wants play and warmth, so make or love something"),
 6:("you settle emotionally when the routine works and the body's cared for","You've been ignoring the small stuff. This week a bit of order and self-care steadies your whole mood"),
 7:("your feelings center on the person across from you and being met","You've been waiting to be noticed. This week you're looking to a close other for comfort, so ask for it directly"),
 8:("your emotional life runs deep, private, and all-in on trust","You've been holding a heavy feeling down. This week it surfaces, so let it move through you instead of gripping it"),
 9:("you feel best with room, hope, and something bigger to reach for","You've been feeling boxed in. This week your mood wants room and meaning, so give it some horizon"),
 10:("your feelings are tied to your standing and how you're seen publicly","You've been taking work personally. This week how your efforts land hits your mood, so don't read it as a verdict on you"),
 11:("you feel held by your people and your sense of a shared future","You've been isolating. This week time with your people feeds you, so lean toward the group"),
 12:("your emotional life is quiet and inward, needing rest and retreat","You've been running loud. This week you need to withdraw and refill, so protect the quiet"),
},
"mercury": {
 1:("you think out loud and lead with your mind and your words","You've been holding your thoughts back. This week people meet you through what you say, so say the clear version"),
 2:("your thinking turns to money, value, and practical worth","You've been avoiding the numbers. This week your mind's on the budget and what's worth it, so do the math"),
 3:("your mind is at home here: messages, errands, siblings, quick learning","You've been meaning to reply. This week the messages and errands pile up, so keep the channel clear"),
 4:("you think about home and family, and old memories thread your thoughts","You've been avoiding a family conversation. This week it comes up, and old memories thread into it"),
 5:("your thinking is playful and creative, made to be expressed","You've been overthinking something creative. This week an idea wants to become something, so say or make the fun thing"),
 6:("your mind runs the details of work, health, and routine","You've been putting off the admin. This week the to-do list and the fine print want handling"),
 7:("you think by dialoguing; you sharpen ideas against a close other","You've been talking around the real thing. This week a conversation with someone close clarifies it, so listen too"),
 8:("your mind digs into what's hidden, shared, and psychologically deep","You've been skimming the surface. This week you want the real story underneath, so dig honestly"),
 9:("your thinking reaches for the big picture, belief, and the far view","You've been stuck in the weeds. This week a bigger idea or a plan to learn or travel pulls your focus"),
 10:("your ideas and communication shape your public work and reputation","You've been under-sharing your ideas. This week what you say publicly matters, so put it in writing"),
 11:("your mind runs on networks, ideas shared with the group, and the future","You've been quiet in the group. This week a shared conversation or a future plan gets your gears going"),
 12:("your thinking works quietly and intuitively, behind the scenes","You've been thinking in circles. This week the insight comes when you stop pushing, so make room for quiet"),
},
"venus": {
 1:("your charm and taste come through in how you present and meet people","You've been dressing yourself down. This week you're more magnetic than usual, so let yourself be liked"),
 2:("you value comfort and beauty, and your worth ties to what you have","You've been denying yourself the nice thing. This week pleasure and money mix, so treat yourself, within reason"),
 3:("you connect through words, wit, and the people close by","You've been all business with the people close by. This week a warm word or a small kindness lands well"),
 4:("your love lives at home, in comfort and the people who feel like family","You've been neglecting your space. This week you want it warm and your people close, so make it so"),
 5:("you love romance, play, and making beautiful things","You've been too serious. This week the flirtation and the creative pleasure are the point, so enjoy them"),
 6:("you show love through the practical: helping, tending, remembering","You've been saying love in grand terms. This week it shows up in small useful acts instead"),
 7:("partnership and harmony are the whole point; you love the us","You've been keeping the peace over your own preference. This week a close relationship wants honesty, so say what you want from it"),
 8:("you love deeply and all-in, where trust and intimacy are shared","You've been guarding your heart. This week closeness deepens, so get honest about what you actually want"),
 9:("you love adventure, honesty, and a partner who expands your world","You've been settling for the familiar. This week connection wants room and adventure, so reach for it"),
 10:("your values and relationships touch your public life and work","You've been hiding what you value at work. This week who and what you value shows up publicly"),
 11:("you connect through friendship, shared ideals, and the group","You've been skipping your friends. This week your people and a shared cause bring warmth, so show up"),
 12:("your love is tender, private, and a little idealized","You've been idealizing someone quietly. This week a tender feeling stirs, so enjoy it with one foot on the ground"),
},
"mars": {
 1:("your drive comes straight through you; you act first and directly","You've been holding your energy in. This week it's high and up front, so aim it before you spend it"),
 2:("you put your energy into earning, building, and securing what's yours","You've been passive about money. This week you're driven to earn or secure something, and steady wins"),
 3:("your drive goes into words, errands, and quick daily moves","You've been biting your tongue. This week you're sharp and busy, so pick your words before you fire them"),
 4:("your energy turns toward home, family, and defending your base","You've been simmering about the household. This week there's heat at home, so fix or move the thing instead of stewing"),
 5:("you act on desire and creative impulse; you chase what delights you","You've been sitting on a bold move. This week the urge to make it, or to make a bold pass, is strong"),
 6:("your drive powers the work, the routine, and the body's upkeep","You've been letting the routine slide. This week energy goes into getting things done, so channel it into the task"),
 7:("your assertion plays out through others, in partnership and open conflict","You've been avoiding a conflict. This week a relationship gets charged, so have it out cleanly, not sideways"),
 8:("your drive is intense and strategic around what's shared and hidden","You've been circling a power dynamic. This week it heats up, so aim for real change, not for winning"),
 9:("you chase the big goal, the trip, the belief worth fighting for","You've been restless for something bigger. This week you want to bolt toward it, so point the energy true"),
 10:("your ambition drives your career and public push","You've been holding back at work. This week you're driven, so push hard and pick fights with authority carefully"),
 11:("your energy goes into the group, the cause, and the future you're building","You've been quiet in the group. This week you're fired up about a shared goal, so put the drive to collective use"),
 12:("your drive works quietly, best aimed at something you believe in","You've been running on empty. This week your energy is low or hidden, so rest, then act on the quiet conviction"),
},
"jupiter": {
 1:("growth and confidence come through simply being yourself","You've been playing small. This week doors open just by showing up as you, so take the opening"),
 2:("your luck and growth run through money, worth, and resources","You've been undercharging yourself. This week an opening around income or worth appears, so grow it without overreaching"),
 3:("you expand through learning, talking, and connecting locally","You've been keeping ideas to yourself. This week they multiply and want sharing, so say the idea before it's perfect"),
 4:("your abundance lives in home, family, and roots","You've been outgrowing your space. This week home life wants to expand, so grow it in one sustainable way"),
 5:("you grow through creativity, romance, and play","You've been holding your joy back. This week permission to be big and expressive is in the air, so take it"),
 6:("your growth comes through useful work and steady improvement","You've been grinding without reward. This week an opening at work or in your routine pays if you tend it"),
 7:("partnership expands your world; you grow through the right people","You've been going it alone. This week a relationship opens doors, so invest without overpromising"),
 8:("you gain through what's shared and by releasing the shallow","You've been guarding what's shared. This week a deep opening appears, so go in honestly"),
 9:("you grow by reaching: travel, study, belief, the bigger horizon","You've been staying close to home. This week a bigger question or journey calls, so say yes to the growth"),
 10:("your expansion shows up in career and public standing","You've been waiting to be picked. This week a professional opening appears, so reach for it and prepare properly"),
 11:("you grow through community, networks, and shared vision","You've been outside the circle. This week your community or a shared cause opens something up"),
 12:("your growth is inward: faith, imagination, and quiet replenishment","You've been ignoring your inner life. This week the growth is private, so trust the quiet current"),
},
"saturn": {
 1:("you build discipline into your very identity and how you show up","You've been half-committed to who you're being. This week it asks you to get serious, so do the real part"),
 2:("your work is around worth and security, built slowly","You've been avoiding a money reality. This week worth or income is under weight, so build the base for real"),
 3:("you bring structure to your voice, your mind, and daily commitments","You've been letting your word slip. This week a message or plan needs care and follow-through"),
 4:("your foundation work is at home, in family and roots","You've been deferring a home responsibility. This week it asks to be handled, not put off"),
 5:("you learn to earn creative recognition and take play seriously","You've been dabbling. This week a creative or romantic effort asks for real commitment"),
 6:("your discipline lives in work, health, and the daily grind","You've been skipping maintenance. This week the routine and your body ask for honest upkeep"),
 7:("you build commitment and honest limits into partnership","You've been vague with a partner. This week a relationship asks for a clearer agreement or limit"),
 8:("your work is around trust, shared resources, and control","You've been avoiding a shared reckoning. This week something owed or trusted asks for honesty"),
 9:("you test and structure your beliefs instead of borrowing them","You've been borrowing your beliefs. This week one gets tested, so do the unglamorous groundwork"),
 10:("you build authority and responsibility in your public life","You've been carrying more than the credit. This week your career asks you to carry it well and prove it over time"),
 11:("you bring structure to your networks and your future goals","You've been loose with a goal. This week a friendship or a long-term plan asks for realism and commitment"),
 12:("your discipline is inward and quiet, giving form to the unseen","You've been avoiding the quiet work. This week tend the hidden thing before it grows"),
},
"uranus": {
 1:("you disrupt and reinvent your own identity and self-presentation","You've been performing a version of yourself. This week a restless urge to change how you show up spikes, so experiment where you can undo it"),
 2:("you rethink money, worth, and security in unconventional ways","You've been clinging to a money habit. This week a sudden shift around income or values shakes it up"),
 3:("your mind and communications run on the unexpected","You've been thinking the usual way. This week a surprising idea jolts you, so write it down"),
 4:("you break and remake the meaning of home and family","You've been keeping home the same. This week the urge to change the setup or the family script rises"),
 5:("you reinvent how you create, play, and express yourself","You've been creating on script. This week an original impulse breaks the routine, so follow it"),
 6:("you overhaul work, health, and the daily machine","You've been stuck in the same routine. This week a sudden change to it opens something"),
 7:("you rewrite the terms of your relationships","You've been holding a relationship in place. This week it wants more freedom or a new shape"),
 8:("you crack open the shared, the hidden, and the taboo","You've been guarding a shared arrangement. This week a jolt around it surfaces something"),
 9:("you disrupt your beliefs and reach for radical new views","You've been sure of a belief. This week it gets questioned, and a new horizon appears"),
 10:("you break and rebuild your public path","You've been on the expected path. This week the urge to reinvent your work gets loud"),
 11:("you innovate through your networks and future vision","You've been coasting with your circle. This week a group or a future plan takes a surprising turn"),
 12:("you awaken the unconscious and dissolve old inner limits","You've been ignoring an inner nudge. This week a private breakthrough stirs, so give the restlessness quiet room"),
},
"neptune": {
 1:("your identity blurs and idealizes; you're a screen others project onto","You've been unsure how you come across. This week your image gets dreamy or unclear, so ground it in one real thing"),
 2:("your relationship to money and worth gets dreamy or foggy","You've been fuzzy about money. This week the numbers blur, so check them before you commit"),
 3:("your thinking gets imaginative, intuitive, and easily misled","You've been hearing what you hope for. This week facts and wishes blur, so confirm before you agree"),
 4:("home and family carry a dream, a longing, or a fog","You've been longing for a home that isn't quite here. This week it feels tender and undefined, so keep one concrete anchor"),
 5:("your creativity and romance run on inspiration and idealization","You've been chasing an ideal. This week inspiration runs high, so make the real thing and stay grounded"),
 6:("your work and health need compassion, and boundaries blur","You've been running on fumes. This week your energy is diffuse, so rest and don't over-give"),
 7:("you idealize partners and long for perfect union","You've been seeing the best in someone. This week enjoy it, but stay clear-eyed about what's actually offered"),
 8:("the shared and the hidden get dreamy, inspired, or confused","You've been blurred about something shared. This week wait to decide until it clears"),
 9:("your beliefs turn mystical, visionary, or escapist","You've been longing for meaning. This week a vision rises, inspiring but easy to get lost in"),
 10:("your public path dissolves and reforms around a calling","You've been foggy on your direction. This week your sense of the path dissolves, so take one grounded step"),
 11:("your ideals and community carry a dream and a haze","You've been chasing a shared dream. This week it inspires, so keep one foot on the ground"),
 12:("your inner life is oceanic, spiritual, and porous","You've been thin-skinned lately. This week the veil is thin, so rest, create, and protect your edges"),
},
"pluto": {
 1:("you transform your very self, from the identity up","You've been holding a version of yourself together. This week a deep pressure to become truer builds, so let the false part go"),
 2:("you transform your relationship to money, worth, and power","You've been avoiding a truth about money or power. This week the reckoning around value intensifies"),
 3:("your mind and words carry transformative, penetrating power","You've been softening what you mean. This week a conversation digs deep, so say it plainly"),
 4:("you transform home, family, and the foundation itself","You've been avoiding something in the family. This week it surfaces to be dealt with"),
 5:("you transform how you create, love, and express power","You've been guarding your creative fire. This week an intense pull surfaces, so aim it at real change"),
 6:("you transform work, health, and the systems of daily life","You've been pushing through your body's signals. This week a deep shift in your routine or health asks to be faced"),
 7:("you transform through relationship, power, and intimacy","You've been keeping the power even. This week a relationship intensifies, so get honest about the balance in it"),
 8:("you're at home in the depths: shared power, death, rebirth","You've been circling something shared. This week it forces a real reckoning"),
 9:("you transform your beliefs and how far your mind reaches","You've been sure of a worldview. This week it gets overturned and rebuilt from the ground"),
 10:("you transform your public role and relationship to power","You've been managing your image. This week your standing or ambition goes through a real reckoning"),
 11:("you transform your community and your role in the collective","You've been part of a group dynamic. This week it undergoes deep change"),
 12:("you transform the unconscious and what's been buried","You've been sitting on something buried. This week a quiet, private purge surfaces, so face it and release it"),
},
}

records = []
for body, houses in H.items():
    for h, (integ, home) in houses.items():
        records.append({
            "id": f"cc/planet-in-house/{body}-in-{ORD[h]}-house",
            "body": body, "house": h, "status": "REVIEWED_CLAUSE",
            "surfaces": ["me.natal_placement", "home.planetary_horoscope"],
            "kind": "planet_in_house",
            "house_domain": DOMAIN[h],
            "house_integration": integ,   # natal: completes "In the Nth house, ..."
            "home_scene": home,           # home planetary horoscope, Marie horoscope voice
            "source_keys": [f"cc/planet/{body}", f"cc/house/{h}"],
            "doctrine_source": "CC layer-order logic + cc/house scenes (voiced original)",
            "tone_version": "marie-calibrated-v1",
            "originalityCheck": "voiced original; home_scene in Marie's horoscope voice (You've been ... this week ...)",
            "review_note": "needs Marie/editorial final sign-off before serving",
        })

out = {"_meta": {"title": "Reviewed planet-in-house (natal house layer + Home planetary horoscope)",
        "count": len(records), "bodies": list(H.keys()),
        "serves": {"me.natal_placement": "house_integration (composed on the sign layer)",
                   "home.planetary_horoscope": "home_scene (Marie horoscope voice, personalized by rising-sign house)"},
        "tier": "REVIEWED_CLAUSE", "tone_version": "marie-calibrated-v1"},
       "reviewed": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-planet-in-house-reviewed.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} planet-in-house records (natal integration + Marie-voice home scene) -> {dest}")
