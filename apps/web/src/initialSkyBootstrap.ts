import { startInitialSkyLoad } from "./services/skyApi";
import { refreshContentPublications, refreshSkyListPublications } from "./services/contentPublications";
import { skyPlacementSelection } from "./services/skyPlacementSourceScope";
import { initialSkyReaderKey, initialSkyReaderAvailable } from "./services/initialSkyReader";

// An independent async entry starts the existing shared requests while React
// downloads. The request owner preserves route, selection and auth boundaries.
if (!new URL(window.location.href).searchParams.has("code")) {
  try {
    const initial = startInitialSkyLoad();
    window.dispatchEvent(new Event("tldr:sky-bootstrap-started"));
    if (initial) void (initial.detail === "placements" ? refreshSkyListPublications() : refreshContentPublications()).catch(() => {});
    if (initial?.detail === "placements") {
      void initial.result.then(async snapshot => {
        if (!snapshot || initialSkyReaderAvailable(initialSkyReaderKey(snapshot))) return;
        const { prepareSkyPlacementSources } = await import("./services/skyPlacementHydration");
        return prepareSkyPlacementSources(skyPlacementSelection(snapshot.positions), { initialList: true, initialReaderKey: initialSkyReaderKey(snapshot) });
      }).catch(() => {});
    }
  } catch { /* The mounted reader owns normal retry and error handling. */ }
}
