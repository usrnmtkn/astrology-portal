import {
  transitNatalHouses,
  transitNatalPlanets,
  transitNatalSigns,
  type TransitNatalHouse,
  type TransitNatalPlanet,
  type TransitNatalResolvedSource,
  type TransitNatalSign
} from "./transitNatalSources";

export { transitNatalHouses as houseTransitHouses };
export { transitNatalPlanets as houseTransitPlanets };
export { transitNatalSigns as houseTransitSigns };

export type HouseTransitMotion = "direct" | "retrograde";

export type HouseTransitSelection = {
  planet: TransitNatalPlanet;
  sign: TransitNatalSign;
  house: TransitNatalHouse;
  motion: HouseTransitMotion;
};

export type HouseTransitSource = {
  id: "house-core" | "sign-synthesis" | "retrograde" | "legacy" | "house-topic" | "planet-effect" | "template";
  label: string;
  scope: string;
  candidateKeys: string[];
  optional?: boolean;
};

export type HouseTransitSourceGroup = {
  key: "composition" | "alternate";
  label: string;
  description: string;
  sources: HouseTransitSource[];
};

export type HouseTransitPreview = {
  headline: string;
  body: string;
  complete: boolean;
  sourceKeys: string[];
  missing: string[];
  optionalMissing: string[];
};

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function houseTransitOrdinal(house: TransitNatalHouse) {
  if (house === "1") return "1st";
  if (house === "2") return "2nd";
  if (house === "3") return "3rd";
  return `${house}th`;
}

export function houseTransitLabel(selection: HouseTransitSelection) {
  return `${titleCase(selection.planet)} through your ${houseTransitOrdinal(selection.house)} house`;
}

export function houseTransitSourceGroups(selection: HouseTransitSelection): HouseTransitSourceGroup[] {
  const planet = titleCase(selection.planet);
  const sign = titleCase(selection.sign);
  const house = houseTransitOrdinal(selection.house);
  const composition: HouseTransitSource[] = [
    {
      id: "house-core",
      label: `${planet} through the ${house} house`,
      scope: `The evergreen meaning of ${planet} moving through this house, regardless of its current sign.`,
      candidateKeys: [`authored/transit-house-intro/${selection.planet}/${selection.house}`]
    },
    {
      id: "sign-synthesis",
      label: `${planet} in ${sign} through the ${house} house`,
      scope: `The more specific passage for ${planet}'s current sign inside this house.`,
      candidateKeys: [`authored/transit-house-sign/${selection.planet}/${selection.house}/${selection.sign}`]
    }
  ];
  if (selection.motion === "retrograde") {
    composition.push({
      id: "retrograde",
      label: `${planet} retrograde overlay`,
      scope: `An optional passage added while ${planet} is retrograde during this house crossing.`,
      candidateKeys: [`fallback-hook/transit-house-retro-overlay/${selection.planet}`],
      optional: true
    });
  }

  return [
    {
      key: "composition",
      label: "Editable passages in this House Transit",
      description: "Readers see one House Transit card. Content Studio combines the evergreen house meaning with the current sign passage, then adds a retrograde passage when one is available.",
      sources: composition
    },
    {
      key: "alternate",
      label: "Alternate complete write-up (advanced)",
      description: "These older or generic sources are used only when the two-part House Transit cannot be completed.",
      sources: [
        {
          id: "legacy",
          label: `Complete ${planet} through the ${house} house passage`,
          scope: "An older complete house-transit write-up that can serve when the sign-specific composition is unavailable.",
          candidateKeys: [`authored/transit-house/${selection.planet}/${selection.house}`]
        },
        {
          id: "house-topic",
          label: `${house} house topic`,
          scope: "The generic life area supplied to the lowest-level template.",
          candidateKeys: [`fallback-vocab/house-topic/${selection.house}`]
        },
        {
          id: "planet-effect",
          label: `${planet} house effect`,
          scope: "The generic action this planet applies to any house topic.",
          candidateKeys: [`fallback-hook/transit-effect-house/${selection.planet}`]
        },
        {
          id: "template",
          label: "House Transit sentence template",
          scope: "The lowest-level sentence order used when no authored house passage is available.",
          candidateKeys: ["fallback-template/transit.house"]
        }
      ]
    }
  ];
}

export function renderHouseTransitPreview(
  selection: HouseTransitSelection,
  resolve: (candidateKeys: string[]) => TransitNatalResolvedSource | null
): HouseTransitPreview {
  const groups = houseTransitSourceGroups(selection);
  const composition = groups[0].sources;
  const resolved = new Map(composition.map((source) => [source.id, resolve(source.candidateKeys)]));
  const requiredMissing = composition.filter((source) => !source.optional && !resolved.get(source.id)).map((source) => source.label);
  const optionalMissing = composition.filter((source) => source.optional && !resolved.get(source.id)).map((source) => source.label);
  const houseCore = resolved.get("house-core");
  const signSynthesis = resolved.get("sign-synthesis");
  const retrograde = resolved.get("retrograde");

  if (houseCore && signSynthesis) {
    const parts = [houseCore.text, signSynthesis.text];
    const sourceKeys = [houseCore.key, signSynthesis.key];
    if (retrograde) {
      parts.push(retrograde.text);
      sourceKeys.push(retrograde.key);
    }
    return {
      headline: houseTransitLabel(selection),
      body: parts.join("\n\n"),
      complete: true,
      sourceKeys,
      missing: [],
      optionalMissing
    };
  }

  const legacy = resolve(groups[1].sources[0].candidateKeys);
  if (legacy) {
    return {
      headline: houseTransitLabel(selection),
      body: legacy.text,
      complete: true,
      sourceKeys: [legacy.key],
      missing: [],
      optionalMissing
    };
  }

  return {
    headline: houseTransitLabel(selection),
    body: "This House Transit is incomplete. Add or repair the missing passages below; the reader app will use its generic House Transit template only when all required fallback ingredients are available.",
    complete: false,
    sourceKeys: [houseCore, signSynthesis, retrograde].filter((source): source is TransitNatalResolvedSource => Boolean(source)).map((source) => source.key),
    missing: requiredMissing,
    optionalMissing
  };
}
