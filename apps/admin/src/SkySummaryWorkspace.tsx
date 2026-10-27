import type { ComponentProps } from "react";
import { SkyDailySummaryStudio } from "./SkyDailySummaryStudio";
import { SkyDebilityStudio } from "./SkyDebilityStudio";

type Props = ComponentProps<typeof SkyDebilityStudio> & {
  daily: boolean;
  focusSunSummaries: boolean;
};

export default function SkySummaryWorkspace({ daily, focusSunSummaries, ...props }: Props) {
  return <>
    {daily && <SkyDailySummaryStudio rows={props.rows} onEdit={props.onEdit} busy={props.busy} focusSunSummaries={focusSunSummaries} />}
    <SkyDebilityStudio {...props} />
  </>;
}
