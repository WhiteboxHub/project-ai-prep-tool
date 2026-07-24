import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderWithProviders } from "./test-utils";
import AdminAnalytics from "@/pages/AdminAnalytics";

describe("Admin Analytics Integration Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should block access and prompt for admin_key when key is missing from URL", async () => {
    // Arrange & Act: Render AdminAnalytics without query param
    renderWithProviders(<AdminAnalytics />, { initialEntries: ["/admin/analytics"] });

    // Assert: Shielded lock screen is displayed
    expect(await screen.findByText("Admin Access Required")).toBeInTheDocument();
  });

  it("should fetch and display setup summary cards when valid admin_key is supplied", async () => {
    // Arrange: Mock summary and candidate list network responses
    const mockSummary = {
      total_candidates: 42,
      active_this_week: 18,
      intro_pass_rate: 80,
      interview_completion_rate: 65,
      total_case_studies: 30,
      intro_passed_count: 32,
      interview_completed_count: 26,
    };

    const mockCandidates = {
      candidates: [
        {
          id: 1,
          user_id: "usr_100",
          name: "Sarah Connor",
          email: "sarah@sky.net",
          wbl_email: "sarah@wbl.com",
          login_count: 5,
          created_at: "2026-07-01T00:00:00Z",
          last_login: "2026-07-24T00:00:00Z",
          extraction_status: "completed",
          has_resume: true,
          has_project: true,
          intro_attempts: 2,
          best_intro_score: 88,
          latest_intro_score: 88,
          intro_passed: true,
          latest_video_url: "/videos/1.webm",
          questions_answered: 10,
          avg_interview_score: 85,
          interview_sessions: 1,
          interview_completed: true,
          case_studies_generated: 2,
          prep_completion_pct: 100,
          prep_status_label: "Interview Ready",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/analytics/summary")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockSummary), { status: 200 })
        );
      }
      if (url.includes("/api/analytics/candidates")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockCandidates), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render with admin_key
    renderWithProviders(<AdminAnalytics />, {
      initialEntries: ["/admin/analytics?admin_key=secret-admin-123"],
    });

    // Assert: Dashboard title and key metric summary cards are displayed
    expect(await screen.findByText("AI Prep Analytics")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument(); // Total candidates
    expect(screen.getByText("18")).toBeInTheDocument(); // Active this week
    expect(screen.getByText("80%")).toBeInTheDocument(); // Intro pass rate
    expect(screen.getByText("65%")).toBeInTheDocument(); // Interview completion rate
  });

  it("should render candidate metrics table rows and video watch action button", async () => {
    // Arrange: Mock network responses with candidate details
    const mockSummary = {
      total_candidates: 1,
      active_this_week: 1,
      intro_pass_rate: 100,
      interview_completion_rate: 100,
      total_case_studies: 2,
      intro_passed_count: 1,
      interview_completed_count: 1,
    };

    const mockCandidates = {
      candidates: [
        {
          id: 1,
          user_id: "usr_101",
          name: "John Reese",
          email: "john@poi.org",
          wbl_email: "john@wbl.com",
          login_count: 3,
          created_at: "2026-07-02T00:00:00Z",
          last_login: "2026-07-24T00:00:00Z",
          extraction_status: "completed",
          has_resume: true,
          has_project: true,
          intro_attempts: 1,
          best_intro_score: 92,
          latest_intro_score: 92,
          intro_passed: true,
          latest_video_url: "/videos/john.webm",
          questions_answered: 10,
          avg_interview_score: 90,
          interview_sessions: 1,
          interview_completed: true,
          case_studies_generated: 1,
          prep_completion_pct: 100,
          prep_status_label: "Interview Ready",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/analytics/summary")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockSummary), { status: 200 })
        );
      }
      if (url.includes("/api/analytics/candidates")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockCandidates), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render page
    renderWithProviders(<AdminAnalytics />, {
      initialEntries: ["/admin/analytics?admin_key=secret-admin-123"],
    });

    // Assert: Candidate name, email, score badge, and Watch Intro button render
    expect(await screen.findByText("John Reese")).toBeInTheDocument();
    expect(screen.getByText("john@poi.org")).toBeInTheDocument();
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /watch intro/i })).toBeInTheDocument();
  });

  it("should filter candidate metrics table when typing into search input", async () => {
    // Arrange: 2 candidates in mock database
    const mockCandidates = {
      candidates: [
        {
          id: 1,
          user_id: "usr_101",
          name: "John Reese",
          email: "john@poi.org",
          wbl_email: "john@wbl.com",
          login_count: 3,
          created_at: "2026-07-02T00:00:00Z",
          last_login: "2026-07-24T00:00:00Z",
          extraction_status: "completed",
          has_resume: true,
          has_project: true,
          intro_attempts: 1,
          best_intro_score: 92,
          latest_intro_score: 92,
          intro_passed: true,
          latest_video_url: null,
          questions_answered: 10,
          avg_interview_score: 90,
          interview_sessions: 1,
          interview_completed: true,
          case_studies_generated: 1,
          prep_completion_pct: 100,
          prep_status_label: "Interview Ready",
        },
        {
          id: 2,
          user_id: "usr_102",
          name: "Harold Finch",
          email: "harold@poi.org",
          wbl_email: "harold@wbl.com",
          login_count: 8,
          created_at: "2026-07-01T00:00:00Z",
          last_login: "2026-07-24T00:00:00Z",
          extraction_status: "completed",
          has_resume: true,
          has_project: true,
          intro_attempts: 3,
          best_intro_score: 95,
          latest_intro_score: 95,
          intro_passed: true,
          latest_video_url: null,
          questions_answered: 10,
          avg_interview_score: 95,
          interview_sessions: 1,
          interview_completed: true,
          case_studies_generated: 3,
          prep_completion_pct: 100,
          prep_status_label: "Interview Ready",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/analytics/summary")) {
        return Promise.resolve(
          new Response(JSON.stringify({ total_candidates: 2 }), { status: 200 })
        );
      }
      if (url.includes("/api/analytics/candidates")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockCandidates), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminAnalytics />, {
      initialEntries: ["/admin/analytics?admin_key=secret-admin-123"],
    });

    // Both candidates visible initially
    expect(await screen.findByText("John Reese")).toBeInTheDocument();
    expect(screen.getByText("Harold Finch")).toBeInTheDocument();

    // Act: Type "Harold" into search box
    const searchInput = screen.getByPlaceholderText("Search by name, email...");
    await user.type(searchInput, "Harold");

    // Assert: Only Harold Finch remains visible
    expect(screen.getByText("Harold Finch")).toBeInTheDocument();
    expect(screen.queryByText("John Reese")).not.toBeInTheDocument();
  });
});
