export type NatalChartDataTableRow = {
  id: string;
  degree?: string | null;
  glyph?: string;
  house?: number | null;
  label: string;
  retrograde?: boolean;
  sign: string;
};

function displayPointLabel(label: string) {
  if (label === "Ascendant") {
    return "Asc";
  }

  if (/^north\s+node$/i.test(label)) {
    return "NN";
  }

  return label;
}

export function NatalChartDataTable({
  rows,
  title = "Natal table"
}: {
  rows: NatalChartDataTableRow[];
  title?: string;
}) {
  return (
    <section className="natal-chart-table-panel" aria-label={title}>
      <span className="eyebrow section-label">Natal table</span>
      <div className="natal-chart-data-table-wrap">
        <table className="natal-chart-data-table">
          <thead>
            <tr>
              <th scope="col">House</th>
              <th scope="col">Sign</th>
              <th scope="col">Degree</th>
              <th scope="col">Point</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.house ? row.house : "—"}</td>
                <td>{row.sign}</td>
                <td>{row.degree || "—"}</td>
                <td>
                  {row.label === "Empty house" ? (
                    "—"
                  ) : (
                    <span className="natal-chart-data-table__point">
                      {row.glyph ? <span aria-hidden="true">{row.glyph}</span> : null}
                      <span>{displayPointLabel(row.label)}{row.retrograde ? " Rx" : ""}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
