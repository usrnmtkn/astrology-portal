import generator, { type SkyAspectCardResult } from "../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js";
import lintModule from "../../packages/astro-knowledge/scripts/lint-sky-voice.js";
import { skyAspectKernel } from "../cron/generate-sky-aspects.js";
import { placementKernel } from "../cron/generate-sky-placements.js";
import { AdminHttpError } from "./admin-http.js";
import { studioSkyIdentity } from "./sky-studio-identity.js";
export { studioSkyIdentity } from "./sky-studio-identity.js";
/** Called only by an explicit authenticated editor action. Rechecking has no writer call. */
export async function runStudioSkyWriting(key: string, action: "generate" | "recheck", body: string, source?: any): Promise<Partial<SkyAspectCardResult>> {
    const identity = studioSkyIdentity(key);
    const mode = identity.kind === "aspect" ? "collective-aspect-card" : "collective-placement-card";
    const lint = lintModule.lintCard(body, { mode });
    if (action === "recheck")
        return { text: body, lint, judge: null };
    const kernel = identity.kind === "aspect" ? skyAspectKernel(identity.args) : placementKernel(identity.args);
    const options = { withJudge: false, generateFn: kernel.generateFn, generationMetadata: kernel.generationMetadata,
        judgeBeforeProviderCall: kernel.judgeBeforeProviderCall, judgeGovernedPrompt: kernel.judgeGovernedPrompt,
        pairSourceOverride: source };
    const result = identity.kind === "aspect" ? await generator.generateCard(identity.args, options)
        : await generator.generatePlacementCard(identity.args, options);
    if (!result.text?.trim())
        throw new AdminHttpError(409, `${result.note || "Approved writing sources are missing for this configuration."} You can write this draft manually and run writing checks.`);
    return result;
}
