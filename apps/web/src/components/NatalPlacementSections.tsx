import type { ReactNode } from "react";
import type { SkySnapshot } from "../types";
import { LEARN_POINT_INDEX } from "../content/learnIndexCatalog";
import { PlacementTableRow } from "./charts/PlacementRows";

type NatalPlacementItem = { id: string; pointName: string; node: ReactNode };

/** One grouping contract for self and friend natal charts. */
export function NatalPlacementSections({ items, emptyHouses, snapshot }: { items: NatalPlacementItem[]; emptyHouses: ReactNode[]; snapshot?: SkySnapshot | null }) {
  const traditional = new Set(["Mercury", "Venus", "Mars", "Jupiter", "Saturn"]);
  const generational = new Set(["Uranus", "Neptune", "Pluto"]);
  const angles = new Set(["Midheaven", "MC", "Descendant", "IC", "Ic", "Imum Coeli"]);
  const pointOrder: Record<string, number> = { "North Node": 0, "South Node": 1, Chiron: 2, Lilith: 3 };
  const supplementalAngles: NatalPlacementItem[] = [];
  if (snapshot?.birthTimeKnown === true) {
    const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    for (const [id, source] of [["descendant", snapshot.ascendantLongitude], ["imum-coeli", snapshot.midheavenLongitude]] as const) {
      const guide = LEARN_POINT_INDEX.find(point => point.id === id)!;
      if (typeof source !== "number" || !Number.isFinite(source) || items.some(item => item.pointName === guide.name || item.pointName === guide.glyph)) continue;
      const longitude = ((source + 180) % 360 + 360) % 360;
      const signIndex = Math.floor(longitude / 30);
      const degree = longitude % 30;
      const house = (signIndex - signs.indexOf(snapshot.ascendant) + 12) % 12 + 1;
      supplementalAngles.push({ id, pointName: guide.name, node: <PlacementTableRow
        pointName={guide.name} glyph={guide.glyph} sign={signs[signIndex]} house={house}
        degree={`${Math.floor(degree)}°${String(Math.floor((degree % 1) * 60)).padStart(2, "0")}'`}
        title={`${guide.name} in ${signs[signIndex]}`} description={guide.detail}
        onClick={() => window.location.assign(`/learn/points/${id}`)} /> });
    }
  }
  const groups = [
    { title: "Traditional planets", className: "natal-traditional", rows: items.filter(item => traditional.has(item.pointName)) },
    { title: "Generational planets", className: "natal-generational", rows: items.filter(item => generational.has(item.pointName)) },
    { title: "Angles", className: "natal-angles", rows: [...items.filter(item => angles.has(item.pointName)), ...supplementalAngles] },
    { title: "Points", className: "natal-points", rows: items.filter(item => !traditional.has(item.pointName) && !generational.has(item.pointName) && !angles.has(item.pointName) && !["Sun", "Moon", "Ascendant"].includes(item.pointName)).sort((a, b) => (pointOrder[a.pointName] ?? 4) - (pointOrder[b.pointName] ?? 4)) }
  ];
  return <div className="natal-placement-sections">
    {groups.filter(group => group.rows.length).map(group => <section className={`natal-placement-section ${group.className}`} aria-label={group.title} key={group.title}>
      <h2>{group.title}</h2>
      <div className="natal-placement-grid">{group.rows.map(item => <div className="natal-placement-item" key={item.id}>{item.node}</div>)}</div>
    </section>)}
    {emptyHouses.length > 0 && <section className="natal-placement-section natal-empty-houses" aria-label="Empty houses">
      <h2>Empty houses</h2><div className="natal-placement-grid">{emptyHouses}</div>
    </section>}
  </div>;
}
