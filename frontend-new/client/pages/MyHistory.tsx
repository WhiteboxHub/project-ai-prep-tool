import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  FileText,
  Loader2,
  Play,
  Video,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { getIntroHistory } from "@/lib/api";
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

function fmtDate(value?: string) {
  if (!value) return "Unknown date";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

export default function MyHistory() {
  const { sessionId } = useAuth();
  const [attempts, setAttempts] = useState<IntroAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<"all" | "audio" | "video">("all");
  const itemsPerPage = 10;

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getIntroHistory(sessionId);
        const rows = data.history || [];
        setAttempts(rows);
        setCurrentPage(1);
      } catch (e: any) {
        setError(e.message || "Failed to load introduction history.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sessionId]);

  const bestScore = useMemo(() => {
    if (!attempts.length) return 0;
    return Math.max(...attempts.map((a) => a.score || 0));
  }, [attempts]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType]);

  const filteredAttempts = useMemo(() => {
    return attempts.filter((attempt) => {
      if (filterType === "video") {
        return !!attempt.video_url;
      }
      if (filterType === "audio") {
        return !attempt.video_url;
      }
      return true;
    });
  }, [attempts, filterType]);

  const totalPages = Math.ceil(filteredAttempts.length / itemsPerPage);
  const paginatedAttempts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAttempts.slice(start, start + itemsPerPage);
  }, [filteredAttempts, currentPage]);

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
            <h2 className="text-3xl font-bold text-foreground">My Interview History</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your introduction practice attempts, recordings, transcripts, and AI feedback.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div className="rounded-lg border border-border/50 bg-card/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">My interviews</p>
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
            <h3 className="text-lg font-semibold text-foreground">No interviews yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Record or submit your introduction practice to start building your interview history.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 bg-card/60 overflow-hidden shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 bg-card/40 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground text-left">All Interviews</h3>
                <p className="text-xs text-muted-foreground mt-0.5 text-left">
                  Found {filteredAttempts.length} interviews
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="interview-filter" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Filter Type:
                </label>
                <select
                  id="interview-filter"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">All Interviews</option>
                  <option value="video">Video Interviews</option>
                  <option value="audio">Audio Interviews</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <th className="px-6 py-3.5">Interview</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5 text-center">Score</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 bg-card/30">
                  {paginatedAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-card/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                        Interview #{attempt.id}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {fmtDate(attempt.created_at)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {attempt.video_url ? (
                            <>
                              <Video className="h-4 w-4 text-primary" />
                              <span>Video Recording</span>
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>Text Attempt</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-bold inline-block",
                            attempt.passed
                              ? "bg-green-500/15 text-green-400"
                              : "bg-amber-500/15 text-amber-400"
                          )}
                        >
                          {attempt.score ?? 0}/100
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            attempt.passed ? "text-green-400" : "text-amber-400"
                          )}
                        >
                          {attempt.passed ? "Passed" : "Retry"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          to={`/history/intro-detail/${attempt.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 bg-card/40 px-6 py-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-card/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3.5 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-card/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
