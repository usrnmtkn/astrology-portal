import { fallbackHookHouseLabel, fallbackHookWords } from "./fallbackHookTitle";

export type FallbackHookEditorGuidanceInput = {
  contentKey: string;
  grammarFrame?: string;
  bodyYou?: string;
  displayTitle?: string;
};

export type FallbackHookEditorGuidance = {
  area: string;
  title: string;
  description: string;
  writingRule: string;
  example?: string;
  headlineLabel: string;
  headlineHint: string;
  summaryLabel: string;
  summaryHint: string;
  bodyLabel: string;
  bodyHint: string;
  bodyYouLabel: string;
  bodyYouHint: string;
  bodyTheyLabel: string;
  bodyTheyHint: string;
  audienceLabel?: string;
  audienceHint?: string;
};

export type FallbackHookEditorGuidanceBuilder = (
  input: FallbackHookEditorGuidanceInput
) => FallbackHookEditorGuidance;

type PairDailyPiece = {
  area: string;
  description: string;
  writingRule: string;
  assembly: string;
  you: string;
  they: string;
};

type GuidanceCopy = {
  schema: "admin-fallback-hook-editor-guidance/v1";
  workspaceGuide: {
    eyebrow: string;
    title: string;
    description: string;
    surfaces: Array<{
      title: string;
      description: string;
      steps: string[];
      actions: Array<{ label: string; family: DailyFallbackHookFamily }>;
    }>;
    noteTitle: string;
    noteBody: string;
  };
  shared: Pick<FallbackHookEditorGuidance, "headlineLabel" | "headlineHint" | "summaryLabel" | "summaryHint" | "bodyLabel" | "bodyHint" | "bodyYouLabel" | "bodyTheyLabel">;
  grammarRules: Record<"noun_phrase" | "complete_sentence" | "default", string>;
  daily: Record<string, string>;
  pairDaily: {
    title: string;
    summaryLabel: string;
    summaryHint: string;
    clauseYouLabel: string;
    sharedYouLabel: string;
    clauseTheyLabel: string;
    sharedTheyLabel: string;
    audienceLabel: string;
    pieces: Record<string, PairDailyPiece>;
  };
  houseHoroscope: Record<string, string>;
  retroArticle: Record<string, string>;
  planetMode: Record<string, string>;
  relationship: {
    area: string;
    writingRule: string;
    bodyYouHint: string;
    bodyTheyHint: string;
    purposes: Record<string, { title: string; description: string }>;
  };
  defaults: Record<string, string>;
};

const format = (template: string, values: Record<string, string>) => template.replace(/\{\{([^}]+)\}\}/gu, (match, key: string) => values[key] ?? match);

const grammarRule = (copy: GuidanceCopy, grammarFrame: string | undefined) => (
  grammarFrame === "noun_phrase" || grammarFrame === "complete_sentence"
    ? copy.grammarRules[grammarFrame]
    : copy.grammarRules.default
);

export function fallbackHookEditorGuidance({
  contentKey,
  grammarFrame,
  bodyYou = "",
  displayTitle
}: FallbackHookEditorGuidanceInput, copy: GuidanceCopy): FallbackHookEditorGuidance {
  const keyParts = contentKey.split("/");
  const isFallbackHookNamespace = keyParts[0] === "fallback-hook";
  const family = (isFallbackHookNamespace ? keyParts[1] : keyParts[0]) || "fallback";
  const subjectKey = (isFallbackHookNamespace ? keyParts[2] : keyParts[1]) || "this item";
  const subject = fallbackHookWords(subjectKey);
  const savedExample = bodyYou.trim() || undefined;

  if (family === "daily-headline" || family === "daily-body") {
    const isHeadline = family === "daily-headline";
    const context = keyParts[2] || "daily driver";
    const dailySubjectKey = keyParts[3] || "source";
    const selector = context === "house"
      ? `${fallbackHookHouseLabel(dailySubjectKey)} fallback`
      : `${fallbackHookWords(dailySubjectKey)} ${fallbackHookWords(context)} Moon contact`;
    const kind = isHeadline ? "headline" : "passage";

    return {
      ...copy.shared,
      area: isHeadline ? copy.daily.areaHeadline : copy.daily.areaPassage,
      title: displayTitle ?? format(copy.daily.title, { selector }),
      description: format(copy.daily.description, { kind, selectorLower: selector.toLowerCase() }),
      writingRule: isHeadline ? copy.daily.headlineRule : copy.daily.passageRule,
      example: savedExample,
      summaryLabel: copy.daily.summaryLabel,
      summaryHint: copy.daily.summaryHint,
      bodyYouLabel: isHeadline ? copy.daily.bodyYouHeadlineLabel : copy.daily.bodyYouPassageLabel,
      bodyYouHint: copy.daily.bodyYouHint,
      bodyTheyLabel: isHeadline ? copy.daily.bodyTheyHeadlineLabel : copy.daily.bodyTheyPassageLabel,
      bodyTheyHint: copy.daily.bodyTheyHint,
      audienceLabel: copy.daily.audienceLabel,
      audienceHint: isHeadline ? copy.daily.headlineAssembly : copy.daily.passageAssembly
    };
  }

  if (family === "pair-daily") {
    const piece = keyParts[2] || "source";
    const guidance = copy.pairDaily.pieces[piece] ?? copy.pairDaily.pieces.clause;
    const isClause = piece === "clause";

    return {
      ...copy.shared,
      area: guidance.area,
      title: displayTitle ?? copy.pairDaily.title,
      description: guidance.description,
      writingRule: guidance.writingRule,
      example: savedExample,
      summaryLabel: copy.pairDaily.summaryLabel,
      summaryHint: copy.pairDaily.summaryHint,
      bodyYouLabel: isClause ? copy.pairDaily.clauseYouLabel : copy.pairDaily.sharedYouLabel,
      bodyYouHint: guidance.you,
      bodyTheyLabel: isClause ? copy.pairDaily.clauseTheyLabel : copy.pairDaily.sharedTheyLabel,
      bodyTheyHint: guidance.they,
      audienceLabel: copy.pairDaily.audienceLabel,
      audienceHint: guidance.assembly
    };
  }

  if (family === "house-horoscope-core") {
    const [, planetKey = "planet", signKey = "sign", houseKey = "house"] = keyParts;
    return {
      ...copy.shared,
      ...copy.houseHoroscope,
      title: format(copy.houseHoroscope.title, { planet: fallbackHookWords(planetKey), sign: fallbackHookWords(signKey), house: fallbackHookHouseLabel(houseKey) }),
      example: savedExample
    } as FallbackHookEditorGuidance;
  }

  if (family === "transit-retro-article") {
    return {
      ...copy.shared,
      ...copy.retroArticle,
      title: format(copy.retroArticle.title, { subject }),
      example: savedExample
    } as FallbackHookEditorGuidance;
  }

  const rule = grammarRule(copy, grammarFrame);
  if (family === "planet-mode") {
    return {
      ...copy.shared,
      ...copy.planetMode,
      title: format(copy.planetMode.title, { subject }),
      description: format(copy.planetMode.description, { subject }),
      writingRule: format(copy.planetMode.writingRule, { grammarRule: rule }),
      example: savedExample ? format(copy.planetMode.example, { bodyYou: savedExample }) : undefined
    } as FallbackHookEditorGuidance;
  }

  const relationship = copy.relationship.purposes[family];
  if (relationship) {
    return {
      ...copy.shared,
      area: copy.relationship.area,
      title: format(relationship.title, { subject }),
      description: format(relationship.description, { subject }),
      writingRule: format(copy.relationship.writingRule, { grammarRule: rule }),
      example: savedExample,
      bodyYouHint: copy.relationship.bodyYouHint,
      bodyTheyHint: copy.relationship.bodyTheyHint
    };
  }

  const isCurrentSky = family.startsWith("transit-") || family.startsWith("sky-");
  const isNatal = family.startsWith("natal-") || family.startsWith("placement-");
  const area = isCurrentSky ? copy.defaults.currentSkyArea : isNatal ? copy.defaults.natalArea : copy.defaults.fallbackArea;

  return {
    ...copy.shared,
    area,
    title: format(copy.defaults.title, { subject, family: fallbackHookWords(family) }),
    description: format(copy.defaults.description, { areaLower: area.toLowerCase() }),
    writingRule: rule,
    example: savedExample,
    bodyYouHint: copy.defaults.bodyYouHint,
    bodyTheyHint: copy.defaults.bodyTheyHint
  };
}

let guidanceCopyRequest: Promise<GuidanceCopy> | null = null;
let guidanceCopy: GuidanceCopy | null = null;

const loadGuidanceCopy = () => {
  guidanceCopyRequest ??= fetch(`${import.meta.env.BASE_URL}generated/admin-fallback-hook-editor-guidance-v1.json`, { cache: "no-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Fallback editor guidance failed to load (${response.status}).`);
      const copy = await response.json() as GuidanceCopy;
      if (copy.schema !== "admin-fallback-hook-editor-guidance/v1") throw new Error("Fallback editor guidance schema is invalid.");
      guidanceCopy = copy;
      return copy;
    });
  return guidanceCopyRequest;
};

export async function loadFallbackHookEditorGuidance(): Promise<FallbackHookEditorGuidanceBuilder> {
  const copy = await loadGuidanceCopy();
  return (input) => fallbackHookEditorGuidance(input, copy);
}

export type DailyFallbackHookFamily = "daily-headline" | "daily-body" | "pair-daily";

type DailyFallbackWorkspaceGuideProps = {
  onShowFamily: (family: DailyFallbackHookFamily) => void;
};

export default function DailyFallbackWorkspaceGuide({ onShowFamily }: DailyFallbackWorkspaceGuideProps) {
  if (!guidanceCopy) throw loadGuidanceCopy();
  const guide = guidanceCopy.workspaceGuide;

  return (
    <section className="admin-daily-hook-guide" aria-label="How daily content is assembled">
      <div className="admin-daily-hook-guide-heading">
        <div>
          <p className="admin-eyebrow">{guide.eyebrow}</p>
          <h3>{guide.title}</h3>
        </div>
        <p>{guide.description}</p>
      </div>
      <div className="admin-daily-hook-guide-grid">
        {guide.surfaces.map((surface) => (
          <article key={surface.title}>
            <strong>{surface.title}</strong>
            <span>{surface.description}</span>
            <p>{surface.steps.map((step, index) => step === "→" ? <i key={index} aria-hidden="true">{step}</i> : <b key={step}>{step}</b>)}</p>
            <div>{surface.actions.map((action) => <button key={action.family} type="button" onClick={() => onShowFamily(action.family)}>{action.label}</button>)}</div>
          </article>
        ))}
      </div>
      <details className="admin-daily-hook-create-note">
        <summary>{guide.noteTitle}</summary>
        <p>{guide.noteBody}</p>
      </details>
    </section>
  );
}
