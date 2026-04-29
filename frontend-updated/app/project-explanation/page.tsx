"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { evaluateProjectExplanation, generateFromUseCase } from "@/lib/api";
import Link from "next/link";
import { ChevronLeft, Sparkles, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/Navbar";

export default function ProjectExplanationPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  
  const [step, setStep] = useState<"fill" | "evaluate" | "case_study">("fill");

  const [domain, setDomain] = useState("");
  const [background, setBackground] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const [product, setProduct] = useState("");
  const [architecture, setArchitecture] = useState("");
  const [businessValue, setBusinessValue] = useState("");
  const [role, setRole] = useState("");
  const [impact, setImpact] = useState("");

  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [generatedCaseStudy, setGeneratedCaseStudy] = useState<string | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    setCandidateName(localStorage.getItem("candidate_name") || "");
    const fetchContext = async () => {
      try {
        setLoading(true);
        const { extractProject } = await import("@/lib/api");
        const extracted = await extractProject(sid);
        if (extracted) {
           setDomain(extracted.domain || "");
           setBackground(extracted.background || "");
           setSkills(extracted.skills || []);
           if (extracted.core_project) {
              setProduct(extracted.core_project.product || "");
              setArchitecture(extracted.core_project.architecture || "");
              setBusinessValue(extracted.core_project.business_value || "");
              setRole(extracted.core_project.role || "");
              setImpact(extracted.core_project.impact || "");
           }
        }
      } catch(e: any) {
        const errorMsg = e?.response?.data?.detail || e?.message || "Failed to extract data from resume. Make sure you uploaded one.";
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    router.push("/");
  };

  const submitProject = async () => {
    if (!product || !architecture || !businessValue || !role || !impact) {
      toast.error("Please fill out all fields");
      return;
    }
    
    setLoading(true);
    setEvaluation(null);
    try {
      const apiKey = localStorage.getItem("openai_key") || "";
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://ai-backend-560359652969.us-central1.run.app" : "http://127.0.0.1:8001");
      const res = await fetch(`${backendUrl}/api/project/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: sessionId, 
          product, 
          architecture, 
          business_value: businessValue, 
          role, 
          impact, 
          api_key: apiKey,
          domain,
          background,
          skills
        })
      });
      if(!res.ok) {
        let errDetail = "Evaluation failed";
        try {
          const errData = await res.json();
          if(errData && errData.detail) errDetail = errData.detail;
        } catch(parrErr) {}
        throw new Error(errDetail);
      }
      
      const data = await res.json();
      
      setEvaluation(data.evaluation);
      setGeneratedCaseStudy(data.case_study);
      
      if (data.evaluation.overall_score >= 7) {
        toast.success(`Excellent! Score: ${data.evaluation.overall_score}/10`);
        setStep("case_study");
      } else {
        toast.error(`Score: ${data.evaluation.overall_score}/10. Please add more details.`);
        setStep("evaluate");
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Process failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar candidateName={candidateName} onLogout={handleLogout} />

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "48px 24px" }}>
        
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="badge badge-accent" style={{ display: "inline-flex", marginBottom: 16 }}>
            <Sparkles size={14} style={{ marginRight: 6 }} /> Interactive Builder
          </div>
          <h1 style={{
            fontSize: 36,
            marginBottom: 16,
            color: "var(--text-primary)",
            fontWeight: 700,
          }}>
            Explain Your <span className="glow-text">Project</span>
          </h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: 15,
            lineHeight: 1.6,
            fontWeight: 400,
          }}>
            Describe your core project in detail. The AI will evaluate completeness and generate a case study if ready.
          </p>
        </div>

        {/* Form Input fields */}
        {step !== "case_study" && (
          <div className="card animate-fadeIn" style={{ padding: 32, marginBottom: 24 }}>
            <h2 style={{
              fontSize: 20,
              marginBottom: 8,
              color: "var(--text-primary)",
              fontWeight: 700,
            }}>
               Extracted Candidate Profile
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
              The AI automatically extracted your domain, background, skills, and core project from your resume. Review and edit if needed before generating your case study.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label">Domain</label>
                <input
                  className="input-field"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="e.g. Software Engineering"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label">Background</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={background}
                  onChange={e => setBackground(e.target.value)}
                  placeholder="Summary of experience"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label">Skills</label>
                <input
                  className="input-field"
                  value={skills.join(", ")}
                  onChange={e => setSkills(e.target.value.split(",").map(s => s.trim()))}
                  placeholder="React, Python, AWS..."
                  disabled={loading}
                />
              </div>

              <hr style={{ borderColor: "var(--border)", margin: "8px 0" }} />

              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "8px 0" }}>Core Project Details</h3>

              <div>
                <label className="label">Product / Mission</label>
                <input
                  className="input-field"
                  value={product}
                  onChange={e => setProduct(e.target.value)}
                  placeholder="What was the product or project?"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label">Architecture & Tech Stack</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={architecture}
                  onChange={e => setArchitecture(e.target.value)}
                  placeholder="Describe the architecture and technologies used..."
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label">Business Value</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={businessValue}
                  onChange={e => setBusinessValue(e.target.value)}
                  placeholder="Why did this project matter? What problem did it solve?"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label">Your Role & Ownership</label>
                <input
                  className="input-field"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="e.g. Lead Developer, Data Engineer, Product Manager..."
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label">Metrics & Impact</label>
                <input
                  className="input-field"
                  style={{marginBottom:24}}
                  value={impact}
                  onChange={e => setImpact(e.target.value)}
                  placeholder="e.g. Reduced latency by 40%, Improved user retention by 25%..."
                  disabled={loading}
                />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={submitProject}
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px 0",
                display: "flex",
                justifyContent: "center",
                gap: 8,
                fontSize: 14,
              }}
            >
              {loading ? "Extracting / Evaluating..." : "Evaluate & Generate Case Study"}
            </button>
          </div>
        )}

        {/* Evaluation Output */}
        {evaluation && step !== "case_study" && (
          <div style={{
            background: "rgba(217, 119, 6, 0.08)",
            border: "1px solid rgba(217, 119, 6, 0.2)",
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
          }}>
            <h4 style={{
              color: "var(--warning)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
              fontWeight: 600,
              fontSize: 14,
            }}>
              <AlertCircle size={16} /> Needs More Detail
            </h4>
            <p style={{
              color: "var(--text-secondary)",
              fontSize: 13,
              marginBottom: 12,
              fontWeight: 500,
            }}>
              Score: {evaluation.overall_score}/10
            </p>
            <div style={{
              color: "var(--text-primary)",
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              {evaluation.feedback && evaluation.feedback.map((f:any, i:number) => (
                <p key={i} style={{ marginBottom: 6 }}>• {f}</p>
              ))}
            </div>
          </div>
        )}

        {/* Generated output */}
        {step === "case_study" && generatedCaseStudy && (
            <div className="card animate-fadeIn" style={{
              padding: 32,
              borderColor: "rgba(5, 150, 105, 0.3)",
              border: "1px solid rgba(5, 150, 105, 0.3)",
              background: "linear-gradient(135deg, rgba(5, 150, 105, 0.02) 0%, rgba(5, 150, 105, 0) 100%)",
            }}>
               <h2 style={{
                 fontSize: 20,
                 marginBottom: 16,
                 display: "flex",
                 alignItems: "center",
                 gap: 8,
                 color: "var(--text-primary)",
                 fontWeight: 700,
               }}>
                 <CheckCircle size={20} color="var(--success)" /> Case Study Generated
               </h2>
               <p style={{
                 color: "var(--text-secondary)",
                 marginBottom: 24,
                 fontSize: 14,
                 lineHeight: 1.6,
                 fontWeight: 400,
               }}>
                 Your case study has been created using your project details. Review it below, then proceed to the next step.
               </p>
               <div style={{
                 background: "var(--bg-secondary)",
                 padding: 24,
                 borderRadius: 12,
                 border: "1px solid var(--border)",
                 marginBottom: 24,
                 maxHeight: 500,
                 overflowY: "auto",
               }}>
                 <div className="prose-dark">
                    <ReactMarkdown>{generatedCaseStudy}</ReactMarkdown>
                 </div>
               </div>
               
               <button 
                className="btn-primary" 
                onClick={() => router.push("/intro")}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  display: "flex",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 14,
                }}
              >
                Continue to Intro Test <ArrowRight size={16} />
              </button>
            </div>
        )}

      </div>
    </div>
  );
}
