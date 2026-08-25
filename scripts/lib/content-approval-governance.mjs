import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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

export function canonicalSha256(value) {
  return sha256(canonicalJson(value));
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
          sourceSha256: item.sha256 ?? null
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
