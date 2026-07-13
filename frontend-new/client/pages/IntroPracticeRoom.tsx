import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, ArrowRight, Volume2, Lock, Camera, VideoOff, RotateCcw } from "lucide-react";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { ControlBar } from "@/components/interview/ControlBar";
import { evaluateIntroText, getDynamicTemplate, getIntroHistory } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";
import { useMediaStream } from "@/hooks/useMediaStream";
import { MainLayout } from "@/components/layout/MainLayout";
import { saveRecording, approveRecording } from "@/lib/indexedDB";
import { toast } from "sonner";
// @ts-ignore
import fixWebmDuration from "fix-webm-duration";

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
  const [interimTranscript, setInterimTranscript] = useState("");
  const [messages, setMessages] = useState<{id: string, role: "ai"|"user", text: string}[]>([]);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState("");
  const [template, setTemplate] = useState("");
  const [result, setResult] = useState<any>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [showAutoSubmitModal, setShowAutoSubmitModal] = useState(false);
  const [sessionCheckError, setSessionCheckError] = useState("");

  // Auto-scroll chat
  useEffect(() => {
    const chatContainers = document.querySelectorAll('.chat-scroll-container');
    chatContainers.forEach(container => {
      container.scrollTop = container.scrollHeight;
    });
  }, [messages, transcript, interimTranscript]);

  const transcriptRef = useRef("");
  const interimRef = useRef("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showAutoSubmitModalRef = useRef(false);
  showAutoSubmitModalRef.current = showAutoSubmitModal;
  const hasAskedScreenShareRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingIdRef = useRef<string | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);

  // ── Global Cleanup ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (screenTrackRef.current) {
        try {
          screenTrackRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), role: "ai", text }]);
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

  // ── Pre-session health check ────────────────────────────────────────────────
  const checkSessionReady = async (): Promise<boolean> => {
    try {
      const BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${BASE_URL}/api/candidate/setup-status`, {
        headers: {
          Authorization: `Bearer ${document.cookie.split("wbl_access_token=")[1]?.split(";")[0] || ""}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        setError("Session expired. Please refresh the page and log in again.");
        return false;
      }

      if (!res.ok) {
        setError(`Server error (${res.status}). Please try again in a moment.`);
        return false;
      }

      const data = await res.json();

      if (!data.api_keys_configured) {
        setError(
          "No LLM API key configured. Without it, your speech cannot be evaluated. " +
          "Please go to Settings and add your OpenAI or Gemini API key before starting."
        );
        return false;
      }

      setError("");
      return true;
    } catch (e) {
      // fetch() itself threw — this means the backend is genuinely unreachable
      // (network down, server not running, CORS block, etc.) — NOT an LLM credit issue
      setError(
        "Cannot reach the server. Please check that your internet connection is active " +
        "and the application backend is running."
      );
    }
  };

  const triggerSilenceModal = () => {
    setShowAutoSubmitModal(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.pause();
      } catch (err) {
        console.warn("Failed to pause MediaRecorder:", err);
      }
    }
  };

  const startRecognition = async () => {
    if (recording) return;

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Server reachability + LLM API key check
    // Nothing starts until this passes.
    // ─────────────────────────────────────────────────────────────
    const ready = await checkSessionReady();
    if (!ready) return;

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Browser speech recognition support check
    // ─────────────────────────────────────────────────────────────
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported. Please use Chrome or Edge.");
      return;
    }

    // Hard stop any rogue background instances
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    // Reset state if retrying after a result
    if (result) {
      setResult(null);
      setTranscript("");
      setInterimTranscript("");
      transcriptRef.current = "";
      interimRef.current = "";
      setRecordedVideoUrl(null);
      setMessages([{ role: "ai", id: "welcome", text: "Welcome back! Ready for another try?" }]);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Start speech recognition
    // Screen share + MediaRecorder only start AFTER mic confirms live
    // via rec.onstart — so if mic is denied we don't ask for screen share.
    // ─────────────────────────────────────────────────────────────
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = async () => {
      // ───────────────────────────────────────────────────────────
      // STEP 4: Mic is confirmed live — now start screen share + recorder
      // ───────────────────────────────────────────────────────────
      setRecording(true);

      // 4a. Request or reuse screen share
      let fallbackVideoTrack: MediaStreamTrack | null = null;
      if (screenTrackRef.current && screenTrackRef.current.readyState === "live") {
        fallbackVideoTrack = screenTrackRef.current;
      } else if (!hasAskedScreenShareRef.current) {
        hasAskedScreenShareRef.current = true;
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "browser" } });
          fallbackVideoTrack = screenStream.getVideoTracks()[0];
          screenTrackRef.current = fallbackVideoTrack;
          fallbackVideoTrack.addEventListener("ended", () => {
            screenTrackRef.current = null;
          });
        } catch (err) {
          console.warn("Screen share denied or failed, using black canvas fallback.", err);
          toast.error("Screen recording is recommended. Falling back to black background.", { id: "screen-share-toast" });
        }
      }

      // 4b. Start MediaRecorder
      if (stream && (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive")) {
        recordedChunksRef.current = [];
        recordingIdRef.current = crypto.randomUUID();
        try {
          let finalStream = stream;

          if (fallbackVideoTrack) {
            finalStream = new MediaStream([
              ...stream.getAudioTracks(),
              fallbackVideoTrack
            ]);
            // Stop recording cleanly if the user stops screen sharing from the browser UI
            // @ts-ignore
            if (!fallbackVideoTrack.stopRecognitionAttached) {
              fallbackVideoTrack.addEventListener("ended", () => {
                stopRecognition();
              });
              // @ts-ignore
              fallbackVideoTrack.stopRecognitionAttached = true;
            }
          } else {
            // Fallback: animated black canvas so YouTube gets real video frames
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 480;
            const ctx = canvas.getContext("2d");
            let animationId: number;
            const drawFrame = () => {
              if (ctx) {
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, 640, 480);
                const t = Date.now();
                ctx.fillStyle = "#333333";
                ctx.font = "20px monospace";
                ctx.fillText(new Date(t).toISOString(), 20, 40);
                const x = (t / 5) % 640;
                ctx.fillRect(x, 240, 20, 20);
              }
              animationId = requestAnimationFrame(drawFrame);
            };
            drawFrame();
            const canvasStream = canvas.captureStream(15);
            finalStream = new MediaStream([
              ...stream.getAudioTracks(),
              canvasStream.getVideoTracks()[0]
            ]);
            // Cleanup animation when recorder stops
            const stopCanvasOnEnd = () => cancelAnimationFrame(animationId);
            // attached below after recorder is created
            (window as any).__stopCanvas = stopCanvasOnEnd;
          }

          const mimeType = "video/webm";
          const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined;
          const recorder = new MediaRecorder(finalStream, options);
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          if ((window as any).__stopCanvas) {
            recorder.addEventListener("stop", (window as any).__stopCanvas);
            delete (window as any).__stopCanvas;
          }
          recorder.start(1000);
          recordingStartTimeRef.current = Date.now();
          mediaRecorderRef.current = recorder;
        } catch (err) {
          console.error("MediaRecorder start failed:", err);
          setError("Failed to start video recording. Please check your camera permissions.");
        }
      }

      // 4c. Start silence/auto-submit timer (5 seconds)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        triggerSilenceModal();
      }, 5000);
    };

    rec.onresult = (e: any) => {
      // Ignore results and do not reset timers if the silence modal is already visible
      if (showAutoSubmitModalRef.current) return;

      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      if (final) {
        setTranscript((p) => {
          const newText = p + final;
          transcriptRef.current = newText;
          return newText;
        });
      }
      setInterimTranscript(interim);
      interimRef.current = interim;

      // Reset silence timer on every speech result (5 seconds)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        triggerSilenceModal();
      }, 5000);
    };

    rec.onerror = (e: any) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setRecording(false);
      // Stop any MediaRecorder that may have started
      stopMediaRecording();

      if (e.error === "no-speech") {
        // Non-fatal — user can stay silent, ignore
      } else if (e.error === "audio-capture") {
        setError("No microphone found. Please ensure your microphone is plugged in.");
      } else if (e.error === "not-allowed") {
        setError("Microphone access denied. Please allow it in the browser address bar.");
      } else if (e.error === "network") {
        setError("Network error: Speech recognition requires an internet connection.");
      } else {
        setError(`Speech recognition error: ${e.error}`);
      }
    };

    rec.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setRecording(false);
      stopMediaRecording();
    };

    recognitionRef.current = rec;

    // ─────────────────────────────────────────────────────────────
    // Fire. onstart callback above handles everything downstream.
    // ─────────────────────────────────────────────────────────────
    try {
      rec.start();
    } catch (err) {
      setError("Failed to start microphone. Please check browser permissions.");
      recognitionRef.current = null;
    }
  };


  const stopMediaRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      const id = recordingIdRef.current;
      const duration = Date.now() - recordingStartTimeRef.current;
      mediaRecorderRef.current.onstop = async () => {
        if (!id) return;
        // The blob is guaranteed to be a video since we inject a canvas track if missing
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        try {
          // Fix WebM duration metadata (missing in Chrome MediaRecorder) which causes YouTube to abandon processing
          fixWebmDuration(blob, duration, async (fixedBlob: Blob) => {
            await saveRecording(id, fixedBlob);
            setRecordedVideoUrl(`local:${id}`);
            // Service Worker is NOT notified here; we wait for a successful LLM evaluation before approving the upload.
          });
        } catch (err) {
          console.error("Failed to save recording", err);
        }
      };
      mediaRecorderRef.current.stop();
    }
  };

  const stopRecognition = (delaySeconds = 0, callback?: () => void) => {
    if (isFinalizing) return;
    
    if (delaySeconds > 0) {
      setIsFinalizing(true);
      toast.info("Finalizing transcription... Please wait.", { id: "finalizing", duration: delaySeconds * 1000 });
      setTimeout(() => {
        setIsFinalizing(false);
        toast.dismiss("finalizing");
        executeStop(callback);
      }, delaySeconds * 1000);
    } else {
      executeStop(callback);
    }
  };

  const executeStop = (callback?: () => void) => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setRecording(false);
    stopMediaRecording();
    if (callback) callback();
  };

  const submitAnswer = async (textToSubmit?: string) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    // Append any unfinalized interim text to ensure we don't drop the last sentence
    const finalTranscript = textToSubmit || (transcriptRef.current + " " + interimRef.current).trim();
    
    if (!finalTranscript) {
      setError("Please record your answer using the microphone."); return; }
    if (!sessionId) return;

    // Save user's transcript to chat history
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: finalTranscript.trim() }]);
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";

    setLoading(true);
    setError("");
    const userText = finalTranscript.trim();

    try {
      const introType = sessionStorage.getItem("introType") || "general";
      const jdText = sessionStorage.getItem("jobDescription") || "";
      
      // Determine the final video URL. Prioritize the synchronously generated ID if recording was active.
      const localId = recordingIdRef.current;
      const finalVideoUrl = localId ? `local:${localId}` : recordedVideoUrl;
      
      const res = await evaluateIntroText(sessionId, userText, introType, jdText, finalVideoUrl);
      setResult(res);

      // Now that the evaluation was successful, approve the recording and trigger the Service Worker upload
      if (localId) {
        try {
          await approveRecording(localId);
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'RECORDING_APPROVED' });
          }
        } catch (err) {
          console.error("Failed to approve recording for background upload:", err);
        }
      }

      const score = res.score !== undefined ? res.score : res.evaluation?.overall_score || 0;
      let msg = "";
      if (score >= 75) {
        msg = `Excellent work! You scored ${score} out of 100. Your introduction practice is complete, and technical interviews are now unlocked!`;
      } else {
        msg = `You scored ${score} out of 100. Check the feedback panel for tips on how to improve your delivery and content.`;
      }
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: msg }]);
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

  const handleExit = () => {
    if ((transcript || interimTranscript) && !result) {
      toast.warning("You have unsubmitted practice data", {
        description: "Do you want to submit your recording for AI evaluation, or exit and discard it?",
        duration: 10000,
        action: {
          label: "Submit",
          onClick: () => {
            if (recording && !isFinalizing) {
              stopRecognition(0, () => submitAnswer());
            } else if (!isFinalizing) {
              submitAnswer();
            }
          },
        },
        cancel: {
          label: "Exit Anyway",
          onClick: () => navigate("/"),
        },
      });
    } else {
      navigate("/");
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

  const renderChatOverlay = () => (
    <div className="absolute inset-x-2 bottom-4 top-2 flex flex-col justify-end z-30">
      <div 
        className="chat-scroll-container overflow-y-auto p-2 space-y-4 scrollbar-hide flex flex-col pointer-events-auto max-h-full pb-2"
      >
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex gap-3 max-w-[90%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${msg.role === "ai" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {msg.role === "ai" ? <span className="text-[10px] font-bold">AI</span> : <User className="w-4 h-4" />}
            </div>
            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.role === "ai" ? "bg-card/95 border border-border/50 rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none"}`}>
              {msg.text}
            </div>
          </motion.div>
        ))}

        <AnimatePresence>
          {(transcript || interimTranscript || recording) && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex gap-3 max-w-[90%] ml-auto flex-row-reverse"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary text-secondary-foreground shadow-lg">
                <User className="w-4 h-4" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed bg-primary/90 text-primary-foreground shadow-lg rounded-tr-none min-w-[60px] relative">
                {transcript}
                <span className="opacity-70 italic ml-1">{interimTranscript}</span>
                {recording && !transcript && !interimTranscript && (
                  <span className="flex items-center gap-1 h-5">
                    <span className="w-1.5 h-1.5 bg-primary-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {loading && !transcript && !interimTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 max-w-[90%] mr-auto"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground shadow-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed bg-card/95 shadow-lg border border-border/50 rounded-tl-none text-muted-foreground flex items-center gap-2">
                Evaluating introduction delivery...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderAICoachPane = () => (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-card to-secondary/5" />
      <div className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">AI Coach</span>
          {isAISpeaking && (
            <div className="flex gap-1 ml-2">
              {[0, 1, 2].map((idx) => (
                <motion.div
                  key={idx}
                  className="w-1 h-3 rounded-full bg-primary"
                  animate={{ height: ["4px", "12px", "4px"] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: idx * 0.1 }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setFocusedPanel(p => p === "ai" ? null : "ai")}
            className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
          >
            {focusedPanel === "ai" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            )}
          </motion.button>
        </div>
      </div>
      <div className="relative z-10 flex-1 overflow-hidden">
        {renderChatOverlay()}
      </div>
    </>
  );

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-background via-card/30 to-background overflow-hidden flex">

      {/* ── Auto-Submit Modal ── */}
      <AnimatePresence>
        {showAutoSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="glass-card p-8 rounded-2xl border border-border/50 shadow-2xl max-w-sm w-full mx-4 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏱️</span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Silence Detected</h3>
              <p className="text-sm text-muted-foreground mb-6">It looks like you've stopped speaking. Would you like to submit your answer for evaluation?</p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowAutoSubmitModal(false);
                    // Resume MediaRecorder to continue recording
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
                      try {
                        mediaRecorderRef.current.resume();
                      } catch (err) {
                        console.warn("Failed to resume MediaRecorder:", err);
                      }
                    }
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                    // Give 5 more seconds before showing silence warning again
                    silenceTimerRef.current = setTimeout(() => triggerSilenceModal(), 5000);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-white/5 text-sm font-semibold transition-all"
                >
                  Keep Going
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowAutoSubmitModal(false);
                    // Resume MediaRecorder so it has a clean state to stop
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
                      try {
                        mediaRecorderRef.current.resume();
                      } catch (err) {
                        console.warn("Failed to resume MediaRecorder before submission:", err);
                      }
                    }
                    if (recording) stopRecognition(0, () => submitAnswer());
                    else submitAnswer();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-[0_0_15px_rgba(124,58,237,0.4)] hover:shadow-[0_0_20px_rgba(124,58,237,0.6)] transition-all"
                >
                  Submit Answer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className={`transition-all duration-500 ease-in-out flex flex-col relative overflow-hidden rounded-2xl border-2 ${isAISpeaking ? "border-primary/50 shadow-2xl shadow-primary/30" : "border-border/30"} bg-card ${focusedPanel === "ai" ? "flex-1" : focusedPanel === "candidate" ? "w-1/3 max-w-[300px] opacity-70 hover:opacity-100" : "w-1/2"}`}>
            {renderAICoachPane()}
          </div>
        </div>
        <div className={`md:hidden h-full w-full flex flex-col relative overflow-hidden rounded-2xl border-2 ${isAISpeaking ? "border-primary/50 shadow-2xl shadow-primary/30" : "border-border/30"} bg-card`}>
          {renderAICoachPane()}
        </div>

        {/* ── ControlBar ONLY (Center Bottom) ── */}
        <div className="absolute bottom-6 left-0 right-0 px-6 z-40 flex flex-col items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-3xl mx-auto">
              <span className="w-4 h-4 flex-shrink-0">!</span>{error}
            </div>
          )}

          {/* Chat Interface removed from here - now inside AI Coach Panel */}

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
            onRecordToggle={() => {
              if (isFinalizing) return;
              if (recording) stopRecognition(6);
              else startRecognition();
            }}
            isRecording={recording || isFinalizing}
            isAudioDenied={audioState === "denied"}
            isVideoDenied={videoState === "denied"}
            onRetryAudio={requestAudio}
            onRetryVideo={requestVideo}
            wrapperClassName="relative"
            onSubmit={(!result && !loading && !isFinalizing) ? () => {
              if (recording) stopRecognition(0, () => submitAnswer());
              else submitAnswer();
            } : undefined}
            onRetry={(!result && !loading) ? startRecognition : undefined}
            hasTranscript={!!transcript}
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
                      <p className="text-xs font-bold text-green-400 flex items-center gap-1">✔ Key Strengths</p>
                      {strengths.map((s: string, i: number) => <p key={i} className="text-xs text-foreground leading-relaxed">• {s}</p>)}
                    </div>
                  )}

                  {weaknesses.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-bold text-amber-400 flex items-center gap-1">⚠ Areas for Growth</p>
                      {weaknesses.map((w: string, i: number) => <p key={i} className="text-xs text-foreground leading-relaxed">• {w}</p>)}
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-bold text-primary flex items-center gap-1">✨ AI Coach Suggestions</p>
                      {suggestions.map((s: string, i: number) => <p key={i} className="text-xs text-foreground leading-relaxed">• {s}</p>)}
                    </div>
                  )}

                  {improvement.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-bold text-blue-400 flex items-center gap-1">💡 Next Steps to Polish</p>
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
          <motion.button onClick={handleExit} className="w-full py-2.5 rounded-lg bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 text-sm font-semibold smooth-transition">
            Exit Practice
          </motion.button>
        </div>
      </div>
    </div>
  );
}