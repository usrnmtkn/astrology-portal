import type { GeneratedContentRow } from "../services/generatedContent";
import { contentPublication, publicationAllowsContent, publicationRestoresBaseline } from "./contentPublicationState";
import { fillFrictionFlowTemplate, frictionFlowDefaults, FRICTION_FLOW_PREFIX, type FrictionFlowCopyName } from "./frictionFlowCatalog";

export type FrictionFlowCopy = (name: FrictionFlowCopyName, slots?: Record<string, string | number>) => string;

/** Keep existing UI defaults until first publication. Never resurrect them over
 * a retired, missing, stale or invalid published revision. Drafts cannot serve. */
export function frictionFlowCopy(rows: readonly GeneratedContentRow[] = []): FrictionFlowCopy {
  return (name, slots = {}) => {
    const key = FRICTION_FLOW_PREFIX + name;
    const publication = contentPublication(key);
    const baseline = () => fillFrictionFlowTemplate(key, frictionFlowDefaults[name], slots) ?? "";
    if (publication && publicationRestoresBaseline(publication)) return baseline();
    if (publication?.state === "retired") return "";
    const row = rows.find(row => row.content_key === key && row.status === "LIVE" && row.lane === "serving" && !row.review_state);
    if (row && publicationAllowsContent(key, row.id, row.updated_at)) return fillFrictionFlowTemplate(key, row.body, slots) ?? "";
    return publication ? "" : baseline();
  };
}
