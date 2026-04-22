// // frontend\app\interview\page.tsx
// "use client";
// import { useState, useEffect, useRef } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import toast from "react-hot-toast";
// import Webcam from "react-webcam";
// import { 
//   Send, Video, CameraOff, Camera, Play, Settings, Download, Loader2, ArrowLeft, Lightbulb, Volume2, VolumeX,
//   Sparkles, MessageSquare, Mic, MicOff, UserRound, Headphones, PenSquare, Code2, HelpCircle, Copy
// } from "lucide-react";
// import { sendQuickChat, getStageQuestions, saveProjectBrief, getResumeSummary, getResumeAnalytics } from "@/lib/api";
// import { motion, AnimatePresence } from "framer-motion";
// import Navbar from "@/components/Navbar";
// import ReactMarkdown from "react-markdown";
// import type { Components } from "react-markdown";

// const CHAT_GREEN = "#008a3e";
// const CHAT_BG = "#1a1a1a";
// const CHAT_ASSISTANT_SURFACE = "#252525";

// function InterviewCodeBlock({ code, lang }: { code: string; lang: string }) {
//   const [copied, setCopied] = useState(false);
//   const handleCopy = () => {
//     void navigator.clipboard.writeText(code);
//     setCopied(true);
//     window.setTimeout(() => setCopied(false), 2000);
//   };
//   return (
//     <div className="my-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#2d2d2d]">
//       <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5 text-xs text-white/50">
//         <span className="inline-flex items-center gap-2 font-medium text-white/70">
//           <Code2 size={14} className="shrink-0 text-white/55" aria-hidden />
//           <span className="capitalize">{lang || "code"}</span>
//         </span>
//         <button
//           type="button"
//           onClick={handleCopy}
//           className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
//         >
//           <Copy size={14} className="shrink-0" aria-hidden />
//           {copied ? "Copied" : "Copy"}
//         </button>
//       </div>
//       <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
//         <code className="font-mono text-[#d4d4d4]">{code}</code>
//       </pre>
//     </div>
//   );
// }

// const interviewChatMarkdownComponents: Partial<Components> = {
//   p: ({ children, ...props }) => (
//     <p className="mb-4 text-[15px] leading-[1.7] text-[#cccccc] last:mb-0" {...props}>
//       {children}
//     </p>
//   ),
//   strong: ({ children, ...props }) => (
//     <strong className="font-semibold text-white" {...props}>
//       {children}
//     </strong>
//   ),
//   em: ({ children, ...props }) => (
//     <em className="italic text-[#d0d0d0]" {...props}>
//       {children}
//     </em>
//   ),
//   ul: ({ children, ...props }) => (
//     <ul className="mb-4 list-disc space-y-2 pl-5 text-[#cccccc] last:mb-0 marker:text-white/75" {...props}>
//       {children}
//     </ul>
//   ),
//   ol: ({ children, ...props }) => (
//     <ol className="mb-4 list-decimal space-y-2 pl-5 text-[#cccccc] last:mb-0 marker:text-white/55" {...props}>
//       {children}
//     </ol>
//   ),
//   li: ({ children, ...props }) => (
//     <li className="leading-relaxed" {...props}>
//       {children}
//     </li>
//   ),
//   h1: ({ children, ...props }) => (
//     <h3 className="mb-3 mt-7 text-xl font-semibold tracking-tight text-white first:mt-0" {...props}>
//       {children}
//     </h3>
//   ),
//   h2: ({ children, ...props }) => (
//     <h3 className="mb-3 mt-6 flex items-center gap-2 text-lg font-semibold tracking-tight text-white first:mt-0" {...props}>
//       <span className="inline-block h-2 w-2 rotate-45 bg-sky-500/90 shadow-[0_0_8px_rgba(56,189,248,0.45)]" aria-hidden />
//       {children}
//     </h3>
//   ),
//   h3: ({ children, ...props }) => (
//     <h3 className="mb-2 mt-5 flex items-center gap-2 text-base font-semibold text-white first:mt-0" {...props}>
//       <span className="inline-block h-1.5 w-1.5 rotate-45 bg-sky-500/90" aria-hidden />
//       {children}
//     </h3>
//   ),
//   hr: () => <hr className="my-6 border-0 border-t border-[#333333]" />,
//   blockquote: ({ children, ...props }) => (
//     <blockquote className="my-4 border-l-2 pl-4 text-[#bbbbbb]" style={{ borderColor: `${CHAT_GREEN}99` }} {...props}>
//       {children}
//     </blockquote>
//   ),
//   a: ({ children, href, ...props }) => (
//     <a
//       href={href}
//       className="text-white underline decoration-dotted decoration-white/40 underline-offset-[3px] transition-colors hover:decoration-white/70"
//       {...props}
//     >
//       {children}
//     </a>
//   ),
//   pre: ({ children }) => <>{children}</>,
//   code: ({ className, children, ...props }) => {
//     const inline = !className;
//     if (inline) {
//       return (
//         <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#e8e8e8]" {...props}>
//           {children}
//         </code>
//       );
//     }
//     const match = /language-(\w+)/.exec(className || "");
//     const lang = match?.[1] || "code";
//     const codeString = String(children).replace(/\n$/, "");
//     return <InterviewCodeBlock code={codeString} lang={lang} />;
//   },
// };

// const STAGES = [
//   { id: 1, name: "Mock Section" },
//   { id: 2, name: "Hiring Manager" },
//   { id: 3, name: "Technical Panel" },
//   { id: 4, name: "System Design" },
//   { id: 5, name: "Coding" },
// ];

// export default function RealisticInterviewPage() {
//   const normalizeName = (name: string) => {
//     const bad = ["candidate", "professional experience", "experience", "resume"];
//     const n = (name || "").trim();
//     if (!n || bad.includes(n.toLowerCase())) return "Candidate";
//     return n;
//   };
//   const router = useRouter();
//   const [mounted, setMounted] = useState(false);
//   const [sessionId, setSessionId] = useState("");
//   const [candidateName, setCandidateName] = useState("");

//   const [currentStage, setCurrentStage] = useState(0); 
//   const [webcamEnabled, setWebcamEnabled] = useState(true);
  
//   // Dummy AI Video states
//   const [aiSpeaking, setAiSpeaking] = useState(false);
  
//   // Chat States
//   const [messages, setMessages] = useState<any[]>([]);
//   const [answer, setAnswer] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [dynamicStageQuestions, setDynamicStageQuestions] = useState<string[]>([]);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const [transcript, setTranscript] = useState<any[]>([]);
//   const [stageCounts, setStageCounts] = useState<Record<number, number>>({
//     1: 1,  // mock section
//     2: 1,  // hiring manager
//     3: 1,  // technical panel
//     4: 1,  // system design
//     5: 1,  // coding
//   });
//   const [answeredInStage, setAnsweredInStage] = useState(0);
//   const [readyForNextStage, setReadyForNextStage] = useState(false);
//   const [showBriefModal, setShowBriefModal] = useState(false);
//   const [briefPromptText, setBriefPromptText] = useState("");
//   const [briefInput, setBriefInput] = useState("");
//   const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
//   const [selectedVoiceName, setSelectedVoiceName] = useState("");
//   const [voiceEnabled, setVoiceEnabled] = useState(true);
//   const [isRecordingAnswer, setIsRecordingAnswer] = useState(false);
//   const speechRecognitionRef = useRef<any>(null);
//   const answerTextareaRef = useRef<HTMLTextAreaElement>(null);

//   useEffect(() => {
//     const el = answerTextareaRef.current;
//     if (!el) return;
//     el.style.height = "0px";
//     el.style.height = `${Math.min(Math.max(el.scrollHeight, 48), 200)}px`;
//   }, [answer]);

//   // Persist stage counts
//   useEffect(() => {
//     const sid = localStorage.getItem("session_id");
//     if (!sid) return;
//     const stored = localStorage.getItem(`stage_counts_${sid}`);
//     if (stored) {
//       try {
//         const parsed = JSON.parse(stored);
//         setStageCounts(parsed);
//       } catch (e) {}
//     }
//   }, []);

//   useEffect(() => {
//     const sid = localStorage.getItem("session_id");
//     if (sid) {
//       localStorage.setItem(`stage_counts_${sid}`, JSON.stringify(stageCounts));
//     }
//   }, [stageCounts]);

//   // Timer State
//   const [timeLeft, setTimeLeft] = useState(120);

//   useEffect(() => {
//     let timer: any;
//     if (currentStage > 0 && currentStage <= 5 && timeLeft > 0) {
//       timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
//     } else if (timeLeft === 0 && !loading) {
//         toast("Time's up for this question!");
//     }
//     return () => clearInterval(timer);
//   }, [currentStage, timeLeft, loading]);

//   useEffect(() => {
//     setMounted(true);
//     const sid = localStorage.getItem("session_id");
//     if (!sid) { router.push("/setup"); return; }
//     setSessionId(sid);
//     const localName = normalizeName(localStorage.getItem("candidate_name") || "");
//     if (localName) setCandidateName(localName);
//     getResumeSummary(sid)
//       .then((data) => {
//         const cleaned = normalizeName(data?.candidate_name || "");
//         if (cleaned && cleaned !== "Candidate") {
//           localStorage.setItem("candidate_name", cleaned);
//           setCandidateName(cleaned);
//         } else {
//           getResumeAnalytics(sid)
//             .then((a) => {
//               const intro = (a?.sample_intro || "") as string;
//               const m = intro.match(/my name is\s+([A-Za-z ]+)\./i);
//               const inferred = normalizeName((m?.[1] || "").trim());
//               if (inferred !== "Candidate") {
//                 localStorage.setItem("candidate_name", inferred);
//                 setCandidateName(inferred);
//               } else {
//                 setCandidateName(localName || "Candidate");
//               }
//             })
//             .catch(() => setCandidateName(localName || "Candidate"));
//         }
//       })
//       .catch(() => setCandidateName(localName || "Candidate"));
//   }, [router]);

//   useEffect(() => {
//     return () => {
//       try {
//         speechRecognitionRef.current?.stop?.();
//       } catch {
//         /* ignore */
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (typeof window === "undefined" || !window.speechSynthesis) return;
//     const loadVoices = () => {
//       const voices = window.speechSynthesis.getVoices() || [];
//       const english = voices.filter((v) => /en|english/i.test(v.lang) || /english/i.test(v.name));
//       const finalVoices = english.length ? english : voices;
//       setAvailableVoices(finalVoices);
//       if (!selectedVoiceName && finalVoices.length > 0) {
//         const preferred =
//           finalVoices.find((v) => /female|samantha|zira|aria|google/i.test(v.name)) ||
//           finalVoices[0];
//         setSelectedVoiceName(preferred.name);
//       }
//     };
//     loadVoices();
//     window.speechSynthesis.onvoiceschanged = loadVoices;
//     return () => {
//       window.speechSynthesis.onvoiceschanged = null;
//     };
//   }, [selectedVoiceName]);

//   const handleStart = async () => {
//     setIsGenerating(true);
//     try {
//       const data = await getStageQuestions(sessionId);
//       if (data?.needs_project_brief) {
//         setBriefPromptText(
//           data.briefing_prompt ||
//             "Please share your first project details: problem, stack, your role, and impact."
//         );
//         setShowBriefModal(true);
//         return;
//       }
//       if (data && data.questions && data.questions.length > 0) {
//         setDynamicStageQuestions(data.questions);
//         setCurrentStage(1);
//         setAnsweredInStage(0);
//         setReadyForNextStage(false);
//         addBotMessage(data.questions[0]);
//       } else {
//         throw new Error("Empty questions returned");
//       }
//     } catch (e) {
//       toast.error("Failed to generate contextual questions.");
//     } finally {
//       setIsGenerating(false);
//     }
//   };

//   const handleSubmitBriefAndStart = async () => {
//     if (!briefInput || briefInput.trim().length < 40) {
//       toast.error("Please provide a bit more detail.");
//       return;
//     }
//     try {
//       setLoading(true);
//       await saveProjectBrief(sessionId, briefInput.trim());
//       setShowBriefModal(false);
//       setBriefInput("");
//       const refreshed = await getStageQuestions(sessionId);
//       if (!refreshed?.questions || refreshed.questions.length === 0) {
//         throw new Error("Could not generate questions after project brief.");
//       }
//       setDynamicStageQuestions(refreshed.questions);
//       setCurrentStage(1);
//       setAnsweredInStage(0);
//       setReadyForNextStage(false);
//       addBotMessage(refreshed.questions[0]);
//     } catch (e: any) {
//       toast.error(e?.message || "Failed to start interview from project brief.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const addBotMessage = (text: string) => {
//     setMessages(prev => [...prev, { sender: "bot", content: text }]);
//     // Speak using TTS
//     if (voiceEnabled && typeof window !== "undefined" && window.speechSynthesis) {
//       window.speechSynthesis.cancel();
//       const utterance = new SpeechSynthesisUtterance(text);
//       utterance.onstart = () => setAiSpeaking(true);
//       utterance.onend = () => setAiSpeaking(false);
//       utterance.onerror = () => setAiSpeaking(false);
//       const voice = availableVoices.find((v) => v.name === selectedVoiceName);
//       if (voice) utterance.voice = voice;
//       window.speechSynthesis.speak(utterance);
//     }
//   };

//   const nextStage = async () => {
//     setTranscript(prev => [...prev, { stage: STAGES[currentStage-1].name, chat: [...messages] }]);
//     const next = currentStage + 1;
//     if (next <= 5) {
//       setCurrentStage(next);
//       setMessages([]);
//       setTimeLeft(120);
//       setAnsweredInStage(0);
//       setReadyForNextStage(false);
      
//       setLoading(true);
//       try {
//         const { getStageQuestions } = await import("@/lib/api");
//         const data = await getStageQuestions(sessionId, STAGES[next - 1].name);
//         if (data && data.questions && data.questions.length > 0) {
//            addBotMessage(data.questions[0]);
//         }
//       } catch (err) {
//         toast.error("Failed to load question for next stage.");
//       } finally {
//         setLoading(false);
//       }
//     } else {
//       setCurrentStage(6);
//       toast.success("Interview Completed!");
//     }
//   };

//   const handleRetakeStage = () => {
//     setMessages([]);
//     setAnsweredInStage(0);
//     setReadyForNextStage(false);
//     setTimeLeft(120);
//     // Add a slight delay to ensure UI resets before bot speaks
//     setTimeout(() => {
//         addBotMessage(dynamicStageQuestions[currentStage - 1]);
//     }, 100);
//     toast.success(`Stage ${currentStage} reset. You can try again!`);
//   };

//   const toggleCandidateVoice = () => {
//     if (isRecordingAnswer) {
//       speechRecognitionRef.current?.stop?.();
//       setIsRecordingAnswer(false);
//       return;
//     }
//     if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
//       toast.error("Voice input needs Chrome or Edge.");
//       return;
//     }
//     const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
//     const recognition = new Ctor();
//     recognition.continuous = true;
//     recognition.interimResults = true;
//     recognition.lang = "en-US";
//     recognition.onresult = (event: any) => {
//       let chunk = "";
//       for (let i = event.resultIndex; i < event.results.length; ++i) {
//         chunk += event.results[i][0].transcript;
//       }
//       if (event.results[event.results.length - 1].isFinal) {
//         setAnswer((prev) => {
//           const t = prev.trim();
//           const sp = t.length > 0 && !t.endsWith(" ") ? " " : "";
//           return t + sp + chunk.trim();
//         });
//       }
//     };
//     recognition.onerror = () => {
//       setIsRecordingAnswer(false);
//       toast.error("Microphone error — check permissions.");
//     };
//     recognition.onend = () => setIsRecordingAnswer(false);
//     recognition.start();
//     speechRecognitionRef.current = recognition;
//     setIsRecordingAnswer(true);
//     toast("Listening… tap mic again to stop.", { icon: "🎙️", duration: 3000 });
//   };

//   const handleSend = async () => {
//     if (isRecordingAnswer && speechRecognitionRef.current) {
//       speechRecognitionRef.current.stop();
//       setIsRecordingAnswer(false);
//     }
//     if (!answer.trim()) return;
//     setMessages(prev => [...prev, { sender: "user", content: answer }]);
    
//     // Find the last question asked by bot to send as context
//     const reversedMsgs = [...messages].reverse();
//     const lastBotMsg = reversedMsgs.find(m => m.sender === "bot")?.content || dynamicStageQuestions[currentStage - 1];
    
//     const currentAnswer = answer;
//     const lowerAnswer = currentAnswer.toLowerCase();
//     const unsure = ["not sure", "don't know", "do not know", "no idea", "unable to answer", "can't answer", "cannot answer"]
//       .some((k) => lowerAnswer.includes(k));
//     setAnswer("");
//     setLoading(true);

//     try {
//       const prevContext = messages.map(m => `${m.sender}: ${m.content}`).join("\n");
//       const data = await sendQuickChat(sessionId, lastBotMsg, currentAnswer, STAGES[currentStage-1].name, prevContext);
      
//       // Push AI reply and Evaluation Metadata
//       let replyText = data.reply;
//       if (unsure && data?.evaluation?.improved_answer) {
//         replyText = `I understand you were unsure about this one. An expected answer could be:\n\n${data.evaluation.improved_answer}\n\n${data.reply}`;
//       }

//       const target = stageCounts[currentStage] || 1;
//       const newCount = answeredInStage + 1;
//       let finalReply = replyText;

//       if (newCount >= target) {
//         finalReply = `Thank you for completing this answer. I have recorded your response and analyzed your technical gaps below.\n\n✅ Section complete (${newCount}/${target}). Click "Next Stage" when ready.`;
//         setReadyForNextStage(true);
//       } else {
//         finalReply = `Question ${newCount + 1}/${target}:\n\n${replyText}`;
//         setReadyForNextStage(false);
//       }

//       setMessages(prev => [...prev, {
//           sender: "bot", 
//           content: finalReply,
//           evaluation: data.evaluation // Store strict scores in chat
//       }]);
//       setAnsweredInStage(newCount);
      
//       if (voiceEnabled && typeof window !== "undefined" && window.speechSynthesis) {
//         const utterance = new SpeechSynthesisUtterance(replyText);
//         const voice = availableVoices.find((v) => v.name === selectedVoiceName);
//         if (voice) utterance.voice = voice;
//         window.speechSynthesis.speak(utterance);
//       }
//     } catch (err: any) {
//       const detail = err?.response?.data?.detail;
//       toast.error(detail || "Failed to process answer.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleNeedHelp = async () => {
//     if (loading || currentStage < 1 || currentStage > 5) return;
//     setAnswer("I am not sure about this answer. Please suggest a good answer.");
//     setTimeout(() => handleSend(), 0);
//   };

//   if (!mounted) return null;

//   const handleLogout = () => {
//     localStorage.removeItem("session_id");
//     localStorage.removeItem("api_provider");
//     router.push("/");
//   };

//   return (
//     <div className="relative min-h-screen flex flex-col font-['Inter'] text-on-surface overflow-x-hidden bg-surface">
//       <div className="pointer-events-none fixed inset-0 bg-primary-container/[0.07]" aria-hidden />
//       <div className="pointer-events-none fixed top-20 -left-24 h-72 w-72 rounded-full bg-primary-container/15 blur-[88px]" aria-hidden />
//       <div className="pointer-events-none fixed bottom-10 right-0 h-64 w-64 rounded-full bg-secondary-container/15 blur-[80px]" aria-hidden />

//       {/* <header className="sticky top-0 z-50 border-b border-outline-variant/30 bg-surface/90 backdrop-blur-xl">
//         <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center justify-between gap-x-5 gap-y-4 px-4 py-4 sm:px-6 sm:py-4 lg:px-8">
//           <Link href="/dashboard" className="flex min-w-0 items-center gap-3 text-xl font-bold tracking-tight text-on-surface no-underline md:text-2xl">
//             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-container to-secondary-container shadow-lg ring-1 ring-primary-container/30 md:h-11 md:w-11">
//               <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
//             </div>
//             <span>WBL <span className="text-primary-container">PrepHub</span></span>
//           </Link>
//           <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">
//             <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-high/50 px-3.5 py-2.5 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary-container/50 hover:text-on-surface md:text-sm md:px-4">
//               <ArrowLeft size={16} className="shrink-0 opacity-80" aria-hidden />
//               Dashboard
//             </Link>
//             <Link href="/setup" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-high/50 text-on-surface-variant transition-colors hover:border-primary-container/50 hover:text-on-surface md:h-11 md:w-11" aria-label="Setup">
//               <Settings size={20} className="md:h-[22px] md:w-[22px]" />
//             </Link>
//             <div className="flex items-center gap-3 rounded-full border border-outline-variant/40 bg-surface-container-high py-1.5 pl-1.5 pr-4">
//               <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-secondary-container text-sm font-bold text-on-primary-container">
//                 {candidateName ? candidateName.charAt(0).toUpperCase() : "U"}
//               </div>
//               <div className="min-w-0 leading-tight">
//                 <span className="block text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">You</span>
//                 <span className="block max-w-[10rem] break-words text-sm font-semibold leading-snug text-on-surface sm:max-w-[14rem]">{candidateName || "Candidate"}</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </header> */}


// <Navbar
//         candidateName={candidateName}
//         onLogout={handleLogout}
//       />
//       <main className="relative z-10 mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 pb-10 pt-16 sm:gap-7 sm:px-6 sm:pb-12 sm:pt-20 lg:gap-8 lg:px-8 lg:pb-14 lg:pt-24">

//         {/* Stage progress — original position (top of main) */}
//         <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="w-full overflow-x-auto overscroll-contain rounded-2xl border border-outline-variant/50 bg-surface-container-low/60 px-4 py-5 shadow-lg backdrop-blur-md sm:px-6 sm:py-6 md:px-8 md:py-7">
//           <div className="mx-auto flex min-w-max items-end justify-center gap-0 pb-0.5 lg:min-w-0 lg:w-full">
//             {STAGES.map((s, idx) => {
//               const isActive = currentStage === s.id;
//               const isPast = currentStage > s.id;
//               return (
//                 <div key={s.id} className="flex min-w-0 flex-1 items-end">
//                   <div className="flex w-[5rem] shrink-0 flex-col items-center gap-2.5 sm:w-24 md:w-28 lg:w-32">
//                     <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 sm:h-11 sm:w-11 sm:text-sm ${isActive ? "scale-105 bg-primary-container text-on-primary-container shadow-lg ring-2 ring-primary-container ring-offset-2 ring-offset-surface" : isPast ? "bg-secondary-container text-on-secondary" : "bg-surface-container-highest text-on-surface-variant"}`}>
//                       {s.id}
//                     </div>
//                     <span className={`w-full break-words px-1 text-center text-[10px] font-medium leading-snug sm:text-[11px] md:text-xs ${isActive ? "font-bold text-primary-container" : isPast ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>
//                       {s.name}
//                     </span>
//                   </div>
//                   {idx < STAGES.length - 1 && (
//                     <div className={`mx-2 mb-[1.6rem] h-px min-w-4 max-w-full flex-1 self-end sm:mx-3 ${isPast ? "bg-gradient-to-r from-secondary-container to-primary-container" : "bg-outline-variant/30"}`} />
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </motion.div>

//         {/* Voice row — original two-card layout */}
//         <div className="w-full grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
//           <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="lg:col-span-2 rounded-2xl border border-outline-variant/50 bg-surface-container-high/40 p-5 shadow-lg backdrop-blur-md md:p-6">
//             <div className="flex items-start gap-4">
//               <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-container/30 bg-primary-container/20">
//                 <Headphones size={20} className="text-primary-container" />
//               </div>
//               <div className="min-w-0 pt-0.5">
//                 <p className="font-['Outfit'] text-base font-semibold text-on-surface">Interviewer voice</p>
//                 <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">How the AI sounds when reading questions aloud.</p>
//               </div>
//             </div>
//           </motion.div>
//           <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl border border-outline-variant/50 bg-surface-container-high/40 p-5 shadow-lg backdrop-blur-md md:p-6">
//             <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
//               <button type="button" onClick={() => setVoiceEnabled((v) => !v)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-high px-4 py-2.5 text-xs font-semibold transition-colors hover:border-primary-container/50">
//                 {voiceEnabled ? <Volume2 size={16} className="shrink-0 text-primary-container" aria-hidden /> : <VolumeX size={16} className="shrink-0" aria-hidden />}
//                 {voiceEnabled ? "TTS on" : "TTS off"}
//               </button>
//               <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)} className="input-field min-h-11 w-full min-w-0 flex-1 rounded-xl border border-outline-variant/50 px-3 py-2.5 text-xs sm:min-w-[160px]">
//                 {availableVoices.map((v) => (
//                   <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
//                 ))}
//               </select>
//               <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-high px-4 py-2.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary-container/50" onClick={() => {
//                 if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
//                 const u = new SpeechSynthesisUtterance("Hello, this is your selected interview voice.");
//                 const v = availableVoices.find((x) => x.name === selectedVoiceName);
//                 if (v) u.voice = v;
//                 window.speechSynthesis.cancel();
//                 window.speechSynthesis.speak(u);
//               }}>
//                 <Sparkles size={14} className="shrink-0 text-primary-container" aria-hidden />
//                 Test
//               </button>
//             </div>
//           </motion.div>
//         </div>

//         <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12">
//           <AnimatePresence mode="wait">
//           {currentStage === 6 ? (
//              <motion.div key="stage7" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} className="lg:col-span-12 rounded-3xl bg-surface-container-low/40 backdrop-blur-2xl p-6 sm:p-8 lg:p-10 border border-outline-variant/50 shadow-2xl min-h-[50vh] mb-10 lg:mb-16 w-full">
//                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 sm:gap-6 mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-outline-variant/20">
//                    <div className="min-w-0 space-y-2">
//                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-['Outfit'] text-on-surface bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-on-surface-variant">Interview transcript</h2>
//                      <p className="text-on-surface-variant text-sm md:text-base max-w-2xl leading-relaxed">Everything you practiced in this session, ready to save or print.</p>
//                    </div>
//                    <button type="button" onClick={() => window.print()} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary-container to-primary-container px-5 py-3 text-sm font-bold text-on-primary shadow-lg ring-1 ring-primary-container/40 transition-all hover:-translate-y-0.5 hover:ring-primary-container/60 sm:w-auto sm:px-6">
//                        <Download size={18} aria-hidden /> Save as PDF
//                    </button>
//                </div>
//                <div className="space-y-6 lg:space-y-8" id="printable-transcript">
//                    {transcript.map((t, idx) => (
//                        <div key={idx} className="rounded-2xl bg-surface-container-highest p-5 sm:p-6 lg:p-8 border border-outline-variant/40 shadow-md w-full">
//                            <h3 className="text-base md:text-lg font-bold font-['Outfit'] text-on-surface mb-5 sm:mb-6 inline-flex items-center gap-2 bg-primary-container/20 px-4 py-2 rounded-full border border-primary-container/30">Round {idx+1}: {t.stage}</h3>
//                            <div className="space-y-3 sm:space-y-4 mt-1">
//                                {t.chat.map((m: any, mIdx: number) => (
//                                     <div key={mIdx} className={`rounded-2xl px-5 py-5 sm:px-6 sm:py-5 shadow-sm ${m.sender === 'bot' ? 'bg-surface border border-outline-variant/20 text-left' : 'bg-primary-container/10 border border-primary-container/30 text-right ml-6 sm:ml-12 md:ml-20 max-w-full'}`}>
//                                         <span className={`text-[10px] font-bold uppercase tracking-wider block mb-3 ${m.sender === 'bot' ? 'text-secondary-container' : 'text-primary-container'}`}>{m.sender === 'bot' ? 'Interviewer' : `${candidateName || 'You'}`}</span>
//                                         <div className="text-[15px] leading-relaxed text-on-surface whitespace-pre-wrap break-words">
//                                             <ReactMarkdown components={interviewChatMarkdownComponents}>{m.content}</ReactMarkdown>
//                                         </div>
//                                         {m.evaluation && (
//                                             <div className="mt-5 space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-4 text-left shadow-inner">
//                                                 <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
//                                                     <span>Evaluation Score</span>
//                                                     <span className="tabular-nums rounded-lg border border-primary-container/30 bg-primary-container/15 px-3 py-1 text-sm font-semibold text-primary-container">
//                                                         {m.evaluation.overall_score}/10
//                                                     </span>
//                                                 </div>
//                                                 {m.evaluation.gap_analysis?.length > 0 && (
//                                                     <div className="mt-3 text-sm text-on-surface">
//                                                         <span className="mb-2 block text-xs font-semibold text-error">Gap Analysis:</span>
//                                                         <ul className="list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-on-surface-variant">
//                                                             {m.evaluation.gap_analysis.map((gap: string, gIdx: number) => (
//                                                                 <li key={gIdx} className="break-words">
//                                                                     {gap}
//                                                                 </li>
//                                                             ))}
//                                                         </ul>
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         )}
//                                     </div>
//                                ))}
//                            </div>
//                        </div>
//                    ))}
//                </div>
//            </motion.div>
//           ) : currentStage === 0 ? (
//             <motion.div key="stage0" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0, y:-12}} className="relative flex min-h-[52vh] flex-col items-center overflow-hidden rounded-3xl border border-white/10 bg-[#111118]/80 px-6 py-14 shadow-2xl backdrop-blur-2xl md:p-20 lg:col-span-12">
//               <div className="pointer-events-none absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-primary-container/20 blur-[120px]" />
//               <div className="pointer-events-none absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-secondary-container/20 blur-[120px]" />
              
//               <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-primary-container/30 bg-primary-container/10 shadow-[0_0_40px_rgba(var(--primary-container-rgb),0.3)] ring-1 ring-primary-container/25">
//                 <Video size={48} className="text-primary-container drop-shadow-md" aria-hidden />
//                 <div className="absolute inset-0 rounded-[2rem] border-t border-white/20"></div>
//               </div>
              
//               <h2 className="relative mb-4 max-w-3xl text-center font-['Outfit'] text-4xl font-extrabold tracking-tight text-white drop-shadow-sm md:text-6xl">
//                 Configure your <span className="bg-gradient-to-r from-primary-container to-secondary-container bg-clip-text text-transparent">Interview Protocol</span>
//               </h2>
//               <p className="relative mb-14 max-w-2xl text-center text-lg leading-relaxed text-white/50 md:text-xl">
//                 Fine-tune the rigorousness of your 5-stage simulation. We've bypassed the intro module to jump straight into dynamic technical and behavioral assessments.
//               </p>

//               <div className="relative w-full max-w-5xl">
//                 <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
//                   {[
//                     { id: 1, name: "General Mock", icon: UserRound, color: "from-blue-500/20 to-cyan-500/5", border: "border-blue-500/30" },
//                     { id: 2, name: "Hiring Manager", icon: MessageSquare, color: "from-purple-500/20 to-fuchsia-500/5", border: "border-purple-500/30" },
//                     { id: 3, name: "Tech Panel", icon: Sparkles, color: "from-emerald-500/20 to-teal-500/5", border: "border-emerald-500/30" },
//                     { id: 4, name: "System Design", icon: PenSquare, color: "from-orange-500/20 to-red-500/5", border: "border-orange-500/30" },
//                     { id: 5, name: "Live Coding", icon: Code2, color: "from-indigo-500/20 to-violet-500/5", border: "border-indigo-500/30" }
//                   ].map((stage) => (
//                     <div key={stage.id} className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border ${stage.border} bg-white/[0.02] p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/[0.04] hover:shadow-xl`}>
//                       <div className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-50`} />
//                       <div className="relative z-10 mb-4 flex items-center justify-between">
//                         <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 shadow-inner`}>
//                           <stage.icon size={18} className="text-white/80" />
//                         </div>
//                         <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Stage {stage.id}</span>
//                       </div>
//                       <div className="relative z-10">
//                         <h3 className="mb-3 font-['Outfit'] text-base font-bold text-white/90">{stage.name}</h3>
//                         <div className="relative">
//                           <select 
//                             className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm font-medium text-white/80 outline-none transition-colors hover:border-white/25 focus:border-primary-container focus:ring-1 focus:ring-primary-container"
//                             value={stageCounts[stage.id]} 
//                             onChange={(e) => setStageCounts((p) => ({ ...p, [stage.id]: Number(e.target.value) }))}
//                           >
//                             {[...Array(20)].map((_, i) => <option key={i} value={i+1} className="bg-[#1a1a24] text-white">{i+1} Questions</option>)}
//                           </select>
//                           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white/40">
//                              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <button type="button" disabled={isGenerating} onClick={handleStart} className="group relative mt-14 overflow-hidden rounded-2xl bg-white px-12 py-5 font-['Outfit'] text-lg font-bold tracking-wide text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] disabled:opacity-50">
//                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity group-hover:animate-shimmer group-hover:opacity-100"></div>
//                 {isGenerating ? (
//                   <span className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Uplinking...</span>
//                 ) : (
//                   <span className="flex items-center gap-3"><Play size={20} className="fill-current" /> Initialize Protocol</span>
//                 )}
//               </button>
//             </motion.div>
//           ) : (
//             <motion.div key="stageActive" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid grid-cols-1 items-start gap-6 xl:col-span-12 xl:grid-cols-12 xl:gap-8">
//               <div className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111118]/95 shadow-2xl backdrop-blur-xl xl:col-span-8 xl:h-[min(72vh,820px)] xl:max-h-[calc(100vh-9rem)]">
//                 <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 md:px-5">
//                   <div className="flex min-w-0 items-center gap-2.5">
//                     <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
//                       <MessageSquare size={18} className="text-[#008a3e]" aria-hidden />
//                     </div>
//                     <div className="min-w-0">
//                       <h3 className="font-['Outfit'] text-sm font-semibold tracking-tight text-white">Conversation</h3>
//                       <p className="truncate text-xs text-white/45">Enter to send · Shift+Enter new line</p>
//                     </div>
//                   </div>
//                   <div className="flex shrink-0 items-center gap-2">
//                     <button
//                       type="button"
//                       onClick={nextStage}
//                       disabled={loading}
//                       className={`shrink-0 rounded-full px-5 py-2 text-center text-[11px] font-extrabold uppercase tracking-widest transition-all duration-300 ${
//                         readyForNextStage
//                           ? "animate-pulse border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-[#111118]"
//                           : "border border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10"
//                       } disabled:opacity-45`}
//                     >
//                       {currentStage === 5 ? "Finish interview" : "Next stage"}
//                     </button>
//                   </div>
//                 </div>

//                 <div className="shrink-0 px-4 pt-2 pb-1 md:px-5">
//                   <div className="flex items-start gap-2 rounded-lg border border-primary-container/25 bg-primary-container/[0.12] px-3 py-2">
//                     <Lightbulb size={15} className="mt-0.5 shrink-0 text-primary-container" aria-hidden />
//                     <p className="min-w-0 text-xs leading-snug text-white/65">
//                       {currentStage === 1 && "Intro only: your name, background, strengths, and goal."}
//                       {currentStage === 3 && "Hiring manager: behavioral and project-focused questions."}
//                       {currentStage === 4 && "Technical panel: rigorous, interview-standard depth."}
//                       {currentStage !== 1 && currentStage !== 3 && currentStage !== 4 && "Answer with a clear structure."}
//                     </p>
//                   </div>
//                 </div>

//                 <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2 md:px-4">
//                   <div
//                     className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/8"
//                     style={{ backgroundColor: CHAT_BG }}
//                   >
//                     <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-6 md:space-y-8 md:px-8 md:py-8">
//                       {messages.length === 0 && !loading && (
//                         <p className="text-center text-sm text-white/35">Messages will appear here.</p>
//                       )}
//                       {messages.map((m, i) => (
//                         <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} key={i} className="w-full min-w-0">
//                           {m.sender === "user" ? (
//                             <div className="flex w-full justify-end">
//                               <div
//                                 className="inline-block max-w-[min(90%,32rem)] rounded-3xl rounded-br-md px-6 py-4 text-left text-[15px] leading-relaxed text-white shadow-md tracking-wide"
//                                 style={{ backgroundColor: CHAT_GREEN }}
//                               >
//                                 <p className="whitespace-pre-wrap break-words">{m.content}</p>
//                               </div>
//                             </div>
//                           ) : (
//                             <div className="flex w-full justify-start">
//                               <div
//                                 className="w-full max-w-full rounded-3xl rounded-bl-md border border-white/10 px-6 py-5 shadow-lg sm:max-w-[min(100%,46rem)] md:px-8 md:py-6"
//                                 style={{ backgroundColor: CHAT_ASSISTANT_SURFACE }}
//                               >
//                                 <div className="mb-2.5 flex items-center gap-2">
//                                   <div
//                                     className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10"
//                                     style={{ backgroundColor: `${CHAT_GREEN}26` }}
//                                   >
//                                     <img src="/logo.png" alt="" className="h-4 w-4 object-contain opacity-95" />
//                                   </div>
//                                   <span className="text-xs font-semibold text-white/80">PrepAI</span>
//                                 </div>
//                                 <div className="min-w-0 text-[15px] leading-relaxed text-[#d4d4d4]">
//                                   <ReactMarkdown components={interviewChatMarkdownComponents}>{m.content}</ReactMarkdown>
//                                 </div>
//                                 {m.evaluation && (
//                                   <div className="mt-4 space-y-2.5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-3.5">
//                                     <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
//                                       <span>Score</span>
//                                       <span className="tabular-nums rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-base font-semibold text-white">
//                                         {m.evaluation.overall_score}/10
//                                       </span>
//                                     </div>
//                                     {m.evaluation.gap_analysis?.length > 0 && (
//                                       <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-[#b8b8b8]">
//                                         {m.evaluation.gap_analysis.map((gap: string, gIdx: number) => (
//                                           <li key={gIdx} className="break-words">
//                                             {gap}
//                                           </li>
//                                         ))}
//                                       </ul>
//                                     )}
//                                   </div>
//                                 )}
//                               </div>
//                             </div>
//                           )}
//                         </motion.div>
//                       ))}
//                       {loading && (
//                         <div className="flex w-full justify-start mt-4">
//                           <div
//                             className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-5 py-3 text-sm tracking-wide text-[#d4d4d4] shadow-md backdrop-blur-md"
//                             style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
//                           >
//                             <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" aria-hidden />
//                             {messages.length === 0 ? "Uplinking to next module..." : "Evaluating and parsing context..."}
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//                 <div className="shrink-0 space-y-2 border-t border-white/10 bg-[#0c0c0f] px-3 py-3 md:px-4 md:py-3">
//                   {(currentStage === 5 || currentStage === 6) && (
//                     <div className="flex flex-wrap gap-2">
//                       {currentStage === 5 && (
//                         <a
//                           href="https://excalidraw.com/"
//                           target="_blank"
//                           rel="noreferrer"
//                           className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:border-primary-container/50 hover:text-white"
//                         >
//                           <PenSquare size={13} className="shrink-0 text-primary-container" aria-hidden />
//                           Excalidraw
//                         </a>
//                       )}
//                       {currentStage === 6 && (
//                         <a
//                           href="https://www.onlinegdb.com/"
//                           target="_blank"
//                           rel="noreferrer"
//                           className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:border-primary-container/50 hover:text-white"
//                         >
//                           <Code2 size={13} className="shrink-0 text-primary-container" aria-hidden />
//                           Code playground
//                         </a>
//                       )}
//                     </div>
//                   )}
//                   <div className="flex items-end gap-1 rounded-[1.35rem] border border-white/12 bg-[#303030] py-1.5 pl-4 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
//                     <textarea
//                       ref={answerTextareaRef}
//                       value={answer}
//                       onChange={(e) => setAnswer(e.target.value)}
//                       placeholder="Message…"
//                       rows={1}
//                       disabled={loading}
//                       className="max-h-[200px] min-h-[48px] w-0 min-w-0 flex-1 resize-none bg-transparent py-3 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/40"
//                       onKeyDown={(e) => {
//                         if (e.key === "Enter" && !e.shiftKey) {
//                           e.preventDefault();
//                           handleSend();
//                         }
//                       }}
//                     />
//                     <button
//                       type="button"
//                       onClick={toggleCandidateVoice}
//                       disabled={loading || currentStage < 1 || currentStage > 5}
//                       aria-label={isRecordingAnswer ? "Stop dictation" : "Start dictation"}
//                       className={`mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
//                         isRecordingAnswer ? "bg-red-500/20 text-red-400" : "text-white/70 hover:bg-white/10 hover:text-white"
//                       } disabled:opacity-40`}
//                     >
//                       {isRecordingAnswer ? <MicOff size={20} /> : <Mic size={20} />}
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => setVoiceEnabled((v) => !v)}
//                       aria-label={voiceEnabled ? "Turn interviewer voice off" : "Turn interviewer voice on"}
//                       className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
//                     >
//                       {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
//                     </button>
//                     <button
//                       type="button"
//                       onClick={handleSend}
//                       disabled={loading || !answer.trim()}
//                       aria-label="Send message"
//                       className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-opacity disabled:opacity-35"
//                       style={{ backgroundColor: CHAT_GREEN }}
//                     >
//                       <Send size={18} className="-ml-px" aria-hidden />
//                     </button>
//                   </div>
//                   <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
//                     <button
//                       type="button"
//                       onClick={handleNeedHelp}
//                       disabled={loading}
//                       className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-white/70 disabled:opacity-45"
//                     >
//                       <HelpCircle size={13} className="shrink-0 text-white/35" aria-hidden />
//                       Suggested answer
//                     </button>
//                     {isRecordingAnswer && <span className="text-xs font-medium text-red-400">Listening…</span>}
//                   </div>
//                 </div>
//               </div>

//               <div className="order-2 flex min-w-0 flex-col gap-4 xl:col-span-4">
//                 <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-outline-variant/35 bg-surface-container-high/50 px-5 py-4 shadow-lg backdrop-blur-md md:px-6">
//                   <span className="inline-flex w-fit items-center gap-2 justify-self-start rounded-full border border-primary-container/25 bg-primary-container/15 px-3 py-1.5 text-xs font-bold text-on-surface">
//                     <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary-container shadow-lg ring-2 ring-primary-container/50" aria-hidden />
//                     Live
//                   </span>
//                   <span className={`justify-self-center whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-bold tabular-nums ${timeLeft <= 30 ? "animate-pulse border-red-500/40 bg-red-500/15 text-red-400" : "border-white/10 bg-white/5 text-white/90"}`}>
//                     {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
//                   </span>
//                   <span className="justify-self-end text-right text-xs font-bold uppercase tracking-wider text-white/50">Round {currentStage}<span className="opacity-40">/5</span></span>
//                 </div>
//                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
//                   <div className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border bg-surface-container-lowest shadow-2xl transition-all duration-500 ${aiSpeaking ? "border-primary-container shadow-lg ring-2 ring-primary-container/30" : "border-outline-variant/30"}`}>
//                     <div className={`flex h-32 w-32 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high shadow-2xl transition-transform duration-700 ${aiSpeaking ? "scale-110 border-primary-container ring-2 ring-primary-container/40 shadow-lg" : ""}`}>
//                       <div className="relative">
//                         <UserRound size={48} className={aiSpeaking ? "text-primary-container" : "text-on-surface-variant"} />
//                         <Sparkles size={16} className="absolute -right-1 -top-1 animate-pulse text-primary-container" />
//                       </div>
//                     </div>
//                     {aiSpeaking && (
//                       <div className="absolute bottom-[18%] flex h-8 items-end gap-1">
//                         {[1, 2, 3, 4, 5].map((i) => (
//                           <div key={i} className="w-1.5 rounded-full bg-primary-container" style={{ height: `${24 + (i * 7) % 40}%`, animation: `pulse ${0.25 + i * 0.05}s ease-in-out infinite alternate` }} />
//                         ))}
//                       </div>
//                     )}
//                     <div className="absolute bottom-5 left-5 rounded-xl border border-outline-variant/30 bg-surface/60 px-4 py-2 backdrop-blur-xl">
//                       <span className="text-xs font-bold tracking-wider text-on-surface">PrepAI</span>
//                     </div>
//                   </div>
//                   <div className="relative aspect-video overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
//                     {webcamEnabled ? (
//                       <Webcam audio={false} className="h-full w-full object-cover opacity-90" mirrored />
//                     ) : (
//                       <div className="flex h-full flex-col items-center justify-center text-outline-variant/50">
//                         <CameraOff size={48} className="mb-4 opacity-50" />
//                         <span className="text-sm font-medium tracking-widest uppercase">Stream offline</span>
//                       </div>
//                     )}
//                     <div className="absolute bottom-5 left-5 max-w-[calc(100%-5rem)] rounded-xl border border-outline-variant/30 bg-surface/60 px-4 py-2 backdrop-blur-xl">
//                       <span className="break-words text-xs font-bold leading-snug tracking-wider text-on-surface">{candidateName} (You)</span>
//                     </div>
//                     <button type="button" onClick={() => setWebcamEnabled(!webcamEnabled)} aria-label={webcamEnabled ? "Turn camera off" : "Turn camera on"} className="absolute right-5 top-5 rounded-full border border-outline-variant/30 bg-surface/60 p-3 text-on-surface backdrop-blur-xl transition hover:bg-surface-container-high">
//                       {webcamEnabled ? <Camera size={18} aria-hidden /> : <CameraOff size={18} aria-hidden />}
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             </motion.div>
//           )}
//           </AnimatePresence>

//         </div>
//       </main>

//       {showBriefModal && (
//         <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
//           <div className="w-full max-w-xl card p-6 sm:p-8 space-y-4">
//             <h3 className="text-xl font-semibold font-['Outfit'] text-on-surface">Project context needed</h3>
//             <p className="text-sm text-on-surface-variant leading-relaxed">{briefPromptText}</p>
//             <textarea
//               className="w-full min-h-[140px] bg-surface-container-high border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary-container focus:border-transparent"
//               rows={6}
//               value={briefInput}
//               onChange={(e) => setBriefInput(e.target.value)}
//               placeholder="Describe company, project problem, users, stack, your role, and impact..."
//             />
//             <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
//               <button className="btn-secondary" onClick={() => setShowBriefModal(false)}>Cancel</button>
//               <button className="btn-primary" onClick={handleSubmitBriefAndStart}>Proceed</button>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// }



// frontend\app\interview\page.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Webcam from "react-webcam";
import { 
  Send, Video, CameraOff, Camera, Play, Settings, Download, Loader2, ArrowLeft, Lightbulb, Volume2, VolumeX,
  Sparkles, MessageSquare, Mic, MicOff, UserRound, Headphones, PenSquare, Code2, HelpCircle, Copy
} from "lucide-react";
import { sendQuickChat, getStageQuestions, saveProjectBrief, getResumeSummary, getResumeAnalytics } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const CHAT_GREEN = "#008a3e";
const CHAT_BG = "#1a1a1a";
const CHAT_ASSISTANT_SURFACE = "#252525";

function InterviewCodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/[0.08] bg-[#2d2d2d]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5 text-xs text-white/50">
        <span className="inline-flex items-center gap-2 font-medium text-white/70">
          <Code2 size={14} className="shrink-0 text-white/55" aria-hidden />
          <span className="capitalize">{lang || "code"}</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Copy size={14} className="shrink-0" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono text-[#d4d4d4]">{code}</code>
      </pre>
    </div>
  );
}

const interviewChatMarkdownComponents: Partial<Components> = {
  p: ({ children, ...props }) => (
    <p className="mb-4 text-[15px] leading-[1.7] text-[#cccccc] last:mb-0" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-white" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-[#d0d0d0]" {...props}>
      {children}
    </em>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-4 list-disc space-y-2 pl-5 text-[#cccccc] last:mb-0 marker:text-white/75" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-4 list-decimal space-y-2 pl-5 text-[#cccccc] last:mb-0 marker:text-white/55" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  h1: ({ children, ...props }) => (
    <h3 className="mb-3 mt-7 text-xl font-semibold tracking-tight text-white first:mt-0" {...props}>
      {children}
    </h3>
  ),
  h2: ({ children, ...props }) => (
    <h3 className="mb-3 mt-6 flex items-center gap-2 text-lg font-semibold tracking-tight text-white first:mt-0" {...props}>
      <span className="inline-block h-2 w-2 rotate-45 bg-sky-500/90 shadow-[0_0_8px_rgba(56,189,248,0.45)]" aria-hidden />
      {children}
    </h3>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mb-2 mt-5 flex items-center gap-2 text-base font-semibold text-white first:mt-0" {...props}>
      <span className="inline-block h-1.5 w-1.5 rotate-45 bg-sky-500/90" aria-hidden />
      {children}
    </h3>
  ),
  hr: () => <hr className="my-6 border-0 border-t border-[#333333]" />,
  blockquote: ({ children, ...props }) => (
    <blockquote className="my-4 border-l-2 pl-4 text-[#bbbbbb]" style={{ borderColor: `${CHAT_GREEN}99` }} {...props}>
      {children}
    </blockquote>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-white underline decoration-dotted decoration-white/40 underline-offset-[3px] transition-colors hover:decoration-white/70"
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
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-[#e8e8e8]" {...props}>
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
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }} className="relative flex flex-col overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0" style={{ background: "radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, transparent 70%)" }} aria-hidden />
      <div className="pointer-events-none fixed top-20 -left-24 h-72 w-72 rounded-full" style={{ background: "rgba(79, 70, 229, 0.15)", filter: "blur(80px)" }} aria-hidden />
      <div className="pointer-events-none fixed bottom-10 right-0 h-64 w-64 rounded-full" style={{ background: "rgba(99, 102, 241, 0.15)", filter: "blur(80px)" }} aria-hidden />

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
      <main className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-10 overflow-x-hidden px-6 pb-16 pt-20">
        <div className="flex w-full flex-col gap-10">

        {/* Stage progress — original position (top of main) */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", border: `1px solid var(--border)`, background: "rgba(79, 70, 229, 0.04)", borderRadius: "12px", padding: "24px", overflowX: "auto", backdropFilter: "blur(4px)" }} className="overflow-x-auto">
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

        <div className="mx-auto w-full max-w-[1000px]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          borderRadius: "12px",
          border: `1px solid var(--border)`,
          background: `rgba(79, 70, 229, 0.03)`,
          padding: "16px 20px",
          overflow: "hidden"
        }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: "rgba(79, 70, 229, 0.1)",
                flexShrink: 0,
                color: "var(--accent)"
              }}>
                <Headphones size={16} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Interviewer voice</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>How the AI sounds when reading questions aloud.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setVoiceEnabled((v) => !v)} style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 8,
                background: "rgba(79, 70, 229, 0.1)",
                border: `1px solid var(--border)`,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
                whiteSpace: "nowrap"
              }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(79, 70, 229, 0.15)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(79, 70, 229, 0.1)"}>
                {voiceEnabled ? <Volume2 size={16} style={{ color: "var(--accent)" }} aria-hidden /> : <VolumeX size={16} aria-hidden />}
                {voiceEnabled ? "TTS on" : "TTS off"}
              </button>
              <select value={selectedVoiceName} onChange={(e) => setSelectedVoiceName(e.target.value)} style={{
                width: 200,
                borderRadius: 8,
                background: "rgba(79, 70, 229, 0.1)",
                border: `1px solid var(--border)`,
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--text-primary)",
                outline: "none",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                flexShrink: 0
              }}>
                {availableVoices.map((v) => (
                  <option key={v.name} value={v.name} style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>{v.name} ({v.lang})</option>
                ))}
              </select>
              <button type="button" style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 8,
                background: "rgba(79, 70, 229, 0.1)",
                border: `1px solid var(--border)`,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s",
                flexShrink: 0,
                whiteSpace: "nowrap"
              }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(79, 70, 229, 0.15)"} onMouseLeave={(e) => e.currentTarget.style.background = "rgba(79, 70, 229, 0.1)"} onClick={() => {
                if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
                const u = new SpeechSynthesisUtterance("Hello, this is your selected interview voice.");
                const v = availableVoices.find((x) => x.name === selectedVoiceName);
                if (v) u.voice = v;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
              }}>
                <Sparkles size={18} style={{ color: "var(--accent)" }} aria-hidden />
                Test
              </button>
            </div>
        </motion.div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-12">
          <AnimatePresence mode="wait">
          {currentStage === 6 ? (
             <motion.div key="stage7" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} style={{
               gridColumn: "1 / -1",
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
            <motion.div key="stage0" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0, y:-12}} style={{ gridColumn: "1 / -1", display: "flex", width: "100%", justifyContent: "center" }}>
              <div style={{
                margin: "0 auto",
                display: "flex",
                width: "100%",
                maxWidth: 1000,
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
                <div className="mx-auto mt-6 w-full max-w-[1000px]">
                  <div className="grid grid-cols-1 justify-center justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      { id: 1, name: "General Mock", icon: UserRound, border: "border-blue-500/35", bg: "bg-blue-500/[0.04]", glow: "shadow-[0_0_26px_rgba(59,130,246,0.12)]", iconBg: "bg-blue-500/10", iconText: "text-blue-300" },
                      { id: 2, name: "Hiring Manager", icon: MessageSquare, border: "border-fuchsia-500/35", bg: "bg-fuchsia-500/[0.04]", glow: "shadow-[0_0_26px_rgba(217,70,239,0.12)]", iconBg: "bg-fuchsia-500/10", iconText: "text-fuchsia-300" },
                      { id: 3, name: "Tech Panel", icon: Sparkles, border: "border-emerald-500/35", bg: "bg-emerald-500/[0.04]", glow: "shadow-[0_0_26px_rgba(16,185,129,0.12)]", iconBg: "bg-emerald-500/10", iconText: "text-emerald-300" },
                      { id: 4, name: "System Design", icon: PenSquare, border: "border-orange-500/35", bg: "bg-orange-500/[0.04]", glow: "shadow-[0_0_26px_rgba(249,115,22,0.12)]", iconBg: "bg-orange-500/10", iconText: "text-orange-300" },
                      { id: 5, name: "Live Coding", icon: Code2, border: "border-violet-500/40", bg: "bg-violet-500/[0.04]", glow: "shadow-[0_0_26px_rgba(139,92,246,0.14)]", iconBg: "bg-violet-500/10", iconText: "text-violet-300" }
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
                          border: stage.border.replace('border-', 'border: 1px solid '),
                          background: stage.bg.replace('bg-', 'rgba('),
                          boxShadow: stage.glow.replace('shadow-', ''),
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
                            background: stage.iconBg.replace('bg-', 'rgba(')
                          }}>
                            <stage.icon size={22} style={{ color: stage.iconText.replace('text-', '') }} />
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
            <motion.div key="stageActive" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 24,
              gridColumn: "1 / -1"
            }} className="xl:grid-cols-12 xl:gap-8">
              <div style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderRadius: "20px",
                border: `1px solid var(--border)`,
                background: "rgba(79, 70, 229, 0.03)",
                boxShadow: "0 20px 25px rgba(0, 0, 0, 0.1)",
                backdropFilter: "blur(16px)",
                gridColumn: "1 / -1"
              }} className="xl:col-span-8">
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  borderBottom: `1px solid var(--border)`,
                  padding: "12px 16px",
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
                        fontSize: 14,
                        fontWeight: 600,
                        letterSpacing: "0.3px",
                        color: "var(--text-primary)",
                        margin: 0
                      }}>Conversation</h3>
                      <p style={{
                        truncate: "ellipsis",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        margin: "2px 0 0"
                      }}>Enter to send · Shift+Enter new line</p>
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
                      style={{
                        borderRadius: 20,
                        padding: "8px 20px",
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        transition: "all 0.3s",
                        cursor: loading ? "not-allowed" : "pointer",
                        border: readyForNextStage ? "none" : `1px solid var(--border)`,
                        background: readyForNextStage ? "var(--success)" : "rgba(79, 70, 229, 0.1)",
                        color: readyForNextStage ? "white" : "var(--text-primary)",
                        boxShadow: readyForNextStage ? "0 0 20px rgba(16, 185, 129, 0.4)" : "none",
                        opacity: loading ? 0.45 : 1,
                        animation: readyForNextStage ? "pulse 2s ease-in-out infinite" : "none"
                      }}
                    >
                      {currentStage === 5 ? "Finish interview" : "Next stage"}
                    </button>
                  </div>
                </div>

                <div style={{ flexShrink: 0, padding: "8px 16px 4px", fontSize: 0 }} className="md:px-5">
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    borderRadius: 8,
                    border: `1px solid var(--border-accent)`,
                    background: "rgba(79, 70, 229, 0.08)",
                    padding: "12px",
                  }}>
                    <Lightbulb size={15} style={{ marginTop: 4, flexShrink: 0, color: "var(--accent)" }} aria-hidden />
                    <p style={{ minWidth: 0, fontSize: 12, lineHeight: 1.4, color: "var(--text-secondary)", margin: 0 }}>
                      {currentStage === 1 && "Intro only: your name, background, strengths, and goal."}
                      {currentStage === 3 && "Hiring manager: behavioral and project-focused questions."}
                      {currentStage === 4 && "Technical panel: rigorous, interview-standard depth."}
                      {currentStage !== 1 && currentStage !== 3 && currentStage !== 4 && "Answer with a clear structure."}
                    </p>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2 md:px-4">
                  <div
                    className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/8"
                    style={{ backgroundColor: CHAT_BG }}
                  >
                    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-6 md:space-y-8 md:px-8 md:py-8">
                      {messages.length === 0 && !loading && (
                        <p className="text-center text-sm text-white/35">Messages will appear here.</p>
                      )}
                      {messages.map((m, i) => (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} key={i} className="w-full min-w-0">
                          {m.sender === "user" ? (
                            <div className="flex w-full justify-end">
                              <div
                                className="inline-block max-w-[min(90%,32rem)] rounded-3xl rounded-br-md px-6 py-4 text-left text-[15px] leading-relaxed text-white shadow-md tracking-wide"
                                style={{ backgroundColor: CHAT_GREEN }}
                              >
                                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex w-full justify-start">
                              <div
                                className="w-full max-w-full rounded-3xl rounded-bl-md border border-white/10 px-6 py-5 shadow-lg sm:max-w-[min(100%,46rem)] md:px-8 md:py-6"
                                style={{ backgroundColor: CHAT_ASSISTANT_SURFACE }}
                              >
                                <div className="mb-2.5 flex items-center gap-2">
                                  <div
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10"
                                    style={{ backgroundColor: `${CHAT_GREEN}26` }}
                                  >
                                    <img src="/logo.png" alt="" className="h-4 w-4 object-contain opacity-95" />
                                  </div>
                                  <span className="text-xs font-semibold text-white/80">PrepAI</span>
                                </div>
                                <div className="min-w-0 text-[15px] leading-relaxed text-[#d4d4d4]">
                                  <ReactMarkdown components={interviewChatMarkdownComponents}>{m.content}</ReactMarkdown>
                                </div>
                                {m.evaluation && (
                                  <div className="mt-4 space-y-2.5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-3.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
                                      <span>Score</span>
                                      <span className="tabular-nums rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-base font-semibold text-white">
                                        {m.evaluation.overall_score}/10
                                      </span>
                                    </div>
                                    {m.evaluation.gap_analysis?.length > 0 && (
                                      <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-[#b8b8b8]">
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
                            className="inline-flex items-center gap-3 rounded-2xl border border-white/10 px-5 py-3 text-sm tracking-wide text-[#d4d4d4] shadow-md backdrop-blur-md"
                            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
                          >
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" aria-hidden />
                            {messages.length === 0 ? "Uplinking to next module..." : "Evaluating and parsing context..."}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 space-y-2 border-t border-white/10 bg-[#0c0c0f] px-3 py-3 md:px-4 md:py-3">
                  {(currentStage === 5 || currentStage === 6) && (
                    <div className="flex flex-wrap gap-2">
                      {currentStage === 5 && (
                        <a
                          href="https://excalidraw.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:border-primary-container/50 hover:text-white"
                        >
                          <PenSquare size={13} className="shrink-0 text-primary-container" aria-hidden />
                          Excalidraw
                        </a>
                      )}
                      {currentStage === 6 && (
                        <a
                          href="https://www.onlinegdb.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:border-primary-container/50 hover:text-white"
                        >
                          <Code2 size={13} className="shrink-0 text-primary-container" aria-hidden />
                          Code playground
                        </a>
                      )}
                    </div>
                  )}
                  <div className="flex items-end gap-1 rounded-[1.35rem] border border-white/12 bg-[#303030] py-1.5 pl-4 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <textarea
                      ref={answerTextareaRef}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Message…"
                      rows={1}
                      disabled={loading}
                      className="max-h-[200px] min-h-[48px] w-0 min-w-0 flex-1 resize-none bg-transparent py-3 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/40"
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
                        isRecordingAnswer ? "bg-red-500/20 text-red-400" : "text-white/70 hover:bg-white/10 hover:text-white"
                      } disabled:opacity-40`}
                    >
                      {isRecordingAnswer ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceEnabled((v) => !v)}
                      aria-label={voiceEnabled ? "Turn interviewer voice off" : "Turn interviewer voice on"}
                      className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={loading || !answer.trim()}
                      aria-label="Send message"
                      className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-opacity disabled:opacity-35"
                      style={{ backgroundColor: CHAT_GREEN }}
                    >
                      <Send size={18} className="-ml-px" aria-hidden />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
                    <button
                      type="button"
                      onClick={handleNeedHelp}
                      disabled={loading}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-white/70 disabled:opacity-45"
                    >
                      <HelpCircle size={13} className="shrink-0 text-white/35" aria-hidden />
                      Suggested answer
                    </button>
                    {isRecordingAnswer && <span className="text-xs font-medium text-red-400">Listening…</span>}
                  </div>
                </div>
              </div>

              <div className="order-2 flex min-w-0 flex-col gap-4 xl:col-span-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-outline-variant/35 bg-surface-container-high/50 px-5 py-4 shadow-lg backdrop-blur-md md:px-6">
                  <span className="inline-flex w-fit items-center gap-2 justify-self-start rounded-full border border-primary-container/25 bg-primary-container/15 px-3 py-1.5 text-xs font-bold text-on-surface">
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary-container shadow-lg ring-2 ring-primary-container/50" aria-hidden />
                    Live
                  </span>
                  <span className={`justify-self-center whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-bold tabular-nums ${timeLeft <= 30 ? "animate-pulse border-red-500/40 bg-red-500/15 text-red-400" : "border-white/10 bg-white/5 text-white/90"}`}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="justify-self-end text-right text-xs font-bold uppercase tracking-wider text-white/50">Round {currentStage}<span className="opacity-40">/5</span></span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border bg-surface-container-lowest shadow-2xl transition-all duration-500 ${aiSpeaking ? "border-primary-container shadow-lg ring-2 ring-primary-container/30" : "border-outline-variant/30"}`}>
                    <div className={`flex h-32 w-32 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high shadow-2xl transition-transform duration-700 ${aiSpeaking ? "scale-110 border-primary-container ring-2 ring-primary-container/40 shadow-lg" : ""}`}>
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
                    aspectRatio: "16 / 9",
                    overflow: "hidden",
                    borderRadius: "20px",
                    border: `1px solid var(--border)`,
                    background: "var(--bg-secondary)",
                    boxShadow: "0 20px 25px rgba(0, 0, 0, 0.1)"
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
