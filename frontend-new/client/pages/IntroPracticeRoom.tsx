import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, ArrowRight, Volume2, Lock, Camera, VideoOff, RotateCcw, Zap, Sparkles } from "lucide-react";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { ControlBar } from "@/components/interview/ControlBar";
import { EvaluationLoadingScreen } from "@/components/interview/EvaluationLoadingScreen";
import { evaluateIntro, evaluateIntroText, getDynamicTemplate, getResumeSummary } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";
import { useMediaStream } from "@/hooks/useMediaStream";
import { AssessmentConsentModal } from "@/components/interview/AssessmentConsentModal";
import { saveRecording, approveRecording } from "@/lib/indexedDB";
import { toast } from "sonner";
import type { VisionResults } from "@/lib/huggingFaceVision";
import fixWebmDuration from "fix-webm-duration";
import { useVisionSessionAnalytics } from "@/hooks/useVisionSessionAnalytics";

export default function IntroPracticeRoom() {
  const navigate = useNavigate();
  const { sessionId, candidateName, initials } = useAuth();
  const { pipeline, loading: pipelineLoading } = usePipeline();

  const interviewMode = sessionStorage.getItem("interviewMode") || "video";
  const isAudioOnly = interviewMode === "audio";

  const [isMicOn, setIsMicOn] = useState(!isAudioOnly);
  const [isCameraOn, setIsCameraOn] = useState(!isAudioOnly);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<"candidate" | "ai" | null>(null);

  // Media permissions & streams
  const {
    stream, audioError, videoError, audioState, videoState,
    requestAudio, requestVideo, toggleVideo, toggleAudio, isSpeaking: isCandidateSpeaking
  } = useMediaStream(true, !isAudioOnly);


  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [messages, setMessages] = useState<{id: string, role: "ai"|"user", text: string}[]>([]);
  const [recording, setRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { recordVisionResults, getVisionSummary, showLookAwayWarning } = useVisionSessionAnalytics({ enabled: recording && !isPaused });

  const togglePause = () => {
    if (!recording) return;
    if (isPaused) {
      // Resume
      setIsPaused(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    } else {
      // Pause
      setIsPaused(true);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    }
  };

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
  const isFinalizingRef = useRef(false);
  isFinalizingRef.current = isFinalizing;
  const recordingRef = useRef(false);
  recordingRef.current = recording;
  const hasAskedScreenShareRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
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
      if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
        audioRecorderRef.current.stop();
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

  const [showConsentModal, setShowConsentModal] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const hasSpokenWelcomeRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    getDynamicTemplate(sessionId).then((d) => {
      setTemplate(d.template || d.script || "");
    }).catch(() => {});
  }, [sessionId]);

  // ── Pre-session health check ────────────────────────────────────────────────
  const checkSessionReady = async (): Promise<boolean> => {
    try {
      if (!sessionId) return false;
      const data = await getResumeSummary(sessionId);

      if (!data.has_api_key) {
        setError(
          "No LLM API key configured. Without it, your speech cannot be evaluated. " +
          "Please go to Settings and add your OpenAI or Gemini API key before starting."
        );
        return false;
      }
      setError("");
      return true;
    } catch (e: any) {
      if (e?.message === "Unauthorized") {
        setError("Session expired. Please refresh the page and log in again.");
      } else {
        setError(`Server error. Please try again in a moment.`);
      }
      return false;
    }
  };

  // Hardware-based silence detection as a fallback
  useEffect(() => {
    if (!recording) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      return;
    }

    if (isCandidateSpeaking) {
      // User is actively making noise, reset timer immediately.
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    } else {
      // User stopped making noise. Start the countdown.
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (!showAutoSubmitModalRef.current && !isFinalizingRef.current) {
          triggerSilenceModal();
        }
      }, 45000); // 45 seconds of pure hardware silence
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [recording, isCandidateSpeaking]);

  const triggerSilenceModal = () => {
    if (isFinalizing) return;
    // We intentionally DO NOT pause the MediaRecorder here to avoid WebM blob corruption or race conditions.
    // The user can keep speaking (recorded in background) while deciding, ensuring no audio is lost.
    setShowAutoSubmitModal(true);
  };

  const stopMediaRecording = (): Promise<{ videoBlob: Blob | null; audioBlob: Blob | null }> => {
    return new Promise((resolve) => {
      let videoBlob: Blob | null = null;
      let audioBlob: Blob | null = null;

      let videoStopped = false;
      let audioStopped = false;

      const checkDone = () => {
        if (videoStopped && audioStopped) {
          resolve({ videoBlob, audioBlob });
        }
      };

      // 1. Stop video recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        const id = recordingIdRef.current;
        const duration = Date.now() - recordingStartTimeRef.current;
        mediaRecorderRef.current.onstop = async () => {
          if (!id) {
            videoStopped = true;
            checkDone();
            return;
          }
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          if (duration < 3000) {
            // Skip fixing duration for short recordings to prevent corrupt WebM file metadata
            await saveRecording(id, blob);
            setRecordedVideoUrl(`local:${id}`);
            videoBlob = blob;
            videoStopped = true;
            checkDone();
            return;
          }

          let resolved = false;
          const handleVideoResolved = (finalBlob: Blob) => {
            if (resolved) return;
            resolved = true;
            videoBlob = finalBlob;
            videoStopped = true;
            checkDone();
          };

          // Safety timeout: if duration fixing takes > 2000ms, resolve with original blob
          const safetyTimeout = setTimeout(() => {
            console.warn("fixWebmDuration timed out, resolving with original blob");
            saveRecording(id, blob).catch(e => console.error(e));
            setRecordedVideoUrl(`local:${id}`);
            handleVideoResolved(blob);
          }, 2000);

          try {
            fixWebmDuration(blob, duration, async (fixedBlob: Blob) => {
              clearTimeout(safetyTimeout);
              if (!resolved) {
                await saveRecording(id, fixedBlob);
                setRecordedVideoUrl(`local:${id}`);
                handleVideoResolved(fixedBlob);
              }
            });
          } catch (err) {
            clearTimeout(safetyTimeout);
            console.error("Failed to fix blob duration", err);
            handleVideoResolved(blob);
          }
        };
        mediaRecorderRef.current.stop();
      } else {
        videoStopped = true;
      }

      // 2. Stop audio recorder
      if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
        audioRecorderRef.current.onstop = () => {
          audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioStopped = true;
          checkDone();
        };
        audioRecorderRef.current.stop();
      } else {
        audioStopped = true;
      }

      checkDone();
    });
  };

  const stopRecognition = (delaySeconds = 0, callback?: (videoBlob?: Blob | null, audioBlob?: Blob | null) => void) => {
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

  const executeStop = async (callback?: (videoBlob?: Blob | null, audioBlob?: Blob | null) => void) => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setRecording(false);
    const { videoBlob, audioBlob } = await stopMediaRecording();
    if (callback) callback(videoBlob, audioBlob);
  };

  const submitAnswer = async (videoBlob?: Blob | null, audioBlob?: Blob | null) => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    setLoading(true);
    setError("");

    try {
      let finalBlob = videoBlob;
      // Fallback: If for some reason videoBlob wasn't passed down, reconstruct it from chunks
      if (!finalBlob && recordedChunksRef.current && recordedChunksRef.current.length > 0) {
        finalBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      }

      if (!finalBlob) {
        throw new Error("No audio/video recorded. Please check your microphone permissions and try again.");
      }

      const introType = sessionStorage.getItem("introType") || "general";
      const jdText = sessionStorage.getItem("jobDescription") || "";
      
      // Submit the lightweight audio-only WebM blob to the backend Whisper evaluator
      // fallback to the full videoWebm blob only if audio-only blob is not present
      const uploadBlob = audioBlob || finalBlob;
      const localId = recordingIdRef.current || "";
      const res = await evaluateIntro(sessionId, uploadBlob, introType, jdText, JSON.stringify(getVisionSummary()), localId, interviewMode);
      setResult(res);

      if (localId && res && res.id) {
        try {
          await approveRecording(localId, res.id);
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'RECORDING_APPROVED' });
          }
        } catch (err) {
          console.error("Failed to approve recording for background upload:", err);
        }
      }

      const score = res.score !== undefined ? res.score : res.evaluation?.overall_score || 0;
      let msg = score >= 75 ? `Excellent work! You scored ${score} out of 100.` : `You scored ${score} out of 100.`;
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", text: msg }]);

      if (res.transcript) {
        setTranscript(res.transcript);
        setInterimTranscript("");
      }

      navigate("/intro-result", { state: { result: res }, replace: true });
    } catch (e: any) {
      let errorMsg = "An unexpected error occurred.";
      if (e instanceof Error) {
        if (e.message === "Unauthorized") errorMsg = "Session expired. Please log in again.";
        else errorMsg = e.message;
      } else if (typeof e === "string") {
        errorMsg = e;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    // 1. Reset loading/finalizing states
    setLoading(false);
    setIsFinalizing(false);

    // 2. Stop speech recognition if running
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    // 3. Stop media recorders if running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
      try { audioRecorderRef.current.stop(); } catch (e) {}
    }

    // 4. Clear audio buffers
    recordedChunksRef.current = [];
    audioChunksRef.current = [];
    recordingIdRef.current = null;

    // 5. Reset recording/preview state
    setRecording(false);
    setResult(null);
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";
    interimRef.current = "";
    setRecordedVideoUrl(null);
    setError("");

    // 6. Reset welcome message
    setMessages([{ role: "ai", id: "welcome", text: "Welcome back! Ready for another try?" }]);
  };

  const startRecognition = async () => {
    if (recording) return;

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Server reachability + LLM API key check
    // ─────────────────────────────────────────────────────────────
    const ready = await checkSessionReady();
    if (!ready) return;

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Request screen share (Video Mode only)
    // ─────────────────────────────────────────────────────────────
    let activeVideoTrack: MediaStreamTrack | null = null;
    if (isAudioOnly) {
      // Audio-only mode does not ask for screen share or record video tracks
      activeVideoTrack = null;
    } else if (screenTrackRef.current && screenTrackRef.current.readyState === "live") {
      activeVideoTrack = screenTrackRef.current;
    } else if (!hasAskedScreenShareRef.current) {
      hasAskedScreenShareRef.current = true;
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: "browser" } });
        activeVideoTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = activeVideoTrack;
        activeVideoTrack.addEventListener("ended", () => {
          screenTrackRef.current = null;
        });
      } catch (err) {
        console.warn("Screen share denied or failed, using black canvas fallback.", err);
        toast.error("Screen recording is recommended. Falling back to black background.", { id: "screen-share-toast" });
      }
    } else {
      activeVideoTrack = screenTrackRef.current;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Browser speech recognition support check
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

    // Ensure microphone audio track is enabled on start
    if (!isMicOn) {
      setIsMicOn(true);
      toggleAudio(true);
    }
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = true; });
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = async () => {
      // ───────────────────────────────────────────────────────────
      // STEP 4: Mic is confirmed live — now start recorder & speak greeting
      // ───────────────────────────────────────────────────────────
      setRecording(true);
      setSessionStarted(true);

      if (!hasSpokenWelcomeRef.current) {
        hasSpokenWelcomeRef.current = true;
        speak("Welcome to your introduction practice. Whenever you're ready, tell me about yourself and your background.");
      }
      
      const currentVideoTrack = screenTrackRef.current;

      // Start MediaRecorder
      if (stream && (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive")) {
        recordedChunksRef.current = [];
        recordingIdRef.current = crypto.randomUUID();
        try {
          let finalStream = stream;
          const webcamTrack = stream.getVideoTracks()[0];

          // Start parallel audio-only recorder for backend Whisper to avoid network lag
          const audioStream = new MediaStream(stream.getAudioTracks());
          const audioOptions = { mimeType: "audio/webm" };
          try {
            const audioRecorder = new MediaRecorder(audioStream, audioOptions);
            audioChunksRef.current = [];
            audioRecorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            audioRecorder.start();
            audioRecorderRef.current = audioRecorder;
          } catch (audioErr) {
            console.warn("Failed to start audio-only recorder, will fallback to extracting audio from video blob", audioErr);
            audioRecorderRef.current = null;
          }

          if (currentVideoTrack) {
            finalStream = new MediaStream([
              ...stream.getAudioTracks(),
              currentVideoTrack
            ]);
            // Stop recording cleanly if the user stops screen sharing from the browser UI
            // @ts-ignore
            if (!currentVideoTrack.stopRecognitionAttached) {
              currentVideoTrack.addEventListener("ended", () => {
                stopRecognition();
              });
              // @ts-ignore
              currentVideoTrack.stopRecognitionAttached = true;
            }
          } else if (webcamTrack && webcamTrack.readyState === "live") {
            // Use hardware webcam video track directly — hardware stream, no CPU throttling!
            finalStream = new MediaStream([
              ...stream.getAudioTracks(),
              webcamTrack
            ]);
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
          recorder.start();
          recordingStartTimeRef.current = Date.now();
          mediaRecorderRef.current = recorder;
        } catch (err) {
          console.error("MediaRecorder start failed:", err);
          setError("Failed to start video recording. Please check your camera permissions.");
        }
      }
    };

    rec.onresult = (e: any) => {
      // If speech is detected while the silence warning is visible, automatically dismiss it
      if (showAutoSubmitModalRef.current) {
        setShowAutoSubmitModal(false);
      }

      // Reset the silence timer if the speech recognition engine detects speech
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (!showAutoSubmitModalRef.current && !isFinalizingRef.current) {
          triggerSilenceModal();
        }
      }, 45000); // 45 seconds of silence before warning, giving the candidate ample time to think

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
    };

    rec.onerror = (e: any) => {
      console.warn("Speech recognition error:", e.error);
      
      // We NEVER stop the MediaRecorder or end the user's practice session due to browser SpeechRecognition errors.
      // SpeechRecognition is a local UI enhancement; the actual evaluation relies on backend Whisper transcribing the recorded audio.
      if (e.error === "not-allowed") {
        setError("Microphone access denied. Please allow it in the browser address bar.");
        // True fatal microphone access error — stop everything
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setRecording(false);
        stopMediaRecording();
      } else if (e.error === "audio-capture") {
        setError("No microphone found. Please ensure your microphone is plugged in.");
        // True fatal microphone capture error — stop everything
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setRecording(false);
        stopMediaRecording();
      } else {
        // Other errors (e.g. aborted, no-speech, network) are non-fatal to the video recording.
        // We do not stop the MediaRecorder. The user's audio is still being captured.
        console.log(`Non-fatal Speech recognition error: ${e.error}`);
      }
    };

    rec.onend = () => {
      // If we are finalizing the submission or recording has been stopped, let it die gracefully.
      if (isFinalizingRef.current || !recordingRef.current) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setRecording(false);
      } else {
        // Auto-restart to prevent Chrome from dropping speech buffers
        if (interimRef.current) {
           setTranscript((p) => {
             const newText = p + interimRef.current + " ";
             transcriptRef.current = newText;
             return newText;
           });
           setInterimTranscript("");
           interimRef.current = "";
        }
        
        // Debounce restart by 50ms to let the browser release the mic lock, with a 500ms backup retry
        setTimeout(() => {
          try {
            if (recordingRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (e) {
            console.warn("Speech recognition auto-restart failed, retrying in 500ms...", e);
            setTimeout(() => {
              try {
                if (recordingRef.current && recognitionRef.current) {
                  recognitionRef.current.start();
                }
              } catch (retryErr) {
                console.error("Speech recognition backup auto-restart failed:", retryErr);
              }
            }, 500);
          }
        }, 50);
      }
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
        </AnimatePresence>
      </div>
    </div>
  );

  const renderAICoachPane = () => (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-card to-secondary/5" />
      <div className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Interviewer</span>
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

      <EvaluationLoadingScreen isVisible={loading || isFinalizing} />

      {/* Pre-session Assessment Permission & Consent Modal */}
      <AnimatePresence>
        {showConsentModal && (
          <AssessmentConsentModal
            mode={isAudioOnly ? "audio" : "video"}
            title="Intro Practice Verification & Consent"
            onConsentGranted={() => setShowConsentModal(false)}
            onCancel={() => navigate("/intro-select")}
          />
        )}
      </AnimatePresence>

      {/* Top Left Header Controls */}
      <div className="absolute top-6 left-6 z-50 flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExit}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20 border border-primary/30 text-xs font-bold transition-all cursor-pointer hover:shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          <span>Back to Home</span>
        </motion.button>
        <span className="text-muted-foreground/50 text-sm font-semibold">|</span>
        <h3 className="font-bold text-foreground text-lg tracking-tight">
          Intro Practice
        </h3>
      </div>

      {/* Vision Warning Popup (Video Mode only) */}
      <AnimatePresence>
        {!isAudioOnly && showLookAwayWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="absolute top-6 left-1/2 z-50 bg-amber-500/90 text-white px-6 py-3 rounded-full shadow-lg border border-amber-400 font-medium flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            Please look into the camera.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Video Grid */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative transition-all w-full mt-4 pb-20">
        <div className="hidden md:flex gap-6 w-full h-full max-h-[calc(100vh-160px)]">
          {/* Candidate Panel container with inline bottom Google Meet style control overlay */}
          <div className={`relative transition-all duration-500 ease-in-out ${focusedPanel === "candidate" ? "flex-1" : focusedPanel === "ai" ? "w-1/3 max-w-[300px] opacity-70 hover:opacity-100" : "w-1/2"}`}>
            <VideoPanel 
              title={candidateName} 
              isMuted={!isMicOn} 
              isCameraOff={!isCameraOn} 
              hideCamera={isAudioOnly}
              initials={initials} 
              isCandidate={true} 
              isSpeaking={isCandidateSpeaking && recording}
              isExpanded={focusedPanel === "candidate"}
              onExpand={() => setFocusedPanel(p => p === "candidate" ? null : "candidate")}
              mediaStream={stream}
              enableVision={!isAudioOnly && isCameraOn}
              onVisionResults={recordVisionResults}
            />

            {/* Bottom-anchored Controls directly inside Candidate Video box (Google Meet Style) */}
            <div className="absolute bottom-4 left-0 right-0 z-30 flex flex-col items-center gap-2 px-4 pointer-events-auto">
              {/* Device status chips */}
              {(audioState === "denied" || (!isAudioOnly && videoState === "denied")) && (
                <div className="flex items-center justify-center gap-2 flex-wrap mb-1">
                  {audioState === "denied" && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/90 border border-amber-500/30 backdrop-blur-md">
                      <MicOff className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-amber-300 font-medium">Mic unavailable</span>
                      <button onClick={requestAudio} className="ml-0.5 text-[10px] text-amber-400 underline transition-colors">retry</button>
                    </div>
                  )}
                  {!isAudioOnly && videoState === "denied" && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/90 border border-amber-500/30 backdrop-blur-md">
                      <VideoOff className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-amber-300 font-medium">Camera unavailable</span>
                      <button onClick={requestVideo} className="ml-0.5 text-[10px] text-amber-400 underline transition-colors">retry</button>
                    </div>
                  )}
                </div>
              )}

              <ControlBar
                hideCamera={isAudioOnly}
                onToggleMic={(enabled) => {
                  setIsMicOn(enabled);
                  toggleAudio(enabled);
                }}
                onToggleCamera={(enabled) => {
                  setIsCameraOn(enabled);
                  toggleVideo(enabled);
                }}
                onRecordToggle={(!result && !loading && !isFinalizing) ? () => {
                  if (recording) {
                    setIsPaused(false);
                    stopRecognition();
                  } else {
                    setIsPaused(false);
                    startRecognition();
                  }
                } : undefined}
                onPauseToggle={togglePause}
                isRecording={recording || isFinalizing}
                isPaused={isPaused}
                onSubmit={(!loading && !isFinalizing && (recording || transcript)) ? () => {
                  stopRecognition(0, (blob) => submitAnswer(blob));
                } : undefined}
                isAudioDenied={audioState === "denied"}
                isVideoDenied={!isAudioOnly && videoState === "denied"}
                onRetryAudio={requestAudio}
                onRetryVideo={requestVideo}
                wrapperClassName="relative"
                hasAttempt={!!result}
                onRetry={(!loading && !isFinalizing) ? handleRetry : undefined}
                hasTranscript={!!transcript}
                mediaStream={stream}
              />
            </div>
          </div>

          <div className={`transition-all duration-500 ease-in-out flex flex-col relative overflow-hidden rounded-2xl border-2 ${isAISpeaking ? "border-primary/50 shadow-2xl shadow-primary/30" : "border-border/30"} bg-card ${focusedPanel === "ai" ? "flex-1" : focusedPanel === "candidate" ? "w-1/3 max-w-[300px] opacity-70 hover:opacity-100" : "w-1/2"}`}>
            {renderAICoachPane()}
          </div>
        </div>
        <div className={`md:hidden h-full w-full flex flex-col relative overflow-hidden rounded-2xl border-2 ${isAISpeaking ? "border-primary/50 shadow-2xl shadow-primary/30" : "border-border/30"} bg-card`}>
          {renderAICoachPane()}
        </div>

        {/* Floating alerts / notifications */}
        <div className="absolute top-2 left-0 right-0 px-6 z-40 flex flex-col items-center gap-2 pointer-events-none">
          <AnimatePresence>
            {!sessionStarted && !recording && !showConsentModal && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary/20 border border-primary/40 backdrop-blur-md shadow-lg pointer-events-auto"
              >
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  Ready to practice? Click <strong className="text-primary font-bold">"Start Session"</strong> below to begin.
                </span>
                <button
                  onClick={() => startRecognition()}
                  className="ml-2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer"
                >
                  Start Session
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-3xl mx-auto pointer-events-auto">
              <span className="w-4 h-4 flex-shrink-0">!</span>{error}
            </div>
          )}

          {/* ── Small Silence Popup ── */}
          <AnimatePresence>
            {showAutoSubmitModal && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="flex items-center gap-4 px-4 py-3 rounded-full bg-card/90 border border-amber-500/20 backdrop-blur-md shadow-xl pointer-events-auto"
              >
                <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Silence detected. Still there?
                </div>
                <div className="flex items-center gap-1.5 pl-3 border-l border-border/50">
                  <button
                    onClick={() => {
                      setShowAutoSubmitModal(false);
                      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                      silenceTimerRef.current = setTimeout(() => triggerSilenceModal(), 15000);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Keep Going
                  </button>
                  <button
                    onClick={() => {
                      setShowAutoSubmitModal(false);
                      if (recording) stopRecognition(0, (blob) => submitAnswer(blob));
                      else submitAnswer();
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-sm hover:shadow-md transition-all"
                  >
                    Submit
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
