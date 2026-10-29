"use client";

import { useEffect } from "react";

/**
 * Pauses every looping CSS animation while the tab is hidden (html[data-hidden]), so
 * background scenes cost no battery when the worker switches apps.
 */
export function MotionPolicy() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      if (document.hidden) root.dataset.hidden = "";
      else delete root.dataset.hidden;
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return null;
}
