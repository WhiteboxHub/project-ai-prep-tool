"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateCaseStudy, getTopics, getCaseStudyHistory, generateCaseStudyFromTemplate, getLatestProject, extractProject, saveProjectBrief } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import Link from "next/link";
import { Brain, BookOpen, Loader, ChevronLeft, Sparkles, Clock, RefreshCw } from "lucide-react";

export default function CaseStudyPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [generationType, setGenerationType] = useState<"resume" | "domain">("resume");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<number | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    getTopics().then((d) => setTopics(d.topics)).catch(() => {});
    getCaseStudyHistory(sid).then((d) => setHistory(d.case_studies || [])).catch(() => {});
  }, [router]);

  const handleGenerate = async () => {
    setLoading(true);
    setContent("");
    setViewingHistoryId(null);
    try {
      let data;
      if (generationType === "domain") {
        const topicStr = selectedTopic || topics[0] || "";
        let templateKey = "mlops";
        if (topicStr.toLowerCase().includes("rag")) templateKey = "rag";
        else if (topicStr.toLowerCase().includes("agentic")) templateKey = "agentic";

        let projectDetails = "";
        try {
          const lp = await getLatestProject(sessionId);
          if (lp && lp.project_details) {
            projectDetails = lp.project_details;
          } else {
            toast.loading("Extracting project from resume...", { id: "extract" });
            const ep = await extractProject(sessionId);
            projectDetails = ep.project_details;
            toast.dismiss("extract");
          }
        } catch (err) {
          toast.dismiss("extract");
          throw new Error("Failed to extract project from resume. Did you upload one?");
        }

        const inferred = projectDetails.slice(0, 220).replace(/\s+/g, " ");
        const ok = window.confirm(
          `This is what I understood from your first project:\n\n${inferred}...\n\nProceed with this context?`
        );
        if (!ok) {
          const userBrief = window.prompt(
            "Please explain your project and company briefly (problem, users, workflow, stack, your role)."
          );
          if (!userBrief || userBrief.trim().length < 40) {
            throw new Error("Please provide a more detailed project/company brief.");
          }
          await saveProjectBrief(sessionId, userBrief.trim());
          projectDetails = userBrief.trim();
          const confirmAgain = window.confirm(
            `Updated understanding:\n\n${projectDetails.slice(0, 220)}...\n\nProceed now?`
          );
          if (!confirmAgain) {
            throw new Error("Generation canceled by user.");
          }
        }
        
        data = await generateCaseStudyFromTemplate(sessionId, projectDetails, templateKey);
      } else {
        data = await generateCaseStudy(sessionId, undefined);
      }

      setContent(data.content);
      // Refresh history
      const h = await getCaseStudyHistory(sessionId);
      setHistory(h.case_studies || []);
      toast.success("Case study generated!");
    } catch (err: any) {
      toast.error(err.message || err?.response?.data?.detail || "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const viewHistory = (item: any) => {
    setContent(item.content);
    setViewingHistoryId(item.id);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 48px", borderBottom: "1px solid var(--border)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="WBL Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
            WBL <span style={{ color: "var(--accent-light)" }}>PrepHub</span>
          </span>
        </Link>
        <Link href="/dashboard">
          <button className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
            <ChevronLeft size={14} /> Dashboard
          </button>
        </Link>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px", display: "grid", gridTemplateColumns: "300px 1fr", gap: 32 }}>
        {/* Sidebar */}
        <div>
          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <BookOpen size={20} color="var(--accent-light)" />
              <h2 style={{ fontSize: 18 }}>Generate</h2>
            </div>

            {/* Type selector */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {(["resume", "domain"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setGenerationType(t)}
                  style={{
                    padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: generationType === t ? "var(--gradient-accent)" : "rgba(255,255,255,0.05)",
                    color: generationType === t ? "white" : "var(--text-secondary)",
                    transition: "all 0.2s",
                  }}
                >
                  {t === "resume" ? "From Resume" : "By Domain"}
                </button>
              ))}
            </div>

            {generationType === "domain" && (
              <div style={{ marginBottom: 20 }}>
                <label className="label">Domain Topic</label>
                <select
                  className="input-field"
                  value={selectedTopic || topics[0] || ""}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                >
                  {topics.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
            )}

            <button
              id="generate-case-study-btn"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={loading}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {loading
                ? <><div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }}></div> Generating...</>
                : <><Sparkles size={16} /> Generate Case Study</>
              }
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <Clock size={16} color="var(--text-secondary)" />
                <h3 style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>Previous ({history.length})</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h, i) => (
                  <button
                    key={h.id}
                    onClick={() => viewHistory(h)}
                    style={{
                      textAlign: "left", padding: "10px 12px", borderRadius: 10,
                      border: `1px solid ${viewingHistoryId === h.id ? "var(--accent)" : "var(--border)"}`,
                      background: viewingHistoryId === h.id ? "rgba(139,92,246,0.1)" : "transparent",
                      cursor: "pointer", transition: "all 0.2s", color: "var(--text-secondary)", fontSize: 13,
                    }}
                  >
                    Case Study #{i + 1}
                    <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                      {new Date(h.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div>
          <div className="card" style={{ padding: 40, minHeight: 500 }}>
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 20 }}>
                <div className="animate-spin" style={{ width: 48, height: 48, border: "3px solid rgba(139,92,246,0.2)", borderTopColor: "var(--accent)", borderRadius: "50%" }}></div>
                <p style={{ color: "var(--text-secondary)" }}>AI is generating your case study...</p>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>This may take 15-30 seconds</p>
              </div>
            )}
            {!loading && !content && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 16, textAlign: "center" }}>
                <BookOpen size={56} color="var(--text-muted)" />
                <h3 style={{ color: "var(--text-secondary)", fontSize: 20 }}>No Case Study Generated Yet</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
                  Use the panel on the left to generate a resume-based or domain case study.
                </p>
              </div>
            )}
            {!loading && content && (
              <div className="animate-fadeIn prose-dark">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                  <h2 style={{ fontSize: 24, color: "var(--text-primary)" }}>
                    {viewingHistoryId ? `Saved Case Study #${history.findIndex(h => h.id === viewingHistoryId) + 1}` : "✨ New Case Study"}
                  </h2>
                  <button
                    className="btn-secondary"
                    onClick={handleGenerate}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}
                  >
                    <RefreshCw size={13} /> Regenerate
                  </button>
                </div>
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
