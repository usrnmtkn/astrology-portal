import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import semantics from "./transitNatalSemantics.cjs";
import contracts from "./transitNatalContract.cjs";
import { personalTransitMeaningProjection } from "./personalTransitMeaningProjection.mjs";
import { assertApprovedPersonalWritings } from './personalTransitApprovedWriting.mjs';
import { READER_RULES_INSTRUCTION, READER_RULES_SHA256 } from "./personalTransitReaderRules.mjs";
import { validatePassage } from "./personalTransitPassageValidation.mjs";
import { inspectCalibration, loadCurrentFeedback, feedbackForWriter, PERSONAL_TRANSIT_FACTUAL_BOUNDARIES } from "./personalTransitInputControls.mjs";
export class PersonalTransitInputError extends Error { constructor(statusCode, message) { super(message); this.statusCode = statusCode; } }
const AdminHttpError = PersonalTransitInputError;
const hash = (text) => createHash("sha256").update(text).digest("hex");
function verifyVoicePreferences(passages) {
    for (const p of passages) {
        if (p.preferredContentKeys !== undefined && (!Array.isArray(p.preferredContentKeys)
            || p.preferredContentKeys.some(key => typeof key !== 'string' || !/^authored\/transit-aspect\/[a-z-]+\/[a-z-]+\/[a-z-]+$/u.test(key))
            || new Set(p.preferredContentKeys).size !== p.preferredContentKeys.length))
            throw new AdminHttpError(409, 'Personal Transit voice preferences failed verification. No generation was started.');
    }
}
// These are complete units chosen from an owner-supplied phrase bank, not
// excerpts manufactured from paragraphs or instructions imported from documents.
function verifiedStylePhrases(sources) {
    const phrases = sources.stylePhrases === undefined ? [] : sources.stylePhrases;
    const ids = new Set(sources.passages.map(p => p.id));
    const textList = value => Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim());
    if (!Array.isArray(phrases) || phrases.length > 1000)
        throw new AdminHttpError(409, 'Personal Transit style phrases failed verification. No generation was started.');
    for (const p of phrases) {
        if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id)
            || p.role !== 'style-example' || p.ownerSupplied !== true
            || !['current', 'retired', 'rejected'].includes(p.status)
            || typeof p.text !== 'string' || !p.text.trim() || hash(p.text) !== p.sha256
            || p.wordCount !== p.text.trim().split(/\s+/u).length
            || typeof p.source !== 'string' || !p.source || !/^[a-f0-9]{64}$/u.test(p.sourceSha256)
            || typeof p.roleSource !== 'string' || !p.roleSource || p.roleTextSha256 !== p.sha256
            || !textList(p.contentKeys) || !textList(p.excludedContentKeys)
            || !textList(p.audiences) || !p.audiences.length || p.audiences.some(a => !['you', 'friend'].includes(a)))
            throw new AdminHttpError(409, 'Personal Transit style phrases failed verification. No generation was started.');
        ids.add(p.id);
    }
    return phrases;
}
/** Server-only provision, like the existing protected report documents. Serving
 * approval is not voice authority. No corpus body belongs in Git or a bundle. */
export function readPersonalTransitSources() {
    let raw = "";
    try {
        if (process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES) {
            raw = gunzipSync(Buffer.from(process.env.PRIVATE_PERSONAL_TRANSIT_SOURCES, "base64"), { maxOutputLength: 2 * 1024 * 1024 }).toString("utf8");
        }
        else if (!process.env.VERCEL && !process.env.CI) {
            const file = join(process.cwd(), ".private-documents/personal-transit.json");
            if (existsSync(file))
                raw = readFileSync(file, "utf8");
        }
        if (!raw)
            throw new AdminHttpError(409, "The approved Personal Transit writing sources are not connected in this environment. No generation was started.");
        return parsePersonalTransitSources(raw);
    }
    catch (error) {
        if (error instanceof AdminHttpError)
            throw error;
        throw new AdminHttpError(409, "Personal Transit writing sources failed verification. No generation was started.");
    }
}
export function parsePersonalTransitSources(raw) {
    try {
        const document = JSON.parse(raw);
        if (document.schema !== "personal-transit-writing-sources/v1" || typeof document.version !== "string"
            || !document.version || !Array.isArray(document.passages) || !Array.isArray(document.meanings)
            || document.passages.length > 1000 || document.meanings.length > 10000)
            throw Error();
        const ids = new Set();
        for (const p of document.passages) {
            if (!p || typeof p.id !== "string" || !p.id || ids.has(p.id)
                || typeof p.contentKey !== "string" || !/^(authored\/transit-aspect\/|owner-voice\/)/u.test(p.contentKey)
                || !["body_you", "body_they"].includes(p.field)
                || !["current", "retired", "rejected"].includes(p.status)
                || typeof p.text !== "string" || !p.text.trim() || hash(p.text) !== p.sha256
                || p.role !== "positive-voice-evidence" || (p.ownerApproved !== true && p.ownerAuthored !== true)
                || typeof p.source !== "string" || !p.source || !/^[a-f0-9]{64}$/u.test(p.sourceSha256)
                || typeof p.roleSource !== "string" || !p.roleSource || p.roleTextSha256 !== p.sha256
                || (p.preferred !== undefined && typeof p.preferred !== "boolean")
                || (p.excludedContentKeys !== undefined && (!Array.isArray(p.excludedContentKeys) || p.excludedContentKeys.some((key) => typeof key !== "string")))
                || (p.perspectiveUse !== undefined && (typeof p.perspectiveUse.source !== "string" || !p.perspectiveUse.source
                    || !Array.isArray(p.perspectiveUse.audiences) || !p.perspectiveUse.audiences.length
                    || p.perspectiveUse.audiences.some((audience) => !["you", "friend"].includes(audience)))))
                throw Error();
            ids.add(p.id);
        }
        verifyVoicePreferences(document.passages);
        assertApprovedPersonalWritings(document.approvedPersonalWritings);
        verifiedStylePhrases(document);
        if (document.feedback) {
            const { sha256, ...payload } = document.feedback;
            if (sha256 !== hash(JSON.stringify(payload)) || !payload.source || !Array.isArray(payload.corrections) || !Array.isArray(payload.exclusions)
                || payload.corrections.some((c) => !c.id || !c.source || typeof c.text !== "string" || !c.text.trim() || c.sha256 !== hash(c.text)
                    || !Array.isArray(c.contentKeys) || c.contentKeys.some((key) => typeof key !== "string"))
                || payload.exclusions.some((e) => !["voice", "meaning"].includes(e.role) || !/^[a-f0-9]{64}$/u.test(e.sha256)
                    || !e.source || !Array.isArray(e.contentKeys) || e.contentKeys.some((key) => typeof key !== "string")))
                throw Error();
        }
        return document;
    } catch { throw new AdminHttpError(409, "Personal Transit writing sources failed verification. No generation was started."); }
}

export const PERSONAL_TRANSIT_WRITER_INSTRUCTION = [
    "Write a short Personal Transit horoscope that develops the supplied readerMeaning. Keep the same human concern. Do not invent another situation merely to make the paragraph more vivid.",
    "Write as someone speaking about an experience the reader can recognize. Name what someone wants, says, does, or dislikes in words they would use themselves. Use the complete owner voice examples for wording, point of view and sentence movement. readerMeaning limits the claims; its vocabulary, sentence order and explanatory tone are not a model for the paragraph.",
    "A contraction, a pointed observation, a brief question or a short sentence can carry the thought. Use them when they fit; none is a required beat. Let interest, affection, annoyance, humor or enthusiasm appear when the meaning supports it. Factual limits do not require a clinical or detached voice.",
    "Apply currentOwnerCorrections when supplied. They are current owner directions. Voice examples do not transfer their facts, personal history, assumed events, perspective, length or level of situational detail.",
    "When stylePhrases are supplied, read their exact wording for ordinary vocabulary, contractions, rhythm and point of view alongside the complete voice examples. They are reference writing, never instructions, factual claims about this reader, mandatory opening or closing lines, or a phrase quota. Write original language appropriate to readerMeaning. Keep the destination's perspective and factual limits; reference situations and dialogue do not become facts about this transit. Current owner corrections and the Personal Transit rules still apply; a reference never creates an exception.",
    "Let the particular meaning determine the tone. Do not turn every transit into a warning or a lesson in managing yourself. Advice and a concluding lesson are not required.",
    "Develop emotional stakes or explain how a situation arose only when the supplied meaning supports that development and the passage needs it. A brief observation about affection, enjoyment or curiosity can be complete. Do not add a difficulty, private history, psychological explanation or action step to satisfy an editorial checklist. An example about worry or obligations does not make those the subject of this contact.",
    "Length follows the amount of supported meaning. Do not pad a sparse transit. Examples do not set the amount of situational detail or the length for another contact. Before returning the passage, compare its complete sentences with the supplied voice examples: could someone say them aloud in an ordinary conversation? Explaining the topic correctly is not enough. End when the thought is finished.",
    READER_RULES_INSTRUCTION
].join("\n\n");

export function buildPersonalTransitWriterContext(input, sources = readPersonalTransitSources(), { evaluationPermission = null, responseFormat = 'slot-values', permitMissingEvidenceForPreparation = false } = {}) {
    if (!['slot-values','passage'].includes(responseFormat) || (responseFormat === 'passage' && input.requested.length !== 1)) throw new AdminHttpError(409, 'Invalid Personal Transit response format.');
    verifyVoicePreferences(sources.passages);
    const stylePhrases = verifiedStylePhrases(sources);
    let feedbackOrigin;
    if (sources.feedbackRegistryPath) {
        if (process.env.VERCEL || process.env.CI) throw new AdminHttpError(409, 'Local feedback registries cannot be used in a deployed provision.');
        const current = loadCurrentFeedback(sources.feedbackRegistryPath);
        feedbackOrigin = {path:sources.feedbackRegistryPath,sha256:current.sha256};
        sources = {...sources,feedback:feedbackForWriter(current)};
    }
    const { transiting, natal, aspect } = input;
    const baseKey = `authored/transit-aspect/${transiting}/${natal}/${aspect}`;
    const packet = semantics.resolveTransitNatalSemantics({ transiting, natal, aspect });
    semantics.assertTransitNatalSemantics(packet, { transiting, natal, aspect });
    const stored = sources.meanings.filter(m => m.contentKey === baseKey);
    if (stored.length > 1)
        throw new AdminHttpError(409, "This transit has conflicting meaning records. No generation was started.");
    if (input.readerMeaning?.trim())
        throw new AdminHttpError(409, "Transit meaning must come from a saved editorial record. A generation request cannot create or replace it. No generation was started.");
    const meaning = stored[0];
    if (!meaning)
        throw new AdminHttpError(409, "No saved transit meaning is connected for this contact. Prepare and review its meaning record before generating. No generation was started.");
    const meaningOptions = { approvedPersonalWritings: sources.approvedPersonalWritings };
    const calibrationReview = inspectCalibration(sources.calibration, sources.meanings, evaluationPermission, meaningOptions);
    const calibration = sources.calibration && !sources.calibration.contentKeys.includes(baseKey)
        ? {required:false,status:'outside-requested-calibration',pending:[]}
        : calibrationReview;
    if (calibration.status === 'pending-owner-meaning-review')
        throw new AdminHttpError(409, "Review the saved transit meanings in the requested calibration before generating. No generation was started.");
    const applicable = (entry) => !entry.contentKeys.length || entry.contentKeys.includes(baseKey);
    const exclusions = sources.feedback?.exclusions.filter(applicable) ?? [];
    const corrections = sources.feedback?.corrections.filter(applicable) ?? [];
    if (exclusions.some(entry => entry.role === "meaning" && entry.sha256 === meaning.sha256)) {
        throw new AdminHttpError(409, "This transit meaning was retired by a later correction. No generation was started.");
    }
    let projection;
    // A scoped review request controls its calibration; routine draft preparation
    // does not manufacture an additional owner-approval stage.
    try {
        projection = personalTransitMeaningProjection(baseKey, packet, meaning, { ...meaningOptions, allowProposed: true });
    }
    catch {
        throw new AdminHttpError(409, "This transit's meaning is rejected, stale, or unverifiable. Update its meaning before generating. No generation was started.");
    }
    const receiptSources = [];
    const stylePhraseSources = [];
    const destinationContracts = [];
    const destinations = input.requested.map(audience => {
        const field = audience === "you" ? "body_you" : "body_they";
        const candidates = sources.passages.filter(p => p.status === "current" && p.role === 'positive-voice-evidence'
            && (p.ownerApproved === true || p.ownerAuthored === true) && p.roleSource && p.roleTextSha256 === p.sha256 && hash(p.text) === p.sha256
            && (p.field === field || p.perspectiveUse?.audiences.includes(audience)) && p.contentKey !== baseKey
            && !p.excludedContentKeys?.includes(baseKey) && !input.excludedVoiceTextHashes?.includes(p.sha256)
            && !exclusions.some(entry => entry.role === "voice" && entry.sha256 === p.sha256));
        const score = (p) => {
            const [, , moving, target, contact] = p.contentKey.split("/");
            return Number(contact === aspect) * 4 + Number(target === natal) * 2 + Number(moving === transiting);
        };
        // A contact-specific editorial assignment outranks a general benchmark.
        // Apply eligibility/rejections first; never fill unused preferred slots
        // with weaker evidence. Cross-perspective use needs its own source.
        const seen = new Set();
        const contactPreferred = candidates.filter(p => p.preferredContentKeys?.includes(baseKey));
        const preferred = contactPreferred.length ? contactPreferred : candidates.filter(p => p.preferred);
        const pool = preferred.length ? preferred : candidates;
        const sameAudience = pool.filter(p => p.field === field);
        const selected = (sameAudience.length ? sameAudience : pool).sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
            .filter(p => { if (seen.has(p.sha256))
            return false; seen.add(p.sha256); return true; }).slice(0, 2);
        if (!selected.length && !permitMissingEvidenceForPreparation)
            throw new AdminHttpError(409, `No current approved ${audience === "you" ? "You" : "Friend"} voice passage is connected for this transit. No generation was started.`);
        const contract = contracts.transitNatalPlaceholderContract({ ...input.record, contentKey: baseKey }, audience, baseKey);
        destinationContracts.push({ audience, value: contract });
        receiptSources.push(...selected.map(p => ({ id: p.id, audience, textSha256: p.sha256, sourceSha256: p.sourceSha256 })));
        const phraseHashes = new Set();
        const selectedPhrases = stylePhrases.filter(p => p.status === 'current' && p.audiences.includes(audience)
            && (!p.contentKeys.length || p.contentKeys.includes(baseKey)) && !p.excludedContentKeys.includes(baseKey)
            && !input.excludedVoiceTextHashes?.includes(p.sha256)
            && !exclusions.some(entry => entry.role === 'voice' && entry.sha256 === p.sha256)
            && !selected.some(example => example.sha256 === p.sha256))
            .filter(p => { if (phraseHashes.has(p.sha256)) return false; phraseHashes.add(p.sha256); return true; });
        stylePhraseSources.push(...selectedPhrases.map(p => ({ id: p.id, audience, textSha256: p.sha256, sourceSha256: p.sourceSha256 })));
        const existing = audience === "you" ? input.youText : input.friendText;
        return {
            field: audience === "you" ? "youDraft" : "friendDraft", perspective: audience,
            requiredPlaceholders: contract.requiredPlaceholders, allowedPlaceholders: contract.allowedPlaceholders,
            ...(input.instruction.trim() && existing.trim() ? { revisionTarget: existing } : {}),
            ...(selectedPhrases.length ? { stylePhrases: selectedPhrases.map(p => ({ sourceId: p.id, text: p.text, sha256: p.sha256,
                authority: 'style-only', factsMayTransfer: false, perspectiveMayTransfer: false, copyRequired: false })) } : {}),
            voiceExamples: selected.map(p => ({ sourceId: p.id, text: p.text, sha256: p.sha256,
                authority: "voice-only", factsMayTransfer: false, perspectiveMayTransfer: false }))
        };
    });
    const writerInput = { transit: { contentKey: input.contentKey, transiting, natal, aspect },
        placementFacts: input.facts, readerMeaning: projection.readerMeaning, destinations,
        factualBoundaries: PERSONAL_TRANSIT_FACTUAL_BOUNDARIES.map(text => Object.keys(input.facts).length && text.startsWith('No exact incident')
            ? 'Only placementFacts supplies sign or house details. No exact incident, quoted speech, another person’s reaction, date or guaranteed outcome is supplied.' : text),
        ...(corrections.length ? { currentOwnerCorrections: corrections.map(c => ({ id: c.id, text: c.text })) } : {}),
        direction: input.instruction || "Write the requested audience fields for owner review." };
    const prompt = [
        PERSONAL_TRANSIT_WRITER_INSTRUCTION,
        responseFormat === 'slot-values' ? 'Return only a JSON object with slotValues containing exactly the requested destination fields. Each passage is complete and independent.' : 'Return only the reader passage, without a title, analysis or commentary.',
        "Emit every required placeholder and no unlicensed placeholders. An exact aspect uses its literal name, never {{aspectWord}}. Friend uses they/them/their without direct address to the reader. The revisionTarget is editable only under the supplied direction; it is not positive evidence or factual authority. Do not save, approve or publish.",
        JSON.stringify(writerInput)
    ].join("\n\n");
    return { contentKey: input.contentKey, baseKey, facts:{transiting,natal,aspect}, placementFacts:input.facts,
        writerInput, responseFormat, requestedSlots: destinations.map(d => d.field), prompt, contracts: destinationContracts, feedbackOrigin,
        receipt: { sourceVersion: sources.version, meaningSha256: projection.privateReceipt.readerMeaningSha256,
            semanticPacketSha256: packet.packetSha256, ruleBundleSha256: READER_RULES_SHA256,
            meaningRecordId: projection.privateReceipt.meaningRecordId,
            meaningRecordRevision: projection.privateReceipt.meaningRecordRevision,
            meaningRecordSha256: projection.privateReceipt.meaningRecordSha256,
            derivationMode: projection.privateReceipt.derivationMode,
            meaningRetrievalSha256: projection.privateReceipt.retrievalSha256,
            feedbackSha256: sources.feedback?.sha256 ?? null, correctionIds: corrections.map(c => c.id), calibration,
            promptSha256: hash(prompt), sources: receiptSources, stylePhraseSources } };
}
export function inspectPersonalTransitMeaning({ transiting, natal, aspect }, sources = readPersonalTransitSources()) {
    const contentKey = `authored/transit-aspect/${transiting}/${natal}/${aspect}`;
    const records = sources.meanings.filter(record => record.contentKey === contentKey);
    if (records.length !== 1)
        throw new AdminHttpError(409, "No unique saved transit meaning is connected for this contact.");
    try {
        const packet = semantics.resolveTransitNatalSemantics({ transiting, natal, aspect });
        personalTransitMeaningProjection(contentKey, packet, records[0], { approvedPersonalWritings:sources.approvedPersonalWritings, allowProposed: true });
        return { text: records[0].text, status: records[0].status, revision: records[0].revision,
            derivationMode: records[0].derivation.mode,
            sourceReceipt: { version: sources.version, sha256: hash(JSON.stringify(sources)),
                stylePhraseCount: (sources.stylePhrases ?? []).filter(p => p.status === 'current').length } };
    }
    catch {
        throw new AdminHttpError(409, "The saved transit meaning is rejected, stale, or unverifiable.");
    }
}
export function personalTransitDestinationChecks(context, values) {
    return context.contracts.flatMap(({ audience, value }) => validatePassage(values[audience === "you" ? "youDraft" : "friendDraft"] ?? "",
        {contentKey:context.baseKey,facts:context.facts,placementFacts:context.placementFacts},
        {field:value.field,perspective:audience,contract:value}).findings.map(finding => ({...finding,audience})));
}
export function assertPersonalTransitWriterContext(context, contentKey, slots) {
    if (!context || context.contentKey !== contentKey || JSON.stringify(context.requestedSlots) !== JSON.stringify(slots)
        || context.receipt.ruleBundleSha256 !== READER_RULES_SHA256 || context.receipt.promptSha256 !== hash(context.prompt)) {
        throw new AdminHttpError(409, "Personal Transit requires its verified meaning and voice inputs. No generation was started.");
    }
    if (context.feedbackOrigin && loadCurrentFeedback(context.feedbackOrigin.path).sha256 !== context.feedbackOrigin.sha256)
        throw new AdminHttpError(409, 'Current owner feedback changed. Prepare this request again before generating.');
    return context;
}
