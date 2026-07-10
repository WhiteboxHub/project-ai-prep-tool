import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Camera, Volume2 } from "lucide-react";

interface VideoPanelProps {
  title: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isSpeaking?: boolean;
  initials?: string;
  isCandidate?: boolean;
  isExpanded?: boolean;
  onExpand?: () => void;
  mediaStream?: MediaStream | null;
}

export function VideoPanel({
  title,
  isMuted,
  isCameraOff,
  isSpeaking,
  initials,
  isCandidate,
  isExpanded,
  onExpand,
  mediaStream,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`relative rounded-2xl overflow-hidden border-2 ${
        isSpeaking && !isMuted ? "border-primary/50 shadow-2xl shadow-primary/30" : "border-border/30"
      } smooth-transition h-full min-h-[300px] sm:min-h-[400px] flex items-center justify-center bg-gradient-to-br from-card/80 to-card/40`}
    >
      {/* Video Background Placeholder / Stream */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-card to-secondary/10" />
      {mediaStream && !isCameraOff && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted // Mute local playback to avoid echo
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Camera Off State */}
      {isCameraOff && (
        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center"
          >
            <span className="text-4xl font-bold text-white">{initials}</span>
          </motion.div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">Camera off</p>
          </div>
        </div>
      )}

      {/* Header Controls (Right side) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {onExpand && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onExpand}
            className="p-1.5 rounded-lg glass-card hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            )}
          </motion.button>
        )}
        {isMuted && (
          <motion.div
            className="p-1.5 rounded-lg bg-red-500/20 text-red-400"
            animate={{ opacity: [0.6, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            title="Microphone Muted"
          >
            <MicOff className="w-4 h-4" />
          </motion.div>
        )}
        {isCameraOff && (
          <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400" title="Camera Off">
            <Camera className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Title Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="glass-card px-3 py-1.5 rounded-lg text-sm font-semibold">
          {title}
        </div>
      </div>

      {/* Speaking Indicator */}
      {isSpeaking && !isMuted && (
        <motion.div
          className="absolute bottom-4 left-4 z-20 flex items-center gap-2"
          animate={{ opacity: [0.6, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          <div className="flex gap-1 items-end h-6">
            {[0, 1, 2].map((idx) => (
              <motion.div
                key={idx}
                className="w-1 rounded-full bg-gradient-to-t from-primary to-secondary"
                animate={{ height: ["8px", "20px", "8px"] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: idx * 0.1,
                }}
              />
            ))}
          </div>
          <span className="text-xs text-primary font-semibold">Speaking...</span>
        </motion.div>
      )}

      {/* Audio Indicator */}
      {isSpeaking && !isMuted && (
        <motion.div
          className="absolute bottom-4 right-4 z-20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Volume2 className="w-5 h-5 text-primary" />
        </motion.div>
      )}

    </motion.div>
  );
}
