import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Play,
  RotateCcw,
  Video,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { getIntroAttempt, getIntroHistory } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

type IntroAttempt = {
  id: number;
  user_id?: string;
  type?: string;
  score: number | null;
  passed: boolean;
  feedback?: any;
  raw_response?: any;
  created_at: string;
  video_url?: string | null;
};

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

function asObject(value: any) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function asList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") return [value];
  return [];
}

function fmtDate(value?: string) {
  if (!value) return "Unknown date";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown date";
  }
}

function fullVideoUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
}

export default function MyHistory() {
  const { sessionId } = useAuth();
  const [attempts, setAttempts] = useState<IntroAttempt[]>([]);
  const [selected, setSelected] = useState<IntroAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getIntroHistory(sessionId);
        const rows = data.history || [];
        setAttempts(rows);
        setSelected(rows[0] || null);
      } catch (e: any) {
        setError(e.message || "Failed to load introduction history.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId]);

  const openAttempt = async (attempt: IntroAttempt) => {
    if (!sessionId) return;
    setDetailLoading(true);
    setError("");
    try {
      const data = await getIntroAttempt(sessionId, attempt.id);
      setSelected(data.attempt || attempt);
    } catch (e: any) {
      setError(e.message || "Failed to open introduction attempt.");
    } finally {
      setDetailLoading(false);
    }
  };

  const bestScore = useMemo(() => {
    if (!attempts.length) return 0;
    return Math.max(...attempts.map((a) => a.score || 0));
  }, [attempts]);

  const selectedRaw = asObject(selected?.raw_response);
  const selectedFeedback = asObject(selected?.feedback);
  const evaluation = asObject(selectedRaw.evaluation);
  const transcript = selectedRaw.transcript || evaluation.transcript || "";
  const strengths = asList(selectedFeedback.strengths || evaluation.strengths);
  const weaknesses = asList(selectedFeedback.weaknesses || evaluation.weaknesses);
  const suggestions = asList(
    selectedFeedback.ai_suggestions ||
      selectedFeedback.improvement_areas ||
      evaluation.ai_suggestions ||
      evaluation.improvement_areas ||
      evaluation.feedback
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">My History</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your introduction practice attempts, recordings, transcripts, and AI feedback.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-lg border border-border/50 bg-card/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">Attempts</p>
              <p className="text-xl font-bold text-foreground">{attempts.length}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-card/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">Best Score</p>
              <p className="text-xl font-bold text-foreground">{bestScore}/100</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {attempts.length === 0 ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-lg border border-border/50 bg-card/40 text-center">
            <Video className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No intro attempts yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Record or submit your introduction practice to start building your history.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="space-y-3">
              {attempts.map((attempt) => {
                const isActive = selected?.id === attempt.id;
                return (
                  <motion.button
                    key={attempt.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => openAttempt(attempt)}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition-colors",
                      isActive
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/50 bg-card/60 hover:bg-card"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          {attempt.video_url ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          Attempt #{attempt.id}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {fmtDate(attempt.created_at)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          attempt.passed
                            ? "bg-green-500/15 text-green-400"
                            : "bg-amber-500/15 text-amber-400"
                        )}
                      >
                        {attempt.score ?? 0}/100
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className={attempt.passed ? "text-green-400" : "text-amber-400"}>
                        {attempt.passed ? "Passed" : "Retry"}
                      </span>
                      <span className="text-muted-foreground">
                        {attempt.video_url ? "Recording available" : "Text attempt"}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="min-h-[620px] rounded-lg border border-border/50 bg-card/60 p-5">
              {detailLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading attempt...
                </div>
              )}

              {selected && (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">Attempt #{selected.id}</h3>
                      <p className="text-sm text-muted-foreground">{fmtDate(selected.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <RotateCcw className="h-5 w-5 text-amber-400" />
                      )}
                      <span className="text-2xl font-bold text-foreground">{selected.score ?? 0}/100</span>
                    </div>
                  </div>

                  {selected.video_url ? (
                    <div className="overflow-hidden rounded-lg border border-border/50 bg-black">
                      <video
                        key={selected.video_url}
                        src={fullVideoUrl(selected.video_url)}
                        controls
                        className="aspect-video w-full"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      This was a text-only introduction attempt.
                    </div>
                  )}

                  {transcript && (
                    <section className="space-y-2">
                      <h4 className="font-semibold text-foreground">Transcript</h4>
                      <p className="rounded-lg border border-border/50 bg-background/40 p-4 text-sm leading-relaxed text-muted-foreground">
                        {transcript}
                      </p>
                    </section>
                  )}

                  <div className="grid gap-4 xl:grid-cols-3">
                    <FeedbackBlock title="Strengths" items={strengths} tone="green" />
                    <FeedbackBlock title="Areas to Improve" items={weaknesses} tone="amber" />
                    <FeedbackBlock title="AI Suggestions" items={suggestions} tone="blue" />
                  </div>

                  {evaluation.scores && (
                    <section className="space-y-2">
                      <h4 className="font-semibold text-foreground">Assessment Dimensions</h4>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {Object.entries(evaluation.scores).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm"
                          >
                            <span className="truncate pr-3 text-muted-foreground">{key.replace(/_/g, " ")}</span>
                            <span className="font-semibold text-foreground">{Math.round(Number(value))}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {selected.video_url && (
                    <a
                      href={fullVideoUrl(selected.video_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-primary/20 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/30"
                    >
                      <Play className="h-4 w-4" />
                      Open Recording
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function FeedbackBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "green" | "amber" | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "border-green-500/20 bg-green-500/5 text-green-400"
      : tone === "amber"
        ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
        : "border-blue-500/20 bg-blue-500/5 text-blue-400";

  return (
    <section className={cn("rounded-lg border p-4", toneClass)}>
      <h4 className="font-semibold">{title}</h4>
      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <p key={index} className="text-sm leading-relaxed text-foreground">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No details recorded.</p>
      )}
    </section>
  );
}
