import { useState, useEffect } from "react";
import { getResumeSummary, getProjectHistory, getIntroHistory } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export interface PipelineStatus {
  setup: "completed" | "pending";
  intro: "locked" | "ready" | "completed";
  interview: "locked" | "ready" | "completed";
}

export function usePipeline() {
  const { sessionId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState<PipelineStatus>({
    setup: "pending", intro: "ready", interview: "ready",
  });
  const [readiness, setReadiness] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [sum, introHist] = await Promise.allSettled([
          getResumeSummary(sessionId),
          getIntroHistory(sessionId),
        ]);

        const s = sum.status === "fulfilled" ? sum.value : null;
        const ih = introHist.status === "fulfilled" ? introHist.value : null;

        const hasResume = Boolean(s?.resume_text);
        const hasApiKey = Boolean(s?.has_api_key);
        const hasIntroPassed = ih?.passed === true || (ih?.best_score && ih?.best_score >= 75);

        const newPipeline: PipelineStatus = {
          setup: hasResume && hasApiKey ? "completed" : "pending",
          intro: hasIntroPassed ? "completed" : "ready",
          interview: "ready",
        };

        setPipeline(newPipeline);

        let score = 0;
        if (newPipeline.setup === "completed") score += 34;
        if (newPipeline.intro === "completed") score += 33;
        if (newPipeline.interview !== "locked") score += 33;
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
