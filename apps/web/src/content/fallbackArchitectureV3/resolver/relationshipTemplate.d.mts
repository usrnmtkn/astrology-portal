export type RelationshipPerspective = "you" | "friend";
export function relationshipTemplatePair(row: unknown): { you: unknown; friend: unknown };
export function missingRelationshipPerspectives(row: unknown): RelationshipPerspective[];
export function interpolateRelationshipTemplate(template: string, variables: Record<string, string>): string;
export function resolveRelationshipTemplate(row: unknown, audience: RelationshipPerspective, variables: Record<string, string>): string;
export function resolveBondEffect(hooks: Map<string, unknown>, facts: {
  transiting: string; aspect: string; family: string; variant?: number | null;
  endpointOwner: string; otherName: string;
}, SourceGapError: new (message: string) => Error): { contentKey: string; effect: string };
