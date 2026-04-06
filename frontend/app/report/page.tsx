"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateReport, getLatestReport } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Brain, FileText, Loader, ChevronLeft, Download, RefreshCw,
  CheckCircle, XCircle, Star
} from "lucide-react";

export default function ReportPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    // Try to load existing report
    getLatestReport(sid)
      .then((d) => {
        if (d.content) setContent(d.content);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [router]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateReport(sessionId);
      setContent(data.content);
      setSummary(data.summary);
      toast.success("Final report generated!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Report generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interview_preparation_report.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getReadinessColor = (score: number) =>
    score >= 70 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="WBL Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
            WBL <span style={{ color: "var(--accent-light)" }}>PrepHub</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          {content && (
            <button className="btn-secondary" onClick={handleDownload} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
              <Download size={14} /> Download Report
            </button>
          )}
          <Link href="/dashboard">
            <button className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
              <ChevronLeft size={14} /> Dashboard
            </button>
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 38, marginBottom: 8 }}>
            Final Interview <span className="glow-text">Report</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 17 }}>
            Your comprehensive AI-generated interview preparation report based on all your activity.
          </p>
        </div>

        {/* Summary stats */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Intro Score", value: `${summary.intro_score}/100`, color: getReadinessColor(summary.intro_score), badge: summary.intro_status },
              { label: "Questions Answered", value: summary.questions_answered, color: "var(--accent-light)" },
              { label: "Avg Answer Score", value: `${summary.avg_answer_score}/10`, color: getReadinessColor(summary.avg_answer_score * 10) },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: 20 }}>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{s.label}</p>
                <p style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Outfit',sans-serif", color: s.color }}>{s.value}</p>
                {s.badge && (
                  <div className={`badge ${s.badge === "PASS" ? "badge-success" : "badge-danger"}`} style={{ marginTop: 6 }}>
                    {s.badge === "PASS" ? <CheckCircle size={10} /> : <XCircle size={10} />} {s.badge}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Generate button */}
        {!content && !fetching && (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "var(--accent-light)" }}>
              <Star size={32} />
            </div>
            <h2 style={{ fontSize: 26, marginBottom: 12 }}>Generate Your Final Report</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto 32px", lineHeight: 1.7 }}>
              AI will analyze all your activity — resume, extracted project, intro practice scores, and mock interview answers — to generate a comprehensive interview readiness report.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20, color: "var(--text-muted)", fontSize: 14 }}>
              {["Resume Analysis", "Project Skills", "Communication Eval", "Mock Interview Performance", "Readiness Score"].map(i => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle size={14} color="var(--accent-light)" /> {i}
                </span>
              ))}
            </div>
            <button
              id="generate-report-btn"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={loading}
              style={{ fontSize: 17, padding: "14px 40px", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {loading ? (
                <><div className="animate-spin" style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }}></div> Generating Report...</>
              ) : (
                <><FileText size={18} /> Generate Final Report</>
              )}
            </button>
          </div>
        )}

        {fetching && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div className="animate-spin" style={{ width: 40, height: 40, border: "3px solid rgba(139,92,246,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%", margin: "0 auto" }}></div>
          </div>
        )}

        {/* Report content */}
        {content && (
          <div className="card animate-fadeIn" style={{ padding: 48 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
              <h2 style={{ fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={22} color="var(--accent-light)" /> Interview Preparation Report
              </h2>
              <button
                className="btn-secondary"
                onClick={handleGenerate}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}
              >
                <RefreshCw size={13} /> Regenerate
              </button>
            </div>
            <div className="prose-dark">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
            <div style={{ marginTop: 40, padding: "20px 24px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12 }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center" }}>
                🎯 Keep practicing until your Interview Readiness Score reaches 80+. Return to any module to improve your scores.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                <Link href="/intro"><button className="btn-secondary" style={{ fontSize: 13, padding: "8px 20px" }}>Practice Intro</button></Link>
                <Link href="/case-study"><button className="btn-secondary" style={{ fontSize: 13, padding: "8px 20px" }}>Generate Case Study</button></Link>
                <Link href="/mock-interview"><button className="btn-secondary" style={{ fontSize: 13, padding: "8px 20px" }}>Redo Interview</button></Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
