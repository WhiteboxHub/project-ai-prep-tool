import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, ArrowRight, Volume2, Lock, Camera, VideoOff } from "lucide-react";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { ControlBar } from "@/components/interview/ControlBar";
import { evaluateIntroText, getDynamicTemplate, getIntroHistory } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";
import { useMediaStream } from "@/hooks/useMediaStream";
import { MainLayout } from "@/components/layout/MainLayout";

export default function IntroPracticeRoom() {
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const { pipeline, loading: pipelineLoading } = usePipeline();

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<"candidate" | "ai" | null>(null);

  // Media permissions & streams
  const {
    stream, audioError, videoError, audioState, videoState,
    requestAudio, requestVideo, toggleVideo, toggleAudio
  } = useMediaStream(true);

  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState("");
  const [result, setResult] = useState<any>(null);

  const transcriptRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Global Cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
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
    };
    rec.onerror = () => {
      setRecording(false);
      if (transcriptRef.current.trim()) submitAnswer(transcriptRef.current.trim());
    };
    rec.onend = () => {
      setRecording(false);
      if (transcriptRef.current.trim()) submitAnswer(transcriptRef.current.trim());
    };
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    setTranscript("");
    transcriptRef.current = "";
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const submitAnswer = async (textToSubmit?: string) => {
    const finalTranscript = textToSubmit || transcriptRef.current;
    if (!finalTranscript.trim()) { setError("Please record your answer using the microphone."); return; }
    if (!sessionId) return;

    setLoading(true);
    setError("");
    const userText = finalTranscript.trim();
    setTranscript("");
    transcriptRef.current = "";

    try {
      const res = await evaluateIntroText(sessionId, userText);
      setResult(res);
      const score = res.score || res.total_score || 0;
      const msg = `Great job! Your introduction scored ${score} out of 100. Let's look at the feedback on the right.`;
      speak(msg);
    } catch (e: any) {
      setError(e.message || "Evaluation failed. Please try again.");
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

      {/* Left side: Video Panels */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative transition-all mr-80">
        <div className="hidden md:flex gap-4 w-full max-w-5xl h-full max-h-[calc(100vh-180px)]">
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
              title="AI Coach" 
              isAISpeaking={isAISpeaking} 
              isCameraOff={false} 
              initials="AI" 
              isExpanded={focusedPanel === "ai"}
              onExpand={() => setFocusedPanel(p => p === "ai" ? null : "ai")}
            />
          </div>
        </div>
        <div className="md:hidden h-full w-full">
          <VideoPanel title="AI Coach" isAISpeaking={isAISpeaking} isCameraOff={false} initials="AI" />
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
      </div>

      {/* Right side: Simple Intro Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-card/80 backdrop-blur-xl border-l border-border/50 p-6 flex flex-col z-30 shadow-2xl">
        <h3 className="font-semibold text-foreground mb-6 text-lg">Intro Practice</h3>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {template && (
             <div className="glass-card p-4 rounded-xl border border-border/50">
               <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Recommended Structure</p>
               <p className="text-sm text-muted-foreground leading-relaxed">{template}</p>
             </div>
          )}

          {result && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="glass-card p-4 rounded-xl border border-green-500/30 bg-green-500/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-green-400" /> Score
                    </span>
                    <span className="text-lg font-bold text-primary">{result.score || result.total_score}/100</span>
                  </div>
                  {result.feedback && (
                    <div className="space-y-1 mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-semibold text-foreground mb-2">Feedback</p>
                      {(Array.isArray(result.feedback) ? result.feedback : [result.feedback]).map((f: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">• {f}</p>
                      ))}
                    </div>
                  )}
                </div>
             </motion.div>
          )}

          {!result && !template && (
            <div className="text-center py-10 space-y-3">
               <Volume2 className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
               <p className="text-sm text-muted-foreground">Start recording your introduction to receive AI feedback on your structure, clarity, and delivery.</p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border/50">
           <motion.button onClick={() => navigate("/")} className="w-full py-2.5 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 text-sm font-semibold smooth-transition">
             Exit Practice
           </motion.button>
        </div>
      </div>
    </div>
  );
}
