import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff,
  X, RotateCcw, Play, Pause, Square, CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";

interface ControlBarProps {
  onToggleMic: (enabled: boolean) => void;
  onToggleCamera: (enabled: boolean) => void;
  /** When provided, mic button drives speech recording instead of just mute */
  onRecordToggle?: () => void;
  onPauseToggle?: () => void;
  isRecording?: boolean;
  isPaused?: boolean;
  /** If set, overrides the outer wrapper className (use "relative" to render inline) */
  wrapperClassName?: string;
  isAudioDenied?: boolean;
  isVideoDenied?: boolean;
  onRetryAudio?: () => void;
  onRetryVideo?: () => void;
  onRetry?: () => void;
  hasAttempt?: boolean;
  hasTranscript?: boolean;
  mediaStream?: MediaStream | null;
  onSubmit?: () => void;
  hideCamera?: boolean;
}

export function ControlBar({
  onToggleMic,
  onToggleCamera,
  onRecordToggle,
  onPauseToggle,
  isRecording = false,
  isPaused = false,
  wrapperClassName,
  isAudioDenied,
  isVideoDenied,
  onRetryAudio,
  onRetryVideo,
  onRetry,
  hasAttempt = false,
  hasTranscript,
  mediaStream,
  onSubmit,
  hideCamera = false
}: ControlBarProps) {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream && isRecording && isCameraOn) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, isRecording, isCameraOn]);

  const handleCameraToggle = () => {
    if (isVideoDenied && onRetryVideo) {
      onRetryVideo();
      return;
    }
    setIsCameraOn(!isCameraOn);
    onToggleCamera(!isCameraOn);
  };

  const handleMicClick = () => {
    if (isAudioDenied && onRetryAudio) {
      onRetryAudio();
      return;
    }
    
    const nextMicState = !isMicOn;
    setIsMicOn(nextMicState);
    onToggleMic(nextMicState);
  };

  return (
    <div className={wrapperClassName ?? "relative"}>
      {/* Simple Text Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 border border-red-500/30 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg shadow-red-500/10 z-50 pointer-events-none"
          >
            <div className={`w-2 h-2 rounded-full ${isPaused ? "bg-amber-400" : "bg-red-500 animate-pulse"}`} />
            <span className={`text-xs font-bold uppercase tracking-wider leading-none mt-0.5 ${isPaused ? "text-amber-400" : "text-red-500"}`}>
              {isPaused ? "Paused" : "Recording"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card px-3 py-2.5 rounded-2xl border border-border/50 flex items-center gap-1.5 shadow-2xl shadow-primary/10"
      >
        {/* Mic — doubles as recording trigger */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={handleMicClick}
          title={isAudioDenied ? "Microphone Unavailable - Click to Retry" : isMicOn ? "Mute Mic" : "Unmute Mic"}
          className={`p-2.5 rounded-xl transition-all ${
            isAudioDenied
              ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
              : isMicOn
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
          }`}
        >
          {isAudioDenied || !isMicOn ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </motion.button>

        {/* Camera (Hidden in Audio-Only Mode) */}
        {!hideCamera && (
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={handleCameraToggle}
            title={isVideoDenied ? "Camera Unavailable - Click to Retry" : isCameraOn ? "Stop Camera" : "Start Camera"}
            className={`p-2.5 rounded-xl transition-all ${
              isVideoDenied
                ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                : isCameraOn 
                  ? "bg-primary/20 text-primary hover:bg-primary/30" 
                  : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
            }`}
          >
            {isVideoDenied ? <VideoOff className="w-4 h-4" /> : !isCameraOn ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </motion.button>
        )}

        {/* Start / Stop Record Button */}
        {onRecordToggle && (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onRecordToggle}
            title={isRecording ? "Stop Recording" : "Start Recording"}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-sm shadow-sm ${
              isRecording 
                ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" 
                : "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]"
            }`}
          >
            {isRecording ? (
              <><Square className="w-4 h-4 fill-current" /> Stop</>
            ) : (
              <><Play className="w-4 h-4 fill-current ml-0.5" /> Start</>
            )}
          </motion.button>
        )}

        {/* Pause / Resume Button (Visible when recording) */}
        {isRecording && onPauseToggle && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onPauseToggle}
            title={isPaused ? "Resume Recording" : "Pause Recording"}
            className={`p-2.5 rounded-xl transition-all ${
              isPaused 
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" 
                : "bg-card hover:bg-white/10 text-foreground"
            }`}
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          </motion.button>
        )}

        {/* Submit Button (Only visible AFTER candidate finishes / stops recording) */}
        {onSubmit && !isRecording && (hasAttempt || hasTranscript) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onSubmit}
            title="Submit Recording Now"
            className="px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-sm bg-primary text-primary-foreground shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]"
          >
            <CheckCircle2 className="w-4 h-4" /> Submit
          </motion.button>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-border/50 mx-0.5" />

        {/* Retry Button (Only available after an attempt is completed or recorded) */}
        {onRetry && hasAttempt && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={onRetry}
            title="Retry Practice"
            className="p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>
        )}

        {/* End */}
        <Link to="/">
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            title="Exit"
            className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
