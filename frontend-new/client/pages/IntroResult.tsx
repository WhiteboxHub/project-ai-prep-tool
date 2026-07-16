import React from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Target, Lightbulb, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function IntroResult() {
  const location = useLocation();
  const result = location.state?.result;

  if (!result) {
    return <Navigate to="/intro-select" replace />;
  }

  const scoreNum = result.score !== undefined ? result.score : result.total_score !== undefined ? result.total_score : result.evaluation?.overall_score || 0;
  const hasPassed = scoreNum >= 75;
  const evalData = result.feedback || result.evaluation || result.raw_response || {};
  
  // The new LLM format sometimes nests the actual feedback lists inside an inner "feedback" object
  const innerFeedback = evalData.feedback || evalData;

  const strengths = innerFeedback.strengths || evalData.strengths || result.strengths || [];
  
  const technicalGapsRaw = innerFeedback.technical_gaps || evalData.technical_gaps || result.technical_gaps;
  let technicalGapsList: string[] = [];
  if (technicalGapsRaw) {
    if (Array.isArray(technicalGapsRaw)) {
      technicalGapsList = technicalGapsRaw;
    } else if (typeof technicalGapsRaw === "object") {
      Object.values(technicalGapsRaw).forEach((val: any) => {
        if (Array.isArray(val)) technicalGapsList.push(...val);
      });
    }
  }
  const commNotesRaw = innerFeedback.communication_notes || evalData.communication_notes || result.communication_notes || [];
  const commNotesList = Array.isArray(commNotesRaw) ? commNotesRaw : [];
  const legacyWeaknesses = innerFeedback.weaknesses || evalData.weaknesses || result.weaknesses || [];
  const improvement = innerFeedback.improvement_areas || evalData.improvement_areas || result.improvement_areas || [];
  
  const weaknesses = [...legacyWeaknesses, ...improvement, ...technicalGapsList, ...commNotesList];
  
  const suggestions = innerFeedback.ai_suggestions || evalData.ai_suggestions || result.ai_suggestions || [];
  const dimensions = innerFeedback.scores || evalData.scores || result.raw_response?.scores || result.evaluation?.scores || {};

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/intro-practice" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">Back to Practice</span>
          </Link>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Detailed Evaluation</h1>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6 items-start">
          
          {/* Left Column: Score & Breakdown */}
          <div className="space-y-6">
            {/* Score Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className={`glass-card p-5 rounded-2xl border flex items-center justify-between gap-6 ${hasPassed ? "border-green-500/30 bg-gradient-to-br from-green-500/10 to-transparent" : "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent"}`}
            >
              <div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-2.5 ${hasPassed ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30"}`}>
                  {hasPassed ? <><CheckCircle2 className="w-3 h-3" /> Passed</> : <><Target className="w-3 h-3" /> Needs Practice</>}
                </span>
                <p className="text-[10px] text-muted-foreground leading-relaxed">Overall performance score based on technical depth and delivery quality.</p>
              </div>
              <div className="text-right flex-shrink-0">
                <h2 className="text-4xl font-extrabold text-foreground tracking-tighter leading-none">{scoreNum}<span className="text-lg text-muted-foreground font-medium">/100</span></h2>
              </div>
            </motion.div>

            {/* Evaluation Breakdown */}
            {Object.keys(dimensions).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 rounded-2xl border border-border/50">
                <h3 className="font-bold text-sm text-foreground mb-4">Evaluation Breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(dimensions).map(([key, val]: [string, any]) => (
                    <div key={key} className="bg-card/40 border border-border/50 p-4 rounded-xl text-center shadow-sm">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        {key.replace(/_/g, " ")}
                      </p>
                      <div className="text-2xl font-black text-foreground">
                        {val}<span className="text-xs text-muted-foreground font-medium">/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Insights */}
          <div className="space-y-6">
            
            {/* Strengths & Improvements Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 rounded-2xl border border-border/50 flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-bold text-base">Strengths</h3>
                </div>
                {strengths.length > 0 ? (
                  <ul className="space-y-2.5 flex-1 pr-1">
                    {strengths.map((s: string, i: number) => (
                      <li key={i} className="flex gap-2.5 text-xs text-muted-foreground bg-green-500/5 p-3 rounded-lg border border-green-500/10 leading-relaxed">
                        <span className="text-green-500 flex-shrink-0 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-4">
                    <p className="text-xs text-muted-foreground italic">No specific strengths identified.</p>
                  </div>
                )}
              </motion.div>

              {/* Areas for Improvement */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 rounded-2xl border border-border/50 flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-amber-500">
                  <Target className="w-5 h-5" />
                  <h3 className="font-bold text-base">Improvement Areas</h3>
                </div>
                {weaknesses.length > 0 ? (
                  <ul className="space-y-2.5 flex-1 pr-1">
                    {Array.from(new Set(weaknesses)).map((w: any, i: number) => (
                      <li key={i} className="flex gap-2.5 text-xs text-muted-foreground bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 leading-relaxed">
                        <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-4">
                    <p className="text-xs text-muted-foreground italic">No specific weaknesses identified.</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* AI Suggestions */}
            {suggestions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 rounded-2xl border border-border/50 flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-primary">
                  <Lightbulb className="w-5 h-5" />
                  <h3 className="font-bold text-base">AI Suggestions</h3>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 pr-1">
                  {suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2.5 text-xs text-muted-foreground bg-primary/5 p-3.5 rounded-xl border border-primary/20 leading-relaxed">
                      <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
