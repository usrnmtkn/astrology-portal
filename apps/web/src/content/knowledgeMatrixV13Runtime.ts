import type {
  KnowledgeMatrixV13File,
  KnowledgeMatrixV13Resolver
} from "./fallbackArchitectureV3/resolver/knowledgeMatrixV13.browser";
// The package ships a prebuilt ESM bundle. Keep runtime resolver logic package-owned.
// @ts-ignore Package bundle is JavaScript-only; app-facing types live above.
import { createKnowledgeMatrixV13Resolver } from "./fallbackArchitectureV3/dist/tldr-content.js";

export const KNOWLEDGE_MATRIX_V13_VERSION = "v13-direct-language-owner-approved";
export const KNOWLEDGE_MATRIX_V13_BASE_PATH =
  `/content/knowledge-matrix-v13/${KNOWLEDGE_MATRIX_V13_VERSION}`;

type FetchLike = typeof fetch;

let runtimePromise: Promise<KnowledgeMatrixV13Resolver> | null = null;

export function loadKnowledgeMatrixV13Runtime(fetchImpl: FetchLike = fetch) {
  runtimePromise ??= fetchImpl(`${KNOWLEDGE_MATRIX_V13_BASE_PATH}/knowledge-matrix-v13-owner-approved-locked.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Knowledge matrix V13 source unavailable (${response.status}).`);
      }
      return response.json() as Promise<KnowledgeMatrixV13File>;
    })
    .then((file) => createKnowledgeMatrixV13Resolver(file))
    .catch((error) => {
      runtimePromise = null;
      throw error;
    });
  return runtimePromise;
}

export async function renderKnowledgeMatrixV13Placement(
  facts: Parameters<KnowledgeMatrixV13Resolver["renderNatalPlacement"]>[0],
  fetchImpl?: FetchLike
) {
  return (await loadKnowledgeMatrixV13Runtime(fetchImpl)).renderNatalPlacement(facts);
}

export async function renderKnowledgeMatrixV13NatalAspect(
  facts: Parameters<KnowledgeMatrixV13Resolver["renderNatalAspect"]>[0],
  fetchImpl?: FetchLike
) {
  return (await loadKnowledgeMatrixV13Runtime(fetchImpl)).renderNatalAspect(facts);
}

export async function renderKnowledgeMatrixV13WorkbookKey(key: string, fetchImpl?: FetchLike) {
  return (await loadKnowledgeMatrixV13Runtime(fetchImpl)).renderWorkbookKey(key);
}
