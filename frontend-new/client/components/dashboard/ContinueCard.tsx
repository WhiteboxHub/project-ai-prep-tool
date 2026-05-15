import React from "react";
import { ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface ContinueCardProps {
  title: string;
  description: string;
  progress: number;
  timeRemaining: string;
  href: string;
}

export function ContinueCard({
  title,
  description,
  progress,
  timeRemaining,
  href,
}: ContinueCardProps) {
  return (
    <Link to={href}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="glass-card-hover p-6 h-full rounded-2xl border border-border/50 overflow-hidden relative group cursor-pointer"
      >
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 smooth-transition -z-10" />

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <motion.div
              className="p-2 rounded-lg bg-primary/20 text-primary"
              whileHover={{ rotate: 45 }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-primary font-semibold">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-4 h-4" />
              {timeRemaining}
            </div>
            <span className="text-xs font-semibold text-primary">Continue →</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
