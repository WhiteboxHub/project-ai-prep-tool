import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderWithProviders } from "./test-utils";
import IntroSelect from "@/pages/IntroSelect";
import IntroPracticeRoom from "@/pages/IntroPracticeRoom";
import IntroResult from "@/pages/IntroResult";
import { setSession } from "@/lib/auth";

describe("Intro Practice Flow Integration Suite", () => {
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

  it("should render IntroSelect and handle type selection & interview format modal", async () => {
    // Arrange: Authenticated candidate
    setSession("intro-session-1", "Bob Smith", "bob@example.com");
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/intro/history")) {
        return Promise.resolve(
          new Response(JSON.stringify({ history: [], pagination: { total_pages: 1 } }), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const user = userEvent.setup();
    renderWithProviders(<IntroSelect />);

    // Assert: Title and choices rendered
    expect(await screen.findByText("Select Introduction Type")).toBeInTheDocument();
    expect(screen.getByText("General Introduction")).toBeInTheDocument();
    expect(screen.getByText("JD Specific Introduction")).toBeInTheDocument();

    // Act: Click General Introduction card
    await user.click(screen.getByText("General Introduction"));

    // Assert: Start button becomes enabled
    const startButton = screen.getByRole("button", { name: /enter intro practice/i });
    expect(startButton).not.toBeDisabled();

    // Act: Click Start button to trigger format modal
    await user.click(startButton);

    // Assert: Format selection modal pops up
    expect(await screen.findByText("Select Interview Format")).toBeInTheDocument();
    expect(screen.getByText("Video Interview")).toBeInTheDocument();
    expect(screen.getByText("Audio Only")).toBeInTheDocument();
  });

  it("should support JD Specific Introduction input in IntroSelect", async () => {
    // Arrange
    setSession("intro-session-2", "Bob Smith", "bob@example.com");
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/intro/history")) {
        return Promise.resolve(
          new Response(JSON.stringify({ history: [], pagination: { total_pages: 1 } }), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const user = userEvent.setup();
    renderWithProviders(<IntroSelect />);

    // Act: Select JD Specific option
    await user.click(await screen.findByText("JD Specific Introduction"));

    // Assert: Textarea for Job Description appears
    const textarea = screen.getByPlaceholderText("Paste the full job description here...");
    expect(textarea).toBeInTheDocument();

    // Act: Type JD text
    await user.type(textarea, "Seeking a Staff AI Architect with PyTorch experience.");

    // Assert: Input value is updated and button is active
    expect(textarea).toHaveValue("Seeking a Staff AI Architect with PyTorch experience.");
    const startButton = screen.getByRole("button", { name: /enter intro practice/i });
    expect(startButton).not.toBeDisabled();
  });

  it("should render IntroPracticeRoom with dynamic template fetching", async () => {
    // Arrange: Mock backend API responses for template & summary
    setSession("intro-session-3", "Bob Smith", "bob@example.com");
    sessionStorage.setItem("interviewMode", "audio");

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/intro/dynamic-template")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ template: "Here is your personalized introduction template..." }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/setup/summary")) {
        return Promise.resolve(
          new Response(JSON.stringify({ has_api_key: true }), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render IntroPracticeRoom
    renderWithProviders(<IntroPracticeRoom />);

    // Assert: Interviewer controls and AI coach components render
    await waitFor(() => {
      expect(screen.getAllByText("Interviewer")[0]).toBeInTheDocument();
    });
  });

  it("should display evaluation results, scores, and feedback in IntroResult", () => {
    // Arrange: Mock result object from AI evaluation
    const mockResult = {
      score: 82,
      feedback: {
        strengths: ["Clear articulation of key achievements", "Strong domain knowledge"],
        weaknesses: ["Add specific quantisable metrics to project outcomes"],
        ai_suggestions: ["Practice STAR method for behavioral context"],
        scores: {
          communication: 85,
          technical_depth: 80,
        },
      },
    };

    // Act: Render IntroResult with location state
    renderWithProviders(<IntroResult />, {
      initialEntries: [{ pathname: "/intro-result", state: { result: mockResult } }],
    });

    // Assert: Detailed evaluation elements are rendered in DOM
    expect(screen.getByText("Detailed Evaluation")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
    expect(screen.getByText("Clear articulation of key achievements")).toBeInTheDocument();
    expect(screen.getByText("Add specific quantisable metrics to project outcomes")).toBeInTheDocument();
    expect(screen.getByText("Practice STAR method for behavioral context")).toBeInTheDocument();
  });
});
