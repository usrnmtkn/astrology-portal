import { ChevronRight, Download, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { UserProfile } from "../../App";
import { ModalPortal } from "../../components/ModalPortal";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import {
  deleteOwnAccount,
  resendPhoneNumberChangeCode,
  sendPhoneSignInCode,
  startPhoneNumberChange,
  verifyPhoneNumberChange,
  verifyPhoneSignInCode
} from "../../services/auth";
import { birthTimeInputMessage, normalizeBirthTime } from "../../services/chartTime";
import {
  formatUsPhoneInput,
  isValidUsPhoneNumber,
  maskPhoneNumber,
  phoneNumberLastFour,
  supportedPhoneCountry
} from "../../services/phoneAuth";
import {
  exportSocialAccountBundle,
  loadOwnSocialProfile,
  normalizeSocialHandle,
  saveSocialHandle,
  socialHandleIsValid,
  type SocialProfile
} from "../../services/socialFriends";

type BirthDetails = {
  birthCity: string;
  birthDate: string;
  birthTime: string;
};

type AccountViewProps = {
  profile: UserProfile;
  savedBirthCity: string;
  savedBirthDate: string;
  savedBirthTime: string;
  onAccountDeleted: () => void;
  onBirthDetailsChange: (details: BirthDetails) => void;
  onPhoneChange: (phone: string) => void;
  onSignOut: () => void | Promise<void>;
  onSocialProfileChange: (socialProfile: SocialProfile) => void;
};

function providerLabel(provider: UserProfile["provider"]) {
  return {
    email: "Email",
    google: "Google",
    phone: "Phone"
  }[provider];
}

export function AccountView({
  profile,
  savedBirthCity,
  savedBirthDate,
  savedBirthTime,
  onAccountDeleted,
  onBirthDetailsChange,
  onPhoneChange,
  onSignOut,
  onSocialProfileChange
}: AccountViewProps) {
  const [draftBirthDate, setDraftBirthDate] = useState(savedBirthDate);
  const [draftBirthTime, setDraftBirthTime] = useState(savedBirthTime);
  const [draftBirthCity, setDraftBirthCity] = useState(savedBirthCity);
  const [birthDetailsMessage, setBirthDetailsMessage] = useState("");
  const [socialHandle, setSocialHandle] = useState<string | null>(null);
  const [handleDraft, setHandleDraft] = useState("");
  const [handleStatus, setHandleStatus] = useState<"loading" | "ready" | "saving" | "unavailable">("loading");
  const [handleEditing, setHandleEditing] = useState(false);
  const [handleMessage, setHandleMessage] = useState("");
  const [accountActionStatus, setAccountActionStatus] = useState<"idle" | "exporting" | "deleting">("idle");
  const [accountActionMessage, setAccountActionMessage] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [phoneChangeOpen, setPhoneChangeOpen] = useState(false);
  const [phoneChangeStep, setPhoneChangeStep] = useState<"current-code" | "new-number" | "new-code" | "success">("current-code");
  const [phoneChangeStatus, setPhoneChangeStatus] = useState<"idle" | "loading">("idle");
  const [phoneChangeMessage, setPhoneChangeMessage] = useState("");
  const [currentPhoneCode, setCurrentPhoneCode] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPhoneCode, setNewPhoneCode] = useState("");
  const [phoneChangeDestination, setPhoneChangeDestination] = useState("");
  const [phoneChangeResendSeconds, setPhoneChangeResendSeconds] = useState(0);

  useEffect(() => {
    setDraftBirthDate(savedBirthDate);
    setDraftBirthTime(savedBirthTime);
    setDraftBirthCity(savedBirthCity);
  }, [savedBirthDate, savedBirthTime, savedBirthCity]);

  useEffect(() => {
    if (phoneChangeResendSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPhoneChangeResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [phoneChangeResendSeconds]);

  useEffect(() => {
    let cancelled = false;

    setHandleStatus("loading");
    setHandleMessage("");

    loadOwnSocialProfile()
      .then((socialProfile) => {
        if (cancelled) {
          return;
        }

        const nextHandle = socialProfile?.handle ?? null;
        setSocialHandle(nextHandle);
        setHandleDraft(nextHandle ?? "");
        setHandleStatus("ready");
        if (socialProfile) {
          onSocialProfileChange(socialProfile);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setHandleStatus("unavailable");
        setHandleMessage(error instanceof Error ? error.message : "Could not load your handle.");
      });

    return () => {
      cancelled = true;
    };
  }, [onSocialProfileChange, profile.id]);

  const birthDraftDirty =
    draftBirthDate !== savedBirthDate ||
    draftBirthTime !== savedBirthTime ||
    draftBirthCity !== savedBirthCity;
  const normalizedHandleDraft = normalizeSocialHandle(handleDraft);
  const handleDraftValid = socialHandleIsValid(normalizedHandleDraft);
  const handleDraftDirty = normalizedHandleDraft !== (socialHandle ?? "");

  const startHandleEdit = () => {
    setHandleDraft(socialHandle ?? "");
    setHandleEditing(true);
    setHandleMessage("");
  };

  const cancelHandleEdit = () => {
    setHandleDraft(socialHandle ?? "");
    setHandleEditing(false);
    setHandleMessage("");
  };

  const saveHandle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!handleDraftValid) {
      setHandleMessage("Use 3–24 characters, starting with a letter. Letters, numbers, and underscores only.");
      return;
    }

    setHandleStatus("saving");
    setHandleMessage("");

    try {
      const savedProfile = await saveSocialHandle({
        handle: normalizedHandleDraft,
        displayName: profile.name,
        avatarUrl: profile.avatarUrl
      });
      const nextHandle = savedProfile.handle ?? normalizedHandleDraft;

      setSocialHandle(nextHandle);
      setHandleDraft(nextHandle);
      setHandleEditing(false);
      setHandleStatus("ready");
      setHandleMessage(`Handle updated to @${nextHandle}.`);
      onSocialProfileChange(savedProfile);
    } catch (error) {
      setHandleStatus("ready");
      setHandleMessage(error instanceof Error ? error.message : "Could not update your handle.");
    }
  };

  const saveBirthChartDetails = () => {
    let birthTime = draftBirthTime.trim();
    if (birthTime && birthTime !== "Time unknown") {
      try {
        birthTime = normalizeBirthTime(birthTime);
      } catch {
        setBirthDetailsMessage(birthTimeInputMessage);
        return;
      }
    }
    setDraftBirthTime(birthTime);
    setBirthDetailsMessage("Birth details saved.");
    onBirthDetailsChange({
      birthDate: draftBirthDate.trim(),
      birthTime,
      birthCity: draftBirthCity.trim()
    });
  };

  const exportAccountData = async () => {
    setAccountActionStatus("exporting");
    setAccountActionMessage("");

    try {
      const social = await exportSocialAccountBundle();
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        account: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          provider: profile.provider
        },
        profile,
        social
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `tldr-astro-${social.profile?.handle ?? "account"}-export.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setAccountActionMessage("Your account export was downloaded.");
    } catch (error) {
      setAccountActionMessage(error instanceof Error ? error.message : "Could not export your account.");
    } finally {
      setAccountActionStatus("idle");
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      return;
    }

    setAccountActionStatus("deleting");
    setAccountActionMessage("");

    try {
      await deleteOwnAccount();
      setDeleteDialogOpen(false);
      onAccountDeleted();
    } catch (error) {
      setAccountActionStatus("idle");
      setAccountActionMessage(error instanceof Error ? error.message : "Could not delete your account.");
    }
  };

  const openPhoneChange = async () => {
    if (!profile.phone) {
      return;
    }

    setPhoneChangeOpen(true);
    setPhoneChangeStep("current-code");
    setPhoneChangeStatus("loading");
    setPhoneChangeMessage("");
    setCurrentPhoneCode("");
    setNewPhoneNumber("");
    setNewPhoneCode("");
    setPhoneChangeDestination("");

    try {
      await sendPhoneSignInCode(profile.phone, {
        shouldCreateUser: false
      });
      setPhoneChangeResendSeconds(30);
    } catch (error) {
      setPhoneChangeMessage(error instanceof Error ? error.message : "Could not send a code to your current number.");
    } finally {
      setPhoneChangeStatus("idle");
    }
  };

  const verifyCurrentPhone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile.phone || currentPhoneCode.length !== 6) {
      return;
    }

    setPhoneChangeStatus("loading");
    setPhoneChangeMessage("");

    try {
      await verifyPhoneSignInCode({
        phone: profile.phone,
        code: currentPhoneCode
      });
      setPhoneChangeStep("new-number");
      setPhoneChangeResendSeconds(0);
    } catch (error) {
      setPhoneChangeMessage(error instanceof Error ? error.message : "That code could not be confirmed.");
    } finally {
      setPhoneChangeStatus("idle");
    }
  };

  const sendNewPhoneCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidUsPhoneNumber(newPhoneNumber)) {
      return;
    }

    setPhoneChangeStatus("loading");
    setPhoneChangeMessage("");

    try {
      const destination = await startPhoneNumberChange(newPhoneNumber);

      setPhoneChangeDestination(destination);
      setPhoneChangeStep("new-code");
      setPhoneChangeResendSeconds(30);
    } catch (error) {
      setPhoneChangeMessage(error instanceof Error ? error.message : "Could not send a code to the new number.");
    } finally {
      setPhoneChangeStatus("idle");
    }
  };

  const confirmNewPhone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!phoneChangeDestination || newPhoneCode.length !== 6) {
      return;
    }

    setPhoneChangeStatus("loading");
    setPhoneChangeMessage("");

    try {
      const account = await verifyPhoneNumberChange({
        phone: phoneChangeDestination,
        code: newPhoneCode
      });

      onPhoneChange(account?.phone || phoneChangeDestination);
      setPhoneChangeStep("success");
      setPhoneChangeResendSeconds(0);
    } catch (error) {
      setPhoneChangeMessage(error instanceof Error ? error.message : "That code could not be confirmed.");
    } finally {
      setPhoneChangeStatus("idle");
    }
  };

  const resendPhoneChangeCode = async () => {
    const destination = phoneChangeStep === "current-code" ? profile.phone : phoneChangeDestination;

    if (!destination) {
      return;
    }

    setPhoneChangeStatus("loading");
    setPhoneChangeMessage("");

    try {
      if (phoneChangeStep === "current-code") {
        await sendPhoneSignInCode(destination, {
          shouldCreateUser: false
        });
      } else {
        await resendPhoneNumberChangeCode(destination);
      }
      setPhoneChangeResendSeconds(30);
      setPhoneChangeMessage("A new code is on its way.");
    } catch (error) {
      setPhoneChangeMessage(error instanceof Error ? error.message : "Could not send a new code.");
    } finally {
      setPhoneChangeStatus("idle");
    }
  };

  const profilePhoneLastFour = profile.phone ? phoneNumberLastFour(profile.phone) : "";
  const accountLoginSummary = profile.provider === "phone" && profilePhoneLastFour
    ? `Signed in with Phone ending in ${profilePhoneLastFour}`
    : profile.email || `Signed in with ${providerLabel(profile.provider)}`;

  return (
    <section className="account-page page-shell--narrow" aria-label="Account">
      <div className="account-page-heading">
        <h1>account.</h1>
      </div>

      <section className="settings-card settings-account-card" aria-label="Account details">
        <div className="settings-profile-row">
          <ProfileAvatar avatarUrl={profile.avatarUrl} email={profile.email} name={profile.name} size="large" />
          <div>
            <h3>{profile.name}</h3>
            <span>{accountLoginSummary}</span>
          </div>
        </div>

        <div className="settings-list">
          <div className="settings-row">
            <span className="settings-row__label">Name</span>
            <span className="settings-row__value">{profile.name}</span>
          </div>
          {profile.email && (
            <div className="settings-row">
              <span className="settings-row__label">Email</span>
              <span className="settings-row__value">{profile.email}</span>
            </div>
          )}
          {profile.phone && profilePhoneLastFour && (
            <button
              type="button"
              className="settings-row settings-row-button"
              onClick={() => void openPhoneChange()}
            >
              <span className="settings-row__label">Phone</span>
              <span className="settings-row__field">
                <span className="settings-row__value">{maskPhoneNumber(profile.phone)}</span>
                <span className="settings-row__change">Change</span>
                <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
              </span>
            </button>
          )}
          {handleEditing ? (
            <form className="settings-row account-handle-edit-row" onSubmit={saveHandle}>
              <label className="settings-row__label" htmlFor="account-social-handle">Handle</label>
              <span className="account-handle-editor">
                <span className="account-handle-input-wrap">
                  <span aria-hidden="true">@</span>
                  <input
                    id="account-social-handle"
                    value={handleDraft}
                    onChange={(event) => {
                      setHandleDraft(event.target.value);
                      setHandleMessage("");
                    }}
                    placeholder="your_handle"
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-describedby="account-handle-help"
                    autoFocus
                  />
                </span>
                <span className="account-handle-actions">
                  <button type="button" className="account-handle-cancel" onClick={cancelHandleEdit}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="account-handle-save"
                    disabled={handleStatus === "saving" || !handleDraftValid || !handleDraftDirty}
                  >
                    {handleStatus === "saving" ? "Saving…" : "Save"}
                  </button>
                </span>
              </span>
            </form>
          ) : (
            <button
              type="button"
              className="settings-row settings-row-button account-handle-row"
              onClick={startHandleEdit}
              disabled={handleStatus !== "ready"}
            >
              <span className="settings-row__label">Handle</span>
              <span className="settings-row__field">
                <span className="settings-row__value">
                  {handleStatus === "loading"
                    ? "Loading…"
                    : handleStatus === "unavailable"
                      ? "Unavailable"
                      : socialHandle
                        ? `@${socialHandle}`
                        : "Choose a handle"}
                </span>
                {handleStatus === "ready" && <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />}
              </span>
            </button>
          )}
          {(handleEditing || handleMessage) && (
            <div
              id="account-handle-help"
              className={`account-handle-message${handleMessage ? " has-message" : ""}`}
              role={handleMessage ? "status" : undefined}
              aria-live="polite"
            >
              {handleMessage || "3–24 characters. Start with a letter; use letters, numbers, or underscores."}
            </div>
          )}
          <div className="settings-row">
            <span className="settings-row__label">Signed in with</span>
            <span className="settings-row__value settings-row__value--provider">{providerLabel(profile.provider)}</span>
          </div>
          <button type="button" className="settings-row settings-signout-row" onClick={onSignOut}>
            <span className="settings-row__action">Sign out</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="settings-group account-chart-group" aria-label="Birth chart">
        <span className="settings-group-label">Birth chart</span>
        <div className="settings-card">
          <div className="settings-list">
            <label className="settings-row account-editable-row">
              <span className="settings-row__label">Date</span>
              <span className="settings-row__field">
                <input
                  className="account-row-input"
                  type="date"
                  value={draftBirthDate}
                  onChange={(event) => setDraftBirthDate(event.target.value)}
                  aria-label="Birth date"
                />
                <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
              </span>
            </label>
            <label className="settings-row account-editable-row">
              <span className="settings-row__label">Time</span>
              <span className="settings-row__field">
                <input
                  className="account-row-input"
                  type="text"
                  inputMode="text"
                  value={draftBirthTime}
                  onChange={(event) => {
                    setDraftBirthTime(event.target.value);
                    setBirthDetailsMessage("");
                  }}
                  placeholder="Not set"
                  aria-label="Birth time"
                />
                <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
              </span>
            </label>
            <label className="settings-row account-editable-row">
              <span className="settings-row__label">Place</span>
              <span className="settings-row__field">
                <input
                  className="account-row-input"
                  type="text"
                  value={draftBirthCity}
                  onChange={(event) => setDraftBirthCity(event.target.value)}
                  placeholder="Not set"
                  aria-label="Birth place"
                />
                <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
              </span>
            </label>
            <div className="settings-row">
              <span className="settings-row__label">House system</span>
              <span className="settings-row__value">Whole Sign</span>
            </div>
            {birthDraftDirty && (
              <div className="settings-row account-birth-save-row">
                <span>Birth details</span>
                <button className="account-birth-save-button" type="button" onClick={saveBirthChartDetails}>
                  Save changes
                </button>
              </div>
            )}
            {birthDetailsMessage && <p className="account-action-message" role="status">{birthDetailsMessage}</p>}
          </div>
        </div>
      </section>

      <section className="settings-group account-data-group" aria-label="Account data">
        <span className="settings-group-label">Your data</span>
        <div className="settings-card">
          <div className="settings-list">
            <button
              type="button"
              className="settings-row settings-row-button account-data-action"
              disabled={accountActionStatus !== "idle"}
              onClick={() => void exportAccountData()}
            >
              <span className="settings-row-copy">
                <span className="settings-row-title">Export account</span>
                <small className="settings-row-description">
                  Download your profile, chart data, friendships, requests, and blocked accounts.
                </small>
              </span>
              <Download size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="settings-row settings-row-button account-data-action account-delete-action"
              disabled={accountActionStatus !== "idle"}
              onClick={() => {
                setDeleteConfirmation("");
                setDeleteDialogOpen(true);
                setAccountActionMessage("");
              }}
            >
              <span className="settings-row-copy">
                <span className="settings-row-title">Delete account</span>
                <small className="settings-row-description">
                  Permanently remove your account, profile, friendships, requests, and saved charts.
                </small>
              </span>
              <Trash2 size={19} aria-hidden="true" />
            </button>
          </div>
        </div>
        {accountActionMessage && (
          <p className="account-action-message" role="status" aria-live="polite">
            {accountActionMessage}
          </p>
        )}
      </section>

      {deleteDialogOpen && (
        <ModalPortal
          closeOnBackdrop={accountActionStatus !== "deleting"}
          onClose={() => {
            if (accountActionStatus !== "deleting") {
              setDeleteDialogOpen(false);
            }
          }}
          panelClassName="account-delete-modal"
          titleId="account-delete-title"
          width="min(500px, calc(100vw - 32px))"
        >
          <button
            className="modal-close"
            type="button"
            aria-label="Close delete account dialog"
            disabled={accountActionStatus === "deleting"}
            onClick={() => setDeleteDialogOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
          <span className="eyebrow section-label">Permanent action</span>
          <h2 id="account-delete-title">Delete your TLDR Astro account?</h2>
          <p>
            This permanently removes your profile, charts, friend connections, requests, blocks, and account login.
            This cannot be undone.
          </p>
          <label htmlFor="account-delete-confirmation">
            Type <strong>DELETE</strong> to confirm
          </label>
          <input
            id="account-delete-confirmation"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="account-delete-actions">
            <button
              type="button"
              className="account-handle-cancel"
              disabled={accountActionStatus === "deleting"}
              onClick={() => setDeleteDialogOpen(false)}
            >
              Keep account
            </button>
            <button
              type="button"
              className="account-delete-confirm-button"
              disabled={deleteConfirmation !== "DELETE" || accountActionStatus === "deleting"}
              onClick={() => void deleteAccount()}
            >
              {accountActionStatus === "deleting" ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </ModalPortal>
      )}

      {phoneChangeOpen && (
        <ModalPortal
          closeOnBackdrop={phoneChangeStatus !== "loading"}
          onClose={() => {
            if (phoneChangeStatus !== "loading") {
              setPhoneChangeOpen(false);
            }
          }}
          panelClassName="account-phone-modal"
          titleId="account-phone-title"
          width="min(500px, calc(100vw - 32px))"
        >
          <button
            className="modal-close"
            type="button"
            aria-label="Close change phone dialog"
            disabled={phoneChangeStatus === "loading"}
            onClick={() => setPhoneChangeOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>

          {phoneChangeStep === "current-code" && (
            <form onSubmit={verifyCurrentPhone}>
              <span className="eyebrow section-label">Verify it’s you</span>
              <h2 id="account-phone-title">Check your current phone</h2>
              <p>Enter the code sent to {profile.phone ? maskPhoneNumber(profile.phone) : "your current number"}.</p>
              <label>
                <span>Six-digit code</span>
                <input
                  value={currentPhoneCode}
                  onChange={(event) => {
                    setCurrentPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setPhoneChangeMessage("");
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                />
              </label>
              {phoneChangeMessage && <p className="account-phone-message" role="status">{phoneChangeMessage}</p>}
              <button className="account-phone-primary" type="submit" disabled={phoneChangeStatus === "loading" || currentPhoneCode.length !== 6}>
                {phoneChangeStatus === "loading" ? "Confirming…" : "Confirm current number"}
              </button>
              <button
                className="account-phone-secondary"
                type="button"
                disabled={phoneChangeStatus === "loading" || phoneChangeResendSeconds > 0}
                onClick={() => void resendPhoneChangeCode()}
              >
                {phoneChangeResendSeconds > 0
                  ? `Send a new code in 0:${String(phoneChangeResendSeconds).padStart(2, "0")}`
                  : "Send a new code"}
              </button>
            </form>
          )}

          {phoneChangeStep === "new-number" && (
            <form onSubmit={sendNewPhoneCode}>
              <span className="eyebrow section-label">New number</span>
              <h2 id="account-phone-title">Enter your new phone</h2>
              <p>We’ll text a six-digit code to confirm the change.</p>
              <label>
                <span>Mobile number</span>
                <div className="phone-auth-number-control">
                  <select className="phone-auth-country-select" aria-label="Country code" value={supportedPhoneCountry.code} onChange={() => undefined}>
                    <option value={supportedPhoneCountry.code}>US {supportedPhoneCountry.callingCode}</option>
                  </select>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(212) 555-0100"
                    value={newPhoneNumber}
                    onChange={(event) => {
                      setNewPhoneNumber(formatUsPhoneInput(event.target.value));
                      setPhoneChangeMessage("");
                    }}
                    autoFocus
                  />
                </div>
              </label>
              {phoneChangeMessage && <p className="account-phone-message" role="status">{phoneChangeMessage}</p>}
              <button className="account-phone-primary" type="submit" disabled={phoneChangeStatus === "loading" || !isValidUsPhoneNumber(newPhoneNumber)}>
                {phoneChangeStatus === "loading" ? "Sending…" : "Send code"}
              </button>
            </form>
          )}

          {phoneChangeStep === "new-code" && (
            <form onSubmit={confirmNewPhone}>
              <span className="eyebrow section-label">Confirm new number</span>
              <h2 id="account-phone-title">Enter the code</h2>
              <p>Enter the code sent to {maskPhoneNumber(phoneChangeDestination)}.</p>
              <label>
                <span>Six-digit code</span>
                <input
                  value={newPhoneCode}
                  onChange={(event) => {
                    setNewPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setPhoneChangeMessage("");
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                />
              </label>
              {phoneChangeMessage && <p className="account-phone-message" role="status">{phoneChangeMessage}</p>}
              <button className="account-phone-primary" type="submit" disabled={phoneChangeStatus === "loading" || newPhoneCode.length !== 6}>
                {phoneChangeStatus === "loading" ? "Confirming…" : "Confirm new number"}
              </button>
              <button
                className="account-phone-secondary"
                type="button"
                disabled={phoneChangeStatus === "loading" || phoneChangeResendSeconds > 0}
                onClick={() => void resendPhoneChangeCode()}
              >
                {phoneChangeResendSeconds > 0
                  ? `Send a new code in 0:${String(phoneChangeResendSeconds).padStart(2, "0")}`
                  : "Send a new code"}
              </button>
            </form>
          )}

          {phoneChangeStep === "success" && (
            <div>
              <span className="eyebrow section-label">Phone updated</span>
              <h2 id="account-phone-title">Your phone number has been updated</h2>
              <p>Future sign-in codes will go to {maskPhoneNumber(phoneChangeDestination)}.</p>
              <button className="account-phone-primary" type="button" onClick={() => setPhoneChangeOpen(false)}>
                Done
              </button>
            </div>
          )}
        </ModalPortal>
      )}
    </section>
  );
}
