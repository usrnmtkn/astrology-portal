import { useEffect, useState } from "react";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { StudioButton, StudioTextarea } from "./StudioControls";
import { adminCredentialHeaders, adminSecretStorageKey } from "./adminSecret";
import { loadOwnerSessionAccessToken } from "./ownerSession";

type Audience = "you" | "friend" | "both";
type Check = { code: string; audience?: "you" | "friend"; detail: string };
type NextMissing = {
  contentKey: string;
  transiting: string;
  natal: string;
  aspect: string;
  missingAudiences: Array<"you" | "friend">;
};

type Props = {
  contentKey: string;
  transiting?: string;
  natal?: string;
  aspect?: string;
  transitHouse?: string;
  natalHouse?: string;
  planet?: string;
  house?: string;
  sign?: string;
  youText: string;
  friendText: string;
  disabled: boolean;
  onUseYou: (text: string) => void;
  onUseFriend: (text: string) => void;
  onOpenNext?: (next: NextMissing) => void;
  defaultOpen?: boolean;
};

async function contentStudioCredential() {
  const session = await loadOwnerSessionAccessToken();
  if (session) return session;
  try {
    return window.localStorage.getItem(adminSecretStorageKey) ?? "";
  } catch {
    return "";
  }
}

export default function PersonalTransitAiWriter({
  transiting = "", natal = "", aspect = "", transitHouse = "", natalHouse = "",
  planet = "", house = "", sign = "", contentKey, youText, friendText, disabled, onUseYou, onUseFriend, onOpenNext, defaultOpen = false
}: Props) {
  const [instruction, setInstruction] = useState("");
  const [audience, setAudience] = useState<Audience>("both");
  const [youDraft, setYouDraft] = useState("");
  const [friendDraft, setFriendDraft] = useState("");
  const [checks, setChecks] = useState<Check[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setInstruction("");
    setYouDraft("");
    setFriendDraft("");
    setChecks([]);
    setMemoryCount(0);
    setError("");
    setStatus("");
    setAudience("both");
  }, [contentKey, sign, transitHouse, natalHouse]);

  const request = async (action: "generate" | "next-missing" | "recheck") => {
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const credential = await contentStudioCredential();
      if (!credential) throw new Error("Content Studio owner access is unavailable. Reload and sign in again before generating.");
      const response = await fetch("/api/admin/personal-transit-writing", {
        method: "POST",
        headers: { "content-type": "application/json", ...adminCredentialHeaders(credential) },
        body: JSON.stringify(action === "next-missing"
          ? { action, afterContentKey: contentKey }
          : {
            action,
            transiting,
            natal,
            aspect,
            transitHouse,
            natalHouse,
            planet,
            house,
            sign,
            contentKey,
            youText,
            friendText,
            instruction,
            audience
          })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "No draft was returned.");
      }
      if (payload.saved || payload.published || payload.approved) {
        throw new Error("The writer tried to save or publish. Existing writing was left unchanged.");
      }
      if (action === "next-missing") {
        if (!payload.next) {
          setStatus("No remaining exact contacts are missing You or Friend copy in packaged writing or saved Studio drafts.");
          return;
        }
        onOpenNext?.(payload.next);
        setStatus(`Opened ${payload.next.contentKey}. Missing: ${payload.next.missingAudiences.join(" and ")}.`);
        return;
      }
      setChecks(Array.isArray(payload.checks) ? payload.checks : []);
      const selected = Array.isArray(payload.memoryReceipt?.selected) ? payload.memoryReceipt.selected.length : 0;
      setMemoryCount(selected);
      if (action === "recheck") {
        setStatus(payload.checks?.length
          ? "Writing checks found issues in the current editor text. Saved copy was not rewritten."
          : "Writing checks passed on the current editor text. Approval and publication stay separate.");
        return;
      }
      const nextYou = typeof payload.youDraft === "string" ? payload.youDraft : "";
      const nextFriend = typeof payload.friendDraft === "string" ? payload.friendDraft : "";
      setYouDraft(nextYou);
      setFriendDraft(nextFriend);
      if (nextYou) onUseYou(nextYou);
      if (nextFriend) onUseFriend(nextFriend);
      const preserved = Array.isArray(payload.preservedAudiences) ? payload.preservedAudiences.join(" and ") : "";
      const memoryNote = selected ? ` Memory Map attached ${selected} correction${selected === 1 ? "" : "s"}.` : "";
      setStatus(preserved
        ? `Copied into this exact contact. Existing ${preserved} copy was left in the editor.${memoryNote}`
        : `Copied into this exact contact's You and Friend fields. Save keeps a draft. Approve & publish stays separate.${memoryNote}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Writing failed. Existing writing was not changed.");
    } finally {
      setBusy(false);
    }
  };

  return <details className="admin-workspace-details" {...(defaultOpen ? { open: true } : {})}>
    <AdminDisclosureSummary>AI writing</AdminDisclosureSummary>
    <p>This generator writes the selected destination only: {destinationLabel({ contentKey, transiting, natal, aspect, transitHouse, natalHouse, planet, house, sign })}. Generate copies into this destination's You and Friend fields. Save keeps a draft on this key. Approve &amp; publish stays with you.</p>
    <label className="admin-review-copy-editor">
      <span>Optional direction</span>
      <StudioTextarea
        value={instruction}
        disabled={disabled || busy}
        maxLength={6000}
        rows={4}
        className="admin-ai-writing-instruction"
        placeholder="Keep the opening; make the advice more specific. Leave blank to fill a missing audience, or to draft this contact when no exact write-up is saved yet."
        onChange={(event) => setInstruction(event.target.value)}
      />
      <small className="admin-field-hint">Direction can revise one audience without regenerating the other.</small>
    </label>
    <div className="admin-sky-writing-source-actions" role="group" aria-label="Personal Transit AI writing actions">
      <StudioButton type="button" disabled={disabled || busy} onClick={() => setAudience("both")}>Both audiences</StudioButton>
      <StudioButton type="button" disabled={disabled || busy} onClick={() => setAudience("you")}>You only</StudioButton>
      <StudioButton type="button" disabled={disabled || busy} onClick={() => setAudience("friend")}>Friend only</StudioButton>
      <StudioButton className="admin-primary-button" type="button" disabled={disabled || busy} onClick={() => void request("generate")}>
        {busy ? "Generating draft…" : "Generate You + Friend draft"}
      </StudioButton>
      <StudioButton type="button" disabled={disabled || busy} onClick={() => void request("recheck")}>Run writing checks</StudioButton>
      {onOpenNext && <StudioButton type="button" disabled={disabled || busy} onClick={() => void request("next-missing")}>Next missing write-up</StudioButton>}
      {youDraft && <StudioButton type="button" disabled={disabled || busy} onClick={() => { onUseYou(youDraft); setYouDraft(""); }}>Use You draft</StudioButton>}
      {friendDraft && <StudioButton type="button" disabled={disabled || busy} onClick={() => { onUseFriend(friendDraft); setFriendDraft(""); }}>Use Friend draft</StudioButton>}
      {(youDraft || friendDraft) && <StudioButton type="button" disabled={busy} onClick={() => { setYouDraft(""); setFriendDraft(""); setChecks([]); setError(""); }}>Discard</StudioButton>}
    </div>
    <p className="admin-field-hint">Current audience request: {audience === "both" ? "You and Friend. Missing fields are filled first; if both already have starter copy and no exact write-up is saved, Generate drafts both" : audience === "you" ? "You only" : "Friend only"}.</p>
    {busy && <p role="status">Writing a private suggestion. Saved copy is unchanged.</p>}
    {status && <p role="status">{status}</p>}
    {memoryCount > 0 && <p className="admin-field-hint">Memory Map: {memoryCount} owner correction{memoryCount === 1 ? "" : "s"} attached to this writing request. They are evidence, not approval.</p>}
    {error && <p role="alert">{error}</p>}
    {checks.length > 0 && <ul aria-label="Writing review checks">
      {checks.map((check) => <li key={`${check.code}:${check.audience}:${check.detail}`}>{check.audience ? `${check.audience}: ${check.detail}` : check.detail}</li>)}
    </ul>}
    {youDraft && <label className="admin-review-copy-editor">
      <span>AI suggestion · You</span>
      <StudioTextarea value={youDraft} readOnly aria-label="AI You suggestion" />
      <small className="admin-field-hint">Use You draft copies this suggestion into the You field only.</small>
    </label>}
    {friendDraft && <label className="admin-review-copy-editor">
      <span>AI suggestion · Friend</span>
      <StudioTextarea value={friendDraft} readOnly aria-label="AI Friend suggestion" />
      <small className="admin-field-hint">Use Friend draft copies this suggestion into the Friend field only.</small>
    </label>}
  </details>;
}

function title(value: string) {
  return value.replace(/-/gu, " ");
}

function houseOrdinal(house: string) {
  if (house === "1") return "1st";
  if (house === "2") return "2nd";
  if (house === "3") return "3rd";
  return house ? `${house}th` : "";
}

function destinationLabel(input: {
  contentKey: string;
  transiting: string;
  natal: string;
  aspect: string;
  transitHouse: string;
  natalHouse: string;
  planet: string;
  house: string;
  sign: string;
}) {
  if (input.contentKey.startsWith("fallback-hook/bond-effect-")) {
    const parts = input.contentKey.split("/");
    const kind = (parts[1] ?? "").slice("bond-effect-".length);
    return `${title(parts[2] ?? input.transiting)} ${kind} Between you two`;
  }
  if (input.contentKey.startsWith("authored/transit-house-sign/")) {
    return `${title(input.planet)} in ${title(input.sign)} through the ${houseOrdinal(input.house)} house`;
  }
  if (input.contentKey.startsWith("authored/transit-house")) {
    return `${title(input.planet || input.transiting)} through the ${houseOrdinal(input.house)} house`;
  }
  if (input.contentKey.startsWith("authored/transit-return/")) {
    return `${title(input.transiting || input.contentKey.split("/")[2] || "this")} return`;
  }
  const situation = [
    input.sign ? `currently in ${title(input.sign)}` : "",
    input.transitHouse ? `from the ${houseOrdinal(input.transitHouse)} house` : "",
    input.natalHouse ? `natal ${title(input.natal)} in the ${houseOrdinal(input.natalHouse)} house` : ""
  ].filter(Boolean);
  return situation.length
    ? `${title(input.transiting)} ${input.aspect} natal ${title(input.natal)}; this draft uses ${situation.join("; ")}`
    : `${title(input.transiting)} ${input.aspect} natal ${title(input.natal)}`;
}
