import React, { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Briefcase, ChevronRight, Lock, Loader2, Sparkles, ArrowRight, Play, Video, Filter } from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";

type IntroType = "general" | "jd-specific";

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

const INTRO_TYPES = [
  { 
    id: "general" as IntroType, 
    title: "General Introduction", 
    description: "A standard professional introduction covering your background, skills, and experience.", 
    icon: FileText, 
    color: "from-blue-500/20 to-cyan-500/10", 
    border: "border-blue-500/30", 
    iconColor: "text-blue-400" 
  },
  { 
    id: "jd-specific" as IntroType, 
    title: "JD Specific Introduction", 
    description: "A tailored introduction focused on highlighting experiences relevant to a specific Job Description.", 
    icon: Briefcase, 
    color: "from-purple-500/20 to-fuchsia-500/10", 
    border: "border-purple-500/30", 
    iconColor: "text-purple-400" 
  },
];

export default function IntroSelect() {
  const navigate = useNavigate();
  const { sessionId } = useAuth();
  const { pipeline, loading } = usePipeline();
  
  const [selectedType, setSelectedType] = useState<IntroType | null>(null);
  const [jdText, setJdText] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showScrollButton, setShowScrollButton] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [hasInitialHistory, setHasInitialHistory] = useState(false);

  // Filters State
  const [filterSessionType, setFilterSessionType] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const typeFilterRef = useRef<HTMLDivElement>(null);
  const dateFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  const [typeFilterPos, setTypeFilterPos] = useState({ top: 0, left: 0 });
  const [dateFilterPos, setDateFilterPos] = useState({ top: 0, left: 0 });
  const [statusFilterPos, setStatusFilterPos] = useState({ top: 0, left: 0 });

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

  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  useEffect(() => {
    setSelectedRowId(null);
    setCurrentPage(1);
  }, [filterSessionType, filterDate, filterStatus]);

  useEffect(() => {
    setSelectedRowId(null);
  }, [currentPage]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setShowScrollButton(false);
      } else {
        setShowScrollButton(true);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const queryParams = new URLSearchParams({
      session_id: sessionId,
      page: String(currentPage),
      limit: "30"
    });
    if (filterSessionType) queryParams.append("session_type", filterSessionType);
    if (filterDate) queryParams.append("date", filterDate);
    if (filterStatus) queryParams.append("status", filterStatus);

    fetch(`${import.meta.env.VITE_API_URL || ""}/api/intro/history?${queryParams.toString()}`)
      .then(res => res.json())
      .then(data => {
        setHistory(data.history || []);
        if (data.pagination) {
          setTotalPages(data.pagination.total_pages);
          setTotalCount(data.pagination.total_count || 0);
          if (!filterSessionType && !filterDate && !filterStatus && data.pagination.total_count > 0) {
            setHasInitialHistory(true);
          }
        }
      })
      .catch(console.error);
  }, [sessionId, currentPage, filterSessionType, filterDate, filterStatus]);

  useEffect(() => {
    if (window.location.hash === "#previous-attempts-section" && history.length > 0) {
      const el = document.getElementById("previous-attempts-section");
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    }
  }, [history]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (pipeline.intro === "locked") {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-border/50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Practice Locked</h2>
          <p className="text-muted-foreground max-w-md">Please go back to the Whitebox Learning platform and update your setup to unlock the introduction practice.</p>
        </div>
      </MainLayout>
    );
  }

  const handleStart = async () => {
    if (!selectedType) return;
    if (selectedType === "jd-specific" && !jdText.trim()) return;
    
    sessionStorage.setItem("introType", selectedType);
    if (selectedType === "jd-specific") {
      sessionStorage.setItem("jobDescription", jdText.trim());
    } else {
      sessionStorage.removeItem("jobDescription");
    }
    navigate("/intro-practice");
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Top Selection Section - Viewport Sized to keep history below fold */}
        {currentPage === 1 && (
          <div className="min-h-[calc(100vh-8.5rem)] flex flex-col justify-center pb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-semibold">Intro Practice</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Select Introduction Type</h2>
              <p className="text-muted-foreground text-lg">Choose between a general introduction or tailor it to a specific job description.</p>
            </motion.div>

            <div className="max-w-2xl mx-auto space-y-4 w-full">
              <div className="grid sm:grid-cols-2 gap-4">
                {INTRO_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedType === type.id;
                  return (
                    <motion.button key={type.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col items-center text-center ${isSelected ? `bg-gradient-to-br ${type.color} ${type.border}` : "bg-card/40 border-border/50 hover:border-border"}`}>
                      <div className={`p-4 rounded-xl inline-block mb-4 ${isSelected ? "bg-background/50" : "bg-white/5"}`}>
                        <Icon className={`w-8 h-8 ${isSelected ? type.iconColor : "text-muted-foreground"}`} />
                      </div>
                      <h4 className="font-semibold text-foreground mb-2 text-lg">{type.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{type.description}</p>
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
                            className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center bg-background/50 ${type.border} border`}>
                            <div className={`w-2.5 h-2.5 rounded-full bg-current ${type.iconColor}`} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: selectedType ? 1 : 0.5 }} className="pt-8 mt-4 border-t border-border/50">
                <AnimatePresence>
                  {selectedType === "jd-specific" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                      <label className="block text-sm font-semibold text-foreground mb-2">Paste the Job Description</label>
                      <textarea 
                        value={jdText}
                        onChange={(e) => setJdText(e.target.value)}
                        placeholder="Paste the full job description here..."
                        className="w-full h-32 p-4 rounded-xl bg-background/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none shadow-inner"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button whileHover={selectedType ? { scale: 1.02 } : {}} whileTap={selectedType ? { scale: 0.98 } : {}}
                  onClick={handleStart} disabled={!selectedType || (selectedType === "jd-specific" && !jdText.trim())}
                  className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${selectedType && (selectedType !== "jd-specific" || jdText.trim()) ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg glow-primary" : "bg-white/5 text-muted-foreground cursor-not-allowed"}`}>
                  Enter Intro Practice <ChevronRight className="w-5 h-5" />
                </motion.button>
                <p className="text-center text-xs text-muted-foreground mt-4">Make sure your camera and microphone are ready</p>
              </motion.div>
            </div>
          </div>
        )}

        {/* History Section */}
          {(history.length > 0 || hasInitialHistory || filterSessionType || filterDate || filterStatus) && (
            <div id="previous-attempts-section" className="pt-12 mt-8 border-t border-border/50 scroll-mt-24">
              {currentPage > 1 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCurrentPage(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-xs font-bold text-primary mb-6 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 text-primary" />
                  <span>Start New Practice Session</span>
                </motion.button>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  My Sessions ({totalCount})
                </h3>
              </div>
              <div className="rounded-lg border border-border/50 bg-card/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20 text-xs font-bold tracking-wider text-foreground">
                        <th className="px-6 py-3.5">S.No</th>
                        
                        {/* Date Column Header with Popover Filter */}
                        <th className="px-6 py-3.5 relative">
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
                        <th className="px-6 py-3.5 relative">
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

                        <th className="px-6 py-3.5 text-center">Score</th>

                        {/* Status Column Header with Popover Filter */}
                        <th className="px-6 py-3.5 relative text-center">
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

                        <th className="px-6 py-3.5 text-center font-bold">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 bg-card/30">
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground bg-card/10">
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
                            <td className="px-6 py-2 font-semibold text-foreground whitespace-nowrap">
                              {(currentPage - 1) * 30 + i + 1}
                            </td>
                            <td className="px-6 py-2 text-muted-foreground whitespace-nowrap">
                              {fmtDate(item.created_at)}
                            </td>
                            <td className="px-6 py-2 text-muted-foreground whitespace-nowrap">
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
                            <td className="px-6 py-2 text-center whitespace-nowrap">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-bold inline-block ${
                                  item.score >= 75
                                    ? "bg-green-500/15 text-green-400"
                                    : "bg-amber-500/15 text-amber-400"
                                }`}
                              >
                                {item.score ?? 0}/100
                              </span>
                            </td>
                            <td className="px-6 py-2 text-center whitespace-nowrap">
                              <span
                                className={`text-xs font-semibold ${
                                  item.score >= 75 ? "text-green-400" : "text-amber-400"
                                }`}
                              >
                                {item.score >= 75 ? "Passed" : "Retry"}
                              </span>
                            </td>
                            <td className="px-6 py-2 text-center whitespace-nowrap text-xs">
                              <Link
                                to={`/intro-detail/${item.id}`}
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
                <div className="flex items-center justify-between border-t border-border/50 bg-card/40 px-6 py-4">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(1, prev - 1));
                      const historyEl = document.getElementById("previous-attempts-section");
                      if (historyEl) {
                        setTimeout(() => {
                          historyEl.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 50);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-card/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground font-medium">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button 
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      setCurrentPage(prev => prev + 1);
                      const historyEl = document.getElementById("previous-attempts-section");
                      if (historyEl) {
                        setTimeout(() => {
                          historyEl.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 50);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-border/50 bg-card hover:bg-card/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Floating Bottom Navigation Button */}
      {history.length > 0 && currentPage === 1 && (
        <AnimatePresence>
          {showScrollButton && (
            <motion.div 
              initial={{ opacity: 0, y: 20, x: "-50%" }} 
              animate={{ opacity: 1, y: 0, x: "-50%" }} 
              exit={{ opacity: 0, y: 20, x: "-50%" }}
              className="fixed bottom-6 left-[calc(50%+32px)] z-20"
            >
              <button
                onClick={() => {
                  const historyEl = document.getElementById("previous-attempts-section");
                  if (historyEl) {
                    historyEl.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/40 border border-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 text-xs font-bold cursor-pointer"
              >
                <span>View Previous Feedback</span>
                <ChevronRight className="w-4 h-4 rotate-90 text-white animate-bounce mt-0.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </MainLayout>
  );
}