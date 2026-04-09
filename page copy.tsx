// frontend\app\interview\page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Webcam from "react-webcam";
import { 
  Send, Video, CameraOff, Camera, Play, Settings, Download, Loader2, ArrowLeft, Lightbulb, Volume2, VolumeX,
  Sparkles, MessageSquare, Mic, MicOff, UserRound, Headphones, PenSquare, Code2, HelpCircle
} from "lucide-react";
import { sendQuickChat, getStageQuestions, saveProjectBrief, getResumeSummary, getResumeAnalytics } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";

const STAGES = [
  { id: 1, name: "AI Intro Test" },
  { id: 2, name: "Mock Section" },
  { id: 3, name: "Hiring Manager" },
  { id: 4, name: "Technical Panel" },
  { id: 5, name: "System Design" },
  { id: 6, name: "Coding" },
];

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
    1: 1,   // intro always 1
    2: 10,  // mock section
    3: 5,   // hiring manager
    4: 10,  // technical panel
    5: 1,   // system design
    6: 1,   // coding
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

  // Timer State
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    let timer: any;
    if (currentStage > 0 && currentStage <= 6 && timeLeft > 0) {
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

  const nextStage = () => {
    setTranscript(prev => [...prev, { stage: STAGES[currentStage-1].name, chat: [...messages] }]);
    const next = currentStage + 1;
    if (next <= 6) {
      setCurrentStage(next);
      setMessages([]);
      setTimeLeft(120);
      setAnsweredInStage(0);
      setReadyForNextStage(false);
      addBotMessage(dynamicStageQuestions[next - 1]);
    } else {
      setCurrentStage(7);
      toast.success("Interview Completed!");
    }
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

      if (currentStage === 1) {
        finalReply = `${replyText}\n\nGreat. Intro evaluation is complete. Please click "Next Stage" to continue.`;
        setReadyForNextStage(true);
      } else if (newCount >= target) {
        finalReply = `${replyText}\n\nSection complete (${newCount}/${target}). Click "Next Stage" when ready.`;
        setReadyForNextStage(true);
      } else {
        finalReply = `${replyText}\n\nQuestion ${newCount + 1}/${target}: ${data.reply}`;
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
    if (loading || currentStage < 1 || currentStage > 6) return;
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
    <div className="relative min-h-screen flex flex-col font-['Inter'] text-on-surface overflow-x-hidden bg-surface">
      <div className="pointer-events-none fixed inset-0 bg-primary-container/[0.07]" aria-hidden />
      <div className="pointer-events-none fixed top-20 -left-24 h-72 w-72 rounded-full bg-primary-container/15 blur-[88px]" aria-hidden />
      <div className="pointer-events-none fixed bottom-10 right-0 h-64 w-64 rounded-full bg-secondary-container/15 blur-[80px]" aria-hidden />

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
      <main className="relative z-10 mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 pb-10 pt-16 sm:gap-7 sm:px-6 sm:pb-12 sm:pt-20 lg:gap-8 lg:px-8 lg:pb-14 lg:pt-24">

        {/* Stage progress — original position (top of main) */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="w-full overflow-x-auto overscroll-contain rounded-2xl border border-outline-variant/50 bg-surface-container-low/60 px-4 py-5 shadow-lg backdrop-blur-md sm:px-6 sm:py-6 md:px-8 md:py-7">
          <div className="mx-auto flex min-w-max items-end justify-center gap-0 pb-0.5 lg:min-w-0 lg:w-full">
            {STAGES.map((s, idx) => {
              const isActive = currentStage === s.id;
              const isPast = currentStage > s.id;
              return (
                <div key={s.id} className="flex min-w-0 flex-1 items-end">
                  <div className="flex w-[5rem] shrink-0 flex-col items-center gap-2.5 sm:w-24 md:w-28 lg:w-32">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 sm:h-11 sm:w-11 sm:text-sm ${isActive ? "scale-105 bg-primary-container text-on-primary-container shadow-lg ring-2 ring-primary-container ring-offset-2 ring-offset-surface" : isPast ? "bg-secondary-container text-on-secondary" : "bg-surface-container-highest text-on-surface-variant"}`}>
                      {s.id}
                    </div>
                    <span className={`w-full break-words px-1 text-center text-[10px] font-medium leading-snug sm:text-[11px] md:text-xs ${isActive ? "font-bold text-primary-container" : isPast ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>
                      {s.name}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div className={`mx-2 mb-[1.6rem] h-px min-w-4 max-w-full flex-1 self-end sm:mx-3 ${isPast ? "bg-gradient-to-r from-secondary-container to-primary-container" : "bg-outline-variant/30"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Voice row — original two-card layout */}
        <div className="w-full grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="lg:col-span-2 rounded-2xl border border-outline-variant/50 bg-surface-container-high/40 p-5 shadow-lg backdrop-blur-md md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-container/30 bg-primary-container/20">
                <Headphones size={20} className="text-primary-container" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="font-['Outfit'] text-base font-semibold text-on-surface">Interviewer voice</p>
                <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">How the AI sounds when reading questions aloud.</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl border border-outline-variant/50 bg-surface-container-high/40 p-5 shadow-lg backdrop-blur-md md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <button type="button" onClick={() => setVoiceEnabled((v) => !v)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-high px-4 py-2.5 text-xs font-semibold transition-colors hover:border-primary-container/50">
                {voiceEnabled ? <Volume2 size={16} className="shrink-0 text-primary-container" aria-hidden /> : <VolumeX size={16} className="shrink-0" aria-hidden />}
                {voiceEnabled ? "TTS on" : "TTS off"}
              </button>
              <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)} className="input-field min-h-11 w-full min-w-0 flex-1 rounded-xl border border-outline-variant/50 px-3 py-2.5 text-xs sm:min-w-[160px]">
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
              <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-high px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary-container/50" onClick={() => {
                if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
                const u = new SpeechSynthesisUtterance("Hello, this is your selected interview voice.");
                const v = availableVoices.find((x) => x.name === selectedVoiceName);
                if (v) u.voice = v;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
              }}>
                <Sparkles size={14} className="shrink-0 text-primary-container" aria-hidden />
                Test
              </button>
            </div>
          </motion.div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12">
          <AnimatePresence mode="wait">
          {currentStage === 7 ? (
             <motion.div key="stage7" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} className="lg:col-span-12 rounded-3xl bg-surface-container-low/40 backdrop-blur-2xl p-6 sm:p-8 lg:p-10 border border-outline-variant/50 shadow-2xl min-h-[50vh] mb-10 lg:mb-16 w-full">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 sm:gap-6 mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-outline-variant/20">
                   <div className="min-w-0 space-y-2">
                     <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-['Outfit'] text-on-surface bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-on-surface-variant">Interview transcript</h2>
                     <p className="text-on-surface-variant text-sm md:text-base max-w-2xl leading-relaxed">Everything you practiced in this session, ready to save or print.</p>
                   </div>
                   <button type="button" onClick={() => window.print()} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary-container to-primary-container px-5 py-3 text-sm font-bold text-on-primary shadow-lg ring-1 ring-primary-container/40 transition-all hover:-translate-y-0.5 hover:ring-primary-container/60 sm:w-auto sm:px-6">
                       <Download size={18} aria-hidden /> Save as PDF
                   </button>
               </div>
               <div className="space-y-6 lg:space-y-8" id="printable-transcript">
                   {transcript.map((t, idx) => (
                       <div key={idx} className="rounded-2xl bg-surface-container-highest p-5 sm:p-6 lg:p-8 border border-outline-variant/40 shadow-md w-full">
                           <h3 className="text-base md:text-lg font-bold font-['Outfit'] text-on-surface mb-5 sm:mb-6 inline-flex items-center gap-2 bg-primary-container/20 px-4 py-2 rounded-full border border-primary-container/30">Round {idx+1}: {t.stage}</h3>
                           <div className="space-y-3 sm:space-y-4 mt-1">
                               {t.chat.map((m: any, mIdx: number) => (
                                   <div key={mIdx} className={`rounded-2xl px-4 py-4 sm:px-5 sm:py-4 shadow-sm ${m.sender === 'bot' ? 'bg-surface border border-outline-variant/20 text-left' : 'bg-primary-container/10 border border-primary-container/30 text-right ml-6 sm:ml-12 md:ml-20 max-w-full'}`}>
                                       <span className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${m.sender === 'bot' ? 'text-secondary-container' : 'text-primary-container'}`}>{m.sender === 'bot' ? 'Interviewer' : `${candidateName || 'You'}`}</span>
                                       <p className="text-[15px] leading-relaxed text-on-surface whitespace-pre-wrap break-words">{m.content}</p>
                                   </div>
                               ))}
                           </div>
                       </div>
                   ))}
               </div>
           </motion.div>
          ) : currentStage === 0 ? (
            <motion.div key="stage0" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0, y:-12}} className="relative flex min-h-[52vh] flex-col items-center overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest/35 px-6 py-14 text-center shadow-2xl backdrop-blur-md md:p-20 lg:col-span-12">
              <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary-container/20 blur-[100px]" />
              <div className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-secondary-container/20 blur-[100px]" />
              <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary-container/30 bg-primary-container/20 shadow-lg ring-1 ring-primary-container/25">
                <Video size={40} className="text-primary-container" aria-hidden />
              </div>
              <h2 className="relative mb-4 max-w-2xl font-['Outfit'] text-3xl font-bold tracking-tight text-on-surface bg-gradient-to-r from-on-surface to-on-surface-variant bg-clip-text text-transparent md:text-5xl">Start your mock interview</h2>
              <p className="relative mb-12 max-w-lg text-base leading-relaxed text-on-surface-variant md:mb-14 md:text-lg">
                Six stages tailored to your resume — intro through coding. Adjust question counts, then step in when you are ready.
              </p>
              <div className="relative my-10 w-full max-w-2xl text-left sm:my-12 md:my-14">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-7">
                <label className="block text-base font-medium text-on-surface sm:text-lg">Mock section
                  <select className="mt-2 w-full min-h-11 rounded-xl border border-outline-variant/50 bg-surface-container-high px-3.5 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40" value={stageCounts[2]} onChange={(e) => setStageCounts((p) => ({ ...p, 2: Number(e.target.value) }))}>
                    <option value={10}>10 questions</option>
                    <option value={20}>20 questions</option>
                    <option value={30}>30 questions</option>
                  </select>
                </label>
                <label className="block text-base font-medium text-on-surface sm:text-lg">Hiring manager
                  <select className="mt-2 w-full min-h-11 rounded-xl border border-outline-variant/50 bg-surface-container-high px-3.5 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40" value={stageCounts[3]} onChange={(e) => setStageCounts((p) => ({ ...p, 3: Number(e.target.value) }))}>
                    <option value={5}>5 questions</option>
                    <option value={10}>10 questions</option>
                  </select>
                </label>
                <label className="block text-base font-medium text-on-surface sm:text-lg">Technical panel
                  <select className="mt-2 w-full min-h-11 rounded-xl border border-outline-variant/50 bg-surface-container-high px-3.5 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40" value={stageCounts[4]} onChange={(e) => setStageCounts((p) => ({ ...p, 4: Number(e.target.value) }))}>
                    <option value={10}>10 questions</option>
                    <option value={20}>20 questions</option>
                    <option value={30}>30 questions</option>
                  </select>
                </label>
                <label className="block text-base font-medium text-on-surface sm:text-lg">System design / coding
                  <select className="mt-2 w-full min-h-11 rounded-xl border border-outline-variant/50 bg-surface-container-high px-3.5 py-2.5 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container/40" value={stageCounts[5]} onChange={(e) => setStageCounts((p) => ({ ...p, 5: Number(e.target.value), 6: Number(e.target.value) }))}>
                    <option value={1}>1 each</option>
                    <option value={2}>2 each</option>
                  </select>
                </label>
                </div>
              </div>
              <button type="button" disabled={isGenerating} onClick={handleStart} className="relative mt-10 inline-flex min-h-11 min-w-[200px] items-center justify-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-high px-10 py-4 text-base font-bold text-on-surface transition-all duration-300 hover:border-primary-container hover:shadow-lg hover:ring-1 hover:ring-primary-container/35 disabled:opacity-45 md:mt-12 md:py-5 md:text-lg">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    Preparing…
                  </>
                ) : (
                  <>
                    <Play size={22} className="shrink-0" aria-hidden />
                    Begin session
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div key="stageActive" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid grid-cols-1 items-start gap-6 xl:col-span-12 xl:grid-cols-12 xl:gap-8">
              <div className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-outline-variant/35 bg-surface-container-high/45 shadow-2xl backdrop-blur-xl xl:col-span-8 xl:min-h-[620px]">
                <div className="flex shrink-0 flex-col gap-6 border-b border-outline-variant/25 bg-surface-container-lowest/40 px-6 py-8 sm:flex-row sm:items-start sm:justify-between sm:gap-7 md:px-8 md:py-9">
                  <div className="flex min-w-0 gap-4 md:gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-secondary-container/40 bg-secondary-container/25 md:h-[3.25rem] md:w-[3.25rem]">
                      <MessageSquare size={22} className="text-primary-container" aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-3.5 pt-0.5 md:space-y-4">
                      <h3 className="font-['Outfit'] text-lg font-semibold text-on-surface md:text-xl">Conversation</h3>
                      <p className="text-sm leading-relaxed text-on-surface-variant md:text-[15px] md:leading-relaxed">Type or use the mic — speech becomes text in the box.</p>
                    </div>
                  </div>
                  <button type="button" onClick={nextStage} disabled={loading} className={`w-full shrink-0 whitespace-normal rounded-xl border px-6 py-4 text-center text-[11px] font-bold uppercase leading-snug tracking-wide transition-all sm:w-auto sm:min-w-[8.5rem] sm:self-start md:px-7 ${readyForNextStage ? "border-primary-container bg-primary-container text-on-primary-container shadow-lg ring-1 ring-primary-container/50" : "border-primary-container/35 bg-surface-container-high/50 text-primary-container hover:bg-primary-container/15"} disabled:opacity-45`}>
                    Next stage
                  </button>
                </div>
                <div className="mx-5 mb-2 mt-7 flex shrink-0 items-start gap-4 rounded-xl border border-primary-container/20 bg-primary-container/8 px-5 py-5 md:mx-8 md:mb-3 md:mt-9 md:gap-5 md:px-7 md:py-6">
                  <Lightbulb size={20} className="mt-0.5 shrink-0 text-primary-container" aria-hidden />
                  <p className="min-w-0 text-sm leading-relaxed text-on-surface-variant md:text-[15px] md:leading-relaxed">
                    {currentStage === 1 && "Intro only: your name, background, strengths, and goal."}
                    {currentStage === 3 && "Hiring manager: behavioral and project-focused questions."}
                    {currentStage === 4 && "Technical panel: rigorous, interview-standard depth."}
                    {currentStage !== 1 && currentStage !== 3 && currentStage !== 4 && "Answer with a clear structure."}
                  </p>
                </div>
                <div className="flex min-h-0 max-h-[min(62vh,680px)] flex-1 flex-col gap-8 overflow-y-auto px-5 py-8 md:gap-10 md:px-8 md:py-9 xl:max-h-[min(66vh,760px)]">
                  {messages.map((m, i) => (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={i} className="w-full min-w-0">
                      <div className={`w-full min-w-0 rounded-2xl px-6 py-7 shadow-lg md:px-7 md:py-8 ${m.sender === "user" ? "rounded-br-md border border-on-primary-container/15 bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container" : "rounded-bl-md border border-outline-variant/50 bg-surface-container-lowest/95 text-on-surface backdrop-blur-md"}`}>
                        {m.sender === "bot" && (
                          <div className="mb-6 flex flex-wrap items-center gap-3">
                            <img src="/logo.png" alt="" className="h-7 w-7 shrink-0 rounded-full border border-primary-container/50 bg-surface p-1 object-contain" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Interviewer</span>
                          </div>
                        )}
                        {m.sender === "user" && <span className="mb-5 block text-right text-[10px] font-semibold uppercase tracking-wider text-on-primary-container/80">You</span>}
                        <div className={`min-w-0 text-[15px] leading-[1.75] whitespace-pre-wrap break-words md:text-base md:leading-[1.8] ${m.sender === "user" ? "text-on-primary-container" : "text-on-surface"}`}>{m.content}</div>
                        {m.evaluation && (
                          <div className={`mt-7 space-y-3 rounded-xl border border-outline-variant/25 px-4 py-5 pt-6 ${m.sender === "user" ? "bg-surface-container-lowest/45" : "bg-surface-container-lowest/35"}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-primary-container">
                              <span>Score</span>
                              <span className="tabular-nums rounded-lg border border-primary-container/30 bg-surface px-2 py-0.5 text-base text-on-surface">{m.evaluation.overall_score}/10</span>
                            </div>
                            {m.evaluation.gap_analysis?.length > 0 && (
                              <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-on-surface-variant">
                                {m.evaluation.gap_analysis.map((gap: string, gIdx: number) => (
                                  <li key={gIdx} className="break-words">{gap}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="flex w-full justify-start">
                      <div className="inline-flex items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-high/60 px-4 py-3 text-sm text-on-surface-variant">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-container" />
                        Evaluating…
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 space-y-4 border-t border-outline-variant/25 bg-surface-container-lowest/50 px-5 py-5 md:px-7 md:py-6">
                  {(currentStage === 5 || currentStage === 6) && (
                    <div className="flex flex-wrap gap-2">
                      {currentStage === 5 && (
                        <a href="https://excalidraw.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/45 bg-surface-container-high/70 px-4 py-2.5 text-xs font-medium transition-colors hover:border-primary-container/50">
                          <PenSquare size={14} className="shrink-0 text-primary-container" aria-hidden />
                          Excalidraw
                        </a>
                      )}
                      {currentStage === 6 && (
                        <a href="https://www.onlinegdb.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/45 bg-surface-container-high/70 px-4 py-2.5 text-xs font-medium transition-colors hover:border-primary-container/50">
                          <Code2 size={14} className="shrink-0 text-primary-container" aria-hidden />
                          Code playground
                        </a>
                      )}
                    </div>
                  )}
                  <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-high/50">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-3 sm:px-5">
                      <span className="text-xs font-medium text-on-surface">Your answer</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isRecordingAnswer ? "bg-error/15 text-error" : "bg-primary-container/15 text-primary-container"}`}>
                        {isRecordingAnswer ? "Listening…" : "Speech to text"}
                      </span>
                    </div>
                    <div className="p-4 sm:p-5">
                      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your response… (mic + send below)" className="min-h-[96px] w-full resize-y rounded-2xl border border-outline-variant/50 bg-surface-container-high px-4 py-3 text-[15px] leading-relaxed text-on-surface shadow-inner placeholder:text-on-surface-variant/60 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-container sm:min-h-[104px]" rows={3} disabled={loading} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                    </div>
                    <div className="flex flex-col gap-3 border-t border-outline-variant/25 bg-surface-container-lowest/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
                      <button type="button" onClick={handleNeedHelp} disabled={loading} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:text-primary-container disabled:opacity-45 sm:justify-start">
                        <HelpCircle size={14} className="shrink-0 text-secondary-container" aria-hidden />
                        Suggested answer
                      </button>
                      {/* --------- */}
                      {/* <div className="flex w-full min-w-0 overflow-hidden rounded-xl border-2 border-primary-container/45 bg-surface-container-high shadow-md ring-1 ring-primary-container/20 sm:max-w-sm sm:shrink-0">
                        <motion.button type="button" whileTap={{ scale: 0.98 }} aria-label={isRecordingAnswer ? "Stop dictation" : "Start dictation"} onClick={toggleCandidateVoice} disabled={loading || currentStage < 1 || currentStage > 6} className={`flex min-h-12 flex-1 items-center justify-center gap-2 border-r border-outline-variant/40 px-3 py-3 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${isRecordingAnswer ? "bg-error/10 text-error" : "text-primary-container hover:bg-primary-container/10"} disabled:opacity-35`}>
                          {isRecordingAnswer ? <MicOff size={20} className="shrink-0" aria-hidden /> : <Mic size={20} className="shrink-0" aria-hidden />}
                          <span className="hidden sm:inline">{isRecordingAnswer ? "Stop" : "Dictate"}</span>
                        </motion.button>
                        <button type="button" onClick={handleSend} disabled={loading || !answer.trim()} className="flex min-h-12 flex-1 items-center justify-center gap-2 bg-primary-container px-3 py-3 text-xs font-semibold text-on-primary-container transition-all hover:opacity-90 disabled:opacity-40 sm:px-5 sm:text-sm">
                          <Send size={18} className="shrink-0" aria-hidden />
                          Send
                        </button>
                      </div> */}

                        {/* ----------------------- */}
                        

 {/* INPUT */}
 {/* <div className="fixed bottom-0 left-0 right-0 bg-black/80 px-6 py-4">
            <div className="max-w-4xl mx-auto flex gap-3">

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="flex-1 input-field"
              />

              <button onClick={toggleMic} className="btn-secondary p-3">
                {recording ? <MicOff /> : <Mic />}
              </button>

              <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="btn-secondary p-3">
                {voiceEnabled ? <Volume2 /> : <VolumeX />}
              </button>

              <button onClick={handleSend} className="btn-primary p-3">
                <Send />
              </button>
            </div>
          </div>
           */}

<div className="fixed bottom-0 left-0 right-0 bg-black/80 px-6 py-4">
  <div className="max-w-4xl mx-auto flex gap-3">

    <textarea
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
      className="flex-1 input-field"
    />

    {/* 🎤 Mic Button (Merged Logic) */}
    <button
      type="button"
      onClick={toggleCandidateVoice}
      disabled={loading || currentStage < 1 || currentStage > 6}
      aria-label={isRecordingAnswer ? "Stop dictation" : "Start dictation"}
      className={`btn-secondary p-3 flex items-center justify-center transition-colors
        ${isRecordingAnswer 
          ? "bg-red-500/20 text-red-400" 
          : "text-white hover:bg-white/10"}
        disabled:opacity-40`}
    >
      {isRecordingAnswer ? <MicOff /> : <Mic />}
    </button>

    {/* 🔊 Voice Toggle */}
    <button
      onClick={() => setVoiceEnabled(!voiceEnabled)}
      className="btn-secondary p-3"
    >
      {voiceEnabled ? <Volume2 /> : <VolumeX />}
    </button>

    {/* 📤 Send Button */}
    <button
      onClick={handleSend}
      disabled={loading || !answer.trim()}
      className="btn-primary p-3 disabled:opacity-40"
    >
      <Send />
    </button>

  </div>
</div>









                        
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-2 flex min-w-0 flex-col gap-4 xl:col-span-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-outline-variant/35 bg-surface-container-high/50 px-5 py-4 shadow-lg backdrop-blur-md md:px-6">
                  <span className="inline-flex w-fit items-center gap-2 justify-self-start rounded-full border border-primary-container/25 bg-primary-container/15 px-3 py-1.5 text-xs font-bold text-on-surface">
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary-container shadow-lg ring-2 ring-primary-container/50" aria-hidden />
                    Live
                  </span>
                  <span className={`justify-self-center whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-bold tabular-nums ${timeLeft <= 30 ? "animate-pulse border-error/40 bg-error/15 text-error" : "border-outline-variant/50 bg-surface-container-lowest text-on-surface"}`}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="justify-self-end text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">Round {currentStage}<span className="opacity-50">/6</span></span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border bg-surface-container-lowest shadow-2xl transition-all duration-500 ${aiSpeaking ? "border-primary-container shadow-lg ring-2 ring-primary-container/30" : "border-outline-variant/30"}`}>
                    <div className={`flex h-32 w-32 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high shadow-2xl transition-transform duration-700 ${aiSpeaking ? "scale-110 border-primary-container ring-2 ring-primary-container/40 shadow-lg" : ""}`}>
                      <div className="relative">
                        <UserRound size={48} className={aiSpeaking ? "text-primary-container" : "text-on-surface-variant"} />
                        <Sparkles size={16} className="absolute -right-1 -top-1 animate-pulse text-primary-container" />
                      </div>
                    </div>
                    {aiSpeaking && (
                      <div className="absolute bottom-[18%] flex h-8 items-end gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="w-1.5 rounded-full bg-primary-container" style={{ height: `${24 + (i * 7) % 40}%`, animation: `pulse ${0.25 + i * 0.05}s ease-in-out infinite alternate` }} />
                        ))}
                      </div>
                    )}
                    <div className="absolute bottom-5 left-5 rounded-xl border border-outline-variant/30 bg-surface/60 px-4 py-2 backdrop-blur-xl">
                      <span className="text-xs font-bold tracking-wider text-on-surface">PrepAI</span>
                    </div>
                  </div>
                  <div className="relative aspect-video overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
                    {webcamEnabled ? (
                      <Webcam audio={false} className="h-full w-full object-cover opacity-90" mirrored />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-outline-variant/50">
                        <CameraOff size={48} className="mb-4 opacity-50" />
                        <span className="text-sm font-medium tracking-widest uppercase">Stream offline</span>
                      </div>
                    )}
                    <div className="absolute bottom-5 left-5 max-w-[calc(100%-5rem)] rounded-xl border border-outline-variant/30 bg-surface/60 px-4 py-2 backdrop-blur-xl">
                      <span className="break-words text-xs font-bold leading-snug tracking-wider text-on-surface">{candidateName} (You)</span>
                    </div>
                    <button type="button" onClick={() => setWebcamEnabled(!webcamEnabled)} aria-label={webcamEnabled ? "Turn camera off" : "Turn camera on"} className="absolute right-5 top-5 rounded-full border border-outline-variant/30 bg-surface/60 p-3 text-on-surface backdrop-blur-xl transition hover:bg-surface-container-high">
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
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-xl card p-6 sm:p-8 space-y-4">
            <h3 className="text-xl font-semibold font-['Outfit'] text-on-surface">Project context needed</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">{briefPromptText}</p>
            <textarea
              className="w-full min-h-[140px] bg-surface-container-high border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container focus:border-transparent"
              rows={6}
              value={briefInput}
              onChange={(e) => setBriefInput(e.target.value)}
              placeholder="Describe company, project problem, users, stack, your role, and impact..."
            />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setShowBriefModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSubmitBriefAndStart}>Proceed</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}



// "use client";

// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import Navbar from "@/components/Navbar";
// import Webcam from "react-webcam";
// import { motion } from "framer-motion";
// import {
//   Send,
//   Mic,
//   MicOff,
//   Camera,
//   CameraOff,
//   Loader2,
//   Volume2,
//   VolumeX,
//   HelpCircle,
// } from "lucide-react";
// import toast from "react-hot-toast";

// import {
//   sendQuickChat,
//   getStageQuestions,
//   saveProjectBrief,
// } from "@/lib/api";

// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";

// const STAGES = [
//   { id: 1, name: "Intro" },
//   { id: 2, name: "Mock" },
//   { id: 3, name: "Manager" },
//   { id: 4, name: "Technical" },
//   { id: 5, name: "System Design" },
//   { id: 6, name: "Coding" },
// ];

// export default function InterviewPage() {
//   const router = useRouter();

//   // ================= STATE =================
//   const [sessionId, setSessionId] = useState("");
//   const [messages, setMessages] = useState<any[]>([]);
//   const [answer, setAnswer] = useState("");
//   const [loading, setLoading] = useState(false);

//   const [currentStage, setCurrentStage] = useState(0);
//   const [questions, setQuestions] = useState<string[]>([]);
//   const [scores, setScores] = useState<number[]>([]);

//   const [webcamEnabled, setWebcamEnabled] = useState(true);
//   const [voiceEnabled, setVoiceEnabled] = useState(true);

//   const [recording, setRecording] = useState(false);
//   const recognitionRef = useRef<any>(null);

//   const [timeLeft, setTimeLeft] = useState(120);
//   const [answeredInStage, setAnsweredInStage] = useState(0);
//   const [stageCounts] = useState({
//     1: 1,
//     2: 5,
//     3: 3,
//     4: 5,
//     5: 1,
//     6: 1,
//   });

//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   // ================= INIT =================
//   useEffect(() => {
//     const sid = localStorage.getItem("session_id");
//     if (!sid) router.push("/setup");
//     else setSessionId(sid);
//   }, [router]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // ================= TIMER =================
//   useEffect(() => {
//     if (currentStage === 0) return;

//     const timer = setInterval(() => {
//       setTimeLeft((t) => {
//         if (t <= 1) {
//           toast("⏱ Time's up!");
//           return 0;
//         }
//         return t - 1;
//       });
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [currentStage]);

//   // ================= TTS =================
//   const speak = (text: string) => {
//     if (!voiceEnabled) return;
//     const utterance = new SpeechSynthesisUtterance(text);
//     speechSynthesis.speak(utterance);
//   };

//   const addBotMessage = (text: string, evaluation?: any) => {
//     setMessages((m) => [...m, { sender: "bot", text, evaluation }]);
//     speak(text);
//   };

//   // ================= START =================
//   const handleStart = async () => {
//     const data = await getStageQuestions(sessionId);

//     if (data?.needs_project_brief) {
//       const brief = prompt("Enter your project details:");
//       if (!brief) return;
//       await saveProjectBrief(sessionId, brief);
//       return handleStart();
//     }

//     setQuestions(data.questions);
//     setCurrentStage(1);
//     setAnsweredInStage(0);
//     addBotMessage(data.questions[0]);
//   };

//   // ================= SEND =================
//   const handleSend = async () => {
//     if (!answer.trim()) return;

//     const userText = answer;
//     setAnswer("");

//     setMessages((m) => [...m, { sender: "user", text: userText }]);
//     setLoading(true);

//     try {
//       const lastQ =
//         messages.slice().reverse().find((m) => m.sender === "bot")?.text ||
//         questions[currentStage - 1];

//       const context = messages
//         .map((m) => `${m.sender}: ${m.text}`)
//         .join("\n");

//       const res = await sendQuickChat(
//         sessionId,
//         lastQ,
//         userText,
//         STAGES[currentStage - 1].name,
//         context
//       );

//       let reply = res.reply;

//       if (
//         userText.toLowerCase().includes("not sure") &&
//         res?.evaluation?.improved_answer
//       ) {
//         reply =
//           "Suggested answer:\n\n" +
//           res.evaluation.improved_answer +
//           "\n\n" +
//           reply;
//       }

//       const newCount = answeredInStage + 1;
//       const target = stageCounts[currentStage];

//       if (newCount >= target) {
//         reply += "\n\n✅ Stage complete. Click Next.";
//       }

//       addBotMessage(reply, res.evaluation);

//       setScores((s) => [
//         ...s,
//         res.evaluation?.overall_score || 0,
//       ]);

//       setAnsweredInStage(newCount);
//       setTimeLeft(120);
//     } catch {
//       toast.error("Evaluation failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ================= NEXT =================
//   const nextStage = () => {
//     const next = currentStage + 1;

//     if (next > 6) {
//       toast.success("Interview completed!");
//       setCurrentStage(0);
//       return;
//     }

//     setCurrentStage(next);
//     setMessages([]);
//     setAnsweredInStage(0);
//     addBotMessage(questions[next - 1]);
//   };

//   // ================= MIC =================
//   const toggleMic = () => {
//     if (recording) {
//       recognitionRef.current?.stop();
//       setRecording(false);
//       return;
//     }

//     const SpeechRecognition =
//       (window as any).webkitSpeechRecognition;

//     if (!SpeechRecognition) {
//       toast.error("Speech not supported");
//       return;
//     }

//     const recognition = new SpeechRecognition();
//     recognition.continuous = true;

//     recognition.onresult = (e: any) => {
//       let text = "";
//       for (let i = e.resultIndex; i < e.results.length; i++) {
//         text += e.results[i][0].transcript;
//       }
//       setAnswer((prev) => prev + " " + text);
//     };

//     recognition.start();
//     recognitionRef.current = recognition;
//     setRecording(true);
//   };

//   // ================= CHART =================
//   const ScoreChart = () => (
//     <div className="card p-4 h-[200px]">
//       <p className="text-sm mb-2 text-gray-400">Performance</p>
//       <ResponsiveContainer width="100%" height="100%">
//         <LineChart data={scores.map((v, i) => ({ i, v }))}>
//           <XAxis dataKey="i" hide />
//           <YAxis domain={[0, 10]} />
//           <Tooltip />
//           <Line type="monotone" dataKey="v" strokeWidth={2} />
//         </LineChart>
//       </ResponsiveContainer>
//     </div>
//   );

//   // ================= UI =================
//   return (
//     <div className="h-screen flex flex-col">
//       <Navbar />

//       <div className="flex flex-1 pt-20">

//         {/* LEFT */}
//         <div className="flex-1 flex flex-col max-w-4xl mx-auto px-6">

//           {/* HEADER */}
//           <div className="flex justify-between items-center mb-4">
//             <div className="flex gap-2 flex-wrap">
//               {STAGES.map((s) => (
//                 <div
//                   key={s.id}
//                   className={`px-3 py-1 rounded-full text-xs ${
//                     currentStage === s.id
//                       ? "bg-purple-500 text-white"
//                       : "bg-gray-800 text-gray-400"
//                   }`}
//                 >
//                   {s.name}
//                 </div>
//               ))}
//             </div>

//             <div className="text-sm text-gray-400">
//               ⏱ {Math.floor(timeLeft / 60)}:
//               {(timeLeft % 60).toString().padStart(2, "0")}
//             </div>
//           </div>

//           {/* CHAT */}
//           <div className="flex-1 overflow-y-auto flex flex-col gap-6 pb-24">

//             {currentStage === 0 && (
//               <button onClick={handleStart} className="btn-primary mx-auto mt-20">
//                 Start Interview
//               </button>
//             )}

//             {messages.map((m, i) => (
//               <motion.div
//                 key={i}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className={`max-w-[80%] px-5 py-3 rounded-2xl ${
//                   m.sender === "user"
//                     ? "ml-auto bg-purple-600 text-white"
//                     : "bg-gray-900 border border-gray-700"
//                 }`}
//               >
//                 {m.text}

//                 {m.evaluation && (
//                   <div className="mt-2 text-xs text-gray-400">
//                     Score: {m.evaluation.overall_score}/10
//                   </div>
//                 )}
//               </motion.div>
//             ))}

//             {loading && (
//               <div className="flex items-center gap-2 text-sm text-gray-400">
//                 <Loader2 className="animate-spin" size={14} />
//                 Evaluating...
//               </div>
//             )}

//             <div ref={messagesEndRef} />
//           </div>

//           {/* INPUT */}
//           <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur px-6 py-4">
//             <div className="max-w-4xl mx-auto flex gap-3">

//               <textarea
//                 value={answer}
//                 onChange={(e) => setAnswer(e.target.value)}
//                 className="flex-1 input-field"
//               />

//               <button onClick={toggleMic} className="btn-secondary p-3">
//                 {recording ? <MicOff /> : <Mic />}
//               </button>

//               <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="btn-secondary p-3">
//                 {voiceEnabled ? <Volume2 /> : <VolumeX />}
//               </button>

//               <button onClick={handleSend} className="btn-primary p-3">
//                 <Send />
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* RIGHT */}
//         <div className="hidden lg:flex w-[380px] flex-col gap-4 p-4 border-l">

//           <div className="card h-[180px] flex items-center justify-center">
//             🤖 AI
//           </div>

//           <div className="relative card h-[220px]">
//             {webcamEnabled ? (
//               <Webcam className="w-full h-full object-cover" />
//             ) : (
//               <div className="flex items-center justify-center h-full">
//                 Camera Off
//               </div>
//             )}
//             <button
//               onClick={() => setWebcamEnabled(!webcamEnabled)}
//               className="absolute top-3 right-3 btn-secondary p-2"
//             >
//               {webcamEnabled ? <Camera /> : <CameraOff />}
//             </button>
//           </div>

//           <ScoreChart />
//         </div>
//       </div>
//     </div>
//   );
// }