import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

export type AnimationPreference = "system" | "on" | "off";
export const animationPreferenceKey = "tldrastro:pageAnimations";

export function readAnimationPreference(): AnimationPreference {
  try {
    const value = window.localStorage.getItem(animationPreferenceKey);
    return value === "on" || value === "off" || value === "system" ? value : "on";
  } catch {
    return "on";
  }
}

/** Snapshot the old page without mounting a second copy of its live content. */
export function usePageTransition(motion: AnimationPreference = "on") {
  const active = useRef<ViewTransition | null>(null);
  const generation = useRef(0);

  const motionRef = useRef(motion);

  useEffect(() => {
    motionRef.current = motion;
    document.documentElement.dataset.pageMotion = motion;
    if (motion === "off" || (motion === "system" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      active.current?.skipTransition();
    }
  }, [motion]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = () => {
      if (preference.matches && motionRef.current === "system") active.current?.skipTransition();
    };
    preference.addEventListener("change", reduceMotion);
    return () => {
      generation.current += 1;
      active.current?.skipTransition();
      delete document.documentElement.dataset.pageTransition;
      delete document.documentElement.dataset.pageMotion;
      preference.removeEventListener("change", reduceMotion);
    };
  }, []);

  return useCallback((update: () => void, animate = true) => {
    const request = ++generation.current;
    active.current?.skipTransition();
    active.current = null;

    if (!animate || !document.startViewTransition
      || motion === "off"
      || (motion === "system" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      delete document.documentElement.dataset.pageTransition;
      update();
      return;
    }

    document.documentElement.dataset.pageTransition = "active";
    const transition = document.startViewTransition(() => {
      // A newer navigation supersedes a callback still waiting for a snapshot.
      if (request === generation.current) flushSync(update);
    });
    active.current = transition;
    // A skipped animation (rapid navigation, hidden tab) still updates the page.
    void transition.ready.catch(() => {});
    const finish = () => {
      if (request !== generation.current) return;
      active.current = null;
      delete document.documentElement.dataset.pageTransition;
    };
    void transition.finished.then(finish, finish);
  }, [motion]);
}
