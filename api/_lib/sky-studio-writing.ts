import generator, { type SkyAspectCardResult } from "../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js";
import lintModule from "../../packages/astro-knowledge/scripts/lint-sky-voice.js";
import { skyAspectKernel } from "../cron/generate-sky-aspects.js";
import { placementKernel } from "../cron/generate-sky-placements.js";
import { AdminHttpError } from "./admin-http.js";
import { studioSkyIdentity } from "./sky-studio-identity.js";
import { buildSkyWritingMemory } from "./sky-writing-memory.mjs";
import { activeStudioFeedback, selectStudioFeedback, studioFeedbackEnabled } from "./studio-memory-feedback.js";
export { studioSkyIdentity } from "./sky-studio-identity.js";
/** Called only by an explicit authenticated editor action. Rechecking has no writer call. */
export async function runStudioSkyWriting(key: string, action: "generate" | "recheck", body: string, source?: any): Promise<Partial<SkyAspectCardResult> & { memoryReceipt?: ReturnType<typeof buildSkyWritingMemory>["receipt"] }> {
    const identity = studioSkyIdentity(key);
    const mode = identity.kind === "aspect" ? "collective-aspect-card" : "collective-placement-card";
    const lint = lintModule.lintCard(body, { mode });
    if (action === "recheck")
        return { text: body, lint, judge: null };
    // Read live corrections before any paid work. Failure is explicit, never an empty-success fallback.
    const feedback = studioFeedbackEnabled() ? selectStudioFeedback(await activeStudioFeedback(), key) : null;
    const memory = buildSkyWritingMemory(identity, { studioCorrections: feedback?.corrections ?? [] });
    if (feedback) (memory.receipt as any).studioFeedback = {
        ...feedback.receipt,
        selected: feedback.receipt.selected.filter(item => memory.receipt.selected.some(ref => ref.memoryId === item.memoryId)),
        excluded: [...feedback.receipt.excluded, ...memory.receipt.excluded.filter(item => item.memoryId.startsWith('studio-'))],
        promptSha256: memory.receipt.promptSha256,
    };
    const kernel = identity.kind === "aspect" ? skyAspectKernel(identity.args) : placementKernel(identity.args);
    const options = { withJudge: false,
        generateFn: (prompt: string, options?: Record<string, unknown>) => kernel.generateFn(`${prompt}\n\n${memory.prompt}`, options),
        generationMetadata: kernel.generationMetadata,
        judgeBeforeProviderCall: kernel.judgeBeforeProviderCall, judgeGovernedPrompt: kernel.judgeGovernedPrompt,
        pairSourceOverride: source };
    const result = identity.kind === "aspect" ? await generator.generateCard(identity.args, options)
        : await generator.generatePlacementCard(identity.args, options);
    if (!result.text?.trim())
        throw new AdminHttpError(409, `${result.note || "Approved writing sources are missing for this configuration."} You can write this draft manually and run writing checks.`);
    return { ...result, memoryReceipt: memory.receipt };
}
