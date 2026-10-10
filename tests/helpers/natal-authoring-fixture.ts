// Synthetic chart and account data only.
export const natalAuthoringUser = "11111111-1111-4111-8111-111111111111";
export const natalAuthoringChart = "22222222-2222-4222-8222-222222222222";
export const natalAuthoringVersion = "2026-10-06T00:00:00.000Z";
export const natalAuthoringSky = {
  positions: [
    { planet: "Sun", sign: "Aries", degree: 12, longitude: 12, house: 1, motion: "direct" },
    { planet: "Moon", sign: "Cancer", degree: 14, longitude: 104, house: 4, motion: "direct" },
    { planet: "Venus", sign: "Taurus", degree: 10, longitude: 40, house: 2, motion: "direct" },
    { planet: "Mars", sign: "Gemini", degree: 8, longitude: 68, house: 3, motion: "direct" },
    { planet: "Mercury", sign: "Pisces", degree: 24, longitude: 354, house: 12, motion: "direct" },
    { planet: "Saturn", sign: "Capricorn", degree: 14, longitude: 284, house: 10, motion: "direct" }
  ],
  ascendant: "Aries", ascendantLongitude: 5, midheavenLongitude: 275, birthTimeKnown: true,
  aspects: [{ from: "Moon", to: "Saturn", type: "opposition", orb: 0 }], calculationProvenance: { calculationVersion: "synthetic-natal-authoring-v1" }
};
export const natalAuthoringFixtures = {
  user_profiles: [{ user_id: natalAuthoringUser, updated_at: natalAuthoringVersion,
    data: { profile: { name: "Synthetic reader", charts: [{ birthDate: "1990-04-02", birthTime: "12:00 PM", birthLocation: { label: "Boston", latitude: 42.36, longitude: -71.06, timeZone: "America/New_York" } }] } } }],
  manual_charts: [{ id: natalAuthoringChart, owner_user_id: natalAuthoringUser, display_name: "Synthetic friend", relationship_type: "friend",
    birth_date: "1990-04-02", birth_time: "12:00", birth_time_unknown: false, natal_chart: natalAuthoringSky, updated_at: natalAuthoringVersion }]
};
