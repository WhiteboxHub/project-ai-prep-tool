// // frontend\lib\api.ts
// import axios from "axios";

// const isProd = process.env.NODE_ENV === "production";
// let API_BASE = "http://127.0.0.1:8000";
// if (process.env.NODE_ENV === "production") {
//   API_BASE = "https://ai-backend-560359652969.us-central1.run.app";
// } else if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
//   API_BASE = `http://${window.location.hostname}:8000`;
// }

// const api = axios.create({
//   baseURL: API_BASE,
//   timeout: 120000, // 2 min for LLM calls
// });

// // ─── Setup ────────────────────────────────────────────────────
// export async function validateApiKey(apiKey: string, provider: string) {
//   const res = await api.post("/api/setup/validate", { api_key: apiKey, api_provider: provider });
//   return res.data;
// }

// // ─── Resume ───────────────────────────────────────────────────
// export async function uploadResume(sessionId: string, file: File) {
//   const form = new FormData();
//   form.append("session_id", sessionId);
//   form.append("file", file);
//   const res = await api.post("/api/setup/resume", form, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
//   return res.data;
// }

// export async function getResumeSummary(sessionId: string) {
//   const res = await api.get("/api/setup/summary", { params: { session_id: sessionId } });
//   return res.data;
// }

// export async function getResumeAnalytics(sessionId: string) {
//   const res = await api.get("/api/resume/analytics", { params: { session_id: sessionId } });
//   return res.data;
// }

// // ─── Case Study ───────────────────────────────────────────────
// export async function generateCaseStudy(sessionId: string, topic?: string) {
//   const res = await api.post("/api/case-study/generate", { session_id: sessionId, topic });
//   return res.data;
// }

// export async function generateCaseStudyFromTemplate(sessionId: string, projectDetails: string, templateKey: string) {
//   const res = await api.post("/api/case-study/generate-from-template", {
//     session_id: sessionId,
//     project_details: projectDetails,
//     template_key: templateKey,
//   });
//   return res.data;
// }

// export async function getCaseStudyHistory(sessionId: string) {
//   const res = await api.get("/api/project/history", { params: { session_id: sessionId } });
//   return res.data;
// }

// export async function getTopics() {
//   const res = await api.get("/api/case-study/topics");
//   return res.data;
// }

// // ─── Intro Evaluation ─────────────────────────────────────────
// export async function evaluateIntro(sessionId: string, audioBlob: Blob) {
//   const form = new FormData();
//   form.append("session_id", sessionId);
//   form.append("audio", audioBlob, "intro.webm");
//   const apiKey = typeof window !== "undefined" ? localStorage.getItem("openai_key") || "" : "";
//   form.append("api_key", apiKey);
//   const res = await api.post("/api/intro/evaluate", form, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
//   return res.data;
// }

// export async function evaluateIntroText(sessionId: string, introText: string) {
//   const apiKey = typeof window !== "undefined" ? localStorage.getItem("openai_key") || "" : "";
//   const res = await api.post("/api/intro/evaluate-text", {
//     session_id: sessionId,
//     intro_text: introText,
//     api_key: apiKey
//   });
//   return res.data;
// }

// export async function getDynamicIntroTemplate(sessionId: string) {
//   const apiKey = typeof window !== "undefined" ? localStorage.getItem("openai_key") || "" : "";
//   const res = await api.get("/api/intro/dynamic-template", { params: { session_id: sessionId, api_key: apiKey } });
//   return res.data;
// }

// export async function getIntroHistory(sessionId: string) {
//   const res = await api.get("/api/intro/history", { params: { session_id: sessionId } });
//   return res.data;
// }

// // ─── Project Extraction ───────────────────────────────────────
// export async function extractProject(sessionId: string) {
//   const res = await api.post("/api/resume/extract-project", { session_id: sessionId });
//   return res.data;
// }

// export async function getLatestProject(sessionId: string) {
//   const res = await api.get("/api/resume/latest-project", { params: { session_id: sessionId } });
//   return res.data;
// }

// export async function getIntroTraining(sessionId: string) {
//   const res = await api.post("/api/resume/intro-training", { session_id: sessionId });
//   return res.data;
// }

// export async function saveProjectBrief(sessionId: string, projectBrief: string) {
//   const res = await api.post("/api/resume/project-brief", {
//     session_id: sessionId,
//     project_brief: projectBrief,
//   });
//   return res.data;
// }

// // ─── Project Explanation (Interactive) ───────────────────────
// export async function evaluateProjectExplanation(sessionId: string, explanation: string) {
//   const res = await api.post("/api/project/evaluate-explanation", {
//     session_id: sessionId,
//     explanation,
//   });
//   return res.data;
// }

// export async function generateFromUseCase(sessionId: string, explanation: string, useCaseDetails: string) {
//   const res = await api.post("/api/project/generate-use-case", {
//     session_id: sessionId,
//     explanation,
//     use_case_details: useCaseDetails,
//   });
//   return res.data;
// }

// // ─── Mock Interview ───────────────────────────────────────────
// export async function startMockInterview(sessionId: string) {
//   const res = await api.post("/api/mock-interview/start", { session_id: sessionId });
//   return res.data;
// }

// export async function getMockSession(sessionId: string) {
//   const res = await api.get("/api/mock-interview/session", { params: { session_id: sessionId } });
//   return res.data;
// }

// export async function evaluateAnswer(
//   sessionId: string,
//   mockSessionId: number,
//   question: string,
//   questionId: number,
//   answer: string,
// ) {
//   const res = await api.post("/api/mock-interview/evaluate-answer", {
//     session_id: sessionId,
//     mock_session_id: mockSessionId,
//     question,
//     question_id: questionId,
//     answer,
//   });
//   return res.data;
// }

// export async function getInterviewAnswers(sessionId: string, mockSessionId: number) {
//   const res = await api.get("/api/mock-interview/answers", {
//     params: { session_id: sessionId, mock_session_id: mockSessionId },
//   });
//   return res.data;
// }

// export async function generateReport(sessionId: string) {
//   const res = await api.post("/api/report/generate", { session_id: sessionId });
//   return res.data;
// }

// export async function getLatestReport(sessionId: string) {
//   const res = await api.get("/api/report/latest", { params: { session_id: sessionId } });
//   return res.data;
// }

// export async function getStageQuestions(sessionId: string, stageName: string = "General Mock") {
//   const apiKey = typeof window !== "undefined" ? localStorage.getItem("openai_key") || "" : "";
//   const res = await api.get("/api/interview/stage-questions", { params: { session_id: sessionId, api_key: apiKey, stage_name: stageName } });
//   return res.data;
// }

// export type InterviewEvalMeta = {
//   sectionQuestionTotal?: number;
//   gradedTurnNumber?: number;
//   interactionMode?: "graded" | "suggest";
// };

// export async function sendQuickChat(
//   sessionId: string,
//   currentQuestion: string,
//   userAnswer: string,
//   stageName: string,
//   previousContext: string = "",
//   meta?: InterviewEvalMeta
// ) {
//   const apiKey = typeof window !== "undefined" ? localStorage.getItem("openai_key") || "" : "";
//   const res = await api.post("/api/interview/evaluate-live", {
//     session_id: sessionId,
//     current_question: currentQuestion,
//     user_answer: userAnswer,
//     stage_name: stageName,
//     previous_context: previousContext,
//     api_key: apiKey,
//     section_question_total: meta?.sectionQuestionTotal ?? 1,
//     graded_turn_number: meta?.gradedTurnNumber ?? 1,
//     interaction_mode: meta?.interactionMode ?? "graded",
//   });
//   return res.data;
// }


// frontend\lib\api.ts
import axios from "axios";

const isProd = process.env.NODE_ENV === "production";

let API_BASE = "http://127.0.0.1:8000";

if (isProd) {
  API_BASE = "https://ai-backend-560359652969.us-central1.run.app";
} else if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
  API_BASE = `http://${window.location.hostname}:8000`;
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
});

// ─── Setup ─────────────────────────────────────
export async function validateApiKey(apiKey: string, provider: string) {
  const res = await api.post("/api/setup/validate", {
    api_key: apiKey,
    api_provider: provider,
  });
  return res.data;
}

// ─── Resume ────────────────────────────────────
export async function uploadResume(sessionId: string, file: File) {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("file", file);

  const res = await api.post("/api/setup/resume", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function getResumeSummary(sessionId: string) {
  const res = await api.get("/api/setup/summary", {
    params: { session_id: sessionId },
  });
  return res.data;
}

export async function getResumeAnalytics(sessionId: string) {
  const res = await api.get("/api/resume/analytics", {
    params: { session_id: sessionId },
  });
  return res.data;
}

// ─── Intro ─────────────────────────────────────
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

export async function getDynamicIntroTemplate(sessionId: string) {
  const res = await api.get("/api/intro/dynamic-template", {
    params: { session_id: sessionId },
  });

  return res.data;
}

export async function getIntroHistory(sessionId: string) {
  const res = await api.get("/api/intro/history", {
    params: { session_id: sessionId },
  });
  return res.data;
}

// ─── Interview ─────────────────────────────────
// export async function getStageQuestions(sessionId: string, stageName: string = "General Mock") {
//   const res = await api.get("/api/interview/stage-questions", {
//     params: {
//       session_id: sessionId,
//       stage_name: stageName,
//     },
//   });
//   return res.data;
// }

export async function generateReport(sessionId: string) {
  const res = await api.post("/api/report/generate", { session_id: sessionId });
  return res.data;
}

export async function getLatestReport(sessionId: string) {
  const res = await api.get("/api/report/latest", { params: { session_id: sessionId } });
  return res.data;
}

export async function getStageQuestions(sessionId: string, stageName: string = "General Mock") {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("openai_key") || "" : "";
  const res = await api.get("/api/interview/stage-questions", { params: { session_id: sessionId, api_key: apiKey, stage_name: stageName } });
  return res.data;
}

export async function sendQuickChat(sessionId: string, currentQuestion: string, userAnswer: string, stageName: string, previousContext: string = "") {
  const apiKey = typeof window !== "undefined" ? localStorage.getItem("openai_key") || "" : "";
  const res = await api.post("/api/interview/evaluate-live", {
    session_id: sessionId,
    current_question: currentQuestion,
    user_answer: userAnswer,
    stage_name: stageName,
    previous_context: previousContext,
    api_key: apiKey
  });
  return res.data;
}


export async function getCaseStudyHistory(sessionId: string) {
  const res = await api.get("/api/project/history", {
    params: { session_id: sessionId },
  });
  return res.data;
}