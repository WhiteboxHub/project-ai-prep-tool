// client/pages/Auth.tsx
// SSO entry point: reads ?prep_token= from URL, syncs with backend, saves session.
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import { syncWithWbl, getResumeSummary } from "@/lib/api";
import { setSession, setCandidateName } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("prep_token") || searchParams.get("token");
    if (!token) {
      setError("No authentication token found. Please log in via the WBL platform.");
      return;
    }

    const run = async () => {
      try {
        // Step 1: Store the token as session_id immediately (mirrors old frontend approach)
        // WBL sends the numeric candidate_id as the token — this IS the session_id
        localStorage.removeItem("ai_prep_explicit_logout");
        setSession(token, "Candidate");
        refresh();

        // Step 2: Try to sync with WBL to get the real candidate name and trigger
        // project extraction if needed. This is best-effort — don't fail on error.
        try {
          const syncData = await syncWithWbl(token);
          if (syncData?.candidate_name) {
            setCandidateName(syncData.candidate_name);
            setSession(token, syncData.candidate_name);
            refresh();
          }
        } catch {
          // sync-from-wbl throws 400 if no resume yet — that's OK, we still continue
        }

        // Step 3: Fetch summary to determine where to route the candidate
        try {
          const summary = await getResumeSummary(token);
          const hasResume = Boolean(summary?.resume_text);
          const hasApiKey = Boolean(summary?.has_api_key);

          // Update name from resume/DB if available
          if (summary?.candidate_name) {
            setCandidateName(summary.candidate_name);
            setSession(token, summary.candidate_name);
            refresh();
          }

          if (hasResume && hasApiKey) {
            // Both resume and API key present — go straight to dashboard
            navigate("/");
          } else {
            // Missing one or both — just go to dashboard and let it handle missing data
            navigate("/");
          }
        } catch {
          // If summary fetch fails, fall back to dashboard — let it handle gracefully
          navigate("/");
        }
      } catch (e: any) {
        setError(e?.message || "Authentication failed. Please try again.");
      }
    };

    run();
  }, [searchParams, navigate, refresh]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 max-w-sm mx-auto px-4 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-semibold">WBL SmartPrep</span>
        </div>

        {!error ? (
          <>
            <div className="space-y-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Authenticating...</h2>
              <p className="text-sm text-muted-foreground">
                Syncing your profile from the WBL platform
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              {[0.1, 0.2, 0.3].map((d) => (
                <motion.div
                  key={d}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: d }}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Authentication Failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = "/"}
              className="px-6 py-2.5 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-colors"
            >
              Back to Home
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
