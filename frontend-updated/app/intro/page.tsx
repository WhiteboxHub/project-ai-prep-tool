// ai-prep-tool-duplicate\frontend-updated\app\intro\page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { evaluateIntro, getIntroHistory } from "@/lib/api";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { Brain, Mic, Square, CheckCircle, XCircle, Clock, Play, RotateCcw, Send, Volume2, VolumeX, ChevronDown, ChevronUp, FileText, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CRITERIA = ["Fluency", "Grammar", "Confidence", "Structure", "Clarity"];

export default function IntroPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [idealIntro, setIdealIntro] = useState<string>("Loading your personalized intro...");
  const [introText, setIntroText] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  const [templateExpanded, setTemplateExpanded] = useState(true);
  const [recorderExpanded, setRecorderExpanded] = useState(true);
  const [resultsExpanded, setResultsExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    const prov = localStorage.getItem("api_provider") || "openai";
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    setProvider(prov);
    setCandidateName(localStorage.getItem("candidate_name") || "");
    getIntroHistory(sid).then((d) => setHistory(d.attempts || [])).catch(() => {});
    
    import("@/lib/api").then(api => {
      api.getDynamicIntroTemplate(sid).then(d => {
        setIdealIntro(d.template);
      }).catch(err => {
        setIdealIntro("Failed to fetch intro template.");
      });
    });

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices() || [];
        const english = voices.filter((v) => /en|english/i.test(v.lang) || /english/i.test(v.name));
        const finalVoices = english.length ? english : voices;
        setAvailableVoices(finalVoices);
        if (!selectedVoiceName && finalVoices.length > 0) {
          const preferred = finalVoices.find((v) => /female|samantha|zira|aria|google/i.test(v.name)) || finalVoices[0];
          setSelectedVoiceName(preferred.name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [router, selectedVoiceName]);

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    router.push("/");
  };

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
      const normalized = {
        ...data,
        score: data?.score ?? Math.round((data?.evaluation?.overall_score || 0) * 10),
        passed: data?.status === "PASS",
        scores_breakdown: data?.evaluation?.scores || {},
        feedback: (data?.evaluation?.feedback || []).join(" ") + " " + (data?.evaluation?.missing_elements || []).join(" "),
        strengths: data?.status === "PASS" ? "Clear, professional introduction structure." : "",
        improvements: (data?.evaluation?.missing_elements || data?.evaluation?.feedback || []).join(" "),
      };
      setResult(normalized);
      const h = await getIntroHistory(sessionId);
      setHistory(h.attempts || []);
      toast.success(normalized.passed ? "Excellent! You passed!" : "Keep practicing!");
      speakText(`Score: ${normalized.score}. ${normalized.feedback}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAudioBlob(null);
    setAudioUrl("");
    setIntroText("");
    setResult(null);
    setRecordingTime(0);
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  };

  // const handleEvaluateText = async () => {
  //   if (!introText.trim()) return;
  //   setLoading(true);
  //   try {
  //     const { evaluateIntroText } = await import("@/lib/api");
  //     const data = await evaluateIntroText(sessionId, introText);
  //     const normalized = {
  //       ...data,
  //       score: data?.score ?? Math.round((data?.evaluation?.overall_score || 0) * 10),
  //       passed: data?.status === "PASS",
  //       scores_breakdown: data?.evaluation?.scores || {},
  //       feedback: (data?.evaluation?.feedback || []).join(" ") + " " + (data?.evaluation?.missing_elements || []).join(" "),
  //       strengths: data?.status === "PASS" ? "Clear, professional introduction structure." : "",
  //       improvements: (data?.evaluation?.missing_elements || data?.evaluation?.feedback || []).join(" "),
  //     };
  //     setResult(normalized);
  //     const h = await getIntroHistory(sessionId);
  //     setHistory(h.attempts || []);
  //     toast.success(normalized.passed ? "Excellent! You passed!" : "Keep practicing!");
  //     speakText(`Score: ${normalized.score}. ${normalized.feedback}`);
  //   } catch (err: any) {
  //     toast.error(err?.response?.data?.detail || "Evaluation failed. Please try again.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  
  const handleEvaluateText = async () => {
    if (!introText.trim()) return;
    setLoading(true);
    try {
      const { evaluateIntroText } = await import("@/lib/api");
      const data = await evaluateIntroText(sessionId, introText);
  
      // ✅ FIX: same logic here
      const computedScore =
        data?.score ?? Math.round((data?.evaluation?.overall_score || 0) * 10);
  
      const normalized = {
        ...data,
        score: computedScore,
        passed: computedScore >= 70, // ✅ FIXED
        scores_breakdown: data?.evaluation?.scores || {},
        feedback:
          (data?.evaluation?.feedback || []).join(" ") +
          " " +
          (data?.evaluation?.missing_elements || []).join(" "),
        strengths:
          computedScore >= 70
            ? "Clear, professional introduction structure."
            : "",
        improvements:
          (data?.evaluation?.missing_elements ||
            data?.evaluation?.feedback ||
            []).join(" "),
      };
  
      console.log("TEXT EVAL:", normalized); // ✅ debug
  
      setResult(normalized);
  
      const h = await getIntroHistory(sessionId);
      setHistory(h.attempts || []);
  
      toast.success(normalized.passed ? "Excellent! You passed!" : "Keep practicing!");
  
      speakText(`Score: ${normalized.score}. ${normalized.feedback}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = availableVoices.find((v) => v.name === selectedVoiceName);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "var(--success)";
    if (score >= 45) return "var(--warning)";
    return "var(--danger)";
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar candidateName={candidateName} onLogout={handleLogout} />

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            marginBottom: 12,
            color: "var(--text-primary)",
          }}>
            Intro <span className="glow-text">Practice & AI Scoring</span>
          </h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: 15,
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.6,
          }}>
            Record or type your introduction and receive AI feedback. You need a score of 70+ to pass.
          </p>
        </div>

        {provider !== "openai" && (
          <div style={{
            maxWidth: 600,
            margin: "0 auto 24px",
            borderRadius: 12,
            padding: 16,
            border: "1px solid rgba(220, 38, 38, 0.2)",
            background: "rgba(220, 38, 38, 0.08)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}>
            <XCircle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ color: "var(--danger)", fontSize: 14, margin: 0, fontWeight: 500 }}>
              Speech-to-text requires an OpenAI API key.
            </p>
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
        }}>
          
          {/* LEFT: Record & Template */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Template Card */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
              }}
              onClick={() => setTemplateExpanded(!templateExpanded)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    padding: 8,
                    borderRadius: 8,
                    background: "rgba(139, 92, 246, 0.08)",
                    color: "var(--accent)",
                  }}>
                    <FileText size={18} />
                  </div>
                  <h3 style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}>Intro Template</h3>
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                  {templateExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
              {templateExpanded && (
                <div style={{ padding: 20, borderTop: "1px solid var(--border)" }}>
                  <div style={{
                    padding: 16,
                    borderRadius: 10,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    maxHeight: 300,
                    overflowY: "auto",
                  }}>
                    {idealIntro}
                  </div>
                </div>
              )}
            </div>

            {/* Recorder Card */}
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
              }}
              onClick={() => setRecorderExpanded(!recorderExpanded)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    padding: 8,
                    borderRadius: 8,
                    background: recording ? "rgba(220, 38, 38, 0.1)" : "rgba(79, 70, 229, 0.1)",
                    color: recording ? "var(--danger)" : "var(--accent)",
                  }}>
                    <Mic size={18} />
                  </div>
                  <h3 style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}>
                    {recording ? "Recording..." : "Record Introduction"}
                  </h3>
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                  {recorderExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {recorderExpanded && (
                <div style={{
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  borderTop: "1px solid var(--border)",
                }}>
                  
                  <div style={{ position: "relative" }}>
                    {!recording ? (
                      <button
                        onClick={startRecording}
                        disabled={provider !== "openai"}
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: provider === "openai" ? "pointer" : "not-allowed",
                          opacity: provider !== "openai" ? 0.5 : 1,
                          boxShadow: "0 4px 20px var(--accent-glow)",
                        }}
                      >
                        <Mic size={48} color="white" />
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: "50%",
                          background: "var(--danger)",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: "0 4px 20px rgba(220, 38, 38, 0.3)",
                        }}
                      >
                        <Square size={40} color="white" />
                      </button>
                    )}
                  </div>

                  <div style={{ minHeight: 40, textAlign: "center" }}>
                    {recording ? (
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--danger)",
                          animation: "pulse 1s infinite",
                        }} />
                        <span style={{
                          fontSize: 32,
                          fontWeight: 700,
                          color: "var(--danger)",
                          fontFamily: "'Outfit', sans-serif",
                        }}>
                          {formatTime(recordingTime)}
                        </span>
                      </div>
                    ) : !audioBlob ? (
                      <p style={{
                        color: "var(--text-muted)",
                        fontSize: 13,
                        fontWeight: 500,
                        margin: 0,
                      }}>Click to start recording</p>
                    ) : null}
                  </div>

                  {audioUrl && (
                    <div style={{
                      width: "100%",
                      padding: 16,
                      borderRadius: 10,
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                    }}>
                      <audio controls src={audioUrl} style={{ width: "100%", marginBottom: 12 }} />
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          onClick={handleEvaluate}
                          disabled={loading}
                          className="btn-primary"
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            fontSize: 14,
                          }}
                        >
                          {loading ? "Analyzing..." : <>
                            <Play size={16} /> Evaluate Audio
                          </>}
                        </button>
                        <button
                          onClick={reset}
                          className="btn-secondary"
                          style={{
                            padding: "8px 12px",
                          }}
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {!audioUrl && !recording && (
                    <div style={{
                      width: "100%",
                      paddingTop: 20,
                      borderTop: "1px solid var(--border)",
                    }}>
                      <p style={{
                        color: "var(--text-muted)",
                        fontSize: 12,
                        fontWeight: 500,
                        marginBottom: 16,
                        margin: 0,
                        textAlign: "center",
                      }}>Or type your introduction</p>
                      <textarea
                        style={{
                          width: "100%",
                          padding: 12,
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 13,
                          marginBottom: 12,
                        }}
                        rows={4}
                        placeholder="Type your introduction here..."
                        value={introText}
                        onChange={(e) => setIntroText(e.target.value)}
                        disabled={loading}
                      />
                      <button
                        className="btn-primary"
                        onClick={handleEvaluateText}
                        disabled={loading || !introText.trim()}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          fontSize: 14,
                        }}
                      >
                        {loading ? "Analyzing..." : <>
                          <Send size={16} /> Evaluate Text
                        </>}
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Results & History */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Results Card */}
            <div className="card" style={{ overflow: "hidden", flex: 1 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                cursor: "pointer",
                borderBottom: "1px solid var(--border)",
              }}
              onClick={() => setResultsExpanded(!resultsExpanded)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    padding: 8,
                    borderRadius: 8,
                    background: "rgba(0, 0, 0, 0.04)",
                  }}>
                    <BarChart2 size={18} color="var(--text-primary)" />
                  </div>
                  <h3 style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}>AI Evaluation</h3>
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                  {resultsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {resultsExpanded && !result && (
                <div style={{
                  padding: 40,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 350,
                  textAlign: "center",
                  borderTop: "1px solid var(--border)",
                }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "var(--bg-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}>
                    <Brain size={28} color="var(--text-muted)" />
                  </div>
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                    margin: "0 0 8px 0",
                  }}>Awaiting Your Introduction</h3>
                  <p style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    maxWidth: 250,
                    lineHeight: 1.6,
                    margin: 0,
                  }}>Record or type your introduction to see AI feedback and scoring here.</p>
                </div>
              )}

              {resultsExpanded && result && (
                <div style={{ padding: 24, borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                    <button
                      onClick={() => {
                        setVoiceEnabled(!voiceEnabled);
                        if (voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 20,
                        border: "1px solid var(--border)",
                        background: voiceEnabled ? "rgba(79, 70, 229, 0.1)" : "var(--bg-secondary)",
                        color: voiceEnabled ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      {voiceEnabled ? "Voice On" : "Voice Off"}
                    </button>
                  </div>

                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{
                      fontSize: 48,
                      fontWeight: 700,
                      color: getScoreColor(result.score),
                      fontFamily: "'Outfit', sans-serif",
                      marginBottom: 8,
                    }}>
                      {result.score}
                    </div>
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                      border: "1px solid var(--border)",
                      background: result.passed ? "rgba(5, 150, 105, 0.08)" : "rgba(220, 38, 38, 0.08)",
                      color: result.passed ? "var(--success)" : "var(--danger)",
                    }}>
                      {result.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {result.passed ? "Passed!" : "Needs Improvement"}
                    </div>
                  </div>

                  {result.scores_breakdown && Object.keys(result.scores_breakdown).length > 0 && (
                    <div style={{
                      marginBottom: 20,
                      padding: 16,
                      background: "var(--bg-secondary)",
                      borderRadius: 10,
                    }}>
                      <h4 style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        marginBottom: 12,
                        margin: "0 0 12px 0",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}>Breakdown</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {Object.entries(result.scores_breakdown).map(([key, val]: any) => (
                          <div key={key}>
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 6,
                              fontSize: 13,
                            }}>
                              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                                {key}
                              </span>
                              <span style={{ color: getScoreColor(val * 5), fontWeight: 600 }}>
                                {val}/20
                              </span>
                            </div>
                            <div style={{
                              height: 4,
                              background: "var(--bg-tertiary)",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}>
                              <div style={{
                                height: "100%",
                                background: getScoreColor(val * 5),
                                width: `${(val / 20) * 100}%`,
                                borderRadius: 4,
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.strengths && (
                    <div style={{
                      padding: 12,
                      borderRadius: 8,
                      background: "rgba(5, 150, 105, 0.08)",
                      border: "1px solid rgba(5, 150, 105, 0.2)",
                      marginBottom: 12,
                    }}>
                      <h4 style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--success)",
                        marginBottom: 6,
                        margin: "0 0 6px 0",
                      }}>
                        <CheckCircle size={14} style={{ display: "inline", marginRight: 4 }} /> Strengths
                      </h4>
                      <p style={{
                        color: "var(--text-secondary)",
                        fontSize: 13,
                        lineHeight: 1.5,
                        margin: 0,
                      }}>{result.strengths}</p>
                    </div>
                  )}

                  {result.improvements && (
                    <div style={{
                      padding: 12,
                      borderRadius: 8,
                      background: "rgba(217, 119, 6, 0.08)",
                      border: "1px solid rgba(217, 119, 6, 0.2)",
                    }}>
                      <h4 style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--warning)",
                        marginBottom: 6,
                        margin: "0 0 6px 0",
                      }}>
                        Areas to Improve
                      </h4>
                      <p style={{
                        color: "var(--text-secondary)",
                        fontSize: 13,
                        lineHeight: 1.5,
                        margin: 0,
                      }}>{result.improvements}</p>
                    </div>
                  )}

                  {result.passed && (
                    <button
                      className="btn-primary"
                      onClick={() => router.push("/interview")}
                      style={{
                        width: "100%",
                        marginTop: 16,
                        padding: "10px 0",
                        fontSize: 14,
                      }}
                    >
                      Continue to Mock Interviews
                    </button>
                  )}

                  {!result.passed && (
                    <button
                      className="btn-secondary"
                      onClick={reset}
                      style={{
                        width: "100%",
                        marginTop: 16,
                        padding: "10px 0",
                        fontSize: 14,
                      }}
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* History Card */}
            {history.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                }}
                onClick={() => setHistoryExpanded(!historyExpanded)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Clock size={16} color="var(--text-secondary)" />
                    <h3 style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      margin: 0,
                    }}>
                      Attempts ({history.length})
                    </h3>
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>
                    {historyExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
                
                {historyExpanded && (
                  <div style={{
                    padding: 12,
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}>
                    {history.slice(0, 5).map((h, i) => (
                      <div key={h.id} style={{
                        padding: 12,
                        borderRadius: 8,
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <div>
                          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 13, fontWeight: 500 }}>
                            Attempt #{history.length - i}
                          </p>
                          <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: 12 }}>
                            {new Date(h.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: getScoreColor(h.score || 0),
                          }}>
                            {h.score ?? "–"}
                          </span>
                          {h.score >= 70 ? (
                            <CheckCircle size={14} color="var(--success)" />
                          ) : (
                            <XCircle size={14} color="var(--danger)" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
