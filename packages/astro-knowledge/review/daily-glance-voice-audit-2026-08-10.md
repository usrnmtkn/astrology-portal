# Daily-glance serving voice audit

Date: 2026-08-10
Source revision: `0af360bace54f77fa8a04d3320c740467eae59b9`
Judge: `gpt-5.6-terra`, reasoning `low`, rubric `daily-glance-voice-v2:boundary-discipline+median3`

> **FLAG-ONLY MODE:** Terra failed calibration (gold mean 2 < 2.6). Scores of 1 and failed-dimension counts are advisory triage only, never quality verdicts. GR-003 and DG-P1 prohibit automatic approval or serving changes.

## Summary

- Serving pairs audited: 68/68
- Score-1 flags: 13
- Pairs with one or more failed dimensions: 66
- Judge responses: 204
- Judge usage: 1006188 input tokens (909011 cached), 61983 output tokens (27865 reasoning)
- Estimated Step 1 calibration cost: $0.948464
- Estimated Step 2 cost: $1.119953
- Bottom-five writer responses: 15 (Sol xhigh)
- Bottom-five judge responses: 45 (Terra low, flag-only)
- Estimated Step 4 writer cost: $1.807185
- Estimated Step 4 judge cost: $0.230840
- Estimated Step 4 total: $2.038025
- Estimated all-call total: $4.106442
- Ordering: lowest triage score first, then most failed dimensions. In flag-only mode this is a reading queue, not a quality ranking.

## Ranked flags

### 1. conjunction/neptune

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 1/7
- Failed dimensions: voice, stakes, structure, formula, screenshot_line, specificity
- Judge why: This is the only line that names a recognizable Neptune-style experience in plain language. The rest relies on familiar permission and wellness language—turn the volume down, take a shower, make something, experience your feelings—without showing what the emotional spillover costs or why this particular moment requires a decision.
- Best line: Someone else's mood may follow you home before you realize you picked it up.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Give yourself permission to turn the volume down on the world right now.
>
> **Current body:** A song can undo you. An old memory can color the whole afternoon. Someone else's mood may follow you home before you realize you picked it up. Give yourself less noise, fewer opinions, and more time before making a hard decision. Write, make something, take a long shower, or let yourself stare out the window for a while. Not every feeling needs to be solved, but it does need to be experienced.

#### UNAPPROVED engine candidate

> **Candidate status:** UNAPPROVED. It is not a content row, cannot serve, and changes nothing without explicit owner wording approval.
>
> **Candidate headline:** One worried voice can change your plans before anyone explains the problem.
>
> **Candidate body:** You hear worry in one voice and may imagine the whole group feels the same. You start rearranging your work to cover tasks no one has asked you to take. Only one person has spoken. Ask what help is actually needed before you spend the next few hours fixing a problem no one has described.

- Deterministic lint: fail
- Flag-only judge triage: 3 (median of 2, 3, 3); 7/7 dimensions passed
- Candidate failed dimensions: none
- Candidate judge why: This is the sentence that cuts through the Neptune-style projection without sounding mystical or corrective. The body names the actual cost—rearranging work and losing hours to an undefined problem—then gives a direct way to verify what is real before taking it on.
- Selection basis: Deterministic lint first, then flag-only advisory signals; no automatic approval.
- Full packet: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/conjunction-neptune.packet.json`
- All three raw candidates: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/conjunction-neptune.candidates.json`

### 2. soft/chiron

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 1/7
- Failed dimensions: voice, stakes, structure, formula, screenshot_line, specificity
- Judge why: This is the closest the draft gets to a real Chiron-soft tension: help is available, but accepting it exposes a sore place. The rest turns that tension into generic reassurance about weakness, independence, defenses, and letting care in. It could belong to nearly any healing or support transit, and the scene arrives before the actual truth.
- Best line: Your reflex is to turn it down, because being seen stuck may feel worse than staying stuck.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You're not weak for needing care.
>
> **Current body:** You are struggling through a difficult task or a frustrating message when someone notices you're stressed and quietly offers to handle something that would overwhelm you. Your reflex is to turn it down, because being seen stuck may feel worse than staying stuck. You don't have to keep pretending it's all okay or minimize your own experience. Accepting help mid-struggle does not make you weak or take away your independence, it just gives you room to breathe. Let them take a look and let the care reach the sore spot without putting your defenses up.

#### UNAPPROVED engine candidate

> **Candidate status:** UNAPPROVED. It is not a content row, cannot serve, and changes nothing without explicit owner wording approval.
>
> **Candidate headline:** Accepting care does not require looking composed.
>
> **Candidate body:** You do not hide the unfinished part as quickly when someone notices you struggling. A coworker offers to review the page you keep reworking, and your usual quick refusal does not come right away. That refusal has kept you reworking the same problem alone as the deadline gets closer. You’re not weak for needing care. Send the page as it is and name the one section where another set of eyes would help.

- Deterministic lint: fail
- Flag-only judge triage: 2 (median of 2, 2, 2); 5/7 dimensions passed
- Candidate failed dimensions: voice, formula
- Candidate judge why: This is the clearest line because it names the actual cost of refusing help: more isolated work while time runs out. The rest leans on familiar vulnerability language—especially “You’re not weak for needing care”—and the final instruction lands like a standard coaching close rather than completing the observation.
- Selection basis: Deterministic lint first, then flag-only advisory signals; no automatic approval.
- Full packet: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/soft-chiron.packet.json`
- All three raw candidates: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/soft-chiron.candidates.json`

### 3. square/sun

- Triage score: 1 (median of 1, 1, 2); passed dimensions: 1/7
- Failed dimensions: voice, stakes, structure, formula, screenshot_line, specificity
- Judge why: This is the closest the draft gets to a plain truth with a cost, but it still stays generalized and diagnostic. The opening question, the language about managing perception, and the split between an inner self and presented self create polished coaching copy rather than the owner's concrete, lived register. Nothing shows what the conflict makes someone do, lose, cancel, say, or resent today, and the premise could fit many transits besides a Sun square.
- Best line: But forcing composure when you are burnt out, defensive, or uninspired is an exhausting way to live.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You're arguing with yourself, and both sides have a point.
>
> **Current body:** What would happen if you stopped managing everyone's perception of you? A quiet conflict is running under your day between who you know yourself to be and the version you present so people will take you seriously, approve of you, or leave you alone. That version may have helped you avoid criticism, rejection, or conflict. But forcing composure when you are burnt out, defensive, or uninspired is an exhausting way to live.

#### UNAPPROVED engine candidate

> **Candidate status:** UNAPPROVED. It is not a content row, cannot serve, and changes nothing without explicit owner wording approval.
>
> **Candidate headline:** Looking dependable is costing you the break you still need.
>
> **Candidate body:** You keep sounding available in messages after realizing you need an hour to yourself, then accept one more request and lose the only open space. You still need the hour. You keep replying as if the plan works, so each message makes the adjustment more awkward. Send one follow-up while the request is still fresh and give the time you can actually offer.

- Deterministic lint: fail
- Flag-only judge triage: 3 (median of 3, 3, 3); 7/7 dimensions passed
- Candidate failed dimensions: none
- Candidate judge why: This names the actual trap without dressing it up: the problem is not merely having too much to do, but continuing to act available after the limit is already clear. It carries the square's friction between maintaining an outward role and honoring a personal need.
- Selection basis: Deterministic lint first, then flag-only advisory signals; no automatic approval.
- Full packet: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/square-sun.packet.json`
- All three raw candidates: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/square-sun.candidates.json`

### 4. square/uranus

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 1/7
- Failed dimensions: voice, stakes, structure, formula, screenshot_line, specificity
- Judge why: This is the clearest practical thought in the draft, but it arrives after a padded scene and an overassembled diagnosis about “preach balance while practicing burnout.” The rest reads like generalized optimization coaching: suffocating schedules, breathing room, changing direction, and permission to evolve could belong to almost any transit. It never names a concrete cost or makes the disruption feel particular to this square/Uranus key.
- Best line: Adjust the single commitment that is actually causing the friction and leave the rest intact.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Your routine could use a small shake-up.
>
> **Current body:** You sit down to handle a single tedious administrative form or look at one annoying obligation on your calendar, and expect restlessness. It is easy to let one frustrating task make your whole day feel suffocating, convincing you that you preach balance while practicing burnout and need to scrap the entire schedule. You don't have to optimize every second of your existence, nor do you need to tear everything down just to get some breathing room. Adjust the single commitment that is actually causing the friction and leave the rest intact. You're allowed to change your direction as you learn more about who you are.

#### UNAPPROVED engine candidate

> **Candidate status:** UNAPPROVED. It is not a content row, cannot serve, and changes nothing without explicit owner wording approval.
>
> **Candidate headline:** You suddenly want out of your own routine.
>
> **Candidate body:** Notice when you begin looking for any reason to abandon work you had no problem starting. Halfway through answering routine messages, you stop. Within ten minutes, you may want to cancel every remaining commitment on your schedule. If you do, you still have the same work and less time to finish it. You can move the least urgent task to another day and keep every other commitment.

- Deterministic lint: fail
- Flag-only judge triage: 2 (median of 2, 2, 2); 4/7 dimensions passed
- Candidate failed dimensions: voice, formula, screenshot_line
- Candidate judge why: This is the clearest consequence in the piece: impulsively blowing up the schedule does not remove the obligation. The rest sounds more like standard productivity coaching, especially the "Within ten minutes" setup and the final instruction to move a task, than the owner’s plain, lived voice.
- Selection basis: Deterministic lint first, then flag-only advisory signals; no automatic approval.
- Full packet: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/square-uranus.packet.json`
- All three raw candidates: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/square-uranus.candidates.json`

### 5. conjunction/pluto

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 2/7
- Failed dimensions: voice, stakes, hedging, screenshot_line, specificity
- Judge why: This is the clearest sentence because it names an actual escalation pattern and gives the reader a plain next move. The rest sounds like generalized Pluto coaching: “weaponizing control,” “recognition or certainty,” and “force an outcome” diagnose motives too neatly without showing what the person is doing or what it costs them.
- Best line: Name the feeling before it turns into a power struggle.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Stop weaponizing control to keep from admitting you were hurt.
>
> **Current body:** A small reaction may reveal a much larger need for control, recognition, or certainty. You may want to push, withhold, test, or win because admitting you are upset feels more exposing. Name the feeling before it turns into a power struggle. Intensity is useful when it tells the truth, not when it tries to force an outcome.

#### UNAPPROVED engine candidate

> **Candidate status:** UNAPPROVED. It is not a content row, cannot serve, and changes nothing without explicit owner wording approval.
>
> **Candidate headline:** One strong feeling makes every detail of the decision nonnegotiable.
>
> **Candidate body:** You may feel old resentment so strongly that settling one simple plan starts to seem urgent. You repeat your case, dismiss their alternatives, and push for an immediate answer. They stop discussing the plan and start defending themselves. Pause the decision for an hour before they spend the rest of the conversation pushing back.

- Deterministic lint: fail
- Flag-only judge triage: 2 (median of 2, 2, 3); 7/7 dimensions passed
- Candidate failed dimensions: none
- Candidate judge why: This is the clearest consequence in the card: the actual decision gets lost once resentment turns the exchange into self-protection. The rest is competent and concrete, but "one strong feeling" and the sequence of insistence, resistance, and a pause feel slightly assembled rather than like a sentence only this transit would produce.
- Selection basis: Deterministic lint first, then flag-only advisory signals; no automatic approval.
- Full packet: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/conjunction-pluto.packet.json`
- All three raw candidates: `packages/astro-knowledge/review/daily-glance-voice-audit-2026-08-10-candidates/conjunction-pluto.candidates.json`

### 6. opposition/north-node

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 2/7
- Failed dimensions: voice, stakes, formula, screenshot_line, specificity
- Judge why: This is the clearest truth in the draft, but the rest stays abstract: "growth," "bad habit," "old way," and "becoming" do not show what happens, what it costs, or why this is an opposition/north-node day rather than any relationship-focused transit. The headline also leads with aphoristic self-improvement language, and the closing reads like generalized coaching.
- Best line: But predictable dynamics are not the same as healthy ones.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Growth requires losing your favorite excuses.
>
> **Current body:** The people who actually help you grow will not always feel comfortable to be around. When someone calls you out on a bad habit, your instinct might be to pull back. But predictable dynamics are not the same as healthy ones. Pay attention to who supports the person you are becoming, versus who only likes you when you remain useful in the old way.

### 7. soft/north-node

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 2/7
- Failed dimensions: voice, stakes, formula, screenshot_line, specificity
- Judge why: This is the only sentence that names an observable change, but the rest could belong to nearly any self-development transit: “building muscle memory,” “trusting your own response,” and “what once took all your courage” are polished therapy shorthand without a concrete cost, pressure point, or soft/north-node-specific situation.
- Best line: You ask for help before you are overwhelmed.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You're building muscle memory.
>
> **Current body:** It's the slow, quiet shift from bracing yourself to trusting your own response. You ask for help before you are overwhelmed. You choose the unfamiliar path without requiring a hundred-step guarantee that it will all work out. Each time you practice the boundary, it becomes a little less frightening and a little more familiar. Eventually, what once took all your courage becomes part of how you live.

### 8. soft/sun

- Triage score: 1 (median of 1, 1, 2); passed dimensions: 2/7
- Failed dimensions: voice, stakes, formula, screenshot_line, specificity
- Judge why: This is the clearest line because it names actions that fit soft/sun visibility and direct self-expression. But the rest relies on stacked permission language and broad affirmations like "You know who you are," without a recognizable situation, consequence, or tension that makes the advice feel earned.
- Best line: This is a good day to ask for what you want directly, put your name on your accomplishments, and skip the defensive backstory.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Let it be simple.
>
> **Current body:** You don't have to pre-screen your thoughts or edit your preferences just to avoid making waves. You know who you are and what you bring to the table. You don't need the buffer. This is a good day to ask for what you want directly, put your name on your accomplishments, and skip the defensive backstory. Let things be straightforward for once.

### 9. opposition/lilith

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 3/7
- Failed dimensions: voice, formula, screenshot_line, specificity
- Judge why: This is the clearest line because it names a real cost: preserving an arrangement can mean giving up closeness. But the body stays in generalized, therapy-register declarations about silence, eggshells, politeness, and inevitability. It gives no observable situation, no specific Lilith pressure, and no opposition dynamic that could not be swapped onto nearly any relationship transit.
- Best line: Staying silent only hides how much you've settled for routine over connection.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Staying silent only hides how much you've already given up.
>
> **Current body:** You can't keep tiptoeing across a gap that is actively growing. Staying quiet only hides how much you've settled for routine over connection. Walking on eggshells doesn't prevent a mess; it just guarantees one. Staying polite isn't saving the relationship. It is just delaying the inevitable.

### 10. opposition/pluto

- Triage score: 1 (median of 1, 1, 2); passed dimensions: 3/7
- Failed dimensions: voice, structure, formula, screenshot_line
- Judge why: This is the clearest line because it names the actual opposition/Pluto conflict: a need gets pulled into a struggle over control. The rest relies on familiar therapy language and rhetorical framing—"emotional cards," "What do I owe myself?" and "Your vulnerability is not a weakness"—rather than sounding like an observed truth someone would recognize in their own day.
- Best line: State the facts of what you need without letting them rewrite the exchange into a test of authority.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Some feelings just want to be felt, not fixed.
>
> **Current body:** You bring a private need to the person who controls the money, the access, or the family decision, explaining what you need based on care and history while they point to ownership, rules, and consequences. Power dynamics in the relationship become obvious: who makes the decisions, who always gives in, and who holds the emotional cards. Are you the one who always compromises, always bends? The question is no longer "What do I owe this person?" but "What do I owe myself?" State the facts of what you need without letting them rewrite the exchange into a test of authority. Your vulnerability is not a weakness.

### 11. square/pluto

- Triage score: 1 (median of 1, 1, 2); passed dimensions: 3/7
- Failed dimensions: voice, formula, screenshot_line, specificity
- Judge why: This is the clearest line, but the body turns it into clinical shorthand about “hyper-vigilance” and a broad self-help instruction to intervene less. The candidate names a recognizable cost, exhaustion, but it could belong to almost any anxiety-themed transit and does not make the square/Pluto pressure feel particular.
- Best line: Control is not the same as safety.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Control is not the same as safety.
>
> **Current body:** You may respond to uncertainty by reorganizing the schedule, checking the account again, watching everyone's mood so nothing catches you off guard. Micro-managing every detail doesn't quiet the anxiety; it only expands the list of things you have to monitor. Hyper-vigilance is not safety; it is just exhaustion. Decide what actually needs your intervention today, and let the situation breathe.

### 12. opposition/neptune

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 4/7
- Failed dimensions: voice, stakes, specificity
- Judge why: This is the clearest and most usable sentence, but the candidate leans on punchy mind-reading and aphoristic cynicism: “just enough” assigns intent, while “the only data that matters” overstates the conclusion. It never shows the actual cost of staying, and the pattern-versus-promise framing could fit almost any relationship transit rather than this opposition/Neptune key.
- Best line: Stop evaluating their potential and start measuring their consistency.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Trust the pattern, not the promise.
>
> **Current body:** Someone gives you just enough soft reassurance to keep you from walking away or setting a boundary. You want to accept the explanation because accepting the pattern means making an uncomfortable decision. Stop evaluating their potential and start measuring their consistency. What people do after the discussion ends is the only data that matters.

### 13. square/lilith

- Triage score: 1 (median of 1, 1, 1); passed dimensions: 4/7
- Failed dimensions: voice, stakes, specificity
- Judge why: This is the clearest line, but the body immediately overclaims that hunger is usually an emotional cover and tells the reader what they are avoiding. That is punchy mind-reading rather than the owner's concrete, lived pressure. The food example is also generic enough to fit many transits, while the candidate never establishes what the Lilith square is actually bringing into conflict or what it costs beyond the momentary snack.
- Best line: Comfort is a quick substitute for admitting what you actually want.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Comfort is a quick substitute for admitting what you actually want.
>
> **Current body:** Pay attention to every trip to the kitchen today, because hunger is rarely the whole story. Before reaching for another snack, put a name on whatever desire you are trying to quiet down, even if it feels inconvenient, disruptive, or unlikely. If food is still what you want after that, enjoy it. Just stop using it to answer questions you are avoiding.

### 14. soft/jupiter

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 1/7
- Failed dimensions: voice, stakes, structure, formula, screenshot_line, specificity
- Judge why: This is the one line with an actual lived benefit: time appears where there was not enough of it. The rest lists interchangeable good news—an email, a fee, an introduction—that could belong to almost any favorable transit, then ends by telling the reader what to do instead of naming why this opening matters.
- Best line: A meeting moves and gives you the hour you needed.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** An opening just appeared.
>
> **Current body:** You send the email expecting another delay, and the answer comes back yes. A meeting moves and gives you the hour you needed. The fee is lower than expected, or the right person offers an introduction without making you chase them for it. Use the opening while it is here. Send the application, make the appointment, or move the project forward.

### 15. conjunction/moon

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 2/7
- Failed dimensions: voice, stakes, formula, screenshot_line, specificity
- Judge why: This is the most concrete line because it names the actual behavior that turns a schedule change into friction: building a case instead of giving an answer. The rest stays generic, especially “manage everyone else's feelings” and “let the rest go,” which sound like standard boundary coaching rather than a sharp observation about the emotional immediacy of a Moon conjunction.
- Best line: Instead of listing every reason their idea is inconvenient, just say what you can and cannot do.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** A sudden change of plans can quickly wear down your patience.
>
> **Current body:** When someone asks to reschedule, you might catch yourself getting irritated or defensive before you even process the ask. Instead of listing every reason their idea is inconvenient, just say what you can and cannot do. You do not have to manage everyone else's feelings today. Give them a straight answer and let the rest go.

### 16. conjunction/north-node

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 2/7
- Failed dimensions: voice, stakes, formula, screenshot_line, specificity
- Judge why: The headline names a recognizable pattern, but the body turns it into a generic productivity prompt: application, class, project, or responsibility could belong to almost any growth transit. There is no cost to continued hesitation, no lived pressure behind the reopened tab, and the “does not mean you need to overhaul your life” reassurance followed by a writing instruction has the rejected template feel.
- Best line: You keep reopening the next step you said you were not ready for.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You keep reopening the next step you said you were not ready for.
>
> **Current body:** The application, class, project, or responsibility you keep reopening deserves a closer look. That does not mean you need to overhaul your life. It does mean the choice deserves more than another closed tab. Write one sentence naming why you want it.

### 17. conjunction/venus

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 2/7
- Failed dimensions: voice, stakes, formula, screenshot_line, specificity
- Judge why: This is the clearest line because it gives love observable form, but the card stays at greeting-card level. “You don't need,” “Pay attention,” and “Let the small things count” create the same permission-and-coaching arc as the rejected examples. There is no cost, tension, or consequence, and nothing in the body makes this feel specific to a Venus conjunction rather than a generic reminder to appreciate people.
- Best line: Love usually looks pretty ordinary: a saved seat, a remembered coffee order, a text that hits right when you need a lift.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Love can look low-key.
>
> **Current body:** Love usually looks pretty ordinary: a saved seat, a remembered coffee order, a text that hits right when you need a lift. You don't need a grand, dramatic gesture to know who's in your corner. Pay attention to who shows up without making it about them, and let them know you saw it. Let the small things count.

### 18. soft/saturn

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 2/7
- Failed dimensions: voice, structure, formula, screenshot_line, specificity
- Judge why: This is the only line that names the actual cost instead of just describing an administrative task. The rest could fit almost any productivity or Mercury-style transit: email, bill, appointment, form, and "one loose end" do not establish soft Saturn's particular weight around obligation, delay, or steady responsibility. The headline is a generic aphorism, and the body makes the reader wait until the third sentence for its real point.
- Best line: None of it is exciting, but carrying it in your head every day was taking more energy than finishing it.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Quiet progress is still progress.
>
> **Current body:** You open the email you have been avoiding and realize the reply takes five minutes. The bill gets paid, the appointment gets booked, or the form finally leaves the pile on your desk. None of it is exciting, but carrying it in your head every day was taking more energy than finishing it. Take advantage of the slower rhythm to clear just one loose end.

### 19. soft/south-node

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 2/7
- Failed dimensions: voice, stakes, hedging, formula, specificity
- Judge why: This is the clearest and most sendable truth in the draft: it names the emotional cost of becoming the person who automatically handles everything. The rest of the copy circles that insight with broad competence-and-safety language, three hedges, and a balanced self-help close that could fit Virgo, Capricorn, or several other keys as easily as soft/south-node.
- Best line: But usefulness is not the same as belonging.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Use what you learned, but put down what you carried.
>
> **Current body:** Experience taught you how to spot the problem before anyone else does. When the plan falls apart, the deadline moves, or someone else's panic fills the room, you may already be answering messages, assigning the next steps, and calming everyone down before you have even decided to help. Use what you know. Organize the part that is actually yours. Then stop before competence becomes another way to prove that you deserve your place. That instinct may have kept you useful. It may even have kept you safe. But usefulness is not the same as belonging. Keep the skill. Put down the job of holding everyone together.

### 20. conjunction/chiron

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, stakes, screenshot_line, specificity
- Judge why: The headline states the Chiron tension plainly and early. The rest turns it into a polished internal explanation: need and fear arriving together is understandable, but it is generic and could fit almost any transit about vulnerability. It also ends with a coaching instruction before showing what gets lost when someone keeps saying they are fine.
- Best line: The care is being offered, but the old hurt makes it hard to accept.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** The care is being offered, but the old hurt makes it hard to accept.
>
> **Current body:** You type "I'm fine" after they offer to call, even though part of you wants to say yes. The need for care and the fear of being disappointed arrive at the same time, so refusing can feel safer than asking. Replace "I'm fine" with a quick check-in.

### 21. conjunction/uranus

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, structure, formula, screenshot_line
- Judge why: This is the clearest expression of the Uranus mechanism: one disruption makes the existing arrangement feel newly unstable. The body weakens it by spending too long on the service-price scene, then dropping into the rejected-style permission frame, "You're allowed to," instead of naming the actual cost of reacting too fast to a change.
- Best line: You keep reconsidering the whole routine after one unwelcome change.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You keep reconsidering the whole routine after one unwelcome change.
>
> **Current body:** You open a familiar service, find a higher price, and lose time comparing replacements. You may feel too restless to accept the new terms. You start questioning every routine built around it. You're allowed to change your plan once you know the new price. Write down the new total and one workable alternative before changing the service.

### 22. house/9

- Triage score: 2 (median of 1, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, stakes, formula, screenshot_line
- Judge why: This is the clearest statement of the actual ninth-house tension: an inherited belief system no longer accounts for what someone knows now. The rest slips into a familiar self-help sequence of "You do not have to," "You are allowed to," and a broad wisdom aphorism, without showing what the outdated worldview costs in a real decision, relationship, or obligation.
- Best line: You feel the awkward friction when old rules no longer explain your current reality.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You do not have to have it all figured out to keep learning.
>
> **Current body:** You feel the awkward friction when old rules no longer explain your current reality. Maybe a philosophy that kept you safe in your twenties feels restrictive now, or new information is asking you to turn a corner. You do not have to double down on an outdated worldview just to prove you were right in the first place. You are allowed to revise the course, change your mind, and learn in public. Wisdom is not holding a rigid stance. It is letting your life expand past what you used to think you knew.

### 23. opposition/chiron

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, stakes, formula, screenshot_line
- Judge why: This is the only line that carries the opposition/Chiron mechanism: a current exchange catches on an older hurt, and the person shuts down before naming what they need. The rest turns quickly into generic communication coaching, especially "You don't have to do it all alone" and the instruction-led ending.
- Best line: A loved one asks why you changed the evening plan, and you stop mid-sentence when their tone feels too familiar.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You can leave a need unsaid and still expect them to understand.
>
> **Current body:** A loved one asks why you changed the evening plan, and you stop mid-sentence when their tone feels too familiar. You may want to stay quiet and wait for them to notice what you did not finish. That test backfires. You don't have to do it all alone. Finish your sentence: tell them what you needed when you changed the plan.

### 24. soft/mercury

- Triage score: 2 (median of 1, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, stakes, formula, screenshot_line
- Judge why: This is the clearest and most usable sentence, but the rest leans on assembled phrasing: “living in your chest,” “without friction,” and especially “let the chips fall where they teach you” sound written to sound meaningful rather than like a plain observation. It also never names what staying vague costs.
- Best line: Being direct is not cruel.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Say the thing that's been living in your chest.
>
> **Current body:** You finally reach the exact reason a conversation went off the rails, and the words to explain it arrive without friction. Whether through a private meeting, a voice note, or a direct reply, you can name what hurt, what changed, and what answer is needed without starting another argument. Being direct is not cruel. Write the truth you need to say in one sentence, speak it once, calmly, and let the chips fall where they teach you. Say what you mean, say it like it matters, and let the opening do its job.

### 25. soft/neptune

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, stakes, structure, screenshot_line
- Judge why: This is the clearest sentence because it gives the intuition a practical consequence: do not demand coherence before there is anything to work with. The rest stays in atmospheric creative-process language—sentence, image, hunch, rough version—without naming what is lost when the impulse gets dismissed or overexplained. It sounds polished, but not yet like a plain truth someone has been waiting to hear.
- Best line: The structure can come later, once there is enough material to shape.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Trust the impulse before you understand the purpose.
>
> **Current body:** A sentence arrives while you are washing the dishes. An image keeps returning when your attention drifts, or a vague hunch pulls you toward something you cannot explain yet. Save it before you ask what it is for. Write the line, collect the image, or make the rough version without forcing it to mean something. The structure can come later, once there is enough material to shape.

### 26. soft/pluto

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, stakes, formula, specificity
- Judge why: The headline names a real emotional habit plainly, but the body turns into broad therapy language: grief, anxiety, old family history, someone you trust, and explain every detail could belong to almost any emotional transit. There is no specific cost of continuing to minimize it, and the "does not have to" / "You can" sequence gives it a familiar permission-and-instruction skeleton rather than the owner’s sharper lived truth.
- Best line: It takes less effort to acknowledge a feeling than to keep minimizing it.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** It takes less effort to acknowledge a feeling than to keep minimizing it.
>
> **Current body:** A conversation about grief, anxiety, or old family history does not have to become a fight. You can say what affected you without explaining every detail or demanding an answer from anyone else. Tell someone you trust what happened and how it made you feel.

### 27. soft/uranus

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, formula, screenshot_line, specificity
- Judge why: This is the one sentence with an actual consequence: a small adjustment returns usable time. The rest sounds assembled around flexibility—"default path," "unplanned detour," and "small, steady reps" could belong to almost any transit—and the final "You're allowed" line is exactly the fixed-slot coaching register the rejected examples establish as off-voice.
- Best line: Rearranging a minor detail costs nothing to try and gives you an hour of your day back.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** A small change gives you your day back.
>
> **Current body:** An unexpected gap opens in your afternoon, offering a quick chance to shift an errand or rearrange your tasks without causing any rupture. You might hesitate because sticking to the default path feels safer than taking an unplanned detour, but small, steady reps of flexibility go a long way. Take the opening anyway: rearranging a minor detail costs nothing to try and gives you an hour of your day back. You're allowed to define success on your own terms.

### 28. soft/venus

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, stakes, formula, specificity
- Judge why: This is the one sentence that names a real, recognizable Venus problem without dressing it up: refusing ease because effort feels more legitimate. The rest stays broad enough for almost any transit, and “Stop picking a fight with the flow” turns that insight into generic coaching rather than completing the consequence.
- Best line: comfort has to be bought with effort
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You don't get extra credit for doing life the hard way.
>
> **Current body:** A line clears out, a call gets canceled, or someone handles the exact errand you were dreading. Your instinct might be to wave off the ease or immediately find something else to stress over, as if comfort has to be bought with effort. Stop picking a fight with the flow. Let the break count in whatever form it takes.

### 29. square/mercury

- Triage score: 2 (median of 1, 2, 2); passed dimensions: 3/7
- Failed dimensions: voice, formula, screenshot_line, specificity
- Judge why: This is the clearest statement of the actual Mercury-square tension: reacting to prove a point versus slowing down long enough to understand what is true. It still sounds slightly assembled and coaching-heavy, but it has more consequence than the surrounding warnings.
- Best line: You don't need to win the moment at the expense of getting it right.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Not everything you think needs to be said.
>
> **Current body:** Your thoughts are outrunning your judgment today. It is tempting to jump to conclusions, fill in missing details with worst-case guesses, or answer before you actually understand what is being said. Pause before you reply. You don't need to win the moment at the expense of getting it right. Don't make permanent choices with temporary information.

### 30. conjunction/lilith

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: stakes, formula, specificity
- Judge why: This is the clearest, most owner-adjacent line because it names the actual conflict without dressing it up: a desire persists despite all the reasons someone gives for dismissing it. The body does not build enough consequence around that truth, though, and could fit almost any transit about dissatisfaction or desire.
- Best line: The want you keep explaining away is still there.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** The want you keep explaining away is still there.
>
> **Current body:** You finish the task, close the tab, then reopen the option you saved. Your routine may be comfortable, but it has not erased the part of you that wants something else. Wanting more does not make your current life a failure. Finish the sentence "What I want is…" and stop before the justification.

### 31. conjunction/mercury

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: structure, screenshot_line, specificity
- Judge why: This is the strongest line because it shows the real cost of staying quiet: missed work and a recurring unequal burden. It also captures the Mercury mechanism of one practical concern opening into the whole unsaid conversation. The rest of the copy is more generic family-care scheduling, and the final instruction separates the logistics from the pattern instead of making the pattern the central truth from the start.
- Best line: Then the rest spills out: the work you would miss, who else could help, and why this keeps becoming your responsibility.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Once you admit what you are worried about, the whole conversation can come out at once.
>
> **Current body:** You are trying to decide who can take a family member to an appointment when you finally say that you do not think they should go alone. Then the rest spills out: the work you would miss, who else could help, and why this keeps becoming your responsibility. Decide who is going with them first. Then come back to why the responsibility keeps falling on you.

### 32. conjunction/sun

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: stakes, formula, specificity
- Judge why: This is the clearest, least padded sentence in the draft: it names the failed strategy directly. But the body stays at the level of generic desire, hesitation, and self-suppression, so it could fit several transits. “It just looks like distance” gestures toward a consequence without showing what gets lost, strained, delayed, or misunderstood.
- Best line: Hiding it does not convince anyone, least of all you.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** What you want is obvious today, especially when you try to pretend you do not care.
>
> **Current body:** You might catch yourself hesitating over the plan you actually want to skip, or waiting for someone else to say the answer you are hoping for. Playing easygoing does not make you look flexible right now; it just looks like distance, because the desire shows through anyway. Hiding it does not convince anyone, least of all you. Say what you want, and move forward.

### 33. house/10

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: voice, structure, formula
- Judge why: This is the clearest emotional truth in the draft: it names the cost of performing competence until the public version of you no longer feels like you. The rest relies too heavily on generic promotion, meeting, project, and success language, then closes with a coaching-style instruction instead of landing the consequence with the same specificity.
- Best line: You do not need to become polished beyond recognition to be taken seriously.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Lead from presence, not perfection.
>
> **Current body:** A promotion comes up. Your name gets mentioned in a meeting. Another project lands on your desk because everyone knows you can carry it. Before you say yes, notice what the opportunity is actually rewarding. Does it move you toward work you want your name attached to, or does it rely on your ability to stay late, absorb the pressure, and make someone else's vision happen? You do not need to become polished beyond recognition to be taken seriously. Let your public life reflect more than what you can endure. Choose the work, title, and responsibility that sound like your own definition of success.

### 34. house/5

- Triage score: 2 (median of 1, 2, 2); passed dimensions: 4/7
- Failed dimensions: voice, formula, screenshot_line
- Judge why: This is the clearest statement of the actual cost: self-protection makes the work less personal. But the candidate opens and closes with familiar permission language, leans on generic "creative spark" phrasing, and makes the lived scene serve a broad self-expression lesson rather than landing with the plainer, more particular consequence of the GOOD examples.
- Best line: Scaling back your voice might protect you from feeling exposed, but it also strips out the creative spark that makes it yours.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You don't have to turn everything you make into work.
>
> **Current body:** You draft a playful text or start making something, then hesitate right before sharing it and edit out the exact line that sounds most like you. You've forgotten how to have fun without turning it into work or optimizing it for an audience. Scaling back your voice might protect you from feeling exposed, but it also strips out the creative spark that makes it yours. You're allowed to make things that don't impress anyone but you, and what you create doesn't need to be profitable to matter. Put your original spin back into it and let it be messy, imperfect, and yours.

### 35. house/8

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: voice, structure, formula
- Judge why: This is the only line that cleanly names the house/8 imbalance: another person controls access while you carry the cost. The rest falls into a familiar scene, permission, instruction pattern, especially "You don't have to," "does not make you weak," and "You are allowed," which matches the rejected register too closely.
- Best line: Someone else holds the password, the paperwork, or the final say, and you are left absorbing the friction.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Notice what you share and what you keep private.
>
> **Current body:** You split the check down the middle even though you barely ate, or keep quiet about a shared debt because bringing up money feels deeply uncomfortable. Someone else holds the password, the paperwork, or the final say, and you are left absorbing the friction. You don't have to stay in the dark to keep the peace. Bring the terms into the light. Ask who owes what, request the login, and get the exact numbers on paper. Asking for transparency does not make you weak or high maintenance. You are allowed to insist on clarity before you invest another dollar, hour, or ounce of faith.

### 36. opposition/mars

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: voice, stakes, screenshot_line
- Judge why: The strongest line gives a usable interruption to a defensive reaction, but the rest stays abstract: “pressure,” “edge,” “instantaneous defense,” and “self-preservation” name a generalized emotional mechanism without showing what the reaction costs in an actual exchange. “Bait you into overreacting” also assigns manipulative intent too quickly, which pushes the voice toward therapy-coaching diagnosis rather than plain observational truth.
- Best line: Ask one clear question, let them answer without interruption, and only then decide how much weight to give it.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Someone else's pressure can easily bait you into overreacting.
>
> **Current body:** Expect an urge to fire back when someone pushes a boundary or questions your judgment. Their edge can make instantaneous defense feel like self-preservation before you even hear them out. Ask one clear question, let them answer without interruption, and only then decide how much weight to give it.

### 37. opposition/sun

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: voice, formula, specificity
- Judge why: This is the strongest line because it names the split between outward agreement and private resentment cleanly. The rest reduces that insight to a standard boundary-setting scene: somebody asks, someone agrees too fast, then revises the answer. It needs a more particular consequence or relational tension to feel like this transit rather than a general reminder not to overcommit.
- Best line: You can say yes in public and regret it in private.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You can say yes in public and regret it in private.
>
> **Current body:** Someone asks for more, and the answer that keeps the peace comes out before you check what it will cost you. An hour later, you are resentful about a commitment you never wanted. Correct the answer. Tell them you agreed too quickly and need to revise what you can take on.

### 38. soft/lilith

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: voice, stakes, formula
- Judge why: This is the clearest line because it names the actual cost of self-silencing without overexplaining it. The rest reduces that truth to a snack-cart scenario, then leans on the familiar "You're allowed" permission frame and a tidy instruction, so it does not carry the same lived weight as the approved examples.
- Best line: Saying nothing is not the same as wanting nothing.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Saying nothing is not the same as wanting nothing.
>
> **Current body:** When your partner opens the grocery order and asks what to add, you may worry that one extra snack will seem demanding. So you say "nothing," which leaves the item on your phone instead of in the shared cart. You're allowed to want more. One snack does not turn the order into a crisis. Send the snack's name and price before they check out.

### 39. soft/moon

- Triage score: 2 (median of 1, 2, 2); passed dimensions: 4/7
- Failed dimensions: voice, hedging, formula
- Judge why: This is the clearest and most saveable line because it names the actual cost of hypervigilance without pretending the threat is imaginary. The rest weakens it with "ironically," "the friction comes when," "your reflex," and "let the momentum work for you," which sound assembled and coaching-forward rather than like the owner’s direct conversational voice.
- Best line: Constantly bracing for trouble doesn't prevent it; it just ruins any peace of mind you actually have right now.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Constantly bracing for trouble doesn't prevent it.
>
> **Current body:** Things are running smoothly, which might ironically make you nervous. The friction comes when ease makes you suspicious. Your reflex might be to brace for impact, look for the hidden catch, or deflect a simple thank you by listing everything you could have done better. Constantly bracing for trouble doesn't prevent it; it just ruins any peace of mind you actually have right now. Drop the guard and let the momentum work for you.

### 40. square/jupiter

- Triage score: 2 (median of 2, 2, 3); passed dimensions: 4/7
- Failed dimensions: voice, formula, screenshot_line
- Judge why: This is the strongest line because it names the actual Jupiter-square cost of expansion without capacity: adding more does not solve an overloaded plan. The rest is competent but generic in its stacked categories and checklist close—“calendar, bank balance, and actual energy” reads like broad productivity advice. It lacks the sharper, more personally recognizable observation that would make someone save it.
- Best line: More will not help if the current plan is already asking too much.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** The temptation is to say yes before you see the bill.
>
> **Current body:** A rush of optimism can make every idea look manageable and every invitation feel worth saying yes to. You may add work, spend money, or promise time before finishing what is already in front of you. Check your calendar, bank balance, and actual energy before you expand. More will not help if the current plan is already asking too much.

### 41. square/saturn

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 4/7
- Failed dimensions: voice, hedging, formula
- Judge why: This is the strongest line because it names the Saturn-square mechanism as observable behavior with a real cost: pressure turns into overwork, and higher standards erase satisfaction. The rest leans too quickly on familiar therapy and self-care language: “inner critic” is shorthand, and “Nobody has to earn rest” lands like a generic permission line rather than a specific completion of the transit’s pressure.
- Best line: You may respond by working through exhaustion and tightening every standard until nothing you finish feels good enough.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Your inner critic is working overtime.
>
> **Current body:** A slow start or unfinished task can make the whole day feel like proof that you are falling behind. You may respond by working through exhaustion and tightening every standard until nothing you finish feels good enough. Choose the work that actually matters today. Nobody has to earn rest, including you.

### 42. square/venus

- Triage score: 2 (median of 2, 2, 3); passed dimensions: 4/7
- Failed dimensions: voice, formula, specificity
- Judge why: This is the clearest and most shareable sentence, but the candidate still feels assembled around a familiar text-silence, retail-comfort, self-worth sequence. The purchase gives Venus some relevance, yet the square's particular tension is not developed enough to keep this from being portable to many insecurity or relationship transits.
- Best line: A slow reply does not get to decide what you are worth.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** A delayed reply can make a quiet phone feel like a final verdict.
>
> **Current body:** You send a warm text and get silence back, and within ten minutes you are wondering if you were too much, while an impulse purchase in your cart starts looking like a reasonable fix for your feelings. Put the phone down and step away from the checkout screen. A slow reply does not get to decide what you are worth.

### 43. conjunction/jupiter

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This names the actual cost of too much goodwill without pretending the support is malicious. The body weakens it by opening with a tidy illustrative scene and ending in a three-step coaching instruction, which gives the whole piece a familiar horoscope-template rhythm rather than the sharper, more lived-in truth of the approved examples.
- Best line: Help becomes extra work when everyone shows up at the same time.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Help becomes extra work when everyone shows up at the same time.
>
> **Current body:** You ask for a ride and get three offers, a meal plan, and enough enthusiasm to turn one quick errand into a full group project. The support is genuine, but managing the offers, coordinating the details, and keeping everyone happy takes more energy than doing the job yourself. Accept the single offer that makes your day simpler, say a polite no to the rest, and move on.

### 44. conjunction/mars

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, stakes
- Judge why: This is the clearest line because it names the actual Mars problem: speed can turn a useful reaction into escalation. The rest stays broad—walking out, calling, and intervening could belong to almost any urgency transit—and “making it bigger” never identifies what gets damaged, lost, or complicated. The final instruction has a polished coaching shape that keeps the piece from sounding like the owner’s sharper, more lived-in voice.
- Best line: A quick response is not always the wrong one, but it gives you less time to decide whether you are solving the problem or making it bigger.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** The feeling hits, and you are already doing something about it.
>
> **Current body:** You may walk out angry, make the worried call immediately, or jump into an argument that did not involve you. A quick response is not always the wrong one, but it gives you less time to decide whether you are solving the problem or making it bigger. Before you leave, call, or intervene, decide what you want the next ten minutes to accomplish.

### 45. conjunction/south-node

- Triage score: 2 (median of 1, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This is the clearest and most sendable line because it names the actual south-node problem: confusing familiarity and practiced endurance with a genuine choice. The rest has recognizable stakes and transit specificity, but “An old employer reaches out. An ex checks in. A plan...” is a scene-first pileup, and the paired “familiar/unfamiliar” contrast reads like polished horoscope construction rather than the owner's plainer conversational truth.
- Best line: Do you still want this, or do you simply know how to survive it?
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** The past stops being memory and becomes an option.
>
> **Current body:** An old employer reaches out. An ex checks in. A plan you abandoned suddenly looks possible again. Because you recognize the pattern, your body may relax before your mind remembers what it cost you. Pause before you call it a second chance. Do you still want this, or do you simply know how to survive it? The unfamiliar can feel uncomfortable without being wrong. The familiar can feel easy without being good. Let your history help you choose differently, not return automatically.

### 46. house/1

- Triage score: 2 (median of 2, 2, 3); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This is the clearest and most sendable line because it names the cost of self-editing without turning it into a therapy claim. The rest feels more assembled: dressing down, feeling invisible, then being told to share one detail is a tidy coaching sequence, and telling one person a private detail is not necessarily the same as changing the public version of yourself.
- Best line: Nobody can know you from the version that never shows up.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Blending in is not worth a first impression you do not recognize.
>
> **Current body:** You dress down to blend in and leave out the one detail you actually wanted to share. Staying neutral may help you avoid attention, but it can leave you feeling invisible. Nobody can know you from the version that never shows up. Tell one person the detail you almost kept to yourself.

### 47. house/11

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This is the clearest consequence and carries the group-pressure mechanism of the key. The rest sounds more assembled: “Notice how tempting,” “Speak up to one person,” and “outline the one change” create a tidy self-help sequence instead of showing the actual moment where someone realizes they have agreed to a group priority that costs them time.
- Best line: Slipping into consensus keeps things smooth now, but it locks you into commitments you never asked for.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Keeping the peace is not worth inheriting everyone else's priorities.
>
> **Current body:** Notice how tempting it gets to nod along just because the room is moving in one direction. Slipping into consensus keeps things smooth now, but it locks you into commitments you never asked for. Speak up to one person: name what part of the plan actually works for you, and outline the one change that makes it worth your time.

### 48. house/2

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, structure
- Judge why: This has a real cost: guilt turns into overwork, deprivation, or panic spending. The strongest line clearly separates practical money concerns from self-worth. But “feel your whole body tighten,” the stacked self-judgments, and “pause and ask what would actually help” read more like assembled wellness copy than the owner’s plain, lived specificity. The central truth also arrives too late; the opening spends three sentences setting a scene before naming what the transit is actually doing.
- Best line: Money can show you what needs attention. It cannot tell you what you are worth.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Stop auditing your worth like it is a balance sheet.
>
> **Current body:** You check your balance and feel your whole body tighten. A bill is due. The workday ends with half the list unfinished. Suddenly, the number starts telling a story about who you are: not responsible enough, not productive enough, not doing enough. Money can show you what needs attention. It cannot tell you what you are worth. Before you take on more work out of guilt, deny yourself what you need, or spend just to quiet the panic, pause and ask what would actually help. Handle the practical details, but leave your character out of it.

### 49. house/3

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This is the cleanest sentence because it names the actual communication problem plainly and early. The rest weakens it by stacking interchangeable logistics scenes and ending with commands that could fit almost any busy-day transit.
- Best line: Extra explanation can bury the point.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Extra explanation can bury the point.
>
> **Current body:** The group chat moves dinner from seven to eight, then back again. A quick email sprouts six replies. You get halfway through an errand before realizing one key detail changed; and suddenly your whole afternoon is swallowed by back-and-forth. Give the small exchanges your full attention today. Confirm the time. Answer the exact question in front of you. Put the important details somewhere everyone can actually find them. A little precision right now will save you from a much bigger problem later. Say what needs to be said, make it clear, and let that be enough.

### 50. house/4

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This is the clearest, most sendable truth in the draft: it pushes back on treating basic livability as superficial. The rest leans too hard on constructed phrasing like "carry you back," "hold you," and "following everyone from room to room," which makes the domestic stress feel stylized rather than plainly observed.
- Best line: Comfort is not a luxury or a look.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Give your home the care it needs so it can carry you back.
>
> **Current body:** You walk through the door and feel your body tighten before you have even put your keys down. The cabinet still will not close. The chair is buried again. The conversation no one wants to have is waiting at the kitchen table. Tend to the part of your private life you keep postponing because you are too tired to deal with it. Fix the latch. Clear a place to sit. Say what has been following everyone from room to room. Comfort is not a luxury or a look. It is what allows your home to hold you when the rest of life asks too much.

### 51. house/7

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This is the clearest sentence because it names the actual relational cost of automatic accommodation: the relationship has room only for the manageable version of someone. The rest of the draft is competent but more assembled, moving through a familiar agree-resent-assert sequence with directive lines that sound like horoscope coaching rather than an observed truth.
- Best line: A connection that only works when you are easy to accommodate is not making space for all of you.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Resentment is the receipt for a boundary you didn't set.
>
> **Current body:** You agree before you check in with yourself. You take on the favor, go along with the plan, or make your preference smaller so the moment stays easy. Then the resentment arrives after everyone else thinks the decision is settled. Catch yourself before the yes leaves your mouth. Ask for more notice. Name the limit while there is still room to adjust. Your needs may inconvenience someone, but that does not make them unreasonable. A connection that only works when you are easy to accommodate is not making space for all of you.

### 52. opposition/jupiter

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This is the one sentence that names the actual social pressure and its cost without hiding behind abstraction: another person's momentum turns a reasonable limit into something that feels selfish, while the unfinished work remains yours. The rest slips into generic transit language such as "appetite for more," "grasp at what is returning," and the permission-frame ending.
- Best line: Their enthusiasm makes your limit look stingy, so you agree while mentally panicking about the work waiting at home.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** More isn't the answer this time.
>
> **Current body:** Someone else's high energy and appetite for more can easily pull you into an overcommitment you never intended to make. A quick catch-up turns into an afternoon of extra stops, and the temptation will be to move quickly, to grasp at what is returning, and to say yes before you understand the consequences. Their enthusiasm makes your limit look stingy, so you agree while mentally panicking about the work waiting at home. If it costs your peace, it's overpriced. Enjoy the first part of the plan, say a clear no to the additions, and remember that you don't have to be available for every crisis.

### 53. opposition/south-node

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: The headline cleanly names the cost of habitual accommodation without dressing it up. The body weakens it with a generic favor scene, a soft "may," and the fixed-slot permission line "You do not have to," which gives it the same coached, assembled rhythm as the rejected examples rather than the owner’s sharper plainspoken voice.
- Best line: The automatic yes is getting harder to live with.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** The automatic yes is getting harder to live with.
>
> **Current body:** Someone asks for one more favor, and you feel yourself agreeing before you check the time you saved for yourself. The yes may keep them happy and leave you resentful. You do not have to prove care by taking on every errand. Tell them you cannot do this one.

### 54. opposition/venus

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, specificity
- Judge why: This is the clearest and most emotionally recognizable truth in the piece: care does not automatically equal attunement. The rest explains the reader's inner reflex too confidently, then resolves it with a familiar advice-script ending, which makes the transit feel more generic than the opening line.
- Best line: Someone can care about you and still miss what you actually need.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Being loved and feeling it do not always match.
>
> **Current body:** Someone can care about you and still miss what you actually need. Your reflex is to hide your disappointment, convinced that making noise will make you a burden or push them away. All this does is teach people to treat your limits as optional while keeping them blind to what you actually need. Tell them what you need. Then give them the room to meet you, or show you that they won't.

### 55. soft/mars

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: stakes, specificity
- Judge why: The headline cleanly names the drag of avoidance, but the body turns it into broad productivity advice. Nothing shows the specific urge, friction, or consequence that makes this soft/Mars rather than any transit about motivation, focus, or momentum.
- Best line: It takes less energy to do the thing than to keep putting it off.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** It takes less energy to do the thing than to keep putting it off.
>
> **Current body:** For the next few hours, it is easier to act on what you want instead of just thinking about it. The task, conversation, or decision you have been putting off may still be annoying, but it feels more possible now. Give it thirty minutes before your mind starts making the case for waiting again.

### 56. square/mars

- Triage score: 2 (median of 1, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: The candidate has a real Mars-square consequence: an immediate demand turns limited capacity into a draining reactive fight. But phrases like "character flaw to fix," "bandwidth," and "You don't owe anyone" give it a therapy-coaching polish that is more assembled than the GOOD examples. The strongest line plainly names the actual problem without trying to sound therapeutic.
- Best line: It is a signal that your bandwidth is full.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Anger this quick is usually the exhaustion talking.
>
> **Current body:** A last-minute demand lands on an already strained day, and someone pushes for an immediate answer while you are carrying private stress or sheer exhaustion. When they treat your capacity as if it is bottomless, it is easy to register the disrespect and lose your patience, spending twenty minutes in a reactive conflict that drains more energy than the task itself. That flare of anger isn't a character flaw to fix. It is a signal that your bandwidth is full. You don't owe anyone an immediate reaction just because they brought an immediate demand. State your timeline, step out of the argument, and protect what's left of your day.

### 57. square/moon

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: formula, specificity
- Judge why: This is the clearest and most sendable truth in the card because it names the real conflict without turning exhaustion into a character flaw. The rest of the body could apply to almost any transit involving stress, low energy, or overcommitment, so it does not carry enough square/moon-specific tension.
- Best line: The plan is not more important than the energy you actually have.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** The plan is not more important than the energy you actually have.
>
> **Current body:** You may get halfway through the errands and realize the rest of the list is too much. Forcing the original schedule can turn a normal day into a fight with yourself. Changing the plan does not make you unreliable. Remove one nonessential task before you start resenting everything that remains.

### 58. square/neptune

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, formula
- Judge why: This is the sharpest sentence because it names the actual cost of Neptune-style uncertainty: treating an old hurt as proof about a situation that has not resolved yet. The rest is readable, but "your imagination to write the worst possible ending" and the final list of instructions lean toward familiar self-help language rather than the plainer, less assembled pressure of the approved examples.
- Best line: Soon, you are responding as if they have already disappointed you again.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Question the story you're telling yourself.
>
> **Current body:** A delayed reply, vague plan, or conversation that suddenly feels off leaves enough room for your imagination to write the worst possible ending. You reread the message, study the wording, and connect the silence to every time someone disappointed you before. Soon, you are responding as if they have already disappointed you again. Give it time. Do not send the second message, cancel the plan, or make the decision for them before they have answered.

### 59. square/north-node

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, specificity
- Judge why: This is the strongest line because it names a real fear plainly and gives the thought a clean ending. The rest leans on broad coaching language—"the life you are trying to build," "role, relationship pattern, or work arrangement"—rather than showing the specific friction of a square to the North Node. The headline promises a cost in time, but the body never makes that cost concrete.
- Best line: Being new at something is not proof that you made the wrong choice.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Staying comfortable is costing you time.
>
> **Current body:** A familiar choice can feel safer because you already know how to survive it. That does not mean it still fits the life you are trying to build. Notice where you keep choosing the same role, relationship pattern, or work arrangement because change would require you to be inexperienced for a while. Being new at something is not proof that you made the wrong choice.

### 60. square/south-node

- Triage score: 2 (median of 1, 2, 2); passed dimensions: 5/7
- Failed dimensions: voice, specificity
- Judge why: This is the clearest statement of the transit’s consequence: avoiding conflict puts the same responsibility back on the person avoiding it. But the rest relies on broad therapy language like “oldest habit,” “fix the mood,” and “past experience,” so it could fit too many pressure transits without showing this one through a specific social dynamic or cost.
- Best line: That impulse might protect you from temporary conflict, but it guarantees you end up carrying the exact burden you claim to be tired of.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Doing it yourself is how the burden becomes yours again.
>
> **Current body:** Pressure pulls you straight into your oldest habit: retreat, take control, fix the mood, or handle the whole thing yourself. That impulse might protect you from temporary conflict, but it guarantees you end up carrying the exact burden you claim to be tired of. Pause before habit answers for you. You can draw on what past experience taught you without stepping back into the role that cost you so much.

### 61. house/12

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 6/7
- Failed dimensions: formula
- Judge why: This is the sentence that earns the draft its stakes and its house 12 relevance: it names the less obvious cost of early access to everyone else. But the surrounding wake-up-phone-breakfast sequence feels like a standard productivity-boundaries setup, and the final instruction lands as familiar coaching rather than an owner-specific completion.
- Best line: The cost is not only the time spent replying. It is how difficult it becomes to return to yourself.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Answering messages too early gives away the only private part of your day.
>
> **Current body:** You wake up, reach for your phone, and start clearing requests before anyone has asked for an immediate response. By breakfast, the quiet hour is gone, several conversations are open, and your mind is already multi-tasking the problems that could have waited. The cost is not only the time spent replying. It is how difficult it becomes to return to yourself. Send one message, put the phone down, and keep the morning you meant to have.

### 62. house/6

- Triage score: 2 (median of 2, 2, 3); passed dimensions: 6/7
- Failed dimensions: voice
- Judge why: This is the clearest sentence because it names the underlying distortion directly: basic care has been demoted behind other people’s demands. The rest relies on generalized wellness language like "food, medication, movement, or rest" and ends in a coaching-style schedule instruction, which keeps it from feeling as plain, lived-in, and owner-specific as the GOOD examples.
- Best line: Your health is not an extra task after the real work.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Stop structuring your day around everyone else's priorities.
>
> **Current body:** Pay attention to the exhaustion that does not lift after one good night of sleep. You may be building the entire day around other people's deadlines, then trying to fit food, medication, movement, or rest into whatever is left. Your health is not an extra task after the real work. Change one part of the schedule that keeps making basic care impossible.

### 63. opposition/mercury

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 6/7
- Failed dimensions: voice
- Judge why: This is the most recognizably human part: it names a real lost stretch of time and the specific escalation that follows from reading hostility into sparse communication. The rest is cleaner and more aphoristic than the GOOD examples, especially the headline's mind-reading diagnosis and the final contrast between "the story in your head" and "the words on the screen."
- Best line: It's easy to spend twenty minutes dissecting two sentences and building an argument against a point the other person never made.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** You're reading too much into it.
>
> **Current body:** A blunt text, delayed reply, or clipped tone can feel loaded when you're already braced for friction. It's easy to spend twenty minutes dissecting two sentences and building an argument against a point the other person never made. Ask for clarification before you react to your worst-case assumption. Crossed wires only become a confrontation when you start fighting the story in your head instead of the words on the screen.

### 64. opposition/moon

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 6/7
- Failed dimensions: voice
- Judge why: The headline names the actual opposition/Moon tension cleanly: another person's emotional need starts overruling your own immediate plans. The body keeps that mechanism and gives it a real cost, but "Care is not the mistake here. The mistake is..." has a polished coaching cadence that reads more like a constructed takeaway than the owner's rougher, more specific conversational truth.
- Best line: Stop treating their urgency as proof that your plans can wait.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Stop treating their urgency as proof that your plans can wait.
>
> **Current body:** You started with a clear plan, but someone else's crisis just hijacked your schedule. They need more time, reassurance, or attention than you expected, and your first impulse is to put your life on hold to manage their reaction. Care is not the mistake here. The mistake is making their mood the emergency and your life the afterthought. Give what you can actually spare, not the energy you need to get through the rest of the day.

### 65. opposition/uranus

- Triage score: 2 (median of 2, 2, 2); passed dimensions: 6/7
- Failed dimensions: voice
- Judge why: This is the strongest line because it names the actual cost of another person's unpredictability: your time and the disruption to your plans. The remaining lines turn quickly into a clean directive, especially "They do not get to manage what you do next," which has the polished, aphoristic boundary-language the rejected examples drift toward.
- Best line: You reorganized your life to make room for someone who just canceled, shifted the time, or went quiet.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** They changed the plan. They do not get to ruin yours.
>
> **Current body:** You reorganized your life to make room for someone who just canceled, shifted the time, or went quiet. The mistake now is staying suspended in frustration. Take back the hours you set aside and put them toward your own life. They get to change their mind; they don't get to manage what you do next.

### 66. square/chiron

- Triage score: 2 (median of 2, 2, 3); passed dimensions: 6/7
- Failed dimensions: specificity
- Judge why: This is the clearest sentence because it holds both sides of the situation without turning into therapy language: the hurt is real, and the indirect test still creates a problem. The rest is clean, but the transit-specific wound needs more than a generic missed ask and a grocery errand.
- Best line: Feeling overlooked still hurts, but expecting them to read your mind just sets everyone up to fail.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Expecting someone to guess what you need won't tell you how much they care.
>
> **Current body:** Notice when you drop a hint, leave out the actual ask, and wait to see if they guess what you need. When you text that the milk is gone, delete the line asking them to stop at the store, and get a reply about dinner instead, it is easy to feel ignored, even though you never actually asked. Feeling overlooked still hurts, but expecting them to read your mind just sets everyone up to fail.

### 67. conjunction/saturn

- Triage score: 3 (median of 2, 3, 3); passed dimensions: 7/7
- Failed dimensions: none
- Judge why: This is the clearest owner-voice sentence because it names the resentment underneath caretaking without making the person sound selfish or diagnosing them. It turns a mundane scheduling problem into the actual Saturn cost: other people's needs repeatedly taking authority over your time.
- Best line: The weight does not just come from showing up. It comes from constantly tearing down and rearranging your life whenever someone else needs help.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Taking care of family is rarely just about the task itself.
>
> **Current body:** It is the energy spent rebuilding your whole day around it. A text confirms an appointment, so you reschedule a work call and squeeze your remaining hours into a tight corner. Then another ask comes in before you have even settled the first change. The weight does not just come from showing up. It comes from constantly tearing down and rearranging your life whenever someone else needs help. Pick the most important request you can actually manage today, adjust the schedule once, and say no to the rest.

### 68. opposition/saturn

- Triage score: 3 (median of 2, 3, 3); passed dimensions: 7/7
- Failed dimensions: none
- Judge why: This is the clearest line because it turns a familiar pattern into a concrete cost: continued effort, monitoring, and self-correction for a standard the other person may never meet with warmth. The body supports that claim directly through follow-through, distance, and moving standards.
- Best line: Their approval should not become another job.
- Status: serving owner-approved text remains unchanged; this finding is advisory only.

> **Current headline:** Their approval should not become another job.
>
> **Current body:** You remember the details, show up when you said you would, and follow through, but still leave wondering what you did wrong. The other person stays distant or points to one more standard you have not met, so you keep working harder for a warmth they never promised to give. At some point, the problem is no longer your effort.
