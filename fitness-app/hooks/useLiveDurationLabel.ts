import { formatDuration } from "@/utils/session-overlay/formatDuration";
import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

export function useLiveDurationLabel(
  startedAtUtc?: string | null,
  finishedAtUtc?: string | null,
  enabled = true
) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
  }, [finishedAtUtc, startedAtUtc]);

  useEffect(() => {
    if (!enabled || !startedAtUtc || finishedAtUtc) return;

    const startMs = new Date(startedAtUtc).getTime();
    if (!Number.isFinite(startMs)) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const syncNow = () => {
      setNowMs(Date.now());
    };

    const elapsed = Math.max(0, Date.now() - startMs);
    const remainder = elapsed % 1000;
    const initialDelay = remainder === 0 ? 1000 : 1000 - remainder;

    syncNow();

    timeoutId = setTimeout(() => {
      syncNow();
      intervalId = setInterval(syncNow, 1000);
    }, initialDelay);

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          syncNow();
        }
      }
    );

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [enabled, finishedAtUtc, startedAtUtc]);

  return useMemo(
    () => formatDuration(startedAtUtc, finishedAtUtc, nowMs),
    [finishedAtUtc, nowMs, startedAtUtc]
  );
}
