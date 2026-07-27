import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface IntroPhaseAIGreetingProps {
  onComplete: () => void;
}

const GREETING =
  "Hello, and welcome to your Introduction Practice. " +
  "Whenever you're ready, please introduce yourself. " +
  "Tell me about yourself, your experience, your skills, and the projects you've worked on.";

export function IntroPhaseAIGreeting({ onComplete }: IntroPhaseAIGreetingProps) {
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      // No TTS available, skip after short delay
      const t = setTimeout(onComplete, 2000);
      return () => clearTimeout(t);
    }

    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(GREETING);
    utt.rate = 0.92;
    utt.pitch = 1;
    utt.onend = () => onComplete();
    utt.onerror = () => onComplete(); // Fallback: advance even if TTS errors

    // Small delay so the UI renders before speaking
    const t = setTimeout(() => window.speechSynthesis.speak(utt), 300);

    return () => {
      clearTimeout(t);
      window.speechSynthesis.cancel();
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full space-y-8 text-center"
      >
        {/* Animated AI avatar */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Pulse rings */}
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-primary/30"
                animate={{ scale: [1, 1.6 + i * 0.3], opacity: [0.6, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/40 flex items-center justify-center shadow-2xl shadow-primary/30">
              <Bot className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Label */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="font-bold text-foreground text-lg">AI Interviewer</span>
            <div className="flex gap-1 ml-1">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-4 rounded-full bg-primary"
                  animate={{ scaleY: [0.4, 1.2, 0.4] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground text-sm">is speaking…</p>
        </div>

        {/* Speech bubble */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-card border border-border/50 text-left shadow-lg"
        >
          <p className="text-foreground text-sm leading-relaxed italic">
            "{GREETING}"
          </p>
        </motion.div>

        <p className="text-muted-foreground text-xs">
          Recording will begin automatically once the AI finishes speaking.
        </p>
      </motion.div>
    </div>
  );
}
