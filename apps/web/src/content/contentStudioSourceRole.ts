/** Reference sources are editorial inputs, never exact reader copy. */
export function isContentStudioReferenceSource(contentKey: string, snapshot: Record<string, unknown>) {
  return contentKey.startsWith("source/") || ["fallback_source", "source_material"].includes(snapshot.content_role as string);
}
