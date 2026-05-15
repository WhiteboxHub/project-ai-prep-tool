// client/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, Lock, ArrowRight, Loader2,
  Zap, Upload, Star, BarChart2, Code2, Users, BookOpen, ChevronRight, ChevronDown
} from "lucide-react";
import { getResumeSummary, getProjectHistory, getIntroHistory } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

import { usePipeline } from "@/hooks/use-pipeline";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { sessionId, candidateName } = useAuth();

  const { pipeline, loading: pipelineLoading, readiness } = usePipeline();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [introScore, setIntroScore] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId || pipelineLoading) return;

    const load = async () => {
      try {
        const [sum, introHist] = await Promise.allSettled([
          getResumeSummary(sessionId),
          getIntroHistory(sessionId),
        ]);

        const s = sum.status === "fulfilled" ? sum.value : null;
        const ih = introHist.status === "fulfilled" ? introHist.value : null;

        setSummary(s);

        if (s?.resume_json) {
          const rj = s.resume_json;
          const rawSkills =
            rj?.skills?.map((sk: any) => (typeof sk === "string" ? sk : sk.name || sk.keywords?.[0] || "")) ||
            rj?.basics?.skills || [];
          setSkills(rawSkills.filter(Boolean).slice(0, 8));
        }

        const evals = ih?.history || ih?.evaluations || [];
        if (evals.length > 0) {
          const best = Math.max(...evals.map((e: any) => e.score || 0));
          setIntroScore(best);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId, pipelineLoading]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const pipelineCards = [
    {
      id: "setup",
      title: "Resume & API Setup",
      description: "Upload your resume and connect your AI model",
      href: "/settings",
      status: pipeline.setup,
      icon: <Upload className="w-5 h-5" />,
    },
    {
      id: "project",
      title: "Project Explanation",
      description: "Describe your core project for AI evaluation",
      href: "/preparation",
      status: pipeline.project,
      icon: <Code2 className="w-5 h-5" />,
    },
    {
      id: "intro",
      title: "Introduction Practice",
      description: "Record and evaluate your professional intro",
      href: "/intro-practice",
      status: pipeline.intro,
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: "interview",
      title: "Technical Interview",
      description: "Multi-stage AI-powered interview simulation",
      href: "/interview-select",
      status: pipeline.interview,
      icon: <Star className="w-5 h-5" />,
    },
  ];

  const statusColor = (s: string) => {
    if (s === "completed") return "border-green-500/30 bg-green-500/5";
    if (s === "ready") return "border-primary/30 bg-primary/5";
    return "border-border/30 opacity-50";
  };

  const statusLabel = (s: string) => {
    if (s === "completed") return <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="w-3.5 h-3.5" /> Done</span>;
    if (s === "ready") return <span className="flex items-center gap-1 text-primary text-xs"><ArrowRight className="w-3.5 h-3.5" /> Start</span>;
    return <span className="flex items-center gap-1 text-muted-foreground text-xs"><Lock className="w-3.5 h-3.5" /> Locked</span>;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout readiness={readiness}>
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">

        {/* Welcome */}
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">
            Welcome, {candidateName.split(" ")[0]}
          </h2>
          <p className="text-muted-foreground">
            {readiness === 100
              ? "🎉 You're fully prepared! Time to nail that interview."
              : `You're ${readiness}% prepared. Keep going!`}
          </p>
        </motion.div>

        {/* Pipeline Cards */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Preparation Pipeline</h3>
          <div className="relative flex flex-col md:flex-row items-start justify-between w-full gap-8 md:gap-0 mt-6 md:mt-10 mb-4">
            {pipelineCards.map((card, idx) => {
              const isLocked = card.status === "locked";
              const isCompleted = card.status === "completed";
              const isReady = card.status === "ready";
              
              // The line going right from this node is active if this node is completed
              const isLineActive = isCompleted;

              return (
                <div key={card.id} className="relative flex-1 flex flex-col md:items-center text-left md:text-center w-full group">
                  
                  {/* Connecting Arrow (Desktop) */}
                  {idx < pipelineCards.length - 1 && (
                    <div className="hidden md:flex absolute top-6 -right-3 z-0 items-center justify-center text-muted-foreground/30">
                      <ChevronRight className="w-6 h-6" />
                    </div>
                  )}

                  {/* Connecting Arrow (Mobile) */}
                  {idx < pipelineCards.length - 1 && (
                    <div className="md:hidden absolute left-6 top-[3rem] bottom-[-1.5rem] flex items-center justify-center text-muted-foreground/30">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  )}

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={!isLocked ? { scale: 1.05, y: -2 } : {}}
                    whileTap={!isLocked ? { scale: 0.95 } : {}}
                    onClick={() => !isLocked && navigate(card.href)}
                    disabled={isLocked}
                    className={`relative z-10 flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-3 w-full outline-none ${!isLocked ? "cursor-pointer" : "cursor-not-allowed"}`}
                  >
                    {/* Glowing Circular Node */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 flex-shrink-0 ${
                      isCompleted ? "border-green-500/30 bg-green-500/10 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.15)]" :
                      isReady ? "border-primary/50 bg-primary/20 text-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                      "border-border/50 bg-card text-muted-foreground opacity-50"
                    }`}>
                      {isLocked ? <Lock className="w-4 h-4" /> : React.cloneElement(card.icon as React.ReactElement, { className: "w-5 h-5" })}
                    </div>

                    {/* Step Content */}
                    <div className="flex flex-col md:items-center text-left md:text-center w-full">
                      <div className="mb-1.5 flex items-center md:justify-center">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isCompleted ? "bg-green-500/10 border-green-500/20 text-green-400" :
                          isReady ? "bg-primary/10 border-primary/20 text-primary" :
                          "bg-white/5 border-white/10 text-muted-foreground"
                        }`}>
                          {isCompleted ? "COMPLETED" : isReady ? "IN PROGRESS" : "LOCKED"}
                        </div>
                      </div>
                      <h4 className={`font-bold text-sm text-center ${isReady || isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {card.title}
                      </h4>
                    </div>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Readiness + Resume Insights */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Readiness ring */}
          <div className="glass-card-hover p-4 rounded-xl border border-border/50 flex flex-col items-center justify-center gap-2">
            <h3 className="text-base font-semibold text-foreground self-start">Interview Readiness</h3>
            <div className="relative w-20 h-20 my-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="url(#rgrad)" strokeWidth="3"
                  strokeDasharray={`${readiness} ${100 - readiness}`}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 100" }}
                  animate={{ strokeDasharray: `${readiness} ${100 - readiness}` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="rgrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-foreground">{readiness}%</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 w-full text-[10px] sm:text-xs text-center mt-1">
              <div className={`py-1 px-2 rounded-md ${pipeline.setup === "completed" ? "bg-green-500/10 text-green-400" : "bg-white/5 text-muted-foreground"}`}>Setup</div>
              <div className={`py-1 px-2 rounded-md ${pipeline.project === "completed" ? "bg-green-500/10 text-green-400" : "bg-white/5 text-muted-foreground"}`}>Project</div>
              <div className={`py-1 px-2 rounded-md ${pipeline.intro === "completed" ? "bg-green-500/10 text-green-400" : "bg-white/5 text-muted-foreground"}`}>Intro</div>
              <div className={`py-1 px-2 rounded-md ${pipeline.interview === "ready" ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground"}`}>Interview</div>
            </div>
          </div>

          {/* Resume Insights */}
          <div className="lg:col-span-2">
            <div className="glass-card-hover p-4 rounded-xl border border-border/50 space-y-3 h-full flex flex-col justify-center">
              <h3 className="text-base font-semibold text-foreground self-start mb-1">Resume Insights</h3>
              {skills.length > 0 ? (
                <>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Skills extracted from your resume</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {skills.map((s, i) => (
                            <span key={i} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {introScore !== null && (
                      <div className="flex items-start gap-2.5">
                        <Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Best intro score: {introScore}/100</p>
                          <p className="text-xs text-muted-foreground">Keep practising to improve your delivery</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2.5">
                      <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Next recommended step</p>
                        <p className="text-xs text-muted-foreground">
                          {pipeline.project === "locked" ? "Complete setup first to unlock project evaluation" :
                            pipeline.project === "ready" ? "Fill in your project explanation to generate a case study" :
                              pipeline.intro === "ready" ? "Start your Introduction Practice interview" :
                                pipeline.interview !== "locked" ? "You're ready — start the technical interview!" :
                                  "Great progress! Complete remaining modules."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={() => navigate("/preparation")}
                    className="flex items-center gap-1.5 text-primary text-xs font-semibold mt-2"
                  >
                    Continue Preparation <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No resume uploaded yet</p>
                  <p className="text-xs text-muted-foreground">Upload your JSON resume to get AI-powered insights</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/settings")}
                    className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-semibold hover:bg-primary/30 transition-colors"
                  >
                    Upload Resume
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Quick Actions */}
        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "View Progress Report", icon: <BarChart2 className="w-5 h-5" />, href: "/progress", color: "from-blue-500/20 to-blue-600/10" },
              { label: "Generate Study Guide", icon: <BookOpen className="w-5 h-5" />, href: "/study-guides", color: "from-purple-500/20 to-purple-600/10" },
              { label: "Start Mock Interview", icon: <Star className="w-5 h-5" />, href: "/interview-select", color: "from-amber-500/20 to-amber-600/10" },
            ].map((action, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.href)}
                className={`glass-card p-4 rounded-xl border border-border/50 text-left flex items-center gap-3 bg-gradient-to-br ${action.color} smooth-transition`}
              >
                <div className="p-2 rounded-lg bg-white/10 text-foreground">{action.icon}</div>
                <span className="font-semibold text-foreground text-sm">{action.label}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </motion.button>
            ))}
          </div>
        </motion.section>

      </motion.div>
    </MainLayout>
  );
}
