import React, { useEffect, useState } from "react";
import { Mic, CheckCircle2 } from "lucide-react";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import { useMicrophoneLevel } from "@/hooks/useMicrophoneLevel";
import { motion } from "framer-motion";
import { MicrophoneSelector } from "./MicrophoneSelector";

interface VoiceVerificationProps {
  stream: MediaStream | null;
  isSpeaking: boolean;
  onVerified: () => void;
  title?: string;
  description?: string;
  availableMics?: MediaDeviceInfo[];
  selectedMicId?: string;
  onMicChange?: (deviceId: string) => void;
}

export function VoiceVerification({ 
  stream, 
  isSpeaking, 
  onVerified, 
  title = "Test your microphone", 
  description = "Speak a few words so we can test your microphone.",
  availableMics = [],
  selectedMicId = "",
  onMicChange,
}: VoiceVerificationProps) {
  // We use the audio visualizer for the zig-zag EQ bars
  const audioLevels = useAudioVisualizer(stream, 7);
  // We still use microphone level to reliably detect sustained speech volume
  const level = useMicrophoneLevel(stream);
  const [verified, setVerified] = useState(false);

  // If the stream changes (e.g. mic changed), reset verified status
  useEffect(() => {
    setVerified(false);
  }, [stream]);

  useEffect(() => {
    if (isSpeaking && !verified) {
      const timer = setTimeout(() => {
        setVerified(true);
        onVerified();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, verified, onVerified]);

  return (
    <div className={`w-full flex flex-col p-5 rounded-2xl border transition-colors duration-500 ${verified ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-card border-border/50'}`}>
      
      {availableMics.length > 1 && onMicChange && (
        <MicrophoneSelector 
          availableMics={availableMics} 
          selectedMicId={selectedMicId} 
          onSelect={(id) => {
            setVerified(false);
            onMicChange(id);
          }} 
        />
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2 rounded-full transition-colors duration-500 ${verified ? 'bg-emerald-500/20 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
          {verified ? <CheckCircle2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </div>
        <h3 className="text-sm font-bold text-foreground">
          {verified ? "Voice detected" : title}
        </h3>
      </div>
      
      {!verified ? (
        <div className="space-y-4 w-full px-1 flex flex-col items-center">
          {/* Zig-Zag EQ Bars Visualizer */}
          <div className="flex items-end justify-center gap-1.5 h-8">
            {audioLevels.map((val, i) => (
              <motion.div
                key={i}
                className="w-1.5 bg-primary rounded-full"
                animate={{ height: `${val * 100}%` }}
                transition={{ type: "tween", ease: "linear", duration: 0.05 }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-medium text-center">
            {level > 3 ? "Receiving audio..." : "Waiting for your voice..."}
          </p>
        </div>
      ) : (
        <div className="w-full px-1">
          <p className="text-sm text-emerald-500 font-medium">Your microphone is working correctly.</p>
        </div>
      )}
    </div>
  );
}
