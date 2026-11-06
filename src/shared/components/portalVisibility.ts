import { createContext } from "react";

/** Retained reader UI pauses its out-of-tree portals without discarding form state. */
export const PortalVisibility = createContext(true);
