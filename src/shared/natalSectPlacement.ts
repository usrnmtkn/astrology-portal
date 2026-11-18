export const natalSectSigns = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"] as const;
export type NatalSectPlacement = {
  audience: "you" | "they";
  planet: "jupiter" | "venus" | "mars" | "saturn";
  sign: string;
  house?: number;
  sect: "day" | "night";
};

const pattern = /^cms\/natal-planet-sect\/(you|they)\/(jupiter|venus|mars|saturn)\/([a-z]+)(?:\/house-([1-9]|1[0-2]))?\/(day|night)$/u;

export function parseNatalSectPlacementKey(key: string): NatalSectPlacement | null {
  const match = pattern.exec(key);
  if (!match || !natalSectSigns.includes(match[3] as typeof natalSectSigns[number])) return null;
  return { audience: match[1] as NatalSectPlacement["audience"], planet: match[2] as NatalSectPlacement["planet"], sign: match[3],
    ...(match[4] ? { house: Number(match[4]) } : {}), sect: match[5] as NatalSectPlacement["sect"] };
}

export function natalSectPlacementKey(value: NatalSectPlacement): string {
  const key = `cms/natal-planet-sect/${value.audience}/${value.planet}/${value.sign}${value.house === undefined ? "" : `/house-${value.house}`}/${value.sect}`;
  if (!parseNatalSectPlacementKey(key)) throw new Error("Choose an audience, planet, sign, optional whole-sign house and sect.");
  return key;
}
