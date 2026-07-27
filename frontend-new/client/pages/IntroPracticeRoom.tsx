import React, { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useVisionSessionAnalytics } from "@/hooks/useVisionSessionAnalytics";
import { usePipeline } from "@/hooks/use-pipeline";
import { getResumeSummary } from "@/lib/api";
import { Loader2 } from "lucide-react";

// Phase components
import { IntroPhaseWelcome } from "@/components/interview/IntroPhaseWelcome";
import { IntroPhasePermission } from "@/components/interview/IntroPhasePermission";
import { IntroPhaseDeviceCheck } from "@/components/interview/IntroPhaseDeviceCheck";
import { IntroPhaseInterviewTips } from "@/components/interview/IntroPhaseInterviewTips";
import { IntroPhaseReadyConfirmation } from "@/components/interview/IntroPhaseReadyConfirmation";
import { IntroPhaseCountdown } from "@/components/interview/IntroPhaseCountdown";
import { IntroPhaseAIGreeting } from "@/components/interview/IntroPhaseAIGreeting";
import { IntroPhaseRecording } from "@/components/interview/IntroPhaseRecording";
import { IntroPhaseReview } from "@/components/interview/IntroPhaseReview";
import { IntroPhaseProcessing } from "@/components/interview/IntroPhaseProcessing";
import { IntroPhaseQuickSummary } from "@/components/interview/IntroPhaseQuickSummary";

// ─── State machine types ───────────────────────────────────────────────────────

type InterviewPhase =
  | "WELCOME"
  | "PERMISSION_REQUEST"
  | "DEVICE_CHECK"
  | "INTERVIEW_TIPS"
  | "READY_CONFIRMATION"
  | "COUNTDOWN"
  | "AI_GREETING"
  | "RECORDING"
  | "REVIEW"
  | "PROCESSING"
  | "SUMMARY"
  | "COMPLETED";

const PHASE_LABELS: Record<InterviewPhase, string> = {
  WELCOME: "Welcome",
  PERMISSION_REQUEST: "Permissions",
  DEVICE_CHECK: "Device Check",
  INTERVIEW_TIPS: "Tips",
  READY_CONFIRMATION: "Get Ready",
  COUNTDOWN: "Starting",
  AI_GREETING: "Interview",
  RECORDING: "Interview",
  REVIEW: "Review",
  PROCESSING: "Processing",
  SUMMARY: "Summary",
  COMPLETED: "Done",
};

const PROGRESS_PHASES: InterviewPhase[] = [
  "WELCOME",
  "PERMISSION_REQUEST",
  "DEVICE_CHECK",
  "INTERVIEW_TIPS",
  "READY_CONFIRMATION",
  "RECORDING",
  "REVIEW",
  "SUMMARY",
];

// ─── Exit protection modal ─────────────────────────────────────────────────────

function ExitGuardModal({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-sm w-full bg-card border border-border/60 rounded-3xl p-8 space-y-6 shadow-2xl text-center"
      >
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Your recording hasn't been submitted yet.</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            If you leave now, your recording will be lost and you will not receive any feedback.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={onStay}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all"
          >
            Continue Practice
          </button>
          <button
            onClick={onLeave}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Leave Anyway
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Progress indicator ────────────────────────────────────────────────────────

function ProgressBar({ phase }: { phase: InterviewPhase }) {
  const idx = PROGRESS_PHASES.indexOf(phase);
  const showPhases: InterviewPhase[] = ["WELCOME", "PERMISSION_REQUEST", "DEVICE_CHECK", "INTERVIEW_TIPS", "READY_CONFIRMATION", "RECORDING", "REVIEW", "SUMMARY"];
  const displayIdx = idx < 0 ? PROGRESS_PHASES.indexOf("RECORDING") : idx;

  if (
    phase === "COUNTDOWN" ||
    phase === "AI_GREETING" ||
    phase === "PROCESSING" ||
    phase === "COMPLETED"
  ) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-6 pt-3 pb-2 bg-background/80 backdrop-blur-md border-b border-border/30">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {showPhases.map((p, i) => {
            const isCurrent = p === phase || (phase === "RECORDING" && p === "RECORDING") || (phase === "REVIEW" && p === "REVIEW") || (phase === "SUMMARY" && p === "SUMMARY");
            const isPast = i < displayIdx;
            return (
              <React.Fragment key={p}>
                <div
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isPast
                      ? "bg-emerald-400/20 text-emerald-400"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {isPast ? `✓ ${PHASE_LABELS[p]}` : PHASE_LABELS[p]}
                </div>
                {i < showPhases.length - 1 && (
                  <div className={`flex-shrink-0 h-px w-4 rounded ${isPast ? "bg-emerald-400/40" : "bg-border/40"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function IntroPracticeRoom() {
  const navigate = useNavigate();
  const { sessionId, candidateName, initials } = useAuth();
  const { loading: pipelineLoading } = usePipeline();

  const interviewMode = sessionStorage.getItem("interviewMode") || "video";
  const isAudioOnly = interviewMode === "audio";

  const [phase, setPhase] = useState<InterviewPhase>("WELCOME");
  const [showExitGuard, setShowExitGuard] = useState(false);

  // Recording data passed between phases
  const [recordingId, setRecordingId] = useState("");
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<any>(null);
  const [processingError, setProcessingError] = useState("");

  // Media stream — requested only after permissions phase
  const {
    stream,
    audioState,
    videoState,
    requestAudio,
    requestVideo,
    isSpeaking: isCandidateSpeaking,
  } = useMediaStream(false, true);

  // Vision analytics — active only during recording
  const {
    recordVisionResults,
    getVisionSummary,
    coachingMessage,
  } = useVisionSessionAnalytics({ enabled: phase === "RECORDING" });

  // ── Session health check (LLM key) ──────────────────────────────────────────
  const [sessionError, setSessionError] = useState("");

  const checkSessionReady = useCallback(async (): Promise<boolean> => {
    if (!sessionId) return false;
    try {
      const data = await getResumeSummary(sessionId);
      if (!data.has_api_key) {
        setSessionError(
          "No AI key is configured for your account. Please contact support or go to Settings to add one."
        );
        return false;
      }
      return true;
    } catch {
      setSessionError("We could not verify your session. Please refresh the page and try again.");
      return false;
    }
  }, [sessionId]);

  // ── Exit protection ──────────────────────────────────────────────────────────
  useEffect(() => {
    const needsGuard = phase === "RECORDING" || phase === "REVIEW";
    if (!needsGuard) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // ── Phase transition helpers ─────────────────────────────────────────────────
  const goTo = useCallback((next: InterviewPhase) => setPhase(next), []);

  // WELCOME → PERMISSION_REQUEST
  const handleWelcomeContinue = () => {
    goTo("PERMISSION_REQUEST");
  };

  // PERMISSION_REQUEST → DEVICE_CHECK
  const handlePermissionsGranted = () => goTo("DEVICE_CHECK");

  // DEVICE_CHECK → INTERVIEW_TIPS
  const handleDeviceCheckContinue = async () => {
    const ready = await checkSessionReady();
    if (!ready) return;
    goTo("INTERVIEW_TIPS");
  };

  // INTERVIEW_TIPS → READY_CONFIRMATION
  const handleTipsReady = () => goTo("READY_CONFIRMATION");

  // READY_CONFIRMATION → COUNTDOWN (this is the only place the interview begins)
  const handleBeginInterview = () => goTo("COUNTDOWN");

  // COUNTDOWN → AI_GREETING
  const handleCountdownComplete = () => goTo("AI_GREETING");

  // AI_GREETING → RECORDING (recording starts automatically)
  const handleGreetingComplete = () => goTo("RECORDING");

  // RECORDING → REVIEW
  const handleRecordingFinish = (
    id: string,
    vBlob: Blob | null,
    aBlob: Blob | null,
    tscript: string
  ) => {
    setRecordingId(id);
    setVideoBlob(vBlob);
    setAudioBlob(aBlob);
    setTranscript(tscript);
    goTo("REVIEW");
  };

  // REVIEW → PROCESSING
  const handleReviewSubmit = () => goTo("PROCESSING");

  // REVIEW → back to READY_CONFIRMATION (record again)
  const handleRecordAgain = () => {
    setRecordingId("");
    setVideoBlob(null);
    setAudioBlob(null);
    setTranscript("");
    goTo("READY_CONFIRMATION");
  };

  // PROCESSING → SUMMARY
  const handleProcessingComplete = (res: any) => {
    setResult(res);
    goTo("SUMMARY");
  };

  // PROCESSING → error (stay on processing screen showing error)
  const handleProcessingError = (msg: string) => {
    setProcessingError(msg);
    goTo("REVIEW"); // Send back to review so they can retry
  };

  // SUMMARY → navigate to detailed result
  const handleViewDetails = () => {
    navigate("/intro-result", { state: { result }, replace: true });
  };

  // Exit guard
  const handleAttemptExit = () => {
    if (phase === "RECORDING" || phase === "REVIEW") {
      setShowExitGuard(true);
    } else {
      navigate("/intro-select");
    }
  };

  if (pipelineLoading) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Progress bar (hidden during full-screen phases) */}
      <ProgressBar phase={phase} />

      {/* Back button (hidden during interview + full-screen countdown) */}
      {phase !== "COUNTDOWN" && phase !== "AI_GREETING" && phase !== "RECORDING" && phase !== "PROCESSING" && (
        <button
          onClick={handleAttemptExit}
          className="fixed top-3 right-5 z-50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors rounded-lg hover:bg-muted/50"
        >
          ← Exit
        </button>
      )}

      {/* Session error overlay */}
      {sessionError && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="max-w-sm w-full bg-card border border-border/60 rounded-3xl p-8 space-y-4 text-center shadow-2xl">
            <h2 className="text-xl font-bold text-foreground">We could not start your interview</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{sessionError}</p>
            <button
              onClick={() => { setSessionError(""); goTo("INTERVIEW_TIPS"); }}
              className="w-full py-3 rounded-2xl bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Exit guard */}
      {showExitGuard && (
        <ExitGuardModal
          onStay={() => setShowExitGuard(false)}
          onLeave={() => navigate("/intro-select")}
        />
      )}

      {/* Processing error toast */}
      {processingError && phase === "REVIEW" && (
        <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4">
          <div className="max-w-md w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm text-center">
            {processingError}
            <br />
            <button
              className="mt-2 text-rose-400 underline text-xs"
              onClick={() => setProcessingError("")}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Phase rendering */}
      <AnimatePresence mode="wait">
        {phase === "WELCOME" && (
          <motion.div key="WELCOME" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-12">
            <IntroPhaseWelcome onContinue={handleWelcomeContinue} />
          </motion.div>
        )}

        {phase === "PERMISSION_REQUEST" && (
          <motion.div key="PERMISSION_REQUEST" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-12">
            <IntroPhasePermission
              onGranted={handlePermissionsGranted}
              requestAudio={requestAudio}
              requestVideo={requestVideo}
              audioState={audioState}
              videoState={videoState}
              isAudioOnly={isAudioOnly}
              stream={stream}
              isCandidateSpeaking={isCandidateSpeaking}
            />
          </motion.div>
        )}

        {phase === "DEVICE_CHECK" && (
          <motion.div key="DEVICE_CHECK" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-12">
            <IntroPhaseDeviceCheck
              onContinue={handleDeviceCheckContinue}
              stream={stream}
              audioState={audioState}
              videoState={videoState}
              isAudioOnly={isAudioOnly}
              isCandidateSpeaking={isCandidateSpeaking}
            />
          </motion.div>
        )}

        {phase === "INTERVIEW_TIPS" && (
          <motion.div key="INTERVIEW_TIPS" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-12">
            <IntroPhaseInterviewTips onReady={handleTipsReady} />
          </motion.div>
        )}

        {phase === "READY_CONFIRMATION" && (
          <motion.div key="READY_CONFIRMATION" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-12">
            <IntroPhaseReadyConfirmation onBeginInterview={handleBeginInterview} />
          </motion.div>
        )}

        {phase === "COUNTDOWN" && (
          <motion.div key="COUNTDOWN" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntroPhaseCountdown onComplete={handleCountdownComplete} />
          </motion.div>
        )}

        {phase === "AI_GREETING" && (
          <motion.div key="AI_GREETING" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntroPhaseAIGreeting onComplete={handleGreetingComplete} />
          </motion.div>
        )}

        {phase === "RECORDING" && (
          <motion.div key="RECORDING" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntroPhaseRecording
              stream={stream}
              isAudioOnly={isAudioOnly}
              candidateName={candidateName || "You"}
              initials={initials || "Y"}
              isCandidateSpeaking={isCandidateSpeaking}
              onVisionResults={recordVisionResults}
              coachingMessage={coachingMessage}
              onFinish={handleRecordingFinish}
            />
          </motion.div>
        )}

        {phase === "REVIEW" && (
          <motion.div key="REVIEW" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-12">
            <IntroPhaseReview
              recordingId={recordingId}
              isAudioOnly={isAudioOnly}
              onRecordAgain={handleRecordAgain}
              onSubmit={handleReviewSubmit}
            />
          </motion.div>
        )}

        {phase === "PROCESSING" && (
          <motion.div key="PROCESSING" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntroPhaseProcessing
              recordingId={recordingId}
              audioBlob={audioBlob}
              videoBlob={videoBlob}
              transcript={transcript}
              visionSummary={getVisionSummary()}
              isAudioOnly={isAudioOnly}
              onComplete={handleProcessingComplete}
              onError={handleProcessingError}
            />
          </motion.div>
        )}

        {phase === "SUMMARY" && result && (
          <motion.div key="SUMMARY" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntroPhaseQuickSummary
              result={result}
              onViewDetails={handleViewDetails}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
