import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Mic } from "lucide-react";
import { VideoPanel } from "@/components/interview/VideoPanel";
import { saveRecording } from "@/lib/indexedDB";
import { toast } from "sonner";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import type { VisionResults } from "@/lib/huggingFaceVision";
import fixWebmDuration from "fix-webm-duration";

interface IntroPhaseRecordingProps {
  stream: MediaStream | null;
  isAudioOnly: boolean;
  candidateName: string;
  initials: string;
  isCandidateSpeaking: boolean;
  onVisionResults: (results: VisionResults, width?: number, height?: number) => void;
  coachingMessage?: string | null;
  onFinish: (recordingId: string, videoBlob: Blob | null, audioBlob: Blob | null, transcript: string) => void;
}

export function IntroPhaseRecording({
  stream,
  isAudioOnly,
  candidateName,
  initials,
  isCandidateSpeaking,
  onVisionResults,
  coachingMessage,
  onFinish,
}: IntroPhaseRecordingProps) {
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [stopping, setStopping] = useState(false);
  const [silenceWarning, setSilenceWarning] = useState(false);
  const audioLevels = useAudioVisualizer(stream, 7);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingIdRef = useRef<string>(crypto.randomUUID());
  const startTimeRef = useRef<number>(Date.now());
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const interimRef = useRef("");
  const isStoppingRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play a subtle beep on mount
  useEffect(() => {
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Ignore if audio context fails
    }
  }, []);

  // Show prominent start banner for 8 seconds
  const [showStartBanner, setShowStartBanner] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowStartBanner(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Start MediaRecorder (webcam only — no screen share)
  useEffect(() => {
    if (!stream) return;
    startTimeRef.current = Date.now();
    recordedChunksRef.current = [];
    audioChunksRef.current = [];

    // Audio-only recorder
    try {
      const audioStream = new MediaStream(stream.getAudioTracks());
      const audioRec = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
      audioRec.ondataavailable = e => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      audioRec.start();
      audioRecorderRef.current = audioRec;
    } catch (e) {
      console.warn("audio-only recorder failed", e);
    }

    // Video recorder: webcam track directly
    try {
      const webcamTrack = stream.getVideoTracks()[0];
      let finalStream: MediaStream;

      if (!isAudioOnly && webcamTrack && webcamTrack.readyState === "live") {
        finalStream = new MediaStream([...stream.getAudioTracks(), webcamTrack]);
      } else {
        // Audio-only: animated canvas
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext("2d");
        let animId: number;
        const draw = () => {
          if (ctx) { ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, 640, 480); }
          animId = requestAnimationFrame(draw);
        };
        draw();
        const cs = canvas.captureStream(15);
        finalStream = new MediaStream([...stream.getAudioTracks(), cs.getVideoTracks()[0]]);
        (window as any).__stopCanvas = () => cancelAnimationFrame(animId);
      }

      const mimeType = "video/webm";
      const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined;
      const recorder = new MediaRecorder(finalStream, options);
      recorder.ondataavailable = e => { if (e.data?.size > 0) recordedChunksRef.current.push(e.data); };
      if ((window as any).__stopCanvas) {
        recorder.addEventListener("stop", (window as any).__stopCanvas);
        delete (window as any).__stopCanvas;
      }
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error("MediaRecorder failed", err);
      toast.error("Could not start recording. Please check your camera permissions.");
    }

    return () => {
      // Cleanup handled in handleFinish
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: any) => {
      setSilenceWarning(false);
      resetSilenceTimer();
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      if (final) {
        setTranscript(p => { const n = p + final; transcriptRef.current = n; return n; });
      }
      setInterimTranscript(interim);
      interimRef.current = interim;
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "audio-capture") return;
    };

    rec.onend = () => {
      if (!isStoppingRef.current && recognitionRef.current) {
        if (interimRef.current) {
          setTranscript(p => { const n = p + interimRef.current + " "; transcriptRef.current = n; return n; });
          setInterimTranscript("");
          interimRef.current = "";
        }
        setTimeout(() => {
          try { if (recognitionRef.current) recognitionRef.current.start(); } catch {}
        }, 50);
      }
    };

    recognitionRef.current = rec;
    try { rec.start(); } catch {}

    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silence detection (45s)
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => setSilenceWarning(true), 45000);
  }, []);

  useEffect(() => {
    resetSilenceTimer();
    return () => { if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current); };
  }, [resetSilenceTimer]);

  useEffect(() => {
    if (isCandidateSpeaking) {
      setSilenceWarning(false);
      resetSilenceTimer();
    }
  }, [isCandidateSpeaking, resetSilenceTimer]);

  const stopRecorders = (): Promise<{ videoBlob: Blob | null; audioBlob: Blob | null }> => {
    return new Promise(resolve => {
      let videoBlob: Blob | null = null;
      let audioBlob: Blob | null = null;
      let videoDone = false;
      let audioDone = false;
      const check = () => { if (videoDone && audioDone) resolve({ videoBlob, audioBlob }); };

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        const duration = Date.now() - startTimeRef.current;
        const id = recordingIdRef.current;
        mediaRecorderRef.current.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          if (duration < 3000) {
            await saveRecording(id, blob);
            videoBlob = blob;
            videoDone = true;
            check();
            return;
          }
          let resolved = false;
          const safety = setTimeout(async () => {
            if (!resolved) {
              resolved = true;
              await saveRecording(id, blob).catch(() => {});
              videoBlob = blob;
              videoDone = true;
              check();
            }
          }, 2500);
          try {
            fixWebmDuration(blob, duration, async (fixed: Blob) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(safety);
                await saveRecording(id, fixed).catch(() => {});
                videoBlob = fixed;
                videoDone = true;
                check();
              }
            });
          } catch {
            clearTimeout(safety);
            if (!resolved) {
              resolved = true;
              videoBlob = blob;
              videoDone = true;
              check();
            }
          }
        };
        mediaRecorderRef.current.stop();
      } else {
        videoDone = true;
      }

      if (audioRecorderRef.current && audioRecorderRef.current.state !== "inactive") {
        audioRecorderRef.current.onstop = () => {
          audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          audioDone = true;
          check();
        };
        audioRecorderRef.current.stop();
      } else {
        audioDone = true;
      }

      check();
    });
  };

  const handleFinish = async () => {
    if (stopping) return;
    setStopping(true);
    isStoppingRef.current = true;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const { videoBlob, audioBlob } = await stopRecorders();
    const finalTranscript = transcriptRef.current + (interimRef.current ? " " + interimRef.current : "");
    onFinish(recordingIdRef.current, videoBlob, audioBlob, finalTranscript.trim());
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-background via-card/20 to-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          {/* Recording indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-red-400 text-xs font-bold">Recording</span>
          </div>
          {/* Timer */}
          <span className="text-muted-foreground text-sm font-mono font-medium">{formatTime(elapsed)}</span>
        </div>
        <p className="text-muted-foreground text-xs hidden md:block">
          Speak naturally — finish when you are ready.
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {/* Camera preview or Audio Visualizer */}
        <div className="relative flex-1 rounded-2xl overflow-hidden bg-black/30 border border-border/30 min-h-[200px] flex items-center justify-center">
          {!isAudioOnly ? (
            <VideoPanel
              title={candidateName}
              isMuted={!isMicOn}
              isCameraOff={!isCameraOn}
              hideCamera={false}
              initials={initials}
              isCandidate={true}
              isSpeaking={isCandidateSpeaking}
              mediaStream={stream}
              enableVision={isCameraOn}
              onVisionResults={onVisionResults}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-8 w-full h-full bg-gradient-to-br from-card/10 to-card/5">
              <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${isCandidateSpeaking ? 'bg-primary/20 scale-110 shadow-[0_0_40px_rgba(var(--primary),0.3)]' : 'bg-primary/5 scale-100'}`}>
                <div className={`w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center transition-all duration-300 ${isCandidateSpeaking ? 'scale-110' : 'scale-100'}`}>
                  <Mic className={`w-12 h-12 transition-colors duration-300 ${isCandidateSpeaking ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </div>
              {/* Visualizer bars */}
              <div className="flex items-end gap-1.5 h-12">
                {audioLevels.map((level, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: isCandidateSpeaking ? `${level * 100}%` : "15%" }}
                    transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                    className={`w-2 rounded-full ${isCandidateSpeaking ? 'bg-primary' : 'bg-muted/50'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Prominent Recording Start Message */}
          <AnimatePresence>
            {showStartBanner && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full bg-primary/90 text-primary-foreground font-bold shadow-2xl backdrop-blur-sm border border-primary/20"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Your turn to speak. You're now being recorded.
              </motion.div>
            )}

            {coachingMessage && !showStartBanner && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full bg-amber-500/90 text-white font-bold shadow-2xl backdrop-blur-sm border border-amber-500/20"
              >
                <AlertCircle className="w-5 h-5" />
                {coachingMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Silence warning */}
          <AnimatePresence>
            {silenceWarning && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/90 text-white text-xs font-semibold shadow-lg">
                  <AlertCircle className="w-4 h-4" />
                  Still there? Keep going or click Finish when done.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlaid Timer */}
          <div className="absolute top-4 left-4 z-40 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-mono font-bold text-sm tracking-widest">{formatTime(elapsed)}</span>
          </div>

          {/* Overlaid Transcript */}
          {(transcript || interimTranscript) && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-40 flex flex-col items-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl text-center shadow-lg border border-white/10">
                <p className="text-white/90 font-medium text-lg leading-relaxed shadow-sm">
                  {/* Show only the last ~20 words so it acts like closed captions */}
                  {transcript.split(' ').slice(-20).join(' ')}
                  {interimTranscript && <span className="text-white/50 italic ml-2">{interimTranscript}</span>}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Bottom action */}
      <div className="flex justify-center py-5 px-6 border-t border-border/30">
        <motion.button
          whileHover={{ scale: stopping ? 1 : 1.02 }}
          whileTap={{ scale: stopping ? 1 : 0.98 }}
          onClick={handleFinish}
          disabled={stopping}
          className="px-10 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-base shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-wait flex items-center gap-2"
        >
          {stopping ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Finishing...
            </>
          ) : (
            "Finish Interview"
          )}
        </motion.button>
      </div>
    </div>
  );
}
