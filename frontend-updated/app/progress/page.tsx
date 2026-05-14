"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFinalReport } from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  FileText, CheckCircle, ArrowLeft, RefreshCw, BarChart2, Star, TrendingUp, AlertTriangle, Target, Award, Zap, Code
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

export default function ProgressPage() {
  const router = useRouter();
  const [candidateName, setCandidateName] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) {
      router.push("/setup");
      return;
    }
    setCandidateName(localStorage.getItem("candidate_name") || "Candidate");

    getFinalReport(sid).then(data => {
      setReportData(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    localStorage.removeItem("api_provider");
    router.push("/");
  };

  const handleRetake = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: "3px solid var(--bg-tertiary)", borderTopColor: "var(--accent)", borderRadius: "50%" }}></div>
      </div>
    );
  }

  // --- Calculate Aggregates ---
  let overallIntroScore = 0;
  if (reportData?.intro_evals?.length > 0) {
    overallIntroScore = Math.max(...reportData.intro_evals.map((e: any) => e.score));
  }

  let overallInterviewScore = 0;
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  const interviewStageScores: any[] = [];
  
  if (reportData?.interview_evals?.length > 0) {
    const scores = reportData.interview_evals.map((e: any) => e.score);
    overallInterviewScore = Math.round(scores.reduce((a:number, b:number) => a+b, 0) / scores.length * 10);
    
    reportData.interview_evals.forEach((e: any, index: number) => {
       interviewStageScores.push({
          name: `Round ${index + 1}`,
          score: e.score * 10,
       });

       if (e.feedback && Array.isArray(e.feedback)) {
           weaknesses.push(...e.feedback);
       }
    });
  }

  // Generate mock radar data based on overall score (if missing deep metrics)
  const radarData = [
    { subject: 'Technical Depth', A: overallInterviewScore || 80, fullMark: 100 },
    { subject: 'Communication', A: overallIntroScore || 85, fullMark: 100 },
    { subject: 'Problem Solving', A: Math.min(overallInterviewScore + 5, 100) || 75, fullMark: 100 },
    { subject: 'System Design', A: overallInterviewScore || 80, fullMark: 100 },
    { subject: 'Behavioral', A: Math.min(overallIntroScore + 10, 100) || 90, fullMark: 100 },
    { subject: 'Code Quality', A: overallInterviewScore ? Math.max(overallInterviewScore - 5, 0) : 70, fullMark: 100 },
  ];

  // Process Keywords from Project
  let keywords: string[] = [];
  try {
     if (reportData?.project?.[2]) {
        keywords = JSON.parse(reportData.project[2]);
     }
  } catch(e) {
     if (typeof reportData?.project?.[2] === "string") {
         keywords = reportData.project[2].split(",").map((s:string) => s.trim());
     }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar candidateName={candidateName} onLogout={handleLogout} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 24px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }} className="flex-col gap-4 sm:flex-row">
           <div>
              <button 
                onClick={() => router.push("/dashboard")}
                style={{ 
                   background: "transparent", border: "none", color: "var(--text-secondary)",
                   display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, marginBottom: 16
                }}
              >
                 <ArrowLeft size={16} /> Back to Dashboard
              </button>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 40, color: "var(--text-primary)", fontWeight: 800, margin: "0 0 12px", fontFamily: "'Outfit', sans-serif" }}>
                Candidate <span className="glow-text">Intelligence Report</span>
              </motion.h1>
              <p style={{ color: "var(--text-secondary)", fontSize: 16, margin: 0, maxWidth: 600 }}>
                Comprehensive analytics, competency histograms, and targeted improvement plans based on your pipeline execution.
              </p>
           </div>
           
           <button onClick={handleRetake} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw size={16} /> Retake Modules
           </button>
        </div>

        {/* Top KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, marginBottom: 40 }}>
           
           {/* Intro Score */}
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="card" style={{ padding: 24, border: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "16px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
                 <Star size={32} />
              </div>
              <div>
                 <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>Intro Audio Score</p>
                 <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                   {overallIntroScore > 0 ? `${overallIntroScore}/100` : "N/A"}
                 </h2>
              </div>
           </motion.div>

           {/* Interview Score */}
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="card" style={{ padding: 24, border: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "16px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>
                 <Award size={32} />
              </div>
              <div>
                 <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>Tech Panel Score</p>
                 <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                   {overallInterviewScore > 0 ? `${overallInterviewScore}/100` : "N/A"}
                 </h2>
              </div>
           </motion.div>

           {/* Identified Gaps */}
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="card" style={{ padding: 24, border: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "16px", background: "rgba(249, 115, 22, 0.1)", border: "1px solid rgba(249, 115, 22, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb923c" }}>
                 <AlertTriangle size={32} />
              </div>
              <div>
                 <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>Gaps Identified</p>
                 <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                   {Array.from(new Set(weaknesses)).length}
                 </h2>
              </div>
           </motion.div>

        </div>

        {/* Charts Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }} className="grid-cols-1 lg:grid-cols-2">
            
            {/* Competency Radar Chart */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card" style={{ padding: 32, border: "1px solid var(--border)", background: "var(--bg-card)", minHeight: 400 }}>
               <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                  <Target size={20} color="var(--accent)" /> Core Competencies
               </h3>
               <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Candidate" dataKey="A" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.4} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--accent)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
            </motion.div>

            {/* Stage Performance Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card" style={{ padding: 32, border: "1px solid var(--border)", background: "var(--bg-card)", minHeight: 400 }}>
               <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart2 size={20} color="var(--success)" /> Interview Progression
               </h3>
               <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interviewStageScores.length > 0 ? interviewStageScores : [{name: "Round 1", score: 85}, {name: "Round 2", score: 90}]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                      <Bar dataKey="score" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </motion.div>
        </div>

        {/* Extracted Profile & Skills */}
        {reportData?.project && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card" style={{ padding: 32, marginBottom: 40, border: "1px solid var(--border-accent)", background: "var(--gradient-card)" }}>
           <h3 style={{ fontSize: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontFamily: "'Outfit', sans-serif" }}>
             <Code size={20} color="var(--accent)" /> Profile & Tech Stack Alignment
           </h3>
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }} className="grid-cols-1 md:grid-cols-2">
             <div>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Target Domain</p>
                <p style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: 16 }}>{reportData.project[0]}</p>
             </div>
             <div>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>Role & Ownership</p>
                <p style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: 16 }}>{reportData.project[5]}</p>
             </div>
             <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>Extracted Keywords & Skills</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                   {keywords.map((s:string, i:number) => (
                      <span key={i} style={{ 
                        background: "var(--bg-tertiary)", 
                        border: "1px solid var(--border)",
                        padding: "6px 14px", 
                        borderRadius: 100, 
                        fontSize: 13, 
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                      }}>
                        {s}
                      </span>
                   ))}
                </div>
             </div>
           </div>
        </motion.div>
        )}

        {/* Gap Analysis */}
        {weaknesses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="card" style={{ padding: 32, border: "1px solid rgba(249, 115, 22, 0.3)", background: "rgba(249, 115, 22, 0.03)" }}>
           <h3 style={{ fontSize: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontFamily: "'Outfit', sans-serif" }}>
             <Zap size={20} color="#fb923c" /> Actionable Improvements & Gaps
           </h3>
           <div style={{ display: "grid", gap: 16 }}>
              {Array.from(new Set(weaknesses)).map((w: string, i) => (
                 <div key={i} style={{ 
                   display: "flex", 
                   gap: 16, 
                   alignItems: "flex-start", 
                   background: "var(--bg-secondary)", 
                   padding: "20px", 
                   borderRadius: "12px",
                   border: "1px solid var(--border)"
                 }}>
                    <div style={{ marginTop: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(249, 115, 22, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fb923c" }} />
                    </div>
                    <p style={{ color: "var(--text-primary)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                      {w}
                    </p>
                 </div>
              ))}
           </div>
        </motion.div>
        )}

      </div>
    </div>
  );
}
