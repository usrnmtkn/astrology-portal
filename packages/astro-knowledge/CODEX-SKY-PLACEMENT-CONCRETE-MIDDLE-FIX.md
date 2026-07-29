# Codex prompt: placement generator - concrete middle + no pre-close aphorism

The label fix worked (calibration held 3.00/1.00/2.00). The 5-card sample left two
residual tics on the 3 human-review cards, both fixable by demonstration in the
placement prompt. Owner ruling: "less is more" - prefer deletion over addition.

Placement-mode prompt only. Do not touch aspect behavior, the judge, or calibration.

## Two rules to add to the placement generator prompt (by demonstration)

### 1. Delete pre-close generic aphorisms
The second-to-last line must NOT be a standalone summarizing maxim. Go straight from
the concrete body to the one-line close. Do not reword the aphorism - cut it.
- BAD: "...let old hurts write today's response. Emotional honesty builds trust. If you keep sidestepping the real conversation, you'll end up talking circles around what you actually mean."
- GOOD (cut the maxim): "...let old hurts write today's response. If you keep sidestepping the real conversation, you'll end up talking circles around what you actually mean."
- BAD: "...leave projects half-built when the next idea hits. Words move mountains, but they also run circles if we let them. It's easy to start a hundred things. You only get anywhere if you finish one."
- GOOD (cut the maxim; "move mountains" is also a banned cliche): "...leave projects half-built when the next idea hits. It's easy to start a hundred things. You only get anywhere if you finish one."

### 2. The middle must be concrete, not motivational
Name real, specific behavior and images - not generic self-help verbs. The gold
bodies do this ("a room we're trying to light up", "the check-in text, the meal
prepped, the fix nobody else noticed", "show their work before they get a seat at
the table").
- BAD (generic motivational): "The Sun in Leo pushes us to choose boldness over safety, to lead without waiting for permission, and to create something that lands."
- GOOD (concrete, direct): "Stop choosing safety over presence. Step up before we're asked, and put our energy into work that can make an impact."

## Owner-approved final versions of the 3 human-review cards

Use these verbatim as the published copy for the current-sky Sun/Mercury/Mars
placements (they are the hand-polished targets; all lint 3/0 in placement mode):

**Sun in Leo**
> This is the chapter where we want to be visible for what we bring, not just what we can prove. We want rooms to light up when we walk in, work to matter because it has our stamp on it, and connections to feel mutual - recognition for recognition, heart for heart. Stop choosing safety over presence. Step up before we're asked, and put our energy into work that can make an impact. We move with a heat that's generous when it's real, but it curdles fast when we chase validation over substance. The same force that draws people in can turn brittle if we start measuring worth by the reaction instead of the work.
>
> We want the applause, but it only feels good when it matches what's true. Build yourself on applause and you'll always need a crowd.

**Mercury in Cancer**
> Conversations lean sentimental and protective when Mercury moves through Cancer. For the next few weeks, communication is loaded with feeling - we tell stories instead of giving bullet points, read between the lines, and check the room before saying what matters most. Memory shapes every exchange, and we hold on to details that others forget. Mercury here listens for tone as much as content, and guards what feels vulnerable.
>
> We can use this to connect deeper, to speak in a way that lands because it's true and specific. But it's easy to dodge the point or let old hurts write today's response. If you keep sidestepping the real conversation, you'll end up talking circles around what you actually mean.

**Mars in Gemini**
> Conversation turns tactical and fast. For about six weeks, action runs on caffeine and debate - Mars in Gemini wants answers, movement, and every option on the table. We chase what's next by talking about it, testing ideas in real time, and refusing to pick just one lane. Drive is verbal, quick, and restless: we act by firing off the question, the DM, the follow-up, and the counterpoint. Every plan is a draft. Every decision is a group chat.
>
> The strength is clear thinking under pressure and the courage to say what everyone else is only circling. But we scatter our energy, argue just because we can, and leave projects half-built when the next idea hits. It's easy to start a hundred things. You only get anywhere if you finish one.

## Then

Regenerate a fresh current-sky sample with the updated prompt and report scores +
cards. Expect improvement, but per the aspect-generator experience these are
ceiling behaviors - residual 2s go to the one-line human-polish queue, not another
tuning cycle. Once the sample reads clean, enabling placements is the owner's call
(`SKY_PLACEMENT_JUDGE_CALIBRATED` stays false until then).
