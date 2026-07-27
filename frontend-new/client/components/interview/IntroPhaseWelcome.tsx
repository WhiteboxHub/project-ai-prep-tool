import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Clock, Video, Brain, CheckCircle2 } from "lucide-react";

interface IntroPhaseWelcomeProps {
  onContinue: () => void;
}

export function IntroPhaseWelcome({ onContinue }: IntroPhaseWelcomeProps) {
  const highlights = [
    {
      icon: Video,
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20",
      title: "Introduce yourself on camera",
      desc: "Speak naturally as if meeting a real interviewer for the first time.",
    },
    {
      icon: Brain,
      color: "text-violet-400",
      bg: "bg-violet-400/10 border-violet-400/20",
      title: "AI evaluates your introduction",
      desc: "Our AI analyses your communication, confidence, and delivery in detail.",
    },
    {
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
      title: "Receive personalised feedback",
      desc: "Get a detailed report with strengths, improvements, and an example introduction.",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-2xl w-full space-y-8"
      >
        {/* Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-semibold">Introduction Practice</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            Welcome to Introduction Practice
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/60 border border-border/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">About 2–3 minutes</span>
          </div>
        </div>

        {/* Highlights */}
        <div className="space-y-3">
          {highlights.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                className={`flex items-start gap-4 p-4 rounded-2xl border ${item.bg} backdrop-blur-sm`}
              >
                <div className={`p-2.5 rounded-xl bg-background/50 border ${item.bg} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground text-sm">{item.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <button
            onClick={onContinue}
            className="w-full max-w-sm py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Continue →
          </button>
          <p className="text-xs text-muted-foreground text-center">
            No downloads required. Works entirely in your browser.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
