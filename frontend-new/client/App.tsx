import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import InterviewSelect from "./pages/InterviewSelect";
import InterviewRoom from "./pages/InterviewRoom";
import IntroPracticeRoom from "./pages/IntroPracticeRoom";
import IntroSelect from "./pages/IntroSelect";
import Progress from "./pages/Progress";
import MyHistory from "./pages/MyHistory";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminAnalytics from "./pages/AdminAnalytics";

const queryClient = new QueryClient();

import { useEffect, useState } from "react";
import { getCandidateMe } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { ThemeProvider } from "@/lib/ThemeContext";

// Register the YouTube Background Uploader Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-youtube.js')
      .then(registration => {
        console.log('[SW] ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.error('[SW] ServiceWorker registration failed: ', err);
      });
  });
}

function SsoSync() {
  const { sessionId, refresh } = useAuth();
  useEffect(() => {
    if (!sessionId || isNaN(Number(sessionId))) {
      getCandidateMe().then((data) => {
        if (data.session_id) {
          setSession(data.session_id, data.candidate_name || "Candidate", data.candidate_email || "");
          refresh();
          // Replace URL cleanly without reloading page to clear ?token=
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }).catch(() => {});
    }
  }, [sessionId, refresh]);
  return null;
}

// Guard: prompt to login from WBL if not authenticated
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, refresh } = useAuth();
  const [manualToken, setManualToken] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Authentication Required</h2>
            <p className="text-lg text-muted-foreground">Please login from the WBL platform and try again.</p>
          </div>
          
          {/* Local Development Fallback */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-8 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-3">Local Development / Manual Login</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Paste WBL Token..." 
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button 
                  onClick={() => {
                    if (manualToken) {
                      window.location.href = `/auth?prep_token=${manualToken}`;
                    }
                  }}
                  className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-colors"
                >
                  Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" toastOptions={{ style: { zIndex: 99999 } }} style={{ zIndex: 99999 }} />
        <AuthProvider>
          <SsoSync />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected routes */}
              <Route path="/" element={<RequireAuth><Navigate to="/intro-select" replace /></RequireAuth>} />
              <Route path="/interview-select" element={<RequireAuth><InterviewSelect /></RequireAuth>} />
              <Route path="/interview-room" element={<RequireAuth><InterviewRoom /></RequireAuth>} />
              <Route path="/intro-select" element={<RequireAuth><IntroSelect /></RequireAuth>} />
              <Route path="/intro-practice" element={<RequireAuth><IntroPracticeRoom /></RequireAuth>} />
              <Route path="/history" element={<RequireAuth><MyHistory /></RequireAuth>} />
              <Route path="/progress" element={<RequireAuth><Progress /></RequireAuth>} />
              
              {/* Admin routes */}
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);


createRoot(document.getElementById("root")!).render(<App />);
