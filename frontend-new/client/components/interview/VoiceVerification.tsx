import React, { useEffect, useState } from "react";
import { Mic, CheckCircle2 } from "lucide-react";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import { motion } from "framer-motion";

interface VoiceVerificationProps {
  stream: MediaStream | null;
  isSpeaking: boolean;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export function VoiceVerification({ 
  stream, 
  isSpeaking, 
  onVerified, 
  title = "Test your microphone", 
  description = "Please say a few words so we can make sure your microphone is working." 
}: VoiceVerificationProps) {
  const audioLevels = useAudioVisualizer(stream, 16);
  const [verified, setVerified] = useState(false);

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
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-colors duration-500 ${verified ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-primary/5 border-primary/20'}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${verified ? 'bg-emerald-500/20 text-emerald-500' : (isSpeaking ? 'bg-primary/20 scale-110 text-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]' : 'bg-primary/10 text-muted-foreground')}`}>
        {verified ? <CheckCircle2 className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
      </div>
      
      {!verified ? (
        <div className="flex items-end gap-1 h-8 mb-4">
          {audioLevels.map((level, i) => (
             <motion.div
               key={i}
               animate={{ height: isSpeaking ? `${Math.max(15, level * 100)}%` : "15%" }}
               transition={{ type: "spring", bounce: 0, duration: 0.1 }}
               className={`w-1.5 rounded-full ${isSpeaking ? 'bg-primary' : 'bg-muted/40'}`}
             />
          ))}
        </div>
      ) : (
        <div className="h-8 mb-4 flex items-center justify-center">
          <p className="text-emerald-500 font-bold text-sm">✅ Voice detected. Your microphone is working correctly.</p>
        </div>
      )}

      <p className="text-sm font-semibold text-foreground text-center">{verified ? "Ready to continue!" : title}</p>
      {!verified && <p className="text-xs text-muted-foreground text-center mt-1">{description}</p>}
    </div>
  );
}
