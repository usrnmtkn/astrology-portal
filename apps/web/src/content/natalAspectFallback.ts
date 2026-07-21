import { isReaderFacingCopy } from "./readerSafety";

export type MoonSign =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

export type NatalAspectFallbackAspect = {
  from: string;
  to: string;
  type: string;
};

export type MoonSignResource = {
  sign: MoonSign;
  emotional_process: string;
  core_need: string;
  comfort_conditions: string[];
  care_given: string[];
  care_recognized: string[];
  stress_responses: string[];
  caregiver_imprints: string[];
  lived_expressions: string[];
  constructive_range: string[];
  difficult_range: string[];
  avoid_claiming: string[];
  approved_language: string[];
};

export type NatalAspectFallbackPointModel = {
  need: string;
  ability: string;
  behavior: string;
  pressureResponse: string;
  trigger: string;
  concern: string;
  position: string;
  consequence: string;
  opportunity: string;
  misread: string;
  truth: string;
};

export type NatalAspectFallbackResult = {
  body: string;
  sourceKeys: string[];
  derivation: {
    moonRecord?: string;
    pointRecords: string[];
    aspectOperator: string;
    pairOverride?: string;
  };
};

type AuthoredNatalAspectCopyRecord = {
  key: string;
  copy: string;
};

const authoredNatalAspectCopyRecords: Record<string, AuthoredNatalAspectCopyRecord> = {
  "natal.neptune.square.north_node": {
    key: "natal.neptune.square.north_node",
    copy: "Your Neptune square North Node can make you fall in love with the idea of things. When a new relationship, creative project, or career move is still in the dream stage, it can feel perfect, inspiring, and full of infinite potential. Because it is still an idea, you may not yet have to deal with the boring, difficult work it takes to maintain it."
  }
};

export const moonBaseRecord = {
  id: "aspect-fallback.point.moon",
  function: "Emotional needs, comfort, care, memory, and automatic reactions.",
  underPressure: "Returning to familiar emotional responses before conscious thought catches up.",
  observableTerritory: [
    "admitting a need",
    "seeking comfort",
    "reacting to tone",
    "remembering how an interaction felt",
    "withdrawing",
    "reaching for familiar support"
  ],
  avoidReducingTo: ["emotions, instincts, and safety"]
};

export const blackMoonLilithRecord = {
  id: "aspect-fallback.point.black-moon-lilith.mean-lunar-apogee",
  point: "Black Moon Lilith",
  calculationIdentity: "mean lunar apogee",
  function: "The parts of the self a person may have learned were unacceptable, excessive, inconvenient, or unsafe to reveal.",
  coreNeed: "Autonomy and the right to exist without becoming easier for other people to manage or accept.",
  underPressure: "Defiance, withdrawal, guardedness, anger about being controlled, or refusing a need before another person can use it as leverage.",
  constructiveRange: "Recognizing justified anger, protecting personal autonomy, and refusing roles that require self-erasure.",
  avoidReducingTo: [
    "sexuality",
    "darkness",
    "rebellion",
    "femininity",
    "temptation",
    "shadow work",
    "what needs attention"
  ],
  avoidClaiming: [
    "specific childhood event",
    "rejection",
    "abuse",
    "abandonment",
    "sexual history",
    "maternal conflict",
    "trauma"
  ]
};

export const moonSignResources: Record<MoonSign, MoonSignResource> = {
  Aries: {
    sign: "Aries",
    emotional_process: "Feelings arrive quickly and often become clear through an immediate reaction, decision, confrontation, or need to move.",
    core_need: "The freedom to respond honestly and do something about what is happening.",
    comfort_conditions: ["room to move without being followed or managed", "direct answers", "a clear decision", "physical activity", "a problem that can be acted on"],
    care_given: ["stepping in quickly", "defending someone", "handling an immediate problem", "encouraging another person to act", "telling the truth without circling the point"],
    care_recognized: ["being taken seriously", "receiving a direct response", "having room to make an independent choice", "knowing someone will show up when action is required"],
    stress_responses: ["reacting before deciding what to say", "becoming impatient with slow explanations", "leaving the room to cool down", "turning hurt into anger", "pushing for an answer before everyone is ready"],
    caregiver_imprints: ["If care was inconsistent or adults reacted strongly, you may have learned to act before anyone else could decide what happened next.", "If anger was the only feeling taken seriously, you may have learned to express fear or hurt as frustration."],
    lived_expressions: ["needing a walk before continuing the conversation", "wanting the short answer first", "defending someone before hearing the whole story", "feeling better once a decision has been made"],
    constructive_range: ["emotional courage", "quick protective instincts", "direct self-advocacy", "decisiveness under pressure"],
    difficult_range: ["impatience", "unnecessary escalation", "mistaking urgency for clarity", "treating vulnerability like a loss of control"],
    avoid_claiming: ["that every Aries Moon is aggressive", "that anger is the only emotion present", "that conflict is inevitable"],
    approved_language: []
  },
  Taurus: {
    sign: "Taurus",
    emotional_process: "Feelings take time to register and are often processed through the body, familiar routines, and a return to what feels dependable.",
    core_need: "Consistency, physical ease, and enough time to respond without being rushed.",
    comfort_conditions: ["familiar surroundings", "good food and adequate rest", "predictable plans", "physical affection when welcome", "financial and practical steadiness"],
    care_given: ["showing up consistently", "remembering practical needs", "making food or creating comfort", "helping someone maintain what matters", "staying when a situation becomes inconvenient"],
    care_recognized: ["follow-through", "reliable contact", "time together without pressure", "practical help", "affection that remains consistent after the emotional moment passes"],
    stress_responses: ["becoming quiet", "resisting sudden changes", "holding on after a situation has stopped working", "eating, sleeping, spending, or withdrawing for comfort", "refusing to respond while feeling pressured"],
    caregiver_imprints: ["If the environment changed without warning, you may have learned to rely on routines, possessions, or familiar comforts because they were easier to trust than people's moods.", "If your pace was frequently rushed, you may now resist anyone who expects an immediate emotional answer."],
    lived_expressions: ["needing to eat or sleep before discussing the problem", "returning to the same chair, meal, song, or routine after a difficult day", "trusting repeated behavior more than a dramatic apology", "needing advance notice when plans change"],
    constructive_range: ["patience", "loyalty", "emotional endurance", "the ability to create calm through practical care"],
    difficult_range: ["emotional stagnation", "stubbornness", "staying because change feels worse than dissatisfaction", "treating familiarity as proof that something is good"],
    avoid_claiming: ["that Taurus Moon is lazy", "that material comfort is shallow", "that resistance to change means an inability to grow"],
    approved_language: []
  },
  Gemini: {
    sign: "Gemini",
    emotional_process: "A feeling becomes easier to understand after it has been named, discussed, questioned, or considered from more than one angle.",
    core_need: "Conversation, information, stimulation, and enough movement to keep the emotional atmosphere from becoming stagnant.",
    comfort_conditions: ["someone willing to talk", "a change of scenery", "a new show, book, exhibit, or idea", "humor", "permission to revise an earlier response"],
    care_given: ["asking another question", "sharing useful information", "sending an article, song, or recommendation", "keeping someone company through conversation", "helping another person see additional possibilities"],
    care_recognized: ["being listened to without having to tell the story in order", "receiving an engaged response", "having someone remember the conversation and continue it later", "being invited somewhere new"],
    stress_responses: ["talking around a feeling", "collecting details before admitting what hurts", "becoming mentally restless", "changing the subject", "joking through discomfort", "explaining when listening is required"],
    caregiver_imprints: ["If the people around you said plenty but their moods changed without warning, you may have learned to ask another question, listen closely, and remember every word.", "If feelings were easier to discuss than experience, you may have learned to explain your emotions before letting yourself feel them."],
    lived_expressions: ["starting one story and finishing another", "feeling better after a long conversation", "changing plans without treating the day as ruined", "needing something new to look forward to", "having an answer ready before admitting you are sad"],
    constructive_range: ["emotional articulation", "adaptability", "curiosity about other people", "the ability to find language for complicated reactions"],
    difficult_range: ["distraction", "nervous overactivity", "explaining instead of feeling", "saying more after the point has already been lost"],
    avoid_claiming: ["that every Gemini Moon is emotionally shallow", "that adaptability means a lack of loyalty", "that humor always indicates avoidance"],
    approved_language: []
  },
  Cancer: {
    sign: "Cancer",
    emotional_process: "Feelings are absorbed through tone, memory, atmosphere, and the sense of whether a person or place feels familiar enough to trust.",
    core_need: "Emotional continuity, privacy, and care that responds to what is happening beneath the words.",
    comfort_conditions: ["familiar people", "privacy", "food and domestic comfort", "time at home", "permission to retreat and return later", "someone remembering what mattered before"],
    care_given: ["noticing changes in mood", "feeding or checking on someone", "remembering personal details", "protecting private information", "creating a place where another person can recover"],
    care_recognized: ["being remembered", "receiving contact without having to ask", "knowing someone noticed the change in mood", "being welcomed back after withdrawing", "care that continues after the crisis ends"],
    stress_responses: ["retreating", "becoming guarded", "taking a change in tone personally", "returning to an old hurt", "caring for everyone else while avoiding a direct request", "expecting someone to notice what has not been said"],
    caregiver_imprints: ["If you had to monitor the emotional atmosphere at home, you may have learned to notice small changes in tone before anyone explained what was wrong.", "If care was offered through guilt or obligation, asking directly for comfort may now feel risky."],
    lived_expressions: ["remembering exactly how an old conversation felt", "checking whether someone arrived home safely", "needing time alone before explaining a reaction", "feeling hurt when a meaningful detail is forgotten"],
    constructive_range: ["emotional memory", "loyalty", "protective care", "sensitivity to needs that have not yet been spoken"],
    difficult_range: ["withdrawal", "indirect requests", "carrying old pain into a current interaction", "treating familiarity as a reason to tolerate harmful behavior"],
    avoid_claiming: ["that Cancer Moon is inherently maternal", "that sensitivity means weakness", "that every reaction comes from the mother"],
    approved_language: []
  },
  Leo: {
    sign: "Leo",
    emotional_process: "Feelings become clear through recognition. Being noticed, appreciated, included, or overlooked carries real emotional weight.",
    core_need: "Open affection and clear evidence that their presence matters.",
    comfort_conditions: ["sincere praise", "celebration", "creative expression", "laughter", "affectionate attention", "being welcomed with visible enthusiasm"],
    care_given: ["making a fuss over good news", "celebrating milestones", "offering loyal encouragement", "defending the people they love", "making someone feel important in the room"],
    care_recognized: ["being openly appreciated", "hearing that someone is proud of them", "having another person remember the meaningful occasion", "receiving attention that is specific rather than automatic", "knowing someone is genuinely glad to see them"],
    stress_responses: ["becoming proud and quiet", "giving shorter answers", "waiting for the other person to reach out", "reacting strongly to being dismissed or taken for granted", "making hurt visible without naming it directly"],
    caregiver_imprints: ["If attention came in big moments or not at all, you may have learned that being noticed meant being loved.", "If praise had to be earned through achievement or entertainment, you may now question whether people value you when you are having an ordinary day."],
    lived_expressions: ["remembering who made a fuss over the good news and who barely looked up", "planning the celebration no one else thought to arrange", "becoming quiet after a joke lands at their expense", "waiting for an apology because reaching out first feels like admitting the hurt did not matter"],
    constructive_range: ["generous affection", "loyalty", "emotional warmth", "the ability to make others feel seen and celebrated"],
    difficult_range: ["pride", "withholding affection after feeling overlooked", "relying on attention as proof of love", "interpreting a distracted response as a personal rejection"],
    avoid_claiming: ["that every Leo Moon demands constant attention", "that visible affection is insincere", "that pride always becomes arrogance"],
    approved_language: []
  },
  Virgo: {
    sign: "Virgo",
    emotional_process: "Feelings are often processed by identifying what happened, what needs care, and what can be repaired, organized, or made more manageable.",
    core_need: "Clarity, usefulness, and an environment that is calm enough to think in.",
    comfort_conditions: ["a manageable routine", "clean or orderly surroundings", "practical information", "time to prepare", "a specific task", "knowing what is expected"],
    care_given: ["remembering the detail that makes someone's day easier", "solving a practical problem", "checking the plan", "helping without making a performance of it", "noticing what has been neglected"],
    care_recognized: ["reliable help", "attention to detail", "respect for their time and effort", "someone doing what they said they would do", "appreciation that names the actual contribution"],
    stress_responses: ["focusing on errors", "overpreparing", "criticizing themselves or someone else", "staying busy to avoid emotional uncertainty", "trying to fix a feeling that first needs to be acknowledged"],
    caregiver_imprints: ["If approval depended on being useful, careful, or easy to manage, you may have learned to offer help before admitting that you need it.", "If mistakes brought criticism, preparation may now feel emotionally necessary rather than merely practical."],
    lived_expressions: ["rewriting the list after a difficult conversation", "noticing what is missing before recognizing what went well", "showing care by handling the errand no one wanted", "calming down once there is a workable plan"],
    constructive_range: ["discernment", "practical care", "emotional accountability", "the ability to make an overwhelming problem manageable"],
    difficult_range: ["chronic self-correction", "worry", "criticism", "equating usefulness with worth", "treating uncertainty like an error to solve"],
    avoid_claiming: ["that Virgo Moon is unemotional", "that orderliness is always compulsive", "that criticism is the only way this Moon communicates concern"],
    approved_language: []
  },
  Libra: {
    sign: "Libra",
    emotional_process: "Feelings often become clearer through conversation, comparison, and understanding how the situation appears from more than one person's position.",
    core_need: "Mutual consideration, respectful communication, and evidence that the relationship matters to everyone involved.",
    comfort_conditions: ["a calm conversation", "a pleasant environment", "companionship", "fair treatment", "time to consider different perspectives", "repair after conflict"],
    care_given: ["making room for another person's preferences", "smoothing a difficult interaction", "including people", "offering thoughtful companionship", "helping two people understand each other"],
    care_recognized: ["being consulted", "receiving consideration without having to demand it", "shared decision-making", "an effort to repair tension", "someone caring about the effect their behavior had"],
    stress_responses: ["delaying a decision", "minimizing anger", "agreeing before checking what they want", "becoming preoccupied with whether the response was fair", "trying to restore peace before the actual problem has been addressed"],
    caregiver_imprints: ["If keeping the peace made the environment safer, you may have learned to monitor everyone else's reaction before naming your own.", "If affection disappeared during conflict, disagreement may now feel more threatening than the subject itself."],
    lived_expressions: ["rewriting a message so it cannot be misunderstood as rude", "asking what everyone else wants before answering", "feeling unsettled until tension has been acknowledged", "remembering whether a decision was genuinely mutual"],
    constructive_range: ["diplomacy", "emotional reciprocity", "fairness", "the ability to understand competing perspectives"],
    difficult_range: ["indecision", "suppressed resentment", "conflict avoidance", "relying on another person's response to determine what is acceptable to feel"],
    avoid_claiming: ["that Libra Moon is always agreeable", "that compromise is inherently healthy", "that every relationship concern is romantic"],
    approved_language: []
  },
  Scorpio: {
    sign: "Scorpio",
    emotional_process: "Feelings are processed privately and intensely. Trust is built by seeing whether another person can handle what is true without using it as leverage later.",
    core_need: "Emotional honesty, privacy, loyalty, and control over when vulnerability is revealed.",
    comfort_conditions: ["confidentiality", "uninterrupted time alone", "a direct answer", "relationships that can survive difficult truths", "knowing where another person actually stands"],
    care_given: ["protecting confidences", "remaining present during a crisis", "noticing what someone is avoiding", "offering fierce loyalty", "confronting a problem others would rather ignore"],
    care_recognized: ["honesty", "discretion", "consistency under pressure", "someone staying after the difficult part is revealed", "freedom from manipulation or forced disclosure"],
    stress_responses: ["withdrawing", "watching before responding", "testing whether someone is trustworthy", "holding on to evidence of betrayal", "becoming controlling when exposed", "saying nothing until the feeling becomes impossible to contain"],
    caregiver_imprints: ["If private information was used against you, you may have learned to reveal only what you could afford to lose.", "If adults denied obvious tension, you may have learned to trust what you sensed more than what you were told."],
    lived_expressions: ["remembering the exact moment trust changed", "noticing the question someone avoided answering", "needing privacy before discussing what happened", "staying calm during a crisis and reacting after everyone else has gone home"],
    constructive_range: ["emotional courage", "loyalty", "discernment about trust", "the ability to remain present with grief, anger, and complicated truths"],
    difficult_range: ["suspicion", "secrecy", "emotional testing", "control", "treating every uncertainty as evidence that something is being hidden"],
    avoid_claiming: ["that Scorpio Moon is inherently manipulative", "that intensity proves trauma", "that secrecy always indicates deception"],
    approved_language: []
  },
  Sagittarius: {
    sign: "Sagittarius",
    emotional_process: "Feelings become easier to carry when they can be placed inside a larger story, understood honestly, or given somewhere new to go.",
    core_need: "Freedom, candor, perspective, and a future that still contains possibility.",
    comfort_conditions: ["open space", "movement or travel", "laughter", "direct conversation", "learning", "a plan that creates something to anticipate"],
    care_given: ["offering perspective", "reminding someone that the current problem is not the whole future", "inviting another person out of the house", "telling the truth directly", "sharing knowledge, humor, or an experience"],
    care_recognized: ["being trusted", "having room to make independent choices", "honest answers", "being invited into someone's plans", "knowing the relationship can tolerate change"],
    stress_responses: ["leaving before the conversation is finished", "making a joke too early", "turning pain into a lesson before it has been felt", "promising more than can be sustained", "becoming impatient with emotional repetition"],
    caregiver_imprints: ["If freedom was limited or the emotional atmosphere felt heavy, you may have learned to look toward the next opportunity before dealing with what was happening where you were.", "If honesty was valued more than tact, you may now underestimate how sharply the truth can land."],
    lived_expressions: ["needing to get out of the house after a difficult day", "feeling better once there is a trip, class, or new plan ahead", "telling the truth and only later realizing it needed more care", "becoming restless when the same argument repeats without movement"],
    constructive_range: ["hope", "candor", "resilience", "emotional perspective", "the ability to help others imagine a life beyond the current problem"],
    difficult_range: ["avoidance through movement", "premature optimism", "bluntness", "treating emotional limits like restrictions on freedom"],
    avoid_claiming: ["that Sagittarius Moon cannot commit", "that optimism means a lack of depth", "that every desire for movement is avoidance"],
    approved_language: []
  },
  Capricorn: {
    sign: "Capricorn",
    emotional_process: "Feelings are often managed by assessing what must be handled, what can wait, and whether it is safe to stop being responsible.",
    core_need: "Reliability, respect, competence, and permission to have needs without losing control of the situation.",
    comfort_conditions: ["a clear plan", "privacy", "financial or practical stability", "dependable people", "time to regain composure", "knowing responsibilities are covered"],
    care_given: ["taking responsibility", "planning ahead", "providing practical support", "remaining dependable during difficult periods", "helping another person build something that lasts"],
    care_recognized: ["follow-through", "respect", "practical commitment", "another person carrying their share", "support that does not create an additional responsibility"],
    stress_responses: ["becoming controlled or formal", "working harder", "postponing an emotional response", "refusing help", "becoming resentful when others remain dependent", "treating vulnerability like a problem that must be contained"],
    caregiver_imprints: ["If you had to be capable early, you may have learned to handle the problem before checking how it affected you.", "If adults respected achievement more than need, being useful may now feel safer than being comforted."],
    lived_expressions: ["handling every practical detail and falling apart after the deadline", "trusting the person who arrives on time and remembers what they promised", "feeling irritated when help requires supervision", "needing privacy before admitting how hard the situation has been"],
    constructive_range: ["emotional endurance", "responsibility", "measured judgment", "the ability to remain dependable without creating drama around the effort"],
    difficult_range: ["emotional withholding", "overfunctioning", "pessimism", "equating need with weakness", "carrying more than is sustainable and resenting that no one intervened"],
    avoid_claiming: ["that Capricorn Moon is cold", "that emotional control means an absence of feeling", "that responsibility always reflects maturity rather than conditioning"],
    approved_language: []
  },
  Aquarius: {
    sign: "Aquarius",
    emotional_process: "Feelings are often understood by stepping back, observing the pattern, and deciding what the experience means before responding personally.",
    core_need: "Space, intellectual honesty, autonomy, and relationships that allow difference without punishment.",
    comfort_conditions: ["time alone", "friendship", "a wider perspective", "people who do not demand an immediate emotional performance", "involvement in an idea, community, or cause", "freedom to respond differently from the group"],
    care_given: ["offering perspective", "respecting another person's independence", "showing up as a friend", "connecting someone with useful people or information", "making room for what others consider unusual"],
    care_recognized: ["being accepted without having to conform", "having space without the relationship being withdrawn", "thoughtful conversation", "loyalty that does not become possession", "knowing another person respects their principles"],
    stress_responses: ["detaching", "analyzing instead of responding", "becoming stubborn about independence", "disappearing into a group, project, or idea", "treating emotional demands as attempts at control"],
    caregiver_imprints: ["If you felt different from the people around you, you may have learned to become the observer before allowing yourself to become emotionally involved.", "If closeness came with pressure to conform, distance may now feel safer than explaining what makes you different."],
    lived_expressions: ["needing several hours alone before knowing what to say", "showing care by solving a problem or sending useful information", "remaining loyal while resisting constant contact", "feeling closer to someone who allows disagreement without making it personal"],
    constructive_range: ["emotional objectivity", "acceptance of difference", "friendship", "principled loyalty", "the ability to see beyond immediate reactions"],
    difficult_range: ["detachment", "emotional absence", "reflexive opposition", "confusing distance with freedom", "explaining the pattern while avoiding the personal impact"],
    avoid_claiming: ["that Aquarius Moon has no feelings", "that independence means a lack of attachment", "that unconventional behavior is automatically healthier"],
    approved_language: []
  },
  Pisces: {
    sign: "Pisces",
    emotional_process: "Feelings can arrive through atmosphere, imagination, other people's moods, memory, art, or bodily sensitivity before the person knows exactly what belongs to them.",
    core_need: "Rest, emotional permeability with workable limits, imagination, compassion, and time away from excessive demands.",
    comfort_conditions: ["sleep", "music, film, or art", "water", "solitude", "gentle company", "spiritual or imaginative practices", "time without a task attached"],
    care_given: ["listening without rushing", "offering compassion", "sensing what another person cannot explain", "making room for grief or uncertainty", "creating beauty, rest, or escape during a difficult period"],
    care_recognized: ["being met without judgment", "having someone notice exhaustion", "receiving care that does not demand an immediate explanation", "being allowed to retreat without being abandoned", "knowing sensitivity will not be mocked or exploited"],
    stress_responses: ["withdrawing", "sleeping or escaping", "absorbing someone else's crisis", "losing track of practical limits", "idealizing the person or situation", "feeling overwhelmed without being able to identify one cause"],
    caregiver_imprints: ["If emotional boundaries were unclear, you may have learned to absorb the atmosphere before asking whether the feeling belonged to you.", "If direct needs were ignored but suffering received care, overwhelm may now feel easier to express than a simple request."],
    lived_expressions: ["needing to be alone after spending time in a tense room", "crying during a film before realizing what has been building all week", "agreeing to help and later discovering there was no energy left", "knowing someone is upset before they say anything"],
    constructive_range: ["compassion", "imagination", "emotional receptivity", "the ability to remain present with experiences that cannot be solved immediately"],
    difficult_range: ["porous boundaries", "avoidance", "idealization", "exhaustion from carrying other people's feelings", "expecting intuition to replace a direct conversation"],
    avoid_claiming: ["that Pisces Moon is psychic", "that sensitivity proves spiritual development", "that sacrifice is the healthiest expression of care"],
    approved_language: []
  }
};

const pointModels: Record<string, NatalAspectFallbackPointModel> = {
  sun: {
    need: "being seen without losing your own center",
    ability: "acting from identity and vitality",
    behavior: "try to hold the center even when the room pulls focus elsewhere",
    pressureResponse: "the self tries to stay visible",
    trigger: "your confidence feels tested",
    concern: "being visible could require more honesty than comfort allows",
    position: "wanting recognition without losing your own shape",
    consequence: "the need to prove yourself starts crowding out aliveness",
    opportunity: "the moment asks someone to lead from the center",
    misread: "that confidence means nothing gets complicated",
    truth: "the self is learning what kind of attention actually strengthens it"
  },
  moon: {
    need: "admitting what you need and feel",
    ability: "responding from emotional truth",
    behavior: "keep your feelings private until the reaction has more force than you expected",
    pressureResponse: "the feeling asks for care before it has words",
    trigger: "you feel ignored, managed, or exposed",
    concern: "needing someone starts to feel like giving them power over you",
    position: "wanting care without having to defend the need for it",
    consequence: "the feeling comes out after it has already been contained too long",
    opportunity: "someone needs an honest emotional read",
    misread: "that your feelings are too much",
    truth: "care, memory, and automatic reactions are trying to protect a real need"
  },
  lilith: {
    need: "autonomy and the right to exist without being made easier to manage",
    ability: "protecting what is raw without apologizing for it",
    behavior: "pull back, sharpen, or go private when something feels too exposed",
    pressureResponse: "the unmanageable part of you refuses access",
    trigger: "someone seems to want access without respect",
    concern: "being vulnerable can start to feel like giving someone leverage",
    position: "refusing care that arrives with control attached",
    consequence: "privacy becomes the only place that feels honest",
    opportunity: "a boundary has to be real instead of merely polite",
    misread: "that refusal is only defiance",
    truth: "a protected truth is asking not to be made smaller"
  },
  mercury: {
    need: "making your thoughts speakable",
    ability: "separating what can be said from what is only noise",
    behavior: "explain, question, joke, or revise the story in real time",
    pressureResponse: "the mind tries to explain its way through the pressure",
    trigger: "the facts feel unfinished",
    concern: "being understood matters more than sounding polished",
    position: "needing language before the moment can settle",
    consequence: "the explanation keeps changing while the feeling is still forming",
    opportunity: "a conversation needs a clean thread",
    misread: "that talking more always makes things clearer",
    truth: "the mind is trying to give shape to something that keeps changing"
  },
  chiron: {
    need: "being careful with an old tender place without letting it run the whole conversation",
    ability: "turning a sore point into language that can actually help",
    behavior: "name the part that hurts in a way someone else can understand",
    pressureResponse: "the sore spot protects itself before the whole story is clear",
    trigger: "a familiar hurt comes up in conversation",
    concern: "being understood could also mean revealing where the wound still lives",
    position: "protecting what still feels tender",
    consequence: "the effort to avoid the sore spot can make the conversation revolve around it anyway",
    opportunity: "a difficult conversation needs honesty without turning pain into proof",
    misread: "that sensitivity means you are too fragile to talk about it",
    truth: "the wound is asking for language precise enough to make repair possible"
  },
  venus: {
    need: "receiving desire and connection without bargaining away your worth",
    ability: "making pleasure and reciprocity easier to share",
    behavior: "soften, charm, withhold, or test whether the exchange feels mutual",
    pressureResponse: "desire checks whether the exchange feels mutual",
    trigger: "wanting something makes you feel exposed",
    concern: "pleasure and approval get tangled together",
    position: "wanting closeness without losing honesty about what you want",
    consequence: "the wish to keep things pleasant hides what you actually want",
    opportunity: "an exchange needs warmth without losing honesty",
    misread: "that wanting ease means avoiding the truth",
    truth: "connection is asking what kind of receiving still lets you keep yourself"
  },
  mars: {
    need: "acting on desire without turning every moment into a fight",
    ability: "moving before momentum disappears",
    behavior: "move fast, push back, or cut through hesitation",
    pressureResponse: "the body wants to act before the story is finished",
    trigger: "waiting starts to feel like being controlled",
    concern: "your will wants proof that it can still act",
    position: "moving directly toward what you want",
    consequence: "speed starts deciding before judgment has caught up",
    opportunity: "a stalled situation needs movement",
    misread: "that force is the only way to stay honest",
    truth: "desire needs a place to move without turning every moment into a fight"
  },
  jupiter: {
    need: "trusting possibility without making the promise larger than the plan",
    ability: "turning hope into a wider path forward",
    behavior: "make the story bigger so the risk feels meaningful",
    pressureResponse: "hope tries to widen the frame",
    trigger: "the situation starts to feel too small",
    concern: "hope wants more room than the moment can easily hold",
    position: "believing there is more available than what is already proven",
    consequence: "the promise grows larger than the plan",
    opportunity: "someone needs faith big enough to move the situation forward",
    misread: "that optimism is the same as certainty",
    truth: "growth needs a believable reason to keep going"
  },
  saturn: {
    need: "holding limits without making permission impossible",
    ability: "making pressure useful instead of vague",
    behavior: "tighten up, delay, or make yourself prove you are allowed to want it",
    pressureResponse: "the standard rises before permission arrives",
    trigger: "the stakes start to feel serious",
    concern: "failure would confirm an old fear about not being ready",
    position: "proving the work before trusting the desire",
    consequence: "the standard becomes so strict that freedom starts to disappear",
    opportunity: "someone needs a plan sturdy enough to hold",
    misread: "that pressure means you should shut down",
    truth: "structure is trying to protect something that still needs permission to grow"
  },
  uranus: {
    need: "protecting freedom before the pattern becomes a trap",
    ability: "changing the angle quickly when something gets too fixed",
    behavior: "swerve, detach, or change the plan before anyone can pin it down",
    pressureResponse: "freedom interrupts the expected script",
    trigger: "the situation starts to feel too fixed",
    concern: "staying available could cost too much independence",
    position: "protecting the right to move differently",
    consequence: "the break creates space and distance at the same time",
    opportunity: "a stuck pattern needs a different angle",
    misread: "that disruption is always the point",
    truth: "freedom is trying to make room where the chart has become too tight"
  },
  neptune: {
    need: "protecting imagination without losing the edge of what is real",
    ability: "sensing what has not become obvious yet",
    behavior: "blur the edge of what you want so the dream can stay intact",
    pressureResponse: "the dream protects itself from blunt reality",
    trigger: "reality feels too blunt",
    concern: "disappointment could collapse something you still need to believe in",
    position: "keeping faith with what cannot be proven yet",
    consequence: "the boundary gets soft enough that the truth becomes harder to locate",
    opportunity: "a situation needs imagination before it can become practical",
    misread: "that vagueness is the same as depth",
    truth: "the dream is trying to survive contact with ordinary limits"
  },
  pluto: {
    need: "meeting power honestly without making control the only protection",
    ability: "staying with what is intense without looking away",
    behavior: "test the situation before letting anyone close",
    pressureResponse: "control moves in before trust can form",
    trigger: "something important feels out of your control",
    concern: "trust could change the power arrangement",
    position: "needing depth before you can believe the surface",
    consequence: "the test becomes more powerful than the intimacy it was meant to protect",
    opportunity: "something hidden has to be dealt with directly",
    misread: "that intensity means danger every time",
    truth: "depth is asking for honesty without making control the only protection"
  },
  "north-node": {
    need: "moving toward the unfamiliar life that asks for practice",
    ability: "trying a newer response before it feels natural",
    behavior: "reach for the new path and then second-guess whether it is real",
    pressureResponse: "growth reaches for the move it has not mastered",
    trigger: "the future asks for a choice you cannot fully prove yet",
    concern: "the old way would be easier but no longer enough",
    position: "moving toward the future before it feels natural",
    consequence: "you retreat to the old pattern and then feel the cost of it",
    opportunity: "a new pattern needs practice instead of theory",
    misread: "that discomfort means you are off track",
    truth: "the new direction has to be repeated before it feels natural"
  },
  "south-node": {
    need: "recognizing the familiar pattern without letting it run the whole life",
    ability: "using an old skill with more choice",
    behavior: "fall back on what has always worked, even when it narrows the moment",
    pressureResponse: "the familiar response takes over",
    trigger: "the new option feels too exposed",
    concern: "the past offers a route that asks less of you",
    position: "trusting what already feels known",
    consequence: "the old route works and still leaves something underdeveloped",
    opportunity: "a familiar pattern needs to be used with more choice",
    misread: "that ease means the pattern is finished",
    truth: "an old skill may still be useful, but it cannot run the whole chart"
  }
};

const genericPointModel = (point: string): NatalAspectFallbackPointModel => ({
  need: `understanding what ${point} is asking for in this contact`,
  ability: `responding to ${point} with more awareness`,
  behavior: "rely on a familiar response before noticing what else the contact has brought up",
  pressureResponse: `${point} tries to protect its own concern`,
  trigger: "the same issue keeps returning in a recognizable way",
  concern: "one chart function starts carrying more pressure than it can hold alone",
  position: `${point} wants to handle the moment its own way`,
  consequence: "the first response solves one part of the situation and leaves the other part unsatisfied",
  opportunity: "a specific situation brings this contact into focus",
  misread: "that this is only a personality trait",
  truth: "two specific parts of the chart are shaping the same lived moment"
});

const aspectOperatorKeys: Record<string, string> = {
  conjunction: "aspect-fallback.operator.conjunction",
  sextile: "aspect-fallback.operator.sextile",
  square: "aspect-fallback.operator.square",
  trine: "aspect-fallback.operator.trine",
  opposition: "aspect-fallback.operator.opposition",
  quincunx: "aspect-fallback.operator.quincunx",
  semisextile: "aspect-fallback.operator.semisextile",
  "semi-sextile": "aspect-fallback.operator.semisextile"
};

export const natalAspectBannedFallbackPatterns = [
  /\blinks\b/i,
  /\bwhat needs attention\b/i,
  /\brecurring friction\b/i,
  /\basks for\b/i,
  /\bname both sides\b/i,
  /\bconcrete response\b/i,
  /\bfind balance\b/i,
  /\binvites you\b/i,
  /\bsupportive flow\b/i,
  /\bclear response\b/i,
  /\b(?:to have|giving [A-Z][A-Za-z ]+) a clear place in the chart\b/i,
  /\btakes over under pressure\b/i,
  /\bon different schedules\b/i,
  /\bto take care of one\b/i,
  /\bhas been neglected\b/i,
  /\bthese needs do not respond to the same solution\b/i,
  /\breason to become visible\b/i,
  /\bother part of the contact pushes back\b/i,
  /\bThey disagree about how you should respond\b/i,
  /\bworking with [A-Z][a-z]+ deliberately\b/i,
  /\bRecognize this as your era\b/i,
  /\bProfound imagination and depth move quietly beneath\b/i,
  /\bgive North Node a clear place in the chart\b/i,
  /\bgiving North Node a clear place in the chart\b/i,
  /\bthe other part of the contact\b/i,
  /\bone part of the contact\b/i,
  /\blean on one response\b/i,
  /\bThe problem is not that either side is wrong\b/i,
  /\bclose enough to read\b/i,
  /\bclearest available frame\b/i
];

export function normalizeNatalAspectFallbackKey(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized === "black-moon-lilith") return "lilith";
  if (normalized === "mean-black-moon-lilith") return "lilith";
  if (normalized === "true-node") return "north-node";
  return normalized;
}

function authoredAspectBodyKey(point: string) {
  const normalized = normalizeNatalAspectFallbackKey(point);

  if (normalized === "north-node") return "north_node";
  if (normalized === "south-node") return "south_node";

  return normalized.replace(/-/g, "_");
}

function canonicalAuthoredAspectCopyRecord(aspect: NatalAspectFallbackAspect) {
  const aspectKey = normalizeNatalAspectFallbackKey(aspect.type);
  const first = authoredAspectBodyKey(aspect.from);
  const second = authoredAspectBodyKey(aspect.to);
  const directKey = `natal.${first}.${aspectKey}.${second}`;
  const reversedKey = `natal.${second}.${aspectKey}.${first}`;

  return authoredNatalAspectCopyRecords[directKey] ?? authoredNatalAspectCopyRecords[reversedKey] ?? null;
}

export function unsafeNatalAspectCopyReason(value: string) {
  const matched = natalAspectBannedFallbackPatterns.find((pattern) => pattern.test(value));

  return matched ? String(matched) : "";
}

export function isSafeNatalAspectFallbackCopy(value: string) {
  return Boolean(value.trim()) && !unsafeNatalAspectCopyReason(value) && isReaderFacingCopy(value);
}

function modelFor(point: string) {
  const key = normalizeNatalAspectFallbackKey(point);

  return pointModels[key] ?? genericPointModel(point);
}

function aspectText(aspectType: string) {
  switch (normalizeNatalAspectFallbackKey(aspectType)) {
    case "conjunction":
      return "conjunct";
    case "opposition":
      return "opposite";
    default:
      return aspectType.trim().toLowerCase();
  }
}

function isMoonSquareBlackMoonLilith(aspect: NatalAspectFallbackAspect) {
  const from = normalizeNatalAspectFallbackKey(aspect.from);
  const to = normalizeNatalAspectFallbackKey(aspect.to);

  return normalizeNatalAspectFallbackKey(aspect.type) === "square"
    && ((from === "moon" && to === "lilith") || (from === "lilith" && to === "moon"));
}

function isAspectPair(aspect: NatalAspectFallbackAspect, aspectType: string, firstPoint: string, secondPoint: string) {
  const from = normalizeNatalAspectFallbackKey(aspect.from);
  const to = normalizeNatalAspectFallbackKey(aspect.to);

  return normalizeNatalAspectFallbackKey(aspect.type) === aspectType
    && ((from === firstPoint && to === secondPoint) || (from === secondPoint && to === firstPoint));
}

export function natalAspectFallbackDerivationKeys(aspect: NatalAspectFallbackAspect) {
  const firstKey = normalizeNatalAspectFallbackKey(aspect.from);
  const secondKey = normalizeNatalAspectFallbackKey(aspect.to);
  const operatorKey = aspectOperatorKeys[normalizeNatalAspectFallbackKey(aspect.type)] ?? "aspect-fallback.operator.generic";

  return [
    `aspect-fallback.point.${firstKey}`,
    operatorKey,
    `aspect-fallback.point.${secondKey}`
  ];
}

export function resolveNatalAspectFallback(aspect: NatalAspectFallbackAspect): NatalAspectFallbackResult | null {
  const operatorKey = aspectOperatorKeys[normalizeNatalAspectFallbackKey(aspect.type)] ?? "aspect-fallback.operator.generic";
  const authoredRecord = canonicalAuthoredAspectCopyRecord(aspect);

  if (authoredRecord) {
    return {
      body: authoredRecord.copy,
      sourceKeys: [authoredRecord.key],
      derivation: {
        pointRecords: [
          `aspect-fallback.point.${normalizeNatalAspectFallbackKey(aspect.from)}`,
          `aspect-fallback.point.${normalizeNatalAspectFallbackKey(aspect.to)}`
        ],
        aspectOperator: operatorKey,
        pairOverride: authoredRecord.key
      }
    };
  }

  if (isMoonSquareBlackMoonLilith(aspect)) {
    const body = "Your Moon square Lilith can make asking for help feel like handing someone the power to use it against you later. You may keep a feeling private, insist you can handle it alone, and then react strongly when someone ignores your needs or decides what is best for you. Part of you wants to be cared for. A bigger, stubborn part would rather sit out in the cold than accept a blanket with strings attached.";

    return {
      body,
      sourceKeys: [moonBaseRecord.id, operatorKey, blackMoonLilithRecord.id, "aspect-fallback.pair.moon-square-black-moon-lilith"],
      derivation: {
        moonRecord: moonBaseRecord.id,
        pointRecords: [moonBaseRecord.id, blackMoonLilithRecord.id],
        aspectOperator: operatorKey,
        pairOverride: "aspect-fallback.pair.moon-square-black-moon-lilith"
      }
    };
  }

  if (isAspectPair(aspect, "quincunx", "sun", "jupiter")) {
    const body = "Your Sun quincunx Jupiter can make it hard to tell whether a bigger opportunity actually belongs in your life. You may say yes because the offer sounds exciting or proves that people believe in you, then discover that the time, visibility, or responsibility does not fit how you want to live. You keep reaching for more, even when the promise was easier to make than it is to live with.";

    return {
      body,
      sourceKeys: ["aspect-fallback.point.sun", operatorKey, "aspect-fallback.point.jupiter", "aspect-fallback.pair.sun-quincunx-jupiter"],
      derivation: {
        pointRecords: ["aspect-fallback.point.sun", "aspect-fallback.point.jupiter"],
        aspectOperator: operatorKey,
        pairOverride: "aspect-fallback.pair.sun-quincunx-jupiter"
      }
    };
  }

  if (isAspectPair(aspect, "quincunx", "venus", "lilith")) {
    const body = "Your Venus quincunx Lilith can make affection feel easy to receive until you notice the rules attached to it. You may enjoy the attention, smooth over a difference, or agree to more than you want, then pull back when the connection starts to depend on your cooperation. You want the affection. You also want to know it will survive the moment you stop being agreeable.";

    return {
      body,
      sourceKeys: ["aspect-fallback.point.venus", operatorKey, blackMoonLilithRecord.id, "aspect-fallback.pair.venus-quincunx-black-moon-lilith"],
      derivation: {
        pointRecords: ["aspect-fallback.point.venus", blackMoonLilithRecord.id],
        aspectOperator: operatorKey,
        pairOverride: "aspect-fallback.pair.venus-quincunx-black-moon-lilith"
      }
    };
  }

  if (isAspectPair(aspect, "sextile", "mercury", "chiron")) {
    const body = "Your Mercury sextile Chiron can make it easier to say the thing that hurts without turning the whole conversation into a wound. You may find the right question, joke, explanation, or detail at the moment someone needs language for something tender. The gift is not that every pain becomes easy to discuss. It is that your words can make repair feel possible without forcing it.";

    return {
      body,
      sourceKeys: ["aspect-fallback.point.mercury", operatorKey, "aspect-fallback.point.chiron", "aspect-fallback.pair.mercury-sextile-chiron"],
      derivation: {
        pointRecords: ["aspect-fallback.point.mercury", "aspect-fallback.point.chiron"],
        aspectOperator: operatorKey,
        pairOverride: "aspect-fallback.pair.mercury-sextile-chiron"
      }
    };
  }

  const aspectType = normalizeNatalAspectFallbackKey(aspect.type);
  const readableAspect = aspectText(aspect.type);
  const first = modelFor(aspect.from);
  const second = modelFor(aspect.to);
  let body = "";

  switch (aspectType) {
    case "conjunction":
      body = `Your ${aspect.from} ${readableAspect} ${aspect.to} makes ${first.need} difficult to separate from ${second.need}. When ${first.trigger}, you may ${first.behavior}, and that quickly pulls in ${second.concern}. This can give you ${first.ability} through ${second.ability}, though it may be difficult to tell which need is directing you in the moment.`;
      break;
    case "sextile":
      body = `Your ${aspect.from} ${readableAspect} ${aspect.to} lets ${first.ability} create an opening for ${second.ability}. When ${second.opportunity}, you may ${first.behavior}. The gift is not automatic; it becomes visible when a choice, invitation, or problem gives the connection somewhere to go.`;
      break;
    case "trine":
      body = `Your ${aspect.from} ${readableAspect} ${aspect.to} allows ${first.ability} and ${second.ability} to work together without much friction. You may ${first.behavior} so naturally that you assume everyone can do it. The gift is ${first.ability} through ${second.ability}. The blind spot is relying on the same strength when a situation requires a different response.`;
      break;
    case "square":
      body = `Your ${aspect.from} ${readableAspect} ${aspect.to} can make ${first.need} clash with ${second.need}. When ${first.trigger}, you may ${first.behavior}, then ${second.behavior}, and each reaction makes the other need harder to satisfy. The pressure becomes clearer when you can tell which need is reacting first and which need is paying the cost.`;
      break;
    case "opposition":
      body = `Your ${aspect.from} ${readableAspect} ${aspect.to} can pull you between ${first.position} and ${second.position}. You may ${first.behavior} until ${first.consequence}, then move just as strongly toward ${second.position}. Both sides belong to you, even when one is easier to recognize in someone else.`;
      break;
    case "quincunx":
      body = `Your ${aspect.from} ${readableAspect} ${aspect.to} can make ${first.need} hard to coordinate with ${second.need}. When ${first.trigger}, you may ${first.behavior}, then realize that ${second.concern}. The tension is that one response can make sense for one part of the contact while unsettling the other.`;
      break;
    case "semisextile":
    case "semi-sextile":
      body = `Your ${aspect.from} ${readableAspect} ${aspect.to} places ${first.need} close to ${second.need}, but they may operate in different ways. You may ${first.behavior} and only later notice that ${second.concern} has also been affected. The connection is present, though it does not always announce itself as a problem or a gift.`;
      break;
    default:
      body = `Your ${aspect.from} ${readableAspect} ${aspect.to} changes how ${first.need} responds when ${second.need} enters the same moment. When ${first.trigger}, you may ${first.behavior}. The meaning is not ${first.misread}. It is that ${first.truth}.`;
      break;
  }

  const cleaned = body.replace(/\s+/g, " ").trim();
  if (!isSafeNatalAspectFallbackCopy(cleaned)) return null;

  return {
    body: cleaned,
    sourceKeys: natalAspectFallbackDerivationKeys(aspect),
    derivation: {
      moonRecord: [aspect.from, aspect.to].some((point) => normalizeNatalAspectFallbackKey(point) === "moon") ? moonBaseRecord.id : undefined,
      pointRecords: [
        `aspect-fallback.point.${normalizeNatalAspectFallbackKey(aspect.from)}`,
        `aspect-fallback.point.${normalizeNatalAspectFallbackKey(aspect.to)}`
      ],
      aspectOperator: operatorKey
    }
  };
}
