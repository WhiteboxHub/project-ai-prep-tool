// client/pages/Setup.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key, Upload, CheckCircle2, Loader2, AlertCircle, ArrowRight,
  FileText, Sparkles, Shield, Eye, EyeOff, ChevronRight
} from "lucide-react";
import { validateApiKey, uploadResume, getExtractionStatus, getResumeSummary, initAndSummary } from "@/lib/api";
import { getSessionId, setSession, setApiProvider, clearSession } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";

type Step = "api-key" | "resume" | "done";

const PROVIDERS = [
  { id: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4"] },
];

export default function Setup() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [step, setStep] = useState<Step>("api-key");
  const [sessionId, setSessionIdState] = useState<string>("");

  // API Key step
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState("");

  // Resume step
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "pending" | "completed" | "failed">("idle");

  const createSetupSession = async () => {
    const resp = await initAndSummary({
      wbl_email: `user_${Date.now()}@temp.local`,
      name: "Candidate",
    });
    const sid = resp.session_id;
    setSession(sid, "Candidate");
    setSessionIdState(sid);
    refresh();
    return sid;
  };

  // On mount: if already has session + resume, skip to done
  useEffect(() => {
    const sid = getSessionId();
    if (!sid) return;
    setSessionIdState(sid);
    getResumeSummary(sid)
      .then((s) => {
        if (s.resume_text && s.has_api_key) {
          navigate("/");
        } else if (s.resume_text && !s.has_api_key) {
          setStep("api-key");
        } else if (s.has_api_key && !s.resume_text) {
          setStep("resume");
        }
      })
      .catch(() => {
        clearSession();
        setSessionIdState("");
        refresh();
      });
  }, [navigate]);

  // Poll extraction status
  useEffect(() => {
    if (extractionStatus !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const { status } = await getExtractionStatus(sessionId);
        if (status === "completed") {
          setExtractionStatus("completed");
          clearInterval(interval);
          setStep("done");
          refresh();
          setTimeout(() => navigate("/"), 1500);
        } else if (status === "failed") {
          setExtractionStatus("failed");
          clearInterval(interval);
          setResumeError("Extraction failed. Please try again.");
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [extractionStatus, sessionId, navigate, refresh]);

  // ── Step 1: Validate API key ──────────────────────────────────────────────
  const handleValidateKey = async () => {
    if (!apiKey.trim()) { setKeyError("Please enter your API key."); return; }
    setKeyLoading(true);
    setKeyError("");

    try {
      let sid = sessionId;
      if (!sid) {
        sid = await createSetupSession();
      }

      try {
        await validateApiKey({
          session_id: sid,
          api_key: apiKey.trim(),
          api_provider: provider,
          model_name: model,
          voice_enabled: voiceEnabled,
        });
      } catch (e: any) {
        const message = String(e.message || "").toLowerCase();
        const isMissingSession =
          e.status === 404 || message.includes("session/candidate not found");
        if (!isMissingSession) {
          throw e;
        }

        clearSession();
        sid = await createSetupSession();
        await validateApiKey({
          session_id: sid,
          api_key: apiKey.trim(),
          api_provider: provider,
          model_name: model,
          voice_enabled: voiceEnabled,
        });
      }

      setApiProvider(provider);
      setStep("resume");
    } catch (e: any) {
      setKeyError(e.message || "Invalid API key. Please check and try again.");
    } finally {
      setKeyLoading(false);
    }
  };

  // ── Step 2: Upload resume ─────────────────────────────────────────────────
  const handleUploadResume = async () => {
    if (!resumeFile) { setResumeError("Please select a JSON resume file."); return; }
    setResumeLoading(true);
    setResumeError("");

    try {
      await uploadResume(sessionId, resumeFile);
      setExtractionStatus("pending");
    } catch (e: any) {
      setResumeError(e.message || "Upload failed. Please try again.");
      setResumeLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/json" || f?.name.endsWith(".json")) setResumeFile(f);
    else setResumeError("Please upload a JSON file.");
  };

  const stepIndex = { "api-key": 0, resume: 1, done: 2 }[step];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-semibold">WBL SmartPrep</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Set Up Your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">AI Prep</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Connect your AI model and upload your resume to get started
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 px-2">
          {["API Key", "Resume", "Ready"].map((label, i) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-2 ${i <= stepIndex ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < stepIndex ? "bg-primary text-white" :
                  i === stepIndex ? "bg-primary/20 text-primary border border-primary" :
                  "bg-white/5 border border-border"
                }`}>
                  {i < stepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-xs font-semibold hidden sm:block">{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-px ${i < stepIndex ? "bg-primary" : "bg-border"}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-2xl border border-border/50">
          <AnimatePresence mode="wait">

            {/* ── Step 1: API Key ── */}
            {step === "api-key" && (
              <motion.div
                key="api-key"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-primary/20">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Connect AI Model</h2>
                    <p className="text-xs text-muted-foreground">Your key is encrypted and stored securely</p>
                  </div>
                </div>

                {/* Provider */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Provider</label>
                  <div className="flex gap-2">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setProvider(p.id); setModel(p.models[0]); }}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-semibold transition-all ${
                          provider === p.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-white/5 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Model</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-border text-foreground text-sm focus:border-primary outline-none transition-colors"
                  >
                    {PROVIDERS.find((p) => p.id === provider)?.models.map((m) => (
                      <option key={m} value={m} className="bg-[#0b0f19] text-[#f8fafc]">{m}</option>
                    ))}
                  </select>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleValidateKey()}
                      placeholder="sk-..."
                      className="w-full px-4 py-2.5 pr-10 rounded-lg bg-white/5 border border-border text-foreground text-sm placeholder-muted-foreground focus:border-primary outline-none transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Encrypted with AES-256 before storage
                  </p>
                </div>

                {/* Voice */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Voice Mode</p>
                    <p className="text-xs text-muted-foreground">AI interviewer speaks via TTS</p>
                  </div>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${voiceEnabled ? "bg-primary" : "bg-white/10"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                {keyError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {keyError}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleValidateKey}
                  disabled={keyLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {keyLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</>
                  ) : (
                    <>Validate & Continue <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 2: Resume Upload ── */}
            {step === "resume" && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-secondary/20">
                    <Upload className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Upload Resume</h2>
                    <p className="text-xs text-muted-foreground">JSON format from LinkedIn/resume tools</p>
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    resumeFile
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-white/2"
                  }`}
                >
                  {resumeFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
                      <p className="font-semibold text-foreground">{resumeFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(resumeFile.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={() => setResumeFile(null)}
                        className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-sm text-foreground font-medium">
                        Drag & drop your resume JSON here
                      </p>
                      <p className="text-xs text-muted-foreground">or</p>
                      <label className="cursor-pointer">
                        <span className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-sm font-semibold hover:bg-primary/30 transition-colors">
                          Browse File
                        </span>
                        <input
                          type="file"
                          accept=".json,application/json"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setResumeFile(f);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Extraction status */}
                {extractionStatus === "pending" && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Extracting profile...</p>
                      <p className="text-xs text-muted-foreground">AI is analysing your resume (~20s)</p>
                    </div>
                  </div>
                )}

                {resumeError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {resumeError}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUploadResume}
                  disabled={resumeLoading || extractionStatus === "pending" || !resumeFile}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {resumeLoading || extractionStatus === "pending" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <>Upload & Continue <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* ── Step 3: Done ── */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-2">You're all set!</h2>
                  <p className="text-muted-foreground text-sm">
                    Your AI interviewer is ready. Redirecting to dashboard...
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  {[0.1, 0.2, 0.3].map((d) => (
                    <motion.div
                      key={d}
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ y: [-4, 4, -4] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: d }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already set up?{" "}
          <button
            onClick={() => navigate("/")}
            className="text-primary hover:text-primary/80 font-semibold"
          >
            Go to Dashboard
          </button>
        </p>
      </motion.div>
    </div>
  );
}
