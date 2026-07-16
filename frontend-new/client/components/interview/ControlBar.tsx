// client/components/interview/ControlBar.tsx
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff,
  X, RotateCcw, Play, Square, CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";

interface ControlBarProps {
  onToggleMic: (enabled: boolean) => void;
  onToggleCamera: (enabled: boolean) => void;
  /** When provided, mic button drives speech recording instead of just mute */
  onRecordToggle?: () => void;
  isRecording?: boolean;
  /** If set, overrides the outer wrapper className (use "relative" to render inline) */
  wrapperClassName?: string;
  isAudioDenied?: boolean;
  isVideoDenied?: boolean;
  onRetryAudio?: () => void;
  onRetryVideo?: () => void;
  onRetry?: () => void;
  hasTranscript?: boolean;
  mediaStream?: MediaStream | null;
  onSubmit?: () => void;
}

export function ControlBar({
  onToggleMic,
  onToggleCamera,
  onRecordToggle,
  isRecording = false,
  wrapperClassName,
  isAudioDenied,
  isVideoDenied,
  onRetryAudio,
  onRetryVideo,
  onRetry,
  hasTranscript,
  mediaStream,
  onSubmit
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
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500 font-bold uppercase tracking-wider leading-none mt-0.5">Recording</span>
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
          title={isAudioDenied ? "Microphone Unavailable - Click to Retry" : isMicOn ? "Mute Mic & Pause" : "Unmute Mic & Resume"}
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

        {/* Camera */}
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

        {/* Record (Play/Stop) */}
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

        {/* Submit */}
        {onSubmit && isRecording && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onSubmit}
            title="Submit Recording Now"
            className="px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs border border-primary/50 text-primary hover:bg-primary/20 shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Submit
          </motion.button>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-border/50 mx-0.5" />

        {onRetry && (
          <motion.button
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
