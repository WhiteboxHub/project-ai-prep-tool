// client/lib/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSessionId, getCandidateName, getCandidateEmail, getInitials } from "./auth";

interface AuthContextValue {
  sessionId: string | null;
  candidateName: string;
  candidateEmail: string;
  initials: string;
  isAuthenticated: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  sessionId: null,
  candidateName: "Candidate",
  candidateEmail: "",
  initials: "C",
  isAuthenticated: false,
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(() => getSessionId());
  const [candidateName, setCandidateName] = useState(() => getCandidateName() || "Candidate");
  const [candidateEmail, setCandidateEmail] = useState(() => getCandidateEmail() || "");

  const refresh = () => {
    const sid = getSessionId();
    const name = getCandidateName();
    const email = getCandidateEmail();
    setSessionId(sid);
    setCandidateName(name);
    setCandidateEmail(email);
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
        candidateEmail,
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
