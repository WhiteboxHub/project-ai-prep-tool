import { useCallback, useEffect, useRef, useState } from "react";
import type { VisionResults } from "@/lib/huggingFaceVision";

export interface VisionSnapshot {
  time: string;
  centered: boolean;
}

export interface VisionSessionSummary {
  visionAnalytics: {
    snapshots: VisionSnapshot[];
  };
}

const WARNING_AFTER_MS = 3000;
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

export function useVisionSessionAnalytics({ enabled }: { enabled: boolean }) {
  const latestResultsRef = useRef<VisionResults | null>(null);
  const [showLookAwayWarning, setShowLookAwayWarning] = useState(false);
  
  const sessionRef = useRef({
    startedAt: 0,
    snapshots: [] as VisionSnapshot[],
    notCenteredStartedAt: null as number | null,
    isWarningActive: false,
    lastSnapshotAt: 0,
  });

  const recordVisionResults = useCallback((results: VisionResults) => {
    latestResultsRef.current = results;
  }, []);

  const reset = useCallback(() => {
    const now = Date.now();
    sessionRef.current = {
      startedAt: now,
      snapshots: [],
      notCenteredStartedAt: null,
      isWarningActive: false,
      lastSnapshotAt: now,
    };
    latestResultsRef.current = null;
    setShowLookAwayWarning(false);
  }, []);

  const getSummary = useCallback((): VisionSessionSummary => {
    return {
      visionAnalytics: {
        snapshots: [...sessionRef.current.snapshots],
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setShowLookAwayWarning(false);
      return;
    }

    reset();

    const interval = window.setInterval(() => {
      const now = Date.now();
      const session = sessionRef.current;
      const results = latestResultsRef.current;

      const isCentered = !!(results?.status === "tracking" && results.faces?.[0]?.eye && !results.faces[0].eye.lookingAway);
      
      if (now - session.lastSnapshotAt >= SNAPSHOT_INTERVAL_MS) {
         session.snapshots.push({
            time: formatTime(now - session.startedAt),
            centered: isCentered
         });
         session.lastSnapshotAt += SNAPSHOT_INTERVAL_MS;
      }

      if (!isCentered) {
        if (session.notCenteredStartedAt === null) {
          session.notCenteredStartedAt = now;
        } else if (now - session.notCenteredStartedAt >= WARNING_AFTER_MS) {
          if (!session.isWarningActive) {
            session.isWarningActive = true;
            setShowLookAwayWarning(true);
            window.setTimeout(() => setShowLookAwayWarning(false), 2500);
          }
        }
      } else {
        session.notCenteredStartedAt = null;
        session.isWarningActive = false;
      }

    }, 200);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, reset]);

  return {
    recordVisionResults,
    resetVisionSession: reset,
    getVisionSummary: getSummary,
    showLookAwayWarning,
  };
}
