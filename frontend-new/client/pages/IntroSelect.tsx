import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, Briefcase, ChevronRight, Lock, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { usePipeline } from "@/hooks/use-pipeline";
import { getRecording } from "@/lib/indexedDB";
import { Video, X } from "lucide-react";

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
  
  // Video Modal State
  const [playingVideo, setPlayingVideo] = useState<{ url: string, isLocal: boolean } | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");

  useEffect(() => {
    return () => {
      if (videoSrc && videoSrc.startsWith("blob:")) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  const handlePlayVideo = async (item: any) => {
    let videoUrl = item.video_url;
    
    if (videoUrl.startsWith("local:")) {
      const id = videoUrl.replace("local:", "");
      const blob = await getRecording(id);
      
      if (blob) {
        const url = URL.createObjectURL(blob);
        setVideoSrc(url);
        setPlayingVideo({ url: videoUrl, isLocal: true });
      } else {
        // If the local file is missing, the Service Worker may have uploaded it to YouTube and deleted the local copy.
        // Let's refetch the history to see if the database was updated with the YouTube link!
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/intro/history?session_id=${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            const updatedHistory = data.history || [];
            setHistory(updatedHistory);
            
            const updatedItem = updatedHistory.find((h: any) => h.id === item.id);
            if (updatedItem && updatedItem.video_url && !updatedItem.video_url.startsWith("local:")) {
              setVideoSrc(updatedItem.video_url);
              setPlayingVideo({ url: updatedItem.video_url, isLocal: false });
              return;
            }
          }
        } catch (err) {
          console.error("Failed to refetch history", err);
        }
        
        alert("Video not found locally. It may have been deleted or recorded on another device.");
      }
    } else {
      setVideoSrc(videoUrl);
      setPlayingVideo({ url: videoUrl, isLocal: false });
    }
  };

  const closeVideo = () => {
    setPlayingVideo(null);
    if (videoSrc.startsWith("blob:")) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc("");
  };

  useEffect(() => {
    if (!sessionId) return;
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/intro/history?session_id=${sessionId}`)
      .then(res => res.json())
      .then(data => setHistory(data.history || []))
      .catch(console.error);
  }, [sessionId]);

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
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-semibold">Intro Practice</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Select Introduction Type</h2>
          <p className="text-muted-foreground text-lg">Choose between a general introduction or tailor it to a specific job description.</p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-4">
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

          {/* History Section */}
          {history.length > 0 && (
            <div className="pt-12 mt-8 border-t border-border/50">
              <h3 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                Previous Attempts
              </h3>
              <div className="space-y-4">
                {history.map((item, i) => {
                  const parsedFeed = typeof item.feedback === "string" ? JSON.parse(item.feedback) : (item.feedback || {});
                  const parsedResp = typeof item.raw_response === "string" ? JSON.parse(item.raw_response) : (item.raw_response || {});
                  const isJD = item.type === "intro_jd" || item.type === "intro_eval_jd";
                  
                  const strengthsList = parsedFeed.strengths || parsedResp.strengths || [];
                  const improvementList = parsedFeed.improvement_areas || parsedResp.improvement_areas || parsedFeed.weaknesses || parsedResp.weaknesses || [];
                  
                  return (
                    <div key={item.id || i} className="bg-card/40 p-5 rounded-2xl border border-border/50 transition-all hover:bg-card/60">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${item.score >= 75 ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                            {item.score >= 75 ? "Passed" : "Needs Work"} ({item.score}/100)
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-1 bg-primary/20 text-primary rounded-md uppercase tracking-wider">
                            {isJD ? "JD Specific" : "General"}
                          </span>
                          {item.video_url && (
                            <button onClick={() => handlePlayVideo(item)} className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white/20 transition-colors text-foreground rounded-md text-[10px] font-semibold">
                              <Video className="w-3 h-3 text-primary" /> Watch Recording
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {strengthsList.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-green-400 mb-1 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                              Strengths
                            </h4>
                            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                              {strengthsList.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {improvementList.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              Areas for Improvement
                            </h4>
                            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                              {improvementList.map((s: string, idx: number) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* History Section */}
          {/* ... existing code ... */}

        </div>
      </div>

      <AnimatePresence>
        {playingVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card w-full max-w-4xl rounded-2xl overflow-hidden border border-border shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-border/50">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" /> Practice Recording
                </h3>
                <button onClick={closeVideo} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 bg-black/50 flex justify-center">
                {videoSrc && playingVideo.isLocal ? (
                  <video src={videoSrc} controls autoPlay className="w-full h-auto max-h-[70vh] rounded-xl outline-none" />
                ) : videoSrc && videoSrc.includes("youtube.com") ? (
                  <iframe
                    className="w-full aspect-video max-h-[70vh] rounded-xl outline-none"
                    src={`https://www.youtube.com/embed/${new URL(videoSrc).searchParams.get("v")}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : videoSrc ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Unsupported video format.
                  </div>
                ) : null}
              </div>
              {playingVideo.isLocal && (
                <div className="p-3 text-xs text-center text-muted-foreground bg-primary/5 border-t border-primary/10">
                  This video is stored locally in your browser.
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}