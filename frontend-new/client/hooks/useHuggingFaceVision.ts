import { useEffect, useMemo, useRef, useState } from "react";
import {
  HuggingFaceVisionTracker,
  type VisionResults,
  type VisionStatus,
} from "@/lib/huggingFaceVision";

interface UseHuggingFaceVisionOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  modelUrl?: string;
  useDefaultObjectModel?: boolean;
}

const EMPTY_RESULTS: VisionResults = {
  objects: [],
  faces: [],
  status: "idle",
};

export function useHuggingFaceVision({
  enabled,
  videoRef,
  modelUrl,
  useDefaultObjectModel = true,
}: UseHuggingFaceVisionOptions) {
  const trackerRef = useRef<HuggingFaceVisionTracker | null>(null);
  const [results, setResults] = useState<VisionResults>(EMPTY_RESULTS);
  const [status, setStatus] = useState<VisionStatus>("idle");
  const [error, setError] = useState("");

  const configKey = useMemo(
    () => `${modelUrl ?? ""}:${useDefaultObjectModel ? "default-object-model" : "faces-only"}`,
    [modelUrl, useDefaultObjectModel],
  );

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;

    if (!enabled || !video) {
      trackerRef.current?.stop();
      trackerRef.current = null;
      setResults(EMPTY_RESULTS);
      setStatus("idle");
      setError("");
      return;
    }

    const start = async () => {
      trackerRef.current?.stop();
      await waitForPlayableVideo(video);
      if (cancelled) return;

      const tracker = new HuggingFaceVisionTracker({
        video,
        modelUrl,
        useDefaultObjectModel,
        onResults: (nextResults) => {
          if (!cancelled) setResults(nextResults);
        },
        onStatus: (nextStatus, nextError) => {
          if (cancelled) return;
          setStatus(nextStatus);
          setError(nextError ?? "");
        },
      });

      trackerRef.current = tracker;

      try {
        await tracker.start();
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Vision models could not be loaded.";
        setStatus("unavailable");
        setError(message);
        setResults({ objects: [], faces: [], status: "unavailable", error: message });
      }
    };

    start();

    return () => {
      cancelled = true;
      trackerRef.current?.stop();
      trackerRef.current = null;
    };
  }, [enabled, videoRef, configKey]);

  return { results, status, error };
}

function waitForPlayableVideo(video: HTMLVideoElement) {
  if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let resolved = false;
    const timeout = window.setTimeout(done, 5000);

    function done() {
      if (resolved) return;
      resolved = true;
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", done);
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("playing", done);
      resolve();
    }

    video.addEventListener("loadedmetadata", done);
    video.addEventListener("loadeddata", done);
    video.addEventListener("playing", done);
  });
}
