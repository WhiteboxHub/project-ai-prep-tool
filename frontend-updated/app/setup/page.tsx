"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { validateApiKey, uploadResume } from "@/lib/api";
import toast from "react-hot-toast";
import axios from "axios";
import { Key, Upload, CheckCircle, AlertCircle, ChevronRight, FileText, FileJson, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";

type Step = "api" | "resume" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("api");
  
  const [apiProvider, setApiProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [whisperKey, setWhisperKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  
  const [sessionId, setSessionId] = useState("");
  const [capabilities, setCapabilities] = useState<any>(null);
  
  const [jsonResume, setJsonResume] = useState<File | null>(null);
  const [pdfResume, setPdfResume] = useState<File | null>(null);
  
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" 
      ? "https://ai-backend-560359652969.us-central1.run.app" 
      : "https://ai-backend-560359652969.us-central1.run.app");
      
    axios.get(`${backendUrl}/health`, { timeout: 4000 })
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  const handleValidateKeys = async () => {
    if (!apiKey.trim() || !whisperKey.trim()) {
      setErrorMsg("Please fill in all required fields"); 
      return; 
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await validateApiKey(apiKey.trim(), apiProvider);
      
      setSessionId(data.session_id);
      setCapabilities(data.models_available);
      
      localStorage.setItem("session_id", data.session_id);
      localStorage.setItem("api_provider", apiProvider);
      localStorage.setItem("whisper_key", whisperKey.trim());
      localStorage.setItem("openai_key", apiKey.trim());
      localStorage.setItem(`${apiProvider}_key`, apiKey.trim());
      localStorage.setItem("login_source", "standalone");
      
      toast.success("API keys verified successfully!");
      setStep("resume");
    } catch (err: any) {
      console.error("Validation error:", err);
      setErrorMsg("Failed to verify API keys. Please check and try again.");
      toast.error("Failed to verify API keys.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!jsonResume) {
      toast.error("Please upload a resume JSON file");
      return;
    }
    setLoading(true);
    try {
      const data = await uploadResume(sessionId, jsonResume);
      setWordCount(data.word_count || 500);
      if (data.candidate_name) localStorage.setItem("candidate_name", data.candidate_name);
      toast.success("Resume uploaded successfully!");
      setStep("done");
    } catch (err: any) {
       toast.error(err?.response?.data?.detail || "Failed to parse resume JSON.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "json") setJsonResume(file);
      else if (ext === "pdf" || ext === "docx") setPdfResume(file);
    });
  };

  const steps = [
    { id: "api", label: "API Keys", icon: <Key size={16} /> },
    { id: "resume", label: "Resume", icon: <Upload size={16} /> },
    { id: "done", label: "Complete", icon: <CheckCircle size={16} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Navbar */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        padding: "16px 24px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          maxWidth: "1280px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #4f46e5, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 18 }}>W</span>
            </div>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--text-primary)",
            }}>
              WBL <span style={{ color: "var(--accent)" }}>PrepHub</span>
            </span>
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: "600px", margin: "48px auto", padding: "0 24px" }}>
        {/* Progress Steps */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 48,
          gap: 0,
        }}>
          {steps.map((s, i) => (
             <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
               <div style={{
                 display: "flex",
                 alignItems: "center",
                 gap: 8,
                 padding: "8px 14px",
                 borderRadius: 12,
                 background: step === s.id
                   ? "rgba(139, 92, 246, 0.08)"
                   : (["done", "resume"].includes(step) && s.id === "api") || (step === "done" && s.id === "resume")
                   ? "rgba(16, 185, 129, 0.08)"
                   : "transparent",
                 border: step === s.id
                   ? "1px solid var(--border-accent)"
                   : "1px solid transparent",
                 color: step === s.id
                   ? "var(--accent)"
                   : (["done", "resume"].includes(step) && s.id === "api") || (step === "done" && s.id === "resume")
                   ? "var(--success)"
                   : "var(--text-muted)",
                 fontSize: 13,
                 fontWeight: 600,
                 transition: "all 0.2s",
               }}>
                 {step === s.id && s.icon}
                 {(["done", "resume"].includes(step) && s.id === "api") || (step === "done" && s.id === "resume") && (
                   <CheckCircle size={14} color="var(--success)" />
                 )}
                 {s.label}
               </div>
               {i < steps.length - 1 && (
                 <div style={{ width: "20px", height: "1px", background: "var(--border)", margin: "0 8px" }} />
               )}
             </div>
          ))}
        </div>

        {/* Step 1: API Keys */}
        {step === "api" && (
          <div className="card animate-fadeIn" style={{ padding: 40 }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "rgba(79, 70, 229, 0.1)",
                border: "1px solid rgba(79, 70, 229, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                marginBottom: 20,
              }}>
                <Key size={26} />
              </div>
              <h1 style={{
                fontSize: 28,
                marginBottom: 8,
                color: "var(--text-primary)",
                fontWeight: 700,
              }}>API Keys</h1>
              <p style={{
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                fontSize: 14,
                fontWeight: 400,
              }}>
                Provide your AI provider API keys. Keys are not stored permanently and will only be used for your session.
              </p>
              
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                 {backendOk === null && <span style={{ color: "var(--text-muted)" }}>Checking connection...</span>}
                 {backendOk === true && (
                   <span style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                     <Wifi size={12} /> Connected
                   </span>
                 )}
                 {backendOk === false && (
                   <span style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                     <WifiOff size={12} /> Disconnected
                   </span>
                 )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label className="label">LLM Provider <span style={{color: "var(--danger)"}}>*</span></label>
                <select 
                  className="input-field" 
                  value={apiProvider} 
                  onChange={(e) => setApiProvider(e.target.value)}
                >
                  <option value="openai">OpenAI (Recommended)</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="groq">Groq</option>
                </select>
              </div>

              <div>
                <label className="label">
                  {apiProvider === "openai" ? "OpenAI" : apiProvider === "anthropic" ? "Anthropic" : apiProvider === "gemini" ? "Gemini" : "Groq"} API Key <span style={{color: "var(--danger)"}}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                   <input
                     className="input-field"
                     type={showKey ? "text" : "password"}
                     placeholder={apiProvider === "openai" ? "sk-..." : "api-key..."}
                     value={apiKey}
                     onChange={(e) => setApiKey(e.target.value)}
                   />
                </div>
              </div>

              <div>
                <label className="label">Whisper API Key <span style={{color: "var(--danger)"}}>*</span></label>
                <div style={{ position: "relative" }}>
                   <input
                     className="input-field"
                     type={showKey ? "text" : "password"}
                     placeholder="sk-..."
                     value={whisperKey}
                     onChange={(e) => setWhisperKey(e.target.value)}
                   />
                </div>
              </div>

              {errorMsg && (
                 <div style={{
                   background: "rgba(220, 38, 38, 0.08)",
                   border: "1px solid rgba(220, 38, 38, 0.2)",
                   borderRadius: 10,
                   padding: "12px 14px",
                   display: "flex",
                   gap: 10,
                   alignItems: "flex-start",
                 }}>
                   <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                   <p style={{
                     color: "var(--danger)",
                     fontSize: 13,
                     lineHeight: 1.5,
                     fontWeight: 500,
                   }}>{errorMsg}</p>
                 </div>
              )}

              <button
                className="btn-primary"
                onClick={handleValidateKeys}
                disabled={loading || backendOk === false}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8,
                  width: "100%",
                }}
              >
                 {loading ? "Verifying..." : "Verify API Keys"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Resume Upload */}
        {step === "resume" && (
          <div className="card animate-fadeIn" style={{ padding: 40 }}>
            <div style={{ marginBottom: 32 }}>
               <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: "rgba(79, 70, 229, 0.1)",
                  border: "1px solid rgba(79, 70, 229, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent)",
                  marginBottom: 20,
               }}>
                  <Upload size={26} />
               </div>
               <h1 style={{
                  fontSize: 28,
                  marginBottom: 8,
                  color: "var(--text-primary)",
                  fontWeight: 700,
               }}>Upload Resume</h1>
               <div className="badge badge-success" style={{ marginBottom: 16 }}>
                  <CheckCircle size={13} /> API Keys Verified
               </div>
               <p style={{
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  fontSize: 14,
                  fontWeight: 400,
               }}>
                  Upload your resume as a structured JSON file. PDF is optional.
               </p>
            </div>

            {/* Drop zone */}
            <div
               onDrop={handleDrop}
               onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
               onDragLeave={() => setDragOver(false)}
               style={{
                  border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 12,
                  padding: "40px 24px",
                  textAlign: "center",
                  transition: "all 0.2s",
                  background: dragOver ? "rgba(79, 70, 229, 0.05)" : "var(--bg-secondary)",
                  marginBottom: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
               }}
            >
               {/* JSON Required */}
               <div style={{
                  padding: 16,
                  background: jsonResume ? "rgba(5, 150, 105, 0.08)" : "var(--bg-primary)",
                  borderRadius: 10,
                  border: `1px solid ${jsonResume ? "rgba(5, 150, 105, 0.2)" : "var(--border)"}`,
               }}>
                  <div style={{
                     display: "flex",
                     justifyContent: "space-between",
                     alignItems: "center",
                     marginBottom: jsonResume ? 12 : 0,
                  }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <FileJson size={24} color={jsonResume ? "var(--success)" : "var(--text-secondary)"} />
                        <div style={{ textAlign: "left" }}>
                           <p style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              fontSize: 14,
                           }}>Resume JSON <span style={{color: "var(--danger)"}}>*</span></p>
                           {!jsonResume && (
                              <p style={{
                                 fontSize: 12,
                                 color: "var(--text-muted)",
                              }}>Required</p>
                           )}
                        </div>
                     </div>
                     {!jsonResume && (
                        <button onClick={() => document.getElementById("json-file-input")?.click()} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>Browse</button>
                     )}
                     <input id="json-file-input" type="file" accept=".json" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && setJsonResume(e.target.files[0])} />
                  </div>
                  {jsonResume && (
                     <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 8,
                     }}>
                        <p style={{
                           fontSize: 13,
                           color: "var(--success)",
                           fontWeight: 600,
                        }}>{jsonResume.name} ✓</p>
                        <button onClick={() => { setJsonResume(null); const el = document.getElementById("json-file-input") as HTMLInputElement; if(el) el.value = ""; }} className="btn-secondary" style={{
                           padding: "4px 10px",
                           fontSize: 11,
                           background: "rgba(220, 38, 38, 0.08)",
                           color: "var(--danger)",
                           border: "1px solid rgba(220, 38, 38, 0.2)",
                        }}>
                           Remove
                        </button>
                     </div>
                  )}
               </div>

               {/* PDF Optional */}
               <div style={{
                  padding: 16,
                  background: pdfResume ? "rgba(5, 150, 105, 0.08)" : "var(--bg-primary)",
                  borderRadius: 10,
                  border: `1px solid ${pdfResume ? "rgba(5, 150, 105, 0.2)" : "var(--border)"}`,
               }}>
                  <div style={{
                     display: "flex",
                     justifyContent: "space-between",
                     alignItems: "center",
                     marginBottom: pdfResume ? 12 : 0,
                  }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <FileText size={24} color={pdfResume ? "var(--success)" : "var(--text-secondary)"} />
                        <div style={{ textAlign: "left" }}>
                           <p style={{
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              fontSize: 14,
                           }}>Resume PDF</p>
                           {!pdfResume && (
                              <p style={{
                                 fontSize: 12,
                                 color: "var(--text-muted)",
                              }}>Optional</p>
                           )}
                        </div>
                     </div>
                     {!pdfResume && (
                        <button onClick={() => document.getElementById("pdf-file-input")?.click()} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>Browse</button>
                     )}
                     <input id="pdf-file-input" type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && setPdfResume(e.target.files[0])} />
                  </div>
                  {pdfResume && (
                     <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 8,
                     }}>
                        <p style={{
                           fontSize: 13,
                           color: "var(--success)",
                           fontWeight: 600,
                        }}>{pdfResume.name} ✓</p>
                        <button onClick={() => { setPdfResume(null); const el = document.getElementById("pdf-file-input") as HTMLInputElement; if(el) el.value = ""; }} className="btn-secondary" style={{
                           padding: "4px 10px",
                           fontSize: 11,
                           background: "rgba(220, 38, 38, 0.08)",
                           color: "var(--danger)",
                           border: "1px solid rgba(220, 38, 38, 0.2)",
                        }}>
                           Remove
                        </button>
                     </div>
                  )}
               </div>
            </div>

            <button
               className="btn-primary"
               onClick={handleResumeUpload}
               disabled={loading || !jsonResume}
               style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
               }}
            >
               {loading ? "Uploading..." : "Continue"}
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && (
          <div className="card animate-fadeIn" style={{ padding: 40, textAlign: "center" }}>
            <div style={{
               width: 80,
               height: 80,
               borderRadius: "50%",
               background: "rgba(5, 150, 105, 0.1)",
               border: "1px solid rgba(5, 150, 105, 0.2)",
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               margin: "0 auto 24px",
            }}>
               <CheckCircle size={40} color="var(--success)" />
            </div>
            <h1 style={{
               fontSize: 32,
               marginBottom: 12,
               color: "var(--text-primary)",
               fontWeight: 700,
            }}>Setup Complete</h1>
            <p style={{
               color: "var(--text-secondary)",
               lineHeight: 1.6,
               marginBottom: 32,
               fontSize: 14,
               fontWeight: 400,
            }}>
               Your API keys and resume have been successfully configured. You're ready to begin your interview preparation.
            </p>
            <button
              className="btn-primary"
              onClick={() => router.push("/project-explanation")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
              }}
            >
              Next: Project Explanation <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
