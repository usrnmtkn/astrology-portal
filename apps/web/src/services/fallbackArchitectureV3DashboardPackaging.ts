export type FallbackArchitectureV3DashboardDestination = "skip" | "authored" | "hook" | "vocabulary" | "template";

export function fallbackArchitectureV3DashboardPackageDestination({
  contentKey,
  contentType,
  role
}: {
  contentKey: string;
  contentType: string;
  role: string;
}): FallbackArchitectureV3DashboardDestination {
  if (contentType === "source-material" || role === "fallback_source" || role === "source_material") {
    return "skip";
  }
  if (contentKey.startsWith("fallback-hook/") && role === "full_copy") {
    return "hook";
  }
  if (contentType === "authored-content" || role === "full_copy") {
    return "authored";
  }
  if (role === "fallback_hook") return "hook";
  if (role === "vocabulary") return "vocabulary";
  if (role === "template") return "template";
  return "skip";
}
