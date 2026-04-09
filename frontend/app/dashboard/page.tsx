"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getResumeSummary, getResumeAnalytics } from "@/lib/api";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Brain,
  FileText,
  Mic,
  BookOpen,
  ChevronRight,
  LogOut,
  User,
  BarChart,
  Zap,
  CheckCircle,
  Video,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [provider, setProvider] = useState("openai");
  const [wordCount, setWordCount] = useState(0);
  const [resumePreview, setResumePreview] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    const prov = localStorage.getItem("api_provider") || "openai";
    if (!sid) {
      router.push("/setup");
      return;
    }
    setSessionId(sid);
    setProvider(prov);

    getResumeSummary(sid)
      .then((data) => {
        setWordCount(data.word_count);
        setResumePreview(data.resume_text.slice(0, 400));
        if (data.candidate_name) {
          localStorage.setItem("candidate_name", data.candidate_name);
          setCandidateName(data.candidate_name);
        } else {
          setCandidateName(localStorage.getItem("candidate_name") || "");
        }
        setLoading(false);
      })
      .catch(() => {
        setCandidateName(localStorage.getItem("candidate_name") || "");
        setLoading(false);
      });

    // Load rich analytics
    getResumeAnalytics(sid)
      .then((data) => {
        setAnalytics(data);
        setAnalyticsLoading(false);
      })
      .catch((err) => {
        console.error("Analytics fetch failed", err);
        setAnalyticsLoading(false);
      });
  }, [router]);

  const modules = [
    {
      href: "/interview",
      icon: <Video size={28} />,
      title: "6-Stage Realistic Interview",
      desc: "Face an AI Bot in a realistic environment. 6 rounds including intro, behavioral, technical, design, and coding.",
      badge: "Flagship",
      badgeClass: "badge-success",
      glow: true,
    },
    {
      href: "/case-study",
      icon: <BookOpen size={28} />,
      title: "Case Study Generator",
      desc: "Generate a detailed case study from your resume or pick a domain topic.",
      badge: "AI Agent",
      badgeClass: "badge-accent",
    },
    {
      href: "/report",
      icon: <FileText size={28} />,
      title: "Final Interview Report",
      desc: "Get a comprehensive AI report covering all your prep activity and interview readiness score.",
      badge: "Report",
      badgeClass: "badge-accent",
    },
    {
      href: "/setup",
      icon: <User size={28} />,
      title: "Update Setup",
      desc: "Upload a new version of your resume or change your API key configuration.",
      badge: "Setup",
      badgeClass: "badge-accent",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    localStorage.removeItem("api_provider");
    router.push("/");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <Navbar
        candidateName={candidateName}
        onLogout={handleLogout}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div
          style={{
            marginBottom: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: 40, marginBottom: 8 }}>
              Your AI <span className="glow-text">Prep Dashboard</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 17 }}>
              Next-Gen Enterprise Interview Preparation Setup
            </p>
          </div>
        </div>

        {/* Stats row */}
        {!loading && wordCount > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 40,
            }}
          >
            {[
              {
                label: "Words in Resume",
                value: wordCount,
                icon: <FileText size={18} />,
                color: "var(--accent-light)",
              },
              {
                label: "AI Backend",
                value: provider.charAt(0).toUpperCase() + provider.slice(1),
                icon: <Brain size={18} />,
                color: "#10b981",
              },
              {
                label: "Platform Status",
                value: "Enterprise Ready",
                icon: <CheckCircle size={18} />,
                color: "#f59e0b",
              },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: s.color,
                    marginBottom: 8,
                  }}
                >
                  {s.icon}
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: "'Outfit', sans-serif",
                    color: "var(--text-primary)",
                  }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Section */}
        {analyticsLoading ? (
          <div
            className="card"
            style={{
              padding: 40,
              textAlign: "center",
              marginBottom: 36,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              className="animate-spin"
              style={{
                width: 24,
                height: 24,
                border: "3px solid rgba(139,92,246,0.2)",
                borderTopColor: "var(--accent-light)",
                borderRadius: "50%",
                marginBottom: 16,
              }}
            ></div>
            <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
              Analyzing your resume keywords, projects, and insights...
            </p>
          </div>
        ) : analytics ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: 24,
              marginBottom: 40,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Projects */}
              <div className="card" style={{ padding: 28, flex: 1 }}>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    marginBottom: 16,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <BarChart size={18} color="var(--accent-light)" /> Extracted
                  Timeline
                </h3>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {analytics.projects && analytics.projects.length > 0 && (
                    <div
                      style={{
                        background: "rgba(124,58,237,0.12)",
                        border: "1px solid rgba(139,92,246,0.35)",
                        padding: 14,
                        borderRadius: 12,
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Primary project focus is derived from your first major resume project and used for interview guidance.
                    </div>
                  )}
                  {analytics.projects && analytics.projects.length > 0 ? (
                    analytics.projects.map((proj: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          padding: 16,
                          borderRadius: 12,
                          borderLeft: "3px solid var(--accent-light)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 6,
                          }}
                        >
                          <h4 style={{ fontSize: 15, fontWeight: 600 }}>
                            {proj.name}
                          </h4>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              background: "rgba(255,255,255,0.1)",
                              padding: "2px 8px",
                              borderRadius: 10,
                            }}
                          >
                            {proj.date}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 14,
                            color: "var(--text-secondary)",
                            lineHeight: 1.5,
                          }}
                        >
                          {proj.desc}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                      No clear timeline/projects identified.
                    </p>
                  )}
                </div>
              </div>

              {/* Sample Intro */}
              <div className="card" style={{ padding: 28 }}>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 12,
                  }}
                >
                  💡 Suggested AI Intro
                </h3>
                <p
                  style={{
                    color: "var(--text-primary)",
                    fontSize: 15,
                    lineHeight: 1.7,
                    background: "rgba(139,92,246,0.1)",
                    padding: 16,
                    borderRadius: 12,
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                >
                  "{analytics.sample_intro}"
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Keywords map */}
              <div className="card" style={{ padding: 28 }}>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 16,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Zap size={16} color="var(--success)" /> Detected Keywords
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {analytics.keywords && analytics.keywords.length > 0 ? (
                    analytics.keywords.map((kw: string, i: number) => (
                      <span
                        key={i}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981",
                          borderRadius: 16,
                          fontSize: 13,
                          fontWeight: 500,
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                        }}
                      >
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      No keywords extracted yet. Re-upload resume for richer analysis.
                    </span>
                  )}
                </div>
              </div>

              {/* Improvements */}
              <div className="card" style={{ padding: 28, flex: 1 }}>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 16,
                    color: "var(--warning)",
                  }}
                >
                  Resume Improvement Areas
                </h3>
                <ul
                  style={{
                    paddingLeft: 16,
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {analytics.improvements &&
                    analytics.improvements.map((imp: string, i: number) => (
                      <li key={i} style={{ marginBottom: 8 }}>
                        {imp}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {/* Module cards (Secondary Tools) */}
        <h2 style={{ fontSize: 24, marginBottom: 24 }}>
          Additional AI Practice Tools
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {modules.map((m, i) => (
            <Link key={i} href={m.href} style={{ textDecoration: "none" }}>
              <div
                className={`card ${m.glow ? "glow-purple" : ""}`}
                style={{
                  padding: 32,
                  height: "100%",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-4px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: m.glow
                      ? "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1))"
                      : "rgba(139,92,246,0.12)",
                    border: m.glow
                      ? "1px solid rgba(139,92,246,0.6)"
                      : "1px solid rgba(139,92,246,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-light)",
                    marginBottom: 20,
                    boxShadow: m.glow
                      ? "0 0 15px rgba(139,92,246,0.4)"
                      : "none",
                  }}
                >
                  {m.icon}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ fontSize: 19 }}>{m.title}</h3>
                  <div
                    className={`badge ${m.badgeClass}`}
                    style={{ flexShrink: 0, marginLeft: 8 }}
                  >
                    {m.badge}
                  </div>
                </div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    fontSize: 15,
                    marginBottom: 20,
                  }}
                >
                  {m.desc}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--accent-light)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Open Module <ChevronRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
