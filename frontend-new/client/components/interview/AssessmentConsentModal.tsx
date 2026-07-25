import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Camera, VideoOff, CheckCircle2, ShieldCheck, AlertCircle, Sparkles, ChevronRight, Volume2 } from "lucide-react";
import { useMediaStream } from "@/hooks/useMediaStream";

interface AssessmentConsentModalProps {
  mode: "video" | "audio";
  title?: string;
  onConsentGranted: () => void;
  onCancel: () => void;
}

export function AssessmentConsentModal({
  mode,
  title = "Assessment System & Device Verification",
  onConsentGranted,
  onCancel,
}: AssessmentConsentModalProps) {
  const isAudioOnly = mode === "audio";
  const [hasConsented, setHasConsented] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  // Request audio & video (only if video mode)
  const {
    stream,
    audioState,
    videoState,
    requestAudio,
    requestVideo,
  } = useMediaStream(true, !isAudioOnly);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Attach stream to video element when camera is active
  useEffect(() => {
    if (videoRef.current && stream && !isAudioOnly) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isAudioOnly]);

  // Audio level meter calculation via Web Audio API
  useEffect(() => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack || audioTrack.readyState !== "live") return;

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        // Normalize 0..100
        setMicVolume(Math.min(100, Math.round((average / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e) {
      console.warn("Could not initialize audio visualizer", e);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
    };
  }, [stream]);

  const isMicReady = audioState === "granted" || (stream && stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].readyState === "live");
  const isVideoReady = isAudioOnly || videoState === "granted" || (stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].readyState === "live");

  const canProceed = isMicReady && isVideoReady && hasConsented;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="space-y-2 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Assessment Verification & Permission Consent ({isAudioOnly ? "Audio Mode" : "Video Mode"})
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-5 overflow-y-auto pr-1 flex-1 scrollbar-hide">
          {/* Device Checks Grid */}
          <div className={`grid ${isAudioOnly ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-4`}>
            {/* Microphone Check Card */}
            <div className="p-4 rounded-2xl border border-border/50 bg-background/50 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-xl ${isMicReady ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {isMicReady ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Microphone</h4>
                    <p className="text-[11px] text-muted-foreground">Audio Input & Speech Recognition</p>
                  </div>
                </div>
                {isMicReady ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                ) : (
                  <button
                    onClick={requestAudio}
                    className="text-xs font-bold text-primary hover:underline px-2 py-1 rounded bg-primary/10"
                  >
                    Grant Access
                  </button>
                )}
              </div>

              {/* Live Mic Meter */}
              <div className="space-y-1.5 pt-2 border-t border-border/30">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Mic Level Check
                  </span>
                  <span className="font-mono">{micVolume}%</span>
                </div>
                <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                  {[...Array(10)].map((_, i) => {
                    const threshold = (i + 1) * 10;
                    const isActive = micVolume >= threshold;
                    return (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-sm transition-colors duration-75 ${
                          isActive
                            ? i < 7
                              ? "bg-emerald-400"
                              : i < 9
                              ? "bg-amber-400"
                              : "bg-red-400"
                            : "bg-white/10"
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground italic">Speak into your mic to test audio detection.</p>
              </div>
            </div>

            {/* Camera Check Card (ONLY rendered if NOT audio-only) */}
            {!isAudioOnly && (
              <div className="p-4 rounded-2xl border border-border/50 bg-background/50 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-xl ${isVideoReady ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {isVideoReady ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Camera</h4>
                      <p className="text-[11px] text-muted-foreground">Video Stream & Visual Evaluation</p>
                    </div>
                  </div>
                  {isVideoReady ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  ) : (
                    <button
                      onClick={requestVideo}
                      className="text-xs font-bold text-primary hover:underline px-2 py-1 rounded bg-primary/10"
                    >
                      Grant Access
                    </button>
                  )}
                </div>

                {/* Camera Preview Box */}
                <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-border/40 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {!isVideoReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-2 text-center bg-black/80">
                      <VideoOff className="w-6 h-6 mb-1 text-amber-400" />
                      <span className="text-xs font-medium">Camera Feed Inactive</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Consent Checkbox Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-secondary/10 border border-primary/20 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-primary text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-foreground leading-snug block">
                  I consent to {isAudioOnly ? "microphone" : "camera and microphone"} access for this AI interview practice session.
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your audio {isAudioOnly ? "" : "and video stream "} will be evaluated by AI to provide immediate performance scoring and detailed feedback.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40">
          <button
            onClick={onCancel}
            className="px-5 py-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            Cancel & Go Back
          </button>

          <motion.button
            whileHover={canProceed ? { scale: 1.02 } : {}}
            whileTap={canProceed ? { scale: 0.98 } : {}}
            onClick={onConsentGranted}
            disabled={!canProceed}
            className={`px-6 py-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
              canProceed
                ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25 glow-primary cursor-pointer"
                : "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/10 opacity-60"
            }`}
          >
            <span>Proceed to Session Room</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
