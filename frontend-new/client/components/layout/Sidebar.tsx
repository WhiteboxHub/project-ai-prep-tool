import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Lightbulb,
  Video,
  FileText,
  TrendingUp,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { clearSession } from "@/lib/auth";

const navItems = [
  { label: "Intro Practice", icon: FileText, href: "/intro-select" },
  { label: "Interview Practice", icon: Video, href: "/interview-select" },
  { label: "My History", icon: History, href: "/history" },
  { label: "Progress", icon: TrendingUp, href: "/progress" },
  // { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { candidateName, initials } = useAuth();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isHovered ? 240 : 64 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed left-0 top-0 h-screen z-50 glass-card border-r border-border bg-gradient-to-b from-card/95 to-card/75 flex flex-col shadow-2xl transition-shadow duration-300"
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-start border-b border-border/50 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
            <span className="text-xs font-bold text-white">WB</span>
          </div>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="text-sm font-bold text-foreground leading-none">WBL</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">SmartPrep</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link key={item.href} to={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative px-3 py-2.5 rounded-lg flex items-center gap-3 cursor-pointer smooth-transition overflow-hidden",
                  isActive
                    ? "bg-primary/20 text-primary glow-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  isHovered ? "justify-start" : "justify-center"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/10 -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-semibold whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border/50">
        {/* Logout button */}
        <button
          onClick={() => {
            clearSession();
            window.location.href = "/";
          }}
          className={cn(
            "w-full px-3 py-2.5 rounded-lg flex items-center gap-3 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 smooth-transition overflow-hidden",
            isHovered ? "justify-start" : "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {isHovered && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-semibold whitespace-nowrap"
            >
              Sign Out
            </motion.span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
