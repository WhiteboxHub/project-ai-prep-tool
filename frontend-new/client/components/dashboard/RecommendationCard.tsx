import React from "react";
import { ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface RecommendationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  href: string;
}

export function RecommendationCard({
  icon,
  title,
  description,
  category,
  difficulty,
  href,
}: RecommendationCardProps) {
  const difficultyColor = {
    beginner: "bg-green-500/20 text-green-300 border-green-500/30",
    intermediate: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    advanced: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <Link to={href}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="glass-card-hover p-6 rounded-2xl border border-border/50 h-full flex flex-col group cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <motion.div
            className="p-3 rounded-xl bg-primary/20"
            whileHover={{ rotate: 12, scale: 1.1 }}
          >
            {icon}
          </motion.div>
          <Star className="w-5 h-5 text-amber-400 group-hover:scale-110 smooth-transition" />
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 flex-1">{description}</p>

        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{category}</span>
            <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${difficultyColor[difficulty]}`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
          </div>
          <motion.button
            whileHover={{ x: 4 }}
            className="w-full text-center py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 smooth-transition text-sm font-medium flex items-center justify-center gap-2"
          >
            Start Now <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </Link>
  );
}
