"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLatestReport } from "@/lib/api";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Activity, Target, ShieldCheck, Flame, ExternalLink, ArrowUpRight, CheckCircle2, ChevronLeft, BrainCircuit } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip 
} from "recharts";

export default function ProgressPage() {
  const router = useRouter();
  const [candidateName, setCandidateName] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [extractedScore, setExtractedScore] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const sid = localStorage.getItem("session_id");
    if (!sid) { router.push("/setup"); return; }
    
    setCandidateName(localStorage.getItem("candidate_name") || "Candidate");

    getLatestReport(sid).then(data => {
        if(data) {
            if (data.content) {
                setReport(data);
                // Parse overall score if available
                const scoreMatch = data.content.match(/Overall Score:\*\*\s*(?:\[)?(\d+)/i) || data.content.match(/\*\*Overall Score:\*\*\s*(\d+)/i);
                if(scoreMatch && scoreMatch[1]) {
                    setExtractedScore(parseInt(scoreMatch[1], 10));
                }
            }

            if (data.analytics) {
                const formatted = [
                    { subject: 'Technical', A: data.analytics.technical_correctness, fullMark: 100 },
                    { subject: 'Depth', A: data.analytics.depth_of_knowledge, fullMark: 100 },
                    { subject: 'Clarity', A: data.analytics.clarity, fullMark: 100 },
                    { subject: 'Comm.', A: data.analytics.communication, fullMark: 100 },
                    { subject: 'Confidence', A: data.analytics.confidence, fullMark: 100 },
                    { subject: 'Structure', A: data.analytics.structure, fullMark: 100 },
                ];
                setChartData(formatted);
            }
        }
    }).catch(err => {
        console.error("Failed to load report", err);
    }).finally(() => {
        setLoading(false);
    });
  }, [router]);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((extractedScore || 0) / 100) * circumference;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      <Navbar candidateName={candidateName} onLogout={() => { localStorage.clear(); router.push("/"); }} />
      
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-12">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 font-medium">
            <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
            <div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Analytics</span></h1>
                <p className="text-white/60 text-lg">Your historical interview skill trajectory and readiness.</p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-white/80 font-medium text-sm">System Live</span>
            </div>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-32">
                <div className="w-12 h-12 border-4 border-white/10 border-t-emerald-400 rounded-full animate-spin mb-4" />
                <div className="text-white/50">Computing skill trajectory...</div>
            </div>
        ) : !report && chartData.length === 0 ? (
            <div className="bg-[#0f111a] border border-white/10 rounded-3xl p-12 text-center shadow-xl">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-white/30">
                    <Activity size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">No Mock Session Data</h2>
                <p className="text-white/50 max-w-md mx-auto mb-8">
                  It seems you haven't completed any mock interview modules yet. 
                  Data is required under "Take Mock" to generate your performance profile.
                </p>
                <Link href="/interview">
                    <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 px-10 rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95">
                        Start Mock Interview
                    </button>
                </Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Analytics Column */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    {/* Overall Score */}
                    <div className="bg-[#0a0f16] border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-[0_20px_60px_rgba(16,185,129,0.1)]">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                        <h3 className="text-white/70 font-semibold mb-8 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Target size={14} className="text-emerald-400" /> Readiness Score
                        </h3>
                        
                        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
                                <circle cx="70" cy="70" r={radius} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                <circle 
                                    cx="70" cy="70" r={radius} 
                                    fill="transparent" 
                                    stroke="url(#emeraldGradient)" 
                                    strokeWidth="8" 
                                    strokeDasharray={circumference} 
                                    strokeDashoffset={strokeDashoffset} 
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                />
                                <defs>
                                    <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#34d399" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/70">{extractedScore || "--"}</span>
                                <span className="text-white/40 text-[10px] font-bold mt-1 uppercase tracking-tighter">Aggregated</span>
                            </div>
                        </div>
                        
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 w-full">
                            <ShieldCheck className="text-cyan-400" size={20} />
                            <div className="text-left w-full">
                                <div className="text-white/90 text-sm font-bold">Status: {extractedScore >= 75 ? "Hire Ready" : "Learning"}</div>
                                <div className="text-white/40 text-[10px] uppercase font-bold">Based on latest eval</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Dimension Chart */}
                    <div className="bg-[#0f111a] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden h-[340px]">
                        <h3 className="text-white/90 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                           <BrainCircuit size={16} className="text-cyan-400" /> Skill Matrix
                        </h3>
                        {chartData.length > 0 ? (
                           <div className="w-full h-full -mt-4">
                             <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Candidate"
                                        dataKey="A"
                                        stroke="#10b981"
                                        fill="#10b981"
                                        fillOpacity={0.4}
                                    />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                      itemStyle={{ color: '#10b981', fontSize: '12px' }}
                                    />
                                </RadarChart>
                             </ResponsiveContainer>
                           </div>
                        ) : (
                           <div className="h-full flex items-center justify-center text-white/20 text-xs italic">
                              Collecting dimensional data...
                           </div>
                        )}
                    </div>

                    <div className="bg-[#0f111a] border border-white/10 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-white/90 font-bold mb-4 flex items-center gap-2 text-sm uppercase">
                           <Flame size={16} className="text-orange-500" /> Momentum
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/30 flex items-center justify-center">
                                <span className="text-xl font-black text-orange-400">1</span>
                            </div>
                            <div>
                                <div className="text-white font-bold text-sm">Active Day</div>
                                <div className="text-white/40 text-xs tracking-tight">Keep the streak alive!</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Column */}
                <div className="lg:col-span-2">
                    {report ? (
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 lg:p-12 shadow-2xl backdrop-blur-md relative h-full">
                          <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
                              <div>
                                  <h2 className="text-2xl font-bold text-white mb-2">Final AI Performance Report</h2>
                                  <p className="text-sm text-cyan-400 flex items-center gap-2 font-mono">
                                      <CheckCircle2 size={14} /> System Verified Execution
                                  </p>
                              </div>
                              <div className="text-right">
                                  <div className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Generated</div>
                                  <div className="text-white/80 text-xs font-mono">{new Date(report.created_at).toLocaleDateString()}</div>
                              </div>
                          </div>

                          <div className="prose prose-invert max-w-none prose-headings:text-white/90 prose-h2:text-xl prose-h2:mb-4 prose-p:text-white/70 prose-p:leading-relaxed prose-li:text-white/70 prose-strong:text-cyan-400">
                              <ReactMarkdown>{report.content}</ReactMarkdown>
                          </div>
                          
                          <div className="mt-12 pt-8 border-t border-white/10 flex justify-end">
                              <Link href="/interview">
                                  <button className="flex items-center gap-2 text-sm font-bold text-white bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl transition-colors">
                                      Retake Simulator <ArrowUpRight size={16} />
                                  </button>
                              </Link>
                          </div>
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-12 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center text-center h-full min-h-[500px]">
                         <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-white/20">
                            <BrainCircuit size={32} />
                         </div>
                         <h3 className="text-xl font-bold text-white mb-2">Report Pending</h3>
                         <p className="text-white/40 max-w-sm">Complete your mock interview modules to generate the full AI-powered readiness report.</p>
                      </div>
                    )}
                </div>

            </div>
        )}
      </div>
    </div>
  );
}
