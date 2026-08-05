# Dedupe chunk 1 owner revisions

Status: **all 30 payloads are exact-owner-approved against the hashes below.** Original Sol drafts, provider responses, model inputs, and Terra verdicts remain untouched. No additional Sol or Terra calls were made. Exact-approval records are stored beside each owner-revision candidate. Serving through the draft PR still requires separate merge authorization.

Payload hashes use `sha256(JSON.stringify(payload))`. Each JSON block below is the exact payload proposed for hash-bound approval.

## Decision counts

- Approved as drafted: 21
- Deletion-only owner revisions: 9
- Deterministic checks passed: 30 of 30
- Additional billed calls: 0

## Sun–Moon conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "What you want often matches what {{holder2}} needs before either of you says much. When you act on a plan, {{holder2}} often feels settled by it, and their ease encourages you to keep going. The cost is that you can both assume this match will handle everything, then miss when your priorities split or stop building on what you share. {{holder2}} can feel deeply understood by you without having to explain every feeling.",
  "body_they": "What {{holder1}} wants often matches what you need before either of you says much. When {{holder1}} acts on a plan, you often feel settled by it, and your ease encourages them to keep going. The cost is that you can both assume this match will handle everything, then miss when your priorities split or stop building on what you share. You can feel deeply understood by {{holder1}} without having to explain every feeling.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `b487e32275f554303e9b909e71516cce666a543f5c4a7eac5ac97684107c47a5`

## Sun–Moon hard

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "When you push ahead with what you want to build, {{holder2}} can feel that their need for reassurance or rest is getting in your way. They may go quiet and adjust around you, which leaves them tense and leaves you unsure why they are pulling back.",
  "body_they": "When {{holder1}} pushes ahead with what they want to build, you can feel that your need for reassurance or rest is getting in their way. You may go quiet and adjust around them, which leaves you tense and leaves {{holder1}} unsure why you are pulling back.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `ee31044d043ce2f9aa9cfad7b8522a462350c0b0e338416faee01e59ace45033`

## Sun–Moon soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "Your way of being puts {{holder2}} at ease, and they show you what they feel without much explanation. You respond naturally to their feelings, so closeness builds quickly. Because the fit feels easy, you can both become passive and stop showing care. Around you, {{holder2}} does not need to prove they are worthy.",
  "body_they": "{{holder1}}'s way of being puts you at ease, and you show them what you feel without much explanation. They respond naturally to your feelings, so closeness builds quickly. Because the fit feels easy, you can both become passive and stop showing care. Around {{holder1}}, you do not need to prove you are worthy.",
  "warmthSource": {
    "sourceArticleId": "sagittarius-full-moon-2025",
    "originalLine": "You don’t need to prove you’re worthy.",
    "usedForm": {
      "body_you": "Around you, {{holder2}} does not need to prove they are worthy.",
      "body_they": "Around {{holder1}}, you do not need to prove you are worthy."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `711727f56af0f5654c9e3037534775547ae9df484cbd3c64bcb79e176abaebdb`

## Sun–Sun conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You and {{holder2}} recognize yourselves in each other quickly, and your confidence reinforces theirs as theirs reinforces yours. You often want the same direction and recognition, which makes it easy to move together but hard to tell whose priorities are leading. When both of you want to stand out, that mutual validation can turn into competition.",
  "body_they": "{{holder1}} and you recognize yourselves in each other quickly, and their confidence reinforces yours as yours reinforces theirs. You often want the same direction and recognition, which makes it easy to move together but hard to tell whose priorities are leading. When both of you want to stand out, that mutual validation can turn into competition.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `b9adacd7934a37f176eb6995495bc2db1e66302da829ebc7b088d768c5efd44e`

## Sun–Sun hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You and {{holder2}} often want different things at the same time, and both of you can feel crowded by the other's direction. When you insist on your way, {{holder2}} pushes back to protect theirs, and that resistance makes you press harder. Disagreements can become contests over whose judgment and priorities will lead.",
  "body_they": "{{holder1}} and you often want different things at the same time, and both of you can feel crowded by the other's direction. When {{holder1}} insists on their way, you push back to protect yours, and your resistance makes {{holder1}} press harder. Disagreements can become contests over whose judgment and priorities will lead.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `237b6dc8517923ab5ac2b2f941b0b76c1845dcbda25c26c8190a135ef3fd300e`

## Sun–Sun soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "When you state what matters to you or choose a direction, {{holder2}} tends to meet you without asking you to tone yourself down. {{holder2}} shows the same confidence in who they are, and you respond by backing their direction rather than competing with it. Because this support feels natural, either of you can assume you are aligned without saying where your goals differ.",
  "body_they": "When {{holder1}} states what matters to them or chooses a direction, you tend to meet them without asking them to tone themselves down. You show the same confidence in who you are, and {{holder1}} responds by backing your direction rather than competing with it. Because this support feels natural, either of you can assume you are aligned without saying where your goals differ.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `2982272d36e04c176505bf2305d48b28b755d9c685b09da5cb731e509c1a5a62`

## Sun–Mercury conjunction

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "When you are together, you give {{holder2}} a lot to think and say, and they can quickly put words to who you are. As they keep describing you back to yourself, their view can start shaping how you see and present yourself. The cost is that their definitions can become so constant that your own sense of yourself gets harder to hear.",
  "body_they": "When you are together, {{holder1}} gives you a lot to think and say, and you can quickly put words to who they are. As you keep describing them back to themselves, your view can start shaping how they see and present themselves. The cost is that your definitions can become so constant that their own sense of themselves gets harder to hear.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `99ad27eddfbf36be43bdbcd08faa05fe3ec0ed94dc4ba07425cb69bb8f6b16bb`

## Sun–Mercury hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "{{holder2}}'s questions and strong opinions can feel like challenges to who you are or where you are going. You may respond by defending yourself or pushing back on how {{holder2}} thinks, which can make them more insistent about explaining their point. Even basic conversations can turn tense, leaving both of you feeling misunderstood.",
  "body_they": "{{holder1}} can take your questions and strong opinions as challenges to who they are or where they are going. They may respond by defending themselves or pushing back on how you think, which can make you more insistent about explaining your point. Even basic conversations can turn tense, leaving both of you feeling misunderstood.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `84acf46e4845aec1b7d83650a5108def8e0b8a73048cdb53df093bbb90c9e3ec`

## Sun–Mercury soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "Your sense of who you are is easy for {{holder2}} to understand, so they usually follow what you mean without making you explain every step. Their replies help you put your position into clearer words, and you leave the conversation feeling more like yourself. This takes little effort, which can make its steadying effect easy to overlook.",
  "body_they": "{{holder1}}'s sense of who they are is easy for you to understand, so you usually follow what they mean without making them explain every step. Your replies help {{holder1}} put their position into clearer words, and they leave the conversation feeling more like themselves. This takes little effort, which can make its steadying effect easy to overlook.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `50468e2e49a63514678073430f9613b6b8e1a6bdfb17be8320e999f0a73e043e`

## Sun–Venus conjunction

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "{{holder2}} shows affection by praising who you are, and you become more open and expressive in response. Your sense of worth can become tied to external validation when their praise starts determining how good you feel about yourself.",
  "body_they": "You show affection by praising who {{holder1}} is, and {{holder1}} becomes more open and expressive in response. {{holder1}}'s sense of worth can become tied to external validation when your praise starts determining how good they feel about themselves.",
  "warmthSource": {
    "sourceArticleId": "total-lunar-eclipse-in-virgo",
    "originalLine": "If your financial situation feels unstable, if your sense of worth has been tied to external validation, if the structures that once made you feel safe now feel like constraints, this is where the illusion falls apart.",
    "usedForm": {
      "body_you": "Your sense of worth can become tied to external validation when their praise starts determining how good you feel about yourself.",
      "body_they": "{{holder1}}'s sense of worth can become tied to external validation when your praise starts determining how good they feel about themselves."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `2a427f56e6180fc03d487d872ebd4b4c78b439fd7154020b16176fd9f0ebc4e2`

## Sun–Venus hard

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "{{holder2}} tends to show affection by praising qualities they value, but those are not always the parts of you that you most want recognized. When you seem disappointed or pull back, {{holder2}} may try harder in the same way, leaving you feeling unseen and them confused about why their care does not land.",
  "body_they": "You tend to show affection by praising qualities you value in {{holder1}}, but those are not always the parts that {{holder1}} most wants you to recognize. When {{holder1}} seems disappointed or pulls back, you may try harder in the same way, leaving {{holder1}} feeling unseen and you confused about why your care does not land.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `a54cfc797dcda4f050012ebb4cd12f63f17d82beeb6b15e8e5d1349eacb728f3`

## Sun–Venus soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You readily respond to the way {{holder2}} shows affection, which leaves you feeling noticed and appreciated. Your response makes {{holder2}} feel comfortable showing care without having to work at it. Because getting along takes so little effort, both of you may stop actively engaging and let the connection become routine.",
  "body_they": "{{holder1}} readily responds to the way you show affection, which leaves {{holder1}} feeling noticed and appreciated. That response makes you feel comfortable showing care without having to work at it. Because getting along takes so little effort, both of you may stop actively engaging and let the connection become routine.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `d438e7c716f415fce882a0142e41f36b65f18deec5df0c51e655059c23edb269`

## Sun–Mars conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You give {{holder2}}'s urge to act a clear direction, and they respond by moving faster, which pushes you to commit just as quickly. That feedback loop can rush decisions before either of you checks whether you both actually agreed, and a difference of opinion can quickly feel like a contest. When you are both genuinely on board, their drive and your direction make acting together feel exciting and immediate.",
  "body_they": "{{holder1}} gives your urge to act a clear direction, and you respond by moving faster, which pushes them to commit just as quickly. That feedback loop can rush decisions before either of you checks whether you both actually agreed, and a difference of opinion can quickly feel like a contest. When you are both genuinely on board, your drive and their direction make acting together feel exciting and immediate.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `631ea04b17e76bfa71767ba63ca1287543d80ac485907cd5eaebc07f6b472bcd`

## Sun–Mars hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "When {{holder2}} moves quickly or pushes a choice, you can take their momentum as a challenge to your authority. You push back or try to take control, so {{holder2}} presses harder, turning ordinary decisions into arguments about who is in charge. The intensity can also feel energizing to both of you.",
  "body_they": "When you move quickly or push a choice, {{holder1}} can take your momentum as a challenge to their authority. {{holder1}} pushes back or tries to take control, so you press harder, turning ordinary decisions into arguments about who is in charge. The intensity can also feel energizing to both of you.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `90e807008d9730ce41f45d73c0befb0a121558a249a20d417150b070eee88db5`

## Sun–Mars soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "When you decide what you want to make happen, {{holder2}} is quick to put energy behind it. Their readiness to act gets you moving, while your direction gives their drive a clear focus. The easy momentum can carry both of you into action before either of you has paused to check the pace.",
  "body_they": "When {{holder1}} decides what they want to make happen, you are quick to put energy behind it. Your readiness to act gets them moving, while their direction gives your drive a clear focus. The easy momentum can carry both of you into action before either of you has paused to check the pace.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `12bd51a361482547aa809c25efc4af60a250fd373e61f2ce7b905c143ae2e4b5`

## Moon–Moon conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You respond to {{holder2}}'s feelings with the kind of comfort you also need, and {{holder2}} responds to you in the same way. You and {{holder2}} tend to react to stress and recover from it in the same way. If one of you sinks into a low mood or avoids a difficult feeling, the other can follow, leaving neither of you to steady the moment.",
  "body_they": "{{holder1}} responds to your feelings with the kind of comfort {{holder1}} also needs, and you respond to {{holder1}} in the same way. You and {{holder1}} tend to react to stress and recover from it in the same way. If one of you sinks into a low mood or avoids a difficult feeling, the other can follow, leaving neither of you to steady the moment.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `7d1bfd222864c291a5d23b5d289dd25d71eaa0ec8b6d1011f902127e21e4f114`

## Moon–Moon hard

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "What helps you feel settled often unsettles {{holder2}}, and {{holder2}}'s way of seeking comfort can make you feel just as unsafe. You both react from that discomfort, so each attempt to feel understood can trigger another defensive response and leave neither of you feeling cared for.",
  "body_they": "What helps {{holder1}} feel settled often unsettles you, and your way of seeking comfort can make {{holder1}} feel just as unsafe. You both react from that discomfort, so each attempt to feel understood can trigger another defensive response and leave neither of you feeling cared for.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `d580943572e448eb24d4b4e80b2e05cbdeb3bb4c4445b3c6b83bec5a7d87cbe0`

## Moon–Moon soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You quickly pick up on what {{holder2}} is feeling and respond to what they need, and they do the same for you. Your moods tend to settle when you are together, so comfort and emotional safety come easily. Because this feels so comfortable, both of you may avoid hard conversations or changes that would challenge the relationship.",
  "body_they": "{{holder1}} quickly picks up on what you are feeling and responds to what you need, and you do the same for them. Your moods tend to settle when you are together, so comfort and emotional safety come easily. Because this feels so comfortable, both of you may avoid hard conversations or changes that would challenge the relationship.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `98f319f86cac906daa647086fbf8d905d429ebda90071268c10a37f30931dd85`

## Moon–Mercury conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "Your mood quickly shapes how {{holder2}} thinks and talks. {{holder2}} can put your feelings into words, sometimes before you are ready to hear them out loud. When the words fit, you feel understood; when they come too soon, you can feel exposed, and {{holder2}} then responds to that reaction too.",
  "body_they": "{{holder1}}'s mood quickly shapes how you think and talk. You can put {{holder1}}'s feelings into words, sometimes before {{holder1}} is ready to hear them out loud. When your words fit, {{holder1}} feels understood; when they come too soon, {{holder1}} can feel exposed, and you then respond to that reaction too.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `3c9bc5e3b50672e55c5a483e41d2d2e5de1eefdd6203c83c84c26ea3e5c1865b`

## Moon–Mercury hard

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "When you want {{holder2}} to stay with you in a feeling, your need for comfort presses on how they think and talk. They reach for logic, questions, or explanations, and you can feel dissected instead of supported, so you keep asking for emotional company while they keep trying to make sense of it.",
  "body_they": "When {{holder1}} wants you to stay with them in a feeling, their need for comfort presses on how you think and talk. You reach for logic, questions, or explanations, and they can feel dissected instead of supported, so they keep asking for emotional company while you keep trying to make sense of it.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `c1535dbdc30dfc7bd2da9e50f1035a78a4a11b6ca2707c09e9cd48662f92cbfb`

## Moon–Mercury soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You can tell {{holder2}} what you feel before you have sorted it into careful words. {{holder2}} usually follows the emotion behind what you say and responds without turning it into a debate. This ease can leave some details unspoken because you both assume the meaning is already clear. Even so, being understood without polishing every feeling brings a quiet steadiness between you.",
  "body_they": "{{holder1}} can tell you what they feel before they have sorted it into careful words. You usually follow the emotion behind what they say and respond without turning it into a debate. This ease can leave some details unspoken because you both assume the meaning is already clear. Even so, understanding {{holder1}} without requiring every feeling to be polished brings a quiet steadiness between you.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `2a5f60ed6f30f02781a82c9fb6fb51ae6be323a3708ce8c14bed253bb8798225`

## Moon–Venus conjunction

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "{{holder2}}'s affection makes you feel cared for, and you respond with warmth that helps {{holder2}} relax and feel emotionally safe. Because being gentle with each other feels so easy, you may both smooth over discomfort and leave harder feelings unspoken.",
  "body_they": "Your affection makes {{holder1}} feel cared for, and {{holder1}} responds with warmth that helps you relax and feel emotionally safe. Because being gentle with each other feels so easy, you may both smooth over discomfort and leave harder feelings unspoken.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `730ed95115cb7331a42c6400065ca3c6bbabd3e78211c8bb3ce171a30689eff3`

## Moon–Venus hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "When {{holder2}} shows affection in the way that feels natural to them, you may respond with hurt or distance because it does not give you the reassurance you need. They may then try harder in the same way, so you still feel uncared for and they feel rejected. Both of you are trying to care, even when neither feels fully understood.",
  "body_they": "When you show affection in the way that feels natural to you, {{holder1}} may respond with hurt or distance because it does not give them the reassurance they need. You may then try harder in the same way, so {{holder1}} still feels uncared for and you feel rejected. Both of you are trying to care, even when neither feels fully understood.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `b0015e3cc1a06a075c6b4f4ccf0a5c3702503b32db78eec6bfcf6e9ca4156c0d`

## Moon–Venus soft

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "When {{holder2}} shows care or shares what feels good to them, you soften and respond with warmth, which makes it easier for {{holder2}} to keep showing affection. The ease between you can let difficult differences go unspoken because staying comfortable feels simpler than challenging each other.",
  "body_they": "When you show care or share what feels good to you, {{holder1}} softens and responds with warmth, which makes it easier for you to keep showing affection. The ease between you can let difficult differences go unspoken because staying comfortable feels simpler than challenging each other.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `0239de252236254f2968d0447b5c75f46febfe80c218cd54b825ca93550a5392`

## Moon–Mars conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "When {{holder2}} acts quickly or reacts sharply, you feel it immediately, and your emotional response pushes them to act again. The exchange gets honest fast, but passion and irritation can become a fight about what you feel before either of you slows down. You're allowed to be affected by emotions.",
  "body_they": "When you act quickly or react sharply, {{holder1}} feels it immediately, and their emotional response pushes you to act again. The exchange gets honest fast, but passion and irritation can become a fight about what {{holder1}} feels before either of you slows down. {{holder1}} is allowed to be affected by emotions.",
  "warmthSource": {
    "sourceArticleId": "libra-season-autumn-equinox",
    "originalLine": "Here's permission you might need: you're allowed to be affected by emotions.",
    "usedForm": {
      "body_you": "You're allowed to be affected by emotions.",
      "body_they": "{{holder1}} is allowed to be affected by emotions."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `60b260c510b84c271348e3ba5709d2f237879d0a861fa4c643d16e0bee2d2eda`

## Moon–Mars hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "When your feelings show, {{holder2}} can get defensive or impatient before the conversation is even finished. They may answer sharply or push harder, which hurts you and intensifies your reaction. A small misstep can become a heated argument very quickly.",
  "body_they": "When {{holder1}}'s feelings show, you can get defensive or impatient before the conversation is even finished. You may answer sharply or push harder, which hurts {{holder1}} and intensifies their reaction. A small misstep can become a heated argument very quickly.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `929a1940b2bae8e8a98fbd52d65190bf328de1c0f1d472c64ee6da895c2da465`

## Moon–Mars soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "{{holder2}} can move quickly or speak directly without making you pull back. Your emotional reactions help shape what {{holder2}} does next, while your moods do not make them stop to calm you down. Neither of you has to spend much effort managing the other's pace or response.",
  "body_they": "You can move quickly or speak directly without making {{holder1}} pull back. Their emotional reactions help shape what you do next, while their moods do not make you stop to calm them down. Neither of you has to spend much effort managing the other's pace or response.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `c2166c39c0653f3ecbff45e449f655306d4df9bb4a2159c3f62465a8a55b4051`

## Mercury–Venus conjunction

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "Your way of talking fits tightly with how {{holder2}} shows love, so they often hear your questions and explanations as affection and answer with more warmth. That response keeps you talking, but when you press a point or explain too much, {{holder2}} can feel that their preferences or worth are being picked apart, which can make you talk even more.",
  "body_they": "{{holder1}}'s way of talking fits tightly with how you show love, so you often hear their questions and explanations as affection and answer with more warmth. Your response keeps {{holder1}} talking, but when they press a point or explain too much, you can feel that your preferences or worth are being picked apart, which can make them talk even more.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `be3f2ad2786386c8e152c02ff9bc16f8cb3666c6dd4127e96745ba9cd6cf44d7`

## Mercury–Venus hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "The way you question or explain things can rub against {{holder2}}'s sense of tact. A comment you consider casual may feel to {{holder2}} like criticism of what they like or how they show care. When they react more strongly than you expected, you may explain yourself further, which can make them feel even less understood.",
  "body_they": "{{holder1}}'s way of questioning or explaining things can rub against your sense of tact. A comment they consider casual may feel like criticism of what you like or how you show care. When you react more strongly than they expected, they may explain themselves further, which can make you feel even less understood.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `3ebd69ad21ac335d8ccef4361ad5547e2c22da42a2510aed164284ef73816b4a`

## Mercury–Venus soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You tend to notice what {{holder2}} likes and choose words that make them feel considered. {{holder2}} responds with affection, so it is easy for you to ask questions, explain yourself, and keep the conversation pleasant. Neither of you has to put much effort into this exchange.",
  "body_they": "{{holder1}} tends to notice what you like and chooses words that make you feel considered. You respond with affection, so it is easy for {{holder1}} to ask questions, explain themselves, and keep the conversation pleasant. Neither of you has to put much effort into this exchange.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `ece23370f0bc1f56070ea3f8563a6bbfbf80d1203b62ff248d1cb23640946306`

## Foundation-line feedback

The two disconnected-closer rejections and the shipped-or-in-flight reuse requirement are recorded in `foundation-line-feedback.json`. The rejection records were applied to the governed voice index; the harvest engine is unchanged.

## Approval boundary

All 30 deterministic owner-revision checks pass and the exact-approval records bind these payloads to the owner-approved hashes. The candidate branch carries the authorized serving-row replacements, but nothing reaches `main` until the draft PR receives separate merge authorization.
