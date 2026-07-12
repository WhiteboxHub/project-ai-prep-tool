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

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Project Analysis", icon: Lightbulb, href: "/preparation" },
  { label: "Intro Practice", icon: FileText, href: "/intro-select" },
  { label: "Interview Practice", icon: Video, href: "/interview-select" },
  { label: "Documents", icon: FileText, href: "/documents" },
  { label: "My History", icon: History, href: "/history" },
  { label: "Progress", icon: TrendingUp, href: "/progress" },
  // { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { candidateName, initials } = useAuth();



  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="fixed left-0 top-0 h-screen z-40 glass-card border-r border-border bg-gradient-to-b from-card/80 to-card/60 flex flex-col"
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border/50">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-xs font-bold text-white">WB</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">WBL</span>
              <span className="text-xs text-muted-foreground">SmartPrep</span>
            </div>
          </motion.div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link key={item.href} to={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative px-3 py-2.5 rounded-lg flex items-center gap-3 cursor-pointer smooth-transition",
                  isActive
                    ? "bg-primary/20 text-primary glow-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
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
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-2">
        {/* Logout button */}
        {/* <button
          onClick={handleLogout}
          className={cn(
            "w-full px-3 py-2 rounded-lg flex items-center gap-3 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 smooth-transition",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button> */}

        {/* User info */}
        <div className="glass-card p-3 rounded-lg text-center">
          {isCollapsed ? (
            <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
          ) : (
            <div className="text-sm">
              <p className="font-semibold text-foreground truncate">{candidateName}</p>
              <p className="text-xs text-muted-foreground">AI Prep Candidate</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
