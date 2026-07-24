import React, { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Briefcase, ChevronRight, Lock, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";

type IntroType = "general" | "jd-specific";

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
  const [showModeModal, setShowModeModal] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showScrollButton, setShowScrollButton] = useState(true);

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
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/intro/history?session_id=${sessionId}&page=${currentPage}&limit=10`)
      .then(res => res.json())
      .then(data => {
        setHistory(data.history || []);
        if (data.pagination) setTotalPages(data.pagination.total_pages);
      })
      .catch(console.error);
  }, [sessionId, currentPage]);

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

  const handleStartClick = () => {
    if (!selectedType) return;
    if (selectedType === "jd-specific" && !jdText.trim()) return;
    setShowModeModal(true);
  };

  const handleSelectMode = (mode: "video" | "audio") => {
    sessionStorage.setItem("introType", selectedType || "general");
    sessionStorage.setItem("interviewMode", mode);
    if (selectedType === "jd-specific") {
      sessionStorage.setItem("jobDescription", jdText.trim());
    } else {
      sessionStorage.removeItem("jobDescription");
    }
    setShowModeModal(false);
    navigate("/intro-practice");
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Selection Section - Viewport Sized to keep history below fold */}
        {currentPage === 1 && (
          <div className="min-h-[calc(100vh-8.5rem)] flex flex-col justify-center pb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 text-center max-w-2xl mx-auto relative">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-semibold">Intro Practice</span>
                </div>
                {history.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      const historyEl = document.getElementById("previous-attempts-section");
                      if (historyEl) {
                        historyEl.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <span>View Previous Feedback</span>
                    <ChevronRight className="w-4 h-4 rotate-90 text-white" />
                  </motion.button>
                )}
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
                  onClick={handleStartClick} disabled={!selectedType || (selectedType === "jd-specific" && !jdText.trim())}
                  className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${selectedType && (selectedType !== "jd-specific" || jdText.trim()) ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg glow-primary" : "bg-white/5 text-muted-foreground cursor-not-allowed"}`}>
                  Enter Intro Practice <ChevronRight className="w-5 h-5" />
                </motion.button>
                <p className="text-center text-xs text-muted-foreground mt-3">Make sure your camera and microphone are ready</p>
              </motion.div>
            </div>
          </div>
        )}

        {/* Modal for selecting Audio vs Video mode */}
        <AnimatePresence>
          {showModeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-card border border-border/60 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">Select Interview Format</h3>
                  <p className="text-sm text-muted-foreground">Choose how you would like to conduct your practice session.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Video Option */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectMode("video")}
                    className="p-5 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-secondary/10 hover:border-primary text-left flex flex-col items-center text-center space-y-3 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-lg">Video Interview</h4>
                      <p className="text-xs text-muted-foreground mt-1">Includes camera & microphone checks and visual evaluation</p>
                    </div>
                  </motion.button>

                  {/* Audio Option */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectMode("audio")}
                    className="p-5 rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-500/10 via-card to-fuchsia-500/10 hover:border-purple-500 text-left flex flex-col items-center text-center space-y-3 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-lg">Audio Only</h4>
                      <p className="text-xs text-muted-foreground mt-1">Includes microphone checks only without camera setup</p>
                    </div>
                  </motion.button>
                </div>

                <button
                  onClick={() => setShowModeModal(false)}
                  className="w-full py-2.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* History Section */}
          {history.length > 0 && (
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
              <h3 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                Previous Attempts
              </h3>
              <div className="space-y-4">
                {history.map((item, i) => {
                  const parsedFeed = typeof item.feedback === "string" ? JSON.parse(item.feedback) : (item.feedback || {});
                  const innerFeed = parsedFeed.feedback || parsedFeed;
                  const parsedResp = typeof item.raw_response === "string" ? JSON.parse(item.raw_response) : (item.raw_response || {});
                  const isJD = item.type === "intro_jd" || item.type === "intro_eval_jd";
                  
                  const suggestionsList = innerFeed.ai_suggestions || parsedFeed.ai_suggestions || parsedResp.evaluation?.ai_suggestions || [];
                  const strengthsList = innerFeed.strengths || parsedFeed.strengths || parsedResp.strengths || parsedResp.evaluation?.strengths || [];
                  
                  const techGapsRaw = innerFeed.technical_gaps || parsedFeed.technical_gaps || parsedResp.technical_gaps || parsedResp.evaluation?.technical_gaps;
                  let techGapsList: string[] = [];
                  if (techGapsRaw) {
                    if (Array.isArray(techGapsRaw)) {
                      techGapsList = techGapsRaw.map(item => typeof item === 'string' ? item : (item.note || ""));
                    } else if (typeof techGapsRaw === "object") {
                      Object.values(techGapsRaw).forEach((val: any) => {
                        if (Array.isArray(val)) {
                          val.forEach((item: any) => {
                            if (typeof item === "string") {
                              techGapsList.push(item);
                            } else if (item && typeof item === "object" && item.note) {
                              techGapsList.push(item.note);
                            }
                          });
                        }
                      });
                    }
                  }
                  const commNotesRaw = innerFeed.communication_notes || parsedFeed.communication_notes || parsedResp.communication_notes || parsedResp.evaluation?.communication_notes || [];
                  const commNotesList = Array.isArray(commNotesRaw) ? commNotesRaw : [];
                  const legacyWeak = innerFeed.improvement_areas || parsedFeed.improvement_areas || innerFeed.weaknesses || parsedFeed.weaknesses || parsedResp.improvement_areas || parsedResp.weaknesses || parsedResp.evaluation?.weaknesses || parsedResp.evaluation?.improvement_areas || [];
                  
                  const improvementList = [...legacyWeak, ...techGapsList, ...commNotesList];
                  
                  // Extract a high-level summary (e.g. the first suggestion or weakness)
                  let summary = "No summary available.";
                  if (suggestionsList.length > 0) summary = suggestionsList[0];
                  else if (improvementList.length > 0) summary = improvementList[0];
                  else if (strengthsList.length > 0) summary = strengthsList[0];
                  
                  // Truncate summary if it's too long
                  if (summary.length > 120) summary = summary.substring(0, 120) + "...";
                  
                  return (
                    <div key={item.id || i} className="bg-card/40 rounded-2xl border border-border/50 transition-all hover:bg-card/60 p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${item.score >= 75 ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                            {item.score >= 75 ? "Passed" : "Needs Work"} ({item.score}/100)
                          </span>
                          <span className="text-xs font-semibold px-3 py-1 bg-primary/20 text-primary rounded-md uppercase tracking-wider border border-primary/30 shadow-sm">
                            {item.type ? item.type.replace(/_/g, ' ') : (isJD ? "JD Specific" : "General")}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      
                      <p className="text-sm text-foreground/80 italic">"{summary}"</p>
                      
                      <div className="flex justify-end pt-2 border-t border-border/30">
                        <Link to={`/intro-detail/${item.id}`} className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                          View Full Insights <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
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
                    className="px-4 py-2 bg-card/50 border border-border/50 rounded-lg text-sm font-semibold text-foreground hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground font-medium">
                    Page {currentPage} of {totalPages}
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
                    className="px-4 py-2 bg-card/50 border border-border/50 rounded-lg text-sm font-semibold text-foreground hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

    </MainLayout>
  );
}