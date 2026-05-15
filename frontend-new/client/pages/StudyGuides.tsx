import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ExternalLink, Sparkles, Clock, Tag, Loader2, X, Download, AlertCircle } from "lucide-react";
import { getCaseStudyHistory, getTopics, generateCaseStudy } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import ReactMarkdown from "react-markdown";

interface StudyGuide {
  id: string;
  topic: string;
  content: string;
  created_at: string;
}

export default function StudyGuides() {
  const { sessionId } = useAuth();
  const [guides, setGuides] = useState<StudyGuide[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<StudyGuide | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const [histRes, topicsRes] = await Promise.all([
          getCaseStudyHistory(sessionId),
          getTopics(),
        ]);
        setGuides(histRes.case_studies || []);
        setTopics(topicsRes.topics || []);
      } catch (e: any) {
        setError(e.message || "Failed to load study guides.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const handleGenerate = async (topic?: string) => {
    if (!sessionId) return;
    setGenerating(true);
    setError("");
    try {
      const res = await generateCaseStudy(sessionId, topic);
      const histRes = await getCaseStudyHistory(sessionId);
      setGuides(histRes.case_studies || []);
      // Open the newly generated guide
      const newGuide = (histRes.case_studies || []).find((g: any) => g.id === res.id) || (histRes.case_studies || [])[0];
      if (newGuide) setSelectedGuide(newGuide);
    } catch (e: any) {
      setError(e.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (guide: StudyGuide) => {
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = document.getElementById(`guide-content-${guide.id}`);
      if (!element) return;
      
      const opt: any = {
        margin:       1,
        filename:     `${guide.topic || 'Study_Guide'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error(err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <MainLayout>
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8 max-w-7xl">
        <motion.div variants={itemVariants} className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Study Guides</h2>
          <p className="text-muted-foreground">Comprehensive resources generated from your profile and selected topics.</p>
        </motion.div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleGenerate()} disabled={generating}
            className="col-span-1 md:col-span-3 py-4 px-6 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold flex items-center justify-center gap-3 hover:shadow-2xl smooth-transition glow-primary-lg disabled:opacity-50">
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {generating ? "Generating Guide..." : "Generate New Study Guide from Resume"}
          </motion.button>
          
          {topics.slice(0, 3).map((topic, i) => (
             <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => handleGenerate(topic)} disabled={generating}
              className="py-3 px-4 rounded-xl bg-card border border-border hover:border-primary/50 text-foreground font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              Generate: {topic}
             </motion.button>
          ))}
        </motion.div>

        <motion.section variants={itemVariants} className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Your Study Guides</h3>
          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : guides.length === 0 ? (
             <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
               <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-foreground font-semibold">No study guides yet</p>
               <p className="text-sm text-muted-foreground">Generate one above to get started.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {guides.map((guide, idx) => (
                <motion.div key={guide.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} viewport={{ once: true }}
                  className="glass-card-hover p-6 rounded-2xl border border-border/50 h-full flex flex-col group cursor-pointer"
                  onClick={() => setSelectedGuide(guide)}>
                  <div className="flex items-start justify-between mb-3">
                    <motion.div className="p-3 rounded-lg bg-primary/20 text-primary group-hover:bg-primary/30 smooth-transition" whileHover={{ rotate: 12, scale: 1.1 }}>
                      <BookOpen className="w-6 h-6" />
                    </motion.div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">{guide.topic || `Case Study #${guides.length - idx}`}</h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">{guide.content.replace(/[#*]/g, '').substring(0, 150)}...</p>
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" /> {new Date(guide.created_at).toLocaleDateString()}
                    </div>
                    <button className="w-full py-2 px-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 smooth-transition text-sm font-semibold flex items-center justify-center gap-2">
                      Read Guide <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </motion.div>

      {/* Modal for viewing guide */}
      <AnimatePresence>
        {selectedGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-sm">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
               className="bg-card w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
               <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
                 <h3 className="text-lg font-semibold text-foreground line-clamp-1">{selectedGuide.topic || "Study Guide"}</h3>
                 <div className="flex items-center gap-2">
                   <button onClick={() => handleDownloadPdf(selectedGuide)} className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="Download PDF">
                     <Download className="w-5 h-5" />
                   </button>
                   <button onClick={() => setSelectedGuide(null)} className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                     <X className="w-5 h-5" />
                   </button>
                 </div>
               </div>
               <div className="p-6 overflow-y-auto flex-1 prose prose-invert prose-sm max-w-none" id={`guide-content-${selectedGuide.id}`}>
                 <ReactMarkdown>{selectedGuide.content}</ReactMarkdown>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
