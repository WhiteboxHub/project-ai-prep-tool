// client/pages/InterviewSelect.tsx
import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Code2, Settings2, Users, ArrowRight, BrainCircuit, Target, Sparkles, ChevronRight, BookOpen, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";

type InterviewType = "recruiter" | "behavioral" | "subject-mock" | "ai-engineer" | "data-scientist" | "ml-engineer";
type Difficulty = "junior" | "senior" | "staff" | "senior-staff" | "principal";

const INTERVIEW_TYPES = [
  { id: "recruiter" as InterviewType, title: "Recruiter Interview", description: "Culture fit, past experience, and career goals", icon: Target, color: "from-pink-500/20 to-rose-500/10", border: "border-pink-500/30", iconColor: "text-pink-400" },
  { id: "behavioral" as InterviewType, title: "Behavioral", description: "Leadership, conflict resolution, and the STAR method", icon: Settings2, color: "from-purple-500/20 to-fuchsia-500/10", border: "border-purple-500/30", iconColor: "text-purple-400" },
  { id: "subject-mock" as InterviewType, title: "Subject Mock", description: "Deep dive into your domain expertise", icon: BookOpen, color: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/30", iconColor: "text-blue-400" },
  { id: "ai-engineer" as InterviewType, title: "AI Engineer", description: "Agents, RAG, and applied AI systems", icon: BrainCircuit, color: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/30", iconColor: "text-amber-400" },
  { id: "data-scientist" as InterviewType, title: "Data Scientist", description: "Statistics, modeling, and data insights", icon: Code2, color: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/30", iconColor: "text-emerald-400" },
  { id: "ml-engineer" as InterviewType, title: "ML Engineer", description: "Model architecture, pipelines, and scaling", icon: Settings2, color: "from-indigo-500/20 to-blue-500/10", border: "border-indigo-500/30", iconColor: "text-indigo-400" },
];

const DIFFICULTIES = [
  { id: "junior" as Difficulty, title: "Junior", description: "Focus on fundamentals and execution" },
  { id: "senior" as Difficulty, title: "Senior", description: "Complex problems, optimization, and system tradeoffs" },
  { id: "staff" as Difficulty, title: "Staff", description: "Architecture, technical leadership, and cross-team impact" },
  { id: "senior-staff" as Difficulty, title: "Senior Staff", description: "Organizational strategy and multi-system design" },
  { id: "principal" as Difficulty, title: "Principal", description: "Industry-level impact and foundational technical direction" },
];

export default function InterviewSelect() {
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const { pipeline, loading } = usePipeline();
  
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (pipeline.interview === "locked") {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-border/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Interview Locked</h2>
          <p className="text-muted-foreground max-w-md">You must complete Introduction Practice and Project Evaluation before starting the Interview Room.</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/")} className="px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary font-semibold rounded-lg mt-4 smooth-transition">
            Return to Dashboard
          </motion.button>
        </div>
      </MainLayout>
    );
  }

  const handleStart = async () => {
    if (!selectedType || !selectedDifficulty) return;
    
    // In a full implementation, we might call startMockInterview(sessionId) here.
    // For now, we pass the selections via sessionStorage and go to the room.
    sessionStorage.setItem("interviewType", selectedType);
    sessionStorage.setItem("interviewDifficulty", selectedDifficulty);
    navigate("/interview-room");
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-semibold">AI Interview Simulation</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Configure Your Practice</h2>
          <p className="text-muted-foreground text-lg">Customize the interview parameters to match your target role.</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">1. Select Interview Type</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {INTERVIEW_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                return (
                  <motion.button key={type.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 ${isSelected ? `bg-gradient-to-br ${type.color} ${type.border}` : "bg-card/40 border-border/50 hover:border-border"}`}>
                    <div className={`p-3 rounded-xl inline-block mb-4 ${isSelected ? "bg-background/50" : "bg-white/5"}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? type.iconColor : "text-muted-foreground"}`} />
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{type.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{type.description}</p>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                          className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center bg-background/50 ${type.border} border`}>
                          <div className={`w-2.5 h-2.5 rounded-full bg-current ${type.iconColor}`} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <BrainCircuit className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">2. Select Difficulty</h3>
            </div>
            <div className="space-y-3">
              {DIFFICULTIES.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <motion.button key={diff.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedDifficulty(diff.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all duration-300 ${isSelected ? "bg-primary/10 border-primary" : "bg-card/40 border-border/50 hover:border-border"}`}>
                    <div>
                      <h4 className="font-semibold text-foreground">{diff.title}</h4>
                      <p className="text-sm text-muted-foreground">{diff.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-primary" : "border-muted-foreground"}`}>
                      {isSelected && <motion.div layoutId="diff-dot" className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: selectedType && selectedDifficulty ? 1 : 0.5 }} className="pt-6 mt-6 border-t border-border/50">
              <motion.button whileHover={selectedType && selectedDifficulty ? { scale: 1.02 } : {}} whileTap={selectedType && selectedDifficulty ? { scale: 0.98 } : {}}
                onClick={handleStart} disabled={!selectedType || !selectedDifficulty}
                className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${selectedType && selectedDifficulty ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg glow-primary" : "bg-white/5 text-muted-foreground cursor-not-allowed"}`}>
                Enter Interview Room <ChevronRight className="w-5 h-5" />
              </motion.button>
              <p className="text-center text-xs text-muted-foreground mt-4">Make sure your camera and microphone are ready</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
