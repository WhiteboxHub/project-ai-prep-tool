"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFinalReport } from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  FileText, CheckCircle, ArrowLeft, RefreshCw, BarChart2, Star, TrendingUp, AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";

export default function FinalReportPage() {
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
    // Clear session, make them start from scratch or just navigate to setup to re-upload.
    // If they want to keep the same session ID, they can just go back to Dashboard and hit Retake.
    // Let's just send them to dashboard for now, where they can Retake individual modules.
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: "3px solid var(--bg-tertiary)", borderTopColor: "var(--accent)", borderRadius: "50%" }}></div>
      </div>
    );
  }

  // Calculate Aggregates
  let overallIntroScore = 0;
  if (reportData?.intro_evals?.length > 0) {
    overallIntroScore = Math.max(...reportData.intro_evals.map((e: any) => e.score));
  }

  let overallInterviewScore = 0;
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  
  if (reportData?.interview_evals?.length > 0) {
    const scores = reportData.interview_evals.map((e: any) => e.score);
    overallInterviewScore = Math.round(scores.reduce((a:number, b:number) => a+b, 0) / scores.length * 10);
    
    reportData.interview_evals.forEach((e: any) => {
       if (e.feedback && Array.isArray(e.feedback)) {
           weaknesses.push(...e.feedback);
       }
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar candidateName={candidateName} onLogout={handleLogout} />

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 24px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
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
              <h1 style={{ fontSize: 36, color: "var(--text-primary)", fontWeight: 700, margin: "0 0 12px" }}>
                Final <span className="glow-text">Progress Report</span>
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: 16, margin: 0 }}>
                Comprehensive breakdown of your AI interview performance.
              </p>
           </div>
           
           <button onClick={handleRetake} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw size={16} /> Retake Modules
           </button>
        </div>

        {/* Top Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 40 }}>
           
           {/* Intro Score */}
           <div className="card" style={{ padding: 24, border: "1px solid var(--border-accent)", background: "var(--gradient-card)", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
                 <Star size={32} />
              </div>
              <div>
                 <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>Intro Audio Score</p>
                 <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                   {overallIntroScore > 0 ? `${overallIntroScore}/100` : "N/A"}
                 </h2>
              </div>
           </div>

           {/* Interview Score */}
           <div className="card" style={{ padding: 24, border: "1px solid var(--border-accent)", background: "var(--gradient-card)", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>
                 <BarChart2 size={32} />
              </div>
              <div>
                 <p style={{ color: "var(--text-secondary)", fontSize: 13, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, margin: "0 0 4px" }}>Avg Interview Score</p>
                 <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                   {overallInterviewScore > 0 ? `${overallInterviewScore}/100` : "N/A"}
                 </h2>
              </div>
           </div>

        </div>

        {/* Extracted Profile */}
        {reportData?.project && (
        <div className="card" style={{ padding: 32, marginBottom: 40 }}>
           <h3 style={{ fontSize: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
             <FileText size={20} color="var(--accent)" /> Candidate Profile
           </h3>
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
             <div>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4 }}>Target Domain</p>
                <p style={{ color: "var(--text-primary)", fontWeight: 500 }}>{reportData.project[0]}</p>
             </div>
             <div>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4 }}>Role & Ownership</p>
                <p style={{ color: "var(--text-primary)", fontWeight: 500 }}>{reportData.project[5]}</p>
             </div>
             <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 4 }}>Core Skills</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                   {(() => {
                      try {
                        const skills = JSON.parse(reportData.project[2]);
                        return skills.map((s:string, i:number) => (
                           <span key={i} style={{ background: "var(--bg-tertiary)", padding: "4px 12px", borderRadius: 100, fontSize: 13, color: "var(--text-primary)" }}>{s}</span>
                        ));
                      } catch(e) {
                        return <span style={{ color: "var(--text-primary)" }}>{reportData.project[2]}</span>;
                      }
                   })()}
                </div>
             </div>
           </div>
        </div>
        )}

        {/* Gap Analysis */}
        {weaknesses.length > 0 && (
        <div className="card" style={{ padding: 32, border: "1px solid rgba(249, 115, 22, 0.3)", background: "rgba(249, 115, 22, 0.03)" }}>
           <h3 style={{ fontSize: 20, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
             <AlertTriangle size={20} color="#fb923c" /> Gap Analysis & Improvements
           </h3>
           <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from(new Set(weaknesses)).slice(0, 10).map((w: string, i) => (
                 <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", color: "var(--text-primary)", fontSize: 15, lineHeight: 1.5 }}>
                    <div style={{ marginTop: 6, width: 6, height: 6, borderRadius: "50%", background: "#fb923c", flexShrink: 0 }} />
                    {w}
                 </li>
              ))}
           </ul>
        </div>
        )}

      </div>
    </div>
  );
}
