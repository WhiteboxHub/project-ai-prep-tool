import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, FileText, FileSearch, Target, Sparkles } from "lucide-react";

interface EvaluationLoadingScreenProps {
  isVisible: boolean;
}

export function EvaluationLoadingScreen({ isVisible }: EvaluationLoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { icon: FileText, text: "Transcribing your speech" },
    { icon: FileSearch, text: "Matching with your resume" },
    { icon: Sparkles, text: "Generating personalized feedback" }
  ];

  useEffect(() => {
    if (isVisible) {
      setCurrentStep(0);
      const timers = [
        setTimeout(() => setCurrentStep(1), 4000),
        setTimeout(() => setCurrentStep(2), 8000),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl"
        >
          <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border/50 shadow-2xl flex flex-col items-center">
            
            <div className="relative mb-8">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center"
              >
                <div className="w-20 h-20 rounded-full border-t-2 border-primary animate-spin" />
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
              Evaluating your introduction...
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-8">
              This may take a few moments.
            </p>

            <div className="w-full space-y-4">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                const isPending = index > currentStep;
                const Icon = isCompleted ? CheckCircle2 : step.icon;

                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                      isActive ? "bg-primary/10 border border-primary/20" : 
                      isCompleted ? "opacity-75" : "opacity-40"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : 
                      isCompleted ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                    }`}>
                      {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? "text-primary font-bold" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
