import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IntroPhaseCountdownProps {
  onComplete: () => void;
}

export function IntroPhaseCountdown({ onComplete }: IntroPhaseCountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setCount(2), 1000));
    timers.push(setTimeout(() => setCount(1), 2000));
    timers.push(setTimeout(() => onComplete(), 3000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center">
      {/* Outer ring */}
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-52 h-52 rounded-full border-2 border-primary/30"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="absolute w-64 h-64 rounded-full border border-primary/15"
        />

        {/* Number */}
        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.4, y: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-40 h-40 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/30"
          >
            <span className="text-8xl font-black text-foreground leading-none">{count}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-10 text-center space-y-2"
      >
        <p className="text-muted-foreground text-lg font-medium">Interview starts in</p>
        <div className="flex gap-1.5 justify-center">
          {[3, 2, 1].map(n => (
            <div
              key={n}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                n >= count ? "bg-primary scale-125" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
