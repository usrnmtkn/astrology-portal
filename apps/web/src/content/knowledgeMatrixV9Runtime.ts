import type {
  KnowledgeMatrixBuildReport,
  KnowledgeMatrixManifest,
  KnowledgeMatrixRowsFile,
  KnowledgeMatrixV9Resolver
} from "./fallbackArchitectureV3/resolver/knowledgeMatrixV9.browser";
// The package ships a prebuilt ESM bundle. Keep runtime resolver logic package-owned.
// @ts-ignore Package bundle is JavaScript-only; app-facing types live above.
import { createKnowledgeMatrixV9Resolver } from "./fallbackArchitectureV3/dist/tldr-content.js";

export const KNOWLEDGE_MATRIX_V9_VERSION = "v9-owner-approved-governance-labeled";
export const KNOWLEDGE_MATRIX_V9_BASE_PATH =
  `/content/knowledge-matrix-v9/${KNOWLEDGE_MATRIX_V9_VERSION}`;

type FetchLike = typeof fetch;

async function fetchJson<T>(fetchImpl: FetchLike, fileName: string): Promise<T> {
  const response = await fetchImpl(`${KNOWLEDGE_MATRIX_V9_BASE_PATH}/${fileName}`);
  if (!response.ok) {
    throw new Error(`Knowledge matrix v9 source unavailable: ${fileName} (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

let runtimePromise: Promise<KnowledgeMatrixV9Resolver> | null = null;

export function loadKnowledgeMatrixV9Runtime(fetchImpl: FetchLike = fetch) {
  runtimePromise ??= Promise.all([
    fetchJson<KnowledgeMatrixManifest>(fetchImpl, "knowledge-matrix-v9-import-manifest.json"),
    fetchJson<KnowledgeMatrixRowsFile>(fetchImpl, "knowledge-matrix-v9-owner-approved-rows.json"),
    fetchJson<KnowledgeMatrixBuildReport>(fetchImpl, "knowledge-matrix-v9-build-report.json")
  ])
    .then(([manifest, rowsFile, buildReport]) => (
      createKnowledgeMatrixV9Resolver(manifest, rowsFile, buildReport)
    ))
    .catch((error) => {
      runtimePromise = null;
      throw error;
    });

  return runtimePromise;
}

export async function renderKnowledgeMatrixV9TransitMeaning(
  facts: Parameters<KnowledgeMatrixV9Resolver["renderTransitMeaning"]>[0],
  fetchImpl?: FetchLike
) {
  return (await loadKnowledgeMatrixV9Runtime(fetchImpl)).renderTransitMeaning(facts);
}

export async function renderKnowledgeMatrixV9HouseActivation(
  facts: Parameters<KnowledgeMatrixV9Resolver["renderHouseActivation"]>[0],
  fetchImpl?: FetchLike
) {
  return (await loadKnowledgeMatrixV9Runtime(fetchImpl)).renderHouseActivation(facts);
}
