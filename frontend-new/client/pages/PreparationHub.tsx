// client/pages/PreparationHub.tsx
import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Code2, ArrowRight, Loader2, CheckCircle2, AlertCircle,
  Sparkles, RefreshCw, Users, Star, TrendingUp, Bot,
  Database, Sliders, GitBranch, Network, UserCheck,
  ChevronRight, FileText,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  getLatestProject, submitProject, getProjectHistory,
  generateTypedCaseStudy, getCaseStudyHistory,
} from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type FlowStep = "form" | "loading" | "results";

interface ProjectForm {
  companyName: string; domain: string; product: string;
  businessProblem: string; businessMetrics: string; techStack: string;
  agentUsage: string; role: string; challenges: string;
  results: string; deployment: string; architecture: string;
}

const EMPTY_FORM: ProjectForm = {
  companyName: "", domain: "", product: "", businessProblem: "",
  businessMetrics: "", techStack: "", agentUsage: "None", role: "",
  challenges: "", results: "", deployment: "", architecture: "",
};

const FIELDS: Array<{ key: keyof ProjectForm; label: string; placeholder: string; rows?: number; required?: boolean }> = [
  { key: "companyName", label: "Company / Project Name", placeholder: "e.g. Lucid Motors, Internal AI Platform", required: true },
  { key: "domain", label: "Domain / Industry", placeholder: "e.g. EV, Fintech, Healthcare AI", required: true },
  { key: "product", label: "Product / System Built", placeholder: "Describe what you built at a high level", rows: 2, required: true },
  { key: "businessProblem", label: "Business Problem Solved", placeholder: "What was the core problem?", rows: 2 },
  { key: "businessMetrics", label: "Business Metrics / KPIs", placeholder: "Reduced latency by 40%, saved $2M...", rows: 2 },
  { key: "techStack", label: "Technologies Used", placeholder: "LLMs, vector DBs, Python, cloud...", rows: 2 },
  { key: "role", label: "Your Role", placeholder: "Lead AI Engineer, Architect, Solo developer..." },
  { key: "challenges", label: "Key Challenges", placeholder: "Hardest technical or product obstacles", rows: 2 },
  { key: "results", label: "Results & Impact", placeholder: "Quantified outcomes, user feedback...", rows: 2 },
  { key: "deployment", label: "Deployment / Scale", placeholder: "Serving X users, AWS, 99.9% uptime..." },
  { key: "architecture", label: "Architecture Overview", placeholder: "Key components, data flow, decisions...", rows: 2 },
];

// ── Case Study Card Config ────────────────────────────────────────────────────
interface CardConfig {
  key: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  icon: React.ReactNode;
  glowColor: string;
}

const CASE_STUDY_CARDS: CardConfig[] = [
  {
    key: "agentic",
    title: "Agentic AI",
    description: "Multi-agent orchestration, tool design, ReAct loop, memory & guardrails",
    tag: "Advanced",
    tagColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    icon: <Bot className="w-6 h-6" />,
    glowColor: "hover:border-purple-500/50 hover:shadow-purple-500/10",
  },
  {
    key: "rag",
    title: "RAG System",
    description: "Retrieval architecture, chunking, embedding, re-ranking, evaluation",
    tag: "Intermediate",
    tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    icon: <Database className="w-6 h-6" />,
    glowColor: "hover:border-blue-500/50 hover:shadow-blue-500/10",
  },
  {
    key: "finetuning",
    title: "Fine-tuning",
    description: "LoRA/QLoRA, data strategy, training infra, alignment & deployment",
    tag: "Advanced",
    tagColor: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    icon: <Sliders className="w-6 h-6" />,
    glowColor: "hover:border-pink-500/50 hover:shadow-pink-500/10",
  },
  {
    key: "mlops",
    title: "MLOps",
    description: "ML pipelines, CI/CD, model registry, drift detection & retraining",
    tag: "Intermediate",
    tagColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    icon: <GitBranch className="w-6 h-6" />,
    glowColor: "hover:border-amber-500/50 hover:shadow-amber-500/10",
  },
  {
    key: "system_design",
    title: "System Design",
    description: "Architecture deep-dive, capacity estimation, fault tolerance, scaling",
    tag: "Expert",
    tagColor: "text-red-400 bg-red-500/10 border-red-500/30",
    icon: <Network className="w-6 h-6" />,
    glowColor: "hover:border-red-500/50 hover:shadow-red-500/10",
  },
  {
    key: "intro_template",
    title: "Introduction Template",
    description: "Personalized 30-sec pitch, 2-min intro, talking points & Q&A scripts",
    tag: "Essential",
    tagColor: "text-green-400 bg-green-500/10 border-green-500/30",
    icon: <UserCheck className="w-6 h-6" />,
    glowColor: "hover:border-green-500/50 hover:shadow-green-500/10",
  },
];

// ── Loading Step ──────────────────────────────────────────────────────────────
function LoadingStep() {
  const steps = ["Validating project details...", "Running AI evaluation...", "Building feedback...", "Finalising results..."];
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => Math.min(p + 1, steps.length - 1)), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="glass-card p-10 rounded-2xl border border-primary/20 flex flex-col items-center gap-8">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold text-foreground">Evaluating Your Project</h3>
        <p className="text-muted-foreground text-sm">This may take 20–40 seconds</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-center gap-3 text-sm transition-all ${i < current ? "text-green-400" : i === current ? "text-primary" : "text-muted-foreground/30"}`}>
            {i < current ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              : i === current ? <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              : <div className="w-4 h-4 rounded-full border border-current flex-shrink-0" />}
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Case Study Card ───────────────────────────────────────────────────────────
function CaseStudyCard({
  card, sessionId, generatedTopics, onGenerated,
}: {
  card: CardConfig;
  sessionId: string;
  generatedTopics: Set<string>;
  onGenerated: (topic: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const topicMap: Record<string, string> = {
    agentic: "Agentic AI Case Study",
    rag: "RAG Case Study",
    finetuning: "Fine-tuning Case Study",
    mlops: "MLOps Case Study",
    system_design: "System Design Case Study",
    intro_template: "Introduction Template",
  };
  const isGenerated = generatedTopics.has(topicMap[card.key]);

  const handleGenerate = async () => {
    setLoading(true); setError("");
    try {
      const res = await generateTypedCaseStudy(sessionId, card.key);
      onGenerated(res.topic);
    } catch (e: any) {
      setError(e.message || "Generation failed");
    }
    setLoading(false);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`relative glass-card p-5 rounded-2xl border border-border/50 transition-all duration-300 flex flex-col gap-4 shadow-lg hover:shadow-xl ${card.glowColor} ${isGenerated ? "border-green-500/30 bg-green-500/5" : ""}`}
    >
      {isGenerated && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
          <CheckCircle2 className="w-3 h-3" /> Saved
        </div>
      )}

      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isGenerated ? "bg-green-500/20 text-green-400" : "bg-primary/10 text-primary"}`}>
        {isGenerated ? <CheckCircle2 className="w-5 h-5" /> : card.icon}
      </div>

      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-foreground text-sm">{card.title}</h4>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${card.tagColor}`}>{card.tag}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
      </div>

      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}

      {isGenerated ? (
        <div className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Saved to Documents
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-white/5 border border-border hover:border-primary/40 hover:bg-primary/5 text-sm font-semibold text-foreground flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> Generate</>}
        </motion.button>
      )}
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PreparationHub() {
  const navigate = useNavigate();
  const { sessionId } = useAuth();

  const [step, setStep] = useState<FlowStep>(() => {
    return (sessionStorage.getItem("prep_hub_step") as FlowStep) || "form";
  });
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [error, setError] = useState("");
  const [isPreviouslyEvaluated, setIsPreviouslyEvaluated] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState<Set<string>>(new Set());

  // Persist step to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("prep_hub_step", step);
  }, [step]);

  useEffect(() => {
    if (!sessionId) return;

    // Check prior completion
    getProjectHistory(sessionId).then((d) => {
      if (d?.completed) setIsPreviouslyEvaluated(true);
    }).catch(() => {});

    // Load generated documents to restore card states
    getCaseStudyHistory(sessionId).then((d) => {
      const topics = new Set<string>((d.case_studies || []).map((c: any) => c.topic));
      setGeneratedTopics(topics);
    }).catch(() => {});

    // Prefill form
    getLatestProject(sessionId).then((d) => {
      if (d && Object.keys(d).length > 0) {
        setForm((p) => ({
          ...p,
          companyName: d.company_name || p.companyName,
          domain: d.domain || p.domain,
          product: d.product || p.product,
          businessProblem: d.business_problem || p.businessProblem,
          businessMetrics: d.impact || p.businessMetrics,
          techStack: d.tech_stack || d.ai_techniques || p.techStack,
          agentUsage: d.agent_usage || p.agentUsage,
          role: d.role || p.role,
          challenges: d.challenges_learnings || p.challenges,
          results: d.impact || p.results,
          deployment: d.future_roadmap || p.deployment,
          architecture: d.architecture || p.architecture,
        }));
        if (d.domain && d.product) {
          setIsPreviouslyEvaluated(true);
          // If we reloaded and the backend already has it, and we were on loading, jump to results
          if (step === "loading") {
             setStep("results");
          }
        }
      }
    }).catch(() => {});
  }, [sessionId]);

  const setField = (key: keyof ProjectForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.companyName || !form.domain || !form.product) {
      setError("Please fill in Company Name, Domain, and Product to continue."); return;
    }
    if (!sessionId) return;
    setError(""); setStep("loading");
    try {
      const res = await submitProject({
        user_id: sessionId,
        company_name: form.companyName, domain: form.domain, product: form.product,
        business_problem: form.businessProblem, key_problems: form.businessMetrics,
        ai_techniques: form.techStack, agent_usage: form.agentUsage, role: form.role,
        challenges_learnings: form.challenges, impact: form.results,
        future_roadmap: form.deployment, architecture: form.architecture,
        tech_stack: form.techStack, background: "", business_value: form.results,
        evaluation_approach: "", key_objectives: "", users_scale: "",
        agents_components: "", key_workflows: "", tools_integrations: form.techStack,
        safety_guardrails: "", previous_system: "", learnings: "",
      });
      setEvaluation(res.evaluation);
      setIsPreviouslyEvaluated(true);
      // Refresh card states from DB (in case prior generations exist)
      if (sessionId) {
        getCaseStudyHistory(sessionId).then((d) => {
          const topics = new Set<string>((d.case_studies || []).map((c: any) => c.topic));
          setGeneratedTopics(topics);
        }).catch(() => {});
      }
      setStep("results");
    } catch (e: any) {
      setError(e.message || "Evaluation failed. Please try again.");
      setStep("form");
    }
  };

  const score = evaluation?.overall_score ?? 0;
  const feedback: string[] = Array.isArray(evaluation?.feedback) ? evaluation.feedback : [];
  const strengths: string[] = Array.isArray(evaluation?.strengths) ? evaluation.strengths : [];

  return (
    <MainLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">Project Preparation</h2>
              <p className="text-muted-foreground text-sm">Evaluate your project → Unlock Interview → Generate case studies anytime</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1 — FORM ─────────────────────────────────────────────── */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">

              {isPreviouslyEvaluated && (
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">Project previously evaluated</p>
                      <p className="text-xs text-muted-foreground">Edit details and re-evaluate, or proceed to Introduction Practice.</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/intro-practice")}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm"
                  >
                    <Users className="w-4 h-4" /> Practice Introduction <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              )}

              <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Project Details</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fields marked <span className="text-primary">*</span> are required. Resume data may pre-fill fields — review before evaluating.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {FIELDS.map(({ key, label, placeholder, rows, required }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        {label}{required && <span className="text-primary ml-1">*</span>}
                      </label>
                      {rows && rows > 1 ? (
                        <textarea value={form[key]} onChange={setField(key)} placeholder={placeholder} rows={rows}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border text-foreground text-sm placeholder-muted-foreground focus:border-primary outline-none transition-colors resize-none" />
                      ) : (
                        <input value={form[key]} onChange={setField(key)} placeholder={placeholder}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border text-foreground text-sm placeholder-muted-foreground focus:border-primary outline-none transition-colors" />
                      )}
                    </div>
                  ))}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Agent Usage</label>
                    <div className="flex gap-4">
                      {["Agent", "Hybrid", "None"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                          <input type="radio" name="agentUsage" value={opt} checked={form.agentUsage === opt}
                            onChange={() => setForm((p) => ({ ...p, agentUsage: opt }))} className="accent-primary" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" /> Evaluate Project <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2 — LOADING ──────────────────────────────────────────── */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingStep />
            </motion.div>
          )}

          {/* ── STEP 3 — RESULTS ──────────────────────────────────────────── */}
          {step === "results" && sessionId && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* Unlock Banner */}
              <div className="glass-card p-5 rounded-2xl border border-green-500/30 bg-green-500/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">Project Evaluated Successfully!</p>
                    <p className="text-sm text-muted-foreground">Introduction Practice is now unlocked. Case studies are optional — generate anytime.</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/intro-practice")}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-sm"
                >
                  <Users className="w-4 h-4" /> Practice Introduction <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Evaluation Results */}
              <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" /> AI Evaluation
                  </h3>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-lg ${score >= 7 ? "text-green-400 border-green-500/30 bg-green-500/10" : score >= 5 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
                    <Star className="w-5 h-5" /> {score}/10
                  </div>
                </div>

                {score < 7 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                    Score below 7/10. Add specific metrics and architecture detail to strengthen your project narrative before interviews.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {strengths.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">Strengths</p>
                      {strengths.map((s, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />{s}
                        </p>
                      ))}
                    </div>
                  )}
                  {feedback.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Improvement Areas</p>
                      {feedback.map((f, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                          <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span>{f}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Case Study Cards */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" /> Generate Case Studies
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Optional — generate deep-dive study guides for your interview preparation. Each saves automatically to Documents.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CASE_STUDY_CARDS.map((card) => (
                    <CaseStudyCard
                      key={card.key}
                      card={card}
                      sessionId={sessionId}
                      generatedTopics={generatedTopics}
                      onGenerated={(topic) => setGeneratedTopics((prev) => new Set([...prev, topic]))}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 pt-1">
                <button onClick={() => { setStep("form"); setEvaluation(null); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> Edit &amp; Re-evaluate
                </button>
                <span className="text-border">|</span>
                <button onClick={() => navigate("/documents")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                  <FileText className="w-3.5 h-3.5" /> View Documents
                </button>
                <span className="text-border">|</span>
                <button onClick={() => navigate("/intro-practice")}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/70 transition-colors font-semibold">
                  <Users className="w-3.5 h-3.5" /> Practice Introduction <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </MainLayout>
  );
}
