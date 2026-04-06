"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brain, Zap, Mic, FileText, ArrowRight, CheckCircle, Star } from "lucide-react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem("session_id")) {
      window.location.href = "/dashboard";
    }
  }, []);

  const features = [
    {
      icon: <FileText size={28} />,
      title: "Resume Case Study Generator",
      desc: "AI extracts your best projects and turns them into interview-ready case studies with problem statements, architecture, and Q&A.",
    },
    {
      icon: <Mic size={28} />,
      title: "Intro Practice & AI Scoring",
      desc: "Record your self-introduction, get it transcribed, and receive a detailed AI evaluation score across fluency, grammar, and confidence.",
    },
    {
      icon: <Brain size={28} />,
      title: "Domain Case Studies",
      desc: "Generate case studies for common domains like RAG systems, chatbots, recommendation engines, and more — instantly.",
    },
    {
      icon: <Zap size={28} />,
      title: "Your Own API Key",
      desc: "Use your OpenAI or Gemini API key. Zero cost on our side — 100% your control. Private and secure.",
    },
  ];

  const steps = [
    { num: "01", title: "Connect Your API Key", desc: "Enter your OpenAI or Gemini key. We validate it instantly." },
    { num: "02", title: "Upload Your Resume", desc: "Upload a PDF or DOCX. Our parser extracts your projects automatically." },
    { num: "03", title: "Generate Case Studies", desc: "One click and AI builds a full interview case study from your work." },
    { num: "04", title: "Practice Your Intro", desc: "Record → Transcribe → Score. Repeat until you pass." },
  ];

  return (
    <div className="hero-bg" style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,10,15,0.8)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src="/logo.png" alt="WBL Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20 }}>
            WBL <span style={{ color: "var(--accent-light)" }}>PrepHub</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/setup">
            <button className="btn-primary" style={{ padding: "10px 24px" }}>
              Get Started — Free
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ textAlign: "center", padding: "100px 24px 80px", position: "relative" }}>
        <div className={mounted ? "animate-fadeIn" : ""} style={{ opacity: mounted ? 1 : 0 }}>
          <div className="badge badge-accent" style={{ justifyContent: "center", marginBottom: 24, display: "inline-flex" }}>
            <Zap size={12} /> AI-Powered Interview Preparation
          </div>
          <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.1, marginBottom: 24, maxWidth: 800, margin: "0 auto 24px" }}>
            Turn Your Resume Into{" "}
            <span className="glow-text">Interview Mastery</span>
          </h1>
          <p style={{
            fontSize: 20, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto 48px", lineHeight: 1.7
          }}>
            Upload your resume → AI generates case studies, mock interview questions, evaluates your spoken intro, and tracks your progress.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/setup">
              <button className="btn-primary" style={{ fontSize: 17, padding: "15px 36px", display: "flex", alignItems: "center", gap: 8 }}>
                Start Preparing Now <ArrowRight size={18} />
              </button>
            </Link>
          </div>
          {/* Trust indicators */}
          <div style={{ marginTop: 56, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {["Your API Key", "No data stored externally", "OpenAI + Gemini"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 14 }}>
                <CheckCircle size={16} color="var(--success)" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: 38, marginBottom: 16 }}>Everything You Need to Win Interviews</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 56, fontSize: 18 }}>
          Four powerful AI tools in one platform
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="card"
              style={{ padding: 32, animationDelay: `${i * 0.1}s` }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent-light)", marginBottom: 20,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 19, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 15 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: 38, marginBottom: 56 }}>How It Works</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: i < steps.length - 1 ? 40 : 0 }}>
              <div style={{
                minWidth: 56, height: 56, borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 16, color: "white",
                flexShrink: 0,
              }}>
                {s.num}
              </div>
              <div style={{ paddingTop: 10 }}>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: "center", padding: "80px 24px 120px" }}>
        <div className="card glow-purple" style={{ maxWidth: 600, margin: "0 auto", padding: "56px 48px", background: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(124,58,237,0.05) 100%)" }}>
          <Star size={32} color="var(--accent-light)" style={{ marginBottom: 20 }} />
          <h2 style={{ fontSize: 36, marginBottom: 16 }}>Ready to Ace Your Interview?</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 17, lineHeight: 1.7 }}>
            Start free. Bring your own API key. No hidden costs.
          </p>
          <Link href="/setup">
            <button className="btn-primary" style={{ fontSize: 17, padding: "15px 40px" }}>
              Get Started Now
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border)", padding: "24px 48px", textAlign: "center",
        color: "var(--text-muted)", fontSize: 14,
      }}>
        © 2026 WBL PrepHub — Built with AI for candidates who want to succeed.
      </footer>
    </div>
  );
}
