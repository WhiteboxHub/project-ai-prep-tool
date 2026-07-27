import { useCallback, useEffect, useRef, useState } from "react";
import type { VisionResults } from "@/lib/huggingFaceVision";
import { getVisionCoaching } from "@/lib/visionCoaching";

export interface VisionSessionSummary {
  visionAnalytics: {
    totalTimeCenteredMs: number;
    totalTimeOutOfFrameMs: number;
    faceLostCount: number;
    centeringReminderCount: number;
    multipleFacesCount: number;
  };
}

const INTERVAL_MS = 250;

export function useVisionSessionAnalytics({ enabled }: { enabled: boolean }) {
  const latestResultsRef = useRef<VisionResults | null>(null);
  const [coachingMessage, setCoachingMessage] = useState<string | null>(null);

  const sessionRef = useRef({
    totalTimeCenteredMs: 0,
    totalTimeOutOfFrameMs: 0,
    faceLostCount: 0,
    centeringReminderCount: 0,
    multipleFacesCount: 0,

    // State tracking for sustained coaching
    sustainedState: {
      issue: null as string | null,
      startedAt: 0,
      reported: false,
    },
  });

  const latestDimensionsRef = useRef({ width: 640, height: 480 });

  const recordVisionResults = useCallback((results: VisionResults, width = 640, height = 480) => {
    latestResultsRef.current = results;
    latestDimensionsRef.current = { width, height };
  }, []);

  const reset = useCallback(() => {
    sessionRef.current = {
      totalTimeCenteredMs: 0,
      totalTimeOutOfFrameMs: 0,
      faceLostCount: 0,
      centeringReminderCount: 0,
      multipleFacesCount: 0,
      sustainedState: {
        issue: null,
        startedAt: 0,
        reported: false,
      },
    };
    latestResultsRef.current = null;
    setCoachingMessage(null);
  }, []);

  const getSummary = useCallback((): VisionSessionSummary => {
    return {
      visionAnalytics: {
        totalTimeCenteredMs: sessionRef.current.totalTimeCenteredMs,
        totalTimeOutOfFrameMs: sessionRef.current.totalTimeOutOfFrameMs,
        faceLostCount: sessionRef.current.faceLostCount,
        centeringReminderCount: sessionRef.current.centeringReminderCount,
        multipleFacesCount: sessionRef.current.multipleFacesCount,
      },
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCoachingMessage(null);
      return;
    }

    reset();

    const interval = window.setInterval(() => {
      const results = latestResultsRef.current;
      if (!results || results.status !== "tracking") return;

      const state = sessionRef.current;
      const vw = latestDimensionsRef.current.width;
      const vh = latestDimensionsRef.current.height;

      const coaching = getVisionCoaching(results, vw, vh);
      const issues = coaching.issues;

      // Update basic time counters
      if (issues.noFace) {
        state.totalTimeOutOfFrameMs += INTERVAL_MS;
      } else if (coaching.isPerfect) {
        state.totalTimeCenteredMs += INTERVAL_MS;
      }

      // Determine the highest priority issue right now
      let currentIssue: { id: string; msg: string; threshold: number } | null = null;

      if (issues.noFace) {
        currentIssue = { id: "noFace", msg: "We temporarily lost sight of your face.", threshold: 3000 };
      } else if (issues.multipleFaces) {
        currentIssue = { id: "multipleFaces", msg: "Only one person should be visible.", threshold: 2000 };
      } else if (issues.lookingAway) {
        currentIssue = { id: "lookingAway", msg: "Please look toward the camera.", threshold: 5000 };
      } else if (issues.notCentered || issues.edgeCropped) {
        currentIssue = { id: "notCentered", msg: "Please sit in the center.", threshold: 4000 };
      } else if (issues.tooClose || issues.tooFar) {
        currentIssue = { id: "badDistance", msg: "Please adjust your distance from the camera.", threshold: 4000 };
      }

      const sus = state.sustainedState;

      if (currentIssue) {
        if (sus.issue !== currentIssue.id) {
          // New issue started
          sus.issue = currentIssue.id;
          sus.startedAt = Date.now();
          sus.reported = false;
        } else if (!sus.reported) {
          // Same issue, check threshold
          const duration = Date.now() - sus.startedAt;
          if (duration >= currentIssue.threshold) {
            sus.reported = true;
            setCoachingMessage(currentIssue.msg);
            
            // Log analytics
            if (sus.issue === "noFace") state.faceLostCount++;
            if (sus.issue === "multipleFaces") state.multipleFacesCount++;
            if (sus.issue === "notCentered") state.centeringReminderCount++;
          }
        }
      } else {
        // No issue
        if (sus.issue) {
          sus.issue = null;
          sus.startedAt = 0;
          sus.reported = false;
          // Clear message if they fixed it
          setCoachingMessage(null);
        }
      }
    }, INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, reset]);

  return {
    recordVisionResults,
    resetVisionSession: reset,
    getVisionSummary: getSummary,
    coachingMessage,
  };
}
