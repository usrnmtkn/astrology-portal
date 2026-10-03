import { servingPackageRecords } from "../../api/_lib/serving-package-records";
import { skyPlacementSigns } from "../../apps/admin/src/skyWriteupRelations";
import { skyMoonWriteupKeys, skyMoonWriteupSection } from "../../apps/admin/src/skyMoonWriteup";

// Existing package mirrors, as found in the owner's Studio. All writes in tests
// go to the isolated actual-handler store, never to a connected project.
export function moonStudioRows() {
  return skyPlacementSigns.flatMap(skyMoonWriteupKeys).map((key, index) => {
    const source = structuredClone(servingPackageRecords.get(key)!);
    if (!source) throw new Error(`Missing Moon reader source: ${key}`);
    return {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      content_key: key, headline: `Moon in ${skyMoonWriteupSection(key)!.sign}`,
      body: source.body_you, summary: "", surface: "sky", mode: "in_depth",
      status: "DRAFT", lane: "reference", review_state: "fallback-system-reference",
      provider: "tldrastro-fallback-architecture-v3-sky-placement",
      event_type: "fallback-hook", block_type: "fallback_hook",
      sections: { packageRecord: source }, facts: { fallbackArchitectureV3: true },
      source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", content_role: source.content_role, review_status: source.review_status },
      updated_at: "2026-10-01T00:00:00.000Z", created_at: "2026-10-01T00:00:00.000Z", flags: []
    };
  });
}
