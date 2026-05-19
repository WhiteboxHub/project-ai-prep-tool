import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Trophy, Target, Zap, AlertCircle, BarChart3, Loader2, Sparkles, CheckCircle2, XCircle, Brain, Shield, MessageSquare } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { getFinalReport } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function Progress() {
  const { sessionId } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    getFinalReport(sessionId)
      .then((data) => setReport(data))
      .catch((err) => setError(err.message || "Failed to load report"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading your comprehensive progress report...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !report) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-foreground font-semibold">Report Not Available</p>
            <p className="text-sm text-muted-foreground">{error || "Complete an interview to see your progress."}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const r = report;
  const final = r.final_analysis || {};
  const introScore = r.intro_evals?.[0]?.score || r.intro_evals?.[0]?.total_score || final.communication_score || 0;
  const projectScore = r.project ? 85 : 0;
  
  // Aggregate interview scores
  const intEvals = r.interview_evals || [];
  const avgTechScore = final.technical_depth || (intEvals.length > 0 
    ? Math.round(intEvals.reduce((sum: number, ev: any) => sum + ev.score, 0) / intEvals.length * 10)
    : 0);
  const overallScore = final.overall_score || Math.round((introScore + projectScore + avgTechScore) / 3);

  // Radar data
  const radarData = [
    { subject: "Communication", A: final.communication_score || introScore || 60, fullMark: 100 },
    { subject: "Technical Depth", A: final.technical_depth || avgTechScore || 50, fullMark: 100 },
    { subject: "Problem Solving", A: final.problem_solving_score || (avgTechScore ? avgTechScore + 5 : 65), fullMark: 100 },
    { subject: "System Design", A: final.system_design_score || (avgTechScore ? avgTechScore - 5 : 55), fullMark: 100 },
    { subject: "Behavioral", A: final.behavioral_score || 75, fullMark: 100 },
  ];

  // Progression data
  const stageData = intEvals.map((ev: any, i: number) => ({
    name: `Q${i+1}`,
    score: ev.score * 10,
  }));

  const strengths = final.strengths || ["Clear articulation of past experience", "Demonstrated domain knowledge"];
  const weaknesses = final.weaknesses || ["Occasional lack of structure in multi-part answers"];
  const aiSuggestions = final.ai_suggestions || ["Use the STAR method for behavioral answers", "Deepen discussions around scaling bottlenecks"];
  const improvementAreas = final.improvement_areas || [];

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary animate-pulse" /> Executive Performance Analytics
          </h2>
          <p className="text-muted-foreground">Comprehensive multi-dimensional evaluation across all interview rounds</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Trophy className="w-16 h-16 text-primary" /></div>
            <p className="text-4xl font-extrabold text-foreground mb-1">{overallScore}%</p>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">Overall Executive Score</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-blue-500/10 to-transparent shadow-xl">
            <p className="text-3xl font-bold text-foreground mb-1">{introScore}%</p>
            <p className="text-sm text-muted-foreground font-semibold">Communication & Clarity</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-purple-500/10 to-transparent shadow-xl">
            <p className="text-3xl font-bold text-foreground mb-1">{avgTechScore}%</p>
            <p className="text-sm text-muted-foreground font-semibold">Technical Depth</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="glass-card p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-amber-500/10 to-transparent shadow-xl">
            <p className="text-3xl font-bold text-foreground mb-1">{strengths.length + aiSuggestions.length}</p>
            <p className="text-sm text-muted-foreground font-semibold">Actionable Insights</p>
          </motion.div>
        </div>

        {/* Qualitative Analysis Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-6 rounded-2xl border border-border/50 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400"><Brain className="w-5 h-5" /></div>
              <h3 className="text-lg font-semibold text-foreground">Problem Solving</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {final.problem_solving_ability || "Demonstrated structured logical breakdown when analyzing architectural challenges and trade-offs."}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="glass-card p-6 rounded-2xl border border-border/50 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400"><Shield className="w-5 h-5" /></div>
              <h3 className="text-lg font-semibold text-foreground">Leadership & Ownership</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {final.leadership_behavioral || "Exhibited strong ownership of technical deliverables and confident cross-functional collaboration signals."}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="glass-card p-6 rounded-2xl border border-border/50 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400"><MessageSquare className="w-5 h-5" /></div>
              <h3 className="text-lg font-semibold text-foreground">Confidence & Articulation</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {final.confidence_analysis || "Maintained authoritative pacing and strong articulation throughout multi-part technical explanations."}
            </p>
          </motion.div>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl border border-green-500/30 bg-green-500/5 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-400" /> Core Strengths
            </h3>
            <div className="space-y-3">
              {strengths.map((str: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-green-400 font-bold mt-0.5">✓</span>
                  <p className="text-sm text-foreground">{str}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl border border-red-500/30 bg-red-500/5 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-400" /> Areas for Refinement
            </h3>
            <div className="space-y-3">
              {weaknesses.map((w: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-red-400 font-bold mt-0.5">✕</span>
                  <p className="text-sm text-foreground">{w}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* AI Suggestions & Actionable Insights */}
        {aiSuggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 rounded-3xl border border-primary/40 bg-primary/5 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/20 text-primary"><Sparkles className="w-8 h-8" /></div>
              <div>
                <h3 className="text-xl font-bold text-foreground">AI Expert Recommendations</h3>
                <p className="text-sm text-muted-foreground">Personalized action items to elevate your next interview performance</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiSuggestions.map((s: string, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-primary/20 hover:border-primary/40 transition-colors flex items-start gap-3 shadow-md">
                  <span className="p-1 rounded-lg bg-primary/20 text-primary font-bold text-xs mt-0.5">★</span>
                  <p className="text-sm text-foreground leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl border border-border/50 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-6">Competency Radar</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Bar Chart */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl border border-border/50 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-6">Answer Score Trajectory</h3>
            <div className="h-[300px] w-full">
              {stageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="score" fill="url(#colorScore)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                        <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No interview data yet</div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
