export type RelationshipContextKey =
  | "friend"
  | "acquaintance"
  | "romantic-partner"
  | "ex"
  | "situationship"
  | "family"
  | "coworker"
  | "roommate-neighbor"
  | "business"
  | "teacher-mentor"
  | "employer-manager";

export type RelationshipContextGroup = "friendship" | "romance" | "family" | "work" | "home" | "neutral";

export type RelationshipStorageKey =
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
  "romantic-partner",
  "situationship"
]);

const legacyRelationshipRoleMap: Record<string, RelationshipContextKey> = {
  friendship: "friend",
  friends: "friend",
  friend: "friend",
  acquaintance: "acquaintance",
  romantic: "romantic-partner",
  partner: "romantic-partner",
  "romantic-partner": "romantic-partner",
  "romantic-partner-ex": "ex",
  "romantic-situationship": "situationship",
  complicated: "situationship",
  exes: "ex",
  sibling: "family",
  "family-sibling": "family",
  work: "coworker",
  coworkers: "coworker",
  coworker: "coworker",
  creative: "business",
  collaborator: "business",
  business: "business",
  "employer-manager": "employer-manager",
  manager: "employer-manager",
  mentor: "teacher-mentor",
  "teacher-mentor": "teacher-mentor",
  "neighbor-roommate": "roommate-neighbor",
  "roommate-neighbor": "roommate-neighbor",
  roommate: "roommate-neighbor",
  neighbor: "roommate-neighbor",
  other: "friend"
};

export const relationshipContextOptions: RelationshipContextOption[] = [
  { key: "friend", label: "Friend", dashboardKey: "vocab/relationship-context/friend", chosenStatus: "chosen", authorityDirection: "peer", romantic: false },
  { key: "acquaintance", label: "Acquaintance", dashboardKey: "vocab/relationship-context/acquaintance", chosenStatus: "mixed", authorityDirection: "peer", romantic: false },
  { key: "romantic-partner", label: "Romantic partner", dashboardKey: "vocab/relationship-context/romantic-partner", chosenStatus: "chosen", authorityDirection: "peer", romantic: true },
  { key: "ex", label: "Ex", dashboardKey: "vocab/relationship-context/ex", chosenStatus: "mixed", authorityDirection: "peer", romantic: false },
  { key: "situationship", label: "Situationship", dashboardKey: "vocab/relationship-context/situationship", chosenStatus: "mixed", authorityDirection: "context-dependent", romantic: true },
  { key: "family", label: "Family", dashboardKey: "vocab/relationship-context/family", chosenStatus: "unchosen", authorityDirection: "context-dependent", romantic: false },
  { key: "coworker", label: "Coworker", dashboardKey: "vocab/relationship-context/coworker", chosenStatus: "mixed", authorityDirection: "peer", romantic: false },
  { key: "business", label: "Business partner", dashboardKey: "vocab/relationship-context/business", chosenStatus: "chosen", authorityDirection: "shared-authority", romantic: false },
  { key: "teacher-mentor", label: "Teacher or mentor", dashboardKey: "vocab/relationship-context/teacher-mentor", chosenStatus: "mixed", authorityDirection: "other-person-holds-authority", romantic: false },
  { key: "employer-manager", label: "Manager", dashboardKey: "vocab/relationship-context/employer-manager", chosenStatus: "mixed", authorityDirection: "other-person-holds-authority", romantic: false },
  { key: "roommate-neighbor", label: "Roommate or neighbor", dashboardKey: "vocab/relationship-context/roommate-neighbor", chosenStatus: "mixed", authorityDirection: "peer", romantic: false }
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
    : "friend";
}

export function relationshipContextStorageKey(value?: string | null): RelationshipStorageKey {
  const key = normalizeRelationshipContextKey(value);

  if (key === "romantic-partner") return "romantic";
  if (key === "ex") return "exes";
  if (key === "situationship") return "complicated";
  if (key === "family") return "family";
  if (key === "coworker" || key === "teacher-mentor" || key === "employer-manager") return "coworkers";
  if (key === "business") return "creative";

  return "friendship";
}

export function relationshipContextLabel(value?: string | null) {
  const key = normalizeRelationshipContextKey(value);

  return relationshipContextByKey.get(key)?.label ?? "Friend";
}

export function isExplicitRomanticRelationship(value?: string | null) {
  return romanticRelationshipRoles.has(normalizeRelationshipContextKey(value));
}

export function relationshipContextGroup(value?: string | null): RelationshipContextGroup {
  const key = normalizeRelationshipContextKey(value);

  if (key === "friend" || key === "acquaintance") return "friendship";
  if (key === "romantic-partner" || key === "ex" || key === "situationship") return "romance";
  if (key === "family") return "family";
  if (key === "coworker" || key === "business" || key === "teacher-mentor" || key === "employer-manager") return "work";
  if (key === "roommate-neighbor") return "home";

  return "neutral";
}

export function relationshipContextFromRole(value?: string | null): RelationshipContext {
  const primaryRole = normalizeRelationshipContextKey(value);
  const option = relationshipContextByKey.get(primaryRole) ?? relationshipContextOptions[0];

  return {
    primaryRole,
    secondaryRoles: [],
    chosenStatus: option.chosenStatus,
    authorityDirection: option.authorityDirection,
    relationshipStatus: primaryRole === "ex" ? "former" : "current",
    romantic: option.romantic
  };
}
