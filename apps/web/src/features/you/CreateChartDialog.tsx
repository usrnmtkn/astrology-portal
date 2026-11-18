import { useId, type ComponentProps } from "react";
import { ModalDialog } from "../../components/ModalDialog";
import CreateChartFlow from "./CreateChartFlow";

/** Keeps birth and current-city forms inside the shared scrollable dialog shell. */
export default function CreateChartDialog({ onClose, ...flow }: Omit<ComponentProps<typeof CreateChartFlow>, "showSubmit" | "formId"> & {
  onClose: () => void;
}) {
  const title = flow.step === "birth" ? "Your birth information"
    : flow.step === "city" ? "Where are you now?" : "Create your chart";
  const formId = useId();
  return <ModalDialog title={title} titleId="chart-modal-title" variant="settings" closeOnBackdrop={false}
    className="chart-modal" rootClassName="chart-modal-root" closeLabel="Close create chart" onClose={onClose}
    actions={flow.step !== "overview" ? <button form={formId} type="submit" className="signup-submit create-chart-save" disabled={flow.saving}>
      {flow.saving ? "Saving…" : flow.step === "birth" ? "Save birth details" : "Save location"}
    </button> : undefined}>
    <CreateChartFlow {...flow} formId={formId} showSubmit={false} />
  </ModalDialog>;
}
