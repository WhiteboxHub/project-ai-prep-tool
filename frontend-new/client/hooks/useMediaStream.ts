/**
 * useMediaStream — Production-grade media device hook
 *
 * Architecture mirrors Google Meet / Zoom / Teams:
 *  1. Audio and camera are ALWAYS requested independently.
 *  2. A module-level singleton cache prevents React 18 Strict Mode from
 *     issuing two OS-level getUserMedia calls in the same render cycle,
 *     which is the root cause of the macOS CoreAudio "NotFoundError".
 *  3. One device failing NEVER blocks the other or the interview room.
 *  4. State is tracked independently per device.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Permission state type ──────────────────────────────────────────────────
export type PermissionState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

// ─── Module-level singleton cache ──────────────────────────────────────────
// These live outside the hook so React 18 Strict Mode double-mount never
// fires two OS-level getUserMedia calls for the same device.
let _audioStreamCache: MediaStream | null = null;
let _videoStreamCache: MediaStream | null = null;
let _audioRequestInFlight: Promise<MediaStream | null> | null = null;
let _videoRequestInFlight: Promise<MediaStream | null> | null = null;

// ─── Pure device request functions ─────────────────────────────────────────
async function acquireMicStream(): Promise<MediaStream | null> {
  // Return cached stream if tracks are still live
  if (_audioStreamCache && _audioStreamCache.getAudioTracks().some(t => t.readyState === "live")) {
    return _audioStreamCache;
  }
  // De-duplicate in-flight requests (Strict Mode safe)
  if (_audioRequestInFlight) return _audioRequestInFlight;

  // Constraint waterfall:
  //   1. Try with ideal processing hints
  //   2. If that fails (NotFoundError / OverconstrainedError on macOS), retry with plain { audio: true }
  //   3. On retry, wait 300ms for CoreAudio to release the previous failed lock
  const runAudioRequest = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
    } catch (firstErr: any) {
      if (
        firstErr?.name === "NotFoundError" ||
        firstErr?.name === "OverconstrainedError" ||
        firstErr?.name === "NotReadableError"
      ) {
        // Wait for OS audio subsystem to recover before retrying
        await new Promise(r => setTimeout(r, 300));
        return navigator.mediaDevices.getUserMedia({ audio: true });
      }
      throw firstErr;
    }
  };

  _audioRequestInFlight = runAudioRequest()
    .then((stream) => {
      _audioStreamCache = stream;
      return stream;
    })
    .catch((err) => {
      _audioStreamCache = null;
      throw err;
    })
    .finally(() => {
      _audioRequestInFlight = null;
    });

  return _audioRequestInFlight;
}

async function acquireCameraStream(): Promise<MediaStream | null> {
  // Return cached stream if tracks are still live
  if (_videoStreamCache && _videoStreamCache.getVideoTracks().some(t => t.readyState === "live")) {
    return _videoStreamCache;
  }
  if (_videoRequestInFlight) return _videoRequestInFlight;

  // Constraint waterfall:
  //   1. Try with ideal resolution / facing mode
  //   2. Fall back to plain { video: true } if device rejects constraints
  const runVideoRequest = async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: "user" },
        },
      });
    } catch (firstErr: any) {
      if (
        firstErr?.name === "NotFoundError" ||
        firstErr?.name === "OverconstrainedError" ||
        firstErr?.name === "NotReadableError"
      ) {
        await new Promise(r => setTimeout(r, 300));
        return navigator.mediaDevices.getUserMedia({ video: true });
      }
      throw firstErr;
    }
  };

  _videoRequestInFlight = runVideoRequest()
    .then((stream) => {
      _videoStreamCache = stream;
      return stream;
    })
    .catch((err) => {
      _videoStreamCache = null;
      throw err;
    })
    .finally(() => {
      _videoRequestInFlight = null;
    });

  return _videoRequestInFlight;
}

function classifyError(err: any): { state: "denied" | "unavailable"; message: string } {
  if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
    return { state: "denied", message: "Access denied by browser or OS settings." };
  }
  if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
    return { state: "unavailable", message: "Device not found. Please connect the device and retry." };
  }
  if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
    return { state: "unavailable", message: "Device is busy or in use by another application." };
  }
  if (err?.name === "OverconstrainedError") {
    return { state: "unavailable", message: "Device does not support the required configuration." };
  }
  return { state: "unavailable", message: `Device error: ${err?.message || err?.name || "Unknown error"}` };
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useMediaStream(requestOnMount = true) {
  const mountedRef = useRef(false);

  // Combined stream exposed to VideoPanel
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Per-device independent state
  const [micPermission, setMicPermission] = useState<PermissionState>("idle");
  const [cameraPermission, setCameraPermission] = useState<PermissionState>("idle");
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // Legacy aliases used by ControlBar / IntroPracticeRoom / InterviewRoom
  const audioState: "prompt" | "granted" | "denied" =
    micPermission === "granted" ? "granted"
    : micPermission === "denied" || micPermission === "unavailable" ? "denied"
    : "prompt";

  const videoState: "prompt" | "granted" | "denied" =
    cameraPermission === "granted" ? "granted"
    : cameraPermission === "denied" || cameraPermission === "unavailable" ? "denied"
    : "prompt";

  // Rebuilds the combined MediaStream from current cached tracks
  const rebuildStream = useCallback(() => {
    const tracks: MediaStreamTrack[] = [];
    if (_audioStreamCache) tracks.push(..._audioStreamCache.getAudioTracks().filter(t => t.readyState === "live"));
    if (_videoStreamCache) tracks.push(..._videoStreamCache.getVideoTracks().filter(t => t.readyState === "live"));
    if (tracks.length > 0) {
      const combined = new MediaStream(tracks);
      streamRef.current = combined;
      setStream(combined);
    } else {
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  // ── Microphone ─────────────────────────────────────────────────────────
  const requestAudio = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermission("unavailable");
      setAudioError("Browser does not support media devices.");
      return;
    }
    setMicPermission("requesting");
    setAudioError("");
    try {
      await acquireMicStream();
      if (!mountedRef.current) return;
      setMicPermission("granted");
      setMicEnabled(true);
      rebuildStream();
    } catch (err: any) {
      if (!mountedRef.current) return;
      const { state, message } = classifyError(err);
      setMicPermission(state);
      setAudioError(message);
      // Log as warn-level — this is expected when no mic is connected
      console.warn("[useMediaStream] Microphone:", err?.name, err?.message);
    }
  }, [rebuildStream]);

  // ── Camera ─────────────────────────────────────────────────────────────
  const requestVideo = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraPermission("unavailable");
      setVideoError("Browser does not support media devices.");
      return;
    }
    setCameraPermission("requesting");
    setVideoError("");
    try {
      await acquireCameraStream();
      if (!mountedRef.current) return;
      setCameraPermission("granted");
      setCameraEnabled(true);
      rebuildStream();
    } catch (err: any) {
      if (!mountedRef.current) return;
      const { state, message } = classifyError(err);
      setCameraPermission(state);
      setVideoError(message);
      console.warn("[useMediaStream] Camera:", err?.name, err?.message);
    }
  }, [rebuildStream]);

  // ── Request both (independent — one failure never blocks the other) ────
  const requestMedia = useCallback(async () => {
    // Fire both in parallel; never await one before starting the other
    await Promise.allSettled([requestAudio(), requestVideo()]);
  }, [requestAudio, requestVideo]);

  // ── Mount / unmount lifecycle ──────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (requestOnMount) {
      requestMedia();
    }
    return () => {
      mountedRef.current = false;
      // Do NOT stop cached streams on unmount — Strict Mode would kill them
      // on the first unmount before the real mount. Streams are stopped via stopMedia().
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestOnMount, requestMedia]);

  // ── Realtime Speaking Detection ────────────────────────────────────────
  useEffect(() => {
    if (!micEnabled || !stream || !_audioStreamCache) return;
    
    // Safety check for Safari/Firefox
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      const audioCtx = new AudioContextCtor();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      // We only want the audio tracks from the cache, not the combined stream which might have video
      const activeAudioTracks = _audioStreamCache.getAudioTracks().filter(t => t.readyState === "live");
      if (activeAudioTracks.length === 0) return;

      const source = audioCtx.createMediaStreamSource(new MediaStream(activeAudioTracks));
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speakingFrames = 0;
      let silenceFrames = 0;

      const checkLevel = () => {
        if (!mountedRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;

        // Debounce thresholding
        if (average > 2) { // 2 is an ultra-low threshold to catch the quietest voices but ignore pure digital zero
          speakingFrames++;
          silenceFrames = 0;
          if (speakingFrames > 3) setIsSpeaking(true);
        } else {
          silenceFrames++;
          speakingFrames = 0;
          if (silenceFrames > 15) setIsSpeaking(false);
        }

        rafRef.current = requestAnimationFrame(checkLevel);
      };

      checkLevel();
    } catch (err) {
      console.warn("[useMediaStream] AudioContext setup failed:", err);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [micEnabled, stream]); // Re-run if stream rebuilt

  // ── Stop all media ─────────────────────────────────────────────────────
  const stopMedia = useCallback(() => {
    if (_audioStreamCache) {
      _audioStreamCache.getTracks().forEach(t => t.stop());
      _audioStreamCache = null;
    }
    if (_videoStreamCache) {
      _videoStreamCache.getTracks().forEach(t => t.stop());
      _videoStreamCache = null;
    }
    streamRef.current = null;
    setStream(null);
    setMicPermission("idle");
    setCameraPermission("idle");
    setMicEnabled(false);
    setCameraEnabled(false);
    setIsSpeaking(false);
  }, []);

  // ── Track enable/disable (mute without stopping) ───────────────────────
  const toggleAudio = useCallback((enabled: boolean) => {
    if (_audioStreamCache) {
      _audioStreamCache.getAudioTracks().forEach(t => { t.enabled = enabled; });
    }
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = enabled; });
    }
    setMicEnabled(enabled);
    if (!enabled) setIsSpeaking(false);
  }, []);

  const toggleVideo = useCallback((enabled: boolean) => {
    if (_videoStreamCache) {
      _videoStreamCache.getVideoTracks().forEach(t => { t.enabled = enabled; });
    }
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = enabled; });
    }
    setCameraEnabled(enabled);
  }, []);

  return {
    // Core stream for VideoPanel
    stream,
    // Per-device permission state
    micPermission,
    cameraPermission,
    micEnabled,
    cameraEnabled,
    // Error messages for UI toasts
    audioError,
    videoError,
    // Realtime speaking state
    isSpeaking,
    // Legacy aliases (used by ControlBar, IntroPracticeRoom, InterviewRoom)
    audioState,
    videoState,
    // Actions
    requestMedia,
    requestAudio,
    requestVideo,
    stopMedia,
    toggleAudio,
    toggleVideo,
  };
}
