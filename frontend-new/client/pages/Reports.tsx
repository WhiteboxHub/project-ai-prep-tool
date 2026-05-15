import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { FileText, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { getFinalReport } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function Reports() {
  const { sessionId } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) return;
    getFinalReport(sessionId)
      .then((data) => setReport(data))
      .catch((err) => setError(err.message || "Failed to load report"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleDownload = () => {
    window.print(); // Simple PDF download via print dialog for reports
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (error || !report) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-foreground font-semibold">Report Not Available</p>
            <p className="text-sm text-muted-foreground">{error || "Complete an interview to see your report."}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const r = report;
  const introScore = r.intro_evals?.[0]?.score || r.intro_evals?.[0]?.total_score || 0;
  const projectScore = r.project_evals?.[0]?.evaluation?.overall_score ? r.project_evals[0].evaluation.overall_score * 10 : 0;
  
  const intEvals = r.interview_evals || [];
  const avgTechScore = intEvals.length > 0 
    ? Math.round(intEvals.reduce((sum: number, ev: any) => sum + ev.score, 0) / intEvals.length * 10)
    : 0;

  const gaps = new Set<string>();
  intEvals.forEach((ev: any) => {
    (ev.feedback || []).forEach((f: string) => gaps.add(f));
  });

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8 print:p-0 print:m-0 print:max-w-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Executive Report</h2>
            <p className="text-muted-foreground">Comprehensive summary of your interview performance</p>
          </motion.div>
          <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl bg-primary/20 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary/30 transition-colors">
            <Download className="w-4 h-4" /> Download PDF
          </motion.button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 rounded-3xl border border-border/50 space-y-8 print:border-none print:shadow-none print:p-0">
          
          <div className="flex items-center gap-4 pb-8 border-b border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Performance Summary</h1>
              <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
              <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Intro Score</p>
              <p className="text-4xl font-bold text-foreground">{introScore}<span className="text-lg text-muted-foreground">/100</span></p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
              <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Project Score</p>
              <p className="text-4xl font-bold text-primary">{projectScore}<span className="text-lg text-muted-foreground">/100</span></p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
              <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Technical Avg</p>
              <p className="text-4xl font-bold text-foreground">{avgTechScore}<span className="text-lg text-muted-foreground">/100</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-400" /> Candidate Profile
            </h3>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
               {r.project_evals?.[0] ? (
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div><span className="text-muted-foreground font-semibold block mb-1">Company</span><span className="text-foreground">{r.project_evals[0].company_name}</span></div>
                   <div><span className="text-muted-foreground font-semibold block mb-1">Domain</span><span className="text-foreground">{r.project_evals[0].domain}</span></div>
                   <div className="col-span-2"><span className="text-muted-foreground font-semibold block mb-1">Product Focus</span><span className="text-foreground">{r.project_evals[0].product}</span></div>
                 </div>
               ) : (
                 <p className="text-muted-foreground text-sm">Profile data not fully populated.</p>
               )}
            </div>
          </div>

          {gaps.size > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-amber-400" /> Critical Areas for Improvement
              </h3>
              <div className="space-y-2">
                {Array.from(gaps).map((gap, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <p className="text-sm text-foreground">{gap}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </MainLayout>
  );
}
