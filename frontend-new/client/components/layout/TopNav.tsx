import React from "react";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
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
      className="fixed top-0 left-16 right-0 h-16 z-30 glass-card border-b border-border bg-background flex items-center justify-between px-6"
    >
      {/* Left Section / Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Centered Title */}
      {useLocation().pathname === "/intro-select" && (
        <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
          <h1 className="text-lg font-semibold text-foreground truncate">
            Interview Preparation
          </h1>
        </div>
      )}

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
                  <p className="text-sm font-medium leading-tight text-foreground">
                    {candidateName}
                  </p>
                  {candidateEmail && (
                    <p className="text-xs leading-tight text-muted-foreground truncate max-w-[180px] pb-0.5">
                      {candidateEmail}
                    </p>
                  )}
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {initials}
              </div>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-card border border-border">
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2">
              <div className="w-4 h-4 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary" />
              <div className="flex flex-col items-start ml-2 mr-1 overflow-hidden">
                <span className="text-sm font-semibold truncate w-full">{candidateName}</span>
                {candidateEmail && (
                  <span className="text-xs text-muted-foreground truncate w-full mt-1">{candidateEmail}</span>
                )}
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => {
                clearSession();
                const isProduction = window.location.hostname.endsWith("whitebox-learning.com");
                if (isProduction) {
                  // Redirect to WBL's /logout page which triggers WBL's full
                  // logout() — clears localStorage, next-auth, cookies, then
                  // redirects to /login
                  window.location.href = "https://whitebox-learning.com/logout";
                } else {
                  window.location.href = "/";
                }
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
