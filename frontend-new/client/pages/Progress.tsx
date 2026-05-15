import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Trophy, Target, Zap, AlertCircle, BarChart3, Loader2 } from "lucide-react";
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
            <p className="text-muted-foreground">Loading your progress report...</p>
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
  const introScore = r.intro_evals?.[0]?.score || r.intro_evals?.[0]?.total_score || 0;
  const projectScore = r.project_evals?.[0]?.evaluation?.overall_score ? r.project_evals[0].evaluation.overall_score * 10 : 0;
  
  // Aggregate interview scores
  const intEvals = r.interview_evals || [];
  const avgTechScore = intEvals.length > 0 
    ? Math.round(intEvals.reduce((sum: number, ev: any) => sum + ev.score, 0) / intEvals.length * 10)
    : 0;

  // Radar data
  const radarData = [
    { subject: "Communication", A: introScore || 60, fullMark: 100 },
    { subject: "Technical", A: avgTechScore || 50, fullMark: 100 },
    { subject: "Experience", A: projectScore || 70, fullMark: 100 },
    { subject: "Problem Solving", A: avgTechScore ? avgTechScore + 5 : 65, fullMark: 100 },
    { subject: "System Design", A: avgTechScore ? avgTechScore - 5 : 55, fullMark: 100 },
  ];

  // Progression data
  const stageData = intEvals.map((ev: any) => ({
    name: `Stage ${ev.stage}`,
    score: ev.score * 10,
  }));

  // Gaps
  const gaps = new Set<string>();
  intEvals.forEach((ev: any) => {
    (ev.feedback || []).forEach((f: string) => gaps.add(f));
  });
  const uniqueGaps = Array.from(gaps).slice(0, 5);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Progress & Analytics</h2>
          <p className="text-muted-foreground">Track your performance across all interview modules</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-blue-500/10 to-transparent">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400"><Trophy className="w-6 h-6" /></div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{introScore}%</p>
            <p className="text-sm text-muted-foreground">Intro Delivery Score</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-purple-500/10 to-transparent">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400"><BarChart3 className="w-6 h-6" /></div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{avgTechScore}%</p>
            <p className="text-sm text-muted-foreground">Avg Technical Score</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-6 rounded-2xl border border-border/50 bg-gradient-to-br from-amber-500/10 to-transparent">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400"><Target className="w-6 h-6" /></div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{uniqueGaps.length}</p>
            <p className="text-sm text-muted-foreground">Areas for Improvement</p>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-6">Core Competencies</h3>
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
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl border border-border/50">
            <h3 className="text-lg font-semibold text-foreground mb-6">Stage Progression</h3>
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

        {/* Gap Analysis */}
        {uniqueGaps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-2xl border border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Gap Analysis</h3>
                <p className="text-sm text-muted-foreground">Areas identified for improvement</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uniqueGaps.map((gap, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-400 mt-1">•</span>
                    <p className="text-sm text-foreground leading-relaxed">{gap}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
