import type { ComponentProps } from "react";
import { SkyDailySummaryStudio } from "./SkyDailySummaryStudio";
import { SkyDebilityStudio } from "./SkyDebilityStudio";
import type { SummaryEditingActions } from './SkySummaryEditingWorkspace';

type Props = ComponentProps<typeof SkyDebilityStudio> & {
  daily: boolean;
  focusSunSummaries: boolean;
  editingActions: SummaryEditingActions;
};

export default function SkySummaryWorkspace({ daily, focusSunSummaries, editingActions, ...props }: Props) {
  return <>
    {daily ? <SkyDailySummaryStudio rows={props.rows} onEdit={props.onEdit} busy={props.busy} focusSunSummaries={focusSunSummaries} editingActions={editingActions} />
      : <SkyDebilityStudio {...props} />}
  </>;
}
