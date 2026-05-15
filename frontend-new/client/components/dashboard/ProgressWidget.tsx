import React from "react";
import { motion } from "framer-motion";
import { CircularProgress } from "@/components/ui/circular-progress";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface ProgressWidgetProps {
  percentage: number;
  title: string;
}

export function ProgressWidget({ percentage, title }: ProgressWidgetProps) {
  const getColor = (percent: number) => {
    if (percent >= 80) return "from-green-500 to-emerald-500";
    if (percent >= 60) return "from-blue-500 to-cyan-500";
    if (percent >= 40) return "from-yellow-500 to-amber-500";
    return "from-red-500 to-orange-500";
  };

  const getStatus = (percent: number) => {
    if (percent >= 80) return { icon: CheckCircle2, label: "Strong", color: "text-green-400" };
    if (percent >= 60) return { icon: CheckCircle2, label: "Good", color: "text-blue-400" };
    if (percent >= 40) return { icon: Clock, label: "In Progress", color: "text-yellow-400" };
    return { icon: AlertCircle, label: "Needs Work", color: "text-red-400" };
  };

  const status = getStatus(percentage);
  const StatusIcon = status.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="glass-card-hover p-8 rounded-2xl border border-border/50"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Circular Progress */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
            {/* Background Circle */}
            <circle
              cx="70"
              cy="70"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white/10"
            />
            {/* Progress Circle */}
            <motion.circle
              cx="70"
              cy="70"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 60}`}
              strokeDashoffset={`${2 * Math.PI * 60 * (1 - percentage / 100)}`}
              strokeLinecap="round"
              className={`bg-gradient-to-r ${getColor(percentage)} text-primary`}
              initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
              whileInView={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - percentage / 100) }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold text-foreground"
            >
              {percentage}%
            </motion.p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>

        {/* Title & Status */}
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className={`flex items-center gap-1 justify-center mt-2 ${status.color}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-xs font-semibold">{status.label}</span>
          </div>
        </div>

        {/* Details */}
        <div className="pt-4 space-y-2 text-xs text-muted-foreground w-full">
          <div className="flex justify-between px-3 py-1 rounded-lg bg-white/5">
            <span>Sections Completed</span>
            <span className="text-foreground font-semibold">{Math.round(percentage / 20)}/5</span>
          </div>
          <div className="flex justify-between px-3 py-1 rounded-lg bg-white/5">
            <span>Estimated Time</span>
            <span className="text-foreground font-semibold">2h 30m</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
