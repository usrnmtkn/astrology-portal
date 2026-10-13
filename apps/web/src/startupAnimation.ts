import type { AnimationItem, LottiePlayer } from "lottie-web";
import playerUrl from "lottie-web/build/player/lottie_light.min.js?url";
import animationData from "./assets/startup-celestial.json";

/** Optional decoration. App readiness never waits for the player or a loop. */
export function startStartupAnimation() {
  const startup = document.getElementById("app-startup");
  // The alternative moon is inline SVG/CSS and needs no Lottie download.
  if (startup?.dataset.loader === "moon") return;
  const artwork = startup?.querySelector<HTMLElement>(".startup-artwork");
  const container = artwork?.querySelector<HTMLElement>(".startup-artwork__animation");
  if (!startup || !artwork || !container) return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animation: AnimationItem | undefined;
  let script: HTMLScriptElement | undefined;
  let disposed = false;
  let ready = false;

  const syncPlayback = () => {
    if (!animation || !ready) return;
    if (motion.matches) animation.goToAndStop(0, true);
    else if (document.hidden) animation.pause();
    else animation.play();
  };

  const dispose = () => {
    disposed = true;
    observer.disconnect();
    motion.removeEventListener("change", onMotionChange);
    document.removeEventListener("visibilitychange", syncPlayback);
    if (script) {
      script.onload = null;
      script.onerror = null;
      script.remove();
    }
    artwork.removeAttribute("data-animation-ready");
    animation?.destroy();
    animation = undefined;
  };

  const loadPlayer = () => {
    if (script || disposed || motion.matches) return;
    script = document.createElement("script");
    script.src = playerUrl;
    script.async = true;
    // This visible loading feedback must download while app chunks are pending.
    // Async scripts default to low priority, so "auto" can still defer it.
    script.fetchPriority = "high";
    script.setAttribute("data-startup-decoration", "");
    script.onerror = dispose;
    script.onload = () => {
      if (disposed || !startup.isConnected || startup.getAttribute("aria-busy") !== "true") return;
      try {
        const player = (window as Window & { lottie?: LottiePlayer }).lottie;
        if (!player) { dispose(); return; }
        animation = player.loadAnimation({ container, renderer: "svg", loop: true, autoplay: false, animationData });
        animation.addEventListener("data_failed", dispose);
        animation.addEventListener("error", dispose);
        const onReady = () => {
          if (disposed || ready) return;
          ready = true;
          artwork.setAttribute("data-animation-ready", "");
          syncPlayback();
        };
        animation.addEventListener("DOMLoaded", onReady);
        if (animation.isLoaded) onReady();
      } catch { dispose(); }
    };
    document.head.append(script);
  };

  const onMotionChange = () => { loadPlayer(); syncPlayback(); };
  const observer = new MutationObserver(() => {
    if (!startup.isConnected || startup.getAttribute("aria-busy") !== "true") dispose();
  });
  observer.observe(document.getElementById("root")!, { childList: true });
  observer.observe(startup, { attributes: true, attributeFilter: ["aria-busy"] });
  motion.addEventListener("change", onMotionChange);
  document.addEventListener("visibilitychange", syncPlayback);
  loadPlayer();
}
