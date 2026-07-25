import fs from "node:fs";

const sourcePath = "SKY-ASPECT-EXACT-STORY-PACKETS.md";
const auditPath = "sky-aspect-v10-word-choice-audit.json";

let source = fs.readFileSync(sourcePath, "utf8");

const refinements = [
  {
    id: "sky.sun.sextile.mercury",
    before:
      "The Sun gives the decision a clear owner, while Mercury makes the information usable for the people expected to act on it.",
    after:
      "The Sun gives the decision a clear owner, while Mercury turns it into instructions the responsible teams can actually follow.",
  },
  {
    id: "sky.sun.sextile.mercury",
    before:
      "The sextile opens a clean route between the announcement and the next step, but someone still has to close the gap.",
    after:
      "The sextile creates a clean handoff between the announcement and the first deadline, but someone still has to close the gap.",
  },
  {
    id: "sky.sun.sextile.mercury",
    before:
      "The plan moves because the missing answer is handled before it becomes another department's problem.",
    after:
      "The work stays on track because the missing answer is handled before it becomes another department's problem.",
  },
  {
    id: "sky.sun.trine.mercury",
    before:
      "The Sun establishes the direction, while Mercury carries the decision through every message, document, and conversation connected to it.",
    after:
      "The Sun sets the course, while Mercury keeps the decision intact across every message, document, and conversation connected to it.",
  },
  {
    id: "sky.sun.trine.mercury",
    before:
      "Under the trine, the words and the decision support each other without requiring a second explanation.",
    after:
      "Under the trine, the announcement and the decision reinforce each other without requiring a second explanation.",
  },
  {
    id: "sky.sun.square.mercury",
    before:
      "The Sun insists that the decision has already been made, while Mercury keeps exposing the language that makes three different readings possible.",
    after:
      "The Sun insists the decision is final, while Mercury keeps catching the wording that sends each team in a different direction.",
  },
  {
    id: "sky.sun.square.mercury",
    before:
      "The square turns every follow-up question into evidence that the original message cannot carry the authority placed on it.",
    after:
      "Under the tension of the square, every follow-up question proves the original memo was never clear enough to carry that much authority.",
  },
  {
    id: "sky.sun.opposition.mercury",
    before:
      "The Sun holds the official position, while Mercury keeps the written record moving into view.",
    after:
      "The Sun defends the official position, while Mercury drags the written record back into the room.",
  },
  {
    id: "sky.sun.opposition.mercury",
    before:
      "The opposition places the clean public version directly across from the messier paper trail.",
    after:
      "The opposition forces the polished public version to face the messier paper trail.",
  },
  {
    id: "sky.sun.conjunction.mercury",
    before:
      "The Sun centers control and allegiance, while Mercury follows the record until the hidden arrangement can no longer be dodged.",
    after:
      "The Sun puts authority and loyalty under scrutiny, while Mercury follows the record until the hidden arrangement can no longer be dodged.",
  },
  {
    id: "sky.sun.conjunction.mercury",
    before:
      "The group gets the answers it was missing, but the fallout draws a permanent boundary around who gets trusted next time.",
    after:
      "Everyone in the room gets the answers they were missing, but the fallout draws a hard line around who gets trusted next time.",
  },
  {
    id: "sky.sun.sextile.venus",
    before:
      "The Sun brings attention to the result, while Venus makes sure value, money, and appreciation reach the people who earned them.",
    after:
      "The Sun puts the result under a spotlight, while Venus tracks whether the credit, money, and appreciation reach the people who earned them.",
  },
  {
    id: "sky.sun.trine.venus",
    before:
      "The Sun makes the achievement visible, while Venus connects that visibility to fair compensation and genuine appreciation.",
    after:
      "The Sun puts the achievement on the record, while Venus refuses to separate public credit from fair compensation and genuine appreciation.",
  },
  {
    id: "sky.sun.opposition.venus",
    before:
      "The Sun holds the visible success, while Venus gives the question of credit, compensation, and fairness equal weight.",
    after:
      "The Sun owns the visible success, while Venus keeps the missing credit, compensation, and fairness from being waved away.",
  },
  {
    id: "sky.sun.opposition.venus",
    before:
      "The event may still look successful, but the missing recognition becomes part of what everyone remembers.",
    after:
      "The event may still photograph like a success, but the missing recognition becomes part of what everyone remembers.",
  },
  {
    id: "sky.sun.conjunction.venus",
    before:
      "The Sun concentrates attention on the visible success, while Venus ties value to approval and the response of the room.",
    after:
      "The Sun keeps the spotlight fixed on the visible success, while Venus lets applause and approval stand in for value.",
  },
  {
    id: "sky.sun.sextile.mars",
    before:
      "The Sun sets the direction, while Mars turns that backing into a practical first move.",
    after:
      "The Sun authorizes the direction, while Mars puts someone on the first task before momentum cools.",
  },
  {
    id: "sky.sun.sextile.mars",
    before:
      "Early progress gives the larger plan a chance to prove itself before support drifts elsewhere.",
    after:
      "The early result gives the unfinished plan something concrete to defend before support drifts elsewhere.",
  },
  {
    id: "sky.sun.trine.mars",
    before:
      "The Sun gives the effort a clear direction, while Mars supplies the labor, speed, and willingness to act.",
    after:
      "The Sun sets the objective, while Mars puts labor, speed, and nerve behind it.",
  },
  {
    id: "sky.sun.opposition.mars",
    before:
      "The Sun holds the public direction, while Mars gives the resistance a body, a voice, and the power to stop moving.",
    after:
      "The Sun defends the official order, while Mars turns resistance into stopped work and a refusal nobody can edit out of the room.",
  },
  {
    id: "sky.sun.opposition.mars",
    before:
      "The opposition puts the order and the refusal in full view at the same time.",
    after:
      "The opposition leaves the order and the refusal staring across the same room.",
  },
  {
    id: "sky.sun.sextile.jupiter",
    before:
      "The Sun keeps the project tied to its central purpose, while Jupiter brings wider backing, reach, and confidence.",
    after:
      "The Sun keeps the expansion anchored to its original purpose, while Jupiter brings a bigger audience, budget, and level of institutional confidence.",
  },
  {
    id: "sky.sun.sextile.jupiter",
    before:
      "The sextile opens a larger door, but the opportunity still depends on a timely practical move.",
    after:
      "The sextile opens a larger door, but the opportunity still depends on someone moving before the window closes.",
  },
  {
    id: "sky.sun.square.jupiter",
    before:
      "The square stretches the promise until a real limit refuses one more addition.",
    after:
      "Under the tension of the square, the promise keeps stretching until a hard limit refuses one more addition.",
  },
  {
    id: "sky.sun.opposition.jupiter",
    before:
      "The Sun holds the bold public direction, while Jupiter makes the opportunity and the audience impossible to keep small.",
    after:
      "The Sun defends the oversized public promise, while Jupiter makes the audience and the obligation grow together.",
  },
  {
    id: "sky.sun.conjunction.jupiter",
    before:
      "The Sun makes the central figure and decision impossible to ignore, while Jupiter amplifies the reach, confidence, and stakes surrounding them.",
    after:
      "The Sun puts the central figure under floodlights, while Jupiter magnifies the reach, confidence, and stakes surrounding them.",
  },
  {
    id: "sky.sun.conjunction.jupiter",
    before:
      "The surrounding group may enjoy the momentum while the person at the center carries the weight of everything the crowd now believes is possible.",
    after:
      "Everyone around the project may enjoy the momentum while the person at the center carries the weight of everything the crowd now believes is possible.",
  },
  {
    id: "sky.sun.sextile.saturn",
    before:
      "The Sun puts the achievement in view, while Saturn confirms the discipline and responsibility underneath it.",
    after:
      "The Sun puts the achievement on the record, while Saturn confirms the discipline and responsibility underneath it.",
  },
  {
    id: "sky.sun.trine.saturn",
    before:
      "The Sun makes the leadership role visible, while Saturn gives that role structure, history, and earned credibility.",
    after:
      "The Sun puts the title and authority where everyone can see them, while Saturn gives the role structure, history, and earned credibility.",
  },
  {
    id: "sky.sun.square.saturn",
    before:
      "The Sun keeps the shared direction in view, while Saturn enforces the boundary the plan failed to account for.",
    after:
      "The Sun refuses to let the shared goal disappear from the argument, while Saturn enforces the boundary the plan failed to account for.",
  },
  {
    id: "sky.sun.square.saturn",
    before:
      "Friction builds under the square until authority yields to the obligation it cannot overrule.",
    after:
      "Tension tightens under the square until authority yields to the obligation it cannot overrule.",
  },
  {
    id: "sky.sun.opposition.saturn",
    before:
      "The Sun holds the visible direction, while Saturn gives the refusal institutional weight.",
    after:
      "The Sun defends the public commitment, while Saturn backs the refusal with institutional authority.",
  },
  {
    id: "sky.sun.opposition.saturn",
    before:
      "The opposition forces ambition and consequence to face each other without allowing either to disappear into the other's language.",
    after:
      "The opposition forces public ambition to answer the limit it was trying to talk around.",
  },
  {
    id: "sky.sun.conjunction.saturn",
    before:
      "The Sun makes authority visible, while Saturn attaches that authority to responsibility, limits, and consequences.",
    after:
      "The Sun puts authority on display, while Saturn attaches it to responsibility, limits, and consequences.",
  },
  {
    id: "sky.sun.sextile.uranus",
    before:
      "The Sun gives the experiment a clear purpose and owner, while Uranus breaks with the process that kept reproducing the delay.",
    after:
      "The Sun gives the experiment executive cover and a person responsible for the result, while Uranus breaks with the process that kept reproducing the delay.",
  },
  {
    id: "sky.sun.sextile.uranus",
    before:
      "The sextile creates room for reform, but someone still has to test the change inside the real system.",
    after:
      "The sextile creates room for reform, but someone still has to test the change inside the live workflow.",
  },
  {
    id: "sky.sun.trine.uranus",
    before:
      "A long-delayed change moves through leadership before the old process can create another crisis.",
    after:
      "Leadership finally approves the long-delayed change before the old process can create another crisis.",
  },
  {
    id: "sky.sun.trine.uranus",
    before:
      "The Sun gives the break from precedent a visible direction, while Uranus replaces the rule that no longer serves the work.",
    after:
      "The Sun turns the break from precedent into an official course of action, while Uranus replaces the rule that no longer serves the work.",
  },
  {
    id: "sky.sun.trine.uranus",
    before:
      "The change feels credible because it improves daily operations instead of surviving only as a bold announcement.",
    after:
      "The change earns trust because it improves daily operations instead of surviving only as a bold announcement.",
  },
  {
    id: "sky.sun.opposition.uranus",
    before:
      "The Sun holds the official narrative, while Uranus gives the break from expectation a visible person and undeniable consequence.",
    after:
      "The Sun defends the official narrative, while Uranus gives the break from expectation a visible person and an undeniable consequence.",
  },
  {
    id: "sky.sun.conjunction.uranus",
    before:
      "The Sun concentrates attention on the person or decision at the center, while Uranus makes the break from expectation immediate and impossible to contain.",
    after:
      "The Sun keeps every camera fixed on the person or decision at the center, while Uranus makes the break from expectation immediate and impossible to contain.",
  },
  {
    id: "sky.sun.sextile.neptune",
    before:
      "The Sun gives the vision a clear center, while Neptune connects it to grief, imagination, compassion, or collective longing.",
    after:
      "The Sun gives the vision a named leader, budget, and deadline, while Neptune connects it to grief, imagination, compassion, or collective longing.",
  },
  {
    id: "sky.sun.sextile.neptune",
    before:
      "The response becomes meaningful because people understand what they are contributing to and where the money is going.",
    after:
      "The campaign earns trust because people understand what they are contributing to and where the money is going.",
  },
  {
    id: "sky.sun.opposition.neptune",
    before:
      "The Sun keeps the public figure and promise in view, while Neptune gives the vision enough emotional force to outrun the record.",
    after:
      "The Sun keeps the spotlight on the public figure and promise, while Neptune gives the vision enough emotional force to outrun the record.",
  },
  {
    id: "sky.sun.opposition.neptune",
    before:
      "The opposition places the inspiring image across from the confusion required to maintain it.",
    after:
      "The opposition forces the inspiring image to face the confusion required to maintain it.",
  },
  {
    id: "sky.sun.opposition.neptune",
    before:
      "The cause may be real, but belief starts to fracture when everyone realizes they were supporting a different version of the promise.",
    after:
      "The cause may be legitimate, but belief starts to fracture when everyone realizes they were supporting a different version of the promise.",
  },
  {
    id: "sky.sun.sextile.pluto",
    before:
      "One disclosure, audit request, or contract review gives the group a chance to correct the power imbalance before the next decision becomes final.",
    after:
      "One disclosure, audit request, or contract review gives everyone at the table a chance to correct the power imbalance before the next decision becomes final.",
  },
  {
    id: "sky.sun.sextile.pluto",
    before:
      "The Sun makes responsibility public, while Pluto exposes the control operating behind access, money, and private information.",
    after:
      "The Sun puts responsibility on the record, while Pluto exposes the control operating behind access, money, and private information.",
  },
  {
    id: "sky.sun.sextile.pluto",
    before:
      "The process can move with more trust because authority is named before it is exercised again.",
    after:
      "The next decision carries more trust because authority is named before it is exercised again.",
  },
  {
    id: "sky.sun.trine.pluto",
    before:
      "The Sun places leadership in full view, while Pluto reveals the deeper control that allows leadership to shape the outcome.",
    after:
      "The Sun puts leadership under public scrutiny, while Pluto names the deeper leverage shaping the outcome.",
  },
  {
    id: "sky.sun.trine.pluto",
    before:
      "Under the trine, visible authority and private leverage are brought into the same accountable structure.",
    after:
      "Under the trine, the title and the leverage behind it come under the same review.",
  },
  {
    id: "sky.sun.opposition.pluto",
    before:
      "The Sun holds the visible office, while Pluto reveals where the deeper leverage has been sitting.",
    after:
      "The Sun holds the title, while Pluto points directly to the money, records, and access making that title useful.",
  },
  {
    id: "sky.sun.opposition.pluto",
    before:
      "The opposition puts formal leadership and private control across from each other where everyone can see the split.",
    after:
      "The opposition forces formal leadership to face the private control making its decisions optional.",
  },
  {
    id: "sky.moon.sextile.mercury",
    before:
      "A message about childcare, medication, housing, or a schedule change gives a coordinator enough information to make one practical adjustment.",
    after:
      "A message about childcare, medication, housing, or a schedule change gives a coordinator enough information to intervene before the day falls apart.",
  },
  {
    id: "sky.moon.sextile.mercury",
    before:
      "The Moon brings the lived need into the conversation, while Mercury puts that need into language someone can answer.",
    after:
      "The Moon refuses to let the lived need stay off the record, while Mercury turns it into a request someone has to answer.",
  },
  {
    id: "sky.moon.opposition.mercury",
    before:
      "The Moon gives the lived experience a voice, while Mercury holds the record and the version that can be quoted.",
    after:
      "The Moon puts the lived experience on the record, while Mercury defends the version that can be quoted.",
  },
  {
    id: "sky.moon.opposition.mercury",
    before:
      "The opposition places what was written across from what was felt without allowing either account to erase the other.",
    after:
      "The opposition forces the official file to face the experience it failed to capture.",
  },
  {
    id: "sky.moon.conjunction.mercury",
    before:
      "The Moon brings the emotional need forward, while Mercury gives it words before anyone can keep working around it.",
    after:
      "The Moon makes the emotional need impossible to work around, while Mercury puts it into words the room has to answer.",
  },
  {
    id: "sky.moon.sextile.venus",
    before:
      "The Moon keeps attention on comfort and daily care, while Venus finds the money, agreement, or gesture that can make support feel personal.",
    after:
      "The Moon keeps daily comfort and care on the agenda, while Venus finds the money, room, or gesture that makes the help feel personal.",
  },
  {
    id: "sky.moon.square.venus",
    before:
      "The Moon exposes the labor and daily needs underneath the event, while Venus protects the atmosphere, appearance, and desire to keep everyone pleased.",
    after:
      "The Moon drags the unpaid labor and daily needs into the center of the event, while Venus protects the atmosphere, appearance, and desire to keep everyone pleased.",
  },
  {
    id: "sky.moon.opposition.venus",
    before:
      "The Moon gives the private cost a voice, while Venus holds the agreement and the wish to avoid disappointing anyone.",
    after:
      "The Moon makes the private cost impossible to smooth over, while Venus holds the agreement and the wish to avoid disappointing anyone.",
  },
  {
    id: "sky.moon.opposition.venus",
    before:
      "The opposition puts harmony and honest need on opposite sides of the same table.",
    after:
      "The opposition forces the pleasant plan to face what it has been costing at home.",
  },
  {
    id: "sky.moon.sextile.mars",
    before:
      "The Moon identifies what would make the day safer, while Mars supplies the effort and urgency to handle it.",
    after:
      "The Moon pinpoints what would make the day safer, while Mars supplies the effort and urgency to handle it.",
  },
  {
    id: "sky.moon.trine.mars",
    before:
      "The Moon keeps the human situation in view, while Mars moves bodies, tools, and decisions toward it.",
    after:
      "The Moon refuses to let the human situation disappear behind procedure, while Mars gets bodies, tools, and decisions where they are needed.",
  },
  {
    id: "sky.moon.square.mars",
    before:
      "The Moon exposes the need for rest and protection, while Mars keeps pressing for action on its own timeline.",
    after:
      "The Moon makes the need for rest and protection impossible to ignore, while Mars presses for action as though no other limit exists.",
  },
  {
    id: "sky.moon.opposition.jupiter",
    before:
      "The Moon gives the daily need a voice, while Jupiter holds the larger promise and the belief that more help can solve it.",
    after:
      "The Moon keeps daily shortages from disappearing beneath the headline total, while Jupiter defends the larger promise that more help can solve them.",
  },
  {
    id: "sky.moon.conjunction.jupiter",
    before:
      "The Moon makes the need emotionally immediate, while Jupiter amplifies its reach and the scale of everyone's reaction.",
    after:
      "The Moon pulls the private need into public view, while Jupiter magnifies its reach and the scale of everyone's reaction.",
  },
  {
    id: "sky.moon.sextile.saturn",
    before:
      "The Moon keeps the human need in view, while Saturn gives the help a duration, owner, and stopping point.",
    after:
      "The Moon keeps the person inside the plan, while Saturn gives the help a duration, owner, and stopping point.",
  },
  {
    id: "sky.moon.trine.saturn",
    before:
      "The Moon keeps care responsive to the person receiving it, while Saturn gives the responsibility a structure that can survive a difficult week.",
    after:
      "The Moon keeps the person receiving care from disappearing into the schedule, while Saturn builds a structure that can survive a difficult week.",
  },
  {
    id: "sky.moon.square.saturn",
    before:
      "The square keeps human need pressing against a structure designed to ignore individual circumstances.",
    after:
      "Under the tension of the square, a human emergency stays pinned against a structure designed to ignore individual circumstances.",
  },
  {
    id: "sky.moon.opposition.saturn",
    before:
      "The Moon gives the private need and emotional cost a voice, while Saturn upholds the structure meant to contain exceptions.",
    after:
      "The Moon makes the private need and emotional cost impossible to sanitize, while Saturn defends the structure meant to contain exceptions.",
  },
  {
    id: "sky.moon.sextile.uranus",
    before:
      "A small change in routine gives a household or team room it did not know it had.",
    after:
      "A small change in routine gives a household or team breathing room it did not know it had.",
  },
  {
    id: "sky.moon.trine.uranus",
    before:
      "The Moon measures the change by how it affects comfort and routine, while Uranus replaces the assumption that the old way was the only workable option.",
    after:
      "The Moon judges the change by whether daily life gets easier, while Uranus replaces the assumption that the old way was the only workable option.",
  },
  {
    id: "sky.moon.sextile.neptune",
    before:
      "The Moon recognizes the need for comfort, while Neptune picks up the grief, fear, or exhaustion that has not been explained clearly.",
    after:
      "The Moon notices the need for comfort, while Neptune catches the grief, fear, or exhaustion that has not been explained clearly.",
  },
  {
    id: "sky.moon.square.neptune",
    before:
      "The Moon keeps returning to food, rest, housing, care, and safety, while Neptune lets sympathy spread without a clear boundary or plan.",
    after:
      "The Moon keeps pointing back to food, rest, housing, care, and safety, while Neptune floods the room with sympathy that has no clear boundary or plan.",
  },
  {
    id: "sky.moon.opposition.neptune",
    before:
      "The Moon holds the private reality, while Neptune carries the idealized version across a much larger audience.",
    after:
      "The Moon keeps the private reality on the record, while Neptune broadcasts the idealized version to a much larger audience.",
  },
  {
    id: "sky.moon.sextile.pluto",
    before:
      "The Moon brings the emotional history forward, while Pluto reveals who has controlled the information and the terms.",
    after:
      "The Moon pulls the emotional history into the open, while Pluto exposes who has controlled the information and the terms.",
  },
  {
    id: "sky.moon.opposition.pluto",
    before:
      "The Moon gives vulnerability a voice, while Pluto reveals the leverage determining whose feelings can alter the outcome.",
    after:
      "The Moon makes vulnerability impossible to dismiss, while Pluto exposes the leverage determining whose feelings can alter the outcome.",
  },
  {
    id: "sky.moon.conjunction.pluto",
    before:
      "The Moon brings the buried emotional record forward, while Pluto exposes how silence and control shaped the conflict.",
    after:
      "The Moon drags the buried emotional record into the room, while Pluto exposes how silence and control shaped the conflict.",
  },
  {
    id: "sky.mercury.square.saturn",
    before:
      "A promised answer arrives late and covers far less than expected. The email approves one request, denies another, and sends everything else back for more documents and signatures. Mercury keeps the thread moving as questions, revisions, and new voices pile up, while Saturn limits the response to the help someone is willing to authorize in writing. Under the square, every unanswered question becomes another reason to hold the decision back. The final answer may satisfy the policy, but the people who planned around the original promise are left covering the difference.",
    after:
      "A promised answer arrives late and covers far less than what was originally discussed. The email approves one small request, denies another, and sends everything else back for more documentation, signatures, and formal sign-offs. Mercury keeps the digital crossfire buzzing, with questions, revisions, and new voices piling up by the hour, while Saturn limits the response to the absolute minimum someone is willing to put in writing. Under the tension of the square, every unanswered question becomes another reason to hold the decision back. The final answer may satisfy official policy, but the people who planned their lives around the original promise are left absorbing the fallout.",
  },
  {
    id: "sky.mercury.opposition.pluto",
    before:
      "The opposition puts inquiry directly across from the power to deny an answer.",
    after:
      "The opposition forces the questions to face the office with the power to bury the answer.",
  },
  {
    id: "sky.venus.conjunction.mars",
    before:
      "The spark may open a real opportunity, but it does not answer whether the people involved value the same outcome after the first move is made.",
    after:
      "The spark may open a serious opportunity, but it does not answer whether both sides still want the same outcome after the first move is made.",
  },
  {
    id: "sky.venus.opposition.saturn",
    before:
      "The outcome may comply with every rule while leaving the person who carried the burden feeling sidelined and unappreciated.",
    after:
      "The outcome may comply with every rule while leaving the person who carried the burden shut out of the money, credit, or flexibility they asked for.",
  },
  {
    id: "sky.mars.sextile.jupiter",
    before:
      "The visibility can open real doors, along with public expectations the original team may have to hustle to meet.",
    after:
      "The visibility can open serious doors, along with public expectations the original team may have to scramble to meet.",
  },
  {
    id: "sky.mars.opposition.neptune",
    before:
      "The opposition places practical urgency across from a purpose nobody wants to make ordinary.",
    after:
      "The opposition forces the urgent demand for results to face a purpose nobody wants reduced to a spreadsheet.",
  },
  {
    id: "sky.jupiter.opposition.saturn",
    before:
      "Even when the official numbers are available, people may continue believing the version that feels better.",
    after:
      "Even after the official numbers are released, the easier promise may keep outrunning the version people can verify.",
  },
  {
    id: "sky.saturn.square.neptune",
    before:
      "The decision may be swift, but the people closest to the work are still left cleaning up the fallout and absorbing the loss.",
    after:
      "The shutdown may be swift, but the people closest to the work are still left cleaning up the wreckage and absorbing the loss.",
  },
  {
    id: "sky.uranus.trine.neptune",
    before:
      "A creative use of technology makes a distant human reality feel immediate without turning the people involved into a spectacle.",
    after:
      "A creative use of technology makes a distant human reality feel immediate without turning the people living through it into a spectacle.",
  },
  {
    id: "sky.moon.sextile.pluto",
    before:
      "One disclosure about money, safety, resentment, or an old loyalty gives the group a chance to correct the problem before silence hardens around it again.",
    after:
      "One disclosure about money, safety, resentment, or an old loyalty gives the family a chance to correct the problem before silence hardens around it again.",
  },
  {
    id: "sky.mercury.sextile.venus",
    before:
      "Mercury puts the issue into direct language, while Venus keeps the relationship, value, and desire for a fair exchange in view.",
    after:
      "Mercury puts the issue into direct language, while Venus refuses to let the relationship or value of the exchange disappear beneath polite wording.",
  },
  {
    id: "sky.mercury.opposition.mars",
    before:
      "A decision may be made, but the result shows whether the group acted with enough information or simply ran out of patience.",
    after:
      "A decision may be made, but the result shows whether the team acted with enough information or simply ran out of patience.",
  },
  {
    id: "sky.mercury.square.neptune",
    before:
      "An official correction may arrive later, but the wrong version could already be the one the group remembers.",
    after:
      "An official correction may arrive later, but the wrong version could already be the one everyone remembers.",
  },
  {
    id: "sky.mercury.conjunction.pluto",
    before:
      "The group may finally understand the truth, but the disclosure permanently changes who is allowed access from this point forward.",
    after:
      "The people making the decision may finally understand the truth, but the disclosure permanently changes who is allowed access from this point forward.",
  },
  {
    id: "sky.venus.trine.jupiter",
    before:
      "Venus keeps pleasure and fairness in the exchange, while Jupiter increases the generosity and number of people involved.",
    after:
      "Venus keeps pleasure and fairness in the exchange, while Jupiter increases the generosity and the number of people who benefit.",
  },
  {
    id: "sky.venus.opposition.saturn",
    before:
      "The opposition keeps care and structural limits in full view at the exact same time.",
    after:
      "The opposition forces the request for care to face a structural limit with more authority than compassion.",
  },
  {
    id: "sky.venus.conjunction.uranus",
    before:
      "Venus keeps value and mutual regard in view, while Uranus refuses to preserve an agreement that no longer leaves enough room.",
    after:
      "Venus protects the value and mutual regard inside the exchange, while Uranus refuses to preserve an agreement that no longer leaves enough room.",
  },
  {
    id: "sky.venus.sextile.pluto",
    before:
      "One disclosure about ownership, hidden fees, unequal credit, or private leverage gives the group a chance to correct the agreement before it becomes final.",
    after:
      "One disclosure about ownership, hidden fees, unequal credit, or private leverage gives the people negotiating a chance to correct the agreement before it becomes final.",
  },
  {
    id: "sky.mars.opposition.jupiter",
    before:
      "The plan may move forward, but everyone can see whether caution was answered or merely overruled.",
    after:
      "The expansion may proceed, but everyone can see whether caution was answered or merely overruled.",
  },
  {
    id: "sky.mars.opposition.uranus",
    before:
      "The person demanding an immediate break faces the group trying to keep a volatile system from collapsing.",
    after:
      "The person demanding an immediate break faces the operators trying to keep a volatile system from collapsing.",
  },
  {
    id: "sky.saturn.sextile.pluto",
    before:
      "Saturn holds the institution and its responsibilities in view, while Pluto exposes where control has been concentrated and protected.",
    after:
      "Saturn keeps the institution and its responsibilities on the table, while Pluto exposes where control has been concentrated and protected.",
  },
];

const results = [];

for (const refinement of refinements) {
  const occurrences = source.split(refinement.before).length - 1;
  const refinedOccurrences = source.split(refinement.after).length - 1;
  if (occurrences === 1) {
    source = source.replace(refinement.before, refinement.after);
    results.push({ ...refinement, occurrences, status: "applied" });
  } else if (occurrences === 0 && refinedOccurrences === 1) {
    results.push({ ...refinement, occurrences, status: "already-applied" });
  } else {
    throw new Error(
      `${refinement.id}: expected one source or refined occurrence, found source=${occurrences}, refined=${refinedOccurrences}: ${refinement.before}`,
    );
  }
}

fs.writeFileSync(sourcePath, source);

const audit = {
  id: "tldr-astro.sky-aspect.v10-word-choice-audit",
  sourcePath,
  benchmark: "Mercury in Gemini square Saturn in Pisces user revision",
  method:
    "Targeted phrase-level refinement. Existing events and five-sentence packet structure were preserved.",
  lockedRecordsChanged: 0,
  totalRefinements: results.length,
  refinements: results,
};

fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      sourcePath,
      auditPath,
      totalRefinements: results.length,
    },
    null,
    2,
  ),
);
