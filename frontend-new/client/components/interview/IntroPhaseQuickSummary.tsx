import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Star } from "lucide-react";

interface IntroPhaseQuickSummaryProps {
  result: any;
  onViewDetails: () => void;
}

const ENCOURAGING: Record<number, string> = {
  90: "Outstanding! Your introduction was polished and highly compelling.",
  80: "Great job! Your introduction was well-structured and clearly communicated.",
  70: "Good work! Your introduction covered the key areas with solid clarity.",
  60: "A solid effort! With a few focused improvements you will be interview-ready.",
  0: "Keep going! Every practice session builds your confidence and skill.",
};

function getEncouragement(score: number): string {
  const thresholds = [90, 80, 70, 60, 0];
  for (const t of thresholds) {
    if (score >= t) return ENCOURAGING[t];
  }
  return ENCOURAGING[0];
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 65) return "text-amber-400";
  return "text-rose-400";
}

function scoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-500/20 to-emerald-400/5 border-emerald-400/30";
  if (score >= 65) return "from-amber-500/20 to-amber-400/5 border-amber-400/30";
  return "from-rose-500/20 to-rose-400/5 border-rose-400/30";
}

export function IntroPhaseQuickSummary({ result, onViewDetails }: IntroPhaseQuickSummaryProps) {
  const score = result?.score ?? result?.total_score ?? result?.evaluation?.overall_score ?? 0;
  const scoreNum = Math.min(100, Math.max(0, Math.round(score)));
  const encouragement = getEncouragement(scoreNum);
  const passed = scoreNum >= 75;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 text-center"
      >
        {/* Icon */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
          >
            {passed ? (
              <Star className="w-8 h-8 text-primary" fill="currentColor" />
            ) : (
              <Sparkles className="w-8 h-8 text-primary" />
            )}
          </motion.div>
        </div>



        {/* Encouragement */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-2xl font-bold text-foreground">
            {passed ? "Great job!" : "Well done!"}
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm px-4">{encouragement}</p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <button
            onClick={onViewDetails}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          >
            View Detailed Feedback
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
