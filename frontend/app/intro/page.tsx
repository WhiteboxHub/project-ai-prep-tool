"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { evaluateIntro, getIntroHistory } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { Brain, Mic, Square, ChevronLeft, CheckCircle, XCircle, Clock, Play, RotateCcw, Send, Volume2, VolumeX, ChevronDown, ChevronUp, FileText, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [candidateName, setCandidateName] = useState("");
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
    
    // Fetch Dynamic template here
    import("@/lib/api").then(api => {
      api.getDynamicIntroTemplate(sid).then(d => {
        setIdealIntro(d.template);
      }).catch(err => {
        setIdealIntro("Failed to fetch generated intro template.");
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
        strengths: data?.status === "PASS" ? "Clear overall interview-ready introduction structure." : "",
        improvements: (data?.evaluation?.missing_elements || data?.evaluation?.feedback || []).join(" "),
      };
      setResult(normalized);
      const h = await getIntroHistory(sessionId);
      setHistory(h.attempts || []);
      toast.success(normalized.passed ? "🎉 You Passed!" : "Keep practicing — you'll get there!");
      speakText(`Intro evaluation complete. Your score is ${normalized.score}. ${normalized.feedback}`);
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

  const handleEvaluateText = async () => {
    if (!introText.trim()) return;
    setLoading(true);
    try {
      const { evaluateIntroText } = await import("@/lib/api");
      const data = await evaluateIntroText(sessionId, introText);
      const normalized = {
        ...data,
        score: data?.score ?? Math.round((data?.evaluation?.overall_score || 0) * 10),
        passed: data?.status === "PASS",
        scores_breakdown: data?.evaluation?.scores || {},
        feedback: (data?.evaluation?.feedback || []).join(" ") + " " + (data?.evaluation?.missing_elements || []).join(" "),
        strengths: data?.status === "PASS" ? "Clear overall interview-ready introduction structure." : "",
        improvements: (data?.evaluation?.missing_elements || data?.evaluation?.feedback || []).join(" "),
      };
      setResult(normalized);
      const h = await getIntroHistory(sessionId);
      setHistory(h.attempts || []);
      toast.success(normalized.passed ? "🎉 You Passed!" : "Keep practicing — you'll get there!");
      speakText(`Intro evaluation complete. Your score is ${normalized.score}. ${normalized.feedback}`);
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
    <div className="min-h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[rgba(139,92,246,0.15)] blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[rgba(139,92,246,0.1)] blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12 lg:py-5 border-b border-[var(--border)] bg-[rgba(10,10,15,0.8)] backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <img src="/logo.png" alt="WBL Logo" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-['Outfit'] font-bold text-xl text-[var(--text-primary)]">
            WBL <span className="text-[var(--accent-light)]">PrepHub</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {candidateName && (
            <span className="hidden md:inline-block text-[var(--text-secondary)] text-sm font-medium px-3 py-1.5 bg-[rgba(255,255,255,0.03)] rounded-full border border-[var(--border)]">
              {candidateName}
            </span>
          )}
          <Link href="/dashboard">
            <button className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm rounded-lg hover:bg-[rgba(139,92,246,0.1)] transition-colors">
              <ChevronLeft size={16} /> Dashboard
            </button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl lg:text-5xl font-['Outfit'] font-bold mb-4">
            Intro <span className="glow-text">Practice & AI Scoring</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto leading-relaxed">
            Record your self-introduction and receive deep AI feedback. Score 70+ to pass.
          </p>
        </motion.div>

        {provider !== "openai" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto mb-8 border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.05)] rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.1)]"
          >
            <XCircle size={20} className="text-[var(--danger)] shrink-0" />
            <p className="text-[var(--danger)] text-sm md:text-base m-0">
              Whisper speech-to-text requires an OpenAI API key.
              <Link href="/setup" className="text-[var(--accent-light)] font-medium ml-2 hover:underline">Update your setup →</Link>
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* LEFT COLUMN: Record & Template */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Template Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card overflow-hidden bg-gradient-to-b from-[var(--bg-card)] to-[rgba(10,10,15,0.4)] border border-[var(--border)] shadow-xl"
            >
              <div 
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                onClick={() => setTemplateExpanded(!templateExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[rgba(139,92,246,0.1)] text-[var(--accent-light)]">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] m-0">Generated Intro Template</h3>
                </div>
                <div className="p-1.5 rounded-md bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">
                  {templateExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
              <AnimatePresence>
                {templateExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 border-t border-[var(--border)] mt-2">
                      <div className="p-5 rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] font-['Inter'] text-[15px] leading-relaxed whitespace-pre-wrap mt-4 shadow-inner">
                        {idealIntro}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Recorder Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="card overflow-hidden bg-gradient-to-br from-[var(--bg-card)] via-[rgba(139,92,246,0.03)] to-[var(--bg-card)] border border-[var(--border)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative"
            >
              {recording && (
                <div className="absolute inset-0 border-2 border-[var(--danger)] rounded-2xl opacity-50 animate-pulse pointer-events-none z-10" />
              )}
              
              <div 
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors relative z-20"
                onClick={() => setRecorderExpanded(!recorderExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${recording ? 'bg-[rgba(239,68,68,0.1)] text-[var(--danger)]' : 'bg-[rgba(139,92,246,0.1)] text-[var(--accent-light)]'}`}>
                    <Mic size={20} className={recording ? 'animate-pulse' : ''} />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] m-0">
                    {recording ? "Recording in Progress" : "Record Your Introduction"}
                  </h3>
                </div>
                <div className="p-1.5 rounded-md bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">
                  {recorderExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              <AnimatePresence>
                {recorderExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-8 pt-6 flex flex-col items-center">
                      
                      <div className="relative mb-8 mt-4">
                        {!recording ? (
                          <motion.button
                            whileHover={provider === "openai" ? { scale: 1.05 } : {}}
                            whileTap={provider === "openai" ? { scale: 0.95 } : {}}
                            onClick={startRecording}
                            disabled={provider !== "openai"}
                            className="w-28 h-28 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.5)] border-none relative group"
                            style={{ opacity: provider !== "openai" ? 0.5 : 1, cursor: provider === "openai" ? "pointer" : "not-allowed" }}
                            id="start-recording-btn"
                          >
                            <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                            <Mic size={48} color="white" />
                          </motion.button>
                        ) : (
                          <div className="relative flex items-center justify-center">
                            {/* Animated ripples */}
                            <motion.div 
                              animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.3, 0] }} 
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                              className="absolute w-28 h-28 bg-[var(--danger)] rounded-full -z-10"
                            />
                            <motion.div 
                              animate={{ scale: [1, 1.3, 1.6], opacity: [0.6, 0.2, 0] }} 
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                              className="absolute w-28 h-28 bg-[var(--danger)] rounded-full -z-10"
                            />
                            
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={stopRecording}
                              className="w-28 h-28 rounded-full bg-[var(--danger)] flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.6)] border-none relative z-10"
                              style={{ cursor: "pointer" }}
                              id="stop-recording-btn"
                            >
                              <Square size={40} color="white" className="rounded-sm" />
                            </motion.button>
                          </div>
                        )}
                      </div>

                      <div className="h-10 flex items-center justify-center mb-6 w-full">
                        {recording ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--danger)] shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
                            <span className="text-[var(--danger)] font-['Outfit'] font-bold text-3xl tracking-wide">
                              {formatTime(recordingTime)}
                            </span>
                          </motion.div>
                        ) : !audioBlob && (
                          <p className="text-[var(--text-muted)] text-sm font-medium tracking-wide uppercase">
                            Click microphone to start
                          </p>
                        )}
                      </div>

                      <AnimatePresence>
                        {audioUrl && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-md bg-[rgba(0,0,0,0.2)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)] shadow-inner"
                          >
                            <audio controls src={audioUrl} className="w-full h-10 mb-4 rounded-lg opacity-90" />
                            <div className="flex gap-3">
                              <button
                                onClick={handleEvaluate}
                                id="evaluate-intro-btn"
                                disabled={loading}
                                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-70"
                              >
                                {loading ? (
                                  <><div className="w-5 h-5 border-2 border-t-white border-white/20 rounded-full animate-spin" /> Analyzing...</>
                                ) : (
                                  <><Play size={18} fill="currentColor" /> Evaluate Audio</>
                                )}
                              </button>
                              <button 
                                onClick={reset} 
                                className="p-3 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--danger)] text-[var(--text-secondary)] border border-[rgba(255,255,255,0.1)] rounded-xl transition-all"
                                title="Discard and restart"
                              >
                                <RotateCcw size={18} />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {!audioUrl && !recording && (
                          <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="w-full mt-8 pt-8 border-t border-[rgba(255,255,255,0.05)]"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent flex-1" />
                              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Or Type Your Intro</span>
                              <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent flex-1" />
                            </div>
                            <div className="relative group">
                              <textarea 
                                className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] focus:border-[var(--accent-light)] rounded-xl p-4 text-[var(--text-primary)] font-['Inter'] text-sm resize-none transition-all outline-none focus:shadow-[0_0_20px_rgba(139,92,246,0.15)] placeholder-[var(--text-muted)]" 
                                rows={4} 
                                placeholder="Type your introduction here if you prefer not to speak..." 
                                value={introText}
                                onChange={(e) => setIntroText(e.target.value)}
                                disabled={loading}
                              />
                            </div>
                            <button 
                              className="w-full mt-3 btn-secondary bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(139,92,246,0.1)] border border-[rgba(255,255,255,0.08)] hover:border-[var(--accent-light)] text-[var(--text-primary)] rounded-xl py-3 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                              onClick={handleEvaluateText} 
                              disabled={loading || !introText.trim()}
                            >
                              {loading ? (
                                <div className="w-4 h-4 border-2 border-t-[var(--accent-light)] border-white/10 rounded-full animate-spin" />
                              ) : (
                                <Send size={16} className="text-[var(--accent-light)]" />
                              )}
                              Evaluate Text
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Results & History */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Results Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="card overflow-hidden bg-[var(--bg-card)] border border-[var(--border)] shadow-lg flex-1 flex flex-col"
            >
              <div 
                className="flex items-center justify-between p-5 cursor-pointer bg-[rgba(255,255,255,0.01)] border-b border-[rgba(255,255,255,0.03)]"
                onClick={() => setResultsExpanded(!resultsExpanded)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-primary)]">
                    <BarChart2 size={18} />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] m-0">AI Evaluation</h3>
                </div>
                <div className="p-1.5 rounded-md bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)]">
                  {resultsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {resultsExpanded && !result && (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center p-10 min-h-[350px] text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-5">
                      <Brain size={32} className="text-[var(--text-muted)] opacity-50" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-2">Awaiting Introduction</h3>
                    <p className="text-sm text-[var(--text-muted)] max-w-[250px] mx-auto leading-relaxed">
                      Record or type your introduction to receive detailed AI feedback and scoring here.
                    </p>
                  </motion.div>
                )}

                {resultsExpanded && result && (
                  <motion.div 
                    key="results"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-6 md:p-8 overflow-y-auto"
                  >
                    {/* TTS Toggle */}
                    <div className="flex justify-end mb-6">
                      <button 
                        onClick={() => {
                          setVoiceEnabled(!voiceEnabled);
                          if (voiceEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
                        }} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          voiceEnabled 
                            ? 'bg-[rgba(139,92,246,0.1)] border-[rgba(139,92,246,0.3)] text-[var(--accent-light)]' 
                            : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-[var(--text-muted)]'
                        }`}
                      >
                        {voiceEnabled ? <Volume2 size={14}/> : <VolumeX size={14} />} 
                        {voiceEnabled ? "Voice Feedback On" : "Voice Feedback Off"}
                      </button>
                    </div>

                    {/* Circular Score */}
                    <div className="flex flex-col items-center mb-10">
                      <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                          <motion.circle 
                            cx="50" cy="50" r="45" fill="none" 
                            stroke={getScoreColor(result.score)} 
                            strokeWidth="8"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "0 283" }}
                            animate={{ strokeDasharray: `${(result.score / 100) * 283} 283` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{ filter: `drop-shadow(0 0 8px ${getScoreColor(result.score)}80)` }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-['Outfit'] font-bold" style={{ color: getScoreColor(result.score) }}>
                            {result.score}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mt-1">Score</span>
                        </div>
                      </div>
                      
                      <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold border ${
                        result.passed ? 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)] text-[var(--success)]' : 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] text-[var(--danger)]'
                      }`}>
                        {result.passed ? <><CheckCircle size={16} /> Passed & Ready!</> : <><XCircle size={16} /> Needs Refinement</>}
                      </div>
                    </div>

                    {/* Breakdown Bars */}
                    {result.scores_breakdown && Object.keys(result.scores_breakdown).length > 0 && (
                      <div className="mb-8 p-5 bg-[rgba(0,0,0,0.15)] rounded-2xl border border-[rgba(255,255,255,0.03)]">
                        <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-4 uppercase tracking-widest flex items-center gap-2">
                          <BarChart2 size={14} /> Evaluation Breakdown
                        </h4>
                        <div className="space-y-4">
                          {Object.entries(result.scores_breakdown).map(([key, val]: any, i) => (
                            <div key={key}>
                              <div className="flex justify-between items-end mb-1.5">
                                <span className="text-sm font-medium text-[var(--text-secondary)] capitalize">{key}</span>
                                <span className="text-xs font-bold" style={{ color: getScoreColor(val * 5) }}>{val}/20</span>
                              </div>
                              <div className="h-2 w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(val / 20) * 100}%` }}
                                  transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                                  className="h-full rounded-full"
                                  style={{ background: getScoreColor(val * 5), boxShadow: `0 0 10px ${getScoreColor(val * 5)}` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transcript */}
                    {result.transcript && (
                      <div className="mb-8">
                        <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-widest">Transcript</h4>
                        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] shadow-inner text-sm text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-l-[var(--accent-light)]">
                          "{result.transcript}"
                        </div>
                      </div>
                    )}

                    {/* Feedback Items */}
                    <div className="space-y-6">
                      {result.strengths && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-[rgba(16,185,129,0.05)] to-transparent border border-[rgba(16,185,129,0.1)]">
                          <h4 className="text-xs font-bold text-[var(--success)] mb-2 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle size={14} /> Strengths
                          </h4>
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0">{result.strengths}</p>
                        </div>
                      )}
                      
                      {result.improvements && (
                        <div className="p-4 rounded-xl bg-gradient-to-br from-[rgba(245,158,11,0.05)] to-transparent border border-[rgba(245,158,11,0.1)]">
                          <h4 className="text-xs font-bold text-[var(--warning)] mb-2 uppercase tracking-widest flex items-center gap-1.5">
                            <RotateCcw size={14} /> Areas to Improve
                          </h4>
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0">{result.improvements}</p>
                        </div>
                      )}

                      {!result.strengths && !result.improvements && result.feedback && (
                        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                          <h4 className="text-xs font-bold text-[var(--accent-light)] mb-2 uppercase tracking-widest">General Feedback</h4>
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed m-0">{result.feedback}</p>
                        </div>
                      )}
                    </div>

                    {/* Next Steps CTA */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                      className="mt-10 pt-8 border-t border-[rgba(255,255,255,0.05)] text-center relative"
                    >
                      {result.passed ? (
                        <>
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--success)] to-transparent opacity-20" />
                          <p className="text-sm text-[var(--text-secondary)] mb-4">Excellent work! You've unlocked the core interview stages.</p>
                          <Link href="/interview" className="block">
                            <button className="w-full btn-primary bg-gradient-to-r from-[var(--success)] to-[#059669] py-4 text-base shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] border-none cursor-pointer text-white rounded-xl">
                              Enter Mock Interview Session →
                            </button>
                          </Link>
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                          <p className="text-sm text-[var(--text-secondary)] mb-4">Review the feedback and try again to hit the 70 point threshold.</p>
                          <button 
                            className="w-full btn-secondary py-3 text-[15px] border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer rounded-xl bg-transparent text-[var(--text-primary)]" 
                            onClick={reset}
                          >
                            Retake Introduction
                          </button>
                        </>
                      )}
                    </motion.div>

                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* History Card */}
            <AnimatePresence>
              {history.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="card overflow-hidden bg-[rgba(10,10,15,0.6)] border border-[var(--border)] relative z-10"
                >
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                    onClick={() => setHistoryExpanded(!historyExpanded)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]">
                        <Clock size={16} />
                      </div>
                      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] m-0">Past Attempts ({history.length})</h3>
                    </div>
                    <div className="text-[var(--text-muted)]">
                      {historyExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {historyExpanded && (
                      <motion.div 
                        initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 border-t border-[rgba(255,255,255,0.03)] mt-2 flex flex-col gap-2">
                          {history.slice(0, 4).map((h, i) => (
                            <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.08)] transition-colors group">
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors m-0">Attempt #{history.length - i}</p>
                                <p className="text-xs text-[var(--text-muted)] m-0">{new Date(h.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold font-['Outfit']" style={{ color: getScoreColor(h.score || 0) }}>
                                  {h.score ?? "–"}
                                </span>
                                {h.score >= 70 ? <CheckCircle size={16} className="text-[var(--success)]" /> : <XCircle size={16} className="text-[var(--danger)]" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main>
    </div>
  );
}
