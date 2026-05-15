// client/pages/Documents.tsx
import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Eye, Sparkles, Clock, Bot, Database, Sliders,
  GitBranch, Network, UserCheck, BookOpen, Loader2, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getCaseStudyHistory } from "@/lib/api";
import { DocumentViewer } from "@/components/DocumentViewer";

// ── Topic → icon/color ────────────────────────────────────────────────────────
const TOPIC_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  "Agentic AI Case Study":    { icon: <Bot className="w-5 h-5" />, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  "RAG Case Study":           { icon: <Database className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  "Fine-tuning Case Study":   { icon: <Sliders className="w-5 h-5" />, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/30" },
  "MLOps Case Study":         { icon: <GitBranch className="w-5 h-5" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  "System Design Case Study": { icon: <Network className="w-5 h-5" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  "Introduction Template":    { icon: <UserCheck className="w-5 h-5" />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
};

function getTopicMeta(topic: string) {
  return TOPIC_META[topic] ?? {
    icon: <BookOpen className="w-5 h-5" />,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
  };
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Document {
  id: number;
  topic: string;
  content: string;
  created_at: string | null;
}

// ── Document Card ─────────────────────────────────────────────────────────────
function DocCard({ doc, onView }: { doc: Document; onView: (doc: Document) => void }) {
  const meta = getTopicMeta(doc.topic);
  const preview = doc.content?.slice(0, 160).replace(/[#*`]/g, "").trim() + "...";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="glass-card p-5 rounded-2xl border border-border/50 hover:border-border transition-all duration-200 flex flex-col gap-4 group shadow-sm hover:shadow-lg"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg} ${meta.color}`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm leading-tight truncate">{doc.topic}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDate(doc.created_at)}
          </div>
        </div>
      </div>

      {/* Preview */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{preview}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => onView(doc)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-semibold transition-colors border border-primary/20"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground text-sm font-semibold transition-colors border border-border/50"
          onClick={() => alert("Improve with AI — coming soon!")}
        >
          <Sparkles className="w-3.5 h-3.5" /> Improve
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Documents() {
  const { sessionId } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);

  const loadDocs = () => {
    if (!sessionId) { setLoading(false); return; }
    setLoading(true);
    getCaseStudyHistory(sessionId)
      .then((d) => setDocs(d.case_studies || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDocs(); }, [sessionId]);

  return (
    <MainLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground">Documents</h2>
                <p className="text-muted-foreground text-sm">Your AI-generated case studies and preparation materials</p>
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={loadDocs}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </motion.button>
        </div>

        {/* Stats row */}
        {docs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Documents", value: docs.length },
              { label: "Case Studies", value: docs.filter(d => d.topic.includes("Case Study")).length },
              { label: "Templates", value: docs.filter(d => d.topic.includes("Template")).length },
              { label: "Last Generated", value: docs[0]?.created_at ? formatDate(docs[0].created_at) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="glass-card p-4 rounded-xl border border-border/50 text-center space-y-1">
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-muted-foreground text-sm">Loading documents...</p>
            </div>
          </div>
        ) : docs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 rounded-2xl border border-border/50 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-border/50 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No documents yet</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                Evaluate your project in <strong>Project Preparation</strong>, then generate case studies — they'll appear here automatically.
              </p>
            </div>
            <motion.a
              href="/preparation"
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-semibold text-sm border border-primary/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Go to Project Preparation
            </motion.a>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {docs.map((doc, i) => (
                <motion.div key={doc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <DocCard doc={doc} onView={setViewDoc} />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </motion.div>

      {/* Document Viewer */}
      <DocumentViewer
        isOpen={!!viewDoc}
        title={viewDoc?.topic ?? ""}
        content={viewDoc?.content ?? ""}
        onClose={() => setViewDoc(null)}
      />
    </MainLayout>
  );
}
