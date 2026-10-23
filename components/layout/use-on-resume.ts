"use client";

import { useEffect, useRef } from "react";

/**
 * After this long in the background, on-screen data is considered stale:
 * signed photo URLs expire after an hour and an installed PWA is often
 * resumed the next morning without reloading.
 */
export const STALE_AFTER_MS = 30 * 60 * 1000;

/** Calls `onResume` when the page becomes visible again after a long absence. */
export function useOnResume(onResume: () => void, staleAfterMs = STALE_AFTER_MS) {
  const callback = useRef(onResume);
  useEffect(() => {
    callback.current = onResume;
  });

  useEffect(() => {
    let hiddenAt: number | null = null;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= staleAfterMs) {
        callback.current();
      }
      hiddenAt = null;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [staleAfterMs]);
}
