import type { AnimationItem, LottiePlayer } from "lottie-web";
import playerUrl from "lottie-web/build/player/lottie_light.min.js?url";
import animationDataUrl from "./assets/startup-celestial.json?url";

/** Optional decoration. App readiness never waits for the player or a loop. */
export function startStartupAnimation() {
  const startup = document.getElementById("app-startup");
  // The alternative moon is inline SVG/CSS and needs no Lottie download.
  if (startup?.dataset.loader === "moon") return;
  const artwork = startup?.querySelector<HTMLElement>(".startup-artwork");
  const container = artwork?.querySelector<HTMLElement>(".startup-artwork__animation");
  if (!startup || !artwork || !container) return;

  const reducedMotion = () => document.documentElement.hasAttribute("data-reduce-motion");
  let animation: AnimationItem | undefined;
  let script: HTMLScriptElement | undefined;
  let disposed = false;
  let ready = false;
  let decorationTimer: ReturnType<typeof setTimeout> | undefined;
  let dataRequest: AbortController | undefined;

  const syncPlayback = () => {
    if (!animation || !ready) return;
    if (reducedMotion()) animation.goToAndStop(0, true);
    else if (document.hidden) animation.pause();
    else animation.play();
  };

  const dispose = () => {
    disposed = true;
    clearTimeout(decorationTimer);
    dataRequest?.abort();
    observer.disconnect();
    motionObserver.disconnect();
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
    if (script || disposed || reducedMotion()) return;
    script = document.createElement("script");
    script.src = playerUrl;
    script.async = true;
    // The inline poster remains visible while the optional player yields
    // bandwidth to the calculation, reader modules and complete readings.
    script.fetchPriority = "low";
    script.setAttribute("data-startup-decoration", "");
    script.onerror = dispose;
    script.onload = async () => {
      if (disposed || !startup.isConnected || startup.getAttribute("aria-busy") !== "true") return;
      try {
        const player = (window as Window & { lottie?: LottiePlayer }).lottie;
        if (!player) { dispose(); return; }
        dataRequest = new AbortController();
        const response = await fetch(animationDataUrl, {priority: "low", signal: dataRequest.signal});
        if (!response.ok) throw new Error("Startup decoration unavailable.");
        const animationData = await response.json();
        if (disposed || !startup.isConnected || startup.getAttribute("aria-busy") !== "true") return;
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
  const motionObserver = new MutationObserver(onMotionChange);
  motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] });
  document.addEventListener("visibilitychange", syncPlayback);
  // The CSS poster already signals progress. Most starts finish before this
  // optional player is useful; do not let its download lengthen that wait.
  decorationTimer = setTimeout(loadPlayer, 1200);
}
