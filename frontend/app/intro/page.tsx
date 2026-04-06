"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { evaluateIntro, getIntroHistory } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { Brain, Mic, Square, ChevronLeft, CheckCircle, XCircle, Clock, Play, RotateCcw } from "lucide-react";

const IDEAL_INTRO = `Hi, my name is [Name]. I have [X] years of experience in [domain].
I specialize in [key skills like Python, machine learning, cloud].
In my last role at [Company], I built [key achievement].
I am passionate about [area] and I am looking for opportunities in [role].`;

const CRITERIA = ["Fluency", "Grammar", "Confidence", "Structure", "Clarity"];

export default function IntroPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [provider, setProvider] = useState("openai");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    const prov = localStorage.getItem("api_provider") || "openai";
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    setProvider(prov);
    getIntroHistory(sid).then((d) => setHistory(d.attempts || [])).catch(() => {});
  }, [router]);

  const startRecording = async () => {
    if (provider !== "openai") {
      toast.error("Speech-to-text requires an OpenAI API key.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setRecording(true);
      setRecordingTime(0);
      setResult(null);
      setAudioBlob(null);
      setAudioUrl("");
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleEvaluate = async () => {
    if (!audioBlob) return;
    setLoading(true);
    try {
      const data = await evaluateIntro(sessionId, audioBlob);
      setResult(data);
      const h = await getIntroHistory(sessionId);
      setHistory(h.attempts || []);
      toast.success(data.passed ? "🎉 You Passed!" : "Keep practicing — you'll get there!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAudioBlob(null);
    setAudioUrl("");
    setResult(null);
    setRecordingTime(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "var(--success)";
    if (score >= 45) return "var(--warning)";
    return "var(--danger)";
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 48px", borderBottom: "1px solid var(--border)" }}>
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

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 38, marginBottom: 8 }}>
            Intro <span className="glow-text">Practice & AI Scoring</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 17 }}>
            Record your self-introduction and get detailed AI feedback. Score 70+ to pass.
          </p>
        </div>

        {provider !== "openai" && (
          <div className="card" style={{ padding: 20, marginBottom: 32, borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.05)" }}>
            <p style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 8 }}>
              <XCircle size={18} /> This feature requires an OpenAI API key (for Whisper speech-to-text).
              <Link href="/setup" style={{ color: "var(--accent-light)", marginLeft: 8 }}>Update your setup →</Link>
            </p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {/* Left: Recording */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Ideal template */}
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>💡 Ideal Intro Template</h3>
              <pre style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {IDEAL_INTRO}
              </pre>
            </div>

            {/* Recorder */}
            <div className="card" style={{ padding: 32, textAlign: "center" }}>
              <h3 style={{ fontSize: 18, marginBottom: 24 }}>Record Your Introduction</h3>

              {/* Big record button */}
              <div style={{ marginBottom: 28 }}>
                {!recording ? (
                  <button
                    id="start-recording-btn"
                    onClick={startRecording}
                    disabled={provider !== "openai"}
                    style={{
                      width: 100, height: 100, borderRadius: "50%",
                      background: recording ? "var(--danger)" : "linear-gradient(135deg, #7c3aed, #a78bfa)",
                      border: "none", cursor: provider === "openai" ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto", opacity: provider !== "openai" ? 0.4 : 1,
                      boxShadow: "0 0 30px rgba(139,92,246,0.4)", transition: "all 0.3s",
                    }}
                  >
                    <Mic size={40} color="white" />
                  </button>
                ) : (
                  <button
                    id="stop-recording-btn"
                    onClick={stopRecording}
                    className="animate-recording"
                    style={{
                      width: 100, height: 100, borderRadius: "50%",
                      background: "var(--danger)", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto", boxShadow: "0 0 30px rgba(239,68,68,0.5)",
                    }}
                  >
                    <Square size={36} color="white" />
                  </button>
                )}
              </div>

              {recording && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--danger)", animation: "recording-pulse 1s ease infinite" }}></div>
                  <span style={{ color: "var(--danger)", fontWeight: 600, fontFamily: "'Outfit', sans-serif", fontSize: 20 }}>
                    {formatTime(recordingTime)}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Recording...</span>
                </div>
              )}
              {!recording && !audioBlob && (
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Click the mic to start recording</p>
              )}

              {/* Audio playback */}
              {audioUrl && (
                <div style={{ marginTop: 20 }}>
                  <audio controls src={audioUrl} style={{ width: "100%", borderRadius: 8 }}></audio>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button
                      id="evaluate-intro-btn"
                      className="btn-primary"
                      onClick={handleEvaluate}
                      disabled={loading}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      {loading
                        ? <><div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }}></div> Evaluating...</>
                        : <><Play size={16} /> Evaluate Intro</>}
                    </button>
                    <button className="btn-secondary" onClick={reset} title="Record Again" style={{ padding: "12px 16px" }}>
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Current result */}
            {result ? (
              <div className="card animate-fadeIn" style={{ padding: 32 }}>
                {/* Score */}
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div
                    className="score-ring"
                    style={{
                      margin: "0 auto 16px",
                      borderColor: getScoreColor(result.score),
                      color: getScoreColor(result.score),
                      boxShadow: `0 0 30px ${getScoreColor(result.score)}40`,
                    }}
                  >
                    {result.score}
                  </div>
                  <div className={`badge ${result.passed ? "badge-success" : "badge-danger"}`} style={{ justifyContent: "center" }}>
                    {result.passed ? <><CheckCircle size={12} /> Passed!</> : <><XCircle size={12} /> Keep Practicing</>}
                  </div>
                </div>

                {/* Score breakdown */}
                {result.scores_breakdown && Object.keys(result.scores_breakdown).length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Breakdown</h4>
                    {Object.entries(result.scores_breakdown).map(([key, val]: any) => (
                      <div key={key} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize" }}>{key}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: getScoreColor(val * 5) }}>{val}/20</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                          <div style={{ height: "100%", width: `${(val / 20) * 100}%`, background: getScoreColor(val * 5), borderRadius: 3, transition: "width 0.5s" }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transcript */}
                {result.transcript && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Transcript</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, background: "rgba(255,255,255,0.03)", padding: 14, borderRadius: 10 }}>
                      "{result.transcript}"
                    </p>
                  </div>
                )}

                {/* Feedback */}
                <div style={{ marginBottom: result.strengths ? 16 : 0 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Feedback</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{result.feedback}</p>
                </div>

                {result.strengths && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>✓ Strengths</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{result.strengths}</p>
                  </div>
                )}
                {result.improvements && (
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--warning)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>⟳ Improvements</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7 }}>{result.improvements}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="card" style={{ padding: 40, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
                <Mic size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                <h3 style={{ color: "var(--text-secondary)", fontSize: 18, marginBottom: 8 }}>No Evaluation Yet</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Record and evaluate your intro to see your score here.</p>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                  <Clock size={16} color="var(--text-secondary)" />
                  <h3 style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600 }}>Past Attempts ({history.length})</h3>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.slice(0, 5).map((h, i) => (
                    <div key={h.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border)",
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>Attempt #{history.length - i}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(h.created_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: getScoreColor(h.score || 0), fontFamily: "'Outfit', sans-serif" }}>
                          {h.score ?? "–"}
                        </span>
                        {h.score >= 70
                          ? <CheckCircle size={16} color="var(--success)" />
                          : <XCircle size={16} color="var(--danger)" />
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
