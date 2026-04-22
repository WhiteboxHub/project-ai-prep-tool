"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateReport, getLatestReport } from "@/lib/api";
import Navbar from "@/components/Navbar";
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
  const [candidateName, setCandidateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    setCandidateName(localStorage.getItem("candidate_name") || "");
    getLatestReport(sid)
      .then((d) => {
        if (d.content) setContent(d.content);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    router.push("/");
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateReport(sessionId);
      setContent(data.content);
      setSummary(data.summary);
      toast.success("Report generated!");
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
      <Navbar candidateName={candidateName} onLogout={handleLogout} />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontSize: 36,
            marginBottom: 8,
            color: "var(--text-primary)",
            fontWeight: 700,
          }}>
            Final Interview <span className="glow-text">Report</span>
          </h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: 15,
            lineHeight: 1.6,
          }}>
            Comprehensive AI-generated analysis of your interview readiness based on all your practice sessions.
          </p>
        </div>

        {/* Summary stats */}
        {summary && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}>
            {[
              { label: "Intro Score", value: `${summary.intro_score}/100`, color: getReadinessColor(summary.intro_score), badge: summary.intro_status },
              { label: "Questions Answered", value: summary.questions_answered, color: "var(--accent)" },
              { label: "Avg Answer Score", value: `${summary.avg_answer_score}/10`, color: getReadinessColor(summary.avg_answer_score * 10) },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: 24 }}>
                <p style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}>
                  {s.label}
                </p>
                <p style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "'Outfit', sans-serif",
                  color: s.color,
                  marginBottom: 8,
                }}>
                  {s.value}
                </p>
                {s.badge && (
                  <div className={`badge ${s.badge === "PASS" ? "badge-success" : "badge-danger"}`} style={{ display: "inline-flex" }}>
                    {s.badge === "PASS" ? <CheckCircle size={12} /> : <XCircle size={12} />} {s.badge}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Generate button */}
        {!content && !fetching && (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(79, 70, 229, 0.1)",
              border: "1px solid rgba(79, 70, 229, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: "var(--accent)",
            }}>
              <Star size={32} />
            </div>
            <h2 style={{
              fontSize: 26,
              marginBottom: 12,
              color: "var(--text-primary)",
              fontWeight: 700,
            }}>Generate Final Report</h2>
            <p style={{
              color: "var(--text-secondary)",
              maxWidth: 500,
              margin: "0 auto 32px",
              lineHeight: 1.7,
              fontSize: 15,
            }}>
              Get a comprehensive analysis of your interview readiness across resume, projects, communication, and interview performance.
            </p>
            <div style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: 24,
              color: "var(--text-secondary)",
              fontSize: 13,
            }}>
              {["Resume Analysis", "Project Skills", "Communication", "Performance", "Readiness Score"].map(i => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle size={14} color="var(--success)" /> {i}
                </span>
              ))}
            </div>
            <button
              id="generate-report-btn"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={loading}
              style={{
                fontSize: 15,
                padding: "11px 24px",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin" style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%"
                  }}></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={16} /> Generate Report
                </>
              )}
            </button>
          </div>
        )}

        {fetching && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div className="animate-spin" style={{
              width: 40,
              height: 40,
              border: "3px solid var(--bg-tertiary)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              margin: "0 auto"
            }}></div>
          </div>
        )}

        {/* Report content */}
        {content && (
          <div className="card animate-fadeIn" style={{ padding: 40 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 32,
              paddingBottom: 24,
              borderBottom: "1px solid var(--border)",
            }}>
              <h2 style={{
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--text-primary)",
                fontWeight: 700,
                margin: 0,
              }}>
                <FileText size={20} color="var(--accent)" /> Interview Report
              </h2>
              <button
                className="btn-secondary"
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                }}
              >
                <RefreshCw size={13} /> Regenerate
              </button>
            </div>

            {content && (
              <button
                onClick={handleDownload}
                className="btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  marginBottom: 24,
                }}
              >
                <Download size={13} /> Download
              </button>
            )}

            <div className="prose-dark">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>

            <div style={{
              marginTop: 40,
              padding: "20px 24px",
              background: "rgba(79, 70, 229, 0.06)",
              border: "1px solid rgba(79, 70, 229, 0.15)",
              borderRadius: 12,
            }}>
              <p style={{
                color: "var(--text-secondary)",
                fontSize: 14,
                textAlign: "center",
                margin: "0 0 16px 0",
                fontWeight: 500,
              }}>
                Continue improving your interview readiness. Target an 80+ score.
              </p>
              <div style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
              }}>
                <Link href="/intro">
                  <button className="btn-secondary" style={{ fontSize: 13, padding: "8px 16px" }}>
                    Practice Intro
                  </button>
                </Link>
                <Link href="/case-study">
                  <button className="btn-secondary" style={{ fontSize: 13, padding: "8px 16px" }}>
                    Case Study
                  </button>
                </Link>
                <Link href="/mock-interview">
                  <button className="btn-secondary" style={{ fontSize: 13, padding: "8px 16px" }}>
                    Redo Interview
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
