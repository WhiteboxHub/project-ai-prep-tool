// // frontend\app\interview\page.tsx
// "use client";
// import { useState, useEffect, useRef, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import toast from "react-hot-toast";
// import Webcam from "react-webcam";
// import {
//   Send, Video, CameraOff, Camera, Play, Settings, Download, Loader2, ArrowLeft, Lightbulb, Volume2, VolumeX,
//   Sparkles, MessageSquare, Mic, MicOff, UserRound, Headphones, PenSquare, Code2, HelpCircle, Copy, FileText
// } from "lucide-react";
// import { sendQuickChat, getStageQuestions, saveProjectBrief, getResumeSummary, getResumeAnalytics } from "@/lib/api";
// import { motion, AnimatePresence } from "framer-motion";
// import Navbar from "@/components/Navbar";
// import ReactMarkdown from "react-markdown";
// import type { Components } from "react-markdown";

// const CHAT_GREEN = "#008a3e";
// const CHAT_BG = "#1a1a1a";
// const CHAT_ASSISTANT_SURFACE = "#252525";

// const TTS_VOICE_STORAGE_KEY = "wbl_interview_tts_voice";

// function stripForTts(text: string): string {
//   return text
//     .replace(/\*\*([^*]+)\*\*/g, "$1")
//     .replace(/#{1,6}\s?/gm, "")
//     .replace(/`+/g, "")
//     .replace(/\s+/g, " ")
//     .trim()
//     .slice(0, 8000);
// }

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
//       } catch (e) { }
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
//       toast("Time's up for this question!");
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
//       try {
//         window.speechSynthesis?.cancel();
//       } catch {
//         /* ignore */
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (typeof window === "undefined" || !window.speechSynthesis) return;
//     const saved = localStorage.getItem(TTS_VOICE_STORAGE_KEY) || "";
//     const loadVoices = () => {
//       const voices = window.speechSynthesis.getVoices() || [];
//       const english = voices.filter((v) => /en|english/i.test(v.lang) || /english/i.test(v.name));
//       const finalVoices = english.length ? english : voices;
//       setAvailableVoices(finalVoices);
//       setSelectedVoiceName((prev) => {
//         if (prev && finalVoices.some((v) => v.name === prev)) return prev;
//         if (saved && finalVoices.some((v) => v.name === saved)) return saved;
//         const preferred =
//           finalVoices.find((v) => /female|samantha|zira|aria|google/i.test(v.name)) ||
//           finalVoices[0];
//         return preferred?.name || "";
//       });
//     };
//     loadVoices();
//     window.speechSynthesis.onvoiceschanged = loadVoices;
//     return () => {
//       window.speechSynthesis.onvoiceschanged = null;
//     };
//   }, []);

//   const stopInterviewSpeech = useCallback(() => {
//     if (typeof window !== "undefined" && window.speechSynthesis) {
//       window.speechSynthesis.cancel();
//     }
//     setAiSpeaking(false);
//   }, []);

//   const speakInterviewText = useCallback(
//     (text: string) => {
//       if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
//       const plain = stripForTts(text);
//       if (!plain) return;
//       window.speechSynthesis.cancel();
//       const u = new SpeechSynthesisUtterance(plain);
//       u.onstart = () => setAiSpeaking(true);
//       u.onend = () => setAiSpeaking(false);
//       u.onerror = () => setAiSpeaking(false);
//       const voices = window.speechSynthesis.getVoices() || [];
//       const v = voices.find((x) => x.name === selectedVoiceName);
//       if (v) u.voice = v;
//       window.speechSynthesis.speak(u);
//     },
//     [voiceEnabled, selectedVoiceName]
//   );

//   const addBotMessage = useCallback(
//     (text: string) => {
//       setMessages((prev) => [...prev, { sender: "bot", content: text }]);
//       speakInterviewText(text);
//     },
//     [speakInterviewText]
//   );

//   const handleStart = async () => {
//     setIsGenerating(true);
//     try {
//       const data = await getStageQuestions(sessionId);
//       if (data?.needs_project_brief) {
//         setBriefPromptText(
//           data.briefing_prompt ||
//           "Please share your first project details: problem, stack, your role, and impact."
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

//   const nextStage = async () => {
//     stopInterviewSpeech();
//     setTranscript((prev) => [...prev, { stage: STAGES[currentStage - 1].name, chat: [...messages] }]);
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
//           addBotMessage(data.questions[0]);
//         }
//       } catch (err) {
//         toast.error("Failed to load question for next stage.");
//       } finally {
//         setLoading(false);
//       }
//     } else {
//       setCurrentStage(6);
//       toast.success("Interview completed!");
//     }
//   };

//   const handleRetakeStage = () => {
//     stopInterviewSpeech();
//     setMessages([]);
//     setAnsweredInStage(0);
//     setReadyForNextStage(false);
//     setTimeLeft(120);
//     setTimeout(() => {
//       addBotMessage(dynamicStageQuestions[currentStage - 1]);
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

//   const handleSend = async (overrideAnswer?: string, opts?: { countAsAnswer?: boolean }) => {
//     if (isRecordingAnswer && speechRecognitionRef.current) {
//       speechRecognitionRef.current.stop();
//       setIsRecordingAnswer(false);
//     }
//     const textToSend = (overrideAnswer ?? answer).trim();
//     if (!textToSend) return;

//     const countAsAnswer = opts?.countAsAnswer !== false;
//     const priorMessages = messages;
//     const reversedMsgs = [...priorMessages].reverse();
//     const lastBotMsg =
//       reversedMsgs.find((m) => m.sender === "bot")?.content ||
//       dynamicStageQuestions[currentStage - 1];

//     setMessages((prev) => [...prev, { sender: "user", content: textToSend }]);
//     if (overrideAnswer === undefined) setAnswer("");
//     setLoading(true);

//     try {
//       const target = stageCounts[currentStage] || 1;
//       const qIndex = answeredInStage + 1;
//       const prevContext = priorMessages.map((m) => `${m.sender}: ${m.content}`).join("\n");

//       const lowerAnswer = textToSend.toLowerCase();
//       const unsure = [
//         "not sure",
//         "don't know",
//         "do not know",
//         "no idea",
//         "unable to answer",
//         "can't answer",
//         "cannot answer",
//       ].some((k) => lowerAnswer.includes(k));

//       const data = await sendQuickChat(
//         sessionId,
//         lastBotMsg,
//         textToSend,
//         STAGES[currentStage - 1].name,
//         prevContext,
//         countAsAnswer
//           ? {
//               sectionQuestionTotal: target,
//               gradedTurnNumber: qIndex,
//               interactionMode: "graded",
//             }
//           : {
//               sectionQuestionTotal: target,
//               gradedTurnNumber: qIndex,
//               interactionMode: "suggest",
//             }
//       );

//       let replyText = (data.reply || "").trim() || "(No response text.)";

//       if (countAsAnswer && unsure && data?.evaluation?.improved_answer) {
//         replyText = `I understand you were unsure about this one. An expected answer could be:\n\n${data.evaluation.improved_answer}\n\n${replyText}`;
//       }

//       if (!countAsAnswer) {
//         setMessages((prev) => [
//           ...prev,
//           { sender: "bot", content: replyText, evaluation: data.evaluation },
//         ]);
//         speakInterviewText(replyText);
//         return;
//       }

//       const newCount = answeredInStage + 1;
//       setMessages((prev) => [
//         ...prev,
//         { sender: "bot", content: replyText, evaluation: data.evaluation },
//       ]);
//       setAnsweredInStage(newCount);
//       setReadyForNextStage(newCount >= target);

//       speakInterviewText(stripForTts(replyText));
//     } catch (err: any) {
//       const detail = err?.response?.data?.detail;
//       toast.error(detail || "Failed to process answer.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleNeedHelp = async () => {
//     if (loading || currentStage < 1 || currentStage > 5) return;
//     await handleSend("I am not sure about this answer. Please suggest a good answer.", { countAsAnswer: false });
//   };

//   if (!mounted) return null;

//   const handleLogout = () => {
//     stopInterviewSpeech();
//     localStorage.removeItem("session_id");
//     localStorage.removeItem("api_provider");
//     router.push("/");
//   };

//   return (
//     <div className="relative min-h-screen flex flex-col font-['Inter'] text-on-surface overflow-x-hidden bg-surface">
//       <div className="pointer-events-none fixed inset-0 bg-primary-container/[0.07]" aria-hidden />
//       <div className="pointer-events-none fixed top-20 -left-24 h-72 w-72 rounded-full bg-primary-container/15 blur-[88px]" aria-hidden />
//       <div className="pointer-events-none fixed bottom-10 right-0 h-64 w-64 rounded-full bg-secondary-container/15 blur-[80px]" aria-hidden />




//       <Navbar
//         candidateName={candidateName}
//         onLogout={handleLogout}
//       />
//       <main className="relative z-10 mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-5 px-4 pb-12 pt-20 sm:gap-6 sm:px-6 sm:pb-14 sm:pt-24 lg:gap-8 lg:px-8">

//         {/* Stage progress */}
//         <motion.div
//           initial={{ opacity: 0, y: -8 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="w-full overflow-x-auto overscroll-contain rounded-2xl border border-outline-variant/60 bg-surface-container-low/80 px-4 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06] backdrop-blur-md sm:px-6 sm:py-6 md:px-8"
//         >
//           <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant/90 sm:text-xs">
//             Interview path
//           </p>
//           <div className="mx-auto flex min-w-max items-end justify-center gap-0 pb-0.5 lg:min-w-0 lg:w-full">
//             {STAGES.map((s, idx) => {
//               const isActive = currentStage === s.id;
//               const isPast = currentStage > s.id;
//               return (
//                 <div key={s.id} className="flex min-w-0 flex-1 items-end">
//                   <div className="flex w-20 shrink-0 flex-col items-center gap-2 sm:w-24 md:w-28 lg:w-[7.25rem]">
//                     <div
//                       className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 sm:h-12 sm:w-12 sm:text-sm ${isActive ? "scale-105 bg-primary-container text-on-primary-container shadow-lg ring-2 ring-primary-container/80 ring-offset-2 ring-offset-surface" : isPast ? "bg-secondary-container text-on-secondary shadow-md" : "border border-outline-variant/50 bg-surface-container-highest text-on-surface-variant"}`}
//                     >
//                       {s.id}
//                     </div>
//                     <span
//                       className={`w-full px-0.5 text-center text-[11px] font-medium leading-tight sm:text-xs ${isActive ? "font-semibold text-primary-container" : isPast ? "text-on-surface/90" : "text-on-surface-variant/95"}`}
//                     >
//                       {s.name}
//                     </span>
//                   </div>
//                   {idx < STAGES.length - 1 && (
//                     <div
//                       className={`mx-2.5 mb-[1.75rem] h-[2px] min-w-4 max-w-full flex-1 self-end rounded-full sm:mx-3.5 ${isPast ? "bg-gradient-to-r from-secondary-container to-primary-container opacity-90" : "bg-outline-variant/40"}`}
//                     />
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </motion.div>

//         {/* Voice — single aligned bar */}
//         <motion.div
//           initial={{ opacity: 0, y: 8 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.05 }}
//           className="flex w-full flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-high/50 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.28)] ring-1 ring-white/[0.05] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5"
//         >
//           <div className="flex min-w-0 items-start gap-3">
//             <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-container/35 bg-primary-container/15">
//               <Headphones size={20} className="text-primary-container" aria-hidden />
//             </div>
//             <div className="min-w-0 pt-0.5">
//               <p className="font-['Outfit'] text-sm font-semibold text-on-surface sm:text-base">Interviewer voice</p>
//               <p className="mt-1 text-xs leading-relaxed text-on-surface-variant sm:text-sm">How the AI sounds when reading questions aloud.</p>
//             </div>
//           </div>
//           <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2.5 lg:max-w-[min(100%,42rem)]">
//             <button
//               type="button"
//               onClick={() => setVoiceEnabled((v) => !v)}
//               className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-high px-3.5 py-2 text-xs font-semibold transition-colors hover:border-primary-container/50 sm:min-h-11"
//             >
//               {voiceEnabled ? <Volume2 size={16} className="shrink-0 text-primary-container" aria-hidden /> : <VolumeX size={16} className="shrink-0" aria-hidden />}
//               {voiceEnabled ? "TTS on" : "TTS off"}
//             </button>
//             <select
//               value={selectedVoiceName}
//               onChange={(e) => {
//                 const v = e.target.value;
//                 setSelectedVoiceName(v);
//                 localStorage.setItem(TTS_VOICE_STORAGE_KEY, v);
//               }}
//               className="input-field min-h-10 w-full min-w-0 flex-1 rounded-xl border border-outline-variant/50 px-3 py-2 text-xs sm:min-h-11 sm:max-w-md sm:min-w-[200px]"
//             >
//               {availableVoices.map((v) => (
//                 <option key={v.name} value={v.name}>
//                   {v.name} ({v.lang})
//                 </option>
//               ))}
//             </select>
//             <button
//               type="button"
//               className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-high px-3.5 py-2 text-xs font-semibold text-on-surface transition-colors hover:border-primary-container/50 sm:min-h-11"
//               onClick={() => {
//                 if (!voiceEnabled) return;
//                 speakInterviewText("Hello, this is your selected voice in WBL Prep Tool.");
//               }}
//             >
//               <Sparkles size={14} className="shrink-0 text-primary-container" aria-hidden />
//               Test
//             </button>
//           </div>
//         </motion.div>

//         <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 md:gap-8 xl:grid-cols-12">
//           <AnimatePresence mode="wait">
//             {currentStage === 6 ? (
//               <motion.div key="stage7" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="lg:col-span-12 rounded-3xl bg-surface-container-low/40 backdrop-blur-2xl p-6 sm:p-8 lg:p-10 border border-outline-variant/50 shadow-2xl min-h-[50vh] mb-10 lg:mb-16 w-full">
//                 <div className="flex flex-col gap-5 sm:gap-6 mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-outline-variant/20 lg:flex-row lg:items-start lg:justify-between">
//                   <div className="min-w-0 space-y-2">
//                     <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-['Outfit'] bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-on-surface-variant">Interview transcript</h2>
//                     <p className="text-on-surface-variant text-sm md:text-base max-w-2xl leading-relaxed">
//                       Your WBL Prep Tool session — save a copy, open the full report, or generate a new one from your latest practice.
//                     </p>
//                   </div>
//                   <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto">
//                     <Link
//                       href="/report"
//                       className="btn-primary inline-flex w-full items-center justify-center gap-2 no-underline sm:w-auto"
//                     >
//                       <FileText size={18} aria-hidden /> Generate report
//                     </Link>
//                     <Link
//                       href="/report"
//                       className="btn-secondary inline-flex w-full items-center justify-center gap-2 no-underline sm:w-auto"
//                     >
//                       <FileText size={18} aria-hidden /> View report
//                     </Link>
//                     <button type="button" onClick={() => window.print()} className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-secondary-container to-primary-container px-5 py-3 text-sm font-bold text-on-primary shadow-lg ring-1 ring-primary-container/40 transition-all hover:-translate-y-0.5 hover:ring-primary-container/60 sm:w-auto sm:px-6">
//                       <Download size={18} aria-hidden /> Save as PDF
//                     </button>
//                   </div>
//                 </div>
//                 <div className="space-y-6 lg:space-y-8" id="printable-transcript">
//                   {transcript.map((t, idx) => (
//                     <div key={idx} className="rounded-2xl bg-surface-container-highest p-5 sm:p-6 lg:p-8 border border-outline-variant/40 shadow-md w-full">
//                       <h3 className="text-base md:text-lg font-bold font-['Outfit'] text-on-surface mb-5 sm:mb-6 inline-flex items-center gap-2 bg-primary-container/20 px-4 py-2 rounded-full border border-primary-container/30">Round {idx + 1}: {t.stage}</h3>
//                       <div className="space-y-3 sm:space-y-4 mt-1">
//                         {t.chat.map((m: any, mIdx: number) => (
//                           <div key={mIdx} className={`rounded-2xl px-5 py-5 sm:px-6 sm:py-5 shadow-sm ${m.sender === 'bot' ? 'bg-surface border border-outline-variant/20 text-left' : 'bg-primary-container/10 border border-primary-container/30 text-right ml-6 sm:ml-12 md:ml-20 max-w-full'}`}>
//                             <span className={`text-[10px] font-bold uppercase tracking-wider block mb-3 ${m.sender === 'bot' ? 'text-secondary-container' : 'text-primary-container'}`}>{m.sender === 'bot' ? 'WBL Prep Tool' : `${candidateName || 'You'}`}</span>
//                             <div className="text-[15px] leading-relaxed text-on-surface whitespace-pre-wrap break-words">
//                               <ReactMarkdown components={interviewChatMarkdownComponents}>{m.content}</ReactMarkdown>
//                             </div>
//                             {m.evaluation &&
//                               (m.evaluation.overall_score > 0 ||
//                                 (m.evaluation.gap_analysis && m.evaluation.gap_analysis.length > 0)) && (
//                               <div className="mt-5 space-y-3 rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-4 text-left shadow-inner">
//                                 <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
//                                   <span>Evaluation Score</span>
//                                   <span className="tabular-nums rounded-lg border border-primary-container/30 bg-primary-container/15 px-3 py-1 text-sm font-semibold text-primary-container">
//                                     {m.evaluation.overall_score}/10
//                                   </span>
//                                 </div>
//                                 {m.evaluation.gap_analysis?.length > 0 && (
//                                   <div className="mt-3 text-sm text-on-surface">
//                                     <span className="mb-2 block text-xs font-semibold text-error">Gap Analysis:</span>
//                                     <ul className="list-disc space-y-2 pl-4 text-[13px] leading-relaxed text-on-surface-variant">
//                                       {m.evaluation.gap_analysis.map((gap: string, gIdx: number) => (
//                                         <li key={gIdx} className="break-words">
//                                           {gap}
//                                         </li>
//                                       ))}
//                                     </ul>
//                                   </div>
//                                 )}
//                               </div>
//                             )}
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </motion.div>
//             ) :
//               // currentStage === 0 ? (
//               //   <motion.div key="stage0" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0, y:-12}} className="relative flex min-h-[52vh] flex-col items-center overflow-hidden rounded-3xl border border-white/10 bg-[#111118]/80 px-6 py-14 shadow-2xl backdrop-blur-2xl md:p-20 lg:col-span-12">
//               //     <div className="pointer-events-none absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-primary-container/20 blur-[120px]" />
//               //     <div className="pointer-events-none absolute -bottom-40 -left-40 h-[30rem] w-[30rem] rounded-full bg-secondary-container/20 blur-[120px]" />

//               //     <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-primary-container/30 bg-primary-container/10 shadow-[0_0_40px_rgba(var(--primary-container-rgb),0.3)] ring-1 ring-primary-container/25">
//               //       <Video size={48} className="text-primary-container drop-shadow-md" aria-hidden />
//               //       <div className="absolute inset-0 rounded-[2rem] border-t border-white/20"></div>
//               //     </div>

//               //     <h2 className="relative mb-4 max-w-3xl text-center font-['Outfit'] text-4xl font-extrabold tracking-tight text-white drop-shadow-sm md:text-6xl">
//               //       Configure your <span className="bg-gradient-to-r from-primary-container to-secondary-container bg-clip-text text-transparent">Interview Protocol</span>
//               //     </h2>
//               //     <p className="relative mb-14 max-w-2xl text-center text-lg leading-relaxed text-white/50 md:text-xl">
//               //       Fine-tune the rigorousness of your 5-stage simulation. We've bypassed the intro module to jump straight into dynamic technical and behavioral assessments.
//               //     </p>

//               //     <div className="relative w-full max-w-5xl">
//               //       <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
//               //         {[
//               //           { id: 1, name: "General Mock", icon: UserRound, color: "from-blue-500/20 to-cyan-500/5", border: "border-blue-500/30" },
//               //           { id: 2, name: "Hiring Manager", icon: MessageSquare, color: "from-purple-500/20 to-fuchsia-500/5", border: "border-purple-500/30" },
//               //           { id: 3, name: "Tech Panel", icon: Sparkles, color: "from-emerald-500/20 to-teal-500/5", border: "border-emerald-500/30" },
//               //           { id: 4, name: "System Design", icon: PenSquare, color: "from-orange-500/20 to-red-500/5", border: "border-orange-500/30" },
//               //           { id: 5, name: "Live Coding", icon: Code2, color: "from-indigo-500/20 to-violet-500/5", border: "border-indigo-500/30" }
//               //         ].map((stage) => (
//               //           <div key={stage.id} className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border ${stage.border} bg-white/[0.02] p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:bg-white/[0.04] hover:shadow-xl`}>
//               //             <div className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-50`} />
//               //             <div className="relative z-10 mb-4 flex items-center justify-between">
//               //               <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 shadow-inner`}>
//               //                 <stage.icon size={18} className="text-white/80" />
//               //               </div>
//               //               <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Stage {stage.id}</span>
//               //             </div>
//               //             <div className="relative z-10">
//               //               <h3 className="mb-3 font-['Outfit'] text-base font-bold text-white/90">{stage.name}</h3>
//               //               <div className="relative">
//               //                 <select 
//               //                   className="w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm font-medium text-white/80 outline-none transition-colors hover:border-white/25 focus:border-primary-container focus:ring-1 focus:ring-primary-container"
//               //                   value={stageCounts[stage.id]} 
//               //                   onChange={(e) => setStageCounts((p) => ({ ...p, [stage.id]: Number(e.target.value) }))}
//               //                 >
//               //                   {[...Array(20)].map((_, i) => <option key={i} value={i+1} className="bg-[#1a1a24] text-white">{i+1} Questions</option>)}
//               //                 </select>
//               //                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-white/40">
//               //                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
//               //                 </div>
//               //               </div>
//               //             </div>
//               //           </div>
//               //         ))}
//               //       </div>
//               //     </div>

//               //     <button type="button" disabled={isGenerating} onClick={handleStart} className="group relative mt-14 overflow-hidden rounded-2xl bg-white px-12 py-5 font-['Outfit'] text-lg font-bold tracking-wide text-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] disabled:opacity-50">
//               //       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity group-hover:animate-shimmer group-hover:opacity-100"></div>
//               //       {isGenerating ? (
//               //         <span className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Uplinking...</span>
//               //       ) : (
//               //         <span className="flex items-center gap-3"><Play size={20} className="fill-current" /> Initialize Protocol</span>
//               //       )}
//               //     </button>
//               //   </motion.div>
//               // ) : (
//               //     currentStage === 0 ? (
//               //       <motion.div
//               //         key="stage0"
//               //         initial={{ opacity: 0, y: 10 }}
//               //         animate={{ opacity: 1, y: 0 }}
//               //         exit={{ opacity: 0 }}
//               //       //   className="w-full rounded-3xl border border-outline-variant bg-surface-container-low px-6 py-16 md:px-12 md:py-20"
//               //       // >
//               //       className="w-full xl:col-span-12 flex justify-center rounded-3xl border border-outline-variant bg-surface-container-low px-6 py-16 md:px-12 md:py-20" >
//               //         {/* <div className="mx-auto max-w-5xl flex flex-col items-center text-center"> */}
//               //         <div className="w-full max-w-5xl flex flex-col items-center text-center">

//               //           {/* Icon */}
//               //           <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high border border-outline-variant">
//               //             <Video size={28} className="text-primary-container" />
//               //           </div>

//               //           {/* Heading */}
//               //           <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
//               //             Configure your{" "}
//               //             <span className="text-primary-container">Interview Protocol</span>
//               //           </h2>

//               //           {/* Subtitle */}
//               //           <p className="mt-4 max-w-2xl text-sm md:text-base text-on-surface-variant leading-relaxed">
//               //             Fine-tune the rigorousness of your 5-stage simulation. We’ve bypassed
//               //             the intro module to jump straight into dynamic technical and behavioral
//               //             assessments.
//               //           </p>

//               //           {/* Cards */}
//               //           <div className="mt-12 w-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
//               //             {[
//               //               { id: 1, name: "General Mock", icon: UserRound },
//               //               { id: 2, name: "Hiring Manager", icon: MessageSquare },
//               //               { id: 3, name: "Tech Panel", icon: Sparkles },
//               //               { id: 4, name: "System Design", icon: PenSquare },
//               //               { id: 5, name: "Live Coding", icon: Code2 }
//               //             ].map((stage) => (
//               //               <div key={stage.id} className="card p-5 flex flex-col gap-4">

//               //                 <div className="flex items-center justify-between">
//               //                   <div className="flex items-center gap-2">
//               //                     <div className="h-10 w-10 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant">
//               //                       <stage.icon size={18} />
//               //                     </div>
//               //                     <h3 className="text-sm font-semibold">{stage.name}</h3>
//               //                   </div>
//               //                   <span className="text-xs text-on-surface-variant">
//               //                     Stage {stage.id}
//               //                   </span>
//               //                 </div>

//               //                 <select
//               //                   className="input-field text-sm py-2.5"
//               //                   value={stageCounts[stage.id]}
//               //                   onChange={(e) =>
//               //                     setStageCounts((p) => ({
//               //                       ...p,
//               //                       [stage.id]: Number(e.target.value),
//               //                     }))
//               //                   }
//               //                 >
//               //                   {[...Array(20)].map((_, i) => (
//               //                     <option key={i} value={i + 1}>
//               //                       {i + 1} Question{i > 0 && "s"}
//               //                     </option>
//               //                   ))}
//               //                 </select>

//               //               </div>
//               //             ))}
//               //           </div>

//               //           {/* CTA */}
//               //           <button
//               //             type="button"
//               //             disabled={isGenerating}
//               //             onClick={handleStart}
//               //             className="mt-10 px-8 py-3 rounded-xl bg-primary-container text-white font-semibold hover:opacity-90 transition"
//               //           >
//               //             {isGenerating ? "Starting..." : "Initialize Protocol"}
//               //           </button>

//               //           <p className="mt-4 text-xs text-on-surface-variant">
//               //             Your progress is automatically saved
//               //           </p>
//               //         </div>
//               //       </motion.div>

//               // ) : (
//               currentStage === 0 ? (
//                 <motion.div
//                   key="stage0"
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   exit={{ opacity: 0 }}
//                   className="w-full xl:col-span-12 flex justify-center"
//                 >
//                   <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-outline-variant/70 bg-surface-container-low shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.06]">
//                     <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(139,92,246,0.16),transparent_42%),radial-gradient(circle_at_85%_30%,rgba(124,58,237,0.12),transparent_45%),radial-gradient(circle_at_50%_100%,rgba(167,139,250,0.08),transparent_50%)]" aria-hidden />
//                     <div className="relative px-5 py-10 sm:px-8 sm:py-12 md:px-12 md:py-14">

//                     <div className="flex flex-col items-center text-center">
//                       <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-container/35 bg-primary-container/12 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-on-surface/95 shadow-[0_0_20px_rgba(139,92,246,0.15)] sm:text-xs">
//                         <Video size={14} className="text-primary-container" aria-hidden />
//                         5-stage simulation
//                       </div>

//                       <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.15] tracking-tight">
//                         Configure your{" "}
//                         <span className="bg-gradient-to-r from-primary-container to-secondary-container bg-clip-text text-transparent">
//                           Interview Protocol
//                         </span>
//                       </h2>

//                       <p className="mt-4 max-w-xl text-sm leading-relaxed text-on-surface-variant sm:text-[15px]">
//                         Set how many questions to practice in each stage. You can retake any round anytime.
//                       </p>
//                     </div>

//                     {/* CARDS — wider gutters, consistent depth */}
//                     <div className="mt-8  grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:mt-12 xl:grid-cols-5 xl:gap-5 2xl:gap-6">

//                       {[
//                         { id: 1, name: "General Mock", icon: UserRound, hint: "Warm-up + intro" },
//                         { id: 2, name: "Hiring Manager", icon: MessageSquare, hint: "Behavioral + projects" },
//                         { id: 3, name: "Tech Panel", icon: Sparkles, hint: "Deep technical Q&A" },
//                         { id: 4, name: "System Design", icon: PenSquare, hint: "Architecture + trade-offs" },
//                         { id: 5, name: "Live Coding", icon: Code2, hint: "Solve + explain" }
//                       ].map((stage) => (

//                       <div
                      
//   key={stage.id}
//   className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-xl border border-outline-variant/70 bg-surface-container-high/70 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-container/45 hover:shadow-[0_18px_50px_rgba(139,92,246,0.12)]"
// >
//   <div className="flex flex-col h-full gap-4">

//     {/* HEADER */}
//     <div className="flex items-start justify-between">
//       <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/60 bg-surface/80">
//         <stage.icon size={18} className="text-primary-container" />
//       </div>
//       <span className="text-[10px] text-on-surface-variant">
//         Stage {stage.id}
//       </span>
//     </div>

//     {/* TITLE */}
//     <div className="space-y-1">
//       <h3 className="text-sm font-semibold leading-snug break-words">
//         {stage.name}
//       </h3>
//       <p className="text-xs text-on-surface-variant leading-relaxed">
//         {stage.hint}
//       </p>
//     </div>

//     {/* SELECT */}
//     <div className="mt-auto">
//       <label className="text-[10px] text-on-surface-variant block mb-1">
//         Questions
//       </label>

//       <select
//         className="input-field w-full py-2.5 text-sm"
//         value={stageCounts[stage.id]}
//         onChange={(e) =>
//           setStageCounts((p) => ({
//             ...p,
//             [stage.id]: Number(e.target.value),
//           }))
//         }
//       >
//         {[...Array(20)].map((_, i) => (
//           <option key={i} value={i + 1}>
//             {i + 1} question{i > 0 ? "s" : ""}
//           </option>
//         ))}
//       </select>
//     </div>

//   </div>
// </div>
//                       ))}
//                     </div>

//                     {/* CTA — tight to content, no duplicate “saved” copy */}
//                     <div className="mt-10 flex flex-col items-center gap-3 border-t border-outline-variant/30 pt-8 sm:mt-12">
//                       <button
//                         type="button"
//                         disabled={isGenerating}
//                         onClick={handleStart}
//                         className="inline-flex min-w-[min(100%,20rem)] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-secondary-container to-primary-container px-8 py-3.5 text-sm font-bold text-on-primary shadow-lg ring-1 ring-primary-container/40 transition-all hover:-translate-y-0.5 hover:ring-primary-container/60 disabled:opacity-55 disabled:hover:translate-y-0"
//                       >
//                         {isGenerating ? (
//                           <>
//                             <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
//                             Starting…
//                           </>
//                         ) : (
//                           <>
//                             <Play size={18} aria-hidden />
//                             Initialize Protocol
//                           </>
//                         )}
//                       </button>
//                       <p className="text-center text-[11px] text-on-surface-variant/90">
//                         Progress saves automatically in this browser session.
//                       </p>
//                     </div>

//                     </div>
//                   </div>
//                 </motion.div>
//               ) : (
//                 <motion.div
//                   key="stageActive"
//                   initial={{ opacity: 0, y: 12 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   exit={{ opacity: 0, y: -12 }}
//                   className="grid grid-cols-1 items-start gap-6 xl:col-span-12 xl:grid-cols-12 xl:gap-8"
//                 >
//                   <div className="order-1 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-outline-variant/50 bg-surface-container-low/55 shadow-2xl backdrop-blur-xl xl:col-span-8 xl:h-[min(72vh,820px)] xl:max-h-[calc(100vh-9rem)]">
//                     <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/30 px-4 py-3.5 md:px-5">
//                       <div className="flex min-w-0 items-center gap-2.5">
//                         <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-outline-variant/50 bg-surface-container-high/60">
//                           <MessageSquare size={18} className="text-primary-container" aria-hidden />
//                         </div>
//                         <div className="min-w-0">
//                           <h3 className="font-['Outfit'] text-sm font-semibold tracking-tight text-on-surface">WBL Prep Tool — Interview</h3>
//                           <p className="truncate text-xs text-on-surface-variant">Enter to send · Shift+Enter new line</p>
//                         </div>
//                       </div>
//                       <div className="flex shrink-0 items-center gap-2">
//                         <button
//                           type="button"
//                           onClick={nextStage}
//                           disabled={loading}
//                           className={`shrink-0 rounded-full px-5 py-2 text-center text-[11px] font-extrabold uppercase tracking-widest transition-all duration-300 ${readyForNextStage
//                             ? "animate-pulse border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-[#111118]"
//                             : "border border-outline-variant/40 bg-surface-container-high/50 text-on-surface hover:bg-surface-container-high/75"
//                             } disabled:opacity-45`}
//                         >
//                           {currentStage === 5 ? "Finish interview" : "Next stage"}
//                         </button>
//                       </div>
//                     </div>

//                     <div className="shrink-0 px-4 pt-2 pb-1 md:px-5">
//                       <div className="flex items-start gap-2 rounded-xl border border-primary-container/25 bg-primary-container/[0.10] px-3 py-2.5">
//                         <Lightbulb size={15} className="mt-0.5 shrink-0 text-primary-container" aria-hidden />
//                         <p className="min-w-0 text-xs leading-snug text-on-surface-variant">
//                           {currentStage === 1 && "General mock: quick intro + warm-up. Keep it crisp and structured."}
//                           {currentStage === 2 && "Hiring manager: behavioral + project impact. Use STAR where possible."}
//                           {currentStage === 3 && "Tech panel: go deep on fundamentals, trade-offs, and edge cases."}
//                           {currentStage === 4 && "System design: clarify requirements, define APIs, then scale and trade-offs."}
//                           {currentStage === 5 && "Live coding: talk through approach, then implement and test quickly."}
//                         </p>
//                       </div>
//                     </div>

//                     <div className="flex min-h-0 flex-1 flex-col px-3 pb-2 pt-2 md:px-4">
//                       <div
//                         className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-highest/60"
//                       >
//                         <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-6 md:space-y-8 md:px-8 md:py-8">
//                           {messages.length === 0 && !loading && (
//                             <p className="text-center text-sm text-on-surface-variant">Messages will appear here.</p>
//                           )}
//                           {messages.map((m, i) => (
//                             <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} key={i} className="w-full min-w-0">
//                               {m.sender === "user" ? (
//                                 <div className="flex w-full justify-end">
//                                   <div
//                                     className="inline-block max-w-[min(90%,32rem)] rounded-3xl rounded-br-md px-6 py-4 text-left text-[15px] leading-relaxed text-white shadow-md tracking-wide"
//                                     style={{ backgroundColor: CHAT_GREEN }}
//                                   >
//                                     <p className="whitespace-pre-wrap break-words">{m.content}</p>
//                                   </div>
//                                 </div>
//                               ) : (
//                                 <div className="flex w-full justify-start">
//                                   <div
//                                     className="w-full max-w-full rounded-3xl rounded-bl-md border border-white/10 px-6 py-5 shadow-lg sm:max-w-[min(100%,46rem)] md:px-8 md:py-6"
//                                     style={{ backgroundColor: CHAT_ASSISTANT_SURFACE }}
//                                   >
//                                     <div className="mb-2.5 flex items-center gap-2">
//                                       <div
//                                         className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5"
//                                       >
//                                         <img src="/logo.png" alt="WBL Prep Tool" className="h-5 w-5 object-contain" />
//                                       </div>
//                                     </div>
//                                     <div className="min-w-0 text-[15px] leading-relaxed text-[#d4d4d4]">
//                                       <ReactMarkdown components={interviewChatMarkdownComponents}>{m.content}</ReactMarkdown>
//                                     </div>
//                                     {m.evaluation &&
//                                       (m.evaluation.overall_score > 0 ||
//                                         (m.evaluation.gap_analysis && m.evaluation.gap_analysis.length > 0)) && (
//                                       <div className="mt-4 space-y-2.5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-3.5">
//                                         <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
//                                           <span>Score</span>
//                                           <span className="tabular-nums rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-base font-semibold text-white">
//                                             {m.evaluation.overall_score}/10
//                                           </span>
//                                         </div>
//                                         {m.evaluation.gap_analysis?.length > 0 && (
//                                           <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-[#b8b8b8]">
//                                             {m.evaluation.gap_analysis.map((gap: string, gIdx: number) => (
//                                               <li key={gIdx} className="break-words">
//                                                 {gap}
//                                               </li>
//                                             ))}
//                                           </ul>
//                                         )}
//                                       </div>
//                                     )}
//                                   </div>
//                                 </div>
//                               )}
//                             </motion.div>
//                           ))}
//                           {loading && (
//                             <div className="flex w-full justify-start mt-4">
//                               <div
//                                 className="inline-flex items-center gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-high/50 px-5 py-3 text-sm tracking-wide text-on-surface shadow-md backdrop-blur-md"
//                               >
//                                 <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" aria-hidden />
//                                 {messages.length === 0 ? "Uplinking to next module..." : "Evaluating and parsing context..."}
//                               </div>
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                     <div className="shrink-0 space-y-2 border-t border-outline-variant/30 bg-surface-container-low/60 px-3 py-3 md:px-4 md:py-3">
//                       {(currentStage === 5 || currentStage === 6) && (
//                         <div className="flex flex-wrap gap-2">
//                           {currentStage === 5 && (
//                             <a
//                               href="https://excalidraw.com/"
//                               target="_blank"
//                               rel="noreferrer"
//                               className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:border-primary-container/50 hover:text-white"
//                             >
//                               <PenSquare size={13} className="shrink-0 text-primary-container" aria-hidden />
//                               Excalidraw
//                             </a>
//                           )}
//                           {currentStage === 6 && (
//                             <a
//                               href="https://www.onlinegdb.com/"
//                               target="_blank"
//                               rel="noreferrer"
//                               className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/80 transition-colors hover:border-primary-container/50 hover:text-white"
//                             >
//                               <Code2 size={13} className="shrink-0 text-primary-container" aria-hidden />
//                               Code playground
//                             </a>
//                           )}
//                         </div>
//                       )}
//                       <div className="flex items-end gap-1 rounded-[1.35rem] border border-outline-variant/40 bg-surface-container-high/60 py-1.5 pl-4 pr-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
//                         <textarea
//                           ref={answerTextareaRef}
//                           value={answer}
//                           onChange={(e) => setAnswer(e.target.value)}
//                           placeholder="Message…"
//                           rows={1}
//                           disabled={loading}
//                           className="max-h-[200px] min-h-[48px] w-0 min-w-0 flex-1 resize-none bg-transparent py-3 text-[15px] leading-relaxed text-on-surface outline-none placeholder:text-on-surface-variant/70"
//                           onKeyDown={(e) => {
//                             if (e.key === "Enter" && !e.shiftKey) {
//                               e.preventDefault();
//                               handleSend();
//                             }
//                           }}
//                         />
//                         <button
//                           type="button"
//                           onClick={toggleCandidateVoice}
//                           disabled={loading || currentStage < 1 || currentStage > 5}
//                           aria-label={isRecordingAnswer ? "Stop dictation" : "Start dictation"}
//                           className={`mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${isRecordingAnswer ? "bg-red-500/20 text-red-400" : "text-white/70 hover:bg-white/10 hover:text-white"
//                             } disabled:opacity-40`}
//                         >
//                           {isRecordingAnswer ? <MicOff size={20} /> : <Mic size={20} />}
//                         </button>
//                         <button
//                           type="button"
//                           onClick={() => setVoiceEnabled((v) => !v)}
//                           aria-label={voiceEnabled ? "Turn interviewer voice off" : "Turn interviewer voice on"}
//                           className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-white/10 hover:text-on-surface"
//                         >
//                           {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
//                         </button>
//                         <button
//                           type="button"
//                           onClick={() => void handleSend()}
//                           disabled={loading || !answer.trim()}
//                           aria-label="Send message"
//                           className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-opacity disabled:opacity-35"
//                           style={{ backgroundColor: CHAT_GREEN }}
//                         >
//                           <Send size={18} className="-ml-px" aria-hidden />
//                         </button>
//                       </div>
//                       <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-0.5">
//                         <button
//                           type="button"
//                           onClick={handleNeedHelp}
//                           disabled={loading}
//                           className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition-colors hover:text-white/70 disabled:opacity-45"
//                         >
//                           <HelpCircle size={13} className="shrink-0 text-white/35" aria-hidden />
//                           Suggested answer
//                         </button>
//                         {isRecordingAnswer && <span className="text-xs font-medium text-red-400">Listening…</span>}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="order-2 flex min-w-0 flex-col gap-4 xl:col-span-4">
//                     <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-outline-variant/35 bg-surface-container-high/50 px-5 py-4 shadow-lg backdrop-blur-md md:px-6">
//                       <span className="inline-flex w-fit items-center gap-2 justify-self-start rounded-full border border-primary-container/25 bg-primary-container/15 px-3 py-1.5 text-xs font-bold text-on-surface">
//                         <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-primary-container shadow-lg ring-2 ring-primary-container/50" aria-hidden />
//                         Live
//                       </span>
//                       <span className={`justify-self-center whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-bold tabular-nums ${timeLeft <= 30 ? "animate-pulse border-red-500/40 bg-red-500/15 text-red-400" : "border-white/10 bg-white/5 text-white/90"}`}>
//                         {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
//                       </span>
//                       <span className="justify-self-end text-right text-xs font-bold uppercase tracking-wider text-white/50">Round {currentStage}<span className="opacity-40">/5</span></span>
//                     </div>
//                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
//                       <div className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border bg-surface-container-lowest shadow-2xl transition-all duration-500 ${aiSpeaking ? "border-primary-container shadow-lg ring-2 ring-primary-container/30" : "border-outline-variant/30"}`}>
//                         <div className={`flex h-32 w-32 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-high shadow-2xl transition-transform duration-700 ${aiSpeaking ? "scale-110 border-primary-container ring-2 ring-primary-container/40 shadow-lg" : ""}`}>
//                           <div className="relative">
//                             <UserRound size={48} className={aiSpeaking ? "text-primary-container" : "text-on-surface-variant"} />
//                             <Sparkles size={16} className="absolute -right-1 -top-1 animate-pulse text-primary-container" />
//                           </div>
//                         </div>
//                         {aiSpeaking && (
//                           <div className="absolute bottom-[18%] flex h-8 items-end gap-1">
//                             {[1, 2, 3, 4, 5].map((i) => (
//                               <div key={i} className="w-1.5 rounded-full bg-primary-container" style={{ height: `${24 + (i * 7) % 40}%`, animation: `pulse ${0.25 + i * 0.05}s ease-in-out infinite alternate` }} />
//                             ))}
//                           </div>
//                         )}
//                         <div className="absolute bottom-5 left-5 flex items-center rounded-xl border border-outline-variant/30 bg-surface/60 px-3 py-2 backdrop-blur-xl">
//                           <img src="/logo.png" alt="" className="h-6 w-6 object-contain" width={24} height={24} />
//                         </div>
//                       </div>
//                       <div className="relative aspect-video overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
//                         {webcamEnabled ? (
//                           <Webcam audio={false} className="h-full w-full object-cover opacity-90" mirrored />
//                         ) : (
//                           <div className="flex h-full flex-col items-center justify-center text-outline-variant/50">
//                             <CameraOff size={48} className="mb-4 opacity-50" />
//                             <span className="text-sm font-medium tracking-widest uppercase">Stream offline</span>
//                           </div>
//                         )}
//                         <div className="absolute bottom-5 left-5 max-w-[calc(100%-5rem)] rounded-xl border border-outline-variant/30 bg-surface/60 px-4 py-2 backdrop-blur-xl">
//                           <span className="break-words text-xs font-bold leading-snug tracking-wider text-on-surface">{candidateName} (You)</span>
//                         </div>
//                         <button type="button" onClick={() => setWebcamEnabled(!webcamEnabled)} aria-label={webcamEnabled ? "Turn camera off" : "Turn camera on"} className="absolute right-5 top-5 rounded-full border border-outline-variant/30 bg-surface/60 p-3 text-on-surface backdrop-blur-xl transition hover:bg-surface-container-high">
//                           {webcamEnabled ? <Camera size={18} aria-hidden /> : <CameraOff size={18} aria-hidden />}
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 </motion.div>
//               )}
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



