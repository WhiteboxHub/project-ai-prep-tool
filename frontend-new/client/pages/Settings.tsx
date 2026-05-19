import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { Shield, Key, Bell, CreditCard, LogOut, CheckCircle2, AlertCircle, Plus, Trash2, Upload, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { clearSession } from "@/lib/auth";
import { getResumeSummary, deleteLlmKey, validateApiKey, uploadResume, getExtractionStatus } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { candidateName, sessionId, refresh } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "notifications">("security");
  
  // State
  const [keys, setKeys] = useState<any[]>([]);
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Add key state
  const [addingKey, setAddingKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [provider, setProvider] = useState("openai");
  
  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<"idle" | "pending" | "completed" | "failed">("idle");

  const loadSettings = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const summary = await getResumeSummary(sessionId);
      setKeys(summary.llm_keys || []);
      setResumeText(summary.resume_text || "");
    } catch (e: any) {
      setError(e.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, [sessionId]);

  const handleLogout = () => {
    clearSession();
    navigate("/setup");
  };

  const handleDeleteKey = async (keyId: number) => {
    if (!sessionId) return;
    try {
      await deleteLlmKey(keyId, sessionId);
      await loadSettings();
    } catch (e: any) {
      setError(e.message || "Failed to delete key.");
    }
  };

  const handleAddKey = async () => {
    if (!sessionId || !newKey.trim()) return;
    setAddingKey(true);
    setError("");
    try {
      await validateApiKey({
        session_id: sessionId,
        api_key: newKey.trim(),
        api_provider: provider,
        model_name: "gpt-4o",
      });
      setNewKey("");
      await loadSettings();
    } catch (e: any) {
      setError(e.message || "Failed to add key.");
    } finally {
      setAddingKey(false);
    }
  };

  const handleUploadResume = async () => {
    if (!sessionId || !resumeFile) return;
    setUploadingResume(true);
    setError("");
    try {
      await uploadResume(sessionId, resumeFile);
      setExtractionStatus("pending");
      
      const interval = setInterval(async () => {
        try {
          const { status } = await getExtractionStatus(sessionId);
          if (status === "completed") {
            setExtractionStatus("completed");
            clearInterval(interval);
            setResumeFile(null);
            setUploadingResume(false);
            await loadSettings();
            setTimeout(() => setExtractionStatus("idle"), 3000);
          } else if (status === "failed") {
            setExtractionStatus("failed");
            clearInterval(interval);
            setUploadingResume(false);
            setError("Resume extraction failed.");
          }
        } catch {}
      }, 2000);
    } catch (e: any) {
      setError(e.message || "Failed to upload resume.");
      setUploadingResume(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: Shield },
    { id: "security", label: "API Keys & AI Models", icon: Key },
    { id: "notifications", label: "Notifications", icon: Bell },
  ] as const;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground">Manage your account, resume, and API keys</p>
        </motion.div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-64 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? "bg-primary/20 text-primary border border-primary/30" : "bg-transparent text-muted-foreground hover:bg-white/5 border border-transparent"}`}>
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
            <div className="pt-4 mt-4 border-t border-border/50">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Candidate Information</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-muted-foreground block mb-1">Full Name</label>
                          <input type="text" value={candidateName} disabled className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-border text-foreground text-sm opacity-70 cursor-not-allowed" />
                          <p className="text-xs text-muted-foreground mt-2">Name is synced from your WBL account.</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Connected Resume</h3>
                      
                      {resumeText ? (
                        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Resume parsed and active</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resumeText.substring(0, 150)}...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">No resume connected</p>
                            <p className="text-xs text-muted-foreground mt-1">Upload a JSON resume to get started.</p>
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <label className="text-sm text-foreground font-semibold block mb-2">Upload New Resume (JSON)</label>
                        <div className="flex items-center gap-2">
                          <input type="file" accept=".json" onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                            className="flex-1 text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30" />
                          <button onClick={handleUploadResume} disabled={!resumeFile || uploadingResume || extractionStatus === "pending"}
                            className="px-4 py-2 rounded-lg bg-primary text-white font-semibold flex items-center gap-2 disabled:opacity-50">
                            {uploadingResume || extractionStatus === "pending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
                          </button>
                        </div>
                        {extractionStatus === "completed" && <p className="text-xs text-green-400 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Successfully extracted!</p>}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">Your API Keys</h3>
                      </div>
                      
                      {keys.length === 0 ? (
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                          <p className="text-sm text-foreground">No API keys configured. You must add one to use the AI features.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {keys.map((k) => (
                                <div key={k.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                                              <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-primary/20 text-primary"><Key className="w-4 h-4" /></div>
                                                <div>
                                                  <p className="text-sm font-semibold text-foreground uppercase">{k.provider_name || k.provider || "Unknown"}</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    {k.model_name ? `Model: ${k.model_name}` : ""}
                                                    {k.created_at ? ` · Added on ${new Date(k.created_at).toLocaleDateString()}` : " · Active"}
                                                  </p>
                                                </div>
                                              </div>
                              <button onClick={() => handleDeleteKey(k.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-4 border-t border-border/50">
                        <h4 className="text-sm font-semibold text-foreground mb-3">Add New Key</h4>
                        <div className="flex items-center gap-2">
                          <select value={provider} onChange={(e) => setProvider(e.target.value)}
                            className="w-1/3 px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground text-sm focus:border-primary outline-none">
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                          </select>
                          <input type="password" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="sk-..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-border text-foreground text-sm placeholder-muted-foreground focus:border-primary outline-none" />
                          <button onClick={handleAddKey} disabled={addingKey || !newKey.trim()}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold flex items-center gap-2 disabled:opacity-50">
                            {addingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="glass-card p-6 rounded-2xl border border-border/50">
                     <h3 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
                     <p className="text-sm text-muted-foreground">Notification settings are managed via your main WBL profile.</p>
                  </div>
                )}

              </motion.div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
