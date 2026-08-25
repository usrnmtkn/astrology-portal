const ordinalSuffix = (value: number) => {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  if (value % 10 === 1) return "st";
  if (value % 10 === 2) return "nd";
  if (value % 10 === 3) return "rd";
  return "th";
};

function words(value: string) {
  return value
    .replace(/[-_]/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function ordinalHouse(value: string) {
  const house = Number(value.replace(/^house-/u, ""));
  return Number.isInteger(house) && house >= 1 && house <= 12
    ? `${house}${ordinalSuffix(house)} House`
    : words(value);
}

function variant(value: string) {
  const match = value.match(/^variant-(\d+)$/u);
  return match ? `Variant ${match[1]}` : words(value);
}

const purposeLabels: Record<string, string> = {
  "angle-sign": "Angle-in-sign passage",
  "aspect-pair": "Natal aspect pair",
  "house-glossary": "House glossary",
  "house-meaning": "House meaning",
  "natal-aspect-lived": "Natal aspect passage",
  "natal-you-placement-complete-final": "Complete natal placement",
  "natal-you-placement-house-final": "Final natal house passage",
  "natal-you-placement-sign-final": "Final natal sign passage",
  "placement-house-lived": "Placement house passage",
  "placement-sentence": "Planet-in-sign sentence",
  "placement-sign-lived": "Planet-in-sign passage",
  "synastry-pair": "Compatibility planet pair",
  "transit-effect-hard": "Hard transit effect",
  "transit-effect-soft": "Soft transit effect"
};

function familyLabel(family: string) {
  const bondEffect = family.match(/^bond-effect-(.+)$/u);
  if (bondEffect) return `${words(bondEffect[1])} compatibility effect`;
  if (purposeLabels[family]) return purposeLabels[family];
  return words(family
    .replace(/-intro$/u, "-introduction")
    .replace(/-lived$/u, "-lived-experience")
    .replace(/-retro$/u, "-retrograde")
    .replace(/-close$/u, "-closing")
    .replace(/-opener$/u, "-opening"));
}

function isHouseFamily(family: string) {
  return family.includes("house")
    || family === "circle-profection"
    || family === "profection-year"
    || family.startsWith("lunation-");
}

function argumentLabel(family: string, value: string) {
  if (/^\d+$/u.test(value)) {
    return isHouseFamily(family) ? ordinalHouse(value) : `Variant ${value}`;
  }
  return variant(value);
}

function pairTitle(family: string, args: string[]) {
  if (!["aspect-pair", "synastry-pair", "natal-aspect-lived"].includes(family) || args.length < 3) return null;
  const [first, middle, last, ...rest] = args;
  const second = family === "natal-aspect-lived" ? last : middle;
  const aspect = family === "natal-aspect-lived" ? middle : last;
  return `${words(first)} + ${words(second)} · ${words(aspect)} · ${familyLabel(family)}${rest.length ? ` · ${rest.map(variant).join(" · ")}` : ""}`;
}

/** Builds a stable editorial title from the hook's canonical identity. */
export function fallbackHookDisplayTitle(contentKey: string) {
  const parts = contentKey.split("/").filter(Boolean);
  if (parts[0] !== "fallback-hook" || !parts[1]) return null;

  const family = parts[1];
  const args = parts.slice(2);
  const pair = pairTitle(family, args);
  if (pair) return pair;

  if (["daily-body", "daily-headline"].includes(family) && args.length >= 2) {
    const [context, subject, ...rest] = args;
    const subjectLabel = context === "house" ? ordinalHouse(subject) : words(subject);
    const contextLabel = context === "house" ? "" : ` · ${words(context)}`;
    return `${subjectLabel}${contextLabel} · ${family === "daily-body" ? "Daily passage" : "Daily headline"}${rest.length ? ` · ${rest.map(variant).join(" · ")}` : ""}`;
  }

  if (family === "placement-house-sentence" && args.length >= 2) {
    return `${words(args[0])} in the ${ordinalHouse(args[1])} · Placement sentence${args.length > 2 ? ` · ${args.slice(2).map(variant).join(" · ")}` : ""}`;
  }

  if (["placement-house-lived", "natal-you-placement-house-final"].includes(family) && args.length >= 2) {
    return `${words(args[0])} in the ${ordinalHouse(args[1])} · ${familyLabel(family)}${args.length > 2 ? ` · ${args.slice(2).map(variant).join(" · ")}` : ""}`;
  }

  if (family === "natal-you-placement-complete-final" && args.length >= 3) {
    return `${words(args[0])} in ${words(args[1])} in the ${ordinalHouse(args[2])} · ${familyLabel(family)}`;
  }

  if (["placement-sentence", "placement-sign-lived", "natal-you-placement-sign-final"].includes(family) && args.length >= 2) {
    return `${words(args[0])} in ${words(args[1])} · ${familyLabel(family)}${args.length > 2 ? ` · ${args.slice(2).map(variant).join(" · ")}` : ""}`;
  }

  const identity = args.map((argument) => argumentLabel(family, argument));
  return identity.length ? `${identity.join(" · ")} · ${familyLabel(family)}` : familyLabel(family);
}
