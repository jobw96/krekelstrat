import { useEffect } from "react";

/**
 * Freezes the page behind a modal.
 *
 * Locks the root element, not body: the page scrolls on `html` (see the
 * `overflow-y: scroll` in styles.css), so hiding body overflow would do
 * nothing. `scrollbar-gutter: stable` keeps the gutter reserved, so the layout
 * does not jump when the bar disappears.
 *
 * Saving and restoring the previous value makes nesting work on its own: a
 * lightbox opened from a dialog restores to "hidden", leaving the dialog's own
 * lock intact.
 */
export function useLockScroll(active = true) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [active]);
}
