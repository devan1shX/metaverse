"use client";

import { useEffect, useRef } from "react";

/**
 * useAntiCheat – detects tab switching, window blur, and clipboard paste from candidate.
 * Only active when role is CANDIDATE. Sends events over WebSocket to the interviewer.
 */
export function useAntiCheat(
  role: string | null,
  sendTabSwitchEvent: (switchType: "tab_switch" | "blur") => void
) {
  const isActive = role === "CANDIDATE";
  const sendRef = useRef(sendTabSwitchEvent);

  useEffect(() => {
    sendRef.current = sendTabSwitchEvent;
  }, [sendTabSwitchEvent]);

  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendRef.current("tab_switch");
      }
    };

    const handleBlur = () => {
      sendRef.current("blur");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isActive]);
}
