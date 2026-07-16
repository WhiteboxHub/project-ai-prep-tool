// client/lib/api.ts
// Central API service layer — mirrors frontend-updated/lib/api.ts exactly.
// All backend calls go through here. BASE_URL resolves from env var.

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

import { clearSession, isAuthenticated } from "./auth";

function handle401(res: Response) {
  if (res.status === 401) {
    const wasAuthenticated = isAuthenticated();
    
    // In local development, we don't have domain cookies. 
    // Allow the local fallback session (prep_token) to survive 401s.
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal && wasAuthenticated && !getWblToken()) {
      return;
    }

    clearSession();
    // Only redirect if the user was authenticated.
    // This prevents infinite reload loops when SsoSync checks /me with an expired cookie.
    if (wasAuthenticated && window.location.pathname !== "/auth") {
      window.location.href = "/";
    }
  }
}

// ─── Generic fetch helpers ────────────────────────────────────────────────────

function getWblToken(): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; wbl_access_token=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function getAuthHeaders(existingHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getWblToken();
  if (token) {
    return { ...existingHeaders, Authorization: `Bearer ${token}` };
  }
  return existingHeaders;
}

async function get<T = any>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function post<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    const message = Array.isArray(err.detail)
      ? err.detail.map((item: any) => item.msg || String(item)).join("; ")
      : err.detail || "Request failed";
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function postForm<T = any>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: form,
  });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

async function del<T = any>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    handle401(res);
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ─── Setup / Auth ─────────────────────────────────────────────────────────────

export function getCandidateMe() {
  return get<{ session_id: string; candidate_name: string; candidate_email: string }>("/api/candidate/me");
}

export function syncWithWbl(prepToken: string) {
  return post("/api/setup/sync-from-wbl", { prep_token: prepToken });
}

export function initAndSummary(data: {
  wbl_email?: string;
  name?: string;
  candidate_id?: number;
}) {
  return post("/api/setup/init-and-summary", data);
}

export function validateApiKey(data: {
  session_id: string;
  api_key: string;
  api_provider: string;
  model_name?: string;
  voice_enabled?: boolean;
}) {
  return post("/api/setup/validate", data);
}

export function uploadResume(sessionId: string, file: File) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  return postForm("/api/setup/resume", form);
}

export function getResumeSummary(sessionId: string) {
  return get("/api/setup/summary", { session_id: sessionId });
}

export function getExtractionStatus(sessionId: string) {
  return get<{ status: string }>("/api/setup/extraction-status", {
    session_id: sessionId,
  });
}

export function deleteLlmKey(keyId: number, sessionId: string) {
  return del(`/api/setup/llm-key/${keyId}`, { session_id: sessionId });
}

// ─── Intro Evaluation ─────────────────────────────────────────────────────────

export function evaluateIntro(sessionId: string, audioBlob: Blob, introType: string = "general", jdText: string = "", visionMetrics: any = null, recordingId: string = "") {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("audio", audioBlob, "recording.webm");
  form.append("intro_type", introType);
  if (jdText) {
    form.append("job_description", jdText);
  }
  if (visionMetrics) {
    form.append("vision_metrics", JSON.stringify(visionMetrics));
  }
  if (recordingId) {
    form.append("recording_id", recordingId);
  }
  return postForm("/api/intro/evaluate", form);
}

export function evaluateIntroText(sessionId: string, transcript: string, introType: string = "general", jdText: string = "", videoUrl: string | null = null) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("transcript", transcript);
  form.append("intro_type", introType);
  if (jdText) {
    form.append("job_description", jdText);
  }
  if (videoUrl) {
    form.append("video_url", videoUrl);
  }
  return postForm("/api/intro/evaluate-text", form);
}

export function getIntroHistory(sessionId: string) {
  return get("/api/intro/history", { session_id: sessionId });
}

export function getIntroAttempt(sessionId: string, attemptId: number) {
  return get(`/api/intro/history/${attemptId}`, { session_id: sessionId });
}

export function getDynamicTemplate(sessionId: string) {
  return get("/api/intro/dynamic-template", { session_id: sessionId });
}

// ─── Project / Context ────────────────────────────────────────────────────────

export function submitProject(data: Record<string, any>) {
  return post("/api/project/", data);
}

export function getLatestProject(sessionId: string) {
  return get("/api/resume/latest-project", { session_id: sessionId });
}

export function extractProject(sessionId: string) {
  return post("/api/resume/extract-project", { session_id: sessionId });
}

export function getProjectHistory(sessionId: string) {
  return get("/api/project/history", { session_id: sessionId });
}

export function evaluateProjectExplanation(sessionId: string, explanation: string) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("explanation", explanation);
  return postForm("/api/project/evaluate-explanation", form);
}

export function generateFromUseCase(sessionId: string, useCase: string) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("use_case", useCase);
  return postForm("/api/project/generate-use-case", form);
}

export function saveProjectBrief(sessionId: string, brief: string) {
  return post("/api/resume/project-brief", { session_id: sessionId, brief });
}

// ─── Case Study ───────────────────────────────────────────────────────────────



export function getCaseStudyHistory(sessionId: string) {
  return get("/api/case-study/history", { session_id: sessionId });
}

export function generateTypedCaseStudy(sessionId: string, caseType: string) {
  return post("/api/case-study/generate-typed", {
    session_id: sessionId,
    case_type: caseType,
  });
}



// ─── Interview ────────────────────────────────────────────────────────────────

export function getStageQuestions(sessionId: string, stage: number, stageName?: string, previousContext?: string) {
  return get("/api/interview/stage-questions", {
    session_id: sessionId,
    stage: String(stage),
    ...(stageName ? { stage_name: stageName } : {}),
    ...(previousContext ? { previous_context: previousContext } : {}),
  });
}

export function evaluateLiveAnswer(
  sessionId: string,
  stage: number,
  transcript: string,
  stageName: string,
  previousContext: string = "",
  currentQuestion: string = ""
) {
  return post("/api/interview/evaluate-live", {
    session_id: sessionId,
    current_question: currentQuestion,
    user_answer: transcript,
    stage_name: stageName,
    previous_context: previousContext
  });
}

export function completeInterview(sessionId: string) {
  return post("/api/interview/complete", { session_id: sessionId });
}

// ─── Mock Interview ───────────────────────────────────────────────────────────

export function startMockInterview(sessionId: string) {
  return post("/api/mock-interview/start", { session_id: sessionId });
}

export function getMockSession(sessionId: string) {
  return get("/api/mock-interview/session", { session_id: sessionId });
}

export function evaluateMockAnswer(
  sessionId: string,
  questionId: string,
  answer: string
) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("question_id", questionId);
  form.append("answer", answer);
  return postForm("/api/mock-interview/evaluate-answer", form);
}

export function getMockAnswers(sessionId: string) {
  return get("/api/mock-interview/answers", { session_id: sessionId });
}

// ─── Report ───────────────────────────────────────────────────────────────────

export function getFinalReport(sessionId: string) {
  return get("/api/report", { session_id: sessionId });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function getAnalyticsSummary(adminKey: string) {
  return get("/api/analytics/summary", { admin_key: adminKey });
}

export function getAnalyticsCandidates(
  adminKey: string,
  filters?: {
    search?: string;
    filter_intro_passed?: boolean;
    filter_interview_done?: boolean;
    filter_has_coderpad?: boolean;
    filter_active_week?: boolean;
  }
) {
  const params: Record<string, string> = { admin_key: adminKey };
  if (filters) {
    if (filters.search !== undefined) params.search = filters.search;
    if (filters.filter_intro_passed !== undefined)
      params.filter_intro_passed = String(filters.filter_intro_passed);
    if (filters.filter_interview_done !== undefined)
      params.filter_interview_done = String(filters.filter_interview_done);
    if (filters.filter_has_coderpad !== undefined)
      params.filter_has_coderpad = String(filters.filter_has_coderpad);
    if (filters.filter_active_week !== undefined)
      params.filter_active_week = String(filters.filter_active_week);
  }
  return get("/api/analytics/candidates", params);
}

export function getAnalyticsCandidateDetail(userId: string, adminKey: string) {
  return get(`/api/analytics/candidates/${userId}`, { admin_key: adminKey });
}

export function syncCoderpad(userId: string, adminKey: string) {
  return post(`/api/analytics/sync-coderpad/${userId}?admin_key=${adminKey}`, {});
}

