import { BorderBeam } from "border-beam";
import { useEffect, useRef, useState } from "react";
import "../../styles/report-generation-beam.css";

/** Decorative overlay: the card keeps its layout, focus targets, and menus. */
export function ReportGenerationBeam() {
  const host = useRef<HTMLDivElement>(null);
  const [appearance, setAppearance] = useState<{
    theme: "light" | "dark";
    radius: number;
    visible: boolean;
  } | null>(null);

  useEffect(() => {
    const card = host.current?.parentElement;
    if (!card) return;
    const root = document.documentElement;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const theme = root.dataset.theme;
      setAppearance({
        theme: theme === "dark" || (theme !== "light" && dark.matches) ? "dark" : "light",
        radius: parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0,
        visible: !reducedMotion.matches && !document.hidden
      });
    };
    update();
    const themeObserver = new MutationObserver(update);
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    const sizeObserver = new ResizeObserver(update);
    sizeObserver.observe(card);
    dark.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      themeObserver.disconnect();
      sizeObserver.disconnect();
      dark.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div className="report-generation-beam" ref={host} aria-hidden="true">
      {appearance?.visible ? (
        <BorderBeam
          className="report-generation-beam__effect"
          size="md"
          colorVariant="colorful"
          strength={0.7}
          theme={appearance.theme}
          borderRadius={appearance.radius}
        >
          <div className="report-generation-beam__shape" />
        </BorderBeam>
      ) : null}
    </div>
  );
}
