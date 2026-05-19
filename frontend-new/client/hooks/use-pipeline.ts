import { useState, useEffect } from "react";
import { getResumeSummary, getProjectHistory, getIntroHistory } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export interface PipelineStatus {
  setup: "completed" | "pending";
  project: "locked" | "ready" | "completed";
  intro: "locked" | "ready" | "completed";
  interview: "locked" | "ready" | "completed";
}

export function usePipeline() {
  const { sessionId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<PipelineStatus>({
    setup: "pending", project: "locked", intro: "locked", interview: "locked",
  });
  const [readiness, setReadiness] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [sum, projHist, introHist] = await Promise.allSettled([
          getResumeSummary(sessionId),
          getProjectHistory(sessionId),
          getIntroHistory(sessionId),
        ]);

        const s = sum.status === "fulfilled" ? sum.value : null;
        const ph = projHist.status === "fulfilled" ? projHist.value : null;
        const ih = introHist.status === "fulfilled" ? introHist.value : null;

        const hasResume = Boolean(s?.resume_text);
        const hasApiKey = Boolean(s?.has_api_key);
        const hasProjectData = Boolean(ph?.has_project);
        const isProjectCompleted = Boolean(ph?.completed);
        const hasIntroPassed = ih?.passed === true || (ih?.best_score && ih?.best_score >= 75);

        const newPipeline: PipelineStatus = {
          setup: hasResume && hasApiKey ? "completed" : "pending",
          project: hasResume && hasApiKey ? (isProjectCompleted ? "completed" : "ready") : "locked",
          intro: isProjectCompleted ? (hasIntroPassed ? "completed" : "ready") : "locked",
          interview: hasIntroPassed ? "ready" : "locked",
        };

        setPipeline(newPipeline);

        let score = 0;
        if (newPipeline.setup === "completed") score += 25;
        if (newPipeline.project === "completed") score += 25;
        if (newPipeline.intro === "completed") score += 25;
        if (newPipeline.interview !== "locked") score += 25;
        setReadiness(score);

      } catch (e) {
        console.error("Pipeline load failed", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  return { pipeline, loading, readiness };
}
