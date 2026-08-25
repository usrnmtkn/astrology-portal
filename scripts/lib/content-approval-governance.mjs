import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildTemplateSlotPreflight, extractTemplateSlots } from "./content-template-slot-governance.mjs";

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function spanSha256(value) {
  return sha256(value).slice(0, 16);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function canonicalStringify(value) {
  return canonicalJson(value);
}

export function canonicalSha256(value) {
  return sha256(canonicalJson(value));
}

function decodeJsonPointerToken(token) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

export function resolveJsonPointer(document, pointer) {
  if (pointer === "" || pointer === "/") return document;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
    throw new Error(`PROMOTION_INVALID_POINTER: ${pointer}`);
  }
  let current = document;
  for (const rawToken of pointer.slice(1).split("/")) {
    const token = decodeJsonPointerToken(rawToken);
    if (current == null || typeof current !== "object" || !Object.hasOwn(current, token)) {
      throw new Error(`PROMOTION_TARGET_MISSING: ${pointer}`);
    }
    current = current[token];
  }
  return current;
}

function promotionTargetPath(repoRoot, sourcePath) {
  const normalized = String(sourcePath ?? "").replaceAll("\\", "/");
  const allowedPrefix = "apps/web/src/content/fallbackArchitectureV3/source-rows/";
  if (!normalized.startsWith(allowedPrefix) || !normalized.endsWith(".json")) {
    throw new Error(`PROMOTION_TARGET_OUT_OF_SCOPE: ${normalized}`);
  }
  const absolute = path.resolve(repoRoot, normalized);
  if (!absolute.startsWith(`${path.resolve(repoRoot, allowedPrefix)}${path.sep}`)) {
    throw new Error(`PROMOTION_TARGET_OUT_OF_SCOPE: ${normalized}`);
  }
  return absolute;
}

function discoverFamilySupportedSlots(repoRoot, contentKey, textField) {
  const sourceRoot = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows");
  const segments = String(contentKey ?? "").split("/");
  const familyPrefix = segments.length > 2 ? `${segments.slice(0, -1).join("/")}/` : null;
  const supported = new Set();
  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const rowKey = String(value.contentKey ?? "");
    if (
      typeof value[textField] === "string"
      && (rowKey === contentKey || (familyPrefix && rowKey.startsWith(familyPrefix)))
    ) {
      extractTemplateSlots(value[textField]).forEach((slot) => supported.add(slot));
    }
    Object.values(value).forEach(visit);
  }
  for (const fileName of fs.readdirSync(sourceRoot).filter((name) => name.endsWith(".json")).sort()) {
    visit(JSON.parse(fs.readFileSync(path.join(sourceRoot, fileName), "utf8")));
  }
  return [...supported].sort();
}

export function buildContentPromotionPlan({ repoRoot, application, baseCommitSha = null }) {
  if (application?.schema !== "approval-application/v1") {
    throw new Error("PROMOTION_INVALID_APPLICATION: schema must be approval-application/v1.");
  }
  const promotable = (application.decisions ?? []).filter((decision) => decision.queue?.promotion);
  if (promotable.length === 0) throw new Error("PROMOTION_EMPTY: no decisions declare a promotion target.");
  const sourcePaths = new Set(promotable.map((decision) => decision.queue.promotion.sourcePath));
  if (sourcePaths.size !== 1) {
    throw new Error("PROMOTION_MULTI_FILE_UNSUPPORTED: one transaction may update exactly one source JSON file.");
  }

  const sourcePath = [...sourcePaths][0];
  const absoluteSourcePath = promotionTargetPath(repoRoot, sourcePath);
  const sourceBefore = fs.readFileSync(absoluteSourcePath, "utf8");
  const sourceBeforeSha256 = sha256(sourceBefore);
  const document = JSON.parse(sourceBefore);
  const changes = [];

  for (const decision of promotable) {
    if (!["rewrite", "write one"].includes(decision.choice) || typeof decision.text !== "string" || !decision.text.trim()) {
      throw new Error(`PROMOTION_REQUIRES_COMPLETE_TEXT: ${decision.id}`);
    }
    const target = decision.queue.promotion;
    const row = resolveJsonPointer(document, target.objectPath);
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`PROMOTION_TARGET_NOT_OBJECT: ${decision.id}`);
    }
    if (target.contentKey && row.contentKey !== target.contentKey) {
      throw new Error(`PROMOTION_CONTENT_KEY_MISMATCH: ${decision.id}`);
    }
    const textField = String(target.textField ?? "");
    if (!textField || !Object.hasOwn(row, textField) || typeof row[textField] !== "string") {
      throw new Error(`PROMOTION_TEXT_FIELD_MISSING: ${decision.id}`);
    }
    if (sha256(row[textField]) !== target.sourceTextSha256) {
      throw new Error(`PROMOTION_SOURCE_TEXT_STALE: ${decision.id}`);
    }

    const beforeText = row[textField];
    const slotPreflight = buildTemplateSlotPreflight({
      beforeText,
      afterText: decision.text,
      contentKey: row.contentKey,
      textField,
      slotContract: target.slotContract ?? null,
      familySupportedSlots: /^fallback-hook\/daily-(?:headline|body)\//u.test(String(row.contentKey)) && textField === "body_they"
        ? null
        : discoverFamilySupportedSlots(repoRoot, row.contentKey, textField)
    });
    row[textField] = decision.text;
    if (target.reviewStatus) row.review_status = target.reviewStatus;
    const approvalPayload = {
      contentKey: row.contentKey,
      field: textField,
      text: decision.text,
      approvedAt: decision.approvedAt,
      decisionId: decision.id
    };
    row.approval = {
      approvalLevel: "exact_owner_approved",
      recordPath: target.approvalRecordPath,
      payloadSha256: canonicalSha256(approvalPayload),
      approvedAt: decision.approvedAt
    };
    changes.push({
      decisionId: decision.id,
      contentKey: row.contentKey ?? null,
      objectPath: target.objectPath,
      textField,
      beforeTextSha256: sha256(beforeText),
      afterTextSha256: sha256(decision.text),
      beforeText,
      afterText: decision.text,
      slotPreflight,
      reviewStatus: target.reviewStatus ?? row.review_status ?? null,
      approval: row.approval
    });
  }

  const sourceAfter = `${JSON.stringify(document, null, 2)}\n`;
  const planCore = {
    schema: "tldrastro-content-promotion-plan/v1",
    applicationSha256: canonicalSha256(application),
    baseCommitSha,
    sourcePath,
    sourceBeforeSha256,
    sourceAfterSha256: sha256(sourceAfter),
    changes
  };
  return {
    ...planCore,
    planSha256: canonicalSha256(planCore),
    sourceAfter
  };
}

export function applyContentPromotionPlan({ repoRoot, plan, expectedPlanSha256 }) {
  if (plan?.planSha256 !== expectedPlanSha256) {
    throw new Error("PROMOTION_PLAN_HASH_MISMATCH: rerun dry-run and pass its exact plan hash.");
  }
  const absoluteSourcePath = promotionTargetPath(repoRoot, plan.sourcePath);
  const current = fs.readFileSync(absoluteSourcePath, "utf8");
  if (sha256(current) !== plan.sourceBeforeSha256) {
    throw new Error("PROMOTION_SOURCE_FILE_STALE: source changed after dry-run.");
  }
  const output = JSON.parse(plan.sourceAfter);
  writeJsonAtomically(absoluteSourcePath, output);
  return {
    schema: "tldrastro-content-promotion-receipt/v1",
    mode: "applied",
    appliedAt: new Date().toISOString(),
    planSha256: plan.planSha256,
    applicationSha256: plan.applicationSha256,
    baseCommitSha: plan.baseCommitSha,
    sourcePath: plan.sourcePath,
    sourceBeforeSha256: plan.sourceBeforeSha256,
    sourceAfterSha256: plan.sourceAfterSha256,
    changes: plan.changes,
    unrelatedApprovedRowsChanged: []
  };
}

function choiceValues(options) {
  return options.map((option) => typeof option === "string" ? option : option?.value).filter(Boolean);
}

function requireString(value, label, errors) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${label} must be a non-empty string.`);
}

export class ApprovalValidationError extends Error {
  constructor(errors) {
    super(`APPROVAL_SET_INVALID:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    this.name = "ApprovalValidationError";
    this.errors = errors;
  }
}

export function buildApprovalApplication(queue, approvalSet) {
  const errors = [];
  if (queue?.schema !== "approval-queue/v1") errors.push("queue.schema must be approval-queue/v1.");
  if (!Array.isArray(queue?.items)) errors.push("queue.items must be an array.");
  if (approvalSet?.schema !== "approval-set/v1") errors.push("approvalSet.schema must be approval-set/v1.");
  if (!Array.isArray(approvalSet?.decisions)) errors.push("approvalSet.decisions must be an array.");
  if (errors.length > 0) throw new ApprovalValidationError(errors);

  const queueById = new Map();
  for (const item of queue.items) {
    requireString(item?.id, "queue item id", errors);
    requireString(item?.type, `queue item ${item?.id ?? "unknown"} type`, errors);
    if (queueById.has(item.id)) errors.push(`queue repeats id ${item.id}.`);
    queueById.set(item.id, item);
    if (!Array.isArray(item.options) || item.options.length === 0) {
      errors.push(`queue item ${item.id} must declare at least one option.`);
    }
    if (item.type === "span") {
      requireString(item.span, `queue item ${item.id} span`, errors);
      if (!/^[a-f0-9]{16}$/u.test(String(item.sha256 ?? ""))) {
        errors.push(`queue item ${item.id} sha256 must be 16 lowercase hex characters.`);
      } else if (spanSha256(item.span) !== item.sha256) {
        errors.push(`queue item ${item.id} span hash is stale.`);
      }
    }
    if (item.promotion != null) {
      const target = item.promotion;
      requireString(target.sourcePath, `queue item ${item.id} promotion sourcePath`, errors);
      requireString(target.objectPath, `queue item ${item.id} promotion objectPath`, errors);
      requireString(target.contentKey, `queue item ${item.id} promotion contentKey`, errors);
      requireString(target.textField, `queue item ${item.id} promotion textField`, errors);
      requireString(target.approvalRecordPath, `queue item ${item.id} promotion approvalRecordPath`, errors);
      if (!/^[a-f0-9]{64}$/u.test(String(target.sourceTextSha256 ?? ""))) {
        errors.push(`queue item ${item.id} promotion sourceTextSha256 must be 64 lowercase hex characters.`);
      }
      if (item.contentKey && item.contentKey !== target.contentKey) {
        errors.push(`queue item ${item.id} promotion contentKey must match the queue contentKey.`);
      }
      if (target.reviewStatus && !["approved", "approved_reuse", "reviewed"].includes(target.reviewStatus)) {
        errors.push(`queue item ${item.id} promotion reviewStatus is not serving-eligible.`);
      }
      if (target.slotContract != null) {
        const contract = target.slotContract;
        for (const field of ["allowedSlots", "requiredSlots"]) {
          if (contract[field] != null && (
            !Array.isArray(contract[field])
            || contract[field].some((slot) => typeof slot !== "string" || !/^[A-Za-z][A-Za-z0-9_.]*$/u.test(slot))
            || new Set(contract[field]).size !== contract[field].length
          )) {
            errors.push(`queue item ${item.id} promotion slotContract.${field} must contain unique supported slot names.`);
          }
        }
        if (contract.renderPersonFixtures != null && typeof contract.renderPersonFixtures !== "boolean") {
          errors.push(`queue item ${item.id} promotion slotContract.renderPersonFixtures must be boolean.`);
        }
        if (Array.isArray(contract.allowedSlots) && Array.isArray(contract.requiredSlots)) {
          const allowed = new Set(contract.allowedSlots);
          const outside = contract.requiredSlots.filter((slot) => !allowed.has(slot));
          if (outside.length > 0) errors.push(`queue item ${item.id} promotion requiredSlots are not allowed: ${outside.join(", ")}.`);
        }
      }
    }
  }

  if (approvalSet.total !== queue.items.length) {
    errors.push(`approvalSet.total ${approvalSet.total} does not match queue size ${queue.items.length}.`);
  }
  if (approvalSet.decided !== approvalSet.decisions.length) {
    errors.push(`approvalSet.decided ${approvalSet.decided} does not match decisions length ${approvalSet.decisions.length}.`);
  }
  if (approvalSet.complete !== (approvalSet.decisions.length === queue.items.length)) {
    errors.push("approvalSet.complete does not match whether every queue item is decided.");
  }
  requireString(approvalSet.decidedAt, "approvalSet.decidedAt", errors);

  const decisionsById = new Map();
  for (const decision of approvalSet.decisions) {
    requireString(decision?.id, "decision id", errors);
    if (decisionsById.has(decision.id)) errors.push(`approval set repeats id ${decision.id}.`);
    decisionsById.set(decision.id, decision);
    const item = queueById.get(decision.id);
    if (!item) {
      errors.push(`decision ${decision.id} is not present in the queue.`);
      continue;
    }
    if (decision.type !== item.type) errors.push(`decision ${decision.id} type does not match the queue.`);
    if (!choiceValues(item.options).includes(decision.choice)) {
      errors.push(`decision ${decision.id} choice ${decision.choice} is not allowed.`);
    }
    requireString(decision.approvedAt, `decision ${decision.id} approvedAt`, errors);

    if (item.type === "span") {
      if (decision.contentKey !== item.contentKey) errors.push(`decision ${decision.id} contentKey does not match the queue.`);
      if (decision.sourceSha256 !== item.sha256) errors.push(`decision ${decision.id} sourceSha256 is stale.`);
      if (decision.choice === "edit" && decision.omitText !== item.span) {
        errors.push(`decision ${decision.id} edit must preserve the queue's exact omitText.`);
      }
    }
    if (["rewrite", "write one"].includes(decision.choice) && (typeof decision.text !== "string" || !decision.text.trim())) {
      errors.push(`decision ${decision.id} ${decision.choice} requires non-empty owner text.`);
    }
  }

  if (errors.length > 0) throw new ApprovalValidationError(errors);

  return {
    schema: "approval-application/v1",
    decidedAt: approvalSet.decidedAt,
    queueSha256: canonicalSha256(queue),
    approvalSetSha256: canonicalSha256(approvalSet),
    complete: approvalSet.complete,
    decisions: queue.items
      .filter((item) => decisionsById.has(item.id))
      .map((item) => ({
        ...decisionsById.get(item.id),
        queue: {
          title: item.title,
          contentKey: item.contentKey ?? null,
          sourceSha256: item.sha256 ?? null,
          promotion: item.promotion ?? null
        }
      })),
    unresolved: queue.items
      .filter((item) => !decisionsById.has(item.id))
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        contentKey: item.contentKey ?? null,
        flag: Boolean(item.flag),
        reason: "pending-owner-decision"
      }))
  };
}

export function writeJsonAtomically(outputPath, value) {
  const directory = path.dirname(outputPath);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(directory, `.${path.basename(outputPath)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
    fs.renameSync(temporary, outputPath);
  } catch (error) {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    throw error;
  }
}
