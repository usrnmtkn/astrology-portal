import { useEffect, useState } from "react";

const subjects = ["sun", "moon", "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const source = (index: number) => `/loading-artwork/${subjects[index]}.png`;
const intervalMs = 2200;

/** Decorative only: artwork downloads never control the screen's readiness. */
export function LoadingIllustration() {
  const [frames, setFrames] = useState({ sources: [source(0), undefined] as (string | undefined)[], front: 0 });
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let pending = false;
    let index = 0;
    let timer: ReturnType<typeof setInterval> | undefined;

    const advance = async () => {
      if (pending || motion.matches || document.hidden) return;
      pending = true;
      index = (index + 1) % subjects.length;
      const nextSource = source(index);
      const next = new Image();
      next.src = nextSource;
      try {
        await next.decode();
        if (!disposed && !motion.matches && !document.hidden) {
          setFrames(previous => {
            const front = 1 - previous.front;
            const sources = [...previous.sources];
            sources[front] = nextSource;
            return { sources, front };
          });
        }
      } catch {
        // Keep the last decoded illustration and the accessible loading status.
      } finally {
        pending = false;
      }
    };
    const schedule = () => {
      clearInterval(timer);
      if (!motion.matches && !document.hidden) timer = setInterval(advance, intervalMs);
    };
    schedule();
    motion.addEventListener("change", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      disposed = true;
      clearInterval(timer);
      motion.removeEventListener("change", schedule);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);

  return <div className="loading-illustration" aria-hidden="true">
    {frames.sources.map((src, slot) => <img
      key={slot}
      src={src}
      alt=""
      width="512"
      height="512"
      decoding="async"
      className={slot === frames.front && src && !failed.includes(src) ? "is-active" : undefined}
      onError={() => { if (src) setFailed(previous => [...previous, src]); }}
    />)}
  </div>;
}
