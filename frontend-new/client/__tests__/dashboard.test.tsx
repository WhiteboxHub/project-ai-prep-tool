import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderWithProviders } from "./test-utils";
import Index from "@/pages/Index";
import Progress from "@/pages/Progress";
import { ProgressWidget } from "@/components/dashboard/ProgressWidget";
import { ContinueCard } from "@/components/dashboard/ContinueCard";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { setSession } from "@/lib/auth";
import { BookOpen } from "lucide-react";

describe("Dashboard Integration Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should render the Index page correctly", () => {
    // Arrange & Act
    renderWithProviders(<Index />);

    // Assert
    expect(screen.getByText("Hi")).toBeInTheDocument();
  });

  it("should render ProgressWidget with percentage, title, and status badges", () => {
    // Arrange & Act
    renderWithProviders(<ProgressWidget percentage={85} title="System Design Mastery" />);

    // Assert
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("System Design Mastery")).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("Sections Completed")).toBeInTheDocument();
  });

  it("should render ContinueCard with progress, time remaining, and navigation link", () => {
    // Arrange & Act
    renderWithProviders(
      <ContinueCard
        title="Intro Practice Session"
        description="Refine your 2-minute pitch"
        progress={65}
        timeRemaining="10 mins"
        href="/intro-select"
      />
    );

    // Assert
    expect(screen.getByText("Intro Practice Session")).toBeInTheDocument();
    expect(screen.getByText("Refine your 2-minute pitch")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("10 mins")).toBeInTheDocument();
    expect(screen.getByText("Continue →")).toBeInTheDocument();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/intro-select");
  });

  it("should render RecommendationCard with quick start button and difficulty badge", () => {
    // Arrange & Act
    renderWithProviders(
      <RecommendationCard
        icon={<BookOpen data-testid="rec-icon" />}
        title="System Design Architecture"
        description="Practice distributed system questions"
        category="Technical Round"
        difficulty="advanced"
        href="/interview-select"
      />
    );

    // Assert
    expect(screen.getByText("System Design Architecture")).toBeInTheDocument();
    expect(screen.getByText("Practice distributed system questions")).toBeInTheDocument();
    expect(screen.getByText("Technical Round")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start now/i })).toBeInTheDocument();
  });

  it("should fetch report data and render Executive Analytics dashboard page", async () => {
    // Arrange: Set session and mock system fetch boundary for report endpoint
    setSession("dash-session-123", "Alice Candidate", "alice@example.com");

    const mockReport = {
      final_analysis: {
        overall_score: 88,
        communication_score: 90,
        technical_depth: 86,
        problem_solving_score: 85,
        strengths: ["Articulate explanations of microservices architecture", "Strong problem-solving approach"],
        weaknesses: ["Could elaborate more on edge case error handling"],
        ai_suggestions: ["Use the STAR method for behavioral scenarios", "Highlight scalability trade-offs"],
      },
      intro_evals: [{ score: 90 }],
      interview_evals: [{ score: 8.5 }, { score: 8.7 }],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/report")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockReport), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render Progress page
    renderWithProviders(<Progress />);

    // Assert: Report widgets and qualitative sections are displayed
    expect(await screen.findByText("Executive Performance Analytics")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("Articulate explanations of microservices architecture")).toBeInTheDocument();
    expect(screen.getByText("Use the STAR method for behavioral scenarios")).toBeInTheDocument();
  });
});
