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

  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");
  const [product, setProduct] = useState("");
  const [businessProblem, setBusinessProblem] = useState("");
  const [previousSystem, setPreviousSystem] = useState("");
  const [keyProblems, setKeyProblems] = useState("");
  const [aiTechniques, setAiTechniques] = useState("");
  const [agentUsage, setAgentUsage] = useState("None");
  const [impact, setImpact] = useState("");
  const [evaluationApproach, setEvaluationApproach] = useState("");
  const [challengesLearnings, setChallengesLearnings] = useState("");
  const [learnings, setLearnings] = useState("");
  const [futureRoadmap, setFutureRoadmap] = useState("");

  const [background, setBackground] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [architecture, setArchitecture] = useState("");
  const [businessValue, setBusinessValue] = useState("");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [generatedCaseStudy, setGeneratedCaseStudy] = useState<string | null>(null);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);

  const generateSpecificCaseStudy = async (templateKey: string) => {
      setGeneratingTemplate(true);
      try {
          const { generateCaseStudyFromTemplate } = await import("@/lib/api");
          const projectDetails = `Company Name: ${companyName}\nDomain: ${domain}\nProduct/System: ${product}\nBusiness Problem: ${businessProblem}\nPrevious System: ${previousSystem}\nKey Problems: ${keyProblems}\nAI Techniques Used: ${aiTechniques}\nAgent Usage: ${agentUsage}\nResults & Impact: ${impact}\nEvaluation Approach: ${evaluationApproach}\nChallenges: ${challengesLearnings}\nLearnings: ${learnings}\nFuture Roadmap: ${futureRoadmap}`;
          const res = await generateCaseStudyFromTemplate(sessionId, projectDetails, templateKey);
          setGeneratedCaseStudy(res.content);
          toast.success(`Generated ${templateKey.toUpperCase()} Study Guide`);
      } catch(e: any) {
          toast.error("Failed to generate case study.");
      } finally {
          setGeneratingTemplate(false);
      }
  };

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    setSessionId(sid);
    setCandidateName(localStorage.getItem("candidate_name") || "");
    const fetchContext = async () => {
      try {
        const { getLatestProject, getCaseStudyHistory, getExtractionStatus } = await import("@/lib/api");

        // Check if case study already generated
        try {
          const csHist = await getCaseStudyHistory(sid);
          if (csHist.case_studies && csHist.case_studies.length > 0) {
            const content = csHist.case_studies[0].content;
            if (content) {
              setGeneratedCaseStudy(content);
              setStep("case_study");
            }
          }
        } catch(e) {}

        // Fetch what we have right now (might be empty or basic)
        try {
            const initialLatest = await getLatestProject(sid);
            if (initialLatest && Object.keys(initialLatest).length > 0) {
                setCompanyName(prev => prev || initialLatest.company_name || "");
                setDomain(prev => prev || initialLatest.domain || "");
                setProduct(prev => prev || initialLatest.product || "");
                setBusinessProblem(prev => prev || initialLatest.business_problem || "");
                setPreviousSystem(prev => prev || initialLatest.previous_system || "");
                setKeyProblems(prev => prev || initialLatest.key_problems || "");
                setAiTechniques(prev => prev || initialLatest.ai_techniques || "");
                if (initialLatest.agent_usage) setAgentUsage(initialLatest.agent_usage);
                setImpact(prev => prev || initialLatest.impact || "");
                setEvaluationApproach(prev => prev || initialLatest.evaluation_approach || "");
                setChallengesLearnings(prev => prev || initialLatest.challenges_learnings || "");
                setLearnings(prev => prev || initialLatest.learnings || "");
                setFutureRoadmap(prev => prev || initialLatest.future_roadmap || "");
                setBackground(prev => prev || initialLatest.background || "");
                setSkills(prev => prev.length ? prev : (initialLatest.skills || []));
                setArchitecture(prev => prev || initialLatest.architecture || "");
                setBusinessValue(prev => prev || initialLatest.business_value || "");
                setRole(prev => prev || initialLatest.role || "");
            }
        } catch(e) {}

      } catch(e: any) {
        toast.error("Initialization error");
      }
    };
    fetchContext();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    router.push("/");
  };

  const submitProject = async () => {
    if (!product || !domain || !companyName) {
      toast.error("Please fill out at least Company Name, Domain, and Product/System");
      return;
    }
    
    setLoading(true);
    setEvaluation(null);
    try {
      const apiKey = localStorage.getItem("openai_key") || "";
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://ai-backend-560359652969.us-central1.run.app" : "http://127.0.0.1:8000");
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
          skills,
          company_name: companyName,
          business_problem: businessProblem,
          previous_system: previousSystem,
          key_problems: keyProblems,
          ai_techniques: aiTechniques,
          agent_usage: agentUsage,
          evaluation_approach: evaluationApproach,
          challenges_learnings: challengesLearnings,
          learnings: learnings,
          future_roadmap: futureRoadmap
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
      // We no longer set the generic case study here so the user sees the domain buttons.
      
      if (data.evaluation.overall_score >= 7) {
        toast.success(`Excellent! Score: ${data.evaluation.overall_score}/10. Please choose a domain.`);
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
              {/* 1. Company Name */}
              <div>
                <label className="label">1. Company Name</label>
                <input className="input-field" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Lucid Motors" disabled={loading} />
              </div>

              {/* 2. Domain */}
              <div>
                <label className="label">2. Domain</label>
                <input className="input-field" value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. EV car company, Fintech" disabled={loading} />
              </div>

              {/* 3. Product/System */}
              <div>
                <label className="label">3. Product/System</label>
                <textarea className="input-field" rows={2} value={product} onChange={e => setProduct(e.target.value)} placeholder="What product or system did you build?" disabled={loading} />
              </div>

              {/* 4. Business Problem */}
              <div>
                <label className="label">4. Business Problem</label>
                <textarea className="input-field" rows={2} value={businessProblem} onChange={e => setBusinessProblem(e.target.value)} placeholder="What was the core business problem?" disabled={loading} />
              </div>

              {/* 5. Previous System */}
              <div>
                <label className="label">5. Previous System</label>
                <textarea className="input-field" rows={2} value={previousSystem} onChange={e => setPreviousSystem(e.target.value)} placeholder="What existed before? What were its limitations?" disabled={loading} />
              </div>

              {/* 6. Key Problems */}
              <div>
                <label className="label">6. Key Problems</label>
                <textarea className="input-field" rows={2} value={keyProblems} onChange={e => setKeyProblems(e.target.value)} placeholder="What were the main pain points?" disabled={loading} />
              </div>

              {/* 7. LLM Techniques Used */}
              <div>
                <label className="label">7. LLM Techniques Used</label>
                <textarea className="input-field" rows={2} value={aiTechniques} onChange={e => setAiTechniques(e.target.value)} placeholder="e.g. RAG, Fine-tuning, Prompt Engineering" disabled={loading} />
              </div>

              {/* 8. Agent Usage */}
              <div>
                <label className="label">8. Agent Usage</label>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  {["Agent", "Hybrid", "None"].map((option) => (
                    <label key={option} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)", cursor: "pointer", fontSize: 14 }}>
                      <input 
                        type="radio" 
                        name="agentUsage" 
                        value={option} 
                        checked={agentUsage === option} 
                        onChange={e => setAgentUsage(e.target.value)} 
                        disabled={loading}
                        style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {/* 9. Results & Impact */}
              <div>
                <label className="label">9. Results & Impact</label>
                <textarea className="input-field" rows={2} value={impact} onChange={e => setImpact(e.target.value)} placeholder="Measurable outcomes and impact." disabled={loading} />
              </div>

              {/* 10. Evaluation Approach */}
              <div>
                <label className="label">10. Evaluation Approach</label>
                <textarea className="input-field" rows={2} value={evaluationApproach} onChange={e => setEvaluationApproach(e.target.value)} placeholder="How did you evaluate success?" disabled={loading} />
              </div>

              {/* 11. Challenges */}
              <div>
                <label className="label">11. Challenges</label>
                <textarea className="input-field" rows={2} value={challengesLearnings} onChange={e => setChallengesLearnings(e.target.value)} placeholder="What were the biggest challenges?" disabled={loading} />
              </div>

              {/* 12. Learnings */}
              <div>
                <label className="label">12. Learnings</label>
                <textarea className="input-field" rows={2} value={learnings} onChange={e => setLearnings(e.target.value)} placeholder="What did you learn?" disabled={loading} />
              </div>

              {/* 13. Future Scope */}
              <div style={{marginBottom:24}}>
                <label className="label">13. Future Scope</label>
                <textarea className="input-field" rows={2} value={futureRoadmap} onChange={e => setFutureRoadmap(e.target.value)} placeholder="What comes next?" disabled={loading} />
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
        {step === "case_study" && (
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
                 <CheckCircle size={20} color="var(--success)" /> Project Context Saved
               </h2>
               <p style={{
                 color: "var(--text-secondary)",
                 marginBottom: 24,
                 fontSize: 14,
                 lineHeight: 1.6,
                 fontWeight: 400,
               }}>
                 Generate a deep, FAANG-level study guide tailored to a specific domain using your background.
               </p>

               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                  <button onClick={() => generateSpecificCaseStudy("rag")} className="btn-secondary" disabled={generatingTemplate} style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>RAG</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 400 }}>Retrieval-Augmented Gen</span>
                  </button>
                  <button onClick={() => generateSpecificCaseStudy("agentic")} className="btn-secondary" disabled={generatingTemplate} style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#e879f9" }}>Agentic AI</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 400 }}>Multi-Agent Orchestration</span>
                  </button>
               </div>

               {generatingTemplate && (
                 <div style={{ display: "flex", justifyContent: "center", padding: 24, marginBottom: 24 }}>
                   <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid var(--bg-tertiary)", borderTopColor: "var(--accent)", borderRadius: "50%" }}></div>
                 </div>
               )}

               {!generatingTemplate && generatedCaseStudy && (
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
               )}
               
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
