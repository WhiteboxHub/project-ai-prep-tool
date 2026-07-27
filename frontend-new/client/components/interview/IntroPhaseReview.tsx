import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw, Upload, AlertCircle } from "lucide-react";
import { getRecording } from "@/lib/indexedDB";

interface IntroPhaseReviewProps {
  recordingId: string;
  isAudioOnly?: boolean;
  onRecordAgain: () => void;
  onSubmit: () => void;
}

export function IntroPhaseReview({ recordingId, isAudioOnly, onRecordAgain, onSubmit }: IntroPhaseReviewProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    getRecording(recordingId)
      .then(blob => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setVideoUrl(objectUrl);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [recordingId]);

  const handlePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
        setPlaying(false);
      } else {
        videoRef.current.play();
        setPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && videoRef.current.duration !== Infinity) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      if (videoRef.current.duration === Infinity) {
        // Fix for Chromium WebM duration bug
        videoRef.current.currentTime = 1e81;
        videoRef.current.onseeked = () => {
          if (videoRef.current) {
            videoRef.current.onseeked = null;
            videoRef.current.currentTime = 0;
            setDuration(videoRef.current.duration);
          }
        };
      } else {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Review Your Recording</h1>
          <p className="text-muted-foreground text-sm">
            Watch your introduction before submitting. You can record again if you would like to try once more.
          </p>
        </div>

        {/* Media player */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-card border border-border/40 shadow-2xl p-6 md:p-8 flex flex-col items-center gap-8">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm z-10">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 bg-card/80 backdrop-blur-sm z-10">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-foreground font-semibold text-sm">We could not load your recording preview.</p>
              <p className="text-muted-foreground text-xs">Your recording was saved. You can still submit it for evaluation.</p>
            </div>
          )}

          {!isAudioOnly ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
              {videoUrl && (
                <video
                  ref={videoRef as React.RefObject<HTMLVideoElement>}
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  onEnded={() => setPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  playsInline
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 w-full">
              <div className="flex items-end gap-1.5 h-16">
                {[...Array(21)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: playing ? ["20%", "100%", "40%", "80%", "30%"][i % 5] : "20%" }}
                    transition={{ duration: 0.2 + (i % 3) * 0.1, repeat: playing ? Infinity : 0, repeatType: "reverse" }}
                    className={`w-1.5 md:w-2 rounded-full ${playing ? 'bg-primary' : 'bg-muted/30'}`}
                  />
                ))}
              </div>
              {videoUrl && (
                <audio
                  ref={videoRef as React.RefObject<HTMLAudioElement>}
                  src={videoUrl}
                  onEnded={() => setPlaying(false)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  className="hidden"
                />
              )}
            </div>
          )}

          {/* Scrubber / Controls */}
          {videoUrl && (
            <div className="w-full space-y-4">
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground font-mono">
                <span>{formatTime(currentTime)}</span>
                <div className="flex-1 relative h-2 group cursor-pointer">
                  <div className="absolute inset-0 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={handlePlay}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${playing ? 'bg-primary/20 text-primary shadow-none hover:bg-primary/30' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30'}`}
                >
                  <Play className={`w-8 h-8 ${playing ? '' : 'ml-1'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Record Again */}
          <button
            onClick={onRecordAgain}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-card border border-border/50 text-muted-foreground font-semibold text-sm hover:bg-card/80 hover:border-border hover:text-foreground transition-all`}
          >
            <RotateCcw className="w-4 h-4" />
            Record Again
          </button>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSubmit}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm shadow-lg shadow-primary/30"
          >
            <Upload className="w-4 h-4" />
            Submit for Feedback
          </motion.button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Your recording is saved on your device. It will only be uploaded when you click Submit.
        </p>
      </motion.div>
    </div>
  );
}
