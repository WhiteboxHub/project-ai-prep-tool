// client/components/interview/ControlBar.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Mic, MicOff, Video, VideoOff,
  LogOut, Play, Square, RotateCcw, CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";

interface ControlBarProps {
  isMicOn?: boolean;
  onToggleMic: (enabled: boolean) => void;
  onToggleCamera: (enabled: boolean) => void;
  onRecordStart?: () => void;
  onRecordStop?: () => void;
  isRecording?: boolean;
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
  isMicOn = true,
  onToggleMic,
  onToggleCamera,
  onRecordStart,
  onRecordStop,
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
    onToggleMic(!isMicOn);
  };

  return (
    <div className={wrapperClassName ?? "relative mt-5"}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card px-5 py-2.5 rounded-full border border-white/20 flex items-center gap-3 shadow-2xl bg-black/70 backdrop-blur-2xl"
      >
        {/* Start / Stop Recording Options */}
        {isMicOn && onRecordStart && onRecordStop && (
          <>
            <motion.button
              whileHover={!isRecording ? { scale: 1.05 } : {}}
              whileTap={!isRecording ? { scale: 0.95 } : {}}
              onClick={!isRecording ? onRecordStart : undefined}
              disabled={isRecording}
              title={isRecording ? "Recording..." : "Start Recording"}
              className={`flex flex-col items-center justify-center gap-1.5 min-w-[60px] ${isRecording ? "cursor-default" : ""
                }`}
            >
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${isRecording
                  ? "bg-red-500 border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-white border border-white/20 hover:bg-gray-100"
                  }`}
              >
                {isRecording ? (
                  <Square className="w-4 h-4 text-white animate-pulse" />
                ) : (
                  <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                )}
              </div>

            </motion.button>

            <div className="w-px h-10 bg-white/10 self-center mx-1" />
          </>
        )}

        {/* Mic Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={handleMicClick}
          title={isAudioDenied ? "Microphone Unavailable" : isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          className="flex flex-col items-center justify-center gap-1.5 min-w-[60px]"
        >
          <div className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${isAudioDenied || !isMicOn
            ? "bg-red-500/90 text-white shadow-lg shadow-red-500/20"
            : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
            }`}>
            {isAudioDenied || !isMicOn ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </div>
        </motion.button>

        {/* Camera Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={handleCameraToggle}
          title={isVideoDenied ? "Camera Unavailable" : isCameraOn ? "Stop Camera" : "Start Camera"}
          className="flex flex-col items-center justify-center gap-1.5 min-w-[60px]"
        >
          <div className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${isVideoDenied || !isCameraOn
            ? "bg-red-500/90 text-white shadow-lg shadow-red-500/20"
            : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
            }`}>
            {isVideoDenied || !isCameraOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </div>
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

        {/* End Call */}
        <Link to="/" className="flex flex-col items-center justify-center gap-1.5 min-w-[60px]">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            title="Leave"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>

        </Link>
      </motion.div>
    </div>
  );
}
