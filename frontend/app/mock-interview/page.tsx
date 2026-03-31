"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  startMockInterview, getMockSession, evaluateAnswer, getInterviewAnswers
} from "@/lib/api";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Brain, MessageSquare, ChevronLeft, ChevronRight, Play,
  CheckCircle, Star, Loader, BarChart2, RefreshCw, FileText
} from "lucide-react";

type Question = {
  id: number;
  type: string;
  difficulty: "Easy" | "Medium" | "Hard";
  question: string;
  hint: string;
};

type EvalResult = {
  overall_score: number;
  scores: Record<string, number>;
  feedback: string;
  ideal_answer: string;
  suggestions: string[];
};

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: "var(--success)",
  Medium: "var(--warning)",
  Hard: "var(--danger)",
};

const TYPE_COLOR: Record<string, string> = {
  Project: "#a78bfa",
  Technical: "#60a5fa",
  Scenario: "#34d399",
  "System Design": "#f472b6",
  Behavioral: "#fb923c",
};

export default function MockInterviewPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [mockSessionId, setMockSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Record<number, EvalResult>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState<"start" | "interview" | "review">("start");

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    // Check existing session
    getMockSession(sid).then((d) => {
      if (d.mock_session_id && d.questions.length > 0) {
        setMockSessionId(d.mock_session_id);
        setQuestions(d.questions);
        // Load existing answers
        getInterviewAnswers(sid, d.mock_session_id).then((a) => {
          const resultMap: Record<number, EvalResult> = {};
          a.answers.forEach((ans: any, i: number) => {
            resultMap[i] = {
              overall_score: ans.overall_score,
              scores: ans.scores,
              feedback: ans.feedback,
              ideal_answer: ans.ideal_answer,
              suggestions: [],
            };
          });
          if (Object.keys(resultMap).length > 0) {
            setResults(resultMap);
            setPhase("interview");
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [router]);

  const handleStart = async () => {
    setGenerating(true);
    try {
      const data = await startMockInterview(sessionId);
      setMockSessionId(data.mock_session_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setResults({});
      setPhase("interview");
      toast.success("Interview started! Good luck 🎯");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to generate questions.");
    } finally {
      setGenerating(false);
    }
  };

  const handleEvaluate = async () => {
    if (!answer.trim() || answer.trim().length < 10) {
      toast.error("Please write a more detailed answer.");
      return;
    }
    setLoading(true);
    try {
      const q = questions[currentIdx];
      const result = await evaluateAnswer(
        sessionId, mockSessionId!, q.question, q.id, answer.trim()
      );
      setResults((prev) => ({ ...prev, [currentIdx]: result }));
      toast.success(`Answer evaluated — ${result.overall_score}/10`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Evaluation failed.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (s: number) =>
    s >= 7 ? "var(--success)" : s >= 5 ? "var(--warning)" : "var(--danger)";

  const avgScore = Object.values(results).length
    ? (Object.values(results).reduce((s, r) => s + r.overall_score, 0) / Object.values(results).length).toFixed(1)
    : null;

  const currentQ = questions[currentIdx];
  const currentResult = results[currentIdx];
  const answeredCount = Object.keys(results).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={20} color="white" />
          </div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
            AI<span style={{ color: "var(--accent-light)" }}>Prep</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          {answeredCount > 0 && (
            <Link href="/report">
              <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
                <FileText size={14} /> Generate Report
              </button>
            </Link>
          )}
          <Link href="/dashboard">
            <button className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
              <ChevronLeft size={14} /> Dashboard
            </button>
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 36, marginBottom: 8 }}>
              Mock <span className="glow-text">Interview</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 16 }}>
              10 AI-generated questions based on your resume and project. Answer each to get scored.
            </p>
          </div>
          {avgScore && (
            <div className="card" style={{ padding: "16px 24px", textAlign: "center", minWidth: 140 }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>AVG SCORE</p>
              <p style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Outfit',sans-serif", color: getScoreColor(parseFloat(avgScore)) }}>
                {avgScore}<span style={{ fontSize: 16, color: "var(--text-muted)" }}>/10</span>
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{answeredCount}/{questions.length} answered</p>
            </div>
          )}
        </div>

        {/* START Phase */}
        {phase === "start" && (
          <div className="card" style={{ maxWidth: 600, margin: "0 auto", padding: 48, textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "var(--accent-light)" }}>
              <MessageSquare size={36} />
            </div>
            <h2 style={{ fontSize: 28, marginBottom: 12 }}>Ready to Start?</h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 32 }}>
              AI will generate 10 personalized interview questions based on your resume and extracted project. Answer each question in writing and get instant AI feedback.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32, textAlign: "left" }}>
              {[["2", "Project Questions"], ["2", "Technical Questions"], ["2", "Scenario Questions"], ["2", "System Design"], ["2", "Behavioral Questions"]].map(([n, t]) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 14 }}>
                  <Star size={14} color="var(--accent-light)" /> {n}× {t}
                </div>
              ))}
            </div>
            <button id="start-mock-btn" className="btn-primary" onClick={handleStart} disabled={generating} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", fontSize: 17, padding: "15px 0" }}>
              {generating ? <><div className="animate-spin" style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }}></div> Generating Questions...</> : <><Play size={18} /> Start Mock Interview</>}
            </button>
          </div>
        )}

        {/* INTERVIEW Phase */}
        {phase === "interview" && currentQ && (
          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 28 }}>
            {/* Questions sidebar */}
            <div className="card" style={{ padding: 20, alignSelf: "start" }}>
              <h3 style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Questions ({answeredCount}/{questions.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => { setCurrentIdx(i); setAnswer(""); }}
                    style={{
                      textAlign: "left", padding: "10px 12px", borderRadius: 10,
                      border: `1px solid ${i === currentIdx ? "var(--accent)" : "var(--border)"}`,
                      background: i === currentIdx ? "rgba(139,92,246,0.1)" : results[i] ? "rgba(16,185,129,0.06)" : "transparent",
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: i === currentIdx ? "var(--accent-light)" : "var(--text-secondary)" }}>Q{i + 1}</span>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {results[i] && <CheckCircle size={12} color="var(--success)" />}
                        <span style={{ fontSize: 10, fontWeight: 700, color: DIFFICULTY_COLOR[q.difficulty] || "var(--text-muted)" }}>{q.difficulty}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{q.question.substring(0, 60)}...</p>
                  </button>
                ))}
              </div>
              {questions.length > 0 && (
                <button className="btn-secondary" onClick={handleStart} disabled={generating} style={{ width: "100%", marginTop: 16, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <RefreshCw size={12} /> New Questions
                </button>
              )}
            </div>

            {/* Main question area */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Question card */}
              <div className="card" style={{ padding: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, background: `${TYPE_COLOR[currentQ.type] || "var(--accent)"}20`, color: TYPE_COLOR[currentQ.type] || "var(--accent-light)", padding: "4px 10px", borderRadius: 100, border: `1px solid ${TYPE_COLOR[currentQ.type] || "var(--accent)"}40` }}>
                    {currentQ.type}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: DIFFICULTY_COLOR[currentQ.difficulty] }}>
                    ● {currentQ.difficulty}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>Question {currentIdx + 1} of {questions.length}</span>
                </div>
                <h2 style={{ fontSize: 20, lineHeight: 1.5, marginBottom: currentQ.hint ? 16 : 0 }}>{currentQ.question}</h2>
                {currentQ.hint && (
                  <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "12px 16px", marginTop: 16 }}>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      <strong style={{ color: "var(--accent-light)" }}>💡 Hint:</strong> {currentQ.hint}
                    </p>
                  </div>
                )}
              </div>

              {/* Answer area */}
              {!currentResult ? (
                <div className="card" style={{ padding: 28 }}>
                  <label className="label">Your Answer</label>
                  <textarea
                    id={`answer-input-${currentIdx}`}
                    className="input-field"
                    placeholder="Type your answer here... Be as detailed as possible. Structure your answer with context, approach, and results."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={8}
                    style={{ resize: "vertical", lineHeight: 1.7 }}
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button
                      id="submit-answer-btn"
                      className="btn-primary"
                      onClick={handleEvaluate}
                      disabled={loading || !answer.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
                    >
                      {loading ? <><div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }}></div> Evaluating...</> : <><BarChart2 size={16} /> Submit & Evaluate</>}
                    </button>
                    {currentIdx < questions.length - 1 && (
                      <button className="btn-secondary" onClick={() => { setCurrentIdx(i => i + 1); setAnswer(""); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Skip <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card animate-fadeIn" style={{ padding: 32 }}>
                  {/* Score header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", border: `4px solid ${getScoreColor(currentResult.overall_score)}`, display: "flex", alignItems: "center", justifyContent: "center", color: getScoreColor(currentResult.overall_score), fontSize: 24, fontWeight: 800, fontFamily: "'Outfit',sans-serif", boxShadow: `0 0 20px ${getScoreColor(currentResult.overall_score)}40` }}>
                      {currentResult.overall_score}
                    </div>
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 700 }}>Answer Evaluated</p>
                      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Score: {currentResult.overall_score}/10</p>
                    </div>
                    <button className="btn-secondary" onClick={() => setResults(p => { const n = {...p}; delete n[currentIdx]; return n; })} style={{ marginLeft: "auto", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <RefreshCw size={13} /> Retry
                    </button>
                  </div>

                  {/* Score breakdown */}
                  {currentResult.scores && Object.keys(currentResult.scores).length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>BREAKDOWN</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {Object.entries(currentResult.scores).map(([k, v]) => (
                          <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize", minWidth: 130 }}>{k.replace(/_/g, " ")}</span>
                            <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                              <div style={{ height: "100%", width: `${(v / 10) * 100}%`, background: getScoreColor(v), borderRadius: 3 }}></div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: getScoreColor(v), minWidth: 24 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>FEEDBACK</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{currentResult.feedback}</p>
                  </div>

                  {/* Ideal answer */}
                  {currentResult.ideal_answer && (
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", marginBottom: 8, textTransform: "uppercase" }}>IDEAL ANSWER</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, background: "rgba(16,185,129,0.06)", padding: 14, borderRadius: 10, borderLeft: "3px solid var(--success)" }}>{currentResult.ideal_answer}</p>
                    </div>
                  )}

                  {/* Navigation */}
                  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    {currentIdx > 0 && (
                      <button className="btn-secondary" onClick={() => { setCurrentIdx(i => i - 1); setAnswer(""); }} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ChevronLeft size={14} /> Previous
                      </button>
                    )}
                    {currentIdx < questions.length - 1 ? (
                      <button className="btn-primary" onClick={() => { setCurrentIdx(i => i + 1); setAnswer(""); }} style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                        Next Question <ChevronRight size={16} />
                      </button>
                    ) : (
                      <Link href="/report" style={{ marginLeft: "auto" }}>
                        <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <FileText size={16} /> Generate Final Report
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
