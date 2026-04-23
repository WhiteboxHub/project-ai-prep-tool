
// frontend\app\interview\page.tsx
// frontend\app\interview\page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Webcam from "react-webcam";
import { 
  Send, Video, CameraOff, Camera, Play, Settings, Download, Loader2, ArrowLeft, Lightbulb, Volume2, VolumeX,
  Sparkles, MessageSquare, Mic, MicOff, UserRound, Headphones, PenSquare, Code2, Copy
} from "lucide-react";
import { sendQuickChat, getStageQuestions, saveProjectBrief, getResumeSummary, getResumeAnalytics } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const CHAT_BG = "var(--bg-secondary)";
const CHAT_ASSISTANT_SURFACE = "var(--bg-card)";

function InterviewCodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="my-5 overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--bg-tertiary)" }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-3 py-2.5 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        <span className="inline-flex items-center gap-2 font-medium" style={{ color: "var(--text-primary)" }}>
          <Code2 size={14} className="shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
          <span className="capitalize">{lang || "code"}</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <Copy size={14} className="shrink-0" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono" style={{ color: "var(--text-primary)" }}>{code}</code>
      </pre>
    </div>
  );
}

const interviewChatMarkdownComponents: Partial<Components> = {
  p: ({ children, ...props }) => (
    <p
      className="mb-4 text-[15px] leading-[1.7] last:mb-0"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold" style={{ color: "var(--text-primary)" }} {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" style={{ color: "var(--text-secondary)" }} {...props}>
      {children}
    </em>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="mb-4 list-disc space-y-2 pl-5 last:mb-0"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol
      className="mb-4 list-decimal space-y-2 pl-5 last:mb-0"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" style={{ color: "var(--text-primary)" }} {...props}>
      {children}
    </li>
  ),
  h1: ({ children, ...props }) => (
    <h3
      className="mb-3 mt-7 text-xl font-semibold tracking-tight first:mt-0"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      {children}
    </h3>
  ),
  h2: ({ children, ...props }) => (
    <h3
      className="mb-3 mt-6 flex items-center gap-2 text-lg font-semibold tracking-tight first:mt-0"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      <span
        className="inline-block h-2 w-2 rotate-45"
        style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }}
        aria-hidden
      />
      {children}
    </h3>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="mb-2 mt-5 flex items-center gap-2 text-base font-semibold first:mt-0"
      style={{ color: "var(--text-primary)" }}
      {...props}
    >
      <span className="inline-block h-1.5 w-1.5 rotate-45" style={{ background: "var(--accent)" }} aria-hidden />
      {children}
    </h3>
  ),
  hr: () => <hr className="my-6 border-0 border-t" style={{ borderColor: "var(--border)" }} />,
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-4 border-l-2 pl-4"
      style={{ borderColor: "var(--accent)", color: "var(--text-secondary)" }}
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="underline decoration-dotted underline-offset-[3px] transition-opacity hover:opacity-90"
      style={{ color: "var(--accent)" }}
      {...props}
    >
      {children}
    </a>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...props }) => {
    const inline = !className;
    if (inline) {
      return (
        <code
          className="rounded px-1.5 py-0.5 font-mono text-[0.9em]"
          style={{ background: "var(--bg-tertiary)", color: "var(--accent)" }}
          {...props}
        >
          {children}
        </code>
      );
    }
    const match = /language-(\w+)/.exec(className || "");
    const lang = match?.[1] || "code";
    const codeString = String(children).replace(/\n$/, "");
    return <InterviewCodeBlock code={codeString} lang={lang} />;
  },
};

const STAGES = [
  { id: 1, name: "Mock Section" },
  { id: 2, name: "Hiring Manager" },
  { id: 3, name: "Technical Panel" },
  { id: 4, name: "System Design" },
  { id: 5, name: "Coding" },
];

/** Shown in the tip bar — keys match STAGES id (1–5). */
const STAGE_HINTS: Record<number, string> = {
  1: "General mock: quick intro + warm-up. Keep it crisp and structured.",
  2: "Hiring manager: focus on impact, tradeoffs, and how you work with others. Use STAR for behavioral prompts.",
  3: "Technical panel: be precise on architecture, correctness, and edge cases. State assumptions clearly.",
  4: "System design: clarify requirements, then walk through components, data flow, and scaling before deep dives.",
  5: "Live coding: think aloud, verify with examples, and mention time/space complexity where relevant.",
};

export default function RealisticInterviewPage() {
  const normalizeName = (name: string) => {
    const bad = ["candidate", "professional experience", "experience", "resume"];
    const n = (name || "").trim();
    if (!n || bad.includes(n.toLowerCase())) return "Candidate";
    return n;
  };
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [candidateName, setCandidateName] = useState("");

  const [currentStage, setCurrentStage] = useState(0); 
  const [webcamEnabled, setWebcamEnabled] = useState(true);
  
  // Dummy AI Video states
  const [aiSpeaking, setAiSpeaking] = useState(false);
  
  // Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [dynamicStageQuestions, setDynamicStageQuestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<number, number>>({
    1: 1,  // mock section
    2: 1,  // hiring manager
    3: 1,  // technical panel
    4: 1,  // system design
    5: 1,  // coding
  });
  const [answeredInStage, setAnsweredInStage] = useState(0);
  const [readyForNextStage, setReadyForNextStage] = useState(false);
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [briefPromptText, setBriefPromptText] = useState("");
  const [briefInput, setBriefInput] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRecordingAnswer, setIsRecordingAnswer] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const answerTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = answerTextareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 48), 200)}px`;
  }, [answer]);

  // Persist stage counts
  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) return;
    const stored = localStorage.getItem(`stage_counts_${sid}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setStageCounts(parsed);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (sid) {
      localStorage.setItem(`stage_counts_${sid}`, JSON.stringify(stageCounts));
    }
  }, [stageCounts]);

  // Timer State
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    let timer: any;
    if (currentStage > 0 && currentStage <= 5 && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && !loading) {
        toast("Time's up for this question!");
    }
    return () => clearInterval(timer);
  }, [currentStage, timeLeft, loading]);

  useEffect(() => {
    setMounted(true);
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    const localName = normalizeName(localStorage.getItem("candidate_name") || "");
    if (localName) setCandidateName(localName);
    getResumeSummary(sid)
      .then((data) => {
        const cleaned = normalizeName(data?.candidate_name || "");
        if (cleaned && cleaned !== "Candidate") {
          localStorage.setItem("candidate_name", cleaned);
          setCandidateName(cleaned);
        } else {
          getResumeAnalytics(sid)
            .then((a) => {
              const intro = (a?.sample_intro || "") as string;
              const m = intro.match(/my name is\s+([A-Za-z ]+)\./i);
              const inferred = normalizeName((m?.[1] || "").trim());
              if (inferred !== "Candidate") {
                localStorage.setItem("candidate_name", inferred);
                setCandidateName(inferred);
              } else {
                setCandidateName(localName || "Candidate");
              }
            })
            .catch(() => setCandidateName(localName || "Candidate"));
        }
      })
      .catch(() => setCandidateName(localName || "Candidate"));
  }, [router]);

  useEffect(() => {
    return () => {
      try {
        speechRecognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      const english = voices.filter((v) => /en|english/i.test(v.lang) || /english/i.test(v.name));
      const finalVoices = english.length ? english : voices;
      setAvailableVoices(finalVoices);
      if (!selectedVoiceName && finalVoices.length > 0) {
        const preferred =
          finalVoices.find((v) => /female|samantha|zira|aria|google/i.test(v.name)) ||
          finalVoices[0];
        setSelectedVoiceName(preferred.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceName]);

  const handleStart = async () => {
    setIsGenerating(true);
    try {
      const data = await getStageQuestions(sessionId);
      if (data?.needs_project_brief) {
        setBriefPromptText(
          data.briefing_prompt ||
            "Please share your first project details: problem, stack, your role, and impact."
        );
        setShowBriefModal(true);
        return;
      }
      if (data && data.questions && data.questions.length > 0) {
        setDynamicStageQuestions(data.questions);
        setCurrentStage(1);
        setAnsweredInStage(0);
        setReadyForNextStage(false);
        addBotMessage(data.questions[0]);
      } else {
        throw new Error("Empty questions returned");
      }
    } catch (e) {
      toast.error("Failed to generate contextual questions.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitBriefAndStart = async () => {
    if (!briefInput || briefInput.trim().length < 40) {
      toast.error("Please provide a bit more detail.");
      return;
    }
    try {
      setLoading(true);
      await saveProjectBrief(sessionId, briefInput.trim());
      setShowBriefModal(false);
      setBriefInput("");
      const refreshed = await getStageQuestions(sessionId);
      if (!refreshed?.questions || refreshed.questions.length === 0) {
        throw new Error("Could not generate questions after project brief.");
      }
      setDynamicStageQuestions(refreshed.questions);
      setCurrentStage(1);
      setAnsweredInStage(0);
      setReadyForNextStage(false);
      addBotMessage(refreshed.questions[0]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to start interview from project brief.");
    } finally {
      setLoading(false);
    }
  };

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { sender: "bot", content: text }]);
    // Speak using TTS
    if (voiceEnabled && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setAiSpeaking(true);
      utterance.onend = () => setAiSpeaking(false);
      utterance.onerror = () => setAiSpeaking(false);
      const voice = availableVoices.find((v) => v.name === selectedVoiceName);
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const nextStage = async () => {
    setTranscript(prev => [...prev, { stage: STAGES[currentStage-1].name, chat: [...messages] }]);
    const next = currentStage + 1;
    if (next <= 5) {
      setCurrentStage(next);
      setMessages([]);
      setTimeLeft(120);
      setAnsweredInStage(0);
      setReadyForNextStage(false);
      
      setLoading(true);
      try {
        const { getStageQuestions } = await import("@/lib/api");
        const data = await getStageQuestions(sessionId, STAGES[next - 1].name);
        if (data && data.questions && data.questions.length > 0) {
           addBotMessage(data.questions[0]);
        }
      } catch (err) {
        toast.error("Failed to load question for next stage.");
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStage(6);
      toast.success("Interview Completed!");
    }
  };

  const handleRetakeStage = () => {
    setMessages([]);
    setAnsweredInStage(0);
    setReadyForNextStage(false);
    setTimeLeft(120);
    // Add a slight delay to ensure UI resets before bot speaks
    setTimeout(() => {
        addBotMessage(dynamicStageQuestions[currentStage - 1]);
    }, 100);
    toast.success(`Stage ${currentStage} reset. You can try again!`);
  };

  const toggleCandidateVoice = () => {
    if (isRecordingAnswer) {
      speechRecognitionRef.current?.stop?.();
      setIsRecordingAnswer(false);
      return;
    }
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Voice input needs Chrome or Edge.");
      return;
    }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        chunk += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        setAnswer((prev) => {
          const t = prev.trim();
          const sp = t.length > 0 && !t.endsWith(" ") ? " " : "";
          return t + sp + chunk.trim();
        });
      }
    };
    recognition.onerror = () => {
      setIsRecordingAnswer(false);
      toast.error("Microphone error — check permissions.");
    };
    recognition.onend = () => setIsRecordingAnswer(false);
    recognition.start();
    speechRecognitionRef.current = recognition;
    setIsRecordingAnswer(true);
    toast("Listening… tap mic again to stop.", { icon: "🎙️", duration: 3000 });
  };

  const handleSend = async () => {
    if (isRecordingAnswer && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      setIsRecordingAnswer(false);
    }
    if (!answer.trim()) return;
    setMessages(prev => [...prev, { sender: "user", content: answer }]);
    
    // Find the last question asked by bot to send as context
    const reversedMsgs = [...messages].reverse();
    const lastBotMsg = reversedMsgs.find(m => m.sender === "bot")?.content || dynamicStageQuestions[currentStage - 1];
    
    const currentAnswer = answer;
    const lowerAnswer = currentAnswer.toLowerCase();
    const unsure = ["not sure", "don't know", "do not know", "no idea", "unable to answer", "can't answer", "cannot answer"]
      .some((k) => lowerAnswer.includes(k));
    setAnswer("");
    setLoading(true);

    try {
      const prevContext = messages.map(m => `${m.sender}: ${m.content}`).join("\n");
      const data = await sendQuickChat(sessionId, lastBotMsg, currentAnswer, STAGES[currentStage-1].name, prevContext);
      
      // Push AI reply and Evaluation Metadata
      let replyText = data.reply;
      if (unsure && data?.evaluation?.improved_answer) {
        replyText = `I understand you were unsure about this one. An expected answer could be:\n\n${data.evaluation.improved_answer}\n\n${data.reply}`;
      }

      const target = stageCounts[currentStage] || 1;
      const newCount = answeredInStage + 1;
      let finalReply = replyText;

      if (newCount >= target) {
        finalReply = `Thank you for completing this answer. I have recorded your response and analyzed your technical gaps below.\n\n✅ Section complete (${newCount}/${target}). Click "Next Stage" when ready.`;
        setReadyForNextStage(true);
      } else {
        finalReply = `Question ${newCount + 1}/${target}:\n\n${replyText}`;
        setReadyForNextStage(false);
      }

      setMessages(prev => [...prev, {
          sender: "bot", 
          content: finalReply,
          evaluation: data.evaluation // Store strict scores in chat
      }]);
      setAnsweredInStage(newCount);
      
      if (voiceEnabled && typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(replyText);
        const voice = availableVoices.find((v) => v.name === selectedVoiceName);
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || "Failed to process answer.");
    } finally {
      setLoading(false);
    }
  };

  const handleNeedHelp = async () => {
    if (loading || currentStage < 1 || currentStage > 5) return;
    setAnswer("I am not sure about this answer. Please suggest a good answer.");
    setTimeout(() => handleSend(), 0);
  };

  if (!mounted) return null;

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    localStorage.removeItem("api_provider");
    router.push("/");
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}
    >

      {/* <header className="sticky top-0 z-50 border-b border-outline-variant/30 bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center justify-between gap-x-5 gap-y-4 px-4 py-4 sm:px-6 sm:py-4 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3 text-xl font-bold tracking-tight text-on-surface no-underline md:text-2xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-container to-secondary-container shadow-lg ring-1 ring-primary-container/30 md:h-11 md:w-11">
              <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
            </div>
            <span>WBL <span className="text-primary-container">PrepHub</span></span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-high/50 px-3.5 py-2.5 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary-container/50 hover:text-on-surface md:text-sm md:px-4">
              <ArrowLeft size={16} className="shrink-0 opacity-80" aria-hidden />
              Dashboard
            </Link>
            <Link href="/setup" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-high/50 text-on-surface-variant transition-colors hover:border-primary-container/50 hover:text-on-surface md:h-11 md:w-11" aria-label="Setup">
              <Settings size={20} className="md:h-[22px] md:w-[22px]" />
            </Link>
            <div className="flex items-center gap-3 rounded-full border border-outline-variant/40 bg-surface-container-high py-1.5 pl-1.5 pr-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-secondary-container text-sm font-bold text-on-primary-container">
                {candidateName ? candidateName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 leading-tight">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">You</span>
                <span className="block max-w-[10rem] break-words text-sm font-semibold leading-snug text-on-surface sm:max-w-[14rem]">{candidateName || "Candidate"}</span>
              </div>
            </div>
          </div>
        </div>
      </header> */}


<Navbar
        candidateName={candidateName}
        onLogout={handleLogout}
      />
      {/* Match Navbar inner: max-width 1280px, horizontal padding 24px (same as nav) */}
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 min-h-0 flex-col px-6 pb-5 pt-8">
        <div className="flex shrink-0 flex-col gap-4">

        {/* Stage progress — original position (top of main) */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", border: `1px solid var(--border)`, background: "var(--bg-card)", borderRadius: "16px", padding: "16px 18px 18px", overflowX: "auto" }} className="card overflow-x-auto">
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Interview path
          </p>
          <div className="mx-auto flex min-w-[680px] items-center justify-center gap-0 lg:min-w-0 lg:w-full">
            {STAGES.map((s, idx) => {
              const isActive = currentStage === s.id;
              const isPast = currentStage > s.id;
              return (
                <div key={s.id} className="flex min-w-0 flex-1 items-center">
                  <div className="flex w-[70px] shrink-0 flex-col items-center gap-1.5">
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      fontSize: 11,
                      fontWeight: 600,
                      transition: "all 0.3s",
                      background: isActive ? "var(--accent)" : isPast ? "var(--success)" : "var(--bg-tertiary)",
                      color: isActive ? "white" : isPast ? "white" : "var(--text-muted)",
                      boxShadow: isActive ? "0 4px 12px rgba(79, 70, 229, 0.25)" : "none",
                      transform: isActive ? "scale(1.05)" : "scale(1)"
                    }}>
                      {s.id}
                    </div>
                    <span style={{
                      width: "100%",
                      padding: "0 4px",
                      textAlign: "center",
                      fontSize: 10,
                      fontWeight: isActive ? 700 : isPast ? 600 : 500,
                      lineHeight: 1.4,
                      color: isActive ? "var(--accent)" : isPast ? "var(--text-primary)" : "var(--text-secondary)"
                    }}>
                      {s.name}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div style={{
                      margin: "0 4px",
                      height: 1,
                      minWidth: 20,
                      maxWidth: "100%",
                      flex: 1,
                      background: isPast ? "var(--gradient-accent)" : "var(--border)"
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        <div className="w-full">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{
          borderRadius: "16px",
          border: `1px solid var(--border)`,
          background: "var(--bg-card)",
          padding: "10px 14px",
          overflow: "hidden"
        }}>
            <div className="flex min-w-0 items-center gap-3">
              <div style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: "rgba(79, 70, 229, 0.1)",
                flexShrink: 0,
                color: "var(--accent)"
              }}>
                <Headphones size={15} />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Interviewer voice</p>
                <p className="hidden sm:block" style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>How the AI sounds when reading questions aloud.</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
              <button type="button" onClick={() => setVoiceEnabled((v) => !v)} style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 36,
                borderRadius: 8,
                background: "var(--bg-secondary)",
                border: `1px solid var(--border)`,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
                whiteSpace: "nowrap"
              }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}>
                {voiceEnabled ? <Volume2 size={15} style={{ color: "var(--accent)" }} aria-hidden /> : <VolumeX size={15} aria-hidden />}
                {voiceEnabled ? "TTS on" : "TTS off"}
              </button>
              <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)} className="input-field" style={{
                minWidth: 0,
                flex: "1 1 200px",
                maxWidth: 420,
                height: 36,
                padding: "6px 12px",
                fontSize: 12,
              }}>
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name} style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>{v.name} ({v.lang})</option>
                ))}
              </select>
              <button type="button" className="btn-secondary" style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 36,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
                whiteSpace: "nowrap"
              }} onClick={() => {
                if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
                const u = new SpeechSynthesisUtterance("Hello, this is your selected interview voice.");
                const v = availableVoices.find((x) => x.name === selectedVoiceName);
                if (v) u.voice = v;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
              }}>
                <Sparkles size={16} style={{ color: "var(--accent)" }} aria-hidden />
                Test
              </button>
            </div>
        </motion.div>
        </div>
        </div>

        {/* Active interview + transcript: fills remaining viewport; chat scrolls inside */}
        <div className="mt-2 flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <AnimatePresence mode="wait">
          {currentStage === 6 ? (
             <motion.div key="stage7" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} className="h-full min-h-0 overflow-y-auto" style={{
               borderRadius: "16px",
               background: `rgba(79, 70, 229, 0.04)`,
               backdropFilter: "blur(16px)",
               padding: "24px",
               border: `1px solid var(--border)`,
               boxShadow: "0 20px 25px rgba(0, 0, 0, 0.1)",
               minHeight: "50vh",
               marginBottom: "40px",
               width: "100%"
             }}>
               <div style={{
                 display: "flex",
                 flexDirection: "column",
                 gap: "20px",
                 marginBottom: "32px",
                 paddingBottom: "24px",
                 borderBottom: `1px solid var(--border)`
               }} className="sm:flex-row sm:items-center sm:justify-between">
                   <div style={{ minWidth: 0 }}>
                     <h2 style={{
                       fontSize: 28,
                       fontWeight: 700,
                       color: "var(--text-primary)",
                       fontFamily: "'Outfit', sans-serif",
                       marginBottom: 8
                     }}>Interview transcript</h2>
                     <p style={{
                       color: "var(--text-secondary)",
                       fontSize: 14,
                       maxWidth: 600,
                       lineHeight: 1.6,
                       margin: 0
                     }}>Everything you practiced in this session, ready to save or print.</p>
                   </div>
                   <button type="button" onClick={() => window.print()} style={{
                     display: "inline-flex",
                     alignItems: "center",
                     justifyContent: "center",
                     gap: 8,
                     borderRadius: 10,
                     background: "var(--gradient-accent)",
                     color: "white",
                     border: "none",
                     padding: "12px 20px",
                     fontSize: 14,
                     fontWeight: 600,
                     cursor: "pointer",
                     transition: "all 0.2s",
                     boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)",
                     width: "100%"
                   }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.3)"} onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.2)"} className="sm:w-auto">
                       <Download size={18} aria-hidden /> Save as PDF
                   </button>
               </div>
               <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} id="printable-transcript">
                   {transcript.map((t, idx) => (
                       <div key={idx} style={{
                         borderRadius: "16px",
                         background: "var(--bg-card)",
                         padding: "24px",
                         border: `1px solid var(--border)`,
                         boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                         width: "100%"
                       }}>
                           <h3 style={{
                             fontSize: 16,
                             fontWeight: 700,
                             color: "var(--text-primary)",
                             fontFamily: "'Outfit', sans-serif",
                             marginBottom: 16,
                             display: "inline-flex",
                             alignItems: "center",
                             gap: 8,
                             background: "rgba(79, 70, 229, 0.1)",
                             padding: "8px 16px",
                             borderRadius: 20,
                             border: `1px solid var(--border-accent)`
                           }}>Round {idx+1}: {t.stage}</h3>
                           <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                               {t.chat.map((m: any, mIdx: number) => (
                                    <div key={mIdx} style={{
                                      borderRadius: "12px",
                                      padding: "16px",
                                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                                      background: m.sender === 'bot' ? "var(--bg-secondary)" : "rgba(79, 70, 229, 0.08)",
                                      border: m.sender === 'bot' ? `1px solid var(--border)` : `1px solid var(--border-accent)`,
                                      textAlign: m.sender === 'bot' ? "left" : "right",
                                      marginLeft: m.sender === 'bot' ? 0 : 48
                                    }}>
                                        <span style={{
                                          fontSize: 10,
                                          fontWeight: 700,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.5px",
                                          display: "block",
                                          marginBottom: 12,
                                          color: m.sender === 'bot' ? "var(--text-secondary)" : "var(--accent)"
                                        }}>{m.sender === 'bot' ? 'Interviewer' : `${candidateName || 'You'}`}</span>
                                        <div style={{
                                          fontSize: 15,
                                          lineHeight: 1.6,
                                          color: "var(--text-primary)",
                                          whiteSpace: "pre-wrap",
                                          wordBreak: "break-word"
                                        }}>
                                            <ReactMarkdown components={interviewChatMarkdownComponents}>{m.content}</ReactMarkdown>
                                        </div>
                                        {m.evaluation && (
                                            <div className="mt-5 space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-4 text-left shadow-inner">
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                                                    <span>Evaluation Score</span>
                                                    <span className="tabular-nums rounded-lg border border-primary-container/30 bg-primary-container/15 px-3 py-1 text-sm font-semibold text-primary-container">
                                                        {m.evaluation.overall_score}/10
                                                    </span>
                                                </div>
                                                {m.evaluation.gap_analysis?.length > 0 && (
                                                    <div className="mt-3 text-sm text-on-surface">
                                                        <span className="mb-2 block text-xs font-semibold text-error">Gap Analysis:</span>
                                                        <ul className="list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-on-surface-variant">
                                                            {m.evaluation.gap_analysis.map((gap: string, gIdx: number) => (
                                                                <li key={gIdx} className="break-words">
                                                                    {gap}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                               ))}
                           </div>
                       </div>
                   ))}
               </div>
           </motion.div>
          ) : currentStage === 0 ? (
            <motion.div key="stage0" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0, y:-12}} className="flex w-full flex-col items-center">
              <div style={{
                margin: "0 auto",
                display: "flex",
                width: "100%",
                maxWidth: "100%",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                paddingTop: 24,
                textAlign: "center"
              }}>
                {/* Icon */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  border: `1px solid var(--border-accent)`,
                  background: "rgba(79, 70, 229, 0.1)",
                  boxShadow: "0 0 34px rgba(79, 70, 229, 0.3)"
                }}>
                  <Video size={28} style={{ color: "var(--accent)" }} aria-hidden />
                </div>

                {/* Title + subtitle */}
                <div style={{
                  display: "flex",
                  maxWidth: 800,
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16
                }}>
                  <h2 style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 40,
                    fontWeight: 700,
                    letterSpacing: "-0.5px",
                    color: "var(--text-primary)",
                    margin: 0
                  }}>
                    Configure your <span style={{ background: "var(--gradient-accent)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Interview Protocol</span>
                  </h2>
                  <p style={{
                    maxWidth: 600,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--text-secondary)",
                    margin: 0
                  }}>
                    Fine-tune the rigorousness of your 5-stage simulation. Bypassed the intro module to jump straight into dynamic technical and behavioral assessments.
                  </p>
                </div>

                {/* Cards */}
                <div className="mx-auto mt-6 w-full max-w-full">
                  <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 justify-center justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      { id: 1, name: "General Mock", icon: UserRound, borderColor: "rgba(59, 130, 246, 0.35)", bgColor: "rgba(59, 130, 246, 0.06)", glowColor: "rgba(59, 130, 246, 0.15)", iconBg: "rgba(59, 130, 246, 0.15)", iconColor: "#60a5fa" },
                      { id: 2, name: "Hiring Manager", icon: MessageSquare, borderColor: "rgba(217, 70, 239, 0.35)", bgColor: "rgba(217, 70, 239, 0.06)", glowColor: "rgba(217, 70, 239, 0.15)", iconBg: "rgba(217, 70, 239, 0.15)", iconColor: "#e879f9" },
                      { id: 3, name: "Tech Panel", icon: Sparkles, borderColor: "rgba(16, 185, 129, 0.35)", bgColor: "rgba(16, 185, 129, 0.06)", glowColor: "rgba(16, 185, 129, 0.15)", iconBg: "rgba(16, 185, 129, 0.15)", iconColor: "#34d399" },
                      { id: 4, name: "System Design", icon: PenSquare, borderColor: "rgba(249, 115, 22, 0.35)", bgColor: "rgba(249, 115, 22, 0.06)", glowColor: "rgba(249, 115, 22, 0.15)", iconBg: "rgba(249, 115, 22, 0.15)", iconColor: "#fb923c" },
                      { id: 5, name: "Live Coding", icon: Code2, borderColor: "rgba(139, 92, 246, 0.4)", bgColor: "rgba(139, 92, 246, 0.06)", glowColor: "rgba(139, 92, 246, 0.15)", iconBg: "rgba(139, 92, 246, 0.15)", iconColor: "#a78bfa" }
                    ].map((stage) => (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: stage.id * 0.06 }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          height: 200,
                          width: 180,
                          borderRadius: 12,
                          border: `1px solid ${stage.borderColor}`,
                          background: stage.bgColor,
                          boxShadow: `0 0 26px ${stage.glowColor}`,
                          padding: 16,
                          textAlign: "center",
                          backdropFilter: "blur(4px)",
                          transition: "all 0.2s",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                      >
                        <div style={{
                          display: "flex",
                          height: "100%",
                          width: "100%",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 12
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            border: `1px solid rgba(255, 255, 255, 0.1)`,
                            background: stage.iconBg
                          }}>
                            <stage.icon size={22} style={{ color: stage.iconColor }} />
                          </div>
                          <div style={{
                            minHeight: 52,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center"
                          }}>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                              color: "var(--text-secondary)",
                              margin: 0
                            }}>
                              Stage {stage.id}
                            </span>
                            <h3 style={{
                              fontFamily: "'Outfit', sans-serif",
                              fontSize: 18,
                              fontWeight: 600,
                              lineHeight: 1.2,
                              color: "var(--text-primary)",
                              marginTop: 8,
                              margin: "8px 0 0"
                            }}>
                              {stage.name}
                            </h3>
                          </div>
                          <div style={{ position: "relative", marginTop: "auto", width: "100%" }}>
                            <select
                              style={{
                                height: 40,
                                width: "100%",
                                cursor: "pointer",
                                appearance: "none",
                                borderRadius: 8,
                                border: `1px solid var(--border)`,
                                background: "var(--bg-secondary)",
                                padding: "8px 12px",
                                paddingRight: 32,
                                fontSize: 14,
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                outline: "none",
                                fontFamily: "'Inter', sans-serif",
                                transition: "all 0.2s"
                              }}
                              value={stageCounts[stage.id]}
                              onChange={(e) => setStageCounts((p) => ({ ...p, [stage.id]: Number(e.target.value) }))}
                            >
                              {[...Array(20)].map((_, i) => (
                                <option key={i+1} value={i+1} style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>{i+1} Question{i+1 > 1 ? 's' : ''}</option>
                              ))}
                            </select>
                            <div style={{
                              pointerEvents: "none",
                              position: "absolute",
                              inset: "0",
                              right: 0,
                              display: "flex",
                              alignItems: "center",
                              paddingRight: 12,
                              color: "var(--text-secondary)"
                            }}>
                              <svg style={{ width: 14, height: 14, fill: "currentColor" }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Button */}
                <div style={{ marginTop: 40, display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleStart}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                      borderRadius: 10,
                      background: "var(--gradient-accent)",
                      color: "white",
                      border: "none",
                      padding: "12px 32px",
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: "0.3px",
                      cursor: isGenerating ? "not-allowed" : "pointer",
                      boxShadow: "0 16px 36px rgba(79, 70, 229, 0.3)",
                      transition: "all 0.2s",
                      opacity: isGenerating ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => !isGenerating && (e.currentTarget.style.boxShadow = "0 20px 44px rgba(79, 70, 229, 0.4)", e.currentTarget.style.transform = "translateY(-2px)")}
                    onMouseLeave={(e) => !isGenerating && (e.currentTarget.style.boxShadow = "0 16px 36px rgba(79, 70, 229, 0.3)", e.currentTarget.style.transform = "translateY(0)")}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Initializing…</span>
                      </>
                    ) : (
                      <>
                        <Play size={20} className="fill-current" />
                        <span>Initialize Protocol</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="stageActive"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="grid h-full min-h-0 w-full grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,min(30vw,340px))] lg:items-stretch lg:justify-items-stretch"
            >
              <div
                className="flex min-h-0 min-w-0 flex-col lg:h-full"
                style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderRadius: "16px",
                border: `1px solid var(--border)`,
                background: "var(--bg-card)",
                boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
                flex: "1 1 auto",
                minHeight: 0,
              }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  borderBottom: `1px solid var(--border)`,
                  padding: "14px 16px",
                  flexShrink: 0
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: `1px solid var(--border)`,
                      background: "rgba(79, 70, 229, 0.1)",
                      flexShrink: 0
                    }}>
                      <MessageSquare size={18} style={{ color: "var(--accent)" }} aria-hidden />
                    </div>
                    <div style={{
                      minWidth: 0
                    }}>
                      <h3 style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        letterSpacing: "0.2px",
                        color: "var(--text-primary)",
                        margin: 0
                      }}>WBL Prep Tool — Interview</h3>
                      <p style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        margin: "2px 0 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>Enter to send · Shift+Enter for a new line</p>
                    </div>
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0
                  }}>
                    <button
                      type="button"
                      onClick={nextStage}
                      disabled={loading}
                      className="btn-secondary"
                      style={{
                        height: 36,
                        padding: "0 16px",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        cursor: loading ? "not-allowed" : "pointer",
                        border: readyForNextStage ? "none" : undefined,
                        background: readyForNextStage ? "var(--success)" : undefined,
                        color: readyForNextStage ? "white" : undefined,
                        boxShadow: readyForNextStage ? "0 0 20px rgba(16, 185, 129, 0.35)" : undefined,
                        opacity: loading ? 0.45 : 1,
                        animation: readyForNextStage ? "pulse 2s ease-in-out infinite" : "none"
                      }}
                    >
                      {currentStage === 5 ? "Finish interview" : "Next stage"}
                    </button>
                  </div>
                </div>

                <div style={{ flexShrink: 0, padding: "0 16px 10px" }}>
                  <div
                    className="flex w-full items-start gap-2 rounded-xl"
                    style={{
                      border: `1px solid var(--border-accent)`,
                      background: "rgba(79, 70, 229, 0.1)",
                      padding: "10px 12px",
                    }}
                  >
                    <Lightbulb size={15} style={{ marginTop: 2, flexShrink: 0, color: "var(--accent)" }} aria-hidden />
                    <p style={{ minWidth: 0, fontSize: 12, lineHeight: 1.5, color: "var(--text-primary)", margin: 0, fontWeight: 500 }}>
                      {STAGE_HINTS[currentStage] ?? "Answer with a clear structure: context, your actions, and outcomes."}
                    </p>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-0 md:px-4">
                  <div
                    className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl"
                    style={{ backgroundColor: CHAT_BG, border: "1px solid var(--border)", minHeight: 0 }}
                  >
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 md:px-5 md:py-5" style={{ minHeight: 0 }}>
                      {messages.length === 0 && !loading && (
                        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>Messages will appear here.</p>
                      )}
                      {messages.map((m, i) => (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} key={i} className="w-full min-w-0">
                          {m.sender === "user" ? (
                            <div className="flex w-full justify-end">
                              <div
                                className="inline-block max-w-[min(90%,32rem)] rounded-2xl rounded-br-md px-5 py-3.5 text-left text-[15px] leading-relaxed shadow-sm tracking-wide"
                                style={{ backgroundColor: "rgba(79, 70, 229, 0.12)", color: "var(--text-primary)", border: "1px solid var(--border-accent)" }}
                              >
                                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex w-full justify-start">
                              <div
                                className="w-full max-w-full rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm sm:max-w-[min(100%,46rem)] md:px-6 md:py-5"
                                style={{ backgroundColor: CHAT_ASSISTANT_SURFACE, border: "1px solid var(--border)" }}
                              >
                                <div className="mb-2.5 flex items-center gap-2">
                                  <div
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                                    style={{ backgroundColor: "rgba(79, 70, 229, 0.15)", border: "1px solid var(--border-accent)" }}
                                  >
                                    <img src="/logo.png" alt="" className="h-4 w-4 object-contain opacity-95" />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>PrepAI</span>
                                </div>
                                <div className="min-w-0 text-[15px] leading-relaxed" style={{ color: "var(--text-primary)" }}>
                                  <ReactMarkdown components={interviewChatMarkdownComponents}>{m.content}</ReactMarkdown>
                                </div>
                                {m.evaluation && (
                                  <div
                                    className="mt-4 space-y-2.5 rounded-xl px-3.5 py-3.5"
                                    style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                                  >
                                    <div
                                      className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider"
                                      style={{ color: "var(--text-muted)" }}
                                    >
                                      <span>Score</span>
                                      <span
                                        className="tabular-nums rounded-lg px-2.5 py-1 text-base font-semibold"
                                        style={{
                                          border: "1px solid var(--border-accent)",
                                          background: "rgba(79, 70, 229, 0.08)",
                                          color: "var(--text-primary)",
                                        }}
                                      >
                                        {m.evaluation.overall_score}/10
                                      </span>
                                    </div>
                                    {m.evaluation.gap_analysis?.length > 0 && (
                                      <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                        {m.evaluation.gap_analysis.map((gap: string, gIdx: number) => (
                                          <li key={gIdx} className="break-words">
                                            {gap}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {loading && (
                        <div className="flex w-full justify-start mt-4">
                          <div
                            className="inline-flex items-center gap-3 rounded-2xl px-5 py-3 text-sm tracking-wide shadow-md"
                            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}
                          >
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" aria-hidden />
                            {messages.length === 0 ? "Uplinking to next module..." : "Evaluating and parsing context..."}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 space-y-2 px-3 py-3 md:px-4 md:py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                  {(currentStage === 5 || currentStage === 6) && (
                    <div className="flex flex-wrap gap-2">
                      {currentStage === 5 && (
                        <a
                          href="https://excalidraw.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                          style={{ border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                        >
                          <PenSquare size={13} className="shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
                          Excalidraw
                        </a>
                      )}
                      {currentStage === 6 && (
                        <a
                          href="https://www.onlinegdb.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
                          style={{ border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                        >
                          <Code2 size={13} className="shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
                          Code playground
                        </a>
                      )}
                    </div>
                  )}
                  <div className="flex items-end gap-1 rounded-[1.35rem] py-1.5 pl-4 pr-1.5" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                    <textarea
                      ref={answerTextareaRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Message…"
                      rows={1}
                      disabled={loading}
                      className="max-h-[200px] min-h-[48px] w-0 min-w-0 flex-1 resize-none bg-transparent py-3 text-[15px] leading-relaxed outline-none placeholder:text-[color:var(--text-muted)]"
                      style={{ color: "var(--text-primary)" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={toggleCandidateVoice}
                      disabled={loading || currentStage < 1 || currentStage > 5}
                      aria-label={isRecordingAnswer ? "Stop dictation" : "Start dictation"}
                      className={`mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                        isRecordingAnswer ? "bg-red-500/20 text-red-400" : "hover:bg-white/10"
                      } disabled:opacity-40`}
                      style={isRecordingAnswer ? undefined : { color: "var(--text-secondary)" }}
                    >
                      {isRecordingAnswer ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={loading || !answer.trim()}
                      aria-label="Send message"
                      className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-opacity disabled:opacity-35"
                      style={{ background: "var(--gradient-accent)" }}
                    >
                      <Send size={18} className="-ml-px" aria-hidden />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
                    <button
                      type="button"
                      onClick={handleNeedHelp}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-45"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Sparkles size={13} className="shrink-0" style={{ color: "var(--accent)" }} aria-hidden />
                      Suggested answer
                    </button>
                    {isRecordingAnswer && <span className="text-xs font-medium text-red-400">Listening…</span>}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:h-full">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl px-4 py-3 shadow-sm md:px-5" style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  <span className="inline-flex w-fit items-center gap-2 justify-self-start rounded-full px-3 py-1.5 text-xs font-bold" style={{ border: "1px solid var(--border-accent)", background: "rgba(79, 70, 229, 0.08)", color: "var(--text-primary)" }}>
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full shadow-lg" style={{ background: "var(--accent)" }} aria-hidden />
                    Live
                  </span>
                  <span className="justify-self-center whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-bold tabular-nums" style={timeLeft <= 30 ? { border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.12)", color: "var(--danger)" } : { border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="justify-self-end text-right text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Round {currentStage}<span style={{ opacity: 0.5 }}>/5</span></span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div
                    className="relative flex min-h-[168px] w-full max-w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-lg transition-all duration-500"
                    style={{
                      height: "clamp(180px, 38vh, 320px)",
                      border: `1px solid var(--border)`,
                      background: "var(--bg-card)",
                      boxShadow: aiSpeaking ? "0 0 0 2px rgba(139, 92, 246, 0.35)" : undefined,
                    }}
                  >
                    <div
                      className="flex h-32 w-32 items-center justify-center rounded-full shadow-xl transition-transform duration-700"
                      style={{
                        border: `1px solid var(--border)`,
                        background: "var(--bg-secondary)",
                        transform: aiSpeaking ? "scale(1.08)" : undefined,
                      }}
                    >
                      <div style={{ position: "relative" }}>
                        <UserRound size={48} style={{ color: aiSpeaking ? "var(--accent)" : "var(--text-secondary)" }} />
                        <Sparkles size={16} style={{ position: "absolute", right: -4, top: -4, animation: "pulse 2s ease-in-out infinite", color: "var(--accent)" }} />
                      </div>
                    </div>
                    {aiSpeaking && (
                      <div style={{ position: "absolute", bottom: "18%", display: "flex", height: 32, alignItems: "flex-end", gap: 4 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} style={{ width: 6, borderRadius: 3, background: "var(--accent)", height: `${24 + (i * 7) % 40}%`, animation: `pulse ${0.25 + i * 0.05}s ease-in-out infinite alternate` }} />
                        ))}
                      </div>
                    )}
                    <div style={{
                      position: "absolute",
                      bottom: 20,
                      left: 20,
                      borderRadius: 12,
                      border: `1px solid var(--border)`,
                      background: "rgba(79, 70, 229, 0.08)",
                      padding: "8px 16px",
                      backdropFilter: "blur(12px)"
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-primary)" }}>PrepAI</span>
                    </div>
                  </div>
                  <div style={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: "16px",
                    border: `1px solid var(--border)`,
                    background: "var(--bg-secondary)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
                    height: "clamp(180px, 38vh, 320px)",
                    minHeight: 168,
                  }}>
                    {webcamEnabled ? (
                      <Webcam audio={false} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} mirrored />
                    ) : (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "var(--text-secondary)"
                      }}>
                        <CameraOff size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "1px", textTransform: "uppercase" }}>Stream offline</span>
                      </div>
                    )}
                    <div style={{
                      position: "absolute",
                      bottom: 20,
                      left: 20,
                      maxWidth: "calc(100% - 5rem)",
                      borderRadius: 12,
                      border: `1px solid var(--border)`,
                      background: "rgba(79, 70, 229, 0.08)",
                      padding: "8px 16px",
                      backdropFilter: "blur(12px)"
                    }}>
                      <span style={{ wordBreak: "break-word", fontSize: 12, fontWeight: 700, lineHeight: 1.2, letterSpacing: "0.5px", color: "var(--text-primary)" }}>{candidateName} (You)</span>
                    </div>
                    <button type="button" onClick={() => setWebcamEnabled(!webcamEnabled)} aria-label={webcamEnabled ? "Turn camera off" : "Turn camera on"} style={{
                      position: "absolute",
                      right: 20,
                      top: 20,
                      borderRadius: "50%",
                      border: `1px solid var(--border)`,
                      background: "rgba(79, 70, 229, 0.08)",
                      padding: 12,
                      color: "var(--text-primary)",
                      backdropFilter: "blur(12px)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(79, 70, 229, 0.15)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(79, 70, 229, 0.08)"}>
                      {webcamEnabled ? <Camera size={18} aria-hidden /> : <CameraOff size={18} aria-hidden />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

        </div>
      </main>

      {showBriefModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        }}>
          <div style={{
            width: "100%",
            maxWidth: 480,
            background: "var(--bg-card)",
            border: `1px solid var(--border)`,
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 20px 25px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <h3 style={{
              fontSize: 20,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              color: "var(--text-primary)",
              margin: 0
            }}>Project context needed</h3>
            <p style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              margin: 0
            }}>{briefPromptText}</p>
            <textarea
              style={{
                width: "100%",
                minHeight: 140,
                background: "var(--bg-secondary)",
                border: `1px solid var(--border)`,
                borderRadius: 12,
                padding: "12px 16px",
                fontSize: 14,
                color: "var(--text-primary)",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                resize: "vertical",
                transition: "all 0.2s"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--border)"}
              rows={6}
              value={briefInput}
              onChange={(e) => setBriefInput(e.target.value)}
              placeholder="Describe company, project problem, users, stack, your role, and impact..."
            />
            <div style={{
              display: "flex",
              flexDirection: "column-reverse",
              gap: 12,
              paddingTop: 8
            }} className="sm:flex-row sm:justify-end">
              <button style={{
                borderRadius: 10,
                background: "var(--bg-secondary)",
                border: `1px solid var(--border)`,
                padding: "11px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s"
              }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"} onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-secondary)"} onClick={() => setShowBriefModal(false)}>Cancel</button>
              <button style={{
                borderRadius: 10,
                background: "var(--gradient-accent)",
                border: "none",
                padding: "11px 24px",
                fontSize: 14,
                fontWeight: 600,
                color: "white",
                cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.2)"
              }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.3)"} onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.2)"} onClick={handleSubmitBriefAndStart}>Proceed</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
