"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker. Silently no-ops if unsupported (older Safari, etc). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-critical: the app works fully without the service worker.
    });
  }, []);

  return null;
}
