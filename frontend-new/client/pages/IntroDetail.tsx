import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { getIntroAttempt } from "@/lib/api";
import { getRecording } from "@/lib/indexedDB";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, CheckCircle2, Target, Lightbulb, TrendingUp } from "lucide-react";

export default function IntroDetail() {
  const { id } = useParams<{ id: string }>();
  const { sessionId } = useAuth();
  const location = useLocation();
  const isFromHistory = location.pathname.startsWith("/history/");
  const backPath = isFromHistory ? "/history" : "/intro-select#previous-attempts-section";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [isLocalVideo, setIsLocalVideo] = useState(false);

  const handleBack = (e: React.MouseEvent) => {
    // If the page has an opener or was opened as a single history entry in a new tab, close it
    if (window.opener || window.history.length === 1) {
      e.preventDefault();
      window.close();
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!sessionId || !id) return;
    
    setLoading(true);
    getIntroAttempt(sessionId, Number(id))
      .then(async (resData: any) => {
        const attemptData = resData.attempt || resData;
        setData(attemptData);
        if (attemptData.video_url) {
          if (attemptData.video_url.startsWith("local:")) {
            const localId = attemptData.video_url.replace("local:", "");
            const blob = await getRecording(localId);
            if (blob) {
              setVideoSrc(URL.createObjectURL(blob));
              setIsLocalVideo(true);
            }
          } else {
            setVideoSrc(attemptData.video_url);
            setIsLocalVideo(false);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load evaluation details.");
      })
      .finally(() => setLoading(false));

    return () => {
      if (isLocalVideo && videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [sessionId, id]);

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-red-400">{error || "Data not found"}</p>
          <Link to={backPath} onClick={handleBack} className="px-4 py-2 bg-primary/20 text-primary rounded-xl font-bold">
            Back to History
          </Link>
        </div>
      </MainLayout>
    );
  }

  const parsedFeed = typeof data.feedback === "string" ? JSON.parse(data.feedback) : (data.feedback || {});
  const innerFeedback = parsedFeed.feedback || parsedFeed;
  const parsedResp = typeof data.raw_response === "string" ? JSON.parse(data.raw_response) : (data.raw_response || {});
  
  const strengths = innerFeedback.strengths || parsedFeed.strengths || parsedResp.strengths || parsedResp.evaluation?.strengths || [];
  const suggestions = innerFeedback.ai_suggestions || parsedFeed.ai_suggestions || parsedResp.evaluation?.ai_suggestions || [];
  
  const techGapsRaw = innerFeedback.technical_gaps || parsedFeed.technical_gaps || parsedResp.technical_gaps || parsedResp.evaluation?.technical_gaps;
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
  const commNotesRaw = innerFeedback.communication_notes || parsedFeed.communication_notes || parsedResp.communication_notes || parsedResp.evaluation?.communication_notes || [];
  const commNotesList = Array.isArray(commNotesRaw) ? commNotesRaw : [];
  const legacyWeak = innerFeedback.improvement_areas || parsedFeed.improvement_areas || innerFeedback.weaknesses || parsedFeed.weaknesses || parsedResp.improvement_areas || parsedResp.weaknesses || parsedResp.evaluation?.weaknesses || parsedResp.evaluation?.improvement_areas || [];
  
  const weaknesses = [...legacyWeak, ...techGapsList, ...commNotesList];
  const dimensions = innerFeedback.scores || parsedFeed.scores || parsedResp.raw_response?.scores || parsedResp.evaluation?.scores || {};
  const hasPassed = data.score >= 75;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background p-6 md:p-8 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-6">
          
          {/* Header & Back Navigation */}
          <div className="flex items-center justify-between">
            <Link to={backPath} onClick={handleBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold text-sm">Back to History</span>
            </Link>
          </div>

          {/* Corrections Pipeline Answer Sheet */}
          {innerFeedback.corrections && Array.isArray(innerFeedback.corrections) && innerFeedback.corrections.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-4 bg-card/10">
              <div className="flex items-center justify-between pb-3 border-b border-border/10">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Pipeline Verification & Corrections
                </h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {innerFeedback.corrections.map((item: any, i: number) => {
                  const verdict = item.verdict?.toLowerCase();
                  const isCorrect = verdict === "correct";
                  const isPartial = verdict === "partial";
                  const isMissing = verdict === "missing";
                  
                  let badgeColor = "bg-green-500/10 text-green-400 border-green-500/20";
                  let icon = "✓";
                  if (isPartial) {
                    badgeColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                    icon = "△";
                  } else if (isMissing) {
                    badgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
                    icon = "✗";
                  }

                  return (
                    <div key={i} className="flex gap-4 p-4 bg-card/20 rounded-xl border border-border/30 hover:border-border transition-colors">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${badgeColor}`}>
                        {icon}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-foreground">{item.topic}</h4>
                          {item.pipeline_stage && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-medium">
                              {item.pipeline_stage}
                            </span>
                          )}
                          {item.priority === "must_have" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase font-bold tracking-wider">
                              Must Have
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.note}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* YouTube-like Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Main Column: Video Player & Description Box (Transcript) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Video Player */}
              <div className="aspect-video bg-black/95 rounded-2xl overflow-hidden shadow-xl border border-border/20">
                {videoSrc ? (
                  isLocalVideo ? (
                    <video src={videoSrc} controls autoPlay className="w-full h-full object-contain" />
                  ) : getYouTubeId(videoSrc) ? (
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${getYouTubeId(videoSrc)}?autoplay=1`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video src={`${import.meta.env.VITE_API_URL || ""}${videoSrc}`} controls autoPlay className="w-full h-full object-contain" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-muted-foreground">Video not available</p>
                  </div>
                )}
              </div>

              {/* Title & Metadata (Under Video) */}
              <div>
                <h1 className="text-2xl font-bold text-foreground leading-tight">
                  {data.type?.replace(/_/g, " ").toUpperCase()} PRACTICE ATTEMPT
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Recorded on {new Date(data.created_at).toLocaleString()}
                </p>
              </div>

              {/* Description Box containing Overall Score summary & Transcript */}
              <div className="bg-card/40 border border-border/30 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-border/30">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${hasPassed ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30"}`}>
                      {hasPassed ? <><CheckCircle2 className="w-3.5 h-3.5" /> Passed</> : <><Target className="w-3.5 h-3.5" /> Needs Work</>}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      Score: {data.score}/100
                    </span>
                  </div>
                </div>

                {parsedResp.transcript && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">Transcript</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                      {parsedResp.transcript}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Right Sidebar Column: Evaluation Breakdown, Strengths, Improvement, Suggestions */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Score Breakdown (YouTube List Item Style) */}
              {Object.keys(dimensions).length > 0 && (
                <div className="bg-card/20 p-5 rounded-2xl border border-border/30 space-y-4">
                  <h3 className="font-bold text-sm text-foreground">Performance Breakdown</h3>
                  <div className="space-y-3.5">
                    {Object.entries(dimensions).map(([key, val]: [string, any]) => (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
                          <span className="text-foreground">{val}%</span>
                        </div>
                        <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${val >= 75 ? "from-green-500 to-emerald-400" : "from-amber-500 to-orange-400"}`} 
                            style={{ width: `${val}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths List */}
              {strengths.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {strengths.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed bg-green-500/5 p-2.5 rounded-xl border border-green-500/10">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements List */}
              {weaknesses.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/30">
                  <h3 className="font-bold text-sm text-amber-500 flex items-center gap-1.5">
                    <Target className="w-4 h-4" /> Improvement Areas
                  </h3>
                  <ul className="space-y-2">
                    {Array.from(new Set(weaknesses)).map((w: any, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Suggestions List */}
              {suggestions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border/30">
                  <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4" /> AI Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {suggestions.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed bg-primary/5 p-3 rounded-xl border border-primary/20">
                        <TrendingUp className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>
    </MainLayout>
  );
}
