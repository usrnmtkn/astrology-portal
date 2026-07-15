import { X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { ModalPortal } from "../../components/ModalPortal";
import type { LocationInput } from "../../types";
import type { ManualChartType } from "../../services/manualCharts";
import {
  pronounChoiceLabels,
  pronounChoices,
  type PronounChoice
} from "../../services/personReferences";
import { relationshipContextOptions } from "../../services/relationshipContext";

export type FriendChartFormState = {
  chartType: ManualChartType;
  displayName: string;
  pronouns: PronounChoice;
  relationshipType: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  birthLocation: LocationInput | null;
};

export type FriendChartFormCopy = {
  title: string;
  editTitle: string;
  subtitle: string;
  editSubtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  dateLabel: string;
  timeLabel: string;
  placeLabel: string;
  placePlaceholder: string;
  unknownTime: string;
  submit: string;
  savingSubmit: string;
  saveSubmit: string;
};

type FriendChartModalProps = {
  citySearchField: ReactNode;
  form: FriendChartFormState;
  formCopy: FriendChartFormCopy;
  isEditing: boolean;
  isEventForm: boolean;
  isSubmitting: boolean;
  message: string;
  onChartTypeChange: (chartType: ManualChartType) => void;
  onClose: () => void;
  onFieldChange: <Key extends keyof FriendChartFormState>(key: Key, value: FriendChartFormState[Key]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function FriendChartModal({
  citySearchField,
  form,
  formCopy,
  isEditing,
  isEventForm,
  isSubmitting,
  message,
  onChartTypeChange,
  onClose,
  onFieldChange,
  onSubmit
}: FriendChartModalProps) {
  return (
    <ModalPortal
      className="friend-chart-modal-root"
      panelClassName="chart-modal friend-chart-modal add-chart-modal"
      titleId="friend-chart-modal-title"
      width="440px"
      onClose={onClose}
    >
      <form
        className="manual-chart-form friend-chart-modal-form add-chart-form"
        onSubmit={onSubmit}
      >
        <button className="chart-modal-close modal-close add-chart-modal__close" type="button" aria-label="Close" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
        <div className="manual-chart-form-heading friend-chart-modal-heading add-chart-modal__heading">
          <div>
            <h3 className="add-chart-modal__title" id="friend-chart-modal-title">{isEditing ? formCopy.editTitle : formCopy.title}</h3>
            <p className="add-chart-modal__subtitle">{isEditing ? formCopy.editSubtitle : formCopy.subtitle}</p>
          </div>
        </div>

        <label className="signup-field add-chart-field">
          <span>Chart type</span>
          <div>
            <select
              value={form.chartType}
              onChange={(event) => onChartTypeChange(event.target.value as ManualChartType)}
              aria-label="Chart type"
            >
              <option value="person">Person</option>
              <option value="event">Event</option>
            </select>
          </div>
        </label>

        <label className="signup-field add-chart-field">
          <span>{formCopy.nameLabel}</span>
          <div>
            <input
              value={form.displayName}
              onChange={(event) => onFieldChange("displayName", event.target.value)}
              placeholder={formCopy.namePlaceholder}
            />
          </div>
        </label>

        {!isEventForm && (
          <>
            <label className="signup-field add-chart-field">
              <span>Relationship</span>
              <div>
                <select
                  value={form.relationshipType}
                  onChange={(event) => onFieldChange("relationshipType", event.target.value)}
                  aria-label="Relationship type"
                >
                  {relationshipContextOptions.map((option) => (
                    <option value={option.key} key={option.key}>{option.label}</option>
                  ))}
                </select>
              </div>
            </label>
            <fieldset className="add-chart-pronouns">
              <legend>Pronouns</legend>
              <div className="add-chart-pronoun-options">
                {pronounChoices.map((choice) => (
                  <label className="add-chart-pronoun-option" key={choice}>
                    <input
                      type="radio"
                      name="friend-chart-pronouns"
                      checked={form.pronouns === choice}
                      onChange={() => onFieldChange("pronouns", choice)}
                    />
                    <span>{pronounChoiceLabels[choice]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <div className="manual-chart-grid add-chart-birth-grid">
          <label className="signup-field add-chart-field">
            <span>{formCopy.dateLabel}</span>
            <div>
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) => onFieldChange("birthDate", event.target.value)}
              />
            </div>
          </label>

          <div className="signup-field add-chart-field birth-time-field">
            <label>
              <span>{formCopy.timeLabel}</span>
              <div>
                <input
                  type="time"
                  value={form.birthTime}
                  disabled={form.birthTimeUnknown}
                  onChange={(event) => onFieldChange("birthTime", event.target.value)}
                />
              </div>
            </label>
            <label className="unknown-time manual-chart-unknown-time checkbox-row">
              <input
                type="checkbox"
                checked={form.birthTimeUnknown}
                onChange={(event) => onFieldChange("birthTimeUnknown", event.target.checked)}
              />
              <span>{formCopy.unknownTime}</span>
            </label>
          </div>
        </div>

        {citySearchField}

        {message && <p className="manual-chart-message">{message}</p>}

        <button className="manual-chart-save add-chart-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? formCopy.savingSubmit : isEditing ? formCopy.saveSubmit : formCopy.submit}
        </button>
      </form>
    </ModalPortal>
  );
}
