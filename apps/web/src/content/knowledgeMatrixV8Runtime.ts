import type {
  KnowledgeMatrixBuildReport,
  KnowledgeMatrixHouseFile,
  KnowledgeMatrixManifest,
  KnowledgeMatrixTransitFile,
  KnowledgeMatrixV8Resolver
} from "./fallbackArchitectureV3/resolver/knowledgeMatrixV8.browser";
// The package ships a prebuilt ESM bundle. Keep runtime resolver logic package-owned.
// @ts-ignore Package bundle is JavaScript-only; app-facing types live above.
import { createKnowledgeMatrixV8Resolver } from "./fallbackArchitectureV3/dist/tldr-content.js";

export const KNOWLEDGE_MATRIX_V8_VERSION = "v8-owner-approved-locked";
export const KNOWLEDGE_MATRIX_V8_BASE_PATH =
  `/content/knowledge-matrix-v8/${KNOWLEDGE_MATRIX_V8_VERSION}`;

type FetchLike = typeof fetch;

async function fetchJson<T>(fetchImpl: FetchLike, fileName: string): Promise<T> {
  const response = await fetchImpl(`${KNOWLEDGE_MATRIX_V8_BASE_PATH}/${fileName}`);
  if (!response.ok) {
    throw new Error(`Knowledge matrix v8 source unavailable: ${fileName} (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

let runtimePromise: Promise<KnowledgeMatrixV8Resolver> | null = null;

export function loadKnowledgeMatrixV8Runtime(fetchImpl: FetchLike = fetch) {
  runtimePromise ??= Promise.all([
    fetchJson<KnowledgeMatrixManifest>(fetchImpl, "knowledge-matrix-v8-import-manifest.json"),
    fetchJson<KnowledgeMatrixTransitFile>(fetchImpl, "transit-meanings-v8-owner-approved-locked.json"),
    fetchJson<KnowledgeMatrixHouseFile>(fetchImpl, "house-activations-v8-owner-approved-locked.json"),
    fetchJson<KnowledgeMatrixBuildReport>(fetchImpl, "knowledge-matrix-v8-owner-approved-build-report.json")
  ])
    .then(([manifest, transitFile, houseFile, buildReport]) => (
      createKnowledgeMatrixV8Resolver(manifest, transitFile, houseFile, buildReport)
    ))
    .catch((error) => {
      runtimePromise = null;
      throw error;
    });

  return runtimePromise;
}

export async function renderKnowledgeMatrixV8TransitMeaning(
  facts: Parameters<KnowledgeMatrixV8Resolver["renderTransitMeaning"]>[0],
  fetchImpl?: FetchLike
) {
  return (await loadKnowledgeMatrixV8Runtime(fetchImpl)).renderTransitMeaning(facts);
}

export async function renderKnowledgeMatrixV8HouseActivation(
  facts: Parameters<KnowledgeMatrixV8Resolver["renderHouseActivation"]>[0],
  fetchImpl?: FetchLike
) {
  return (await loadKnowledgeMatrixV8Runtime(fetchImpl)).renderHouseActivation(facts);
}
