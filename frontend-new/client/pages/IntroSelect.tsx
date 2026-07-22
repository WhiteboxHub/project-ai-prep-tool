import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, Briefcase, ChevronRight, Lock, Loader2, Sparkles } from "lucide-react";
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
  const [hasHistory, setHasHistory] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/intro/history?session_id=${sessionId}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data.history && data.history.length > 0) {
          setHasHistory(true);
        }
      })
      .catch(console.error);
  }, [sessionId]);

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
                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col items-center text-center relative ${isSelected ? `bg-gradient-to-br ${type.color} ${type.border}` : "bg-card/40 border-border/50 hover:border-border"}`}>
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
      </div>

      {hasHistory && showScrollButton && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 20, x: "-50%" }} 
            animate={{ opacity: 1, y: 0, x: "-50%" }} 
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-[calc(50%+32px)] z-20"
          >
            <button
              onClick={() => navigate("/history")}
              className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/40 border border-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 text-xs font-bold cursor-pointer"
            >
              <span>View Previous Feedback</span>
              <ChevronRight className="w-4 h-4 text-white mt-0.5" />
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </MainLayout>
  );
}