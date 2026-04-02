import axios from "axios";

const isProd = process.env.NODE_ENV === "production";
const API_BASE = isProd 
  ? "https://ai-backend-560359652969.us-central1.run.app" 
  : "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000, // 2 min for LLM calls
});

// ─── Setup ────────────────────────────────────────────────────
export async function validateApiKey(apiKey: string, provider: string) {
  const res = await api.post("/api/setup/validate", { api_key: apiKey, api_provider: provider });
  return res.data;
}

// ─── Resume ───────────────────────────────────────────────────
export async function uploadResume(sessionId: string, file: File) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);
  const res = await api.post("/api/resume/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getResumeSummary(sessionId: string) {
  const res = await api.get("/api/resume/summary", { params: { session_id: sessionId } });
  return res.data;
}

// ─── Case Study ───────────────────────────────────────────────
export async function generateCaseStudy(sessionId: string, topic?: string) {
  const res = await api.post("/api/case-study/generate", { session_id: sessionId, topic });
  return res.data;
}

export async function generateCaseStudyFromTemplate(sessionId: string, projectDetails: string, templateKey: string) {
  const res = await api.post("/api/case-study/generate-from-template", {
    session_id: sessionId,
    project_details: projectDetails,
    template_key: templateKey,
  });
  return res.data;
}

export async function getCaseStudyHistory(sessionId: string) {
  const res = await api.get("/api/case-study/history", { params: { session_id: sessionId } });
  return res.data;
}

export async function getTopics() {
  const res = await api.get("/api/case-study/topics");
  return res.data;
}

// ─── Intro Evaluation ─────────────────────────────────────────
export async function evaluateIntro(sessionId: string, audioBlob: Blob) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("audio", audioBlob, "intro.webm");
  const res = await api.post("/api/intro/evaluate", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function evaluateIntroText(sessionId: string, introText: string) {
  const res = await api.post("/api/intro/evaluate-text", {
    session_id: sessionId,
    intro_text: introText,
  });
  return res.data;
}

export async function getIntroHistory(sessionId: string) {
  const res = await api.get("/api/intro/history", { params: { session_id: sessionId } });
  return res.data;
}

// ─── Project Extraction ───────────────────────────────────────
export async function extractProject(sessionId: string) {
  const res = await api.post("/api/resume/extract-project", { session_id: sessionId });
  return res.data;
}

export async function getLatestProject(sessionId: string) {
  const res = await api.get("/api/resume/latest-project", { params: { session_id: sessionId } });
  return res.data;
}

export async function getIntroTraining(sessionId: string) {
  const res = await api.post("/api/resume/intro-training", { session_id: sessionId });
  return res.data;
}

// ─── Mock Interview ───────────────────────────────────────────
export async function startMockInterview(sessionId: string) {
  const res = await api.post("/api/mock-interview/start", { session_id: sessionId });
  return res.data;
}

export async function getMockSession(sessionId: string) {
  const res = await api.get("/api/mock-interview/session", { params: { session_id: sessionId } });
  return res.data;
}

export async function evaluateAnswer(
  sessionId: string,
  mockSessionId: number,
  question: string,
  questionId: number,
  answer: string,
) {
  const res = await api.post("/api/mock-interview/evaluate-answer", {
    session_id: sessionId,
    mock_session_id: mockSessionId,
    question,
    question_id: questionId,
    answer,
  });
  return res.data;
}

export async function getInterviewAnswers(sessionId: string, mockSessionId: number) {
  const res = await api.get("/api/mock-interview/answers", {
    params: { session_id: sessionId, mock_session_id: mockSessionId },
  });
  return res.data;
}

// ─── Final Report ─────────────────────────────────────────────
export async function generateReport(sessionId: string) {
  const res = await api.post("/api/report/generate", { session_id: sessionId });
  return res.data;
}

export async function getLatestReport(sessionId: string) {
  const res = await api.get("/api/report/latest", { params: { session_id: sessionId } });
  return res.data;
}
