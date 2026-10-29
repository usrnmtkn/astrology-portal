import type { FormEvent } from "react";
import { CalendarDays, ChevronRight, MapPin, User } from "lucide-react";
import type { TransitForm, UserProfile } from "../../App";
import { CitySearchField } from "../../components/CitySearchField";
import { formatSignupBirthDate, formatSignupBirthTime } from "../auth/signupModel";

export default function CreateChartFlow({
  form,
  setForm,
  profile,
  step,
  setStep,
  saving,
  message,
  onSave,
  showHeading = true,
  showSubmit = true,
  formId
}: {
  showHeading?: boolean;
  showSubmit?: boolean;
  formId?: string;
  form: TransitForm;
  setForm: (form: TransitForm) => void;
  profile: UserProfile | null;
  step: "overview" | "birth" | "city";
  setStep: (step: "overview" | "birth" | "city") => void;
  saving: boolean;
  message: string;
  onSave: (options?: { closeModal?: boolean; nextStep?: "overview" | "birth" | "city" }) => void | Promise<void>;
}) {
  function updateField<Key extends keyof TransitForm>(key: Key, value: TransitForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateNumberField<Key extends keyof TransitForm>(key: Key, value: string, maxLength = 2) {
    updateField(key, value.replace(/\D/g, "").slice(0, maxLength) as TransitForm[Key]);
  }

  function submitBirthForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({ closeModal: false, nextStep: "city" });
  }

  function submitCityForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave();
  }

  const primaryChart = profile?.charts[0];
  const accountComplete = Boolean(profile);
  const birthDate = formatSignupBirthDate({
    month: form.birthMonth,
    day: form.birthDay,
    year: form.birthYear
  }) || (primaryChart?.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(primaryChart.birthDate) ? primaryChart.birthDate : "");
  const birthComplete = Boolean(
    birthDate &&
    form.birthPlace.trim() &&
    (form.unknownBirthTime || formatSignupBirthTime({
      hour: form.birthHour,
      minute: form.birthMinute,
      meridiem: form.birthMeridiem
    }))
  );
  const currentCityComplete = Boolean(form.currentLocation.trim() || profile?.currentLocation?.trim());
  const flowSteps = [
    { id: "account", label: "Create account", status: accountComplete ? "complete" : "step 1", complete: accountComplete, icon: <User size={21} aria-hidden="true" />, onClick: null },
    { id: "birth", label: "Add birth information", status: birthComplete ? "complete" : accountComplete ? "next step" : "step 2", complete: birthComplete, icon: <CalendarDays size={21} aria-hidden="true" />, onClick: () => setStep("birth") },
    { id: "city", label: "Enter current city", status: currentCityComplete ? "complete" : birthComplete ? "next step" : "step 3", complete: currentCityComplete, icon: <MapPin size={21} aria-hidden="true" />, onClick: () => setStep("city") }
  ];

  if (step === "overview") {
    return (
      <div className="create-chart-flow create-chart-overview">
        <div className="chart-modal-heading">
          {showHeading && <h3 id="chart-modal-title">Create your chart</h3>}
          <p>Three quick steps to unlock your personalized sky.</p>
        </div>

        {message && <p className="create-chart-message" role="status">{message}</p>}

        <div className="create-chart-steps" aria-label="Create your chart steps">
          {flowSteps.map((flowStep, index) => (
            <div
              className={`create-chart-step-row ${flowStep.complete ? "complete" : ""} ${!flowStep.complete && flowSteps.findIndex((candidate) => !candidate.complete) === index ? "active" : ""}`}
              key={flowStep.id}
            >
              <span className="create-chart-rail" aria-hidden="true"><span /></span>
              <button
                className="create-chart-step"
                type="button"
                disabled={!flowStep.onClick}
                onClick={() => flowStep.onClick?.()}
              >
                <span className="create-chart-step-icon">{flowStep.icon}</span>
                <span className="create-chart-step-copy">
                  <span>{flowStep.status}</span>
                  <strong>{flowStep.label}</strong>
                </span>
                {flowStep.onClick && <ChevronRight size={20} aria-hidden="true" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "city") {
    return (
      <form id={formId} className="create-chart-flow create-chart-detail" onSubmit={submitCityForm}>
        <div className="chart-modal-heading">
          {showHeading && <h3 id="chart-modal-title">Where are you now?</h3>}
          <p>Your current city sets the sky for today's readings.</p>
        </div>

        <CitySearchField
          label="Current city"
          value={form.currentLocation}
          onChange={(value) => {
            setForm({ ...form, currentLocation: value, currentLocationData: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, currentLocation: suggestion.label, currentLocationData: suggestion });
          }}
          placeholder="Current City, State"
          className="signup-city-search create-chart-city-search"
        />

        {message && <p className="create-chart-message" role="status">{message}</p>}
        {showSubmit && <button className="signup-submit create-chart-save" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save location"}
        </button>}
      </form>
    );
  }

  return (
    <form id={formId} className="create-chart-flow create-chart-detail" onSubmit={submitBirthForm}>
      <div className="chart-modal-heading">
        {showHeading && <h3 id="chart-modal-title">Your birth information</h3>}
        <p>This pinpoints the exact sky at your first breath.</p>
      </div>

      <div className="signup-fields create-chart-fields">
        <label className="signup-field">
          <span>Full name</span>
          <div>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your name" />
          </div>
        </label>

        <div className="signup-grid">
          <label className="signup-field">
            <span>Date of birth</span>
            <div className="signup-date-control">
              <input
                aria-label="Birth month"
                inputMode="numeric"
                placeholder="MM"
                value={form.birthMonth}
                onChange={(event) => updateNumberField("birthMonth", event.target.value)}
              />
              <span aria-hidden="true">/</span>
              <input
                aria-label="Birth day"
                inputMode="numeric"
                placeholder="DD"
                value={form.birthDay}
                onChange={(event) => updateNumberField("birthDay", event.target.value)}
              />
              <span aria-hidden="true">/</span>
              <input
                aria-label="Birth year"
                inputMode="numeric"
                placeholder="YYYY"
                value={form.birthYear}
                onChange={(event) => updateNumberField("birthYear", event.target.value, 4)}
              />
            </div>
          </label>

          <label className="signup-field">
            <span>Time of birth</span>
            <div className="signup-time-control">
              <input
                aria-label="Birth hour"
                inputMode="numeric"
                placeholder="HH"
                value={form.birthHour}
                disabled={form.unknownBirthTime}
                onChange={(event) => updateNumberField("birthHour", event.target.value)}
              />
              <span className="time-separator" aria-hidden="true">:</span>
              <input
                aria-label="Birth minute"
                inputMode="numeric"
                placeholder="MM"
                value={form.birthMinute}
                disabled={form.unknownBirthTime}
                onChange={(event) => updateNumberField("birthMinute", event.target.value)}
              />
              <div className="signup-meridiem" aria-label="AM or PM">
                {(["AM", "PM"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={form.birthMeridiem === period ? "active" : ""}
                    disabled={form.unknownBirthTime}
                    aria-pressed={form.birthMeridiem === period}
                    onClick={() => updateField("birthMeridiem", period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </label>
        </div>

        <label className="unknown-time">
          <input
            type="checkbox"
            checked={form.unknownBirthTime}
            onChange={(event) => {
              setForm({
                ...form,
                unknownBirthTime: event.target.checked,
                birthHour: event.target.checked ? "12" : form.birthHour,
                birthMinute: event.target.checked ? "00" : form.birthMinute,
                birthMeridiem: event.target.checked ? "PM" : form.birthMeridiem
              });
            }}
          />
          <span>I don't know my birth time.</span>
        </label>

        <CitySearchField
          label="Birth place"
          value={form.birthPlace}
          onChange={(value) => {
            setForm({ ...form, birthPlace: value, birthLocation: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, birthPlace: suggestion.label, birthLocation: suggestion });
          }}
          placeholder="City, State"
          className="signup-city-search create-chart-city-search"
        />
      </div>

      {message && <p className="create-chart-message" role="status">{message}</p>}
      {showSubmit && <button className="signup-submit create-chart-save" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save birth details"}
      </button>}
    </form>
  );
}

