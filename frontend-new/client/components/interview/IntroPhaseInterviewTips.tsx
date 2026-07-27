import React from "react";
import { motion } from "framer-motion";
import { Eye, Camera, Clock, AlertTriangle, Video, Lightbulb } from "lucide-react";

interface IntroPhaseInterviewTipsProps {
  onReady: () => void;
}

const TIPS = [
  {
    icon: Eye,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    title: "Look toward the camera",
    desc: "Looking at the camera creates a natural eye contact impression, just like in a real interview.",
  },
  {
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
    title: "Speak naturally",
    desc: "There is no script to follow. Just speak as if you are introducing yourself to a new colleague.",
  },
  {
    icon: Clock,
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
    title: "Keep it to 1–2 minutes",
    desc: "A focused, clear introduction is always better than a long one. Quality over quantity.",
  },
  {
    icon: AlertTriangle,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    title: "Don't worry about small mistakes",
    desc: "Everyone stumbles occasionally. Keep going — the AI evaluates your overall delivery, not perfection.",
  },
  {
    icon: Video,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
    title: "You can review before submitting",
    desc: "After you finish, you will be able to watch your recording and decide whether to submit or try again.",
  },
];

export function IntroPhaseInterviewTips({ onReady }: IntroPhaseInterviewTipsProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Camera className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">A few quick tips</h1>
          <p className="text-muted-foreground text-sm">
            Keep these in mind for a great introduction.
          </p>
        </div>

        {/* Tips */}
        <div className="space-y-3">
          {TIPS.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                className={`flex items-start gap-4 p-4 rounded-2xl border ${tip.bg}`}
              >
                <div className="p-2 rounded-xl bg-background/50 flex-shrink-0">
                  <Icon className={`w-4 h-4 ${tip.color}`} />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-foreground text-sm">{tip.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{tip.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <button
            onClick={onReady}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            I'm Ready →
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
