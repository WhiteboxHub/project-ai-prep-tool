"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateApiKey, uploadResume } from "@/lib/api";
import toast from "react-hot-toast";
import axios from "axios";
import { Brain, Key, Upload, CheckCircle, AlertCircle, ChevronRight, FileText, Eye, EyeOff, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";

type Step = "api" | "resume" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("api");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [sessionId, setSessionId] = useState("");
  const [capabilities, setCapabilities] = useState<any>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  // Check backend is reachable on load
  useEffect(() => {
    axios.get("http://localhost:8000/health", { timeout: 4000 })
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  const handleValidateKey = async () => {
    if (!apiKey.trim()) { setErrorMsg("Please enter your API key."); return; }
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await validateApiKey(apiKey.trim(), provider);
      setSessionId(data.session_id);
      setCapabilities(data.models_available);
      localStorage.setItem("session_id", data.session_id);
      localStorage.setItem("api_provider", provider);
      toast.success("API key validated! ✓");
      setStep("resume");
    } catch (err: any) {
      console.error("Validation error:", err);
      const detail = err?.response?.data?.detail
        || err?.message
        || "Connection failed. Is the backend running on port 8000?";
      setErrorMsg(detail);
      toast.error(detail.substring(0, 80));
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return toast.error("Please select a resume file.");
    setLoading(true);
    try {
      const data = await uploadResume(sessionId, resumeFile);
      setWordCount(data.word_count);
      toast.success(`Resume parsed! ${data.word_count} words extracted.`);
      setStep("done");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to upload resume.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "doc"].includes(ext || "")) {
      toast.error("Only PDF or DOCX files are allowed.");
      return;
    }
    setResumeFile(file);
  };

  const steps = [
    { id: "api", label: "API Key", icon: <Key size={16} /> },
    { id: "resume", label: "Resume", icon: <Upload size={16} /> },
    { id: "done", label: "Ready", icon: <CheckCircle size={16} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <nav style={{
        display: "flex", alignItems: "center", padding: "20px 48px",
        borderBottom: "1px solid var(--border)",
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
      </nav>

      <div style={{ maxWidth: 560, margin: "60px auto", padding: "0 24px" }}>
        {/* Progress Steps */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 48, gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 100,
                background: step === s.id ? "rgba(139,92,246,0.2)" : (["done", "resume"].includes(step) && s.id === "api") || (step === "done" && s.id === "resume") ? "rgba(16,185,129,0.1)" : "transparent",
                border: step === s.id ? "1px solid rgba(139,92,246,0.5)" : "1px solid transparent",
                color: step === s.id ? "var(--accent-light)" : "var(--text-muted)",
                fontSize: 13, fontWeight: 600, transition: "all 0.3s",
              }}>
                {s.icon} {s.label}
              </div>
              {i < steps.length - 1 && (
                <ChevronRight size={16} color="var(--text-muted)" style={{ margin: "0 4px" }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: API Key */}
        {step === "api" && (
          <div className="card animate-fadeIn" style={{ padding: 40 }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent-light)", marginBottom: 20,
              }}>
                <Key size={26} />
              </div>
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>Connect Your AI</h1>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Your API key is sent directly to the AI provider. We never store it permanently.
              </p>
              {/* Backend status */}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                {backendOk === null && <span style={{ color: "var(--text-muted)" }}>⏳ Checking backend...</span>}
                {backendOk === true && <span style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}><Wifi size={12} /> Backend connected on port 8000</span>}
                {backendOk === false && <span style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 4 }}><WifiOff size={12} /> Backend not reachable! Run: <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4 }}>uvicorn main:app --reload --port 8000</code></span>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label className="label">AI Provider</label>
                <select
                  className="input-field"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  id="provider-select"
                >
                  <option value="openai">OpenAI (GPT-4o + Whisper)</option>
                  <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
                </select>
              </div>
              <div>
                <label className="label">API Key</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="api-key-input"
                    className="input-field"
                    type={showKey ? "text" : "password"}
                    placeholder={provider === "openai" ? "sk-..." : "AIza..."}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleValidateKey()}
                    style={{ paddingRight: 48 }}
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-muted)",
                    }}
                  >
                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {provider === "gemini" && (
                  <p style={{ color: "var(--warning)", fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={12} /> Note: Intro audio evaluation requires an OpenAI key (Whisper).
                  </p>
                )}
              </div>
              {/* Inline error */}
              {errorMsg && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ color: "var(--danger)", fontSize: 13, lineHeight: 1.5 }}>{errorMsg}</p>
                </div>
              )}
              <button
                id="validate-key-btn"
                className="btn-primary"
                onClick={handleValidateKey}
                disabled={loading || !apiKey.trim() || backendOk === false}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {loading
                  ? <><div className="animate-spin" style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }}></div> Validating... (may take ~5s)</>
                  : <>Validate & Continue <ChevronRight size={18} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Resume Upload */}
        {step === "resume" && (
          <div className="card animate-fadeIn" style={{ padding: 40 }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--accent-light)", marginBottom: 20,
              }}>
                <Upload size={26} />
              </div>
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>Upload Your Resume</h1>
              <div className="badge badge-success" style={{ marginBottom: 16 }}>
                <CheckCircle size={12} /> API Key Verified — {capabilities?.model || provider}
              </div>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                We'll extract your projects and experience to generate personalized case studies.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => document.getElementById("resume-file-input")?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--accent)" : resumeFile ? "var(--success)" : "var(--border)"}`,
                borderRadius: 16,
                padding: "40px 24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.3s",
                background: dragOver ? "rgba(139,92,246,0.08)" : resumeFile ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                marginBottom: 24,
              }}
            >
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
              />
              {resumeFile ? (
                <>
                  <FileText size={40} color="var(--success)" style={{ marginBottom: 12 }} />
                  <p style={{ fontWeight: 600, color: "var(--success)" }}>{resumeFile.name}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                    {(resumeFile.size / 1024).toFixed(1)} KB — Click to change
                  </p>
                </>
              ) : (
                <>
                  <Upload size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                  <p style={{ fontWeight: 600, fontSize: 16 }}>Drop your resume here</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>or click to browse — PDF or DOCX</p>
                </>
              )}
            </div>

            <button
              id="upload-resume-btn"
              className="btn-primary"
              onClick={handleResumeUpload}
              disabled={loading || !resumeFile}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {loading ? <><div className="animate-spin" style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }}></div> Parsing Resume...</> : <>Parse & Continue <ChevronRight size={18} /></>}
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="card animate-fadeIn" style={{ padding: 40, textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <CheckCircle size={40} color="var(--success)" />
            </div>
            <h1 style={{ fontSize: 32, marginBottom: 12 }}>You're All Set!</h1>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 8 }}>
              Resume parsed successfully — <strong style={{ color: "var(--success)" }}>{wordCount} words</strong> extracted.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 36 }}>
              Session ID: <code style={{ color: "var(--accent-light)", fontSize: 12 }}>{sessionId.substring(0, 16)}...</code>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="btn-primary" onClick={() => router.push("/dashboard")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                Go to Dashboard <ChevronRight size={18} />
              </button>
              <button className="btn-secondary" onClick={() => router.push("/case-study")}>
                Generate Case Study Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
