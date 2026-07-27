import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles, Upload, Mic, Brain, Eye } from "lucide-react";
import { evaluateIntro } from "@/lib/api";
import { approveRecording } from "@/lib/indexedDB";
import { useAuth } from "@/lib/AuthContext";

interface IntroPhaseProcessingProps {
  recordingId: string;
  audioBlob: Blob | null;
  videoBlob: Blob | null;
  transcript: string;
  visionSummary: any;
  onComplete: (result: any) => void;
  onError: (msg: string) => void;
  isAudioOnly?: boolean;
}

// (Removed static STEPS and STEP_DELAYS_MS)

export function IntroPhaseProcessing({
  recordingId,
  audioBlob,
  videoBlob,
  transcript,
  visionSummary,
  onComplete,
  onError,
  isAudioOnly,
}: IntroPhaseProcessingProps) {
  const { sessionId } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const hasFiredRef = useRef(false);

  const steps = [
    { icon: Upload, label: "Uploading your recording" },
    { icon: Mic, label: "Transcribing your speech" },
    { icon: Brain, label: "Evaluating your communication" },
    ...(!isAudioOnly ? [{ icon: Eye, label: "Evaluating your camera presence" }] : []),
    { icon: Sparkles, label: "Generating personalised feedback" },
  ];

  useEffect(() => {
    // Advance progress UI independently of the actual API call
    const timers = steps.map((_, i) => {
      if (i === 0) return null;
      return setTimeout(() => setCurrentStep(i), i * 4000);
    }).filter(Boolean) as NodeJS.Timeout[];
    return () => timers.forEach(clearTimeout);
  }, [steps.length]);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    const run = async () => {
      try {
        if (!sessionId) throw new Error("Session expired. Please log in again.");

        const introType = sessionStorage.getItem("introType") || "general";
        const jdText = sessionStorage.getItem("jobDescription") || "";
        const interviewMode = sessionStorage.getItem("interviewMode") || "video";

        const uploadBlob = audioBlob || videoBlob;
        if (!uploadBlob) throw new Error("No recording found. Please record again.");

        const res = await evaluateIntro(
          sessionId,
          uploadBlob,
          introType,
          jdText,
          visionSummary ? JSON.stringify(visionSummary) : null,
          recordingId,
          interviewMode
        );

        // Approve local recording for background upload
        if (recordingId && res?.id) {
          try {
            await approveRecording(recordingId, res.id);
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({ type: "RECORDING_APPROVED" });
            }
          } catch {}
        }

        onComplete(res);
      } catch (e: any) {
        let msg = "Something went wrong. Please try again.";
        if (e?.message === "Unauthorized") msg = "Your session has expired. Please refresh and log in again.";
        else if (e?.message) msg = e.message;
        onError(msg);
      }
    };

    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Animated orb */}
        <div className="flex justify-center">
          <div className="relative">
            {[0, 1].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-primary/20"
                animate={{ scale: [1, 1.6 + i * 0.4], opacity: [0.5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
              />
            ))}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full border-t-2 border-primary animate-spin" />
            </motion.div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Evaluating your introduction…</h1>
          <p className="text-muted-foreground text-sm">This usually takes less than 30 seconds.</p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            const isPending = i > currentStep;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-4 p-3.5 rounded-2xl border transition-all ${
                  isActive ? "bg-primary/10 border-primary/20" :
                  isDone ? "bg-emerald-400/5 border-emerald-400/15 opacity-80" :
                  "opacity-30 border-border/20"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" :
                  isDone ? "bg-emerald-400/20 text-emerald-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isActive
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isDone
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <Icon className="w-4 h-4" />
                  }
                </div>
                <span className={`text-sm font-medium ${
                  isActive ? "text-primary font-bold" :
                  isDone ? "text-foreground" :
                  "text-muted-foreground"
                }`}>
                  {isDone ? `✓ ${step.label}` : step.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
