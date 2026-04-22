"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLatestReport } from "@/lib/api";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Activity, Target, ShieldCheck, Flame, ArrowUpRight, CheckCircle2, ChevronLeft, BrainCircuit } from "lucide-react";
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

  const handleLogout = () => {
    localStorage.removeItem("session_id");
    router.push("/");
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((extractedScore || 0) / 100) * circumference;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <Navbar candidateName={candidateName} onLogout={handleLogout} />
      
      <div style={{ flex: 1, width: "100%", maxWidth: "1280px", margin: "0 auto", padding: "48px 24px" }}>
        <Link href="/dashboard" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-secondary)",
          textDecoration: "none",
          marginBottom: 32,
          fontSize: 14,
          fontWeight: 500,
        }}>
          <ChevronLeft size={16} /> Dashboard
        </Link>

        <div style={{ marginBottom: 48 }}>
          <h1 style={{
            fontSize: 40,
            fontWeight: 700,
            marginBottom: 8,
            color: "var(--text-primary)",
          }}>
            Performance <span className="glow-text">Analytics</span>
          </h1>
          <p style={{
            fontSize: 16,
            color: "var(--text-secondary)",
          }}>
            Your interview readiness score and skill progression across key dimensions.
          </p>
        </div>

        {loading ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
          }}>
            <div className="animate-spin" style={{
              width: 48,
              height: 48,
              border: "3px solid var(--bg-tertiary)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              marginBottom: 24,
            }}></div>
            <div style={{ color: "var(--text-muted)" }}>Loading analytics...</div>
          </div>
        ) : !report && chartData.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{
              width: 72,
              height: 72,
              background: "var(--bg-secondary)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: "var(--text-muted)",
            }}>
              <Activity size={32} />
            </div>
            <h2 style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 12,
              color: "var(--text-primary)",
            }}>No Data Yet</h2>
            <p style={{
              color: "var(--text-secondary)",
              maxWidth: 400,
              margin: "0 auto 32px",
              fontSize: 15,
              lineHeight: 1.6,
            }}>
              Complete a mock interview to see your performance analytics and skill breakdown.
            </p>
            <Link href="/mock-interview">
              <button className="btn-primary" style={{
                padding: "11px 24px",
                fontSize: 15,
              }}>
                Start Interview
              </button>
            </Link>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: 32,
          }}>
            
            {/* Analytics Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Overall Score */}
              <div className="card" style={{
                padding: 32,
                textAlign: "center",
              }}>
                <h3 style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 20,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}>
                  <Target size={14} color="var(--accent)" /> Readiness Score
                </h3>
                
                <div style={{
                  position: "relative",
                  width: 160,
                  height: 160,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}>
                  <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r={radius} fill="transparent" stroke="var(--bg-tertiary)" strokeWidth="8" />
                    <circle 
                      cx="70" cy="70" r={radius} 
                      fill="transparent" 
                      stroke="var(--accent)"
                      strokeWidth="8" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={strokeDashoffset} 
                      strokeLinecap="round"
                      style={{
                        transition: "stroke-dashoffset 1s ease-out",
                        filter: "drop-shadow(0 0 6px var(--accent-glow))"
                      }}
                    />
                  </svg>
                  <div style={{
                    position: "absolute",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{
                      fontSize: 36,
                      fontWeight: 700,
                      color: "var(--accent)",
                      fontFamily: "'Outfit', sans-serif",
                    }}>{extractedScore || "--"}</span>
                    <span style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      fontWeight: 700,
                      marginTop: 2,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}>out of 100</span>
                  </div>
                </div>
                
                <div style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 16,
                }}>
                  <ShieldCheck color="var(--accent)" size={18} />
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={{
                      color: "var(--text-primary)",
                      fontSize: 13,
                      fontWeight: 700,
                    }}>
                      {extractedScore >= 75 ? "Hire Ready" : extractedScore >= 50 ? "Developing" : "In Progress"}
                    </div>
                    <div style={{
                      color: "var(--text-muted)",
                      fontSize: 11,
                      fontWeight: 500,
                    }}>
                      Based on latest eval
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Skill Matrix */}
              {chartData.length > 0 && (
                <div className="card" style={{ padding: 20, height: 340 }}>
                  <h3 style={{
                    color: "var(--text-primary)",
                    fontWeight: 700,
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.3px",
                  }}>
                    <BrainCircuit size={14} color="var(--accent)" /> Skill Matrix
                  </h3>
                  <div style={{ width: "100%", height: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={chartData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Score"
                          dataKey="A"
                          stroke="var(--accent)"
                          fill="var(--accent)"
                          fillOpacity={0.25}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                          }}
                          itemStyle={{ color: 'var(--accent)', fontSize: '12px' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: 20 }}>
                <h3 style={{
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}>
                  <Flame size={14} color="var(--warning)" /> Momentum
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: "rgba(217, 119, 6, 0.1)",
                    border: "1px solid rgba(217, 119, 6, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--warning)",
                    }}>1</span>
                  </div>
                  <div>
                    <div style={{
                      color: "var(--text-primary)",
                      fontWeight: 700,
                      fontSize: 13,
                    }}>Active Day</div>
                    <div style={{
                      color: "var(--text-muted)",
                      fontSize: 12,
                    }}>Keep it going!</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Column */}
            <div>
              {report ? (
                <div className="card" style={{ padding: 32 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 20,
                    marginBottom: 24,
                  }}>
                    <div>
                      <h2 style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginBottom: 6,
                      }}>Interview Report</h2>
                      <p style={{
                        fontSize: 12,
                        color: "var(--success)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontWeight: 500,
                      }}>
                        <CheckCircle2 size={13} /> System Verified
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        color: "var(--text-muted)",
                        fontSize: 11,
                        fontWeight: 600,
                        marginBottom: 2,
                        textTransform: "uppercase",
                      }}>Generated</div>
                      <div style={{
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        fontWeight: 500,
                      }}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="prose-dark">
                    <ReactMarkdown>{report.content}</ReactMarkdown>
                  </div>
                  
                  <div style={{
                    marginTop: 32,
                    paddingTop: 24,
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}>
                    <Link href="/mock-interview">
                      <button className="btn-secondary" style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 14,
                        padding: "10px 18px",
                      }}>
                        Retake Interview <ArrowUpRight size={14} />
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="card" style={{
                  padding: 40,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 400,
                }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    background: "var(--bg-secondary)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                    color: "var(--text-muted)",
                  }}>
                    <BrainCircuit size={28} />
                  </div>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 8,
                  }}>Report Pending</h3>
                  <p style={{
                    color: "var(--text-secondary)",
                    maxWidth: 300,
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}>
                    Complete a mock interview session to generate your detailed performance report.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
