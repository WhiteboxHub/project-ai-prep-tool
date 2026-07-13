import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/AuthContext";

import Dashboard from "./pages/Dashboard";
import ProjectAnalysis from "./pages/ProjectAnalysis";
import InterviewSelect from "./pages/InterviewSelect";
import InterviewRoom from "./pages/InterviewRoom";
import IntroPracticeRoom from "./pages/IntroPracticeRoom";
import IntroSelect from "./pages/IntroSelect";
import Documents from "./pages/Documents";
import Progress from "./pages/Progress";
import Settings from "./pages/Settings";
import MyHistory from "./pages/MyHistory";
import Setup from "./pages/Setup";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AdminAnalytics from "./pages/AdminAnalytics";

const queryClient = new QueryClient();

import { useEffect } from "react";
import { getCandidateMe } from "@/lib/api";
import { setSession } from "@/lib/auth";

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

// Guard: redirect to /setup if not authenticated
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" toastOptions={{ style: { zIndex: 99999 } }} style={{ zIndex: 99999 }} />
      <AuthProvider>
        <SsoSync />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/setup" element={<Setup />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected routes */}
            <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/preparation" element={<RequireAuth><ProjectAnalysis /></RequireAuth>} />
            <Route path="/interview-select" element={<RequireAuth><InterviewSelect /></RequireAuth>} />
            <Route path="/interview-room" element={<RequireAuth><InterviewRoom /></RequireAuth>} />
            <Route path="/intro-select" element={<RequireAuth><IntroSelect /></RequireAuth>} />
            <Route path="/intro-practice" element={<RequireAuth><IntroPracticeRoom /></RequireAuth>} />
            <Route path="/documents" element={<RequireAuth><Documents /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><MyHistory /></RequireAuth>} />
            <Route path="/progress" element={<RequireAuth><Progress /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            
            {/* Admin routes */}
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);


createRoot(document.getElementById("root")!).render(<App />);
