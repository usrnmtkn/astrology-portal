export const natalInsightTopics = [
  { id: "approach", title: "Approach to life", friendTitle: "Approach to life", planets: ["Sun", "Ascendant"], houses: [], chartRuler: true },
  { id: "emotional-needs", title: "Emotional needs", planets: ["Moon", "Sun"], houses: [] },
  { id: "home-belonging", title: "Home & belonging", planets: ["Imum Coeli", "IC"], houses: [4] },
  { id: "creativity-pleasure", title: "Creativity & pleasure", planets: ["Venus"], houses: [5] },
  { id: "style-expression", title: "Style & self-expression", planets: ["Venus", "Ascendant", "Moon"], houses: [5] },
  { id: "money-resources", title: "Money & resources", planets: [], houses: [2] },
  { id: "work-direction", title: "Work & direction", planets: ["Midheaven", "MC"], houses: [2, 6, 10] }
] as const;


export type NatalInsightId = typeof natalInsightTopics[number]["id"];
export const natalInsightSigns = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;

export function natalInsightContentKey(topicId: NatalInsightId, audience: "you" | "friend") {
  return `cms/natal-insight/${audience === "friend" ? "they" : "you"}/${topicId}`;
}

/** One full guide is shared by the You and Friends reading pages. */
export function natalInsightGuideKey(topicId: NatalInsightId, untimed = false) {
  return `${natalInsightContentKey(topicId, "you")}${topicId === "approach" && untimed ? "/untimed" : ""}`;
}
