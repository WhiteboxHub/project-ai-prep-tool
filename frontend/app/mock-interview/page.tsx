"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  startMockInterview, getMockSession, evaluateAnswer, getInterviewAnswers
} from "@/lib/api";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  Brain, ChevronLeft, Play, FileText, Send, 
  Mic, MicOff, Volume2, VolumeX, MessageSquare, Star,
  AudioLines
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

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  type: "question" | "answer" | "feedback" | "system";
  content: string;
  questionIdx?: number;
  score?: number;
  scores?: Record<string, number>;
  idealAnswer?: string;
};

const getScoreColor = (s: number) =>
  s >= 8 ? "var(--success)" : s >= 6 ? "var(--warning)" : "var(--danger)";

export default function MockInterviewPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [mockSessionId, setMockSessionId] = useState<number | null>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState<"start" | "interview">("start");

  // Voice States
  const [voiceMode, setVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthesisRef.current = window.speechSynthesis;
      const loadVoices = () => {
         const v = window.speechSynthesis.getVoices();
         setVoices(v);
         if (v.length > 0 && !selectedVoice) {
            const preferred = v.find(voice => voice.name.includes("Google US English") || voice.name.includes("Premium")) || v[0];
            setSelectedVoice(preferred);
         }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const sid = localStorage.getItem("session_id");
    setCandidateName(localStorage.getItem("candidate_name") || "");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    
    getMockSession(sid).then((d) => {
      if (d.mock_session_id && d.questions.length > 0) {
        setMockSessionId(d.mock_session_id);
        setQuestions(d.questions);
        
        getInterviewAnswers(sid, d.mock_session_id).then((a) => {
          const loadedMsgs: ChatMessage[] = [];
          let lastIdx = 0;
          
          a.answers.forEach((ans: any, i: number) => {
            loadedMsgs.push({ id: `q-${i}`, sender: "bot", type: "question", content: d.questions[i].question, questionIdx: i });
            loadedMsgs.push({ id: `a-${i}`, sender: "user", type: "answer", content: ans.answer, questionIdx: i });
            loadedMsgs.push({ 
              id: `f-${i}`, sender: "bot", type: "feedback", 
              content: ans.feedback, questionIdx: i,
              score: ans.overall_score, scores: ans.scores, idealAnswer: ans.ideal_answer
            });
            lastIdx = i + 1;
          });
          
          if (lastIdx < d.questions.length) {
             loadedMsgs.push({ id: `q-${lastIdx}`, sender: "bot", type: "question", content: d.questions[lastIdx].question, questionIdx: lastIdx });
             setCurrentIdx(lastIdx);
          } else {
             setCurrentIdx(lastIdx); 
          }
          
          setMessages(loadedMsgs);
          if (loadedMsgs.length > 0) setPhase("interview");
          
        }).catch(() => {});
      }
    }).catch(() => {});

    return () => {
       if (synthesisRef.current) synthesisRef.current.cancel();
       if (recognitionRef.current) recognitionRef.current.stop();
    }
  }, [router]);

  const speak = (text: string) => {
    if (!voiceMode || !synthesisRef.current) return;
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => setIsBotSpeaking(true);
    utterance.onend = () => setIsBotSpeaking(false);
    utterance.onerror = () => setIsBotSpeaking(false);
    synthesisRef.current.speak(utterance);
  };
  
  useEffect(() => {
    if (messages.length > 0 && voiceMode) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === "bot") {
        speak(lastMessage.content);
      }
    }
  }, [messages, voiceMode]);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Your browser does not support Speech Recognition.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      if(event.results[event.results.length - 1].isFinal) {
         setAnswer((prev) => prev + (prev.endsWith(' ') || prev.length===0 ? '' : ' ') + currentTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    toast("Listening... (Speak clearly into your microphone)", { icon: '🎙️' });
  };

  const handleStart = async () => {
    setGenerating(true);
    try {
      const data = await startMockInterview(sessionId);
      setMockSessionId(data.mock_session_id);
      setQuestions(data.questions);
      setCurrentIdx(0);
      
      const firstQ = data.questions[0].question;
      const userName = localStorage.getItem("candidate_name") || "Candidate";
      const introMsg = `Welcome, ${userName}! I am the WBL PrepHub AI Interviewer. During this session, I will ask you 10 personalized questions based on your resume to evaluate your technical skills and help you prepare.\n\nLet's get started. **Question 1:** ${firstQ}`;
      setMessages([{ id: "q-0", sender: "bot", type: "question", content: introMsg, questionIdx: 0 }]);
      
      setPhase("interview");
      toast.success("Interview started! Good luck 🎯");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to generate questions. Ensure your API Key is set.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (isRecording && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecording(false);
    }

    if (!answer.trim() || answer.trim().length < 10) {
      toast.error("Please write a more detailed answer.");
      return;
    }
    
    const aText = answer.trim();
    setAnswer("");
    const newMessages = [...messages, { id: `a-${currentIdx}`, sender: "user", type: "answer", content: aText, questionIdx: currentIdx } as ChatMessage];
    setMessages(newMessages);
    
    setLoading(true);
    try {
      const q = questions[currentIdx];
      const result = await evaluateAnswer(sessionId, mockSessionId!, q.question, q.id, aText);
      
      const feedbackMsg: ChatMessage = {
         id: `f-${currentIdx}`, sender: "bot", type: "feedback",
         content: result.feedback, questionIdx: currentIdx,
         score: result.overall_score, scores: result.scores, idealAnswer: result.ideal_answer
      };
      
      let nextMsgs = [...newMessages, feedbackMsg];
      
      if (currentIdx + 1 < questions.length) {
         const nextQ = questions[currentIdx + 1];
         nextMsgs.push({ id: `q-${currentIdx+1}`, sender: "bot", type: "question", content: nextQ.question, questionIdx: currentIdx + 1 });
         setCurrentIdx(currentIdx + 1);
      } else {
         setCurrentIdx(currentIdx + 1); 
      }
      
      setMessages(nextMsgs);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Evaluation failed.");
      setAnswer(aText); // Restore so the user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
     }
  };

  const answeredCount = Math.min(currentIdx, questions.length);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      {/* Fixed Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, background: "rgba(10, 10, 15, 0.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 48px", borderBottom: "1px solid var(--border)", zIndex: 10 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="WBL Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
            WBL <span style={{ color: "var(--accent-light)" }}>PrepHub</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {candidateName && (
            <span style={{ color: "var(--text-secondary)", fontSize: 13, marginRight: 12 }}>
              Welcome, <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{candidateName}</span>
            </span>
          )}
          {currentIdx >= questions.length && questions.length > 0 && (
            <Link href="/report">
              <button className="btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
                <FileText size={14} /> Generate Final Report
              </button>
            </Link>
          )}
          <span style={{ fontSize: 13, color: "var(--text-muted)", marginRight: 16 }}>
            {phase === "interview" ? `${answeredCount}/${questions.length} Answered` : ""}
          </span>
          <Link href="/dashboard">
            <button className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}>
              <ChevronLeft size={14} /> Dashboard
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginTop: 69, display: "flex", flexDirection: "column", position: "relative" }}>
        
        {phase === "start" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <div className="card" style={{ maxWidth: 600, padding: 48, textAlign: "center", animation: "fadeIn 0.5s ease" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "var(--accent-light)" }}>
                <MessageSquare size={36} />
              </div>
              <h2 style={{ fontSize: 28, marginBottom: 12 }}>Interview Voice Chat</h2>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 32 }}>
                Engage in an interactive, chat-based mock interview. The AI will dynamically evaluate your text or voice answers and respond instantly.
              </p>
              <button onClick={handleStart} disabled={generating} className="btn-primary" style={{ width: "100%", padding: "16px", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {generating ? <div className="animate-spin text-accent" style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "transparent", borderRadius: "50%" }}></div> : <Play size={18} />}
                {generating ? "Preparing Agent..." : "Start Chat Interview"}
              </button>
            </div>
          </div>
        )}

        {phase === "interview" && (
          <>
            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 10%", display: "flex", flexDirection: "column", gap: 24, paddingBottom: 150 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.sender === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
                  
                  {m.type === "question" && (
                    <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", padding: "16px 20px", borderRadius: "20px 20px 20px 0", maxWidth: "80%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        {isBotSpeaking && i === messages.length - 1 ? (
                          <AudioLines size={16} color="var(--success)" className="animate-pulse" />
                        ) : (
                          <Brain size={16} color="var(--accent-light)" />
                        )}
                        <p style={{ fontSize: 12, color: "var(--accent-light)", fontWeight: 700, textTransform: "uppercase" }}>WBL AI Interviewer {m.questionIdx !== undefined ? `| Q${m.questionIdx + 1}` : ""}</p>
                      </div>
                      <p style={{ lineHeight: 1.6, fontSize: 15, whiteSpace: "pre-wrap" }}>{m.content}</p>
                    </div>
                  )}

                  {m.type === "answer" && (
                    <div style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", boxShadow: "0 4px 15px rgba(124, 58, 237, 0.2)", color: "white", padding: "16px 20px", borderRadius: "20px 20px 0 20px", maxWidth: "80%" }}>
                      <p style={{ lineHeight: 1.6, fontSize: 15, whiteSpace: "pre-wrap" }}>{m.content}</p>
                    </div>
                  )}

                  {m.type === "feedback" && (
                    <div className="card" style={{ padding: 24, borderRadius: "20px 20px 20px 0", maxWidth: "85%", borderLeft: `4px solid ${getScoreColor(m.score!)}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ padding: "4px 12px", borderRadius: 100, background: `${getScoreColor(m.score!)}20`, color: getScoreColor(m.score!), fontWeight: 800, fontSize: 14 }}>
                          Score: {m.score}/10
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>AI Evaluation</p>
                      </div>
                      <p style={{ lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: m.idealAnswer ? 16 : 0, fontSize: 15 }}>{m.content}</p>
                      
                      {m.idealAnswer && (
                        <div style={{ background: "var(--bg-primary)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
                          <p style={{ fontSize: 12, color: "var(--success)", fontWeight: 700, marginBottom: 6 }}>HOW TO ANSWER IT BEST</p>
                          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>{m.idealAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", padding: "16px 24px", borderRadius: "20px 20px 20px 0", display: "flex", gap: 12, alignItems: "center" }}>
                    <div className="animate-spin" style={{ width: 16, height: 16, border: "2px solid rgba(139,92,246,0.2)", borderTopColor: "var(--accent-light)", borderRadius: "50%" }}></div> 
                    <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Evaluating answer...</span>
                  </div>
                </div>
              )}

              {currentIdx >= questions.length && questions.length > 0 && !loading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
                  <Link href="/report">
                    <button className="btn-primary" style={{ padding: "12px 24px", fontSize: 16, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>
                      <Star fill="white" size={18} /> Review Final Performance
                    </button>
                  </Link>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            {currentIdx < questions.length && (
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(10, 10, 15, 0.9)", backdropFilter: "blur(10px)", padding: "20px 10%", borderTop: "1px solid var(--border)", display: "flex", alignItems: "flex-end", gap: 16, zIndex: 10 }}>
                
                <button 
                  onClick={() => setVoiceMode(!voiceMode)}
                  style={{ width: 48, height: 48, flexShrink: 0, borderRadius: "50%", background: voiceMode ? "rgba(139,92,246,0.15)" : "var(--bg-secondary)", color: voiceMode ? "var(--accent-light)" : "var(--text-muted)", border: `1px solid ${voiceMode ? "rgba(139,92,246,0.3)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", marginBottom: 2 }}
                  title={voiceMode ? "AI Voice ON (Will speak automatically)" : "AI Voice OFF"}
                >
                  {voiceMode ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>

                {voiceMode && voices.length > 0 && (
                  <select 
                    value={selectedVoice?.name || ""}
                    onChange={(e) => {
                      const v = voices.find(voice => voice.name === e.target.value);
                      if (v) setSelectedVoice(v);
                    }}
                    style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", fontSize: 12, outline: "none", marginBottom: 7, maxWidth: 120 }}
                  >
                    {voices.map(v => <option key={v.name} value={v.name}>{v.name.substring(0, 15)}</option>)}
                  </select>
                )}

                <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end", background: "var(--border)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "10px 16px", transition: "border-color 0.2s" }}>
                  <textarea 
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your answer or click mic to speak..."
                    style={{ flex: 1, background: "transparent", border: "none", color: "white", padding: "10px 0", resize: "none", outline: "none", maxHeight: 150, minHeight: 24, fontSize: 16, fontFamily: "inherit" }}
                    rows={Math.min(5, answer.split('\n').length || 1)}
                    disabled={loading || currentIdx >= questions.length}
                  />
                  
                  <div style={{ display: "flex", gap: 8, paddingBottom: 4, paddingLeft: 8 }}>
                    <button 
                      onClick={toggleRecording}
                      disabled={loading || currentIdx >= questions.length}
                      style={{ width: 38, height: 38, borderRadius: "50%", background: isRecording ? "rgba(239,68,68,0.2)" : "transparent", color: isRecording ? "#ef4444" : "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", border: isRecording ? "1px solid rgba(239,68,68,0.5)" : "none" }}
                    >
                      {isRecording ? <MicOff size={18} className="animate-pulse" /> : <Mic size={18} />}
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={loading || !answer.trim() || currentIdx >= questions.length}
                      style={{ width: 38, height: 38, borderRadius: "50%", background: (!answer.trim() || loading) ? "rgba(255,255,255,0.1)" : "var(--accent)", color: (!answer.trim() || loading) ? "var(--text-muted)" : "white", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    >
                      <Send size={16} style={{ marginLeft: 2 }} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

