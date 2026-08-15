export const ONE_SIDED_BEFORE_PASS_KEYS = [
  "sky-sign/moon/aries",
  "sky-sign/moon/gemini",
  "sky-sign/moon/libra",
  "sky-sign/moon/sagittarius",
  "sky-sign/moon/aquarius",
  "sky-sign/mercury/aries",
  "sky-sign/mercury/taurus",
  "sky-sign/mercury/leo",
  "sky-sign/mercury/libra",
  "sky-sign/mercury/capricorn",
  "sky-sign/mercury/aquarius",
  "sky-sign/venus/aries",
  "sky-sign/venus/taurus",
  "sky-sign/venus/gemini",
  "sky-sign/venus/cancer",
  "sky-sign/venus/leo",
  "sky-sign/venus/sagittarius",
  "sky-sign/venus/capricorn",
  "sky-sign/venus/aquarius",
  "sky-sign/mars/leo",
  "sky-sign/jupiter/gemini",
  "sky-sign/jupiter/leo",
  "sky-sign/jupiter/virgo",
  "sky-sign/jupiter/libra",
  "sky-sign/jupiter/capricorn",
  "sky-sign/jupiter/aquarius",
  "sky-sign/saturn/gemini",
  "sky-sign/saturn/leo",
  "sky-sign/saturn/virgo",
  "sky-sign/saturn/sagittarius",
  "sky-sign/uranus/aquarius",
  "sky-sign/neptune/leo",
  "sky-sign/neptune/virgo",
  "sky-sign/chiron/aquarius",
  "sky-sign/lilith/aries",
  "sky-sign/lilith/gemini",
  "sky-sign/lilith/cancer",
  "sky-sign/lilith/leo",
  "sky-sign/lilith/aquarius",
];

export const SYSTEMIC_REPASS_WORDING_KEYS = [
  "sky-sign/sun/taurus",
  "sky-sign/moon/taurus",
  "sky-sign/mercury/taurus",
  "sky-sign/venus/scorpio",
  "sky-sign/venus/capricorn",
  "sky-sign/saturn/gemini",
  "sky-sign/uranus/scorpio",
  "sky-sign/lilith/gemini",
];

const ownerAuthoredReplacements = {
  "sky-sign/jupiter/aquarius": {
    combined_position: "a bigger opportunity gets support when more people can actually use it",
    supportive_realizations: [
      "a program, policy, or opportunity expanding because access is opened to more people",
      "a group getting confident enough to challenge a rule that only worked for a few",
    ],
    neutral_realizations: [],
    shadow_realizations: [
      "people promising broader access before the system is ready to deliver it",
    ],
  },
  "sky-sign/pluto/cancer": {
    combined_position: "family loyalty or private influence starts deciding what happens to everyone else",
    supportive_realizations: [],
    neutral_realizations: [
      "family loyalty influencing a decision that affects people outside the family",
    ],
    shadow_realizations: [
      "someone using care, access, or obligation to make it harder for another person to say no",
      "the person who protects the household also deciding who belongs and what loyalty requires",
    ],
  },
  "sky-sign/chiron/aries": {
    combined_position: "someone hangs back on the first move because going first has gone badly before",
    supportive_realizations: [],
    neutral_realizations: [
      "hesitating to volunteer, apply, speak first, or take the lead after being punished for it before",
    ],
    shadow_realizations: [
      "reacting strongly when independence is treated as selfishness",
      "wanting to act but checking for permission first because taking initiative used to come with consequences",
    ],
  },
  "sky-sign/lilith/gemini": {
    combined_position: "The contradiction gets named once the official explanation no longer matches what is happening.",
    supportive_realizations: [],
    neutral_realizations: [
      "a contradiction spoken after the approved explanation no longer matches the facts",
      "several versions offered after an authority demands one official account",
    ],
    shadow_realizations: [
      "someone changing the story once the last version starts carrying consequences",
    ],
  },
  "sky-sign/saturn/gemini": {
    combined_position: "The wording gets tighter once the decision has consequences and the record has to stay consistent.",
    supportive_realizations: [
      "revised language that still has to match the record",
    ],
    neutral_realizations: [
      "a decision delayed while conflicting facts are documented",
    ],
    shadow_realizations: [
      "skepticism used to end the discussion before a new idea has been tested",
    ],
  },
  "sky-sign/mercury/taurus": {
    combined_position: "The wording gets slower and more specific until everyone knows what the terms actually mean.",
    supportive_realizations: [
      "an agreement slowing until the practical terms are clear",
      "a repeated fact carrying more weight than a clever argument",
    ],
    neutral_realizations: [],
    shadow_realizations: [
      "a new fact rejected because it conflicts with the explanation that has already proved reliable",
    ],
  },
  "sky-sign/uranus/scorpio": {
    combined_position: "A sudden disclosure changes who has access, who has leverage, and what trust can still be repaired.",
    supportive_realizations: [],
    neutral_realizations: [
      "hidden leverage exposed by a change that cannot simply be undone",
      "an independent move changing who controls the information with the biggest consequences",
    ],
    shadow_realizations: [
      "private access changed before trust has been renegotiated",
    ],
  },
  "sky-sign/venus/scorpio": {
    combined_position: "Closeness can deepen quickly, but giving someone more access also gives them more power to affect what matters.",
    supportive_realizations: [
      "more closeness after trust survives a private disclosure",
      "the bond becoming more valuable once both people understand what can actually be lost",
    ],
    neutral_realizations: [],
    shadow_realizations: [
      "an agreement asking for more access before the trust behind it feels settled",
    ],
  },
};

// Owner-requested classification review, 2026-08-15. These decisions move
// existing realization text between typed pools only. They never rewrite a
// realization or alter its evidence.
export const CLASSIFICATION_REVIEW_DECISIONS = {
  "sky-sign/sun/cancer": {
    population: "all_neutral",
    types: ["supportive", "shadow", "neutral"],
    finding: "Care work that others depend on is supportive; private loyalty deciding public recognition carries a source-supported cost.",
  },
  "sky-sign/sun/sagittarius": {
    population: "all_neutral",
    types: ["supportive", "shadow", "neutral"],
    finding: "A larger purpose can support reach, while carrying work to an audience it was not made for carries the source warning about certainty outrunning facts.",
  },
  "sky-sign/moon/capricorn": {
    population: "all_neutral",
    types: ["shadow", "neutral", "supportive"],
    finding: "Postponing needs carries the source cost; dependable follow-through is the supportive form already present in the wording.",
  },
  "sky-sign/mercury/pisces": {
    population: "all_neutral",
    types: ["supportive", "shadow", "shadow"],
    finding: "Reading tone can carry the source-supported intuitive strength; unverified implication and blurred decisions carry its translation and verification costs.",
  },
  "sky-sign/mars/gemini": {
    population: "all_neutral",
    types: ["shadow", "shadow", "supportive"],
    finding: "Scattered effort and a moving argument carry the concentration cost; a new comparison redirecting action carries the source-supported adaptive opening.",
  },
  "sky-sign/saturn/aquarius": {
    population: "all_neutral",
    types: ["neutral", "neutral", "supportive"],
    finding: "An equal standard is the supportive form. Policy and precedent remain neutral because their effect depends on the card's argument shape.",
  },
  "sky-sign/saturn/pisces": {
    population: "all_neutral",
    types: ["neutral", "shadow", "supportive"],
    finding: "Difficulty assigning responsibility carries the cost; naming uncertainty so the plan can hold is the supported constructive form.",
  },
  "sky-sign/uranus/cancer": {
    population: "all_neutral",
    types: ["supportive", "neutral", "shadow"],
    finding: "Making room through a changed household pattern is supportive; leaving a role that once guaranteed safety carries the source cost of disruption.",
  },
  "sky-sign/uranus/pisces": {
    population: "all_neutral",
    types: ["neutral", "supportive", "shadow"],
    finding: "Stepping away after sympathy was mistaken for agreement is a supported boundary correction; changing course before a plan exists carries the disruption cost.",
  },
  "sky-sign/neptune/cancer": {
    population: "all_neutral",
    types: ["shadow", "neutral", "shadow"],
    finding: "Blurred care and projection and unseen emotional labor both carry the source's idealization cost; private longing shaping a group need remains neutral.",
  },
  "sky-sign/neptune/scorpio": {
    population: "all_neutral",
    types: ["neutral", "shadow", "shadow"],
    finding: "Unclear motive remains neutral; lost track of private power and an irreversible choice made with uncertain information carry the governed boundary and discernment costs.",
  },
  "sky-sign/neptune/pisces": {
    population: "all_neutral",
    types: ["shadow", "supportive", "neutral"],
    finding: "Treating one feeling as the same duty for everyone carries a cost; imagining beyond a firm factual boundary carries the creative opening supported by the source.",
  },
  "sky-sign/chiron/gemini": {
    population: "all_neutral",
    types: ["neutral", "neutral", "shadow"],
    finding: "Careful wording and a question shaped by prior disbelief remain neutral; reacting after repeated omission carries the source-supported cost.",
  },
  "sky-sign/sun/scorpio": {
    population: "all_shadow",
    types: ["shadow", "neutral", "shadow"],
    supportiveFinding: "The source carries a constructive truth-naming form, but no current realization expresses it; nothing was invented during this check.",
    finding: "Private obligations that others cannot see are a neutral condition, not automatically a cost.",
  },
  "sky-sign/mars/aries": {
    population: "all_shadow",
    types: ["neutral", "shadow", "supportive"],
    supportiveFinding: "A supportive realization existed but was misclassified: direct pursuit of a visible result carries the source's initiative and renewed-momentum strength.",
    finding: "The first move setting pace is neutral; acting before a process exists remains shadow.",
  },
  "sky-sign/mars/taurus": {
    population: "all_shadow",
    types: ["supportive", "shadow", "neutral"],
    supportiveFinding: "A supportive realization existed but was misclassified: sustained work on one point carries the source's persistence and craftsmanship strength.",
    finding: "Resource conflict remains shadow; delaying until a result can be kept is neutral.",
  },
  "sky-sign/mars/scorpio": {
    population: "all_shadow",
    types: ["neutral", "shadow", "supportive"],
    supportiveFinding: "A supportive realization existed but was misclassified: careful pursuit of an irreversible result carries the source's strategic use of information gained during delay.",
    finding: "Waiting for control to become clear is neutral; pressure around trust and access remains shadow.",
  },
  "sky-sign/saturn/leo": {
    population: "all_shadow",
    types: ["shadow", "neutral", "shadow"],
    supportiveFinding: "The source carries earned confidence and recognition for completed work, but no current realization expresses it; nothing was invented during this check.",
    finding: "Limiting how much pride directs a decision is neutral; withheld recognition and withheld contribution remain costs.",
  },
  "sky-sign/saturn/scorpio": {
    population: "all_shadow",
    types: ["supportive", "neutral", "shadow"],
    supportiveFinding: "A supportive realization existed but was misclassified: a limit that protects irreversible information carries the source's constructive boundary function.",
    finding: "Responsibility attached to access remains neutral; making a postponed consequence official remains shadow.",
  },
  "sky-sign/neptune/libra": {
    population: "all_shadow",
    types: ["shadow", "shadow", "shadow"],
    supportiveFinding: "The source carries an honest fairness check beyond the fantasy, but no current realization expresses it; the all-shadow classification is correct for the three realizations actually present.",
    finding: "All three current realizations explicitly carry idealization, unequal cost, or lost reciprocity.",
  },
  "sky-sign/lilith/leo": {
    population: "all_shadow",
    types: ["supportive", "supportive", "shadow"],
    supportiveFinding: "Two supportive realizations were misclassified: claiming visibility and rejecting recognition that requires self-erasure follow the owner-approved source directly.",
    finding: "Turning the whole conflict into a substitute for naming shame remains shadow.",
  },
  "sky-sign/lilith/virgo": {
    population: "all_shadow",
    types: ["supportive", "supportive", "neutral"],
    supportiveFinding: "Two supportive realizations were misclassified: refusing conditional worth and defending difference follow the owner-approved source directly.",
    finding: "The excluded need exposing a method's limit is a neutral diagnostic condition.",
  },
  "sky-sign/lilith/capricorn": {
    population: "all_shadow",
    types: ["supportive", "supportive", "neutral"],
    supportiveFinding: "Two supportive realizations were misclassified: confronting respectability used as control and refusing an erasing duty follow the owner-approved source directly.",
    finding: "Accepting a consequence rather than obeying remains neutral because the source does not promise benefit.",
  },
};

function applyClassificationReview(key, typed) {
  const decision = CLASSIFICATION_REVIEW_DECISIONS[key];
  if (!decision) return typed;
  const beforeField = decision.population === "all_neutral" ? "neutral_realizations" : "shadow_realizations";
  const values = typed[beforeField];
  if (values.length !== decision.types.length || REALIZATION_FIELDS.some((field) => field !== beforeField && typed[field].length > 0)) {
    throw new Error(`${key}: classification review expected ${decision.population} input`);
  }
  return typeRealizations(
    values,
    Object.fromEntries(values.map((value, index) => [value, decision.types[index]])),
  );
}

const shadowManifestationOverrides = {
  "sky-sign/moon/aries": "someone treating every strong feeling like an emergency that everyone must answer",
  "sky-sign/moon/gemini": "someone explaining the feeling repeatedly instead of admitting that they are hurt",
  "sky-sign/moon/libra": "someone agreeing to keep the peace and swallowing the need that would complicate it",
  "sky-sign/moon/sagittarius": "someone leaving or turning pain into a lesson before they have felt it",
  "sky-sign/moon/aquarius": "someone analyzing the group's needs while acting as if they have none",
  "sky-sign/mercury/aries": "someone deciding before listening and turning the reply into a verbal fight",
  "sky-sign/mercury/taurus": "someone rejecting a new fact because the older explanation feels safer",
  "sky-sign/mercury/leo": "someone exaggerating the point because being admired matters more than being understood",
  "sky-sign/mercury/libra": "someone softening the truth until the decision no longer says what it means",
  "sky-sign/mercury/capricorn": "someone withholding the words until the message sounds colder than intended",
  "sky-sign/mercury/aquarius": "someone defending the clever idea while ignoring how it lands on the person hearing it",
  "sky-sign/venus/aries": "someone losing interest when the chase becomes an actual relationship",
  "sky-sign/venus/taurus": "someone keeping a comfortable arrangement after it has stopped helping either person grow",
  "sky-sign/venus/gemini": "someone sending mixed signals because every new option feels easier than choosing",
  "sky-sign/venus/cancer": "someone offering care in a way that makes the other person feel obligated to stay",
  "sky-sign/venus/leo": "someone creating drama because ordinary affection does not feel like enough proof",
  "sky-sign/venus/sagittarius": "someone leaving when accountability starts to feel like a limit on freedom",
  "sky-sign/venus/capricorn": "someone treating affection like a transaction because control feels safer than uncertainty",
  "sky-sign/venus/aquarius": "someone acting detached while still expecting the connection to remain available",
  "sky-sign/mars/leo": "someone turning a disagreement into a contest over who gets respect and attention",
  "sky-sign/jupiter/gemini": "people opening more routes than they have time or attention to follow",
  "sky-sign/jupiter/leo": "someone promising more than the work can support because the applause feels convincing",
  "sky-sign/jupiter/virgo": "people adding corrections until the larger opportunity becomes too small to matter",
  "sky-sign/jupiter/libra": "people accommodating every side until no one can tell what was actually agreed",
  "sky-sign/jupiter/capricorn": "someone lowering the aim early because the first limit looks permanent",
  "sky-sign/jupiter/aquarius": "people promising broader access before the system is ready to deliver it",
  "sky-sign/saturn/gemini": "someone using skepticism to close the discussion before a new idea can be tested",
  "sky-sign/saturn/leo": "someone withholding their contribution because uncertain recognition feels too risky",
  "sky-sign/saturn/virgo": "someone correcting every small flaw until the work becomes punishing to finish",
  "sky-sign/saturn/sagittarius": "someone preaching freedom while refusing responsibility for where the claim leads",
  "sky-sign/uranus/aquarius": "a group changing the system so quickly that people lose the support the old one provided",
  "sky-sign/neptune/leo": "people trusting the impressive image after it has stopped matching the work behind it",
  "sky-sign/neptune/virgo": "people correcting the plan repeatedly because no real version can match the ideal",
  "sky-sign/chiron/aquarius": "someone leaving the group first because exclusion feels easier to control when it is chosen",
  "sky-sign/lilith/aries": "someone starting a confrontation just to prove that no one can tell them what to do",
  "sky-sign/lilith/gemini": "someone changing the story whenever the last version begins to carry consequences",
  "sky-sign/lilith/cancer": "someone letting an old family hurt color every present request for care",
  "sky-sign/lilith/leo": "someone making the whole conflict about them because shame is harder to name directly",
  "sky-sign/lilith/aquarius": "someone rebelling against the group rule even when the rebellion leaves them more isolated",
};

const concreteManifestationReplacements = new Map([
  ["recognition following the first visible move rather than the longest contribution", "people recognizing the first visible move instead of the person who carried the work longest"],
  ["recognition arriving only after the result proves it can last", "people waiting to give credit until the result proves it can last"],
  ["credit moving when a new version of the story circulates", "people changing who gets credit when a new version of the story circulates"],
  ["recognition depending on precision rather than display", "people giving credit to the person who got the detail right instead of the best performer"],
  ["credit becoming leverage in a decision with lasting consequences", "someone using public credit as leverage in a decision with lasting consequences"],
  ["recognition extending beyond the original audience", "people carrying someone's work to an audience it was not made for"],
  ["recognition attaching to an idealized image rather than the actual work", "people crediting the image they want to believe instead of the work that was done"],
  ["care arriving as quick protection rather than discussion", "someone protecting the person involved before asking what happened"],
  ["care becoming more protective when belonging feels uncertain", "someone holding the family closer when they are unsure who still belongs"],
  ["hurt becoming visible when appreciation is withheld", "someone showing their hurt when the expected appreciation never arrives"],
  ["care appearing as the task that keeps a routine from failing", "someone doing the overlooked task that keeps the routine from failing"],
  ["care becoming guarded after something cannot be taken back", "someone offering less care after a private disclosure changes the trust"],
  ["belonging deepening where people share the risk of being known", "people feeling closer after each person risks being known honestly"],
  ["belonging widening around a shared belief rather than a shared history", "people making room for newcomers who share the belief but not the history"],
  ["belonging depending on whether difference is allowed without explanation", "people deciding who belongs by whether difference can remain unexplained"],
  ["care extending past the point where responsibility is clear", "someone continuing to help after no one can say who is responsible"],
  ["attraction growing through direct pursuit instead of careful agreement", "someone pursuing the person they want before the terms are clear"],
  ["connection growing through the conversation that keeps changing shape", "people staying interested because the conversation keeps changing shape"],
  ["value concentrating around what cannot be casually replaced", "people valuing the bond more once they understand what cannot be replaced"],
  ["connection widening through a shared horizon rather than a fixed plan", "people choosing each other because they can imagine a wider life together"],
  ["value following the choice that leaves more room to grow", "people choosing the option that leaves more room to grow"],
  ["connection remaining possible because independence is built into the terms", "people staying connected because the agreement leaves room for independence"],
  ["affection extending beyond what either person has clearly promised", "someone giving more affection than either person has actually promised"],
  ["pressure turning directly into action before a process is agreed", "someone acting on the pressure before the group agrees on a process"],
  ["conflict gathering around a resource no one wants to surrender", "people arguing over the resource no one wants to surrender"],
  ["conflict moving with the wording instead of staying on one issue", "people changing the argument each time the wording changes"],
  ["conflict carrying a private vulnerability into a public decision", "someone defending a private vulnerability inside a public decision"],
  ["conflict entering negotiation before either side gets its preferred result", "people negotiating the disagreement before either side gets its preferred result"],
  ["effort extending toward the larger target before the near one is settled", "someone reaching for the larger target before finishing the nearer one"],
  ["conflict widening when freedom of movement is restricted", "people widening the fight when a rule limits where they can go"],
  ["conflict gathering around a rule that limits independence", "people challenging the rule that limits how they can act"],
  ["effort following an emotional current before the target is defined", "someone acting on the feeling before they can name the target"],
  ["conflict spreading because the boundary of responsibility stays unclear", "people drawing more people into the conflict because no one knows who is responsible"],
  ["opportunity increasing the resources people can actually maintain", "people using a new opportunity to increase the resources they can maintain"],
  ["growth appearing in what becomes more secure or materially useful", "people measuring the improvement by what becomes safer or more useful"],
  ["confidence rising as people compare more than one route", "people getting more confident as they compare more than one route"],
  ["possibility expanding faster than the decision can narrow", "people finding new options faster than they can choose among them"],
  ["confidence increasing where care has made risk feel survivable", "people taking a larger risk after someone makes the consequences feel survivable"],
  ["confidence spreading through recognition that feels personally earned", "someone taking on more after the group recognizes what they already did"],
  ["confidence increasing after the method produces a measurable result", "people backing the larger plan after the method produces a measurable result"],
  ["confidence changing when hidden stakes become visible", "people changing the size of the risk when the hidden stakes become visible"],
  ["confidence rising faster than practical constraints can answer", "people enlarging the promise faster than the practical limits can answer"],
  ["ambition expanding through duties that increase authority", "someone accepting more responsibility because it also increases their authority"],
  ["possibility widening through a reform meant to reach the whole group", "people supporting a reform because it could reach more of the group"],
  ["confidence gathering around a system people believe can change", "a group backing the system change before anyone knows whether it can deliver"],
  ["possibility becoming larger than anyone can yet define", "people supporting a possibility no one can define clearly yet"],
  ["confidence attaching to a shared ideal before its limits are clear", "people trusting a shared ideal before anyone names its limits"],
  ["responsibility settling on the resource that must not run out", "someone taking responsibility for the resource that must not run out"],
  ["responsibility concentrating in the detail no one else can ignore", "someone becoming responsible for the detail no one else can ignore"],
  ["responsibility increasing where control and trust are intertwined", "someone carrying more responsibility because they also control the access"],
  ["authority settling a consequence people had hoped to postpone", "an authority making the consequence official after people tried to postpone it"],
  ["responsibility following the claim farther than confidence expected", "someone having to support the claim after it travels farther than expected"],
  ["responsibility becoming hard to assign when compassion is widely shared", "people struggling to assign responsibility because everyone feels for the person involved"],
  ["structure holding only where uncertainty is named rather than denied", "people keeping the plan intact by naming what remains uncertain"],
  ["independence spreading through access to a different explanation", "people acting more independently after a different explanation becomes available"],
  ["recognition shifting toward the contribution that breaks precedent", "people giving credit to the contribution that breaks precedent"],
  ["independence becoming impossible to separate from personal visibility", "someone making their independence visible because the old role no longer fits"],
  ["independence changing the terms of mutual obligation", "someone asking to change what each side owes so there is more room to act alone"],
  ["independence appearing where people had mistaken sympathy for agreement", "someone stepping away after others mistook sympathy for agreement"],
  ["recognition attaching to the story people want to believe", "people crediting the story they want to believe instead of checking the work"],
  ["imagination expanding where facts cannot set a firm boundary", "people imagining more because the facts do not set a firm boundary"],
  ["control settling around the resource people cannot afford to lose", "someone gaining control by holding the resource others cannot afford to lose"],
  ["power becoming visible when security can no longer be assumed", "people seeing who has power after the expected security disappears"],
  ["control shifting when information reaches a wider audience", "someone losing control after the information reaches a wider audience"],
  ["care turning into leverage where belonging feels conditional", "someone using care to make belonging feel conditional"],
  ["power concentrating around the person identified with the outcome", "people giving more power to the person identified with the outcome"],
  ["leverage appearing in the power to call something defective", "someone gaining leverage by deciding what counts as defective"],
  ["power shifting when reciprocal terms become enforceable", "people changing who holds power by making reciprocal terms enforceable"],
  ["control depending on access to what others cannot safely disclose", "someone keeping control because others cannot safely disclose what they know"],
  ["power becoming undeniable when trust and survival meet", "people seeing who has power when trust and survival depend on the same decision"],
  ["authority growing around who can define the larger truth", "someone gaining authority by defining the larger truth"],
  ["control moving through the institution that grants wider reach", "an institution controlling who gets the wider reach"],
  ["authority concentrating where consequences are formally enforced", "the person who enforces the consequence gaining more authority"],
  ["control changing hands when independence becomes structurally possible", "people changing who controls the system once independence becomes possible"],
  ["power becoming difficult to locate inside a shared emotional field", "people feeling controlled without being able to name who is doing it"],
  ["control operating through an ideal no single person appears to own", "people enforcing an ideal while each person denies owning it"],
  ["leverage increasing where boundaries and responsibility remain diffuse", "someone gaining leverage because no one has named the boundary or responsibility"],
  ["sensitivity appearing when several explanations exclude the lived one", "someone reacting after every official explanation leaves out what they lived through"],
  ["care becoming protective where belonging once felt conditional", "someone protecting the person whose belonging was once treated as conditional"],
  ["hurt surfacing when the person doing the work is not named", "someone reacting strongly when the person doing the work is not named"],
  ["sensitivity gathering around the detail that others call insignificant", "someone focusing on the detail others dismiss because it once carried a real cost"],
  ["pain appearing where agreement requires repeated self-adjustment", "someone feeling an older hurt each time the agreement asks them to adjust again"],
  ["belief becoming sensitive when one story is declared universally true", "someone reacting when one story is treated as the only truth"],
  ["pain entering the question of who is free to imagine a different future", "someone holding back a different future because hope once brought consequences"],
  ["sensitivity gathering around being useful to the group but not known by it", "someone doing useful work for the group while expecting not to be known by it"],
  ["sensitivity spreading where care has no agreed boundary", "someone absorbing more pain because no one has agreed where care ends"],
  ["refusal becoming firm when security requires surrender", "someone refusing the security offered because it requires surrender"],
  ["refusal moving between versions that authority wanted reduced to one", "someone offering several versions after an authority demands one approved account"],
  ["refusal appearing when loyalty is used to override autonomy", "someone refusing after family loyalty is used to override their choice"],
  ["autonomy becoming public where approval had set the terms", "someone acting publicly without waiting for the approval that used to set the terms"],
  ["refusal entering the negotiation where politeness had hidden the cost", "someone naming the cost that polite negotiation kept hidden"],
  ["refusal becoming final where trust has been used as leverage", "someone ending the agreement after trust is used as leverage"],
  ["autonomy holding back what cannot be safely recovered once given", "someone keeping private what they could not safely recover once given"],
  ["autonomy widening beyond the story that defined acceptable desire", "someone wanting more than the approved story allowed them to name"],
  ["autonomy becoming visible in the consequence someone chooses to accept", "someone accepting the consequence rather than obeying the demand"],
  ["refusal revealing who remains excluded by a supposedly universal rule", "someone challenging a universal rule and showing who it still excludes"],
]);

const livedBehaviorReplacements = new Map([
  ["credit claimed before anyone agrees the work is finished", "someone claiming credit before anyone agrees the work is finished"],
  ["care work becoming the contribution everyone depends on", "someone doing the care work that everyone else depends on"],
  ["private loyalty shaping who receives public acknowledgment", "family members using private loyalty to influence who gets acknowledged publicly"],
  ["credit divided according to the terms people agreed to", "people dividing credit according to the terms they agreed to"],
  ["recognition withheld until trust and access are settled", "someone withholding recognition until trust and access are settled"],
  ["authority granted after someone accepts responsibility for the outcome", "someone gaining authority after accepting responsibility for the outcome"],
  ["recognition attached to the person expected to answer for the result", "people giving credit to the person expected to answer for the result"],
  ["recognition going to the contribution that changes the system", "people crediting the contribution that changes the system"],
  ["security measured by whether food, money, or shelter remains dependable", "people judging their security by whether food, money, or shelter remains dependable"],
  ["comfort preserved even when a faster change is available", "someone keeping the familiar arrangement even when a faster change is available"],
  ["care taking the form of keeping people informed", "someone showing care by keeping people informed"],
  ["private needs setting the terms before public plans can continue", "someone bringing a private need into the room before the public plan can continue"],
  ["emotional security rising when care is acknowledged openly", "someone feeling safer after the care they provided is acknowledged openly"],
  ["belonging tied to having a recognizable place in the group", "someone feeling they belong after the group gives them a recognizable place"],
  ["emotional relief depending on whether practical help actually works", "someone relaxing only after the practical help actually works"],
  ["care distributed so one person is not carrying all of it", "people dividing the care so one person is not carrying all of it"],
  ["emotional safety depending on who is trusted with private information", "someone deciding how safe they feel by who can be trusted with private information"],
  ["needs being postponed until the required work is done", "someone postponing their needs until the required work is done"],
  ["care shown by taking responsibility when feelings stay private", "someone showing care by taking responsibility while keeping their feelings private"],
  ["belonging secured through reliability rather than reassurance", "someone relying on repeated follow-through instead of reassurance to know they belong"],
  ["emotional distance protecting room to remain part of the group", "someone stepping back emotionally so they can remain part of the group"],
  ["belonging felt through empathy even when facts remain uncertain", "people feeling connected through empathy even while the facts remain uncertain"],
  ["private consequences changing what can be said in public", "someone changing what they say publicly because the private consequences are real"],
  ["information being trusted because it arrives through care", "people trusting the information because someone they rely on delivers it carefully"],
  ["language becoming exact because the consequence cannot be reversed", "someone choosing exact words because the consequence cannot be reversed"],
  ["information shared widely enough to change who holds access", "someone sharing information widely enough to change who holds access"],
  ["meaning carried by tone when the stated facts remain incomplete", "people reading the tone when the stated facts remain incomplete"],
  ["comfort becoming part of how value is measured", "people counting comfort as part of what makes the agreement worthwhile"],
  ["interest sustained by more than one possible arrangement", "people staying interested because more than one arrangement remains possible"],
  ["affection expressed through inclusion in private life", "someone showing affection by including another person in private life"],
  ["affection tied to being chosen distinctly rather than generally included", "someone needing to be chosen distinctly instead of generally included"],
  ["care demonstrated by noticing the strain and reducing it", "someone showing care by noticing the strain and reducing it"],
  ["value measured by whether attention makes daily life work better", "people judging the relationship by whether that attention makes daily life work better"],
  ["mutual response becoming the evidence that an agreement is fair", "both sides responding in ways that show whether the agreement is fair"],
  ["affection sustained by terms neither person has to disappear inside", "people keeping affection alive through terms that do not erase either person"],
  ["shared value defined through balance rather than identical contribution", "people valuing different contributions when the overall exchange remains balanced"],
  ["desire deepening after trust survives a private disclosure", "someone wanting more closeness after trust survives a private disclosure"],
  ["affection shown through commitments that survive inconvenience", "someone showing affection through commitments that survive inconvenience"],
  ["shared value forming around a group commitment rather than private closeness", "people finding common value in a group commitment instead of private closeness"],
  ["longing adding value to an arrangement before its limits are visible", "someone valuing an arrangement more because they long for what it could become"],
  ["shared ideals making unequal terms difficult to notice", "people overlooking unequal terms because they share the same ideal"],
  ["effort continuing at the same point until a material limit gives way", "someone working the same point until a material limit gives way"],
  ["action delayed until the result can be kept", "someone delaying action until they can keep the result"],
  ["effort divided among several messages, errands, or targets", "someone dividing their effort among several messages, errands, or targets"],
  ["action taken to protect someone before the reason is explained", "someone acting to protect another person before explaining why"],
  ["effort intensifying when pride and recognition are on the line", "someone pushing harder when pride and recognition are on the line"],
  ["energy concentrating on the fault that can actually be repaired", "someone putting their energy into the fault that can actually be repaired"],
  ["conflict narrowing into a dispute about method", "people narrowing the conflict to a dispute about method"],
  ["action continuing through small corrections rather than one large move", "someone continuing through small corrections instead of making one large move"],
  ["effort redirected toward terms that do not leave one party carrying the cost", "people redirecting their effort toward terms that do not leave one party carrying the cost"],
  ["action withheld until the source of control becomes clear", "someone withholding action until the source of control becomes clear"],
  ["pressure applied where trust and private access are already at stake", "someone applying pressure where trust and private access are already at stake"],
  ["action gaining force from conviction rather than immediate proof", "someone acting more forcefully because conviction matters more than immediate proof"],
  ["effort organized around the result an authority will accept", "someone organizing the work around the result an authority will accept"],
  ["pressure sustained through duty after urgency has passed", "someone sustaining the pressure through duty after the urgency has passed"],
  ["action measured by whether it creates a durable outcome", "people judging the action by whether it creates a durable outcome"],
  ["action aimed at changing the system rather than winning one exception", "people acting to change the system instead of winning one exception"],
  ["group pressure building behind a different arrangement", "a group pressing for a different arrangement"],
  ["action losing force when several needs merge into one another", "someone losing momentum when several needs merge into one another"],
  ["confidence building through action before certainty arrives", "someone becoming more confident by acting before certainty arrives"],
  ["growth attached to the option that expands independence", "people choosing the option that gives them more room to act independently"],
  ["growth taking the form of wider protection or belonging", "people using new resources to protect or include more of the group"],
  ["generosity making an individual contribution more visible", "someone giving enough support to make another person's contribution more visible"],
  ["growth limited to what the details can support", "people limiting the larger plan to what the details can support"],
  ["benefit widening when the terms distribute it more fairly", "more people benefiting after the terms distribute the opportunity more fairly"],
  ["growth requiring enough trust to share real leverage", "people taking a larger step only after there is enough trust to share real leverage"],
  ["belief enlarging the horizon beyond the current limit", "people looking beyond the current limit because they believe a larger option exists"],
  ["hope expanding where empathy loosens an old boundary", "people hoping for more after empathy loosens an old boundary"],
  ["independence tested by a consequence that cannot be rushed", "someone proving they can act independently while carrying a consequence that cannot be rushed"],
  ["authority requiring proof before action receives backing", "an authority requiring proof before backing the action"],
  ["progress measured by endurance rather than speed", "people judging progress by endurance instead of speed"],
  ["duty falling on the person who protects private continuity", "the person protecting private continuity also carrying the duty"],
  ["care narrowed by a limit on time, money, or capacity", "someone providing less care because time, money, or capacity has reached a limit"],
  ["belonging tested by obligations that are not distributed equally", "people questioning whether they belong when the obligations are not distributed equally"],
  ["recognition withheld until the visible contribution meets the standard", "an authority withholding recognition until the visible contribution meets the standard"],
  ["authority limiting how much pride can direct the decision", "an authority limiting how much personal pride can direct the decision"],
  ["fairness tested by who carries the consequence of compromise", "people judging fairness by who carries the consequence of the compromise"],
  ["belief tested by the boundary of an institution or law", "someone testing a belief against the boundary of an institution or law"],
  ["authority consolidating around the person who can carry the duty", "people giving more authority to the person who can carry the duty"],
  ["progress becoming inseparable from structure and accountability", "people making progress only after the work has structure and accountability"],
  ["independence claimed before the existing process can respond", "someone claiming independence before the existing process can respond"],
  ["independence requiring a new way to preserve what still matters", "someone finding a new way to preserve what matters without giving up independence"],
  ["belonging reorganized around a form of care no longer kept private", "people reorganizing who belongs after private care becomes a public concern"],
  ["independence unsettling the role that once guaranteed emotional safety", "someone leaving the role that once guaranteed emotional safety"],
  ["independence gained through a more useful process", "people gaining independence by using a more useful process"],
  ["private access disrupted before trust can be renegotiated", "someone disrupting private access before trust can be renegotiated"],
  ["independence altering who controls the most consequential information", "someone acting independently and changing who controls the most consequential information"],
  ["independence challenging a belief that once set the horizon", "someone acting independently of the belief that once set the horizon"],
  ["change moving farther than the original plan was built to contain", "people carrying a change farther than the original plan was built to contain"],
  ["independence forced into a system designed to resist quick revision", "someone trying to act independently inside a system designed to resist quick revision"],
  ["change becoming durable only after responsibility is reassigned", "people making the change last by reassigning responsibility"],
  ["change moving through a shared feeling before anyone can define the plan", "people changing course together before anyone can define the plan"],
  ["uncertainty hidden by the urgency of beginning", "people starting quickly so they do not have to admit the direction is uncertain"],
  ["comfort carrying an idealized value that obscures the real cost", "people choosing the reassuring option while overlooking its real cost"],
  ["information becoming more persuasive as its boundaries become less exact", "people trusting an appealing explanation more as its boundaries become less exact"],
  ["belonging idealized until unequal emotional labor becomes hard to see", "people idealizing the family bond until they stop seeing who carries the emotional labor"],
  ["uncertainty exposed when the method has to produce a usable result", "people seeing the uncertainty once the method has to produce a usable result"],
  ["agreement sustained by avoiding the unequal term underneath it", "people keeping an agreement by avoiding the unequal term underneath it"],
  ["shared ideals blurring the point where reciprocity stopped", "people overlooking where reciprocity stopped because they still share the ideal"],
  ["private power becoming harder to locate as boundaries soften", "people losing track of who holds private power as the boundaries soften"],
  ["hope widening the horizon while obscuring the practical distance", "people looking farther ahead while overlooking the practical distance"],
  ["authority lending certainty to an ideal that still lacks limits", "an authority making an ideal sound settled before anyone has named its limits"],
  ["responsibility blurred by a structure built around appearances", "people losing track of responsibility inside a structure built around appearances"],
  ["collective hope gathering around a system that does not yet exist", "a group supporting a system that does not yet exist because it answers a shared hope"],
  ["group ideals making uncertain access feel universally available", "a group assuming everyone has access because the ideal says they should"],
  ["empathy dissolving the line between shared feeling and shared duty", "people treating a shared feeling as if it creates the same duty for everyone"],
  ["leverage taken before anyone agrees it is in play", "someone taking leverage before anyone agrees it is in play"],
  ["power revealed by who can act without waiting for consent", "people seeing who has power by who can act without waiting for consent"],
  ["recognition deciding whose authority appears legitimate", "people treating one person's authority as legitimate because that person receives recognition"],
  ["control exercised through the method everyone must use", "someone controlling the outcome through the method everyone must use"],
  ["fairness language used to conceal unequal control", "someone using the language of fairness to conceal unequal control"],
  ["private leverage intensifying because the consequence cannot be reversed", "someone gaining more private leverage because the consequence cannot be reversed"],
  ["institutional power becoming visible in who assigns lasting duty", "people seeing institutional power in who gets to assign lasting duty"],
  ["control secured through a structure that outlives the immediate dispute", "someone securing control through a structure that outlives the immediate dispute"],
  ["group rules redistributing power across an entire system", "a group rewriting its rules and redistributing power across the system"],
  ["collective pressure exposing who benefits from the current arrangement", "a group pressing the issue until everyone can see who benefits from the current arrangement"],
  ["recognition touching the earlier fear that contribution would be dismissed", "someone receiving recognition and still expecting their contribution to be dismissed"],
  ["privacy guarded because some experiences cannot be made harmless afterward", "someone guarding their privacy because disclosure cannot be made harmless afterward"],
  ["duty becoming the place where vulnerability is least allowed", "someone hiding vulnerability whenever duty has to be performed"],
  ["group belonging tested by whether difference is tolerated in practice", "someone testing whether the group actually tolerates their difference"],
  ["exclusion remembered when a shared rule erases a particular need", "someone remembering an earlier exclusion when a shared rule erases their need"],
  ["empathy reopening pain that has not been clearly separated from others", "someone feeling another person's pain and reopening their own"],
  ["longing making an old loss feel collectively meaningful", "people giving an old loss shared meaning because they still long for what was lost"],
  ["autonomy claimed through the act others call premature", "someone claiming the right to act even when others call the move premature"],
  ["autonomy measured by what can be kept without apology", "someone judging their freedom by what they can keep without apology"],
  ["care withheld from a role that expects feeling to be performed", "someone withholding care from a role that expects feeling on command"],
  ["private belonging protected from demands for emotional access", "someone protecting private belonging from demands for emotional access"],
  ["visibility claimed without making the contribution more acceptable first", "someone claiming visibility without making the contribution more acceptable first"],
  ["recognition rejected when it depends on shrinking the difficult part", "someone rejecting recognition that depends on shrinking the difficult part"],
  ["autonomy defended against correction aimed at making difference manageable", "someone defending their difference against correction meant to make it manageable"],
  ["autonomy requiring terms that do not depend on one side yielding", "someone demanding terms that do not depend on one side yielding"],
  ["desire protected from someone else's claim to private access", "someone protecting desire from another person's claim to private access"],
  ["refusal exposing who was allowed to name the larger truth", "someone refusing the approved story and exposing who was allowed to define the truth"],
  ["authority confronted where respectability has been used as control", "someone confronting an authority that has used respectability as control"],
  ["autonomy held where other people's ideals blur personal boundaries", "someone holding a personal boundary while other people treat their ideals as shared"],
]);

const evidenceBoundaryReplacements = new Map([
  [
    "public credit tied to who protected the budget or the material",
    "credit going to the work that protected what needed to last",
  ],
  [
    "people judging their security by whether food, money, or shelter remains dependable",
    "a feeling given time to become clear before the plan changes again",
  ],
  [
    "someone treating affection like a transaction because control feels safer than uncertainty",
    "affection reduced to a transaction so uncertain terms stay under control",
  ],
]);

const cumbersomePatterns = [
  /\benough weight to\b/iu,
  /\bat the moment someone has to\b/iu,
  /\bpain resurfacing\b/iu,
  /\bsensitivity gathering\b/iu,
  /\bcare turning into\b/iu,
];

const abstractNarratorPattern = /^(?:recognition|credit|care|belonging|hurt|attraction|connection|value|affection|pressure|conflict|effort|opportunity|growth|confidence|possibility|ambition|responsibility|authority|structure|independence|imagination|control|power|leverage|sensitivity|pain|belief|refusal|autonomy)\s+(?:becoming|turning|gathering|attaching|moving|spreading|widening|growing|settling|concentrating|deepening|extending|increasing|appearing|surfacing|following|arriving|depending|carrying|entering|shifting|changing|operating|revealing|remaining|holding|rising|expanding)\b/iu;

export function manifestationPlainnessViolations(rows) {
  return rows.flatMap((row) => REALIZATION_FIELDS.flatMap((field) => row[field].flatMap((value, index) => {
    const reasons = [];
    if (abstractNarratorPattern.test(value)) reasons.push("abstract_narrator");
    if (cumbersomePatterns.some((pattern) => pattern.test(value))) reasons.push("cumbersome_construction");
    if (value.trim().split(/\s+/u).length > 22) reasons.push("over_22_words");
    return reasons.length > 0 ? [{ key: row.key, field: `${field}[${index}]`, value, reasons }] : [];
  })));
}

export function repassSignUnit(key, record) {
  const manifestations = record.reader_manifestations.map((value) => (
    evidenceBoundaryReplacements.get(livedBehaviorReplacements.get(concreteManifestationReplacements.get(value) ?? value)
      ?? concreteManifestationReplacements.get(value)
      ?? value)
      ?? livedBehaviorReplacements.get(concreteManifestationReplacements.get(value) ?? value)
      ?? concreteManifestationReplacements.get(value)
      ?? value
  ));
  if (shadowManifestationOverrides[key]) manifestations[2] = shadowManifestationOverrides[key];
  for (let index = 0; index < manifestations.length; index += 1) {
    manifestations[index] = evidenceBoundaryReplacements.get(manifestations[index]) ?? manifestations[index];
  }
  const ownerReplacement = ownerAuthoredReplacements[key];
  const { reader_manifestations: _discarded, ...rest } = record;
  const typeOverrides = shadowManifestationOverrides[key]
    ? { [shadowManifestationOverrides[key]]: "shadow" }
    : {};
  const typedRealizations = ownerReplacement ?? typeRealizations(manifestations, typeOverrides);
  return {
    ...rest,
    ...applyClassificationReview(key, typedRealizations),
  };
}

export function classificationReviewAudit(rows) {
  const reviewed = [];
  for (const [key, decision] of Object.entries(CLASSIFICATION_REVIEW_DECISIONS)) {
    const row = rows.find((candidate) => candidate.key === key);
    if (!row) throw new Error(`Missing classification-review unit ${key}`);
    const beforeType = decision.population === "all_neutral" ? "neutral" : "shadow";

    // Reconstruct original order from the decision's typed output. This keeps
    // the audit stable even though the workbook groups values by pool.
    const orderedValues = decision.types.map((type, index) => {
      const sameTypeBefore = decision.types.slice(0, index).filter((candidate) => candidate === type).length;
      return row[`${type}_realizations`][sameTypeBefore];
    });
    reviewed.push({
      key,
      population: decision.population,
      beforeShape: decision.population === "all_neutral" ? "0/3/0" : "0/0/3",
      afterShape: REALIZATION_FIELDS.map((field) => row[field].length).join("/"),
      finding: decision.finding,
      supportiveFinding: decision.supportiveFinding ?? null,
      source_ids: [...row.source_ids],
      realizations: orderedValues.map((value, index) => ({
        value,
        beforeType,
        afterType: decision.types[index],
        changed: beforeType !== decision.types[index],
      })),
    });
  }
  const allNeutral = reviewed.filter((row) => row.population === "all_neutral");
  const allShadow = reviewed.filter((row) => row.population === "all_shadow");
  const reviewedKeys = new Set(reviewed.map((row) => row.key));
  const emptySupportiveBefore = rows.filter((row) => (
    reviewedKeys.has(row.key) || row.supportive_realizations.length === 0
  )).length;
  const emptySupportiveAfter = rows.filter((row) => row.supportive_realizations.length === 0).length;
  return {
    reviewedUnits: reviewed.length,
    allNeutralBefore: allNeutral.length,
    allNeutralAfter: allNeutral.filter((row) => row.afterShape === "0/3/0").length,
    allShadowBefore: allShadow.length,
    allShadowAfter: allShadow.filter((row) => row.afterShape === "0/0/3").length,
    emptySupportiveBefore,
    emptySupportiveAfter,
    changedRealizations: reviewed.flatMap((row) => row.realizations).filter((item) => item.changed).length,
    reviewed,
  };
}

export function assertOwnerReplacements(rows) {
  for (const [key, expected] of Object.entries(ownerAuthoredReplacements)) {
    const row = rows.find((candidate) => candidate.key === key);
    if (!row) throw new Error(`Missing owner-authored replacement ${key}`);
    if (row.combined_position !== expected.combined_position) throw new Error(`${key} combined_position changed`);
    for (const field of REALIZATION_FIELDS) {
      if (JSON.stringify(row[field]) !== JSON.stringify(expected[field])) {
        throw new Error(`${key} ${field} changed`);
      }
    }
  }
}

export function sourceShadowAudit(rows) {
  const remainingOneSided = [];
  for (const key of ONE_SIDED_BEFORE_PASS_KEYS) {
    const row = rows.find((candidate) => candidate.key === key);
    if (!row) {
      remainingOneSided.push({ key, reason: "missing_unit" });
      continue;
    }
    const expected = ownerAuthoredReplacements[key]?.shadow_realizations.at(-1)
      ?? evidenceBoundaryReplacements.get(shadowManifestationOverrides[key])
      ?? shadowManifestationOverrides[key];
    if (!expected || !row.shadow_realizations.includes(expected)) {
      remainingOneSided.push({ key, reason: "source_shadow_not_carried" });
    }
  }
  return {
    reviewedUnits: rows.length,
    oneSidedBeforePass: ONE_SIDED_BEFORE_PASS_KEYS.length,
    oneSidedBeforePassKeys: [...ONE_SIDED_BEFORE_PASS_KEYS],
    oneSidedAfterPass: remainingOneSided.length,
    remainingOneSided,
  };
}

const analyticalAbstractionPatterns = [
  /stops? holding/iu,
  /cannot stay loose/iu,
  /concrete enough to hold/iu,
  /what can be restored/iu,
  /most consequential information/iu,
];
const assembledConstructionPatterns = [/keep working the wording/iu];
const inventedMotivePatterns = [/feels safer/iu];
const unsupportedBorrowedVocabulary = new Map([
  ["sky-sign/sun/taurus", ["budget", "material"]],
  ["sky-sign/moon/taurus", ["food", "money", "shelter"]],
  ["sky-sign/mercury/taurus", ["price"]],
]);

function realizationValues(row) {
  if (Array.isArray(row.reader_manifestations)) return row.reader_manifestations;
  return REALIZATION_FIELDS.flatMap((field) => row[field] ?? []);
}

function allWordingValues(row) {
  return [row.combined_position, ...realizationValues(row)].filter(Boolean);
}

function keysMatching(rows, patterns) {
  return rows
    .filter((row) => allWordingValues(row).some((value) => patterns.some((pattern) => pattern.test(value))))
    .map((row) => row.key);
}

export function systemicFaultAudit(_beforeRows, afterRows) {
  const categoryKeys = {
    analytical_abstraction: [
      "sky-sign/mercury/taurus", "sky-sign/saturn/gemini",
      "sky-sign/uranus/scorpio", "sky-sign/lilith/gemini",
    ],
    assembled_construction: ["sky-sign/mercury/taurus"],
    invented_motive: ["sky-sign/mercury/taurus", "sky-sign/venus/capricorn"],
    unsupported_borrowed_vocabulary: [...unsupportedBorrowedVocabulary.keys()],
    generic_actor_removed: [
      "sky-sign/moon/taurus", "sky-sign/mercury/taurus", "sky-sign/venus/scorpio",
      "sky-sign/venus/capricorn", "sky-sign/saturn/gemini", "sky-sign/uranus/scorpio",
      "sky-sign/lilith/gemini",
    ],
  };
  const remaining = {
    analytical_abstraction: keysMatching(afterRows, analyticalAbstractionPatterns),
    assembled_construction: keysMatching(afterRows, assembledConstructionPatterns),
    invented_motive: keysMatching(afterRows, inventedMotivePatterns),
    unsupported_borrowed_vocabulary: afterRows
      .filter((row) => unsupportedBorrowedVocabulary.get(row.key)?.some((term) => new RegExp(`\\b${term}\\b`, "iu").test(allWordingValues(row).join(" "))))
      .map((row) => row.key),
  };
  return {
    reviewedUnits: afterRows.length,
    changedUnderFaultCategory: Object.fromEntries(Object.entries(categoryKeys).map(([category, keys]) => [category, {
      units: keys.length,
      keys,
    }])),
    remainingViolations: remaining,
    borrowedVocabularyRemoved: categoryKeys.unsupported_borrowed_vocabulary.map((key) => ({
      key,
      removedTerms: unsupportedBorrowedVocabulary.get(key),
    })),
  };
}
import {
  REALIZATION_FIELDS,
  typeRealizations,
} from "./sky-calendar-realization-types.mjs";
