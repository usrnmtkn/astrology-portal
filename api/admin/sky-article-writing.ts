import type { IncomingMessage, ServerResponse } from 'node:http';
import { isContentAdminAuthorized } from '../_lib/admin-auth.js';
import {
  AdminHttpError,
  adminErrorMessage,
  adminErrorStatus,
  readAdminJsonBody,
  sendAdminJson,
  sendAdminMethodNotAllowed,
} from '../_lib/admin-http.js';
import { generateSkyArticleTemplateSlots } from '../_lib/content-generation.js';
import { currentSkyFacts } from '../_lib/current-sky.js';
import { loadLocalWebEnv } from '../_lib/local-env.js';
import { contentGenerationProvider, type GenerationProvider } from '../_lib/provider-config.js';

loadLocalWebEnv();
export const maxDuration = 300;

const articleFields = new Set(['placementArticle', 'placementArticleDirect', 'placementArticleRetrograde']);
const token = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase().replace(/[-\s]+/gu, '_') : '';
const signToken = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase().replace(/[_\s]+/gu, '-') : '';
const title = (value: string) => value.split(/[-_]/gu).map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(' ');
const evergreenOccurrenceRule = 'The selected occurrence is validation context only. Do not put its year, entry or exit dates, current-year aspects, or other occurrence-specific facts into the evergreen prose. Preserve a calculated fact only when it already appears as a valid literal template variable in the current article.';

function validDate(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new AdminHttpError(400, 'referenceDate must be YYYY-MM-DD.');
  }
  const instant = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== value) {
    throw new AdminHttpError(400, 'referenceDate must be a valid date.');
  }
  return instant;
}

function skyWritingScope(planet: string, sign: string) {
  const planetName = title(planet);
  const signName = title(sign);
  if (planet === 'sun') {
    return [
      `This is evergreen zodiac-season writing about the period when the Sun moves through ${signName} in the collective sky.`,
      `It is written for every reader living through ${signName} season, not for a person who has a natal Sun in ${signName}.`,
      `Never imply that the reader is a ${signName}, has the Sun in ${signName}, or possesses fixed ${signName} traits.`,
      'Second person may describe temporary experiences, pressures, choices, routines, or observations during the season only.',
      `The first paragraph must explicitly anchor the copy in ${signName} season or the Sun in ${signName}.`,
      `Do not turn ${signName} symbolism into the reader's personality.`,
      'Never use the word whether.',
    ].join(' ');
  }
  return [
    `This is evergreen current-sky writing about the period when ${planetName} moves through ${signName}.`,
    `It is transit writing for all readers during that sky placement, not natal ${planetName}-in-${signName} personality copy.`,
    'Second person may describe temporary experiences or choices during the transit, never fixed traits or identity.',
    'Never use the word whether.',
  ].join(' ');
}

function articleJob(field: string, planet: string, sign: string) {
  const planetName = title(planet);
  const signName = title(sign);
  const scope = skyWritingScope(planet, sign);
  if (planet === 'sun') {
    return `Revise one complete evergreen ${signName} season article passage about the Sun moving through ${signName}. ${scope} ${evergreenOccurrenceRule}`;
  }
  if (field === 'placementArticleRetrograde') {
    return `Revise one complete evergreen retrograde current-sky article passage about ${planetName} moving through ${signName}. ${scope} ${evergreenOccurrenceRule}`;
  }
  if (field === 'placementArticleDirect') {
    return `Revise one complete evergreen direct-motion current-sky article passage about ${planetName} moving through ${signName}. ${scope} ${evergreenOccurrenceRule}`;
  }
  return `Revise one complete evergreen current-sky article passage about ${planetName} moving through ${signName}. ${scope} ${evergreenOccurrenceRule}`;
}

function firstParagraph(value: string) {
  return value.split(/\n\s*\n/u)[0]?.trim() ?? '';
}

function skyRegisterViolations(draft: string, planet: string, sign: string) {
  const violations: string[] = [];
  const signName = title(sign);
  const planetName = title(planet);
  if (/\bwhether\b/iu.test(draft)) violations.push('uses the banned word whether');
  const escapedSign = signName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const escapedPlanet = planetName.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const natalPatterns = [
    new RegExp(`\\byou(?:'re| are) (?:a|an) ${escapedSign}\\b`, 'iu'),
    new RegExp(`\\bas (?:a|an) ${escapedSign}\\b`, 'iu'),
    new RegExp(`\\bif you (?:are|have) (?:a|an)?\\s*${escapedSign}\\b`, 'iu'),
    new RegExp(`\\byour ${escapedSign}\\b`, 'iu'),
    new RegExp(`\\byour ${escapedPlanet}(?: in ${escapedSign})?\\b`, 'iu'),
    new RegExp(`\\bpeople (?:with|who have) (?:a|an)?\\s*${escapedPlanet} in ${escapedSign}\\b`, 'iu'),
  ];
  if (natalPatterns.some((pattern) => pattern.test(draft))) violations.push('frames the reader as having a natal placement or sign identity');
  if (planet === 'sun') {
    const opening = firstParagraph(draft);
    const seasonAnchor = new RegExp(`\\b(?:${escapedSign} season|Sun in ${escapedSign}|Sun (?:moves|moving|passes|passing|travels|traveling) through ${escapedSign})\\b`, 'iu');
    if (!seasonAnchor.test(opening)) violations.push(`does not anchor the first paragraph in ${signName} season or the Sun in ${signName}`);
  }
  return violations;
}

function isRateLimitError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /(?:rate limit|too many requests|\b429\b|quota exceeded)/iu.test(message);
}

function isRetryableVoiceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /(?:banned word whether|used an em dash)/iu.test(message);
}

type RequestBody = {
  planet?: string;
  sign?: string;
  field?: string;
  referenceDate?: string;
  instruction?: string;
  currentText?: string;
  provider?: 'openai' | 'claude' | 'anthropic';
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return sendAdminMethodNotAllowed(res, ['POST']);
  if (!await isContentAdminAuthorized(req)) return sendAdminJson(res, 401, { ok: false, error: 'Unauthorized.' });

  try {
    const body = await readAdminJsonBody<RequestBody>(req, 96_000);
    const planet = token(body.planet);
    const sign = token(body.sign).replace(/_/gu, '-');
    const field = typeof body.field === 'string' ? body.field : '';
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
    const currentText = typeof body.currentText === 'string' ? body.currentText : '';

    if (!/^[a-z_]+$/u.test(planet) || !/^[a-z]+(?:-[a-z]+)?$/u.test(sign)) {
      throw new AdminHttpError(400, 'Choose one valid planet and zodiac sign.');
    }
    if (!articleFields.has(field)) throw new AdminHttpError(400, 'Choose a placement article field.');
    if (instruction.length > 6000) throw new AdminHttpError(413, 'The writing request is too long. Keep it under 6,000 characters.');
    if (currentText.length > 60_000) throw new AdminHttpError(413, 'The current article is too long for this writing request.');
    if (body.provider !== undefined && !['openai', 'claude', 'anthropic'].includes(body.provider)) {
      throw new AdminHttpError(400, 'Invalid provider.');
    }

    const referenceInstant = validDate(body.referenceDate);
    const snapshot = await currentSkyFacts(referenceInstant);
    const position = snapshot.positions.find((candidate) => token(candidate.planet) === planet);
    if (!position) throw new AdminHttpError(422, `The calculation layer did not return ${planet} for ${body.referenceDate}.`);
    const calculatedSign = signToken(position.sign);
    if (calculatedSign !== sign) {
      throw new AdminHttpError(422, `On ${body.referenceDate}, ${planet} is in ${calculatedSign || 'another sign'}. Choose a date when it is in ${sign}.`);
    }
    const referenceYear = Number(String(body.referenceDate).slice(0, 4));
    const facts = {
      schema: 'tldrastro-sky-article-evergreen-validation-v1',
      calculationSource: 'current-sky event-time ephemeris',
      generatedAt: snapshot.generatedAt,
      referenceDate: body.referenceDate,
      entryYear: referenceYear,
      planet,
      sign: calculatedSign,
      motion: position.motion,
    };

    const context = currentText.trim()
      ? `\n\nPRIMARY OWNER-AUTHORED ARTICLE TO REVISE:\n${currentText.trim()}\n\nPreserve this article's subject direction, core argument, concrete lived evidence, sentence movement, and strongest owner-authored lines unless the owner request specifically changes them. Do not replace it with generic sign traits or generic astrology advice.`
      : '';
    const ownerRequest = instruction
      ? `OWNER REQUEST FOR THIS REVISION:\n${instruction}`
      : 'OWNER REQUEST FOR THIS REVISION:\nRevise the complete evergreen article passage for owner review.';
    const scopeRule = skyWritingScope(planet, sign);
    const baseVoiceNotes = [
      ownerRequest,
      context,
      `\nSURFACE AND SUBJECT DIRECTION:\n${scopeRule}`,
      `\n${evergreenOccurrenceRule}`,
      '\nReturn only reader-facing prose for the requested article field. Do not include drafting notes, explanations, labels, source commentary, or approval language. Do not invent dates, aspects, or historical facts. Preserve literal template variables only when they are already present in the current article context and valid for this field. Never output {{articleDraft}} or any other generation-control placeholder.',
    ].join('');

    const immutableContext = currentText.trim() || 'No existing reader-facing article prose was supplied.';
    const initialProvider = contentGenerationProvider({
      requestedProvider: body.provider,
      blockType: 'sky_article',
      contentType: 'sky_article',
    });

    const generateDraft = async (provider: GenerationProvider, correction = '') => generateSkyArticleTemplateSlots({
      templateKey: `sky/article/${planet}/${sign}/${referenceYear}`,
      templateBody: immutableContext,
      planet,
      sign,
      facts,
      requestedSlots: [{
        name: 'articleDraft',
        description: `${articleJob(field, planet, sign)} Return finished reader-facing prose. Do not output template placeholders or double-brace tokens.`,
      }],
      provider,
      voiceNotes: correction ? `${baseVoiceNotes}\n\nREWRITE REQUIRED:\n${correction}` : baseVoiceNotes,
    });

    let generation;
    let providerUsed = initialProvider;
    try {
      generation = await generateDraft(providerUsed);
    } catch (error) {
      if (isRateLimitError(error) && body.provider === undefined) {
        providerUsed = initialProvider === 'openai' ? 'claude' : 'openai';
        generation = await generateDraft(providerUsed, `The primary provider hit a rate limit. Follow the same owner request and all surface rules. ${skyWritingScope(planet, sign)}`);
      } else if (isRetryableVoiceError(error)) {
        generation = await generateDraft(providerUsed, `The previous candidate violated a mechanical voice rule. Never use the word whether or an em dash. ${skyWritingScope(planet, sign)}`);
      } else {
        throw error;
      }
    }

    let draft = generation.slotValues.articleDraft?.trim();
    if (!draft) throw new AdminHttpError(409, 'The writer returned no article draft. Your current writing was not changed.');
    let violations = skyRegisterViolations(draft, planet, sign);
    if (violations.length) {
      generation = await generateDraft(providerUsed, `The previous candidate failed the Sky article register because it ${violations.join('; ')}. Rewrite from the owner-authored article as a collective sky-period article, not a natal placement description. ${skyWritingScope(planet, sign)}`);
      draft = generation.slotValues.articleDraft?.trim();
      if (!draft) throw new AdminHttpError(409, 'The writer returned no article draft. Your current writing was not changed.');
      violations = skyRegisterViolations(draft, planet, sign);
    }
    if (violations.length) {
      throw new AdminHttpError(409, `The writer could not produce a Sky-season draft that follows the required register: ${violations.join('; ')}. Your current writing was not changed.`);
    }

    sendAdminJson(res, 200, {
      ok: true,
      draft,
      facts,
      generation: {
        provider: generation.provider,
        model: generation.model,
        responseId: generation.responseId ?? null,
        generatedAt: generation.generatedAt,
        generationMetadata: generation.generation_metadata ?? null,
        memoryReceipt: generation.memoryReceipt ?? null,
      },
    });
  } catch (error) {
    sendAdminJson(res, adminErrorStatus(error), {
      ok: false,
      error: adminErrorMessage(error, 'Article writing failed. Your current writing was not changed.'),
    });
  }
}
