import React, { useState } from "react";
import { submitProject, generateTypedCaseStudy, saveProjectBrief } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { FileText, Sparkles, Save, CheckCircle2, AlertCircle } from "lucide-react";

interface ProjectFormProps {
  onSuccess?: () => void;
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const { sessionId } = useAuth();
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      setStatusMessage({ type: "error", text: "Session required" });
      return;
    }
    if (!projectTitle.trim() || !projectDescription.trim()) {
      setStatusMessage({ type: "error", text: "Project title and description are required." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      await submitProject({
        session_id: sessionId,
        title: projectTitle,
        description: projectDescription,
        tech_stack: techStack,
      });
      await saveProjectBrief(sessionId, `${projectTitle}: ${projectDescription}`);
      setStatusMessage({ type: "success", text: "Project context saved successfully!" });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to save project context." });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateCaseStudy = async (caseType: string) => {
    if (!sessionId) {
      setStatusMessage({ type: "error", text: "Session required" });
      return;
    }
    setGenerating(true);
    setStatusMessage(null);
    try {
      const res = await generateTypedCaseStudy(sessionId, caseType);
      setStatusMessage({
        type: "success",
        text: `Generated ${caseType} successfully!`,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to generate case study." });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl border border-border/50 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-border/30 pb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Project Context & Case Study</h2>
          <p className="text-sm text-muted-foreground">Provide details about your main technical project.</p>
        </div>
      </div>

      {statusMessage && (
        <div
          aria-live="polite"
          className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${
            statusMessage.type === "success"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="project-title" className="block text-sm font-semibold text-foreground mb-1">
            Project Title
          </label>
          <input
            id="project-title"
            type="text"
            placeholder="e.g. Distributed Real-time Analytics Platform"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="tech-stack" className="block text-sm font-semibold text-foreground mb-1">
            Tech Stack / Architecture
          </label>
          <input
            id="tech-stack"
            type="text"
            placeholder="e.g. Python, PyTorch, Kafka, PostgreSQL, Kubernetes"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="project-description" className="block text-sm font-semibold text-foreground mb-1">
            Project Overview & Impact
          </label>
          <textarea
            id="project-description"
            rows={4}
            placeholder="Describe technical challenges, your contributions, and measurable results..."
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Project Context"}
          </button>
        </div>
      </form>

      <div className="pt-4 border-t border-border/30 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Generate Case Study</h3>
        <p className="text-xs text-muted-foreground">
          Generate an in-depth architectural case study based on your saved project context.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerateCaseStudy("Agentic AI Case Study")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Agentic AI Case Study
          </button>
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerateCaseStudy("RAG Case Study")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            RAG Case Study
          </button>
          <button
            type="button"
            disabled={generating}
            onClick={() => handleGenerateCaseStudy("MLOps Case Study")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            MLOps Case Study
          </button>
        </div>
      </div>
    </div>
  );
}
