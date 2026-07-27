import React from "react";
import { motion } from "framer-motion";
import { Bot, Mic, ArrowRight } from "lucide-react";

interface IntroPhaseReadyConfirmationProps {
  onBeginInterview: () => void;
}

export function IntroPhaseReadyConfirmation({ onBeginInterview }: IntroPhaseReadyConfirmationProps) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-card/30 to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 text-center"
      >
        {/* Animated badge */}
        <div className="flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 flex items-center justify-center shadow-2xl shadow-primary/20"
          >
            <Bot className="w-10 h-10 text-primary" />
          </motion.div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-foreground">You're all set.</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            When you click Begin Interview, your AI interviewer will greet you first.
          </p>
        </div>

        {/* What happens next */}
        <div className="space-y-3 text-left">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/15">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">AI greets you</p>
              <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                Your AI interviewer will speak a short welcome. Listen carefully.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/15">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Recording starts automatically</p>
              <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                Recording begins as soon as the AI finishes speaking. You do not need to press anything.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/15">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-primary font-bold text-sm">✓</span>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Review before submitting</p>
              <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                When you finish, you can watch your recording and choose to submit or record again.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBeginInterview}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg shadow-2xl shadow-primary/40 flex items-center justify-center gap-3"
        >
          Begin Interview
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  );
}
