import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useHuggingFaceVision } from "@/hooks/useHuggingFaceVision";
import { getVisionCoaching } from "@/lib/visionCoaching";
import { VoiceVerification } from "./VoiceVerification";

interface IntroPhaseDeviceCheckProps {
  onContinue: () => void;
  stream: MediaStream | null;
  audioState: string;
  videoState: string;
  isAudioOnly: boolean;
  isCandidateSpeaking: boolean;
}

type CheckId = "camera" | "face" | "mic" | "voice" | "network";

interface Check {
  id: CheckId;
  label: string;
  successMsg: string;
  instructionMsg?: string;
  failMsg?: string;
}

export function IntroPhaseDeviceCheck({
  onContinue,
  stream,
  audioState,
  videoState,
  isAudioOnly,
  isCandidateSpeaking,
}: IntroPhaseDeviceCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Define required checks based on mode
  const checkSequence = useMemo<Check[]>(() => {
    const seq: Check[] = [];
    if (!isAudioOnly) {
      seq.push({ id: "camera", label: "Checking camera connection...", successMsg: "Camera connected.", failMsg: "We could not detect your camera. Please check your connection." });
      seq.push({ id: "face", label: "Looking for your face...", successMsg: "We can see you.", instructionMsg: "We couldn't detect your face. Please sit in front of the camera." });
    }
    seq.push({ id: "mic", label: "Checking microphone connection...", successMsg: "Microphone connected.", failMsg: "We could not detect your microphone. Please check your connection." });
    seq.push({ id: "voice", label: "Testing your microphone...", successMsg: "Voice detected.", instructionMsg: "Please say a few words so we can test your microphone." });
    seq.push({ id: "network", label: "Checking internet connection...", successMsg: "Internet connected.", failMsg: "No internet connection detected." });
    return seq;
  }, [isAudioOnly]);

  const [activeCheckIndex, setActiveCheckIndex] = useState(0);
  const [passedChecks, setPassedChecks] = useState<Set<CheckId>>(new Set());
  const [failedCheck, setFailedCheck] = useState<CheckId | null>(null);
  const [coachingMsg, setCoachingMsg] = useState<string | null>(null);

  // Vision Hook: only enable when it's the face check step
  const isFaceCheckActive = !isAudioOnly && activeCheckIndex === checkSequence.findIndex(c => c.id === "face");
  const { results: visionResults } = useHuggingFaceVision({
    enabled: isFaceCheckActive,
    videoRef,
  });


  // Wire up video preview
  useEffect(() => {
    if (videoRef.current && stream && !isAudioOnly) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isAudioOnly]);

  // ── 1. The Main Sequential Check Engine (for instant pass/fail checks) ──
  useEffect(() => {
    if (activeCheckIndex >= checkSequence.length) return;
    if (failedCheck) return;

    const currentCheck = checkSequence[activeCheckIndex];
    let isCancelled = false;
    let timer: any;

    const passCheck = () => {
      if (isCancelled) return;
      setPassedChecks(prev => new Set(prev).add(currentCheck.id));
      setActiveCheckIndex(i => i + 1);
    };

    const failCheck = () => {
      if (isCancelled) return;
      setFailedCheck(currentCheck.id);
    };

    if (currentCheck.id === "camera") {
      timer = setTimeout(() => {
        if (videoState === "granted" && stream && stream.getVideoTracks().length > 0) passCheck();
        else failCheck();
      }, 500);
    } else if (currentCheck.id === "mic") {
      timer = setTimeout(() => {
        if (audioState === "granted" && stream && stream.getAudioTracks().length > 0) passCheck();
        else failCheck();
      }, 500);
    } else if (currentCheck.id === "network") {
      timer = setTimeout(() => {
        if (navigator.onLine) passCheck();
        else failCheck();
      }, 500);
    }
    // "face" and "voice" checks wait indefinitely for user action

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeCheckIndex, checkSequence, stream, videoState, audioState, failedCheck]);

  // ── 2. Face Detection Validation (requires 1.5s continuous with hysteresis) ──
  const faceStateRef = useRef({ perfectSince: 0, lastPerfectTime: 0 });

  useEffect(() => {
    if (failedCheck || activeCheckIndex >= checkSequence.length) return;
    const currentCheck = checkSequence[activeCheckIndex];
    if (currentCheck.id !== "face") return;

    const vw = videoRef.current?.videoWidth || 0;
    const vh = videoRef.current?.videoHeight || 0;
    const coaching = getVisionCoaching(visionResults, vw, vh);

    setCoachingMsg(coaching.message);

    const now = Date.now();
    const state = faceStateRef.current;

    if (coaching.isPerfect) {
      if (state.perfectSince === 0) state.perfectSince = now;
      state.lastPerfectTime = now;

      if (now - state.perfectSince >= 1500) {
        setPassedChecks(prev => new Set(prev).add("face"));
        setActiveCheckIndex(i => i + 1);
        setCoachingMsg(null);
      }
    } else {
      if (state.perfectSince > 0 && now - state.lastPerfectTime > 300) {
        state.perfectSince = 0;
      }
    }
  }, [activeCheckIndex, checkSequence, failedCheck, visionResults]);



  const allPassed = activeCheckIndex >= checkSequence.length;

  const handleRetry = () => {
    setPassedChecks(new Set());
    setFailedCheck(null);
    setActiveCheckIndex(0);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Getting you ready</h1>
          <p className="text-muted-foreground text-sm">
            We are making sure everything is working before your interview.
          </p>
        </div>

        {/* Camera preview (video mode only) */}
        {!isAudioOnly && stream && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50 border border-border/40"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </motion.div>
        )}

        {/* Check list */}
        <div className="space-y-3">
          {checkSequence.map((check, i) => {
            const isPassed = passedChecks.has(check.id);
            const isFailed = failedCheck === check.id;
            const isChecking = activeCheckIndex === i && !isFailed;
            const isPending = activeCheckIndex < i;

            if (isChecking && check.id === "voice") {
              return (
                <motion.div
                  key={check.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <VoiceVerification
                    stream={stream}
                    isSpeaking={isCandidateSpeaking}
                    onVerified={() => {
                      setPassedChecks(prev => new Set(prev).add("voice"));
                      setActiveCheckIndex(idx => idx + 1);
                    }}
                    title={check.label}
                    description={check.instructionMsg}
                  />
                </motion.div>
              );
            }

            return (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isPassed ? "bg-emerald-400/5 border-emerald-400/20"
                  : isFailed ? "bg-amber-500/5 border-amber-500/20"
                  : isChecking ? "bg-primary/5 border-primary/20"
                  : "bg-muted/30 border-border/30"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {isChecking && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                  {isPassed && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {isFailed && <AlertCircle className="w-5 h-5 text-amber-400" />}
                  {isPending && <div className="w-4 h-4 rounded-full border-2 border-border" />}
                </div>
                
                <div className="flex flex-col">
                  <p className={`text-sm font-medium leading-relaxed ${
                    isPassed ? "text-emerald-300"
                    : isFailed ? "text-amber-300"
                    : isChecking ? "text-foreground"
                    : "text-muted-foreground"
                  }`}>
                    {isPassed ? `✓ ${check.successMsg}` : check.label}
                  </p>
                  
                  {isChecking && (
                    <div className="mt-2 space-y-3">
                      {!isPassed && !isFailed && check.id === "face" && coachingMsg && (
                        <p className="text-sm font-medium text-amber-400 mt-1">
                          {coachingMsg}
                        </p>
                      )}
                      {!isPassed && !isFailed && check.instructionMsg && check.id !== "face" && (
                        <p className="text-xs text-muted-foreground animate-pulse">
                          {check.instructionMsg}
                        </p>
                      )}
                    </div>
                  )}
                  {isFailed && check.failMsg && (
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      {check.failMsg}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* All good message */}
        <AnimatePresence>
          {allPassed && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 text-center"
            >
              <p className="text-emerald-300 font-semibold text-sm">✓ Everything looks great. You are ready to go!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onContinue}
            disabled={!allPassed}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {allPassed ? "Continue →" : failedCheck ? "Some checks failed" : "Running checks..."}
          </button>
          
          {failedCheck && (
            <button
              onClick={handleRetry}
              className="w-full py-3 rounded-2xl border border-border/50 text-muted-foreground hover:text-foreground hover:border-border font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Run checks again
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
