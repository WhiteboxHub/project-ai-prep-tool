// client/lib/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSessionId, getCandidateName, getInitials } from "./auth";

interface AuthContextValue {
  sessionId: string | null;
  candidateName: string;
  initials: string;
  isAuthenticated: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  sessionId: null,
  candidateName: "Candidate",
  initials: "C",
  isAuthenticated: false,
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(() => getSessionId());
  const [candidateName, setCandidateName] = useState(() => getCandidateName() || "Candidate");

  const refresh = () => {
    const sid = getSessionId();
    const name = getCandidateName();
    setSessionId(sid);
    setCandidateName(name);
  };

  useEffect(() => {
    refresh();
    // Re-sync whenever localStorage changes (e.g. another tab)
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        sessionId,
        candidateName,
        initials: getInitials(candidateName),
        isAuthenticated: Boolean(sessionId),
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
