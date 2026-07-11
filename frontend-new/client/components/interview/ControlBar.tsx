// client/components/interview/ControlBar.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff,
  X, Volume2, RotateCcw, CheckCircle2
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
  onSubmit?: () => void;
  onRetry?: () => void;
  hasTranscript?: boolean;
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
  onSubmit,
  onRetry,
  hasTranscript
}: ControlBarProps) {
  const [isCameraOn, setIsCameraOn] = useState(true);

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
    if (onRecordToggle) {
      // Drives speech recognition
      onRecordToggle();
    } else {
      // Plain mute toggle fallback
      onToggleMic(true);
    }
  };

  return (
    <div className={wrapperClassName ?? "relative"}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card px-3 py-2.5 rounded-2xl border border-border/50 flex items-center gap-1.5 shadow-2xl shadow-primary/10"
      >
        {/* Mic — doubles as recording trigger */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          onClick={handleMicClick}
          title={isAudioDenied ? "Microphone Unavailable - Click to Retry" : isRecording ? "Stop Recording" : "Start Recording"}
          className={`p-2.5 rounded-xl transition-all ${
            isAudioDenied
              ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
              : isRecording
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
          }`}
        >
          {isAudioDenied || !isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
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

        {onSubmit && (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onSubmit}
            disabled={!hasTranscript}
            title="Finish & Evaluate"
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all text-sm ${
              hasTranscript 
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]" 
                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Submit
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
