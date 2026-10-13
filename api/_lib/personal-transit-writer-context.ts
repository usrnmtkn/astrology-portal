import { AdminHttpError } from "./admin-http.js";
import * as core from "../../src/astro-writing/personalTransitWriterContext.mjs";
import contracts from "../../src/astro-writing/transitNatalContract.cjs";
type Audience = "you" | "friend";
type VoicePassage = {
  id: string; contentKey: string; field: "body_you" | "body_they"; text: string; sha256: string;
  source: string; sourceSha256: string; ownerApproved: boolean; ownerAuthored?: boolean;
  role: "positive-voice-evidence"; status: "current" | "retired" | "rejected";
  roleSource: string; roleTextSha256: string;
  preferred?: boolean; preferredContentKeys?: string[]; excludedContentKeys?: string[];
  perspectiveUse?: { audiences: Audience[]; source: string };
};
type EditorialFeedback = { source: string; sha256: string;
  corrections: Array<{ id: string; text: string; sha256: string; source: string; contentKeys: string[] }>;
  exclusions: Array<{ role: "voice" | "meaning"; sha256: string; source: string; contentKeys: string[] }> };
type StylePhrase = {
  id: string; text: string; sha256: string; wordCount: number;
  role: "style-example"; ownerSupplied: true; status: "current" | "retired" | "rejected";
  source: string; sourceSha256: string; roleSource: string; roleTextSha256: string;
  contentKeys: string[]; excludedContentKeys: string[]; audiences: Audience[];
};
export type PersonalTransitSources = {
  schema: "personal-transit-writing-sources/v1"; version: string;
  passages: VoicePassage[]; meanings: Array<Record<string, unknown>>;
  stylePhrases?: StylePhrase[];
  feedback?: EditorialFeedback;
  feedbackRegistryPath?: string;
  calibration?: {required: boolean; id: string; source: string; contentKeys: string[]};
};
export type PersonalTransitWriterContext = {
  contentKey: string; requestedSlots: string[]; prompt: string;
  baseKey: string; facts: {transiting: string; natal: string; aspect: string}; placementFacts: Record<string, unknown>;
  writerInput: Record<string, unknown>; responseFormat: string;
  feedbackOrigin?: {path: string; sha256: string};
  contracts: Array<{ audience: Audience; value: ReturnType<typeof contracts.transitNatalPlaceholderContract> }>;
  receipt: { sourceVersion: string; meaningSha256: string; semanticPacketSha256: string;
    ruleBundleSha256: string; promptSha256: string; contextSha256?: string;
    meaningRecordId: string; meaningRecordRevision: number; meaningRecordSha256: string;
    derivationMode: string; meaningRetrievalSha256: string;
    feedbackSha256?: string; correctionIds: string[];
    stylePhraseSources: Array<{ id: string; audience: Audience; textSha256: string; sourceSha256: string }>;
    sources: Array<{ id: string; audience: Audience; textSha256: string; sourceSha256: string }> };
};


function asAdmin<T>(action: () => T): T {
  try { return action(); } catch (error) {
    if (error instanceof core.PersonalTransitInputError) throw new AdminHttpError(error.statusCode, error.message);
    throw error;
  }
}
export const readPersonalTransitSources = (): PersonalTransitSources => asAdmin(() => core.readPersonalTransitSources());
export const buildPersonalTransitWriterContext = (input: Parameters<typeof core.buildPersonalTransitWriterContext>[0], sources?: PersonalTransitSources, options = {}): PersonalTransitWriterContext => asAdmin(() => core.buildPersonalTransitWriterContext(input, sources, options));
export const inspectPersonalTransitMeaning = (input: {transiting: string; natal: string; aspect: string}) => asAdmin(() => core.inspectPersonalTransitMeaning(input));
export const personalTransitDestinationChecks = (context: PersonalTransitWriterContext, values: Record<string, string>) => core.personalTransitDestinationChecks(context, values);
export const assertPersonalTransitWriterContext = (context: PersonalTransitWriterContext | undefined, key: string, slots: string[]): PersonalTransitWriterContext => asAdmin(() => core.assertPersonalTransitWriterContext(context, key, slots));
