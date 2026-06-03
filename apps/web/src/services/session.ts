import type { AccountMode } from "../types";

export function getInitialAccountMode(): AccountMode {
  return "guest";
}

export function getDemoProfile() {
  return {
    name: "Mira",
    sun: "Cancer",
    moon: "Libra",
    rising: "Scorpio"
  };
}
