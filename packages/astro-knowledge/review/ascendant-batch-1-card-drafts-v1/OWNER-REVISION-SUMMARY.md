# Ascendant batch 1 owner revisions

Status: all fifteen payloads are exact-owner-approved against the hashes below. Original Sol drafts, provider responses, model inputs, and Terra verdicts remain untouched. No additional Sol or Terra calls were made. Exact-approval records are stored beside each owner-revision candidate. Serving through the draft PR still requires separate merge authorization.

Payload hashes use `sha256(JSON.stringify(payload))`. Each JSON block below is the exact payload covered by its hash.

## Sun-Ascendant conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You tend to notice {{holder2}} when they enter a situation, and your response to how they present themselves can make them feel seen enough to speak more directly about what they want. Because your confidence carries so much weight with them, they may start checking your reaction before making their own decision. Their body knows the difference between speaking for themselves and waiting for your response, and it shows in how they hold themselves.",
  "body_they": "{{holder1}} tends to notice you when you enter a situation, and their response to how you present yourself can make you feel seen enough to speak more directly about what you want. Because their confidence carries so much weight with you, you may start checking their reaction before making your own decision. Your body knows the difference between speaking for yourself and waiting for their response, and you can feel it in how you hold yourself.",
  "warmthSource": {
    "sourceArticleId": "full-moon-in-taurus",
    "originalLine": "Your body knows the difference between joy and productive joy, you can feel it in how you hold yourself when creating for approval versus creating for pleasure.",
    "usedForm": {
      "body_you": "Their body knows the difference between speaking for themselves and waiting for your response, and it shows in how they hold themselves.",
      "body_they": "Your body knows the difference between speaking for yourself and waiting for their response, and you can feel it in how you hold yourself."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `3311f61b851f147f4726e9406f175687c3cd94f73c161e595d41e022102151af`

## Sun-Ascendant hard

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "You often set the tone or direction before {{holder2}} has had room to show how they want to come across. They may explain their choices more firmly or push back, which can lead you to press your point again. Repeating that pattern can leave them feeling crowded out and you feeling challenged.",
  "body_they": "{{holder1}} often sets the tone or direction before you have had room to show how you want to come across. You may explain your choices more firmly or push back, which can lead them to press their point again. Repeating that pattern can leave you feeling crowded out and them feeling challenged.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `6d34067efce400fd9d22ea6000e338a2f94c9fd108ac5dcf5b15eee16cd885d0`

## Sun-Ascendant soft

Revision: `delete_two_sentences_both_variants`.

```json
{
  "body_you": "When you are clear about who you are and what you want, {{holder2}} feels more comfortable being themselves while meeting people or entering a new situation. As they relax and respond more naturally, it becomes easier for you to keep expressing yourself clearly.",
  "body_they": "When {{holder1}} is clear about who they are and what they want, you feel more comfortable being yourself while meeting people or entering a new situation. As you relax and respond more naturally, it becomes easier for {{holder1}} to keep expressing themselves clearly.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `8eb7ffc64ca8adef7c4362d880d2c491ebce07c3317512af66cd78d6271a1776`

## Moon-Ascendant conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You notice {{holder2}}'s mood almost immediately, and your own mood and need for comfort affect how freely they act around you. When they want to be understood, your quick response can feel comforting, and they may relax into being themselves. When they want privacy, the same attention can feel exposing, and they may hold back as soon as they sense your reaction. When the ground beneath you feels unstable, it's natural to want to hold tightly to what you know.",
  "body_they": "{{holder1}} notices your mood almost immediately, and their own mood and need for comfort affect how freely you act around them. When you want to be understood, their quick response can feel comforting, and you may relax into being yourself. When you want privacy, the same attention can feel exposing, and you may hold back as soon as you sense their reaction. When the ground beneath {{holder1}} feels unstable, it's natural for them to want to hold tightly to what they know.",
  "warmthSource": {
    "sourceArticleId": "aquarius-season-2025",
    "originalLine": "When the ground beneath you feels unstable, it's natural to want to hold tightly to what you know.",
    "usedForm": {
      "body_you": "When the ground beneath you feels unstable, it's natural to want to hold tightly to what you know.",
      "body_they": "When the ground beneath {{holder1}} feels unstable, it's natural for them to want to hold tightly to what they know."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `1d2ccbb6caac197155f9c401b1466bc876ae413c67da411165969af263ad20c9`

## Moon-Ascendant hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "Your moods and need for comfort can make {{holder2}} cautious about how they act around you. They may watch your reactions and change how they enter a situation to prevent tension before anything has even happened, which leaves them less free to be themselves. The pressure on {{holder2}} to be what you expect is real, but so is their capacity to choose themselves.",
  "body_they": "{{holder1}}'s moods and need for comfort can make you cautious about how you act around them. You may watch their reactions and change how you enter a situation to prevent tension before anything has even happened, which leaves you less free to be yourself. The pressure to be what they expect is real, but so is your capacity to choose yourself.",
  "warmthSource": {
    "sourceArticleId": "leo-new-moon-2025",
    "originalLine": "The pressure to be what others expect is real, but so is your capacity to choose yourself.",
    "usedForm": {
      "body_you": "The pressure on {{holder2}} to be what you expect is real, but so is their capacity to choose themselves.",
      "body_they": "The pressure to be what they expect is real, but so is your capacity to choose yourself."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `bfbc1453900c1e1c39e83b9cf369084f50e99cddd0015f63af1258ecf5868dd7`

## Moon-Ascendant soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "When {{holder2}} enters a situation and shows their natural personality, your emotional reactions tend to help them stay relaxed instead of making them adjust around you. Your feelings, needs, and comfort habits fit easily with how they express themselves, so they do not have to hide what they feel or carefully manage your response. Neither of you usually has to work hard to keep this part of the relationship comfortable.",
  "body_they": "When you enter a situation and show your natural personality, {{holder1}}'s emotional reactions tend to help you stay relaxed instead of making you adjust around them. Their feelings, needs, and comfort habits fit easily with how you express yourself, so you do not have to hide what you feel or carefully manage their response. Neither of you usually has to work hard to keep this part of the relationship comfortable.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `610cfe115306dbb08984cf12df6c3f594257f19d3f5d1bb7294783ab7c458eb8`

## Mercury-Ascendant conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You quickly notice how {{holder2}} introduces themselves, starts conversations, or approaches a situation, and you tend to ask questions or explain what you see. {{holder2}} may immediately adjust their tone or behavior in response, which gives you more to react to. That close back-and-forth can be lively, but repeated questions or comments can make them second-guess how they come across. You can have feelings about how {{holder2}} handles a situation without being responsible for fixing it.",
  "body_they": "{{holder1}} quickly notices how you introduce yourself, start conversations, or approach a situation, and they tend to ask questions or explain what they see. You may immediately adjust your tone or behavior in response, which gives {{holder1}} more to react to. That close back-and-forth can be lively, but repeated questions or comments can make you second-guess how you come across. {{holder1}} can have feelings about how you handle a situation without being responsible for fixing it.",
  "warmthSource": {
    "sourceArticleId": "libra-new-moon",
    "originalLine": "Give yourself permission to have feelings about other people's situations without being responsible for fixing them.",
    "usedForm": {
      "body_you": "You can have feelings about how {{holder2}} handles a situation without being responsible for fixing it.",
      "body_they": "{{holder1}} can have feelings about how you handle a situation without being responsible for fixing it."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `64fab3d1533eb0e92b6d635fdaef4462a0f47b85800742741e8f798f380256fa`

## Mercury-Ascendant hard

Revision: `replace_final_sentence_with_two_owner_authored_sentences`.

```json
{
  "body_you": "Your questions and comments can make {{holder2}} feel picked apart for how they come across. They may start explaining or defending themselves instead of acting naturally. The more {{holder2}} explains, the more you have to question or respond to. After a while, {{holder2}} starts thinking too hard about what to say before the conversation even begins.",
  "body_they": "{{holder1}}'s questions and comments can make you feel picked apart for how you come across. You may start explaining or defending yourself instead of acting naturally. The more you explain, the more {{holder1}} has to question or respond to. After a while, you start thinking too hard about what to say before the conversation even begins.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `d4f3a1cbdc4bb25759f69df3740ed3b0ff5c145651c564ede0c9b200b49db47c`

## Mercury-Ascendant soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "Your questions and explanations make it easier for {{holder2}} to speak up and join in. When they say what they mean, your replies show that you followed them without making them explain every part of themselves. Keeping the exchange clear takes little effort from either of you.",
  "body_they": "{{holder1}}'s questions and explanations make it easier for you to speak up and join in. When you say what you mean, their replies show that they followed you without making you explain every part of yourself. Keeping the exchange clear takes little effort from either of you.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `9d7118ea446306c664c49281deefb3a30766ada0853f740caa167f6da57dc55c`

## Venus-Ascendant conjunction

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "Your affection makes {{holder2}} feel liked and accepted when they show up as themselves, and they quickly notice what seems to please you. Because your response matters so much, they may start changing their manner or appearance to keep your approval, until presenting themselves freely feels harder.",
  "body_they": "{{holder1}}'s affection makes you feel liked and accepted when you show up as yourself, and you quickly notice what seems to please them. Because their response matters so much, you may start changing your manner or appearance to keep their approval, until presenting yourself freely feels harder.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `a4acdf5be0d288ecf6b114e4f8102758f320f1214ea09e4bdd9ea84d46f46475`

## Venus-Ascendant hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You may show approval when {{holder2}} presents themselves in a way you like and become cool or critical when they do not. {{holder2}} can start second-guessing and editing how they act around you, leaving them less natural and more guarded. That guardedness can make you press your preferences more clearly, so the tension repeats.",
  "body_they": "{{holder1}} may show approval when you present yourself in a way they like and become cool or critical when you do not. You can start second-guessing and editing how you act around {{holder1}}, leaving you less natural and more guarded. Your guardedness can make {{holder1}} press their preferences more clearly, so the tension repeats.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `f54f9519772a9ecfee46a636c883234028fd2392ac10f25ab3f2f8d026f49ffb`

## Venus-Ascendant soft

Revision: `delete_clause_both_variants`.

```json
{
  "body_you": "You respond warmly to the way {{holder2}} naturally comes across. That makes {{holder2}} more relaxed around you. The ease can go mostly unnoticed because neither of you has to work hard to create it.",
  "body_they": "{{holder1}} responds warmly to the way you naturally come across. That makes you more relaxed around {{holder1}}. The ease can go mostly unnoticed because neither of you has to work hard to create it.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `fd00adb62ad8dcb67c529b70826682ba4f2f65db97263a4f422c94d499c8122d`

## Saturn-Ascendant conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You may point out {{holder2}}'s tone, reactions, or way of entering a situation when these do not meet your standards. They may start monitoring themselves and holding back parts of their personality to avoid your criticism. Your standards can help {{holder2}} take themselves seriously when they are not so high that {{holder2}} feels like a failure.",
  "body_they": "{{holder1}} may point out your tone, reactions, or way of entering a situation when these do not meet their standards. You may start monitoring yourself and holding back parts of your personality to avoid their criticism. Their standards can help you take yourself seriously when they are not so high that you feel like a failure.",
  "warmthSource": {
    "sourceArticleId": "new-moon-solar-eclipse-in-virgo",
    "originalLine": "Question those impossibly high standards that leave you feeling like a failure.",
    "usedForm": {
      "body_you": "Your standards can help {{holder2}} take themselves seriously when they are not so high that {{holder2}} feels like a failure.",
      "body_they": "Their standards can help you take yourself seriously when they are not so high that you feel like a failure."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `5c3d02018685697ce1d6fbf6474197e9926e341a62c1dde8120cf35e93339036`

## Saturn-Ascendant hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You may point out problems in how {{holder2}} comes across or tell them to be more careful. They can start rehearsing what to say and checking their behavior before ordinary interactions. When they expect you to notice something wrong, it becomes harder for them to act naturally.",
  "body_they": "{{holder1}} may point out problems in how you come across or tell you to be more careful. You can start rehearsing what to say and checking your behavior before ordinary interactions. When you expect {{holder1}} to notice something wrong, it becomes harder to act naturally.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `ec80e308338f8bbf6b57d53febd63d0839968d98211e4d64f85518f76fbb9986`

## Saturn-Ascendant soft

Revision: `delete_middle_sentence_both_variants`.

```json
{
  "body_you": "You respond consistently to how {{holder2}} speaks, acts, and enters new situations, so they know you take them seriously. You appreciate {{holder2}}'s authenticity instead of making them feel like they're too much or not enough.",
  "body_they": "{{holder1}} responds consistently to how you speak, act, and enter new situations, so you know they take you seriously. {{holder1}} appreciates your authenticity instead of making you feel like you're too much or not enough.",
  "warmthSource": {
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "The right friends will appreciate your authenticity; the wrong ones will make you feel like you're too much or not enough.",
    "usedForm": {
      "body_you": "You appreciate {{holder2}}'s authenticity instead of making them feel like they're too much or not enough.",
      "body_they": "{{holder1}} appreciates your authenticity instead of making you feel like you're too much or not enough."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `f7be4e2ece5bc2d5c89246a98e002e50a41bab19b79d7e8fcf6be5bd9399206f`

## Cross-card foundation-line feedback

The `manufacturing confidence` foundation line is owner-rejected for soft-aspect contexts. Its shipped Jupiter-Ascendant hard use remains unchanged. A machine-readable non-blocking editorial requirement now records that future harvest runs must flag reuse of a foundation line across shipped cards. The governed voice-memory change remains unapplied; its required dry-run preview is stored beside this summary.

## Stop state

All fifteen payloads are `needs_review`. No exact-approval records, serving rows, promotion files, or shipping changes were created.
