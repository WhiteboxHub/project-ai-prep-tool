"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getResumeSummary, getCaseStudyHistory, getIntroHistory } from "@/lib/api";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  FileText,
  User,
  CheckCircle,
  Lock,
  ArrowRight,
  BookOpen,
  Mic,
  Video
} from "lucide-react";

export default function DashboardPipeline() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [loading, setLoading] = useState(true);

  const [hasSetup, setHasSetup] = useState(false);
  const [hasCaseStudy, setHasCaseStudy] = useState(false);
  const [hasPassedIntro, setHasPassedIntro] = useState(false);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) {
      router.push("/setup");
      return;
    }
    setSessionId(sid);

    const checkPipelineStatus = async () => {
      try {
        const resumeSummary = await getResumeSummary(sid);
        if (resumeSummary.resume_text) setHasSetup(true);
        if (resumeSummary.candidate_name) {
          localStorage.setItem("candidate_name", resumeSummary.candidate_name);
          setCandidateName(resumeSummary.candidate_name);
        } else {
          setCandidateName(localStorage.getItem("candidate_name") || "");
        }

        try {
          const csHist = await getCaseStudyHistory(sid);
          if (csHist.case_studies && csHist.case_studies.length > 0) {
            setHasCaseStudy(true);
          }
        } catch (e) {}

        try {
          const introHist = await getIntroHistory(sid);
          if (introHist.attempts && introHist.attempts.length > 0) {
            const passedAny = introHist.attempts.some((a: any) => a.score >= 70);
            setHasPassedIntro(passedAny);
          }
        } catch (e) {}
      } catch (err) {
        console.error("Failed to load pipeline stats:", err);
      } finally {
        setLoading(false);
      }
    };

    checkPipelineStatus();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    localStorage.removeItem("api_provider");
    router.push("/");
  };

  const steps = [
    {
      num: 1,
      id: "setup",
      icon: <User size={24} />,
      title: "Complete Initial Setup",
      desc: "Upload your resume and connect your AI API credentials.",
      href: "/setup",
      status: hasSetup ? "completed" : "pending",
      btnText: hasSetup ? "Update Setup" : "Start Setup",
    },
    {
      num: 2,
      id: "project",
      icon: <BookOpen size={24} />,
      title: "Project Explanation & Case Study",
      desc: "Explain your project and generate a comprehensive case study that interviewers will ask about.",
      href: "/project-explanation",
      status: hasCaseStudy ? "completed" : (hasSetup ? "pending" : "locked"),
      btnText: hasCaseStudy ? "Review Project" : "Explain Project",
    },
    {
      num: 3,
      id: "intro",
      icon: <Mic size={24} />,
      title: "Self-Introduction Audio Test",
      desc: "Record your professional introduction and get AI feedback on fluency, structure, and confidence.",
      href: "/intro",
      status: hasPassedIntro ? "completed" : (hasCaseStudy ? "pending" : "locked"),
      btnText: hasPassedIntro ? "Retake Intro" : "Record Intro",
    },
    {
      num: 4,
      id: "interviews",
      icon: <Video size={24} />,
      title: "Practice Mock Interviews",
      desc: "Have interactive mock interviews with AI agents who ask questions based on your project context.",
      href: "/interview",
      status: hasPassedIntro ? "pending" : "locked",
      btnText: "Start Interviews",
    }
  ];

  if (loading) {
     return (
       <div style={{
         minHeight: "100vh",
         background: "var(--bg-primary)",
         display: "flex",
         justifyContent: "center",
         alignItems: "center"
       }}>
          <div className="animate-spin" style={{
            width: 40,
            height: 40,
            border: "3px solid var(--bg-tertiary)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%"
          }}></div>
       </div>
     );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <Navbar candidateName={candidateName} onLogout={handleLogout} />

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>
        
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="badge badge-accent" style={{ display: "inline-flex", marginBottom: 16 }}>
             Interview Readiness Journey
          </div>
          <h1 style={{
            fontSize: 36,
            marginBottom: 16,
            color: "var(--text-primary)",
            fontWeight: 700,
          }}>
            Your <span className="glow-text">Progress Path</span>
          </h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: 15,
            maxWidth: 600,
            margin: "0 auto",
            lineHeight: 1.6,
            fontWeight: 400,
          }}>
            Follow each step sequentially. Complete one to unlock the next. Master your interview skills step by step.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
           {/* Connecting vertical line */}
           <div style={{
              position: "absolute",
              left: 39,
              top: 40,
              bottom: 0,
              width: 2,
              background: "var(--border)",
              zIndex: 0
           }}></div>

           {steps.map((step, i) => {
              const isLocked = step.status === "locked";
              const isCompleted = step.status === "completed";
              const isPending = step.status === "pending";

              return (
                 <div key={step.id} style={{
                    display: "flex",
                    gap: 24,
                    position: "relative",
                    zIndex: 1,
                    opacity: isLocked ? 0.6 : 1,
                    transition: "opacity 0.2s"
                 }}>
                    
                    {/* Status Circle */}
                    <div style={{
                       width: 80,
                       height: 80,
                       borderRadius: "50%",
                       flexShrink: 0,
                       background: isCompleted
                         ? "rgba(16, 185, 129, 0.08)"
                         : isPending
                         ? "var(--bg-card)"
                         : "transparent",
                       border: `2px solid ${
                         isCompleted
                           ? "var(--success)"
                           : isPending
                           ? "var(--accent)"
                           : "var(--border)"
                       }`,
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "center",
                       color: isCompleted
                         ? "var(--success)"
                         : isPending
                         ? "var(--accent)"
                         : "var(--text-muted)",
                       boxShadow: isPending
                         ? "0 4px 12px var(--accent-glow)"
                         : "0 1px 3px rgba(0, 0, 0, 0.05)",
                    }}>
                       {isCompleted ? <CheckCircle size={32} /> : isLocked ? <Lock size={28} /> : step.icon}
                    </div>

                    {/* Step Content Card */}
                    <div className="card" style={{
                       flex: 1,
                       padding: "28px 32px",
                       display: "flex",
                       flexDirection: "column",
                       gap: 16,
                       border: isPending
                         ? "1px solid var(--border-accent)"
                         : "1px solid var(--border)",
                       background: isPending
                         ? "var(--gradient-card)"
                         : "var(--bg-card)",
                    }}>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                             <span style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                fontWeight: 700,
                                letterSpacing: "0.5px",
                                color: isCompleted
                                  ? "var(--success)"
                                  : isLocked
                                  ? "var(--text-muted)"
                                  : "var(--accent)",
                                marginBottom: 8,
                                display: "block"
                             }}>
                                {isCompleted ? "✓ Completed" : isLocked ? "Locked" : "Next Step"}
                             </span>
                             <h3 style={{
                                fontSize: 20,
                                color: "var(--text-primary)",
                                fontWeight: 700,
                             }}>
                                {step.title}
                             </h3>
                          </div>
                       </div>
                       
                       <p style={{
                         color: "var(--text-secondary)",
                         fontSize: 14,
                         lineHeight: 1.6,
                         fontWeight: 400,
                       }}>
                         {step.desc}
                       </p>
                       
                       <div style={{ marginTop: "auto", paddingTop: 8 }}>
                          {isLocked ? (
                             <button className="btn-secondary" disabled style={{
                               opacity: 0.5,
                               cursor: "not-allowed",
                               width: "100%",
                             }}>
                                Complete previous steps
                             </button>
                          ) : (
                             <Link href={step.href}>
                               <button className={isPending ? "btn-primary" : "btn-secondary"} style={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 8,
                                 padding: "11px 20px",
                                 fontSize: 14,
                               }}>
                                  {step.btnText} {isPending && <ArrowRight size={16} />}
                               </button>
                             </Link>
                          )}
                       </div>
                    </div>

                 </div>
              );
           })}
        </div>
      </div>
    </div>
  );
}
