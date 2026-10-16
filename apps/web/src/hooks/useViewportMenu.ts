import { useLayoutEffect, useState } from "react";

// Keep DOM ownership and inherited styles while the native top layer escapes
// card clipping. Existing outside-click and Escape handlers still own dismissal.
export function useViewportMenu() {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!element) return;
    const previousStyle = element.getAttribute("style");
    const viewport = window.visualViewport;
    const anchor = element.previousElementSibling;
    const topLayer = typeof element.showPopover === "function";
    if (topLayer) {
      element.setAttribute("popover", "manual");
      element.style.position = "fixed";
      element.style.inset = "auto";
      element.style.margin = "0";
      element.showPopover();
    }

    function update() {
      if (!element) return;
      const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--space-4")) || 0;
      const left = (viewport?.offsetLeft ?? 0) + gutter;
      const top = Math.max(viewport?.offsetTop ?? 0,
        document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0) + gutter;
      const right = left + (viewport?.width ?? document.documentElement.clientWidth) - gutter * 2;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - gutter;
      element.style.maxWidth = `${Math.max(0, right - left)}px`;
      element.style.maxHeight = `${Math.max(0, bottom - top)}px`;
      element.style.overflowY = "auto";
      element.style.translate = "none";
      const box = element.getBoundingClientRect();
      const trigger = anchor?.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--space-2")) || 0;
      const preferredTop = topLayer && trigger ? trigger.bottom + gap : box.top;
      let y = Math.max(top, Math.min(preferredTop, bottom - box.height));
      if (trigger && preferredTop + box.height > bottom) {
        const above = trigger.top - box.height - gap;
        if (above >= top && above + box.height <= bottom) y = above;
      }
      const preferredLeft = topLayer && trigger ? trigger.right - box.width : box.left;
      const x = Math.max(left, Math.min(preferredLeft, right - box.width));
      if (topLayer) {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
      } else {
        element.style.translate = `${x - box.left}px ${y - box.top}px`;
      }
    }

    function onScroll(event: Event) {
      if (!(event.target instanceof Node) || !element?.contains(event.target)) schedule();
    }

    let frame = 0;
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    update();
    const observer = new ResizeObserver(schedule);
    // Responsive ancestors can move the anchor after the window resize event.
    for (let node: HTMLElement | null = element; node; node = node.parentElement) observer.observe(node);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", onScroll, true);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      if (topLayer) {
        if (element.isConnected && element.matches(":popover-open")) element.hidePopover();
        element.removeAttribute("popover");
      }
      if (previousStyle === null) element.removeAttribute("style");
      else element.setAttribute("style", previousStyle);
    };
  }, [element]);

  return setElement;
}
