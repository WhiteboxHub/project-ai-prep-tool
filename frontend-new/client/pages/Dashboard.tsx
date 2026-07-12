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

  // ── Robust skill extraction — handles WBL format (skills[{name, keywords}]) and many others
  const extractSkillsFromJson = (rj: any): string[] => {
    if (!rj || typeof rj !== "object") return [];

    // BFS deep search for any key containing "skill"
    const bfsFind = (root: any): string[] => {
      const queue: any[] = [root];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== "object") continue;
        for (const key of Object.keys(node)) {
          if (key.toLowerCase().includes("skill")) {
            const val = node[key];
            if (Array.isArray(val) && val.length > 0) {
              const found = val.flatMap((sk: any) => {
                if (typeof sk === "string") return sk ? [sk] : [];
                if (typeof sk === "object" && sk !== null) {
                  // Standard JSON Resume format: { name, keywords: [] }
                  let extracted: string[] = [];
                  if (Array.isArray(sk.keywords) && sk.keywords.length > 0) {
                    extracted = sk.keywords.filter((k: any) => typeof k === "string");
                  }
                  if (extracted.length === 0 && sk.name) {
                    extracted = [sk.name as string];
                  }
                  return extracted;
                }
                return [];
              }).filter(Boolean);
              if (found.length > 0) return found;
            } else if (val && typeof val === "object" && !Array.isArray(val)) {
              // WBL parsed resume format: { mlops: ["Model Deployment", ...], databases: ["MongoDB", ...] }
              const found: string[] = [];
              for (const subVal of Object.values(val)) {
                if (Array.isArray(subVal)) {
                  found.push(...subVal.filter((item: any) => typeof item === "string" && item.trim().length > 0));
                } else if (typeof subVal === "string" && subVal.trim().length > 0) {
                  found.push(subVal.trim());
                }
              }
              if (found.length > 0) return Array.from(new Set(found));
            }
          }
          if (typeof node[key] === "object" && node[key] !== null) {
            queue.push(node[key]);
          }
        }
      }
      return [];
    };

    return bfsFind(rj);
  };

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
          const extracted = extractSkillsFromJson(s.resume_json);
          setSkills(extracted.slice(0, 12));
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

  const getMotivationalMessage = () => {
    if (readiness === 100) {
      if (introScore && introScore < 80) {
        return "All setup steps are complete! Let's continue practicing mock interviews and refining your introduction to elevate your communication confidence.";
      }
      return "Your preparation environment is configured. Start simulating mock interviews to hone your technical articulation and system design responses.";
    }
    
    if (pipeline.interview === "ready") {
      return "You're set to begin mock interview practice. Launch a session to train under real-world simulation constraints.";
    }
    if (pipeline.intro === "ready") {
      return "Project analysis is finalized. We recommend practicing your introduction next to build pacing and professional delivery.";
    }
    if (pipeline.project === "ready") {
      return "Setup complete. Let's analyze your project architecture to structure your upcoming interview talking points.";
    }
    return `You're ${readiness}% of the way through setup. Complete the remaining steps to kickstart your mock practice sessions.`;
  };

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
      title: "Project Analysis",
      description: "Describe and evaluate your core project architecture",
      href: "/preparation",
      status: pipeline.project,
      icon: <Code2 className="w-5 h-5" />,
    },
    {
      id: "intro",
      title: "Intro Practice",
      description: "Record and evaluate your professional intro",
      href: "/intro-select",
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
            {getMotivationalMessage()}
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
              {summary?.resume_text ? (
                <>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Resume connected from WBL</p>
                        {skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {skills.map((s, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold tracking-wide shadow-[0_0_8px_rgba(59,130,246,0.15)] hover:bg-primary/20 transition-colors cursor-default">{s}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Skills data available in your resume — start practising to see insights.</p>
                        )}
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
                        <p className="text-sm font-semibold text-foreground">Recommended Next Focus</p>
                        <p className="text-xs text-muted-foreground">
                          {pipeline.project === "locked" ? "Connect your resume and setup API keys to activate your dashboard." :
                            pipeline.project === "ready" ? "Start project analysis to retrieve AI evaluation and construct architecture diagrams." :
                              pipeline.intro === "ready" ? "Practice and record your professional introduction to hone technical clarity." :
                                pipeline.interview === "ready" ? "Initiate a mock technical interview round to practice answering under pressure." :
                                  "Select a mock round to start practicing interactive technical scenarios."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      if (pipeline.interview === "ready") navigate("/interview-select");
                      else if (pipeline.intro === "ready") navigate("/intro-select");
                      else if (pipeline.project === "ready") navigate("/preparation");
                      else navigate("/settings");
                    }}
                    className="flex items-center gap-1.5 text-primary text-xs font-semibold mt-2 animate-pulse"
                  >
                    {pipeline.interview === "ready" ? "Begin Mock Interview" :
                     pipeline.intro === "ready" ? "Practice Introduction Again" :
                     pipeline.project === "ready" ? "Start Project Analysis" :
                     "Complete Setup"} <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No resume uploaded yet</p>
                  <p className="text-xs text-muted-foreground">Upload your JSON resume to your WBL profile to get AI-powered insights</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/settings")}
                    className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-semibold hover:bg-primary/30 transition-colors"
                  >
                    Go to Settings
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
              { label: "View Documents", icon: <BookOpen className="w-5 h-5" />, href: "/documents", color: "from-purple-500/20 to-purple-600/10" },
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