"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getResumeSummary } from "@/lib/api";
import Link from "next/link";
import { Brain, FileText, Mic, BookOpen, ChevronRight, LogOut, User, BarChart } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [provider, setProvider] = useState("openai");
  const [wordCount, setWordCount] = useState(0);
  const [resumePreview, setResumePreview] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    const prov = localStorage.getItem("api_provider") || "openai";
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    setProvider(prov);

    getResumeSummary(sid)
      .then((data) => {
        setWordCount(data.word_count);
        setResumePreview(data.resume_text.slice(0, 400));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  const modules = [
    {
      href: "/case-study",
      icon: <BookOpen size={28} />,
      title: "Case Study Generator",
      desc: "Generate a detailed case study from your resume or pick a domain topic.",
      badge: "AI Agent",
      badgeClass: "badge-accent",
    },
    {
      href: "/intro",
      icon: <Mic size={28} />,
      title: "Intro Practice & Scoring",
      desc: "Record or type your introduction. Get scored on 8 parameters by AI.",
      badge: provider === "openai" ? "Audio + Text" : "Text Mode",
      badgeClass: "badge-success",
    },
    {
      href: "/mock-interview",
      icon: <BarChart size={28} />,
      title: "Mock Interview",
      desc: "AI generates 10 personalized interview questions. Answer each and get instant scores.",
      badge: "New",
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
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px", borderBottom: "1px solid var(--border)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Brain size={20} color="white" />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
            AI<span style={{ color: "var(--accent-light)" }}>Prep</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="badge badge-accent">
            <User size={12} /> Active Session
          </div>
          <button className="btn-secondary" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, marginBottom: 8 }}>
            Your Prep <span className="glow-text">Dashboard</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 17 }}>
            Session: <code style={{ color: "var(--accent-light)", fontSize: 13 }}>{sessionId.substring(0, 20)}...</code>
            &nbsp;·&nbsp;
            Provider: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
          </p>
        </div>

        {/* Stats row */}
        {!loading && wordCount > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
            {[
              { label: "Words in Resume", value: wordCount, icon: <FileText size={18} />, color: "var(--accent-light)" },
              { label: "AI Provider", value: provider.charAt(0).toUpperCase() + provider.slice(1), icon: <Brain size={18} />, color: "#10b981" },
              { label: "Status", value: "Ready to Prep", icon: <BarChart size={18} />, color: "#f59e0b" },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: s.color, marginBottom: 8 }}>
                  {s.icon}
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Resume preview */}
        {resumePreview && (
          <div className="card" style={{ padding: 28, marginBottom: 36 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={16} /> Resume Preview
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8, fontFamily: "monospace" }}>
              {resumePreview}...
            </p>
          </div>
        )}

        {/* Module cards */}
        <h2 style={{ fontSize: 26, marginBottom: 24 }}>Preparation Modules</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {modules.map((m, i) => (
            <Link key={i} href={m.href} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: 32, height: "100%", cursor: "pointer" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--accent-light)", marginBottom: 20,
                }}>
                  {m.icon}
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 19 }}>{m.title}</h3>
                  <div className={`badge ${m.badgeClass}`} style={{ flexShrink: 0, marginLeft: 8 }}>{m.badge}</div>
                </div>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 15, marginBottom: 20 }}>{m.desc}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-light)", fontSize: 13, fontWeight: 600 }}>
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
