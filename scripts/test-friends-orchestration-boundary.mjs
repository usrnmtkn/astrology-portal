import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  friendCalculationReadiness,
  idleFriendCalculationReadiness,
  shouldRunCurrentSkyCalculation,
  shouldRunProfileNatalCalculation
} from "../apps/web/src/features/friends/friendCalculationReadiness.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const panelSource = fs.readFileSync(
  path.join(repoRoot, "apps/web/src/features/friends/ManualChartsPanel.tsx"),
  "utf8"
);

assert.equal(
  appSource.includes("function ManualChartsPanel"),
  false,
  "App.tsx must not own the Friends chart workspace implementation."
);
assert.match(
  appSource,
  /import\("\.\/features\/friends\/ManualChartsPanel"\)/,
  "App.tsx must load the extracted Friends workspace through a dynamic import."
);
assert.equal(
  appSource.includes('from "./features/friends/useManualChartsController"'),
  false,
  "The manual-chart controller must stay out of the eager App module."
);
assert.equal(
  appSource.includes('from "./features/friends/useRelationshipCompare"'),
  false,
  "Relationship chart calculations must stay out of the eager App module."
);
assert.match(
  panelSource,
  /from "\.\/useManualChartsController"/,
  "The extracted Friends workspace must own manual-chart orchestration."
);
assert.match(
  panelSource,
  /from "\.\/useRelationshipCompare"/,
  "The extracted Friends workspace must own relationship calculation orchestration."
);

assert.deepEqual(
  friendCalculationReadiness({
    activeTab: "compatibility",
    isEventChart: false,
    profileActive: false
  }),
  idleFriendCalculationReadiness,
  "The Friends landing page must not request Sky or You chart calculations."
);
assert.deepEqual(
  friendCalculationReadiness({
    activeTab: "natal",
    isEventChart: false,
    profileActive: true
  }),
  idleFriendCalculationReadiness,
  "A saved chart's Natal tab must not wake current-Sky or account-natal calculations."
);
assert.deepEqual(
  friendCalculationReadiness({
    activeTab: "compatibility",
    isEventChart: false,
    profileActive: true
  }),
  { currentSky: false, profileNatal: true },
  "Compatibility must request only the account natal chart it compares."
);
const transitReadiness = friendCalculationReadiness({
  activeTab: "transits",
  isEventChart: false,
  profileActive: true
});
assert.deepEqual(
  transitReadiness,
  { currentSky: true, profileNatal: true },
  "Friend Transits must request both current Sky and the comparison natal chart."
);
assert.equal(
  shouldRunCurrentSkyCalculation("friends", idleFriendCalculationReadiness),
  false,
  "Entering Friends must not run the inactive Sky calculation effect."
);
assert.equal(
  shouldRunCurrentSkyCalculation("profile", idleFriendCalculationReadiness),
  true,
  "You must continue running the current-Sky calculation used by its Updates transit wheel."
);
assert.equal(
  shouldRunCurrentSkyCalculation("friends", transitReadiness),
  true,
  "The Sky calculation must wake when the active Friends surface needs it."
);
assert.equal(
  shouldRunProfileNatalCalculation("friends", false, idleFriendCalculationReadiness),
  false,
  "Entering Friends must not run the inactive You natal calculation effect."
);
assert.equal(
  shouldRunProfileNatalCalculation("friends", false, transitReadiness),
  true,
  "The account natal calculation must wake for relationship-dependent Friends surfaces."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "friends orchestration boundary",
  contract: "Friends orchestration and chart calculations stay lazy; inactive Sky and You calculations remain asleep."
}, null, 2));
