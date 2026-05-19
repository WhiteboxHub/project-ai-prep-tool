import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Lightbulb, Zap, BarChart3, MessageCircle, BookOpen, ArrowRight } from "lucide-react";

interface ChatMessage { role: "ai" | "user"; text: string; }
interface StageEval { score: number; feedback: string[]; stage: number; }

interface CopilotPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  messages?: ChatMessage[];
  currentQuestion?: string;
  evals?: StageEval[];
  stage?: number;
  interviewType?: string;
}

export function CopilotPanel({ isOpen, onToggle, messages = [], currentQuestion = "", evals = [], stage = 1, interviewType = "technical" }: CopilotPanelProps) {
  const [activeTab, setActiveTab] = useState<"guidance" | "transcript" | "feedback">("guidance");

  const avgScore = evals.length > 0
    ? Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length * 10)
    : null;
  const latestFeedback = evals.length > 0 ? evals[evals.length - 1].feedback : [];

  return (
    <>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onToggle}
        className="fixed right-6 top-20 z-40 p-3 rounded-lg bg-gradient-to-br from-primary to-secondary text-white glow-primary-lg hover:shadow-2xl smooth-transition"
        title={isOpen ? "Close AI Copilot" : "Open AI Copilot"}>
        <Lightbulb className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed right-0 top-16 bottom-0 w-full sm:w-80 z-30 glass-card border-l border-border bg-card/80 backdrop-blur-xl overflow-hidden flex flex-col">

            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">AI Copilot</h3>
              <button onClick={onToggle} className="p-1 hover:bg-white/10 rounded-lg smooth-transition">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border/50 flex gap-2">
              {[
                { id: "guidance", label: "Guidance", icon: Lightbulb },
                { id: "transcript", label: "Transcript", icon: MessageCircle },
                { id: "feedback", label: "Feedback", icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold smooth-transition ${isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"}`}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === "guidance" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="glass-card p-4 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                      Stage {stage} — Current Question
                    </p>
                    <p className="text-sm text-foreground">{currentQuestion || "Waiting for question..."}</p>
                  </div>
                  <div className="glass-card p-4 rounded-lg border border-border/50 space-y-3">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        {interviewType === "intro" ? (
                          <>
                            <p className="text-xs font-semibold text-foreground">Intro Structure</p>
                            <p className="text-xs text-muted-foreground mt-1">Present → Past → Future Focus</p>
                          </>
                        ) : interviewType === "behavioral" || interviewType === "recruiter" ? (
                          <>
                            <p className="text-xs font-semibold text-foreground">STAR Method</p>
                            <p className="text-xs text-muted-foreground mt-1">Situation → Task → Action → Result</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-foreground">Technical Depth</p>
                            <p className="text-xs text-muted-foreground mt-1">Architecture → Tradeoffs → Impact</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-lg border border-border/50 space-y-2">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Tips</p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {interviewType === "intro" ? (
                        <>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Highlight your core identity</span></li>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Connect past work to this role</span></li>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Keep it concise (1-2 mins)</span></li>
                        </>
                      ) : interviewType === "behavioral" || interviewType === "recruiter" ? (
                        <>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Focus on your specific actions (I, not We)</span></li>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Quantify business impact</span></li>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Highlight leadership & ownership</span></li>
                        </>
                      ) : (
                        <>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Mention specific technologies</span></li>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Explain 'Why' behind decisions</span></li>
                          <li className="flex gap-2"><span className="text-primary">•</span><span>Discuss scalability & edge cases</span></li>
                        </>
                      )}
                    </ul>
                  </div>
                </motion.div>
              )}

              {activeTab === "transcript" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Transcript will appear here...</p>}
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`glass-card p-3 rounded-lg border border-border/50 ${msg.role === "user" ? "bg-primary/10" : ""}`}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{msg.role === "ai" ? "AI Interviewer" : "You"}</p>
                      <p className="text-sm text-foreground">{msg.text}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === "feedback" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {avgScore !== null && (
                    <div className="glass-card p-4 rounded-lg border border-border/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Avg Score</span>
                        <span className="text-sm font-bold text-primary">{avgScore}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${avgScore}%` }}
                          className="h-full bg-gradient-to-r from-primary to-secondary" />
                      </div>
                    </div>
                  )}
                  {latestFeedback.length > 0 && (
                    <div className="glass-card p-4 rounded-lg border border-border/50 space-y-2">
                      <p className="text-xs font-semibold text-foreground">Latest Feedback</p>
                      {latestFeedback.map((f, i) => (
                        <p key={i} className="text-xs text-muted-foreground">• {f}</p>
                      ))}
                    </div>
                  )}
                  {evals.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Feedback will appear after your first answer.</p>}
                </motion.div>
              )}
            </div>

            <div className="p-4 border-t border-border/50 bg-card/50">
              <motion.button whileHover={{ x: 4 }}
                className="w-full py-2 px-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 smooth-transition text-sm font-semibold flex items-center justify-center gap-2">
                View Full Analysis <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
