"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  startMockInterview, getMockSession, evaluateAnswer, getInterviewAnswers
} from "@/lib/api";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import Link from "next/link";
import Navbar from "@/components/Navbar";
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

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    router.push("/");
  };

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
    toast("Listening... speak clearly", { icon: '🎙️' });
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
      const introMsg = `Welcome, ${userName}! Let's begin your mock interview. I'll ask you 10 personalized questions about your experience.\n\n**Question 1:** ${firstQ}`;
      setMessages([{ id: "q-0", sender: "bot", type: "question", content: introMsg, questionIdx: 0 }]);
      
      setPhase("interview");
      toast.success("Interview started!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to start interview.");
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
      toast.error("Please provide a more detailed answer.");
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
      setAnswer(aText);
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
      <Navbar candidateName={candidateName} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        
        {phase === "start" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "24px" }}>
            <div className="card" style={{
              maxWidth: 600,
              padding: 48,
              textAlign: "center",
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(79, 70, 229, 0.1)",
                border: "1px solid rgba(79, 70, 229, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                color: "var(--accent)",
              }}>
                <MessageSquare size={36} />
              </div>
              <h2 style={{
                fontSize: 28,
                marginBottom: 12,
                color: "var(--text-primary)",
                fontWeight: 700,
              }}>Mock Interview</h2>
              <p style={{
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: 32,
                fontSize: 15,
              }}>
                Engage in a dynamic chat-based mock interview. Answer 10 AI-generated questions tailored to your background.
              </p>
              <button
                onClick={handleStart}
                disabled={generating}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {generating ? (
                  <>
                    <div className="animate-spin" style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white",
                      borderRadius: "50%"
                    }}></div>
                    Preparing...
                  </>
                ) : (
                  <>
                    <Play size={16} /> Start Interview
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {phase === "interview" && (
          <>
            {/* Chat Messages */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              paddingBottom: 200,
              maxWidth: "1000px",
              margin: "0 auto",
              width: "100%",
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.sender === "user" ? "flex-end" : "flex-start",
                }}>
                  
                  {m.type === "question" && (
                    <div style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      padding: "14px 18px",
                      borderRadius: 12,
                      maxWidth: "75%",
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}>
                        {isBotSpeaking && i === messages.length - 1 ? (
                          <AudioLines size={14} color="var(--accent)" className="animate-pulse" />
                        ) : (
                          <Brain size={14} color="var(--accent)" />
                        )}
                        <p style={{
                          fontSize: 11,
                          color: "var(--accent)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          margin: 0,
                        }}>
                          Question {m.questionIdx !== undefined ? m.questionIdx + 1 : ""}
                        </p>
                      </div>
                      <p style={{
                        lineHeight: 1.6,
                        fontSize: 14,
                        whiteSpace: "pre-wrap",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}>
                        {m.content}
                      </p>
                    </div>
                  )}

                  {m.type === "answer" && (
                    <div style={{
                      background: "var(--gradient-accent)",
                      color: "white",
                      padding: "14px 18px",
                      borderRadius: 12,
                      maxWidth: "75%",
                      boxShadow: "0 2px 8px var(--accent-glow)",
                    }}>
                      <p style={{
                        lineHeight: 1.6,
                        fontSize: 14,
                        whiteSpace: "pre-wrap",
                        margin: 0,
                      }}>
                        {m.content}
                      </p>
                    </div>
                  )}

                  {m.type === "feedback" && (
                    <div className="card" style={{
                      padding: 18,
                      borderRadius: 12,
                      maxWidth: "75%",
                      borderLeft: `3px solid ${getScoreColor(m.score!)}`,
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                      }}>
                        <div style={{
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: `${getScoreColor(m.score!)}20`,
                          color: getScoreColor(m.score!),
                          fontWeight: 700,
                          fontSize: 12,
                        }}>
                          {m.score}/10
                        </div>
                        <p style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          margin: 0,
                        }}>AI Feedback</p>
                      </div>
                      <p style={{
                        lineHeight: 1.6,
                        color: "var(--text-secondary)",
                        marginBottom: m.idealAnswer ? 12 : 0,
                        fontSize: 13,
                        margin: "0 0 12px 0",
                      }}>
                        {m.content}
                      </p>
                      
                      {m.idealAnswer && (
                        <div style={{
                          background: "var(--bg-secondary)",
                          padding: 12,
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                        }}>
                          <p style={{
                            fontSize: 11,
                            color: "var(--success)",
                            fontWeight: 700,
                            marginBottom: 6,
                            margin: "0 0 6px 0",
                          }}>IDEAL ANSWER</p>
                          <p style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            lineHeight: 1.5,
                            margin: 0,
                          }}>
                            {m.idealAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    padding: "14px 18px",
                    borderRadius: 12,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}>
                    <div className="animate-spin" style={{
                      width: 14,
                      height: 14,
                      border: "2px solid var(--bg-tertiary)",
                      borderTopColor: "var(--accent)",
                      borderRadius: "50%"
                    }}></div> 
                    <span style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                    }}>Evaluating...</span>
                  </div>
                </div>
              )}

              {currentIdx >= questions.length && questions.length > 0 && !loading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                  <Link href="/report">
                    <button className="btn-primary" style={{
                      padding: "11px 20px",
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}>
                      <Star fill="white" size={16} /> View Report
                    </button>
                  </Link>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            {currentIdx < questions.length && (
              <div style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                background: "var(--bg-primary)",
                borderTop: "1px solid var(--border)",
                padding: "16px 24px",
                display: "flex",
                alignItems: "flex-end",
                gap: 12,
                zIndex: 10,
              }}>
                
                <button 
                  onClick={() => setVoiceMode(!voiceMode)}
                  style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: "50%",
                    background: voiceMode ? "rgba(79, 70, 229, 0.1)" : "var(--bg-secondary)",
                    color: voiceMode ? "var(--accent)" : "var(--text-secondary)",
                    border: `1px solid ${voiceMode ? "rgba(79, 70, 229, 0.2)" : "var(--border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    cursor: "pointer",
                  }}
                  title={voiceMode ? "Voice feedback ON" : "Voice feedback OFF"}
                >
                  {voiceMode ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>

                <div style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 8,
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 14px",
                }}>
                  <textarea 
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your answer..."
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      color: "var(--text-primary)",
                      padding: "6px 0",
                      resize: "none",
                      outline: "none",
                      maxHeight: 120,
                      minHeight: 20,
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                    rows={Math.min(4, answer.split('\n').length || 1)}
                    disabled={loading || currentIdx >= questions.length}
                  />
                  
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button 
                      onClick={toggleRecording}
                      disabled={loading || currentIdx >= questions.length}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: isRecording ? "rgba(220, 38, 38, 0.1)" : "transparent",
                        color: isRecording ? "var(--danger)" : "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: isRecording ? "1px solid rgba(220, 38, 38, 0.2)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      {isRecording ? <MicOff size={16} className="animate-pulse" /> : <Mic size={16} />}
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={loading || !answer.trim() || currentIdx >= questions.length}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: (!answer.trim() || loading) ? "rgba(0, 0, 0, 0.1)" : "var(--accent)",
                        color: (!answer.trim() || loading) ? "var(--text-muted)" : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: (!answer.trim() || loading) ? "not-allowed" : "pointer",
                        border: "none",
                      }}
                    >
                      <Send size={14} />
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
