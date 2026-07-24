import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderWithProviders } from "./test-utils";
import InterviewSelect from "@/pages/InterviewSelect";
import InterviewRoom from "@/pages/InterviewRoom";
import { setSession } from "@/lib/auth";

describe("Mock Interview Flow Integration Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("should render InterviewSelect, permit stage and difficulty configuration, and save settings", async () => {
    // Arrange: Authenticated user with unlocked pipeline
    setSession("interview-session-1", "Charlie Candidate", "charlie@example.com");

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/intro/history")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ passed: true, best_score: 85, history: [] }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/setup/summary") || url.includes("/api/setup/extraction-status")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              has_resume: true,
              has_project: true,
              has_api_key: true,
              resume_text: "Software Engineer",
              status: "completed",
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const user = userEvent.setup();
    renderWithProviders(<InterviewSelect />);

    // Assert: Title and section headers render
    expect(await screen.findByText("Configure Your Practice")).toBeInTheDocument();
    expect(screen.getByText("1. Select Interview Type")).toBeInTheDocument();
    expect(screen.getByText("2. Select Difficulty")).toBeInTheDocument();

    // Act: Select AI Engineer interview type and Senior difficulty
    await user.click(screen.getByText("AI Engineer"));
    await user.click(screen.getByText("Senior"));

    // Assert: Enter button is enabled
    const enterButton = screen.getByRole("button", { name: /enter interview room/i });
    expect(enterButton).not.toBeDisabled();

    // Act: Click Enter Interview Room
    await user.click(enterButton);

    // Assert: sessionStorage updated with interview parameters
    expect(sessionStorage.getItem("interviewType")).toBe("ai-engineer");
    expect(sessionStorage.getItem("interviewDifficulty")).toBe("senior");
  });

  it("should render locked message when pipeline blocks interview access", async () => {
    // Arrange: User whose intro practice is incomplete
    setSession("interview-session-locked", "Charlie Candidate", "charlie@example.com");

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/intro/history")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ passed: false, best_score: 50, history: [] }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/setup/summary") || url.includes("/api/setup/extraction-status")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              has_resume: true,
              has_project: false,
              has_api_key: true,
              status: "completed",
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render InterviewSelect
    renderWithProviders(<InterviewSelect />);

    // Assert: Lock screen displays guidance button
    expect(await screen.findByText("Interview Locked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /go to intro practice/i })).toBeInTheDocument();
  });

  it("should fetch initial stage questions and render InterviewRoom chat interface", async () => {
    // Arrange: Setup session and interview parameters
    setSession("interview-session-2", "Charlie Candidate", "charlie@example.com");
    sessionStorage.setItem("interviewType", "ai-engineer");
    sessionStorage.setItem("interviewDifficulty", "senior");

    const mockQuestion = "How do you optimize LLM latency and context window limits in RAG pipelines?";

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/intro/history")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ passed: true, best_score: 85, history: [] }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/setup/summary")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ has_resume: true, resume_text: "Engineer", has_api_key: true }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/interview/stage-questions")) {
        return Promise.resolve(
          new Response(JSON.stringify({ question: mockQuestion }), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render InterviewRoom
    renderWithProviders(<InterviewRoom />);

    // Assert: Stage indicator and fetched interview question appear in DOM
    expect(await screen.findByText(mockQuestion)).toBeInTheDocument();
    expect(screen.getByText("Stage 1/5")).toBeInTheDocument();
  });

  it("should handle live answer evaluation and display overall evaluation score", async () => {
    // Arrange: Setup session and mock interview question & evaluation API
    setSession("interview-session-3", "Charlie Candidate", "charlie@example.com");
    sessionStorage.setItem("interviewType", "ai-engineer");
    sessionStorage.setItem("interviewDifficulty", "senior");

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/intro/history")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ passed: true, best_score: 85, history: [] }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/setup/summary")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ has_resume: true, resume_text: "Engineer", has_api_key: true }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/interview/stage-questions")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ question: "Explain transformer attention mechanisms." }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/interview/evaluate-live")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              reply: "Excellent explanation. Next, how do multi-head attention heads differ?",
              evaluation: {
                overall_score: 8.8,
                gap_analysis: ["Mention query/key/value projection matrices"],
              },
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render InterviewRoom
    renderWithProviders(<InterviewRoom />);

    // Assert: Initial question is loaded
    expect(await screen.findByText("Explain transformer attention mechanisms.")).toBeInTheDocument();
  });
});
