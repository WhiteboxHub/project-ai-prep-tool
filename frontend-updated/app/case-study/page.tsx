// frontend-updated\app\case-study\page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateCaseStudy, getTopics, getCaseStudyHistory, generateCaseStudyFromTemplate, getLatestProject, extractProject, saveProjectBrief } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Brain, BookOpen, Loader, ChevronLeft, Sparkles, Clock, RefreshCw, Download } from "lucide-react";

export default function CaseStudyPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [generationType, setGenerationType] = useState<"resume" | "domain">("resume");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [viewingHistoryId, setViewingHistoryId] = useState<number | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [inferredContext, setInferredContext] = useState("");
  const [briefInput, setBriefInput] = useState("");
  const [pendingTemplateKey, setPendingTemplateKey] = useState("mlops");

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    setCandidateName(localStorage.getItem("candidate_name") || "");
    getTopics().then((d) => setTopics(d.topics)).catch(() => {});
    getCaseStudyHistory(sid).then((d) => setHistory(d.case_studies || [])).catch(() => {});
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    router.push("/");
  };

  const handleGenerate = async (explicitTopic?: string) => {
    setLoading(true);
    setContent("");
    setViewingHistoryId(null);
    try {
      let data;
      if (generationType === "domain") {
        const topicStr = explicitTopic || selectedTopic || topics[0] || "";
        let templateKey = "mlops";
        if (topicStr.toLowerCase().includes("rag")) templateKey = "rag";
        else if (topicStr.toLowerCase().includes("agentic")) templateKey = "agentic";

        let projectDetails = "";
        try {
          const lp = await getLatestProject(sessionId);
          if (lp && Object.keys(lp).length > 0) {
            projectDetails = `Product: ${lp.product}\nArchitecture: ${lp.architecture}\nValue: ${lp.business_value}\nRole: ${lp.role}\nImpact: ${lp.impact}`;
          } else {
            toast.loading("Extracting project from resume...", { id: "extract" });
            const ep = await extractProject(sessionId);
            projectDetails = `Product: ${ep.core_project?.product}\nArchitecture: ${ep.core_project?.architecture}\nValue: ${ep.core_project?.business_value}\nRole: ${ep.core_project?.role}\nImpact: ${ep.core_project?.impact}`;
            toast.dismiss("extract");
          }
        } catch (err) {
          toast.dismiss("extract");
          throw new Error("Failed to extract project from resume. Did you upload one?");
        }

        setPendingTemplateKey(templateKey);
        setInferredContext(projectDetails);
        setShowContextModal(true);
        setLoading(false);
        return;
      } else {
        data = await generateCaseStudy(sessionId, undefined);
      }

      setContent(data.content);
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

  const generateWithContext = async (details: string, templateKey: string) => {
    setLoading(true);
    try {
      const data = await generateCaseStudyFromTemplate(sessionId, details, templateKey);
      setContent(data.content);
      const h = await getCaseStudyHistory(sessionId);
      setHistory(h.case_studies || []);
      setShowContextModal(false);
      setBriefInput("");
      toast.success("Case study generated!");
    } catch (err: any) {
      toast.error(err.message || err?.response?.data?.detail || "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById("case-study-content");
      if (!element) return;
      
      const opt: any = {
        margin:       1,
        filename:     `${candidateName || 'Candidate'}_Case_Study.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      toast.promise(
        html2pdf().set(opt).from(element).save(),
        {
          loading: 'Generating PDF...',
          success: 'PDF downloaded successfully!',
          error: 'Failed to generate PDF.',
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF. Make sure you are on a supported browser.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar candidateName={candidateName} onLogout={handleLogout} />

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 24px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 32 }}>
        {/* Sidebar */}
        <div>
          <div className="card" style={{ padding: 28, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <BookOpen size={20} color="var(--accent)" />
              <h2 style={{ fontSize: 18, color: "var(--text-primary)", fontWeight: 700 }}>Generate</h2>
            </div>

            {/* Type selector */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {(["resume", "domain"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setGenerationType(t)}
                  style={{
                    padding: "10px 0",
                    borderRadius: 8,
                    border: generationType === t ? "1px solid var(--accent)" : "1px solid var(--border)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    background: generationType === t ? "rgba(79, 70, 229, 0.1)" : "var(--bg-secondary)",
                    color: generationType === t ? "var(--accent)" : "var(--text-secondary)",
                    transition: "all 0.2s",
                  }}
                >
                  {t === "resume" ? "Resume" : "Domain"}
                </button>
              ))}
            </div>

            {generationType === "domain" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { id: "rag", label: "RAG Study Guide" },
                  { id: "agentic", label: "Agentic Study Guide" },
                  { id: "mlops", label: "MLOps Study Guide" }
                ].map((guide) => (
                  <button
                    key={guide.id}
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedTopic(guide.id);
                      handleGenerate(guide.id);
                    }}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "12px",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 14,
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "var(--text-primary)"
                    }}
                  >
                    <span>{guide.label}</span>
                    <Sparkles size={16} color="var(--accent)" />
                  </button>
                ))}
              </div>
            ) : (
              <button
                id="generate-case-study-btn"
                className="btn-primary"
                onClick={() => handleGenerate()}
                disabled={loading}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 14,
                }}
              >
                {loading
                  ? <>
                      <div className="animate-spin" style={{
                        width: 16,
                        height: 16,
                        border: "2px solid var(--bg-tertiary)",
                        borderTopColor: "white",
                        borderRadius: "50%"
                      }}></div>
                      Generating...
                    </>
                  : <>
                      <Sparkles size={16} /> Generate Case Study
                    </>
                }
              </button>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 16,
              }}>
                <Clock size={16} color="var(--text-secondary)" />
                <h3 style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}>
                  History ({history.length})
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h, i) => (
                  <button
                    key={h.id}
                    onClick={() => viewHistory(h)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${viewingHistoryId === h.id ? "var(--accent)" : "var(--border)"}`,
                      background: viewingHistoryId === h.id ? "rgba(79, 70, 229, 0.08)" : "transparent",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      color: viewingHistoryId === h.id ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    Case Study #{i + 1}
                    <div style={{
                      color: "var(--text-muted)",
                      fontSize: 11,
                      marginTop: 4,
                      fontWeight: 400,
                    }}>
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
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 400,
                gap: 20,
              }}>
                <div className="animate-spin" style={{
                  width: 48,
                  height: 48,
                  border: "3px solid var(--bg-tertiary)",
                  borderTopColor: "var(--accent)",
                  borderRadius: "50%"
                }}></div>
                <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
                  Generating your case study...
                </p>
                <p style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}>
                  This may take 15-30 seconds
                </p>
              </div>
            )}
            {!loading && !content && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 400,
                gap: 16,
                textAlign: "center",
              }}>
                <BookOpen size={48} color="var(--text-muted)" />
                <h3 style={{
                  color: "var(--text-secondary)",
                  fontSize: 18,
                  fontWeight: 600,
                }}>No Case Study Yet</h3>
                <p style={{
                  color: "var(--text-muted)",
                  fontSize: 14,
                  maxWidth: 300,
                  lineHeight: 1.6,
                }}>
                  Use the panel on the left to generate a case study from your resume or select a domain topic.
                </p>
              </div>
            )}
            {!loading && content && (
              <div className="animate-fadeIn prose-dark">
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 32,
                }}>
                  <h2 style={{
                    fontSize: 24,
                    color: "var(--text-primary)",
                    fontWeight: 700,
                  }}>
                    {viewingHistoryId ? `Saved Case Study #${history.findIndex(h => h.id === viewingHistoryId) + 1}` : "✨ New Case Study"}
                  </h2>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      className="btn-secondary"
                      onClick={handleDownloadPdf}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 16px",
                        fontSize: 13,
                      }}
                    >
                      <Download size={13} /> Download PDF
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleGenerate()}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 16px",
                        fontSize: 13,
                      }}
                    >
                      <RefreshCw size={13} /> Regenerate
                    </button>
                  </div>
                </div>
                <div id="case-study-content" style={{ padding: "10px" }}>
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Modal */}
      {showContextModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 90,
          padding: 20,
        }}>
          <div className="card" style={{
            width: "100%",
            maxWidth: 700,
            padding: 32,
          }}>
            <h3 style={{
              fontSize: 22,
              marginBottom: 8,
              color: "var(--text-primary)",
              fontWeight: 700,
            }}>
              Confirm Project Context
            </h3>
            <p style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              marginBottom: 16,
              lineHeight: 1.6,
            }}>
              This is the project context extracted from your resume. You can confirm it or provide your own brief to continue.
            </p>
            <div style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
              color: "var(--text-secondary)",
              maxHeight: 150,
              overflowY: "auto",
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              {inferredContext}
            </div>
            <label className="label" style={{ marginBottom: 8 }}>
              Or provide your own brief
            </label>
            <textarea
              className="input-field"
              rows={4}
              value={briefInput}
              onChange={(e) => setBriefInput(e.target.value)}
              placeholder="Describe your project, technologies, and impact..."
              style={{ marginBottom: 20 }}
            />
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
            }}>
              <button
                className="btn-secondary"
                onClick={() => setShowContextModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-secondary"
                onClick={async () => {
                  if (!briefInput.trim() || briefInput.trim().length < 40) {
                    toast.error("Please provide a more detailed brief.");
                    return;
                  }
                  await saveProjectBrief(sessionId, briefInput.trim());
                  await generateWithContext(briefInput.trim(), pendingTemplateKey);
                }}
              >
                Use My Brief
              </button>
              <button
                className="btn-primary"
                onClick={() => generateWithContext(inferredContext, pendingTemplateKey)}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
