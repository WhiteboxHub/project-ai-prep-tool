// client/pages/InterviewRoom.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Loader2,
  CheckCircle2, AlertCircle, ArrowRight, Volume2, Camera
} from "lucide-react";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { ControlBar } from "@/components/interview/ControlBar";
import { CopilotPanel } from "@/components/interview/CopilotPanel";
import { getStageQuestions, evaluateLiveAnswer, completeInterview } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";
import { useMediaStream } from "@/hooks/useMediaStream";
import { MainLayout } from "@/components/layout/MainLayout";
import { Lock } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage { role: "ai" | "user"; text: string; }
interface StageEval { score: number; feedback: string[]; stage: number; }

const TOTAL_STAGES = 5;
const QUESTIONS_PER_STAGE = 2; // backend gates on answeredInStage

export default function InterviewRoom() {
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const { pipeline, loading: pipelineLoading } = usePipeline();

  const type = sessionStorage.getItem("interviewType") || "technical";
  const diff = sessionStorage.getItem("interviewDifficulty") || "senior";
  
  // Computed stage name for backend LLM
  const getStageName = (s: number) => `${type} interview (${diff} level) - Stage ${s}`;

  // UI state
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<"candidate" | "ai" | null>(null);

  // Media permissions & streams
  const {
    stream, audioError, videoError, audioState, videoState,
    requestAudio, requestVideo, toggleVideo, toggleAudio
  } = useMediaStream(true);

  // Interview state
  const [stage, setStage] = useState(1);
  const [answeredInStage, setAnsweredInStage] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [evals, setEvals] = useState<StageEval[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Refs
  const transcriptRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Global Cleanup & Timer ────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Speech Synthesis ─────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1;
    utt.onstart = () => setIsAISpeaking(true);
    utt.onend = () => setIsAISpeaking(false);
    synthRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const init = async () => {
      try {
        const sn = getStageName(1);
        const data = await getStageQuestions(sessionId, 1, sn, "");
        const q = data.question || data.questions?.[0] || "Tell me about yourself and your background.";
        setCurrentQuestion(q);
        setMessages([{ role: "ai", text: q }]);
        speak(q);
      } catch (e) {
        const fallback = "Welcome! Let's start with: Tell me about yourself and your experience.";
        setCurrentQuestion(fallback);
        setMessages([{ role: "ai", text: fallback }]);
        speak(fallback);
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, [sessionId, speak, type, diff]);

  // ── Speech Recognition ────────────────────────────────────────────────────
  const startRecognition = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition not supported. Use Chrome."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
      }
      if (final) {
        setTranscript((p) => {
          const newText = p + final;
          transcriptRef.current = newText;
          return newText;
        });
      }
    };
    rec.onerror = () => {
      setRecording(false);
      if (transcriptRef.current.trim()) submitAnswer(transcriptRef.current.trim());
    };
    rec.onend = () => {
      setRecording(false);
      // If we stopped naturally or manually, submit what we have
      if (transcriptRef.current.trim()) submitAnswer(transcriptRef.current.trim());
    };
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    // Clear old transcript when starting new
    setTranscript("");
    transcriptRef.current = "";
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop(); // This triggers onend, which handles submission
    setRecording(false);
  };

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = async (textToSubmit?: string) => {
    const finalTranscript = textToSubmit || transcriptRef.current;
    if (!finalTranscript.trim()) { setError("Please record your answer using the microphone."); return; }
    if (!sessionId) return;

    setLoading(true);
    setError("");
    const userText = finalTranscript.trim();
    setTranscript("");
    transcriptRef.current = "";

    // Optimistic UI
    const newMsgs: ChatMessage[] = [...messages, { role: "user", text: userText }];
    setMessages(newMsgs);
    
    // Format context for backend
    const prevCtx = newMsgs.map(m => `${m.role === "ai" ? "Interviewer" : "Candidate"}: ${m.text}`).join("\n");
    const currentStageName = getStageName(stage);

    try {
      const evalRes = await evaluateLiveAnswer(sessionId, stage, userText, currentStageName, prevCtx);
      const newAnswered = answeredInStage + 1;
      setAnsweredInStage(newAnswered);

      if (evalRes.evaluation?.overall_score !== undefined) {
        setEvals((e) => [...e, { score: evalRes.evaluation.overall_score, feedback: evalRes.evaluation.gap_analysis || [], stage }]);
      } else if (evalRes.score !== undefined) {
        setEvals((e) => [...e, { score: evalRes.score, feedback: evalRes.feedback || [], stage }]);
      }

      const aiResponse = evalRes.response || evalRes.next_question || evalRes.follow_up;

      // Advance stage if needed
      if (newAnswered >= QUESTIONS_PER_STAGE && stage < TOTAL_STAGES) {
        const nextStage = stage + 1;
        const stageMsg = `Great work on Stage ${stage}! Let's move to Stage ${nextStage}.`;
        setMessages((m) => [...m, { role: "ai", text: stageMsg }]);
        speak(stageMsg);
        setStage(nextStage);
        setAnsweredInStage(0);

        // Fetch next stage question
        setTimeout(async () => {
          try {
            const nextSn = getStageName(nextStage);
            const nextData = await getStageQuestions(sessionId, nextStage, nextSn, prevCtx);
            const nq = nextData.question || nextData.questions?.[0] || "Let's continue with the next topic.";
            setCurrentQuestion(nq);
            setMessages((m) => [...m, { role: "ai", text: nq }]);
            speak(nq);
          } catch {}
        }, 3000);
      } else if (newAnswered >= QUESTIONS_PER_STAGE && stage >= TOTAL_STAGES) {
        // All stages done
        const doneMsg = "Excellent! You've completed all interview stages. Generating your report...";
        setMessages((m) => [...m, { role: "ai", text: doneMsg }]);
        speak(doneMsg);
        await completeInterview(sessionId);
        setCompleted(true);
        setTimeout(() => navigate("/progress"), 3000);
      } else if (aiResponse || evalRes.reply) {
        const resp = aiResponse || evalRes.reply;
        setCurrentQuestion(resp);
        setMessages((m) => [...m, { role: "ai", text: resp }]);
        speak(resp);
      }
    } catch (e: any) {
      setError(e.message || "Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Completion screen ─────────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Interview Complete!</h2>
          <p className="text-muted-foreground">Generating your progress report...</p>
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  if (pipelineLoading) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (pipeline.interview === "locked") {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-border/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Interview Locked</h2>
          <p className="text-muted-foreground max-w-md">You must complete Introduction Practice and Project Evaluation before starting the Interview Room.</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/")} className="px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary font-semibold rounded-lg mt-4 smooth-transition">
            Return to Dashboard
          </motion.button>
        </div>
      </MainLayout>
    );
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-background via-card/30 to-background overflow-hidden">

      {/* Loading overlay */}
      {initLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading interview questions...</p>
          </div>
        </div>
      )}

      {/* Minimal Permission Warning Toasts */}
      <AnimatePresence>
        {(audioState === "denied" || videoState === "denied") && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2"
          >
            {audioState === "denied" && (
              <div className="glass-card px-4 py-3 rounded-xl border border-amber-500/30 shadow-lg flex items-center gap-3 w-max max-w-[90vw]">
                <div className="p-2 rounded-full bg-amber-500/10 text-amber-500">
                  <MicOff className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Microphone Access Denied</p>
                  <p className="text-xs text-muted-foreground">{audioError || "Microphone unavailable."}</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={requestAudio}
                  className="ml-4 px-3 py-1.5 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition-all"
                >
                  Retry Mic
                </motion.button>
              </div>
            )}
            {videoState === "denied" && (
              <div className="glass-card px-4 py-3 rounded-xl border border-amber-500/30 shadow-lg flex items-center gap-3 w-max max-w-[90vw]">
                <div className="p-2 rounded-full bg-amber-500/10 text-amber-500">
                  <VideoOff className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Camera Access Denied</p>
                  <p className="text-xs text-muted-foreground">{videoError || "Camera unavailable."}</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={requestVideo}
                  className="ml-4 px-3 py-1.5 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition-all"
                >
                  Retry Camera
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        className={`w-full h-full flex items-center justify-center p-4 sm:p-6 transition-all ${isCopilotOpen ? "mr-80" : ""}`}>
        <div className="hidden md:flex gap-4 w-full h-full max-h-[calc(100vh-180px)]">
          <div className={`transition-all duration-500 ease-in-out ${focusedPanel === "candidate" ? "flex-1" : focusedPanel === "ai" ? "w-1/3 max-w-[300px] opacity-70 hover:opacity-100" : "w-1/2"}`}>
            <VideoPanel 
              title="You (Candidate)" 
              isMuted={!isMicOn} 
              isCameraOff={!isCameraOn} 
              initials="ME" 
              isCandidate={true} 
              isExpanded={focusedPanel === "candidate"}
              onExpand={() => setFocusedPanel(p => p === "candidate" ? null : "candidate")}
              mediaStream={stream}
            />
          </div>
          <div className={`transition-all duration-500 ease-in-out ${focusedPanel === "ai" ? "flex-1" : focusedPanel === "candidate" ? "w-1/3 max-w-[300px] opacity-70 hover:opacity-100" : "w-1/2"}`}>
            <VideoPanel 
              title="AI Interviewer" 
              isAISpeaking={isAISpeaking} 
              isCameraOff={false} 
              initials="AI" 
              isExpanded={focusedPanel === "ai"}
              onExpand={() => setFocusedPanel(p => p === "ai" ? null : "ai")}
            />
          </div>
        </div>
        <div className="md:hidden h-full w-full">
          <VideoPanel title="AI Interviewer" isAISpeaking={isAISpeaking} isCameraOff={false} initials="AI" />
        </div>
      </motion.div>

      {/* Stage progress bar — top-right, clear of ControlBar */}
      <div className="fixed top-4 right-6 z-40 flex items-center gap-2 glass-card px-4 py-2 rounded-full border border-border/50">
        {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all ${i + 1 < stage ? "bg-green-400" : i + 1 === stage ? "bg-primary animate-pulse" : "bg-white/20"}`} />
        ))}
        <span className="text-xs text-muted-foreground ml-2">Stage {stage}/{TOTAL_STAGES}</span>
        <span className="text-xs text-muted-foreground ml-4">{formatTime(timeElapsed)}</span>
      </div>

      {/* ── ControlBar ONLY (Center Bottom) ── */}
      <div className={`fixed bottom-6 z-40 transition-all w-full max-w-3xl px-4 flex flex-col items-center gap-4 ${isCopilotOpen ? "left-[calc(50%-160px)]" : "left-1/2"} -translate-x-1/2`}>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* Floating Live Transcript Indicator */}
        <AnimatePresence>
          {transcript && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card px-6 py-4 rounded-2xl border border-primary/30 max-w-2xl w-full text-center shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Live Transcript</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{transcript}</p>
            </motion.div>
          )}
          {loading && !transcript && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card px-6 py-4 rounded-2xl border border-primary/30 flex items-center justify-center gap-3 shadow-2xl backdrop-blur-xl"
            >
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-sm text-foreground">Analyzing your response...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <ControlBar
          onToggleMic={(enabled) => {
            setIsMicOn(!enabled);
            toggleAudio(!enabled);
          }}
          onToggleCamera={(enabled) => {
            setIsCameraOn(!enabled);
            toggleVideo(!enabled);
          }}
          onRecordToggle={() => recording ? stopRecognition() : startRecognition()}
          isRecording={recording}
          isAudioDenied={audioState === "denied"}
          isVideoDenied={videoState === "denied"}
          onRetryAudio={requestAudio}
          onRetryVideo={requestVideo}
          wrapperClassName="relative"
        />
      </div>

      {/* Progress summary (bottom left) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="fixed bottom-24 left-6 z-40 glass-card p-4 rounded-lg border border-border/50 w-52 hidden lg:block">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Interview Progress</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current Stage</span>
            <span className="font-semibold text-foreground">{stage}/{TOTAL_STAGES}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Answered</span>
            <span className="font-semibold text-foreground">{answeredInStage}/{QUESTIONS_PER_STAGE}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Elapsed</span>
            <span className="font-semibold text-foreground">{formatTime(timeElapsed)}</span>
          </div>
          {evals.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Avg Score</span>
              <span className="font-semibold text-primary">
                {Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length * 10)}%
              </span>
            </div>
          )}
        </div>
      </motion.div>


      <CopilotPanel
        isOpen={isCopilotOpen}
        onToggle={() => setIsCopilotOpen(!isCopilotOpen)}
        messages={messages}
        currentQuestion={currentQuestion}
        evals={evals}
        stage={stage}
        interviewType={type}
      />
    </div>
  );
}
