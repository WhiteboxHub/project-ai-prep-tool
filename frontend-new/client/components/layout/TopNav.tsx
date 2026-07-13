import React from "react";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/AuthContext";
import { clearSession } from "@/lib/auth";

interface TopNavProps {
  readiness?: number;
}

export function TopNav({ readiness }: TopNavProps) {
  const navigate = useNavigate();
  const { candidateName, initials, candidateEmail } = useAuth();

  const score = readiness ?? 0;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-80 right-0 h-16 z-30 glass-card border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-6"
    >
      {/* Left Section */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-foreground truncate">
          Interview Preparation
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 ml-4">
        {/* Readiness indicator — only shown when score is available */}
        {score > 0 && (
          <motion.div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white">
              {score}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {score}% Ready
            </span>
          </motion.div>
        )}

        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 smooth-transition cursor-pointer"
            >
              <div className="flex flex-col items-end mr-1 hidden sm:flex">
                <span className="text-sm font-semibold text-foreground max-w-[200px] truncate">
                  {candidateName}
                </span>
                <span className="text-xs text-muted-foreground max-w-[200px] truncate">{candidateEmail || "Candidate"}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {initials}
              </div>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border border-border">
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-secondary" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate max-w-28">{candidateName}</span>
                <span className="text-xs text-muted-foreground truncate max-w-28">{candidateEmail || "Candidate"}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => {
                clearSession();
                window.location.href = "/";
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.nav>
  );
}
