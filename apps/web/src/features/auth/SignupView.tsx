import { ChevronLeft, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CitySearchField } from "../../components/CitySearchField";
import {
  isAuthConfigured,
  isPhoneAuthEnabled,
  sendPhoneSignInCode,
  signInWithEmail,
  signInWithProvider,
  signUpWithEmail,
  verifyPhoneSignInCode,
  type AuthAccount
} from "../../services/auth";
import {
  formatUsPhoneInput,
  isValidUsPhoneNumber,
  maskPhoneNumber,
  supportedPhoneCountry
} from "../../services/phoneAuth";
import {
  formatSignupBirthDate,
  formatSignupBirthTime,
  signupProviderLabel,
  splitSignupBirthDate,
  splitSignupBirthTime,
  type AuthMode,
  type SignupDateParts,
  type SignupForm,
  type SignupProvider,
  type SignupTimeParts
} from "./signupModel";

export type { AuthMode, SignupForm, SignupProvider } from "./signupModel";

type SignupViewProps = {
  initialForm: SignupForm;
  initialMode?: AuthMode;
  onAuthenticated: (result: {
    account: AuthAccount;
    form: SignupForm;
    isNewAccount: boolean;
    provider: SignupProvider;
  }) => void;
  onClearPendingForm: () => void;
  onClose: () => void;
  onSavePendingForm: (form: SignupForm) => void;
};

function GoogleIcon() {
  return (
    <svg className="google-mark" aria-hidden="true" viewBox="0 0 20 20" focusable="false">
      <path d="M19.6 10.23c0-.71-.06-1.39-.18-2.05H10v3.87h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.35Z" fill="var(--google-blue)" />
      <path d="M10 20c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95a5.9 5.9 0 0 1-5.6-4.12H1.06v2.59A9.99 9.99 0 0 0 10 20Z" fill="var(--google-green)" />
      <path d="M4.4 11.9a6.01 6.01 0 0 1 0-3.8V5.51H1.06a10 10 0 0 0 0 8.98L4.4 11.9Z" fill="var(--google-yellow)" />
      <path d="M10 3.98c1.47 0 2.79.5 3.82 1.49l2.87-2.86A9.6 9.6 0 0 0 10 0 9.99 9.99 0 0 0 1.06 5.51L4.4 8.1A5.9 5.9 0 0 1 10 3.98Z" fill="var(--google-red)" />
    </svg>
  );
}

export function SignupView({
  initialForm,
  initialMode = "create",
  onAuthenticated,
  onClearPendingForm,
  onClose,
  onSavePendingForm
}: SignupViewProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading">("idle");
  const [authMessage, setAuthMessage] = useState("");
  const [phoneAuthOpen, setPhoneAuthOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneOtpDestination, setPhoneOtpDestination] = useState("");
  const [phoneResendSeconds, setPhoneResendSeconds] = useState(0);
  const phoneVerificationCodeRef = useRef("");
  const [birthDateParts, setBirthDateParts] = useState<SignupDateParts>(() => splitSignupBirthDate(initialForm.birthDate));
  const birthTimeParts = splitSignupBirthTime(form.birthTime);
  const isLogin = authMode === "login";

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (phoneResendSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPhoneResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [phoneResendSeconds]);

  function resetPhoneChallenge() {
    setPhoneCodeSent(false);
    setPhoneCode("");
    setPhoneOtpDestination("");
    setPhoneResendSeconds(0);
    setAuthMessage("");
  }

  function updateField<Key extends keyof SignupForm>(key: Key, value: SignupForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateBirthTime(part: keyof SignupTimeParts, value: string) {
    const nextParts = {
      ...birthTimeParts,
      [part]: part === "meridiem" ? value as SignupTimeParts["meridiem"] : value.replace(/\D/g, "").slice(0, 2)
    };

    updateField("birthTime", formatSignupBirthTime(nextParts));
  }

  function updateBirthDate(part: keyof SignupDateParts, value: string) {
    const maxLength = part === "year" ? 4 : 2;
    const nextParts = {
      ...birthDateParts,
      [part]: value.replace(/\D/g, "").slice(0, maxLength)
    };

    setBirthDateParts(nextParts);
    updateField("birthDate", formatSignupBirthDate(nextParts));
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthConfigured) {
      setAuthMessage(`Add Supabase environment variables to enable real email ${isLogin ? "login" : "signup"}.`);
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setAuthMessage(`Add an email and password to ${isLogin ? "log in" : "create your account"}.`);
      return;
    }

    setAuthStatus("loading");
    setAuthMessage("");
    if (!isLogin) {
      onSavePendingForm(form);
    }

    try {
      const account = isLogin
        ? await signInWithEmail({
            email: form.email.trim(),
            password: form.password
          })
        : await signUpWithEmail({
            email: form.email.trim(),
            password: form.password,
            fullName: form.fullName.trim()
          });

      if (account) {
        onAuthenticated({
          account,
          form,
          isNewAccount: !isLogin,
          provider: "email"
        });
        onClearPendingForm();
      } else {
        setAuthMessage("Check your email to confirm your account.");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Email signup failed.");
    } finally {
      setAuthStatus("idle");
    }
  }

  async function socialSignup(provider: "google") {
    if (!isAuthConfigured) {
      setAuthMessage("Add Supabase environment variables to enable real social sign-on.");
      return;
    }

    setAuthStatus("loading");
    setAuthMessage("");
    if (authMode === "create") {
      onSavePendingForm(form);
    } else {
      onClearPendingForm();
    }

    try {
      await signInWithProvider(provider);
    } catch (error) {
      setAuthStatus("idle");
      setAuthMessage(error instanceof Error ? error.message : `${signupProviderLabel(provider)} sign-on failed.`);
    }
  }

  async function sendPhoneCode(isResend = false) {
    if (!phoneNumber.trim()) {
      setAuthMessage("Enter your phone number.");
      return;
    }

    setAuthStatus("loading");
    setAuthMessage("");

    try {
      const destination = await sendPhoneSignInCode(phoneNumber, {
        shouldCreateUser: !isLogin
      });

      setPhoneOtpDestination(destination);
      setPhoneCodeSent(true);
      setPhoneResendSeconds(30);
      setAuthMessage(isResend ? "A new code is on its way." : "");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Could not send the phone code.");
    } finally {
      setAuthStatus("idle");
    }
  }

  async function verifyPhoneCode(code = phoneCode) {
    const verificationCode = code.trim();

    if (verificationCode.length !== 6) {
      setAuthMessage("Enter the six-digit code.");
      return;
    }

    if (phoneVerificationCodeRef.current === verificationCode) {
      return;
    }

    phoneVerificationCodeRef.current = verificationCode;
    setAuthStatus("loading");
    setAuthMessage("");

    if (!isLogin) {
      onSavePendingForm(form);
    }

    try {
      const account = await verifyPhoneSignInCode({
        phone: phoneOtpDestination || phoneNumber,
        code: verificationCode
      });

      if (account) {
        onAuthenticated({
          account,
          form,
          isNewAccount: !isLogin,
          provider: "phone"
        });
        onClearPendingForm();
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "The phone code could not be verified.");
    } finally {
      phoneVerificationCodeRef.current = "";
      setAuthStatus("idle");
    }
  }

  return (
    <section className="auth-page signup-split" aria-label={isLogin ? "Log in" : "Create account"}>
      <button className="auth-close-button" type="button" aria-label="Close" onClick={onClose}>
        <X size={20} aria-hidden="true" />
      </button>
      <div className="auth-shell">
        <form
          className={`signup-form auth-card${phoneAuthOpen ? " auth-card--phone" : ""}`}
          onSubmit={(event) => {
            if (!phoneAuthOpen) {
              submitSignup(event);
              return;
            }

            event.preventDefault();
            if (phoneCodeSent) {
              void verifyPhoneCode();
            } else {
              void sendPhoneCode();
            }
          }}
        >
          {!phoneAuthOpen && (
            <div className="signup-heading">
              <p className="auth-card__title">{isLogin ? "Log in" : "Create profile"}</p>
              {isLogin && <h3>Return to your sky.</h3>}
            </div>
          )}

        {!isAuthConfigured && (
          <p className="auth-message">
            Add VITE_SUPABASE_URL and a Supabase publishable key to enable live sign-on.
          </p>
        )}

        {!phoneAuthOpen && (
          <div className="social-signons" aria-label="Social sign on">
            <button className="google-auth-button" type="button" disabled={authStatus === "loading"} onClick={() => socialSignup("google")}>
              <GoogleIcon />
              Continue with Google
            </button>
            {isPhoneAuthEnabled && (
              <button
                className="google-auth-button"
                type="button"
                disabled={authStatus === "loading"}
                onClick={() => {
                  setPhoneAuthOpen(true);
                  setAuthMessage("");
                }}
              >
                Continue with phone
              </button>
            )}
          </div>
        )}

        {isPhoneAuthEnabled && phoneAuthOpen && (
          <div className="phone-auth-fields" aria-label="Phone sign in">
            <div className="phone-auth-heading">
              <span className="phone-auth-eyebrow">{phoneCodeSent ? "Check your phone" : "Sign in"}</span>
              <h2 className="phone-auth-title">{phoneCodeSent ? "Enter the code" : "Sign in with your phone"}</h2>
              {phoneCodeSent ? (
                <div className="phone-auth-destination-row">
                  <p>
                    We sent a code to <strong>{maskPhoneNumber(phoneOtpDestination)}</strong>.
                  </p>
                  <button
                    className="phone-auth-inline-action"
                    type="button"
                    disabled={authStatus === "loading"}
                    onClick={resetPhoneChallenge}
                  >
                    Edit number
                  </button>
                </div>
              ) : (
                <p>We’ll text you a six-digit code to confirm your number.</p>
              )}
            </div>

            {!phoneCodeSent && (
              <label className="signup-field auth-field">
                <span className="auth-label">Mobile number</span>
                <div className="phone-auth-number-control">
                  <select
                    className="phone-auth-country-select"
                    aria-label="Country code"
                    value={supportedPhoneCountry.code}
                    onChange={() => undefined}
                  >
                    <option value={supportedPhoneCountry.code}>
                      US {supportedPhoneCountry.callingCode}
                    </option>
                  </select>
                  <input
                    className="auth-input"
                    type="tel"
                    inputMode="tel"
                    enterKeyHint="send"
                    autoComplete="tel-national"
                    autoFocus
                    aria-describedby="phone-auth-number-help"
                    placeholder="(212) 555-0100"
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(formatUsPhoneInput(event.target.value));
                      setAuthMessage("");
                    }}
                  />
                </div>
                <small className="phone-auth-help" id="phone-auth-number-help">
                  Message and data rates may apply.
                </small>
              </label>
            )}
            {phoneCodeSent && (
              <label className="signup-field auth-field">
                <span className="auth-label">Six-digit code</span>
                <div className="phone-auth-code-control">
                  <input
                    className="phone-auth-code-input"
                    inputMode="numeric"
                    enterKeyHint="done"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    autoFocus
                    aria-describedby="phone-auth-code-help"
                    aria-label="Six-digit verification code"
                    maxLength={6}
                    value={phoneCode}
                    onChange={(event) => {
                      const nextCode = event.target.value.replace(/\D/g, "").slice(0, 6);

                      setPhoneCode(nextCode);
                      setAuthMessage("");
                      if (nextCode.length === 6) {
                        window.setTimeout(() => void verifyPhoneCode(nextCode), 0);
                      }
                    }}
                  />
                  <span className="phone-auth-code-slots" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, index) => (
                      <span className={phoneCode[index] ? "filled" : ""} key={index}>
                        {phoneCode[index] ?? ""}
                      </span>
                    ))}
                  </span>
                </div>
                <small className="phone-auth-help" id="phone-auth-code-help">
                  The code may fill automatically from your messages.
                </small>
              </label>
            )}

            {authMessage && <p className="auth-message">{authMessage}</p>}

            <div className="phone-auth-actions">
              {phoneCodeSent ? (
                <>
                  <button
                    className="signup-submit phone-auth-primary"
                    type="submit"
                    disabled={authStatus === "loading" || phoneCode.length !== 6}
                  >
                    {authStatus === "loading" ? "Confirming…" : "Confirm code"}
                  </button>
                  <button
                    className="phone-auth-resend-button"
                    type="button"
                    disabled={authStatus === "loading" || phoneResendSeconds > 0}
                    onClick={() => void sendPhoneCode(true)}
                  >
                    {phoneResendSeconds > 0
                      ? `Send a new code in 0:${String(phoneResendSeconds).padStart(2, "0")}`
                      : "Send a new code"}
                  </button>
                  <button
                    className="phone-auth-text-button"
                    type="button"
                    disabled={authStatus === "loading"}
                    onClick={resetPhoneChallenge}
                  >
                    Use a different number
                  </button>
                </>
              ) : (
                <button
                  className="signup-submit phone-auth-primary"
                  type="submit"
                  disabled={authStatus === "loading" || !isValidUsPhoneNumber(phoneNumber)}
                >
                  {authStatus === "loading" ? "Sending…" : "Send code"}
                </button>
              )}
            </div>
            <button
              className="phone-auth-back"
              type="button"
              disabled={authStatus === "loading"}
              onClick={() => {
                resetPhoneChallenge();
                setPhoneAuthOpen(false);
              }}
            >
              <ChevronLeft size={18} aria-hidden="true" />
              Other sign-in options
            </button>
          </div>
        )}

        {!phoneAuthOpen && authMessage && <p className="auth-message">{authMessage}</p>}

        {!phoneAuthOpen && (
          <>
            <div className="email-divider auth-divider"><span>or with email</span></div>

            <div className="signup-fields">
          {!isLogin && (
            <label className="signup-field auth-field">
              <span className="auth-label">Full name</span>
              <div>
                <input className="auth-input" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Jules Okafor" />
              </div>
            </label>
          )}

          <label className="signup-field auth-field">
            <span className="auth-label">Email</span>
            <div>
              <input className="auth-input" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@somewhere.com" />
            </div>
          </label>

          <label className="signup-field auth-field">
            <span className="auth-label">Password</span>
            <div className="password-control">
              <input
                className="auth-input"
                type={passwordVisible ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="at least 8 characters"
              />
              <button
                type="button"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                title={passwordVisible ? "Hide password" : "Show password"}
                onClick={() => setPasswordVisible((isVisible) => !isVisible)}
              >
                {passwordVisible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
          </label>

          {!isLogin && (
            <>
              <CitySearchField
                label="Birth city"
                value={form.birthCity}
                onChange={(value) => setForm({ ...form, birthCity: value, birthLocation: null })}
                onSelect={(suggestion) => setForm({ ...form, birthCity: suggestion.label, birthLocation: suggestion })}
                placeholder="Birth city"
                className="signup-city-search"
              />

              <div className="signup-grid auth-birth-grid">
                <label className="signup-field auth-field">
                  <span className="auth-label">Birth date</span>
                  <div className="signup-date-control auth-date-inputs">
                    <input
                      className="auth-input"
                      aria-label="Birth month"
                      inputMode="numeric"
                      placeholder="MM"
                      value={birthDateParts.month}
                      onChange={(event) => updateBirthDate("month", event.target.value)}
                    />
                    <span aria-hidden="true">/</span>
                    <input
                      className="auth-input"
                      aria-label="Birth day"
                      inputMode="numeric"
                      placeholder="DD"
                      value={birthDateParts.day}
                      onChange={(event) => updateBirthDate("day", event.target.value)}
                    />
                    <span aria-hidden="true">/</span>
                    <input
                      className="auth-input"
                      aria-label="Birth year"
                      inputMode="numeric"
                      placeholder="YYYY"
                      value={birthDateParts.year}
                      onChange={(event) => updateBirthDate("year", event.target.value)}
                    />
                  </div>
                </label>

                <label className="signup-field auth-field">
                  <span className="auth-label">Birth time</span>
                  <div className="signup-time-control auth-time-inputs">
                    <input
                      className="auth-input"
                      aria-label="Birth hour"
                      inputMode="numeric"
                      placeholder="HH"
                      value={birthTimeParts.hour}
                      disabled={form.unknownBirthTime}
                      onChange={(event) => updateBirthTime("hour", event.target.value)}
                    />
                    <span className="time-separator" aria-hidden="true">:</span>
                    <input
                      className="auth-input"
                      aria-label="Birth minute"
                      inputMode="numeric"
                      placeholder="MM"
                      value={birthTimeParts.minute}
                      disabled={form.unknownBirthTime}
                      onChange={(event) => updateBirthTime("minute", event.target.value)}
                    />
                    <div className="signup-meridiem auth-ampm-toggle" aria-label="AM or PM">
                      {(["AM", "PM"] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          className={birthTimeParts.meridiem === period ? "active is-active" : ""}
                          disabled={form.unknownBirthTime}
                          aria-pressed={birthTimeParts.meridiem === period}
                          onClick={() => updateBirthTime("meridiem", period)}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>
              </div>

              <label className="unknown-time auth-checkbox-row">
                <input
                  type="checkbox"
                  checked={form.unknownBirthTime}
                  onChange={(event) => {
                    setForm({ ...form, unknownBirthTime: event.target.checked, birthTime: event.target.checked ? "12:00 PM" : form.birthTime });
                  }}
                />
                <span>I don't know my birth time.</span>
              </label>
            </>
          )}
            </div>

            <button className="signup-submit auth-primary-button" type="submit" disabled={authStatus === "loading"}>
              {authStatus === "loading" ? "Working..." : isLogin ? "Log in →" : "Create Account →"}
            </button>
            <p className="signin-note">
              {isLogin ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  resetPhoneChallenge();
                  setPhoneAuthOpen(false);
                  setAuthMessage("");
                  setAuthMode(isLogin ? "create" : "login");
                }}
              >
                {isLogin ? "Create an account" : "Login"}
              </button>
            </p>
          </>
        )}
        </form>
      </div>
    </section>
  );
}
