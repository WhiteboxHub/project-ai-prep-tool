import React from "react";
import { Bell, Upload, LogOut } from "lucide-react";
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
  const { candidateName, initials } = useAuth();

  const handleLogout = () => {
    clearSession();
    navigate("/setup");
  };

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


        {/* Upload Resume */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/settings")}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary smooth-transition text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          Resume
        </motion.button>


        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white cursor-pointer"
            >
              {initials}
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border border-border">
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-secondary" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate max-w-28">{candidateName}</span>
                <span className="text-xs text-muted-foreground">Candidate</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate("/settings")}
            >
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate("/setup")}
            >
              Manage API Keys
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer flex items-center gap-2 text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.nav>
  );
}
