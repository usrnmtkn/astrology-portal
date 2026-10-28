import { Eye, EyeOff, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { CitySearchField } from "../../components/CitySearchField";
import { isAuthConfigured, resendEmailSignupConfirmation, signInWithEmail, signInWithProvider, signUpWithEmail, requestPasswordReset, updateRecoveredPassword, type AuthAccount } from "../../services/auth";
import { normalizePronounChoice, pronounChoices, pronounChoiceLabels } from "../../services/personReferences";
import { normalizeBirthTime } from "../../services/chartTime";
import { splitSignupBirthTime, formatSignupBirthTime, type AuthMode, type SignupForm, type SignupProvider } from "./signupModel";
export type { AuthMode, SignupForm, SignupProvider } from "./signupModel";

type SignupViewProps = {
  hasPendingInvitation: boolean;
  initialForm: SignupForm;
  initialMode?: AuthMode;
  initialAccount?: AuthAccount | null;
  recovery?: boolean;
  presentation?: "dialog";
  loginHeadline?: string;
  onAuthenticated: (result: { account: AuthAccount; form: SignupForm; isNewAccount: boolean; provider: SignupProvider }) => void;
  onClearPendingForm: () => void;
  onClose: () => void;
  onEmailConfirmationRequired: () => void;
  onSavePendingForm: (form: SignupForm) => void;
};
function GoogleIcon() {
  return (
    <svg className="google-mark" aria-hidden="true" viewBox="0 0 20 20" focusable="false">
      <path d="M19.6 10.23c0-.71-.06-1.39-.18-2.05H10v3.87h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.35Z" fill="#4285F4" />
      <path d="M10 20c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95a5.9 5.9 0 0 1-5.6-4.12H1.06v2.59A9.99 9.99 0 0 0 10 20Z" fill="#34A853" />
      <path d="M4.4 11.9a6.01 6.01 0 0 1 0-3.8V5.51H1.06a10 10 0 0 0 0 8.98L4.4 11.9Z" fill="#FBBC04" />
      <path d="M10 3.98c1.47 0 2.79.5 3.82 1.49l2.87-2.86A9.6 9.6 0 0 0 10 0 9.99 9.99 0 0 0 1.06 5.51L4.4 8.1A5.9 5.9 0 0 1 10 3.98Z" fill="#E94235" />
    </svg>
  );
}

export function SignupView({ initialForm, initialMode = "create", initialAccount, recovery, presentation, loginHeadline, onAuthenticated, onClearPendingForm, onClose, onEmailConfirmationRequired, onSavePendingForm }: SignupViewProps) {
  const [form, setForm] = useState({ ...initialForm, pronouns: normalizePronounChoice(initialForm.pronouns) });
  const [mode, setMode] = useState(initialMode);
  const [phase, setPhase] = useState<"credentials" | "check-email" | "chart" | "forgot" | "reset">(recovery ? "reset" : initialAccount ? "chart" : "credentials");
  const [account, setAccount] = useState(initialAccount ?? null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  useEffect(() => { if (initialAccount && !recovery) { setAccount(initialAccount); setForm(current => ({ ...current, fullName: current.fullName || initialAccount.name || "" })); setPhase("chart"); } }, [initialAccount, recovery]);
  const update = <K extends keyof SignupForm>(key: K, value: SignupForm[K]) => setForm(current => ({ ...current, [key]: value }));
  const title = phase === "chart" ? "Your chart" : phase === "check-email" ? "Check your email" : phase === "forgot" ? "Reset your password" : phase === "reset" ? "Choose a new password" : mode === "login" ? "Log in" : "Create an account";
  const finish = (nextAccount: AuthAccount, nextForm: SignupForm, isNewAccount: boolean, provider: SignupProvider) => {
    onAuthenticated({ account: nextAccount, form: nextForm, isNewAccount, provider });
    onClearPendingForm();
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (busy) return;
    if (!isAuthConfigured) { setMessage("Sign-in is not available right now. Please try again later."); return; }
    if (phase === "chart") {
      if (!account) return;
      if (!initialAccount || initialAccount.id !== account.id) { setMessage("Your account is still loading. Try saving your chart in a moment."); return; }
      if (!form.fullName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate) || !form.birthLocation || !form.currentLocationData) {
        setMessage("Add your name, birth date, birth place and current city. Choose each city from the search results."); return;
      }
      try {
        const next = { ...form, birthTime: form.unknownBirthTime ? "12:00 PM" : normalizeBirthTime(form.birthTime), onboarding: false };
        finish(account, next, true, account.provider === "google" ? "google" : "email");
      } catch { setMessage("Add a complete birth time, or choose “I don’t know my birth time”."); }
      return;
    }
    setBusy(true);
    try {
      if (phase === "forgot") { await requestPasswordReset(form.email.trim()); setMessage("Check your email for a link to reset your password."); return; }
      if (phase === "reset") { const next = await updateRecoveredPassword(form.password); finish(next, form, false, "email"); return; }
      if (mode === "login") {
        const next = await signInWithEmail({ email: form.email.trim(), password: form.password });
        if (next) finish(next, form, false, "email");
      } else {
        onSavePendingForm({ ...form, password: "", onboarding: true });
        const result = await signUpWithEmail({ email: form.email.trim(), password: form.password, fullName: "" });
        if (result.account && result.sessionEstablished) { setAccount(result.account); setPhase("chart"); }
        else { onEmailConfirmationRequired(); setConfirmationEmail(form.email.trim()); setPhase("check-email"); }
      }
    } catch (error) {
      if (mode === "login" && error && typeof error === "object" && "code" in error && error.code === "email_not_confirmed") {
        setConfirmationEmail(form.email.trim()); setPhase("check-email");
      } else setMessage(error instanceof Error ? error.message : "Sign-in could not finish. Please try again.");
    } finally { setBusy(false); }
  }
  async function google() {
    setBusy(true); setMessage("");
    try { if (mode === "create") onSavePendingForm({ ...form, password: "", onboarding: true }); await signInWithProvider("google"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Google sign-in could not start."); setBusy(false); }
  }
  async function resend() {
    if (busy) return; setBusy(true); setMessage("");
    try { await resendEmailSignupConfirmation(confirmationEmail); setMessage("A new confirmation email was sent."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The email could not be resent."); }
    finally { setBusy(false); }
  }
  function switchMode() { setMode(mode === "login" ? "create" : "login"); setMessage(""); }
  const parts = splitSignupBirthTime(form.birthTime);
  const password = <label className="auth-field"><span>Password</span><span className="password-control"><input className="auth-input" aria-label="Password" type={visible ? "text" : "password"} autoComplete={mode === "login" && phase !== "reset" ? "current-password" : "new-password"} value={form.password} required minLength={mode === "login" && phase !== "reset" ? 1 : 8} onChange={event => update("password", event.target.value)} /><button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button></span>{(mode === "create" || phase === "reset") && <small>At least 8 characters</small>}</label>;
  return <section className={`auth-page auth-flow-v2${phase === "chart" ? " auth-flow-v2--chart" : ""}${presentation ? " auth-flow-v2--dialog" : ""}`} aria-label={title}>
    <button type="button" className="auth-flow-close" aria-label="Close" onClick={onClose}><X size={20} aria-hidden="true" /></button>
    <div className="auth-flow-content">
      <header className="auth-flow-heading"><h1 id="auth-flow-title">{title}</h1>{phase === "chart" ? <p>Step 3 of 3 · Your own chart</p> : phase === "credentials" && <p>{mode === "login" ? loginHeadline ?? "Welcome back to your sky." : "Save your chart and connect with your circle."}</p>}</header>
      {phase === "check-email" ? <div className="auth-flow-confirmation"><p>Tap the link we sent to <strong>{confirmationEmail}</strong>.</p><button type="button" className="auth-primary-button" disabled={busy} onClick={() => void resend()}>{busy ? "Sending…" : "Resend email"}</button><button type="button" className="auth-flow-text-button" onClick={() => { setPhase("credentials"); setMessage(""); }}>Use a different email</button></div> : <form onSubmit={submit} className="auth-flow-form">
        {phase === "credentials" && <><button className="google-auth-button" type="button" disabled={busy} onClick={() => void google()}><GoogleIcon />Continue with Google</button><div className="email-divider auth-divider"><span>or with email</span></div></>}
        {phase === "chart" ? <>
          <label className="auth-field"><span>Name</span><input className="auth-input" autoComplete="name" value={form.fullName} required onChange={event => update("fullName", event.target.value)} /></label>
          <fieldset className="auth-flow-pronouns"><legend>Pronouns</legend><div className="segmented-control">{pronounChoices.map(value => <button type="button" key={value} className={`segmented-control__item${form.pronouns === value ? " segmented-control__item--active" : ""}`} aria-pressed={form.pronouns === value} onClick={() => update("pronouns", value)}>{pronounChoiceLabels[value]}</button>)}</div></fieldset>
          <label className="auth-field"><span>Birth date</span><input className="auth-input" type="date" value={form.birthDate} required max={new Date().toLocaleDateString("en-CA")} onChange={event => update("birthDate", event.target.value)} /></label>
          <fieldset className="auth-flow-time"><legend>Birth time</legend><div className="auth-flow-time-inputs"><input aria-label="Birth hour" className="auth-input" inputMode="numeric" placeholder="--" disabled={form.unknownBirthTime} value={form.unknownBirthTime ? "" : parts.hour} onChange={event => update("birthTime", formatSignupBirthTime({ ...parts, hour: event.target.value.replace(/\D/g, "").slice(0, 2) }))} /><span>:</span><input aria-label="Birth minute" className="auth-input" inputMode="numeric" placeholder="--" disabled={form.unknownBirthTime} value={form.unknownBirthTime ? "" : parts.minute} onChange={event => update("birthTime", formatSignupBirthTime({ ...parts, minute: event.target.value.replace(/\D/g, "").slice(0, 2) }))} /><div className="segmented-control">{(["AM", "PM"] as const).map(value => <button type="button" key={value} className={`segmented-control__item${parts.meridiem === value ? " segmented-control__item--active" : ""}`} disabled={form.unknownBirthTime} aria-pressed={parts.meridiem === value} onClick={() => update("birthTime", formatSignupBirthTime({ ...parts, meridiem: value }))}>{value}</button>)}</div></div></fieldset>
          <label className="unknown-time"><input type="checkbox" checked={form.unknownBirthTime} onChange={event => update("unknownBirthTime", event.target.checked)} /><span>I don’t know my birth time</span></label>
          {form.unknownBirthTime && <p className="auth-flow-note">Your chart uses noon. Houses and your Rising sign stay hidden until you add a time.</p>}
          <CitySearchField label="Birth place" placeholder="Search for your birth place" value={form.birthCity} onChange={value => setForm(current => ({ ...current, birthCity: value, birthLocation: null }))} onSelect={value => setForm(current => ({ ...current, birthCity: value.label, birthLocation: value }))} className="auth-flow-city" />
          <CitySearchField label="Current city" placeholder="Search for your current city" value={form.currentLocation ?? ""} onChange={value => setForm(current => ({ ...current, currentLocation: value, currentLocationData: null }))} onSelect={value => setForm(current => ({ ...current, currentLocation: value.label, currentLocationData: value }))} className="auth-flow-city" /><p className="auth-flow-note">Used for your daily sky and transits.</p>
        </> : <>{phase !== "reset" && <label className="auth-field"><span>Email</span><input className="auth-input" type="email" autoComplete="email" value={form.email} required onChange={event => update("email", event.target.value)} /></label>}{phase !== "forgot" && password}{phase === "credentials" && mode === "login" && <button type="button" className="auth-flow-text-button auth-flow-forgot" onClick={() => { setPhase("forgot"); setMessage(""); }}>Forgot password?</button>}</>}
        <button type="submit" className="auth-primary-button" disabled={busy || phase === "chart" && !initialAccount}>{busy ? "Please wait…" : phase === "chart" ? "Save chart" : phase === "forgot" ? "Send reset link" : phase === "reset" ? "Save password" : mode === "login" ? "Log in" : "Create an account"}</button>
        {phase === "credentials" ? <p className="auth-flow-switch">{mode === "login" ? "New here?" : "Already have an account?"} <button type="button" className="auth-flow-text-button" onClick={switchMode}>{mode === "login" ? "Create an account" : "Log in"}</button></p> : phase === "forgot" && <button type="button" className="auth-flow-text-button" onClick={() => { setPhase("credentials"); setMessage(""); }}>Back to log in</button>}
      </form>}
      {message && <p role="status" className="auth-message">{message}</p>}
    </div>
  </section>;
}
