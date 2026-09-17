import { createHash } from "node:crypto";
import { isDynamicTransitNatalExactKey } from "../../apps/web/src/content/transitNatalIdentity.js";
import { generateSkyArticleTemplateSlots } from "./content-generation.js";
import { servingPackageRecords } from "./content-live-status.js";
import { AdminHttpError, adminFetchJson, adminStorageRows } from "./admin-http.js";
import { studioStorage } from "./sky-studio-sources.js";
import { buildSkyWritingMemory } from "./sky-writing-memory.mjs";
import { activeStudioFeedback, selectStudioFeedback, studioFeedbackEnabled } from "./studio-memory-feedback.js";
import {
  transitNatalAspects,
  transitNatalHouses,
  transitNatalPlanets,
  transitNatalPoints,
  transitNatalSigns
} from "../../apps/admin/src/transitNatalSources.js";
import type { GenerationProvider } from "./provider-config.js";

const allowedVariables = new Set(["Name", "untilDate", "aspectWord"]);
const editorialNote = /\b(?:drafting note|todo|tbd|placeholder|for the writer|do not publish|internal only|details\.)\b/iu;
const signName = /\b(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)\b/iu;
const houseWord = /\b(?:1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th|house)\b/iu;
const title = (value: string) => value.split("-").map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(" ");
const houseOrdinal = (house: string) => house === "1" ? "1st" : house === "2" ? "2nd" : house === "3" ? "3rd" : `${house}th`;

export type PersonalTransitAudience = "you" | "friend" | "both";
export type PersonalTransitContact = {
  family: "aspect" | "house-intro" | "house-sign" | "house-complete";
  contentKey: string;
  transiting?: string;
  natal?: string;
  aspect?: string;
  planet?: string;
  house?: string;
  sign?: string;
  transitHouse?: string;
  natalHouse?: string;
};

export function parsePersonalTransitContact(input: {
  transiting?: unknown; natal?: unknown; aspect?: unknown; contentKey?: unknown;
  planet?: unknown; house?: unknown; sign?: unknown; transitHouse?: unknown; natalHouse?: unknown;
}): PersonalTransitContact {
  const fromKey = typeof input.contentKey === "string" ? input.contentKey.trim() : "";
  const parts = fromKey.split("/");
  const houseFromKey = parseHouseTransitKey(fromKey);
  if (houseFromKey) return houseFromKey;

  const transiting = token(input.transiting) || (parts[0] === "authored" && parts[1] === "transit-aspect" ? parts[2] : "");
  const natal = token(input.natal) || (parts[0] === "authored" && parts[1] === "transit-aspect" ? parts[3] : "");
  const aspect = token(input.aspect) || (parts[0] === "authored" && parts[1] === "transit-aspect" ? parts[4] : "");
  if (transiting && natal && aspect) {
    const contentKey = `authored/transit-aspect/${transiting}/${natal}/${aspect}`;
    if (!isDynamicTransitNatalExactKey(contentKey)) {
      throw new AdminHttpError(400, "Choose one exact transit-to-natal contact or House Transit passage. The writer cannot pick or change the destination.");
    }
    return withOptionalHouses({ family: "aspect", transiting, natal, aspect, contentKey }, input);
  }

  const houseContact = parseHouseTransitParts(input.planet ?? input.transiting, input.house, input.sign);
  if (houseContact) return houseContact;
  throw new AdminHttpError(400, "Choose one exact transit-to-natal contact or House Transit passage. The writer cannot pick or change the destination.");
}

export function exactPersonalTransitContentKeys() {
  const keys: string[] = [];
  for (const transiting of transitNatalPlanets) {
    for (const natal of transitNatalPoints) {
      for (const aspect of transitNatalAspects) {
        const contentKey = `authored/transit-aspect/${transiting}/${natal}/${aspect}`;
        if (isDynamicTransitNatalExactKey(contentKey)) keys.push(contentKey);
      }
    }
  }
  return keys;
}

export function packagedAudienceFields(record: Record<string, unknown> | null | undefined) {
  const you = typeof record?.body_you === "string" ? record.body_you : typeof record?.body === "string" ? record.body : "";
  const friend = typeof record?.body_they === "string" ? record.body_they : "";
  return { you, friend };
}

export function studioAudienceFields(row: Record<string, unknown> | null | undefined) {
  const sections = row?.sections && typeof row.sections === "object" && !Array.isArray(row.sections)
    ? row.sections as Record<string, unknown>
    : {};
  const draft = objectRecord(sections.packageDraft) ?? objectRecord(sections.packageRecord);
  const packaged = packagedAudienceFields(draft);
  if (packaged.you.trim() || packaged.friend.trim()) return packaged;
  return {
    you: typeof row?.body === "string" ? row.body : "",
    friend: ""
  };
}

export function missingPersonalTransitAudiences(fields: { you: string; friend: string }) {
  const missing: Array<"you" | "friend"> = [];
  if (!fields.you.trim()) missing.push("you");
  if (!fields.friend.trim()) missing.push("friend");
  return missing;
}

export function personalTransitReviewChecks(input: {
  you?: string;
  friend?: string;
  siblings?: Array<{ contentKey: string; you: string; friend: string }>;
  allowHouses?: boolean;
  allowSigns?: boolean;
}) {
  const checks: Array<{ code: string; audience?: "you" | "friend"; detail: string }> = [];
  for (const [audience, text] of [["you", input.you], ["friend", input.friend]] as const) {
    if (!text?.trim()) continue;
    if (text.includes("—")) checks.push({ code: "em-dash", audience, detail: "Uses an em dash." });
    if (/\bwhether\b/iu.test(text)) checks.push({ code: "banned-whether", audience, detail: "Uses the banned word whether." });
    if (editorialNote.test(text)) checks.push({ code: "editorial-note", audience, detail: "Looks like an editorial note rather than reader copy." });
    if (!input.allowHouses && houseWord.test(text)) checks.push({ code: "unexpected-house", audience, detail: "Names a house, but this destination did not lock a house." });
    if (!input.allowSigns && signName.test(text)) checks.push({ code: "unexpected-sign", audience, detail: "Names a sign, but this destination did not lock a sign." });
    for (const name of variablesIn(text)) {
      if (!allowedVariables.has(name)) checks.push({ code: "unknown-variable", audience, detail: `Contains {{${name}}}, which is not a supported personal-transit variable.` });
    }
  }
  if (input.you?.trim() && variablesIn(input.you).has("Name")) {
    checks.push({ code: "name-in-you", audience: "you", detail: "You copy should not use {{Name}}." });
  }
  if (input.friend?.trim() && !variablesIn(input.friend).has("Name")) {
    checks.push({ code: "missing-name", audience: "friend", detail: "Friend copy should use {{Name}} for the person being read." });
  }
  if (input.you?.trim() && input.friend?.trim() && pronounSwap(input.you, input.friend)) {
    checks.push({ code: "pronoun-swap", audience: "friend", detail: "Friend copy looks like a pronoun swap of the You passage." });
  }
  const youOpening = opening(input.you);
  for (const sibling of input.siblings ?? []) {
    if (youOpening && opening(sibling.you) && similar(youOpening, opening(sibling.you))) {
      checks.push({ code: "repeated-opening", audience: "you", detail: `Opening is close to ${sibling.contentKey}.` });
    }
    if (input.you?.trim() && sibling.you.trim() && similar(input.you, sibling.you)) {
      checks.push({ code: "near-identical-sibling", audience: "you", detail: `You copy is close to ${sibling.contentKey}.` });
    }
  }
  return checks;
}

export function reviewPersonalTransitCopy(input: {
  contact: PersonalTransitContact;
  you?: string;
  friend?: string;
}) {
  return {
    contentKey: input.contact.contentKey,
    checks: personalTransitReviewChecks({
      you: input.you,
      friend: input.friend,
      siblings: siblingFields(input.contact),
      allowHouses: allowsHouses(input.contact),
      allowSigns: allowsSigns(input.contact)
    })
  };
}

export async function loadStudioTransitRows(contentKeys?: string[]) {
  const { url, headers } = studioStorage();
  if (contentKeys?.length === 1) {
    const params = new URLSearchParams({
      content_key: `eq.${contentKeys[0]}`,
      select: "id,content_key,status,body,sections,updated_at",
      limit: "2"
    });
    const response = await adminFetchJson(`${url}?${params}`, { headers });
    if (!response.ok) throw new AdminHttpError(502, "Could not read saved Personal Transit drafts.");
    const rows = adminStorageRows<Record<string, unknown>>(response.payload);
    if (!Array.isArray(rows) || rows.length > 1) throw new AdminHttpError(502, "Saved Personal Transit drafts could not be verified.");
    return rows;
  }
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({
      content_key: "like.authored/transit-aspect/%",
      select: "id,content_key,status,body,sections,updated_at",
      order: "content_key.asc,id.asc",
      limit: "1000",
      offset: String(page * 1000)
    });
    const response = await adminFetchJson(`${url}?${params}`, { headers });
    if (!response.ok) throw new AdminHttpError(502, "Could not read saved Personal Transit drafts.");
    const batch = adminStorageRows<Record<string, unknown>>(response.payload);
    if (!batch.length) break;
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  if (!contentKeys) return rows;
  const wanted = new Set(contentKeys);
  return rows.filter((row) => typeof row.content_key === "string" && wanted.has(row.content_key));
}

export function combinedAudienceFields(contentKey: string, studioRow?: Record<string, unknown> | null) {
  const studio = studioRow ? studioAudienceFields(studioRow) : { you: "", friend: "" };
  const packaged = packagedAudienceFields(servingPackageRecords.get(contentKey) ?? null);
  return {
    you: studio.you.trim() ? studio.you : packaged.you,
    friend: studio.friend.trim() ? studio.friend : packaged.friend,
    studioPresent: Boolean(studioRow),
    packagedPresent: servingPackageRecords.has(contentKey)
  };
}

export async function nextMissingPersonalTransitWriteup(afterContentKey = "") {
  const studioRows = await loadStudioTransitRows();
  const byKey = new Map(studioRows.map((row) => [String(row.content_key), row]));
  return findNextMissingPersonalTransitWriteup({
    afterContentKey,
    keys: exactPersonalTransitContentKeys(),
    studioByKey: byKey
  });
}

export function findNextMissingPersonalTransitWriteup(input: {
  afterContentKey?: string;
  keys?: string[];
  studioByKey: Map<string, Record<string, unknown>>;
}) {
  const keys = input.keys ?? exactPersonalTransitContentKeys();
  const start = input.afterContentKey ? keys.indexOf(input.afterContentKey) + 1 : 0;
  for (const contentKey of keys.slice(Math.max(0, start))) {
    const fields = combinedAudienceFields(contentKey, input.studioByKey.get(contentKey));
    const missing = missingPersonalTransitAudiences(fields);
    if (!missing.length) continue;
    const [, , transiting, natal, aspect] = contentKey.split("/");
    return {
      contentKey,
      transiting,
      natal,
      aspect,
      missingAudiences: missing,
      hasStudioDraft: fields.studioPresent,
      hasPackagedCopy: fields.packagedPresent
    };
  }
  return null;
}

export async function generatePersonalTransitAudienceDrafts(input: {
  contact: PersonalTransitContact;
  youText: string;
  friendText: string;
  instruction: string;
  audience: PersonalTransitAudience;
  provider?: GenerationProvider;
}) {
  const studioRows = await loadStudioTransitRows([input.contact.contentKey]);
  const saved = combinedAudienceFields(input.contact.contentKey, studioRows[0]);
  const editorYou = input.youText;
  const editorFriend = input.friendText;
  const requested = requestedAudiences(input.audience, editorYou, editorFriend, input.instruction);
  if (!requested.length) {
    throw new AdminHttpError(409, "Both You and Friend already have writing. Give direction to revise one audience, or leave a missing audience empty.");
  }

  const siblings = siblingFields(input.contact);
  const memory = await personalTransitWritingMemory(input.contact);
  const slots = requested.map((audience) => audience === "you"
    ? { name: "youDraft", description: youSlot(input.contact) }
    : { name: "friendDraft", description: friendSlot(input.contact) });
  const generation = await generateSkyArticleTemplateSlots({
    templateKey: input.contact.contentKey,
    templateBody: [
      `EXISTING YOU COPY:\n${editorYou.trim() || saved.you.trim() || "(empty)"}`,
      `EXISTING FRIEND COPY:\n${editorFriend.trim() || saved.friend.trim() || "(empty)"}`
    ].join("\n\n"),
    planet: title(input.contact.planet ?? input.contact.transiting ?? ""),
    sign: input.contact.sign ?? "base",
    facts: {
      schema: input.contact.family === "aspect" ? "tldrastro-personal-transit-base-v1" : "tldrastro-personal-transit-house-v1",
      family: input.contact.family,
      transiting: input.contact.transiting ?? input.contact.planet,
      natal: input.contact.natal,
      aspect: input.contact.aspect,
      planet: input.contact.planet ?? input.contact.transiting,
      house: input.contact.house,
      sign: input.contact.sign,
      transitHouse: input.contact.transitHouse,
      natalHouse: input.contact.natalHouse,
      housesExcluded: !allowsHouses(input.contact),
      signsExcluded: !allowsSigns(input.contact),
      contentKey: input.contact.contentKey
    },
    requestedSlots: slots,
    provider: input.provider,
    surface: "you",
    eventType: input.contact.family === "aspect" ? "transit-aspect" : "transit-house",
    knowledgeIds: knowledgeIdsFor(input.contact),
    writingMemory: memory as NonNullable<Parameters<typeof generateSkyArticleTemplateSlots>[0]["writingMemory"]>,
    voiceNotes: personalTransitVoiceNotes(input)
  });

  const youDraft = requested.includes("you") ? generation.slotValues.youDraft?.trim() ?? "" : "";
  const friendDraft = requested.includes("friend") ? generation.slotValues.friendDraft?.trim() ?? "" : "";
  if (requested.includes("you") && !youDraft) throw new AdminHttpError(409, "The writer returned no You draft. Existing writing was not changed.");
  if (requested.includes("friend") && !friendDraft) throw new AdminHttpError(409, "The writer returned no Friend draft. Existing writing was not changed.");

  return {
    contentKey: input.contact.contentKey,
    generatedAudiences: requested,
    preservedAudiences: (["you", "friend"] as const).filter((audience) => !requested.includes(audience)),
    youDraft: youDraft || null,
    friendDraft: friendDraft || null,
    checks: personalTransitReviewChecks({
      you: youDraft || undefined,
      friend: friendDraft || undefined,
      siblings,
      allowHouses: allowsHouses(input.contact),
      allowSigns: allowsSigns(input.contact)
    }),
    memoryReceipt: generation.memoryReceipt ?? memory.receipt,
    generation: {
      provider: generation.provider,
      model: generation.model,
      responseId: generation.responseId ?? null,
      generatedAt: generation.generatedAt,
      generationMetadata: generation.generation_metadata ?? null
    }
  };
}

function token(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[_\s]+/gu, "-") : "";
}

function objectRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function variablesIn(text: string) {
  return new Set([...text.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/gu)].map((match) => match[1]));
}

function opening(text?: string) {
  return (text ?? "").trim().split(/(?<=[.!?])\s+/u)[0]?.trim() ?? "";
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\{\{[^}]+\}\}/gu, " ").replace(/[^a-z0-9\s]/gu, " ").replace(/\s+/gu, " ").trim();
}

function similar(left: string, right: string) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.slice(0, 80) === b.slice(0, 80);
}

function pronounSwap(you: string, friend: string) {
  const converted = normalize(you)
    .replace(/\byou're\b/gu, "they're")
    .replace(/\byour\b/gu, "their")
    .replace(/\byou\b/gu, "they");
  return converted === normalize(friend).replace(/\{\{name\}\}/gu, "");
}

function requestedAudiences(audience: PersonalTransitAudience, you: string, friend: string, instruction: string) {
  if (audience === "you") return you.trim() && !instruction ? [] : ["you"] as Array<"you" | "friend">;
  if (audience === "friend") return friend.trim() && !instruction ? [] : ["friend"] as Array<"you" | "friend">;
  const missing = missingPersonalTransitAudiences({ you, friend });
  if (instruction.trim()) return missing.length ? missing : ["you", "friend"];
  return missing;
}

function siblingFields(contact: PersonalTransitContact) {
  if (contact.family === "house-sign" && contact.planet && contact.house && contact.sign) {
    return transitNatalSigns
      .filter((sign) => sign !== contact.sign)
      .map((sign) => {
        const contentKey = `authored/transit-house-sign/${contact.planet}/${contact.house}/${sign}`;
        return { contentKey, ...packagedAudienceFields(servingPackageRecords.get(contentKey) ?? null) };
      })
      .filter((row) => row.you.trim() || row.friend.trim());
  }
  if ((contact.family === "house-intro" || contact.family === "house-complete") && contact.planet && contact.house) {
    const prefix = contact.family === "house-intro" ? "authored/transit-house-intro" : "authored/transit-house";
    return transitNatalHouses
      .filter((house) => house !== contact.house)
      .map((house) => {
        const contentKey = `${prefix}/${contact.planet}/${house}`;
        return { contentKey, ...packagedAudienceFields(servingPackageRecords.get(contentKey) ?? null) };
      })
      .filter((row) => row.you.trim() || row.friend.trim());
  }
  return transitNatalAspects
    .filter((aspect) => aspect !== contact.aspect)
    .map((aspect) => {
      const contentKey = `authored/transit-aspect/${contact.transiting}/${contact.natal}/${aspect}`;
      return { contentKey, ...packagedAudienceFields(servingPackageRecords.get(contentKey) ?? null) };
    })
    .filter((row) => isDynamicTransitNatalExactKey(row.contentKey) && (row.you.trim() || row.friend.trim()));
}

async function personalTransitWritingMemory(contact: PersonalTransitContact) {
  const key = contact.contentKey;
  const feedback = studioFeedbackEnabled()
    ? selectStudioFeedback(await activeStudioFeedback(), key)
    : null;
  const memory = buildSkyWritingMemory(
    {
      kind: "personal-transit",
      args: Object.fromEntries(Object.entries({
        transiting: contact.transiting ?? contact.planet,
        natal: contact.natal,
        aspect: contact.aspect ?? contact.family,
        planet: contact.planet,
        house: contact.house ? houseOrdinal(contact.house) : undefined,
        sign: contact.sign,
        transitHouse: contact.transitHouse ? houseOrdinal(contact.transitHouse) : undefined,
        natalHouse: contact.natalHouse ? houseOrdinal(contact.natalHouse) : undefined
      }).filter(([, value]) => value))
    },
    { studioCorrections: feedback?.corrections ?? [] }
  );
  if (feedback) {
    (memory.receipt as { studioFeedback?: unknown }).studioFeedback = {
      ...feedback.receipt,
      selected: feedback.receipt.selected.filter((item) => memory.receipt.selected.some((ref) => ref.memoryId === item.memoryId)),
      excluded: [
        ...feedback.receipt.excluded,
        ...memory.receipt.excluded.filter((item: { memoryId: string }) => item.memoryId.startsWith("studio-"))
      ],
      promptSha256: memory.receipt.promptSha256
    };
  }
  return memory;
}

function youSlot(contact: PersonalTransitContact) {
  return `Write the You passage for ${destinationLabel(contact)}. Second person. Temporary personal transit, not a natal trait. ${placementScope(contact)} {{untilDate}} is allowed.`;
}

function friendSlot(contact: PersonalTransitContact) {
  return `Write the Friend passage for the same destination. Address the reader about {{Name}} using singular they/them. This is guidance for the person reading about their friend, not a pronoun swap of the You passage. ${placementScope(contact)} {{untilDate}} is allowed.`;
}

function personalTransitVoiceNotes(input: {
  contact: PersonalTransitContact;
  instruction: string;
  youText: string;
  friendText: string;
  audience: PersonalTransitAudience;
}) {
  return [
    "TASK: Fill only the requested Personal Transit audience fields for one locked destination.",
    "This is not Sky season or planet-in-sign writing unless the locked destination is a House Transit sign passage.",
    `LOCKED DESTINATION: ${input.contact.contentKey}. Do not change the planet, house, sign, natal point, or aspect.`,
    `REGISTER: personal transit. ${destinationLabel(input.contact)}.`,
    placementScope(input.contact),
    "Do not save, approve, or publish. Return reader-facing prose only.",
    "Never use whether or an em dash.",
    input.instruction.trim() ? `OWNER DIRECTION:\n${input.instruction.trim()}` : "OWNER DIRECTION:\nWrite the missing audience fields for owner review.",
    "If an audience already has writing and was not requested, do not return a replacement for it."
  ].join("\n");
}

function parseHouseTransitKey(contentKey: string): PersonalTransitContact | null {
  const parts = contentKey.split("/").filter(Boolean);
  if (parts[0] !== "authored") return null;
  if (parts[1] === "transit-house-intro" && parts.length === 4) {
    return houseDestination("house-intro", parts[2], parts[3]);
  }
  if (parts[1] === "transit-house-sign" && parts.length === 5) {
    return houseDestination("house-sign", parts[2], parts[3], parts[4]);
  }
  if (parts[1] === "transit-house" && parts.length === 4) {
    return houseDestination("house-complete", parts[2], parts[3]);
  }
  return null;
}

function parseHouseTransitParts(planetRaw: unknown, houseRaw: unknown, signRaw: unknown): PersonalTransitContact | null {
  const planet = token(planetRaw);
  const house = houseToken(houseRaw);
  const sign = token(signRaw);
  if (!planet || !house) return null;
  return houseDestination(sign ? "house-sign" : "house-intro", planet, house, sign || undefined);
}

function houseDestination(
  family: "house-intro" | "house-sign" | "house-complete",
  planetRaw: string,
  houseRaw: string,
  signRaw?: string
): PersonalTransitContact {
  const planet = token(planetRaw);
  const house = houseToken(houseRaw);
  const sign = token(signRaw);
  if (!knownPlanet(planet) || !house) {
    throw new AdminHttpError(400, "Choose one exact transit-to-natal contact or House Transit passage. The writer cannot pick or change the destination.");
  }
  if (family === "house-sign") {
    if (!knownSign(sign)) {
      throw new AdminHttpError(400, "Choose one exact transit-to-natal contact or House Transit passage. The writer cannot pick or change the destination.");
    }
    return { family, planet, house, sign, contentKey: `authored/transit-house-sign/${planet}/${house}/${sign}` };
  }
  const prefix = family === "house-intro" ? "authored/transit-house-intro" : "authored/transit-house";
  return { family, planet, house, contentKey: `${prefix}/${planet}/${house}` };
}

function withOptionalHouses(contact: PersonalTransitContact, input: { transitHouse?: unknown; natalHouse?: unknown }): PersonalTransitContact {
  if (contact.family !== "aspect") return contact;
  const transitHouse = houseToken(input.transitHouse);
  const natalHouse = houseToken(input.natalHouse);
  return {
    ...contact,
    ...(transitHouse ? { transitHouse } : {}),
    ...(natalHouse ? { natalHouse } : {})
  };
}

function allowsHouses(contact: PersonalTransitContact) {
  return contact.family !== "aspect" || Boolean(contact.transitHouse || contact.natalHouse);
}

function allowsSigns(contact: PersonalTransitContact) {
  return contact.family === "house-sign";
}

function knowledgeIdsFor(contact: PersonalTransitContact) {
  if (contact.family === "aspect") {
    const ids = [`transit-aspect/${contact.transiting}/${contact.natal}/${contact.aspect}`];
    if (contact.transitHouse) ids.push(`house/${contact.transitHouse}`);
    if (contact.natalHouse) ids.push(`house/${contact.natalHouse}`);
    return ids;
  }
  if (contact.family === "house-sign") {
    return [
      `transit-house-sign/${contact.planet}/${contact.house}/${contact.sign}`,
      `transit-house-intro/${contact.planet}/${contact.house}`
    ];
  }
  return [`transit-house-intro/${contact.planet}/${contact.house}`];
}

function destinationLabel(contact: PersonalTransitContact) {
  if (contact.family === "aspect") {
    const houses = [
      contact.transitHouse ? `transiting from the ${houseOrdinal(contact.transitHouse)} house` : "",
      contact.natalHouse ? `natal ${title(contact.natal ?? "")} in the ${houseOrdinal(contact.natalHouse)} house` : ""
    ].filter(Boolean).join("; ");
    return `${title(contact.transiting ?? "")} ${contact.aspect} natal ${title(contact.natal ?? "")}${houses ? `. ${houses}` : ""}`;
  }
  if (contact.family === "house-sign") {
    return `${title(contact.planet ?? "")} in ${title(contact.sign ?? "")} through the ${houseOrdinal(contact.house ?? "")} house`;
  }
  return `${title(contact.planet ?? "")} through the ${houseOrdinal(contact.house ?? "")} house`;
}

function placementScope(contact: PersonalTransitContact) {
  if (contact.family === "house-sign") return "Name this locked planet, house, and sign. Do not invent another placement.";
  if (contact.family !== "aspect") return `Name the locked ${houseOrdinal(contact.house ?? "")} house when it explains the situation. Do not invent a sign.`;
  if (allowsHouses(contact)) return "Name the locked transit and natal houses when they explain the situation. Do not invent a sign.";
  return "Do not name houses or signs.";
}

function houseToken(value: unknown) {
  const raw = typeof value === "string" || typeof value === "number" ? String(value).trim().toLowerCase() : "";
  const match = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?$/u);
  const house = match?.[1] ?? "";
  return (transitNatalHouses as readonly string[]).includes(house) ? house : "";
}

function knownPlanet(value: string) {
  return (transitNatalPlanets as readonly string[]).includes(value);
}

function knownSign(value: string) {
  return (transitNatalSigns as readonly string[]).includes(value);
}

export function personalTransitPromptFingerprint(input: { contentKey: string; audiences: string[]; instruction: string }) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
