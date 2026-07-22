import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  FileText,
  Loader2,
  Play,
  Video,
  Filter,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/AuthContext";
import { createPortal } from "react-dom";

function fmtDate(value?: string) {
  if (!value) return "Unknown date";
  try {
    const d = new Date(value);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return "Unknown date";
  }
}

export default function MyHistory() {
  const { sessionId } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bestScore, setBestScore] = useState(0);

  const [currentPage, setCurrentPage] = useState<number>(() => {
    const val = sessionStorage.getItem("history_currentPage");
    return val ? Number(val) : 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [filterSessionType, setFilterSessionType] = useState<string>(() => {
    return sessionStorage.getItem("history_filterSessionType") || "";
  });
  const [filterDate, setFilterDate] = useState<string>(() => {
    return sessionStorage.getItem("history_filterDate") || "";
  });
  const [filterStatus, setFilterStatus] = useState<string>(() => {
    return sessionStorage.getItem("history_filterStatus") || "";
  });

  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const typeFilterRef = useRef<HTMLDivElement>(null);
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  const isFiltersMounted = useRef(false);
  const isPageMounted = useRef(false);

  const [typeFilterPos, setTypeFilterPos] = useState({ top: 0, left: 0 });
  const [dateFilterPos, setDateFilterPos] = useState({ top: 0, left: 0 });
  const [statusFilterPos, setStatusFilterPos] = useState({ top: 0, left: 0 });

  const [selectedRowId, setSelectedRowId] = useState<number | null>(() => {
    const val = sessionStorage.getItem("history_selectedRowId");
    return val ? Number(val) : null;
  });

  const toggleTypeFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeFilterRef.current) {
      const rect = typeFilterRef.current.getBoundingClientRect();
      setTypeFilterPos({
        top: rect.bottom + 6,
        left: rect.left
      });
    }
    setShowTypeFilter(!showTypeFilter);
    setShowDateFilter(false);
    setShowStatusFilter(false);
  };

  const toggleDateFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dateFilterRef.current) {
      const rect = dateFilterRef.current.getBoundingClientRect();
      setDateFilterPos({
        top: rect.bottom + 6,
        left: rect.left
      });
    }
    setShowDateFilter(!showDateFilter);
    setShowTypeFilter(false);
    setShowStatusFilter(false);
  };

  const toggleStatusFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (statusFilterRef.current) {
      const rect = statusFilterRef.current.getBoundingClientRect();
      setStatusFilterPos({
        top: rect.bottom + 6,
        left: rect.left - 40
      });
    }
    setShowStatusFilter(!showStatusFilter);
    setShowTypeFilter(false);
    setShowDateFilter(false);
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".th-filter-trigger") && !target.closest(".filter-popover-menu")) {
        setShowTypeFilter(false);
        setShowDateFilter(false);
        setShowStatusFilter(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("history_currentPage", String(currentPage));
    sessionStorage.setItem("history_filterSessionType", filterSessionType);
    sessionStorage.setItem("history_filterDate", filterDate);
    sessionStorage.setItem("history_filterStatus", filterStatus);
    if (selectedRowId !== null) {
      sessionStorage.setItem("history_selectedRowId", String(selectedRowId));
    } else {
      sessionStorage.removeItem("history_selectedRowId");
    }
  }, [currentPage, filterSessionType, filterDate, filterStatus, selectedRowId]);

  useEffect(() => {
    if (!isFiltersMounted.current) {
      isFiltersMounted.current = true;
      return;
    }
    setSelectedRowId(null);
    setCurrentPage(1);
  }, [filterSessionType, filterDate, filterStatus]);

  useEffect(() => {
    if (!isPageMounted.current) {
      isPageMounted.current = true;
      return;
    }
    setSelectedRowId(null);
  }, [currentPage]);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setError("");

    const queryParams = new URLSearchParams({
      session_id: sessionId,
      page: String(currentPage),
      limit: "30"
    });
    if (filterSessionType) queryParams.append("session_type", filterSessionType);
    if (filterDate) queryParams.append("date", filterDate);
    if (filterStatus) queryParams.append("status", filterStatus);

    fetch(`${import.meta.env.VITE_API_URL || ""}/api/intro/history?${queryParams.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load session history.");
        return res.json();
      })
      .then(data => {
        setHistory(data.history || []);
        setBestScore(data.best_score || 0);
        if (data.pagination) {
          setTotalPages(data.pagination.total_pages);
          setTotalCount(data.pagination.total_count || 0);
        }
      })
      .catch(err => {
        setError(err.message || "Failed to load session history.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId, currentPage, filterSessionType, filterDate, filterStatus]);

  if (loading && history.length === 0) {
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
            <h2 className="text-3xl font-bold text-foreground text-left">My Interview History</h2>
            <p className="mt-1 text-sm text-muted-foreground text-left">
              Your introduction practice attempts, recordings, transcripts, and AI feedback.
            </p>
          </div>

        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-card/60 overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 bg-card/40 px-6 py-4">
            <h3 className="text-lg font-semibold text-foreground text-left">My Sessions ({totalCount})</h3>
          </div>
          <div className="overflow-x-auto max-h-[440px] overflow-y-auto scrollbar-thin">
            <table className="w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20 text-xs font-bold tracking-wider text-foreground">
                  <th className="px-6 py-3.5 sticky top-0 bg-card z-20 w-[8%] border-r border-b border-border/25">S.No</th>
                  
                  {/* Date Column Header with Popover Filter */}
                  <th className="px-6 py-3.5 relative sticky top-0 bg-card z-20 w-[10%] border-r border-b border-border/25">
                    <div 
                      ref={dateFilterRef}
                      className="th-filter-trigger inline-flex items-center gap-1.5 cursor-pointer select-none hover:text-foreground transition-colors" 
                      onClick={toggleDateFilter}
                    >
                      <span>Date</span>
                      <Filter className={`h-3 w-3 ${filterDate ? "text-primary fill-primary/10" : "text-muted-foreground"}`} />
                    </div>
                    {showDateFilter && createPortal(
                      <div 
                        className="filter-popover-menu fixed z-50 w-52 rounded-xl border border-border bg-card p-3 shadow-2xl text-left normal-case font-normal text-foreground animate-in fade-in slide-in-from-top-1 duration-150" 
                        style={{ top: `${dateFilterPos.top}px`, left: `${dateFilterPos.left}px` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Search Date:</span>
                          <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-background border border-border/50 rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary w-full cursor-pointer [color-scheme:dark]"
                          />
                          <div className="flex justify-between items-center mt-1 pt-1 border-t border-border/30">
                            <button
                              onClick={() => { setFilterDate(""); setShowDateFilter(false); }}
                              className="text-[10px] text-muted-foreground hover:text-foreground font-bold"
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => setShowDateFilter(false)}
                              className="text-[10px] text-primary hover:underline font-bold"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}
                  </th>

                  {/* Session Type Column Header with Popover Filter */}
                  <th className="px-6 py-3.5 relative sticky top-0 bg-card z-20 w-[5%] border-r border-b border-border/25">
                    <div 
                      ref={typeFilterRef}
                      className="th-filter-trigger inline-flex items-center gap-1.5 cursor-pointer select-none hover:text-foreground transition-colors" 
                      onClick={toggleTypeFilter}
                    >
                      <span>Session Type</span>
                      <Filter className={`h-3 w-3 ${filterSessionType ? "text-primary fill-primary/10" : "text-muted-foreground"}`} />
                    </div>
                    {showTypeFilter && createPortal(
                      <div 
                        className="filter-popover-menu fixed z-50 w-36 rounded-xl border border-border bg-card p-1.5 shadow-2xl text-left normal-case font-normal text-foreground animate-in fade-in slide-in-from-top-1 duration-150" 
                        style={{ top: `${typeFilterPos.top}px`, left: `${typeFilterPos.left}px` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div 
                            onClick={() => { setFilterSessionType(""); setShowTypeFilter(false); }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-muted transition-colors ${!filterSessionType ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"}`}
                          >
                            All Types
                          </div>
                          <div 
                            onClick={() => { setFilterSessionType("audio"); setShowTypeFilter(false); }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-muted transition-colors ${filterSessionType === "audio" ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"}`}
                          >
                            Audio
                          </div>
                          <div 
                            onClick={() => { setFilterSessionType("video"); setShowTypeFilter(false); }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-muted transition-colors ${filterSessionType === "video" ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"}`}
                          >
                            Video
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}
                  </th>

                  {/* Status Column Header with Popover Filter */}
                  <th className="px-6 py-3.5 relative text-center sticky top-0 bg-card z-20 w-[5%] border-r border-b border-border/25">
                    <div 
                      ref={statusFilterRef}
                      className="th-filter-trigger inline-flex items-center justify-center gap-1.5 cursor-pointer select-none hover:text-foreground transition-colors" 
                      onClick={toggleStatusFilter}
                    >
                      <span>Status</span>
                      <Filter className={`h-3 w-3 ${filterStatus ? "text-primary fill-primary/10" : "text-muted-foreground"}`} />
                    </div>
                    {showStatusFilter && createPortal(
                      <div 
                        className="filter-popover-menu fixed z-50 w-36 rounded-xl border border-border bg-card p-1.5 shadow-2xl text-left normal-case font-normal text-foreground animate-in fade-in slide-in-from-top-1 duration-150" 
                        style={{ top: `${statusFilterPos.top}px`, left: `${statusFilterPos.left}px` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div 
                            onClick={() => { setFilterStatus(""); setShowStatusFilter(false); }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-muted transition-colors ${!filterStatus ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"}`}
                          >
                            All Statuses
                          </div>
                          <div 
                            onClick={() => { setFilterStatus("pass"); setShowStatusFilter(false); }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-muted transition-colors ${filterStatus === "pass" ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"}`}
                          >
                            Pass
                          </div>
                          <div 
                            onClick={() => { setFilterStatus("fail"); setShowStatusFilter(false); }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-muted transition-colors ${filterStatus === "fail" ? "text-primary font-bold bg-primary/5" : "text-muted-foreground"}`}
                          >
                            Fail
                          </div>
                        </div>
                      </div>,
                      document.body
                    )}
                  </th>

                  <th className="px-6 py-3.5 text-center font-bold sticky top-0 bg-card z-20 w-[15%] border-b border-border/20">Details</th>
                </tr>
              </thead>
              <tbody className="bg-card/30">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground bg-card/10 border-b border-border/20">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg"
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-red-500"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="m15 9-6 6" />
                          <path d="m9 9 6 6" />
                        </svg>
                        <span className="font-semibold text-foreground">No records found</span>
                        <p className="text-xs text-muted-foreground">Try adjusting your filters or date selection.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  history.map((item, i) => (
                    <tr 
                      key={item.id || i} 
                      onClick={() => setSelectedRowId(item.id)}
                      className={`transition-colors cursor-pointer ${
                        selectedRowId === item.id 
                          ? "bg-primary/15 hover:bg-primary/20" 
                          : "hover:bg-primary/5"
                      }`}
                    >
                      <td className="px-6 py-2 font-semibold text-foreground whitespace-nowrap border-r border-b border-border/20">
                        {(currentPage - 1) * 30 + i + 1}
                      </td>
                      <td className="px-6 py-2 text-muted-foreground whitespace-nowrap border-r border-b border-border/20">
                        {fmtDate(item.created_at)}
                      </td>
                      <td className="px-6 py-2 text-muted-foreground whitespace-nowrap border-r border-b border-border/20">
                        <div className="flex items-center gap-1.5">
                          {item.video_url ? (
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
                      <td className="px-6 py-2 text-center whitespace-nowrap border-r border-b border-border/20">
                        <span
                          className={`text-xs font-semibold ${
                            item.score >= 75 ? "text-green-400" : "text-amber-400"
                          }`}
                        >
                          {item.score >= 75 ? "Passed" : "Retry"}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-center whitespace-nowrap text-xs border-b border-border/20">
                        <Link
                          to={`/history/intro-detail/${item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary hover:bg-primary/90 px-5 py-1.5 font-bold text-white shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {history.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/50 bg-card/40 px-6 py-4">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-card/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-muted-foreground font-medium">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3.5 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-card/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
