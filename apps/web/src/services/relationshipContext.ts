export type RelationshipContextKey =
  | "romantic"
  | "friendship"
  | "family"
  | "coworkers"
  | "creative"
  | "exes"
  | "complicated";

export type ChosenStatus = "chosen" | "unchosen" | "mixed";

export type AuthorityDirection =
  | "peer"
  | "reader-holds-authority"
  | "other-person-holds-authority"
  | "shared-authority"
  | "context-dependent";

export type RelationshipStatus = "current" | "former" | "intermittent" | "estranged" | "deceased";

export type RelationshipContext = {
  primaryRole: RelationshipContextKey;
  secondaryRoles: RelationshipContextKey[];
  chosenStatus: ChosenStatus;
  authorityDirection: AuthorityDirection;
  relationshipStatus: RelationshipStatus;
  romantic: boolean;
};

export type RelationshipContextOption = {
  key: RelationshipContextKey;
  label: string;
  dashboardKey: `vocab/relationship-context/${RelationshipContextKey}`;
  chosenStatus: ChosenStatus;
  authorityDirection: AuthorityDirection;
  romantic: boolean;
};

const romanticRelationshipRoles = new Set<RelationshipContextKey>([
  "romantic"
]);

const legacyRelationshipRoleMap: Record<string, RelationshipContextKey> = {
  friend: "friendship",
  acquaintance: "friendship",
  partner: "romantic",
  "romantic-partner": "romantic",
  "romantic-partner-ex": "exes",
  "romantic-situationship": "complicated",
  sibling: "family",
  "family-sibling": "family",
  work: "coworkers",
  coworker: "coworkers",
  business: "coworkers",
  "employer-manager": "coworkers",
  "teacher-mentor": "coworkers",
  "neighbor-roommate": "friendship",
  collaborator: "creative",
  other: "complicated"
};

export const relationshipContextOptions: RelationshipContextOption[] = [
  { key: "romantic", label: "Romantic", dashboardKey: "vocab/relationship-context/romantic", chosenStatus: "chosen", authorityDirection: "peer", romantic: true },
  { key: "friendship", label: "Friendship", dashboardKey: "vocab/relationship-context/friendship", chosenStatus: "chosen", authorityDirection: "peer", romantic: false },
  { key: "family", label: "Family", dashboardKey: "vocab/relationship-context/family", chosenStatus: "unchosen", authorityDirection: "context-dependent", romantic: false },
  { key: "coworkers", label: "Coworkers or business partners", dashboardKey: "vocab/relationship-context/coworkers", chosenStatus: "mixed", authorityDirection: "peer", romantic: false },
  { key: "creative", label: "Creative collaborators", dashboardKey: "vocab/relationship-context/creative", chosenStatus: "chosen", authorityDirection: "shared-authority", romantic: false },
  { key: "exes", label: "Exes", dashboardKey: "vocab/relationship-context/exes", chosenStatus: "mixed", authorityDirection: "peer", romantic: false },
  { key: "complicated", label: "It's complicated", dashboardKey: "vocab/relationship-context/complicated", chosenStatus: "mixed", authorityDirection: "context-dependent", romantic: false }
];

const relationshipContextByKey = new Map(relationshipContextOptions.map((option) => [option.key, option]));

export function normalizeRelationshipContextKey(value?: string | null): RelationshipContextKey {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  if (legacyRelationshipRoleMap[normalized]) {
    return legacyRelationshipRoleMap[normalized];
  }

  return relationshipContextByKey.has(normalized as RelationshipContextKey)
    ? normalized as RelationshipContextKey
    : "friendship";
}

export function relationshipContextLabel(value?: string | null) {
  const key = normalizeRelationshipContextKey(value);

  return relationshipContextByKey.get(key)?.label ?? "Friend";
}

export function isExplicitRomanticRelationship(value?: string | null) {
  return romanticRelationshipRoles.has(normalizeRelationshipContextKey(value));
}

export function relationshipContextFromRole(value?: string | null): RelationshipContext {
  const primaryRole = normalizeRelationshipContextKey(value);
  const option = relationshipContextByKey.get(primaryRole) ?? relationshipContextOptions[0];

  return {
    primaryRole,
    secondaryRoles: [],
    chosenStatus: option.chosenStatus,
    authorityDirection: option.authorityDirection,
    relationshipStatus: primaryRole === "exes" ? "former" : "current",
    romantic: option.romantic
  };
}
