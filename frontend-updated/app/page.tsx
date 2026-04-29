"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Brain, Zap, Mic, FileText, ArrowRight, CheckCircle, Star, Loader2 } from "lucide-react";
import { syncWithWbl } from "@/lib/api";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      const query = new URLSearchParams(window.location.search);
      const prepToken = query.get("prep_token");

      if (prepToken) {
        setIsAuthenticating(true);
        syncWithWbl(prepToken)
          .then((data) => {
            if (data.session_id) {
              localStorage.setItem("session_id", data.session_id);
              localStorage.setItem("candidate_name", data.candidate_name || "");
              localStorage.setItem("login_source", "sso");
          // Redirect to dashboard
          window.location.href = "/dashboard";
        }
      })
      .catch((err) => {
        console.error("Failed to sync with WBL:", err);
        setIsAuthenticating(false);
      });
    return;
  }
}

// Normal session check
const sid = localStorage.getItem("session_id");
const storedName = localStorage.getItem("candidate_name") || "";
setCandidateName(storedName);
setHasSession(Boolean(sid));

if (sid) {
  window.location.href = "/dashboard";
} else {
  setIsAuthenticating(false);
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
    { num: "01", title: "Setup", desc: "Connect API tools and upload your core Resume." },
    { num: "02", title: "Project Explanation", desc: "Answer questions about your project and get AI feedback on your completeness." },
    { num: "03", title: "Use Case Deep Dive", desc: "List example queries and system logic to generate a full case study." },
    { num: "04", title: "Intro Voice Test", desc: "Record your introduction and pass the AI speech-to-text benchmark." },
    { num: "05", title: "Mock Interviews", desc: "Face dynamic AI questions based strictly on your project and case study." },
  ];

  return (
    <div className="hero-bg" style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--bg-primary)",
      }}>
        <div style={{
          maxWidth: "1280px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "var(--gradient-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 18 }}>W</span>
            </div>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
              WBL <span style={{ color: "var(--accent)" }}>PrepHub</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {hasSession && candidateName && (
              <span style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 }}>
                {candidateName}
              </span>
            )}
            {!isAuthenticating && (
              <Link href="/setup">
                <button className="btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}>
                  Get Started
                </button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section-hero">
        <div className={mounted ? "animate-fadeIn" : ""} style={{ opacity: mounted ? 1 : 0 }}>
          <div className="badge badge-accent" style={{ justifyContent: "center", marginBottom: 24, display: "inline-flex" }}>
            <Zap size={12} /> AI-Powered Interview Preparation
          </div>
          <h1 className="text-hero" style={{
            marginBottom: 24,
            maxWidth: 800,
            margin: "0 auto 24px",
          }}>
            Welcome to WBL <span className="glow-text">PrepHub</span>
          </h1>
          <p className="text-subtitle" style={{
            maxWidth: 600,
            margin: "0 auto 48px",
            fontSize: 18,
          }}>
            Upload your resume → AI generates case studies, mock interview questions, evaluates your spoken intro, and tracks your progress.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", minHeight: 48 }}>
            {isAuthenticating ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 28px", color: "var(--accent)" }}>
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontWeight: 600 }}>Loading your secure session...</span>
              </div>
            ) : (
              <Link href="/setup">
                <button className="btn-primary" style={{
                  fontSize: 15,
                  padding: "12px 28px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  Start Preparing Now <ArrowRight size={18} />
                </button>
              </Link>
            )}
          </div>
          {/* Trust indicators */}
              <div style={{ marginTop: 48, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
                {["Your API Key", "No data stored externally", "OpenAI + Gemini"].map(t => (
                  <div key={t} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}>
                    <CheckCircle size={16} color="var(--success)" /> {t}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="section-standard">
            <h2 className="text-h2" style={{
              textAlign: "center",
              marginBottom: 12,
            }}>Everything You Need to Win Interviews</h2>
            <p className="text-subtitle" style={{
              textAlign: "center",
              marginBottom: 48,
            }}>
              Four powerful AI tools in one platform
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}>
              {features.map((f, i) => (
                <div
                  key={i}
                  className="card"
                  style={{ padding: 32 }}
                >
                  <div className="icon-container icon-container-md" style={{
                    marginBottom: 20,
                  }}>
                    {f.icon}
                  </div>
                  <h3 className="text-h3">{f.title}</h3>
                  <p className="text-description">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works */}
          <section className="section-narrow">
            <h2 className="text-h2" style={{
              textAlign: "center",
              marginBottom: 48,
            }}>How It Works</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {steps.map((s, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: 24,
                  alignItems: "flex-start",
                  marginBottom: i < steps.length - 1 ? 40 : 0,
                }}>
                  <div className="circle-badge">
                    {s.num}
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <h3 className="text-h3" style={{ marginBottom: 6 }}>{s.title}</h3>
                    <p className="text-description">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="section-cta">
            <div className="card" style={{
              maxWidth: 600,
              margin: "0 auto",
              padding: "48px 40px",
              background: "var(--gradient-card)",
              display: isAuthenticating ? "none" : "block",
            }}>
              <Star size={32} color="var(--accent)" style={{ margin: "0 auto 20px", display: "block" }} />
              <h2 className="text-h2" style={{
                fontSize: 32,
                marginBottom: 16,
              }}>Ready to Ace Your Interview?</h2>
              <p className="text-subtitle" style={{
                marginBottom: 32,
              }}>
                Start free. Bring your own API key. No hidden costs.
              </p>
              <Link href="/setup">
                <button className="btn-primary" style={{
                  fontSize: 15,
                  padding: "12px 28px",
                }}>
                  Get Started Now
                </button>
              </Link>
            </div>
          </section>


      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "24px 24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: 13,
        fontWeight: 400,
      }}>
        © 2026 WBL PrepHub — Built with AI for candidates who want to succeed.
      </footer>
    </div>
  );
}
