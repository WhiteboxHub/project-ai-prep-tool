// client/pages/CoderpadAssessment.tsx
// CoderPad Assessment — embeds WBL CoderPad inside the AI Prep Tool.
// Since candidates are already authenticated via WBL, the iframe session is shared.

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Terminal, ExternalLink, ChevronLeft, Maximize2,
  Minimize2, RefreshCw, Code2, Zap, BookOpen,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/lib/AuthContext";

const WBL_CODERPAD_URL =
  (import.meta as any).env?.VITE_WBL_CODERPAD_URL ||
  "https://whitebox-learning.com/coderpad";

export default function CoderpadAssessment() {
  const navigate = useNavigate();
  const { candidateName } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // increment to refresh

  const tips = [
    { icon: <Code2 className="w-4 h-4 text-primary" />, text: "Use Python, JavaScript, or Java — all are supported" },
    { icon: <Zap className="w-4 h-4 text-amber-400" />, text: "Read the problem constraints carefully before writing code" },
    { icon: <BookOpen className="w-4 h-4 text-emerald-400" />, text: "Test with edge cases — empty inputs, large numbers" },
  ];

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              title="Back to Dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                <Terminal className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">CoderPad Assessment</h2>
                <p className="text-xs text-muted-foreground">
                  Live coding practice powered by WBL CoderPad
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={() => setIframeKey(k => k + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-white/5 text-xs transition-colors"
              title="Reload CoderPad"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </button>

            {/* Open in new tab */}
            <a
              href={WBL_CODERPAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-white/5 text-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Tab
            </a>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(f => !f)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs font-semibold transition-colors"
            >
              {isFullscreen ? (
                <><Minimize2 className="w-3.5 h-3.5" /> Exit Fullscreen</>
              ) : (
                <><Maximize2 className="w-3.5 h-3.5" /> Fullscreen</>
              )}
            </button>
          </div>
        </motion.div>

        {/* ── Tips bar (hidden in fullscreen) ────────────────────────────── */}
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-border/40 text-xs text-muted-foreground"
              >
                {tip.icon}
                <span>{tip.text}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── CoderPad iframe ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className={`relative rounded-xl overflow-hidden border border-border/50 bg-card shadow-[0_0_40px_rgba(0,0,0,0.4)] ${
            isFullscreen
              ? "fixed inset-0 z-50 rounded-none border-0 m-0"
              : "w-full"
          }`}
          style={{ height: isFullscreen ? "100vh" : "calc(100vh - 220px)", minHeight: 520 }}
        >
          {/* Gradient header bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-primary z-10" />

          <iframe
            key={iframeKey}
            src={WBL_CODERPAD_URL}
            title="WBL CoderPad Assessment"
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />

          {/* Fullscreen close button overlay */}
          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          )}
        </motion.div>

        {/* ── Status bar (hidden in fullscreen) ──────────────────────────── */}
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex items-center justify-between text-xs text-muted-foreground px-1"
          >
            <span>
              Logged in as{" "}
              <span className="text-foreground font-semibold">{candidateName}</span>{" "}
              · Powered by WBL CoderPad
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
