"use client";

import React from "react";

export interface ThemeTransitionParams {
  nextTheme: "light" | "dark";
  event?: React.MouseEvent<HTMLElement> | MouseEvent | { clientX: number; clientY: number };
  applyTheme: () => void;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Executes a cinematic dark/light theme transition with:
 * 1. A circular radial reveal originating from the clicked theme toggle (View Transitions API)
 * 2. Icon rotation & scale interaction
 * 3. Graceful crossfade fallback for unsupported browsers
 * 4. Full support for prefers-reduced-motion
 */
export async function executeThemeTransition({
  nextTheme,
  event,
  applyTheme,
  onStart,
  onEnd,
}: ThemeTransitionParams): Promise<void> {
  onStart?.();

  // Check prefers-reduced-motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Reduced motion: immediate application with zero reveal animation
  if (prefersReduced) {
    applyTheme();
    onEnd?.();
    return;
  }

  // Calculate reveal origin (x, y) - prioritize the exact geometric center of the theme toggle element
  let x = 0;
  let y = 0;

  let targetEl: HTMLElement | null = null;
  if (event && "currentTarget" in event && event.currentTarget) {
    targetEl = event.currentTarget as HTMLElement;
  } else if (event && "target" in event && event.target) {
    targetEl = (event.target as HTMLElement).closest(".top-icon-btn, .toggle") as HTMLElement;
  }

  // Fallback: locate visible toggle button in the active viewport
  if (!targetEl && typeof document !== "undefined") {
    targetEl = document.querySelector(".top-icon-btn, .toggle") as HTMLElement;
  }

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  } else if (event && "clientX" in event && typeof event.clientX === "number" && event.clientX > 0) {
    x = event.clientX;
    y = event.clientY;
  } else if (typeof window !== "undefined") {
    x = window.innerWidth / 2;
    y = window.innerHeight / 2;
  }

  // Determine maximum radius to the furthest viewport corner
  const endRadius =
    typeof window !== "undefined"
      ? Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        )
      : 1000;

  // Mark transition on document element
  document.documentElement.classList.add("theme-transitioning");
  document.documentElement.setAttribute("data-theme-transitioning", "true");

  // Modern browsers supporting the View Transitions API
  if (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof (document as any).startViewTransition === "function"
  ) {
    try {
      const transition = (document as any).startViewTransition(() => {
        applyTheme();
      });

      await transition.ready;

      const anim = document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${Math.round(x)}px ${Math.round(y)}px)`,
            `circle(${Math.round(endRadius)}px at ${Math.round(x)}px ${Math.round(y)}px)`,
          ],
        },
        {
          duration: 650,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );

      await anim.finished;
    } catch {
      // Fallback if view transition is canceled or fails
      applyTheme();
    } finally {
      document.documentElement.classList.remove("theme-transitioning");
      document.documentElement.removeAttribute("data-theme-transitioning");
      onEnd?.();
    }
  } else {
    // Graceful CSS crossfade fallback for browsers without View Transitions
    applyTheme();
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
      document.documentElement.removeAttribute("data-theme-transitioning");
      onEnd?.();
    }, 650);
  }
}
