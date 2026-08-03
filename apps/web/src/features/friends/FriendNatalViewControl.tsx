import { SegmentedControl } from "../../components/SegmentedControl";

export type FriendNatalChartViewMode = "circle" | "table";

export function FriendNatalViewControl({
  value,
  onChange,
  ariaLabel
}: {
  value: FriendNatalChartViewMode;
  onChange: (value: FriendNatalChartViewMode) => void;
  ariaLabel: string;
}) {
  return (
    <SegmentedControl
      value={value}
      options={[
        { value: "circle", label: "Circle" },
        { value: "table", label: "Table" }
      ]}
      onChange={onChange}
      ariaLabel={ariaLabel}
      className="natal-chart-view-toggle"
      compact
    />
  );
}
