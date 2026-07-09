type RoadmapOwnerKind = "self" | "person" | "chart";

type SoulRoadmapCardProps = {
  className?: string;
  ownerKind?: RoadmapOwnerKind;
  ownerName?: string;
  risingPending?: boolean;
  sun: string;
  moon: string;
  rising: string;
};

type SignRoadmap = {
  action: string;
  keywords: string[];
};

const signRoadmaps: Record<string, SignRoadmap> = {
  Aries: {
    action: "take action, fight for what matters, and move independently",
    keywords: ["I am", "I fight for", "I take action", "I am strong-willed"]
  },
  Taurus: {
    action: "create stability, honor what is valuable, and stay connected to the earth",
    keywords: ["I have", "I value", "I connect with the earth", "I create stability"]
  },
  Gemini: {
    action: "learn, think, communicate, and make sense of experience through language",
    keywords: ["I learn", "I think", "I communicate", "I intellectualize"]
  },
  Cancer: {
    action: "feel, nourish, empathize, and protect what needs care",
    keywords: ["I feel", "I nourish", "I empathize", "I mother"]
  },
  Leo: {
    action: "create, lead, and bring warmth, courage, and heart into the room",
    keywords: ["I will", "I am creative", "I lead", "I father"]
  },
  Virgo: {
    action: "analyze, serve, heal, and cultivate useful daily practices",
    keywords: ["I analyze", "I serve", "I heal", "I cultivate", "I ritualize"]
  },
  Libra: {
    action: "balance, relate, connect, and build meaningful relationships",
    keywords: ["I balance", "I relate", "I connect", "I build relationships"]
  },
  Scorpio: {
    action: "transform, feel deeply, study what is hidden, and uncover the truth underneath",
    keywords: ["I transform", "I desire", "I feel deeply", "I go deep", "I uncover"]
  },
  Sagittarius: {
    action: "expand, question deeper meaning, teach, and see from wider points of view",
    keywords: ["I expand", "I philosophize", "I teach", "I envision", "I understand"]
  },
  Capricorn: {
    action: "work with commitment, contribute pragmatically, rise above, and mentor",
    keywords: ["I utilize", "I contribute", "I work", "I am committed", "I mentor"]
  },
  Aquarius: {
    action: "innovate, disrupt stale patterns, change systems, and motivate the collective",
    keywords: ["I innovate", "I know", "I disrupt", "I change", "I build communities"]
  },
  Pisces: {
    action: "imagine, create, inspire, believe, dream, and move with spiritual sensitivity",
    keywords: ["I imagine", "I create", "I inspire", "I believe", "I dream"]
  }
};

function cleanSign(value: string) {
  const match = Object.keys(signRoadmaps).find((sign) => new RegExp(`\\b${sign}\\b`, "i").test(value));

  return match ?? "";
}

function possessiveName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Their";
  }

  return trimmed.endsWith("s") ? `${trimmed}'` : `${trimmed}'s`;
}

function ownerLabel(ownerKind: RoadmapOwnerKind, ownerName = "") {
  if (ownerKind === "self") return "My";
  if (ownerKind === "chart") return "This chart's";

  return possessiveName(ownerName);
}

function missionStatement({
  moon,
  ownerKind,
  ownerName,
  rising,
  risingPending,
  sun
}: {
  moon: SignRoadmap;
  ownerKind: RoadmapOwnerKind;
  ownerName?: string;
  rising: SignRoadmap | null;
  risingPending: boolean;
  sun: SignRoadmap;
}) {
  if (ownerKind === "self") {
    const path = rising && !risingPending
      ? `The path I choose asks me to ${rising.action}.`
      : "The path I choose will become clearer once the birth time confirms my Ascendant.";

    return `My life goal is to ${sun.action}. ${path} Along the way, my emotional style may guide me to ${moon.action}.`;
  }

  if (ownerKind === "chart") {
    const path = rising && !risingPending
      ? `Its path expresses through the need to ${rising.action}.`
      : "Its path will become clearer once the chart has a confirmed Ascendant.";

    return `This chart's central purpose is to ${sun.action}. ${path} Its emotional tone may move through the need to ${moon.action}.`;
  }

  const possessive = ownerLabel("person", ownerName);
  const subject = ownerName?.trim() || "They";
  const path = rising && !risingPending
    ? `The path ${subject} chooses asks them to ${rising.action}.`
    : `The path ${subject} chooses will become clearer once the birth time confirms their Ascendant.`;

  return `${possessive} life goal is to ${sun.action}. ${path} Along the way, their emotional style may guide them to ${moon.action}.`;
}

export function SoulRoadmapCard({
  className = "",
  ownerKind = "self",
  ownerName = "",
  risingPending = false,
  sun,
  moon,
  rising
}: SoulRoadmapCardProps) {
  const sunSign = cleanSign(sun);
  const moonSign = cleanSign(moon);
  const risingSign = cleanSign(rising);
  const sunRoadmap = sunSign ? signRoadmaps[sunSign] : null;
  const moonRoadmap = moonSign ? signRoadmaps[moonSign] : null;
  const risingRoadmap = risingSign ? signRoadmaps[risingSign] : null;

  if (!sunRoadmap || !moonRoadmap) {
    return null;
  }

  const label = ownerKind === "chart" ? "Chart roadmap" : "Soul's roadmap";
  const pathLabel = risingPending || !risingRoadmap ? "Pending" : risingSign;
  const cardClassName = ["soul-roadmap-card", className].filter(Boolean).join(" ");

  return (
    <section className={cardClassName} aria-label={label}>
      <div className="soul-roadmap-card__header">
        <span className="eyebrow section-label">{label}</span>
        <h3>{ownerKind === "self" ? "Your mission statement" : `${ownerLabel(ownerKind, ownerName)} mission statement`}</h3>
        <p>{missionStatement({
          moon: moonRoadmap,
          ownerKind,
          ownerName,
          rising: risingRoadmap,
          risingPending: risingPending || !risingRoadmap,
          sun: sunRoadmap
        })}</p>
      </div>
      <div className="soul-roadmap-card__points" aria-label="Roadmap points">
        <span>
          <strong>Sun</strong>
          <em>{sunSign}</em>
        </span>
        <span>
          <strong>Path</strong>
          <em>{pathLabel}</em>
        </span>
        <span>
          <strong>Moon</strong>
          <em>{moonSign}</em>
        </span>
      </div>
      <div className="soul-roadmap-card__keywords" aria-label="Roadmap keywords">
        <p><strong>{sunSign}</strong> {sunRoadmap.keywords.join(" / ")}</p>
        {!risingPending && risingRoadmap ? <p><strong>{risingSign}</strong> {risingRoadmap.keywords.join(" / ")}</p> : null}
        <p><strong>{moonSign}</strong> {moonRoadmap.keywords.join(" / ")}</p>
      </div>
    </section>
  );
}
