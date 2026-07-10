// client/pages/AdminAnalytics.tsx
// Admin-only analytics dashboard — shows all candidate prep usage, intro scores,
// CoderPad stats, interview completion, etc.
// Protected by ?admin_key= in URL.

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Users, CheckCircle2, XCircle, Terminal, BarChart2,
  Search, Filter, RefreshCw, ChevronUp, ChevronDown, X,
  BookOpen, Code2, Zap, AlertTriangle, Shield, Play,
  Star, Activity, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  getAnalyticsSummary,
  getAnalyticsCandidates,
  getAnalyticsCandidateDetail,
} from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CandidateRow {
  id: number;
  user_id: string;
  name: string;
  email: string;
  wbl_email: string;
  login_count: number;
  created_at: string;
  last_login: string;
  extraction_status: string;
  has_resume: boolean;
  has_project: boolean;
  intro_attempts: number;
  best_intro_score: number;
  latest_intro_score: number;
  intro_passed: boolean;
  latest_video_url: string | null;
  questions_answered: number;
  avg_interview_score: number;
  interview_sessions: number;
  interview_completed: boolean;
  case_studies_generated: number;
  prep_completion_pct: number;
  prep_status_label: string;
}

interface Summary {
  total_candidates: number;
  active_this_week: number;
  intro_pass_rate: number;
  interview_completion_rate: number;
  total_case_studies: number;
  intro_passed_count: number;
  interview_completed_count: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
};

const ScoreBadge = ({ score, passed }: { score: number; passed?: boolean }) => {
  const color =
    score >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" :
    score > 0   ? "text-rose-600 bg-rose-50 border-rose-200" :
                  "text-slate-400 bg-slate-50 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {score > 0 ? `${score}` : "—"}
      {passed !== undefined && score > 0 && (
        passed
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          : <XCircle className="w-3.5 h-3.5 text-rose-500" />
      )}
    </span>
  );
};

const StatusPill = ({ label, pct }: { label: string; pct: number }) => {
  const color =
    pct === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    pct >= 75   ? "bg-blue-50 text-blue-700 border-blue-200" :
    pct >= 50   ? "bg-amber-50 text-amber-700 border-amber-200" :
    pct >= 25   ? "bg-orange-50 text-orange-700 border-orange-200" :
                  "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};

// ── Summary card ──────────────────────────────────────────────────────────────

const SummaryCard = ({
  icon, label, value, sub, color, onClick,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string; onClick?: () => void;
}) => (
  <motion.div
    whileHover={onClick ? { y: -3, scale: 1.02, cursor: "pointer" } : { y: -2, scale: 1.01 }}
    whileTap={onClick ? { scale: 0.98 } : {}}
    onClick={onClick}
    className={`bg-white rounded-xl p-4 border border-slate-200 flex items-start gap-3 shadow-sm select-none transition-all duration-200 ${
      onClick ? "hover:border-indigo-300 hover:shadow-md" : ""
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-extrabold text-slate-800 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

// ── Detail Drawer ─────────────────────────────────────────────────────────────

const DetailDrawer = ({
  userId, adminKey, onClose,
}: {
  userId: string; adminKey: string; onClose: () => void;
}) => {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsCandidateDetail(userId, adminKey)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, adminKey]);

  const introChartData = detail?.intro_history?.map((e: any, i: number) => ({
    attempt: `Attempt ${i + 1}`,
    score: e.score,
    passed: e.passed ? 1 : 0,
  })) || [];

  const interviewChartData = detail?.interview_history?.map((e: any, i: number) => ({
    q: `Q${i + 1}`,
    score: (e.score || 0) * 10,
  })) || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-slate-200 z-40 flex flex-col shadow-2xl"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {detail?.candidate?.name || "Candidate Detail"}
            </h3>
            <p className="text-xs text-slate-500">{detail?.candidate?.email || userId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : detail ? (
            <>
              {/* Candidate meta */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ["WBL Email", detail.candidate.wbl_email],
                  ["Login Count", detail.candidate.login_count],
                  ["Joined", fmtDate(detail.candidate.created_at)],
                  ["Last Active", fmtDate(detail.candidate.last_login)],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <p className="text-slate-400 font-semibold">{k}</p>
                    <p className="text-slate-800 font-bold mt-0.5">{v || "—"}</p>
                  </div>
                ))}
              </div>

              {/* Intro score timeline */}
              {introChartData.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Intro Score History
                  </h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={introChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="attempt" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8 }}
                        labelStyle={{ color: "#1e293b", fontWeight: "bold" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(217, 91%, 60%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(217, 91%, 60%)", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Interview answer scores */}
              {interviewChartData.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-amber-500" />
                    Interview Answer Scores
                  </h4>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={interviewChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="q" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8 }}
                      />
                      <Bar dataKey="score" fill="hsl(280, 85%, 57%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* CoderPad removed */}

              {/* Case Studies */}
              {detail.case_studies?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    Case Studies Generated ({detail.case_studies.length})
                  </h4>
                  <div className="space-y-1.5">
                    {detail.case_studies.slice(0, 5).map((cs: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <span className="text-slate-700 font-medium">{cs.topic || "Custom"}</span>
                        <span className="text-slate-400">{fmtDate(cs.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center pt-10">Failed to load details.</p>
          )}
        </div>
      </motion.div>

      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 z-35 backdrop-blur-[2px]"
      />
    </AnimatePresence>
  );
};

// ── Sort helper ───────────────────────────────────────────────────────────────
type SortKey = keyof CandidateRow;

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [searchParams] = useSearchParams();
  const adminKey = searchParams.get("admin_key") || "";

  const [summary, setSummary] = useState<Summary | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterIntroPassed, setFilterIntroPassed] = useState<boolean | null>(null);
  const [filterInterviewDone, setFilterInterviewDone] = useState<boolean | null>(null);
  const [filterActiveWeek, setFilterActiveWeek] = useState<boolean | null>(null);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("last_login");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Video modal state
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // Auth guard
  const isAuthorized = Boolean(adminKey);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, c] = await Promise.all([
        getAnalyticsSummary(adminKey),
        getAnalyticsCandidates(adminKey, {
          search: search || undefined,
          filter_intro_passed: filterIntroPassed ?? undefined,
          filter_interview_done: filterInterviewDone ?? undefined,
          filter_active_week: filterActiveWeek ?? undefined,
        }),
      ]);
      setSummary(s);
      setCandidates(c.candidates || []);
    } catch (e: any) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) load();
    else setLoading(false);
  }, [isAuthorized, filterIntroPassed, filterInterviewDone, filterActiveWeek]);

  // Client-side search + sort
  const displayed = useMemo(() => {
    let rows = [...candidates];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.wbl_email.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const va = a[sortKey] as any;
      const vb = b[sortKey] as any;
      if (va === vb) return 0;
      const cmp = va < vb ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [candidates, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
      : <ChevronDown className="w-3.5 h-3.5 text-slate-300 opacity-50" />;

  const Th = ({ label, k, center }: { label: string; k?: SortKey; center?: boolean }) => (
    <th
      className={`px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200 whitespace-nowrap ${center ? "text-center" : "text-left"} ${k ? "cursor-pointer hover:bg-slate-100/70 select-none" : ""}`}
      onClick={k ? () => toggleSort(k) : undefined}
    >
      <div className={`flex items-center gap-1 ${center ? "justify-center" : ""}`}>
        {label}
        {k && <SortIcon k={k} />}
      </div>
    </th>
  );

  const exportCSV = () => {
    const headers = [
      "Name","Email","WBL Email","Login Count","Last Active",
      "Resume","Project","Intro Attempts","Best Intro Score","Intro Cleared",
      "Questions Answered","Avg Interview Score","Interview Completed",
      "Case Studies","Prep Status"
    ];
    const rows = displayed.map(r => [
      r.name, r.email, r.wbl_email, r.login_count, fmtDate(r.last_login),
      r.has_resume ? "Yes" : "No", r.has_project ? "Yes" : "No",
      r.intro_attempts, r.best_intro_score, r.intro_passed ? "Yes" : "No",
      r.questions_answered, r.avg_interview_score, r.interview_completed ? "Yes" : "No",
      r.case_studies_generated,
      r.prep_status_label
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ai-prep-analytics.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Unauthorized screen ────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="bg-white rounded-2xl p-10 text-center space-y-4 max-w-sm mx-auto border border-slate-200 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Admin Access Required</h2>
          <p className="text-sm text-slate-500">
            Append <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">?admin_key=your-key</code> to the URL to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  // ── Error screen ──────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-4 bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-sm">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
          <p className="text-slate-700 font-bold">{error}</p>
          <button onClick={load} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">Retry</button>
        </div>
      </div>
    );
  }

  // ── Filter toggle ─────────────────────────────────────────────────────────
  const FilterToggle = ({
    label, value, onChange, trueColor,
  }: {
    label: string; value: boolean | null; onChange: (v: boolean | null) => void; trueColor?: string;
  }) => {
    const cycleValues: (boolean | null)[] = [null, true, false];
    const currentIdx = value === null ? 0 : value ? 1 : 2;
    const next = cycleValues[(currentIdx + 1) % 3];
    const display = value === null ? label : value ? `✓ ${label}` : `✗ ${label}`;
    const style =
      value === true  ? `${trueColor || "bg-emerald-50 border-emerald-200 text-emerald-600 font-semibold"}` :
      value === false ? "bg-rose-50 border-rose-200 text-rose-600 font-semibold" :
                        "bg-white border-slate-200 text-slate-500 hover:text-slate-800";
    return (
      <button
        onClick={() => onChange(next)}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${style}`}
      >
        {display}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30 shadow-xs">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">AI Prep Analytics</h1>
              <p className="text-xs text-slate-400 font-semibold">Admin Dashboard · WBL SmartPrep</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1 flex flex-col min-h-0 w-full">

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white border border-slate-200 shadow-xs animate-pulse" />
            ))}
          </div>
        ) : summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            <SummaryCard
              icon={<Users className="w-5 h-5 text-indigo-600" />}
              label="Total Candidates"
              value={summary.total_candidates}
              color="bg-indigo-50 border border-indigo-100"
              onClick={() => {
                setFilterIntroPassed(null);
                setFilterInterviewDone(null);
                setFilterActiveWeek(null);
              }}
            />
            <SummaryCard
              icon={<Activity className="w-5 h-5 text-cyan-600" />}
              label="Active This Week"
              value={summary.active_this_week}
              sub={`of ${summary.total_candidates}`}
              color="bg-cyan-50 border border-cyan-100"
              onClick={() => {
                setFilterIntroPassed(null);
                setFilterInterviewDone(null);
                setFilterActiveWeek(true);
              }}
            />
            <SummaryCard
              icon={<Star className="w-5 h-5 text-amber-500" />}
              label="Intro Pass Rate"
              value={`${summary.intro_pass_rate}%`}
              sub={`${summary.intro_passed_count} passed`}
              color="bg-amber-50 border border-amber-100"
              onClick={() => {
                setFilterIntroPassed(true);
                setFilterInterviewDone(null);
                setFilterActiveWeek(null);
              }}
            />
            <SummaryCard
              icon={<CheckCircle2 className="size-5 text-emerald-600" />}
              label="Interview Done"
              value={`${summary.interview_completion_rate}%`}
              sub={`${summary.interview_completed_count} completed`}
              color="bg-emerald-50 border border-emerald-100"
              onClick={() => {
                setFilterIntroPassed(null);
                setFilterInterviewDone(true);
                setFilterActiveWeek(null);
              }}
            />
            <SummaryCard
              icon={<BookOpen className="size-5 text-rose-500" />}
              label="Case Studies"
              value={summary.total_case_studies}
              sub="generated"
              color="bg-rose-50 border border-rose-100"
            />
          </motion.div>
        )}

        {/* ── Filters & Search ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center shadow-xs"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 transition-all shadow-xs"
            />
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <FilterToggle
              label="Intro Cleared"
              value={filterIntroPassed}
              onChange={setFilterIntroPassed}
              trueColor="bg-amber-50 border-amber-200 text-amber-600 font-semibold"
            />
            <FilterToggle
              label="Interview Done"
              value={filterInterviewDone}
              onChange={setFilterInterviewDone}
            />
            <FilterToggle
              label="Active 7d"
              value={filterActiveWeek}
              onChange={setFilterActiveWeek}
              trueColor="bg-cyan-50 border-cyan-200 text-cyan-600 font-semibold"
            />
            {(filterIntroPassed !== null || filterInterviewDone !== null || filterActiveWeek !== null) && (
              <button
                onClick={() => { setFilterIntroPassed(null); setFilterInterviewDone(null); setFilterActiveWeek(null); }}
                className="text-xs text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 font-semibold transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          {/* Result count */}
          <span className="text-xs text-slate-400 font-semibold sm:ml-auto whitespace-nowrap bg-slate-50 px-2.5 py-1 rounded border border-slate-100 shadow-2xs">
            {displayed.length} / {candidates.length} candidates
          </span>
        </motion.div>

        {/* ── Table Container (Independent scrollable viewport) ────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0"
        >
          {loading ? (
            <div className="flex items-center justify-center h-80 flex-1">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto w-full relative">
              <table className="w-full text-sm">
                <thead>
                  <tr className="sticky top-0 z-10 shadow-2xs">
                    <Th label="Candidate Name" k="name" />
                    <Th label="Email" />
                    <Th label="Video" />
                    <Th label="Intro Score" k="best_intro_score" center />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-20 text-slate-400 text-sm font-semibold">
                        No candidates found matching the active filters.
                      </td>
                    </tr>
                  ) : (
                    displayed.map((row, i) => (
                      <motion.tr
                        key={row.user_id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.01, 0.2), duration: 0.2 }}
                        onClick={() => setSelectedUserId(row.user_id)}
                        className="hover:bg-slate-50/75 cursor-pointer transition-colors group"
                      >
                        {/* Candidate Name */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-300 group-hover:text-indigo-500 transition-colors font-mono mr-1 text-[11px]">▶</span>
                            <span className="font-semibold text-slate-800 text-xs tracking-tight">{row.name}</span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-xs text-slate-500 font-medium">{row.email}</span>
                        </td>

                        {/* Video */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {row.latest_video_url ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Stop row click trigger drawer
                                const backendUrl = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
                                setActiveVideoUrl(`${backendUrl}${row.latest_video_url}`);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-2xs"
                            >
                              <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                              Watch Intro
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300 font-medium italic">No recording</span>
                          )}
                        </td>

                        {/* Intro Score */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center">
                          <ScoreBadge score={row.best_intro_score} passed={row.intro_passed} />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <p className="text-xs text-slate-400 text-center font-medium pb-4">
          Click any row to open the detailed candidate coaching timeline · Video files served locally
        </p>
      </div>

      {/* ── Video Player Modal Overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {activeVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-2xl w-full border border-slate-200"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-indigo-500 fill-indigo-500" />
                  <h3 className="font-extrabold text-slate-800 text-sm">Intro Practice Playback</h3>
                </div>
                <button
                  onClick={() => setActiveVideoUrl(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-slate-950 flex items-center justify-center aspect-video relative">
                <video
                  src={activeVideoUrl}
                  controls
                  autoPlay
                  className="max-h-[50vh] w-full"
                />
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 font-semibold">
                  MPEG/WebM format · Evaluate Eye Contact & Talking Pace
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Candidate Detail Drawer ───────────────────────────────────────── */}
      {selectedUserId && (
        <DetailDrawer
          userId={selectedUserId}
          adminKey={adminKey}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
