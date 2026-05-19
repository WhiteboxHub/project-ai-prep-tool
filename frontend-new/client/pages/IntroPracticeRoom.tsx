import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, ArrowRight, Volume2, Lock, Camera, VideoOff, RotateCcw } from "lucide-react";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { ControlBar } from "@/components/interview/ControlBar";
import { evaluateIntroText, getDynamicTemplate, getIntroHistory } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";
import { useMediaStream } from "@/hooks/useMediaStream";
import { MainLayout } from "@/components/layout/MainLayout";

export default function IntroPracticeRoom() {
  const navigate = useNavigate();
  const { sessionId, candidateName, initials } = useAuth();
  const { pipeline, loading: pipelineLoading } = usePipeline();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<"candidate" | "ai" | null>(null);

  // Media permissions & streams
  const {
    stream, audioError, videoError, audioState, videoState,
    requestAudio, requestVideo, toggleVideo, toggleAudio, isSpeaking: isCandidateSpeaking
  } = useMediaStream(true);

  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState("");
  const [result, setResult] = useState<any>(null);
  const [silenceRemaining, setSilenceRemaining] = useState<number | null>(null);

  const transcriptRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Global Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

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
    getDynamicTemplate(sessionId).then((d) => {
      setTemplate(d.template || d.script || "");
    }).catch(() => {});
    
    // Initial welcome
    setTimeout(() => {
      speak("Welcome to your introduction practice. Whenever you're ready, tell me about yourself and your background.");
    }, 1000);
  }, [sessionId, speak]);

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

      // Reset silence detection timer (6.0 seconds) whenever speech is detected
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      setSilenceRemaining(6);
      countdownIntervalRef.current = setInterval(() => {
        setSilenceRemaining((r) => (r !== null && r > 1 ? r - 1 : null));
      }, 1000);

      silenceTimerRef.current = setTimeout(() => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setSilenceRemaining(null);
        if (transcriptRef.current.trim()) {
          stopRecognition();
          submitAnswer();
        }
      }, 6000);
    };
    rec.onerror = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setSilenceRemaining(null);
      setRecording(false);
      if (transcriptRef.current.trim()) submitAnswer(transcriptRef.current.trim());
    };
    rec.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setSilenceRemaining(null);
      setRecording(false);
    };
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    setTranscript("");
    transcriptRef.current = "";
    setSilenceRemaining(6);
    countdownIntervalRef.current = setInterval(() => {
      setSilenceRemaining((r) => (r !== null && r > 1 ? r - 1 : null));
    }, 1000);
    silenceTimerRef.current = setTimeout(() => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setSilenceRemaining(null);
      if (transcriptRef.current.trim()) {
        stopRecognition();
        submitAnswer();
      }
    }, 6000);
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setSilenceRemaining(null);
    setRecording(false);
  };

  const submitAnswer = async (textToSubmit?: string) => {
    const finalTranscript = textToSubmit || transcriptRef.current;
    if (!finalTranscript.trim()) { setError("Please record your answer using the microphone."); return; }
    if (!sessionId) return;

    setLoading(true);
    setError("");
    const userText = finalTranscript.trim();

    try {
      const res = await evaluateIntroText(sessionId, userText);
      setResult(res);
      const score = res.score || res.total_score || res.evaluation?.overall_score || 0;
      let msg = "";
      if (score >= 75) {
        msg = `Excellent work! You scored ${score} out of 100. Your introduction practice is complete, and technical interviews are now unlocked!`;
      } else {
        msg = `You scored ${score} out of 100. You need a score of at least 75 to complete this module and unlock technical interviews. Let's review the feedback and practice again.`;
      }
      speak(msg);
    } catch (e: any) {
      let errorMsg = "Evaluation failed. Please try again.";
      if (e?.message && typeof e.message === "string") {
        if (e.message.includes("[object Object]")) errorMsg = "Server evaluation error. Please check your transcript and try again.";
        else errorMsg = e.message;
      } else if (typeof e === "string") {
        errorMsg = e;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (pipelineLoading) {
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (pipeline.intro === "locked") {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-border/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Practice Locked</h2>
          <p className="text-muted-foreground max-w-md">You must complete your setup and project explanation before practicing your introduction.</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/")} className="px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary font-semibold rounded-lg mt-4 smooth-transition">
            Return to Dashboard
          </motion.button>
        </div>
      </MainLayout>
    );
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-background via-card/30 to-background overflow-hidden flex">
      

      {/* Left side: Video Panels */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative transition-all mr-80">
        <div className="hidden md:flex gap-4 w-full max-w-5xl h-full max-h-[calc(100vh-180px)]">
          <div className={`transition-all duration-500 ease-in-out ${focusedPanel === "candidate" ? "flex-1" : focusedPanel === "ai" ? "w-1/3 max-w-[300px] opacity-70 hover:opacity-100" : "w-1/2"}`}>
            <VideoPanel 
              title={candidateName} 
              isMuted={!isMicOn} 
              isCameraOff={!isCameraOn} 
              initials={initials} 
              isCandidate={true} 
              isSpeaking={isCandidateSpeaking && recording}
              isExpanded={focusedPanel === "candidate"}
              onExpand={() => setFocusedPanel(p => p === "candidate" ? null : "candidate")}
              mediaStream={stream}
            />
          </div>
          <div className={`transition-all duration-500 ease-in-out ${focusedPanel === "ai" ? "flex-1" : focusedPanel === "candidate" ? "w-1/3 max-w-[300px] opacity-70 hover:opacity-100" : "w-1/2"}`}>
            <VideoPanel 
              title="AI Coach" 
              isSpeaking={isAISpeaking} 
              isCameraOff={false} 
              initials="AI" 
              isExpanded={focusedPanel === "ai"}
              onExpand={() => setFocusedPanel(p => p === "ai" ? null : "ai")}
            />
          </div>
        </div>
        <div className="md:hidden h-full w-full">
          <VideoPanel title="AI Coach" isSpeaking={isAISpeaking} isCameraOff={false} initials="AI" />
        </div>

        {/* ── ControlBar ONLY (Center Bottom) ── */}
        <div className="absolute bottom-6 left-0 right-0 px-6 z-40 flex flex-col items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-3xl mx-auto">
              <span className="w-4 h-4 flex-shrink-0">!</span>{error}
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
                  {silenceRemaining !== null && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase animate-pulse">
                      Auto-evaluating in ({silenceRemaining}s)
                    </span>
                  )}
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
                <span className="text-sm text-foreground">Evaluating introduction delivery...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Device status chips — above ControlBar */}
          {(audioState === "denied" || videoState === "denied") && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {audioState === "denied" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-amber-500/25 backdrop-blur-sm">
                  <MicOff className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] text-amber-300/90 font-medium">Mic unavailable</span>
                  <button
                    onClick={requestAudio}
                    className="ml-0.5 text-[10px] text-amber-400/80 hover:text-amber-300 underline underline-offset-2 transition-colors"
                  >
                    retry
                  </button>
                </div>
              )}
              {videoState === "denied" && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-amber-500/25 backdrop-blur-sm">
                  <VideoOff className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] text-amber-300/90 font-medium">Camera unavailable</span>
                  <button
                    onClick={requestVideo}
                    className="ml-0.5 text-[10px] text-amber-400/80 hover:text-amber-300 underline underline-offset-2 transition-colors"
                  >
                    retry
                  </button>
                </div>
              )}
            </div>
          )}

          <ControlBar
            onToggleMic={(enabled) => {
              setIsMicOn(enabled);
              toggleAudio(enabled);
            }}
            onToggleCamera={(enabled) => {
              setIsCameraOn(enabled);
              toggleVideo(enabled);
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
      </div>

      {/* Right panel — flex column, no scroll on outer, inner template scrolls */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-card/80 backdrop-blur-xl border-l border-border/50 p-6 flex flex-col z-30 shadow-2xl overflow-hidden">
        <h3 className="font-semibold text-foreground mb-4 text-lg flex-shrink-0">Intro Practice</h3>

        {/* Template card: fills all space between heading and Exit button */}
        {template && !result && (
          <div className="glass-card p-4 rounded-xl border border-border/50 flex flex-col flex-1 min-h-0 mb-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex-shrink-0">Recommended Structure</p>
            <div className="flex-1 overflow-y-auto pr-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{template}</p>
            </div>
          </div>
        )}
        {/* Result card: scrollable, takes all space when template hidden */}
        {result && (() => {
            const scoreNum = result?.score !== undefined ? result.score : result?.total_score !== undefined ? result.total_score : result?.evaluation?.overall_score || 0;
            const hasPassed = scoreNum >= 75;
            const evalData = result?.evaluation || {};
            const strengths = evalData.strengths || [];
            const weaknesses = evalData.weaknesses || [];
            const suggestions = evalData.ai_suggestions || [];
            const improvement = evalData.improvement_areas || [];

          return (
            <div className="flex-1 overflow-y-auto min-h-0 mb-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className={`glass-card p-4 rounded-xl border ${hasPassed ? "border-green-500/30 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]"}`}>
                  
                  {/* Status Badge */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 border ${
                      hasPassed ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}>
                      {hasPassed ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                      {hasPassed ? "COMPLETED & UNLOCKED" : "NEEDS IMPROVEMENT (<75)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/50">
                    <span className="text-xs font-semibold text-foreground">Overall Evaluation Score</span>
                    <span className={`text-2xl font-extrabold ${hasPassed ? "text-green-400" : "text-amber-400"}`}>{scoreNum}<span className="text-sm font-normal text-muted-foreground">/100</span></span>
                  </div>

                  {/* Individual Dimension Scores */}
                  {evalData.scores && (
                    <div className="space-y-2 mb-4">
                      <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">Assessment Dimensions</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(evalData.scores).map(([k, v]) => (
                          <div key={k} className="p-2 rounded-lg bg-white/5 flex justify-between items-center">
                            <span className="text-muted-foreground text-[11px] capitalize truncate mr-1.5">{k.replace(/_/g, " ")}:</span>
                            <span className="font-semibold text-foreground">{Math.round(Number(v))}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback Sections */}
                  {strengths.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-bold text-green-400 flex items-center gap-1">✓ Key Strengths</p>
                      {strengths.map((s: string, i: number) => <p key={i} className="text-xs text-foreground leading-relaxed">• {s}</p>)}
                    </div>
                  )}

                  {weaknesses.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-bold text-amber-400 flex items-center gap-1">⚠️ Areas for Growth</p>
                      {weaknesses.map((w: string, i: number) => <p key={i} className="text-xs text-foreground leading-relaxed">• {w}</p>)}
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-bold text-primary flex items-center gap-1">★ AI Coach Suggestions</p>
                      {suggestions.map((s: string, i: number) => <p key={i} className="text-xs text-foreground leading-relaxed">• {s}</p>)}
                    </div>
                  )}

                  {improvement.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-bold text-blue-400 flex items-center gap-1">⚡ Next Steps to Polish</p>
                      {improvement.map((imp: string, i: number) => <p key={i} className="text-xs text-foreground leading-relaxed">• {imp}</p>)}
                    </div>
                  )}

                  {/* Primary CTA Button */}
                  <div className="mt-6 pt-4 border-t border-border/50">
                    {hasPassed ? (
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => navigate("/interview-select")}
                        className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                      >
                        Start Interviews <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={startRecognition}
                        className="w-full py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                      >
                        Practice Introduction Again <RotateCcw className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>

                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* Empty state */}
        {!result && !template && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
            <Volume2 className="w-8 h-8 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Start recording your introduction to receive AI feedback on your structure, clarity, and delivery.</p>
          </div>
        )}

        {/* Exit Practice — always pinned to bottom */}
        <div className="pt-4 border-t border-border/50 flex-shrink-0">
          <motion.button onClick={() => navigate("/")} className="w-full py-2.5 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 text-sm font-semibold smooth-transition">
            Exit Practice
          </motion.button>
        </div>
      </div>
    </div>
  );
}
