// client/lib/auth.ts
// Session management utilities — localStorage-based, matching backend contract.

const SESSION_ID_KEY = "session_id";
const CANDIDATE_NAME_KEY = "candidate_name";
const CANDIDATE_EMAIL_KEY = "candidate_email";
const API_PROVIDER_KEY = "api_provider";

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_ID_KEY);
}

export function getCandidateName(): string {
  return localStorage.getItem(CANDIDATE_NAME_KEY) || "Candidate";
}

export function getCandidateEmail(): string {
  return localStorage.getItem(CANDIDATE_EMAIL_KEY) || "";
}

export function getApiProvider(): string | null {
  return localStorage.getItem(API_PROVIDER_KEY);
}

export function setSession(sessionId: string, candidateName?: string, candidateEmail?: string) {
  localStorage.setItem(SESSION_ID_KEY, sessionId);
  if (candidateName) {
    localStorage.setItem(CANDIDATE_NAME_KEY, candidateName);
  }
  if (candidateEmail) {
    localStorage.setItem(CANDIDATE_EMAIL_KEY, candidateEmail);
  }
}

export function setCandidateName(name: string) {
  localStorage.setItem(CANDIDATE_NAME_KEY, name);
}

export function setApiProvider(provider: string) {
  localStorage.setItem(API_PROVIDER_KEY, provider);
}

export function clearSession() {
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(CANDIDATE_NAME_KEY);
  localStorage.removeItem(CANDIDATE_EMAIL_KEY);
  localStorage.removeItem(API_PROVIDER_KEY);
  
  // Expire the WBL JWT token cookie to fully invalidate the session across all possible subdomains
  document.cookie = "wbl_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "wbl_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.whitebox-learning.com;";
  document.cookie = "wbl_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=whitebox-learning.com;";
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(SESSION_ID_KEY));
}

/** Returns initials from a name, e.g. "Shilpa Verma" → "SV" */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
