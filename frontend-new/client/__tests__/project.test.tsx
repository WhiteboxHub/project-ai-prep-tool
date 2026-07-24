import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderWithProviders } from "./test-utils";
import { ProjectForm } from "@/components/ProjectForm";
import Documents from "@/pages/Documents";
import { setSession } from "@/lib/auth";

describe("Project Context & Case Study Integration Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should render project context form inputs and capture user entries", async () => {
    // Arrange: Authenticated candidate
    setSession("project-session-1", "Dave Candidate", "dave@example.com");
    const user = userEvent.setup();

    // Act: Render ProjectForm
    renderWithProviders(<ProjectForm />);

    // Assert: Form fields render
    const titleInput = screen.getByLabelText(/project title/i);
    const techInput = screen.getByLabelText(/tech stack/i);
    const descInput = screen.getByLabelText(/project overview & impact/i);

    expect(titleInput).toBeInTheDocument();
    expect(techInput).toBeInTheDocument();
    expect(descInput).toBeInTheDocument();

    // Act: Enter project details
    await user.type(titleInput, "Real-time Fraud Detection System");
    await user.type(techInput, "Python, Flink, Kafka, Scikit-learn");
    await user.type(descInput, "Architected high-throughput stream processing pipeline processing 50k txn/sec.");

    // Assert: Values updated in form controls
    expect(titleInput).toHaveValue("Real-time Fraud Detection System");
    expect(techInput).toHaveValue("Python, Flink, Kafka, Scikit-learn");
    expect(descInput).toHaveValue("Architected high-throughput stream processing pipeline processing 50k txn/sec.");
  });

  it("should execute save action on form submission and trigger project API endpoint", async () => {
    // Arrange: Authenticated candidate and system fetch mock
    setSession("project-session-2", "Dave Candidate", "dave@example.com");
    const user = userEvent.setup();

    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/project/") || url.includes("/api/resume/project-brief")) {
        return Promise.resolve(
          new Response(JSON.stringify({ status: "success", message: "Saved" }), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    global.fetch = fetchSpy;

    // Act: Render ProjectForm and submit
    renderWithProviders(<ProjectForm />);

    await user.type(screen.getByLabelText(/project title/i), "Autonomous AI Agent Swarm");
    await user.type(screen.getByLabelText(/project overview & impact/i), "Multi-agent coordination framework.");

    const saveButton = screen.getByRole("button", { name: /save project context/i });
    await user.click(saveButton);

    // Assert: Success message appears and API POST calls occurred
    expect(await screen.findByText("Project context saved successfully!")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/project/"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("should trigger case study generation when case type button is clicked", async () => {
    // Arrange: Mock case study generation API response
    setSession("project-session-3", "Dave Candidate", "dave@example.com");
    const user = userEvent.setup();

    const fetchSpy = vi.fn().mockImplementation((input: any) => {
      const urlStr = typeof input === "string" ? input : String(input?.url || input || "");
      if (urlStr.includes("/api/case-study/generate-typed")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              case_study: {
                topic: "MLOps Case Study",
                content: "# MLOps Case Study\nContinuous deployment pipeline for LLMs.",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ status: "success" }), { status: 200, headers: { "Content-Type": "application/json" } })
      );
    });
    global.fetch = fetchSpy;

    // Act: Render ProjectForm and click MLOps Case Study button
    renderWithProviders(<ProjectForm />);

    const mlopsButton = screen.getByRole("button", { name: /mlops case study/i });
    await user.click(mlopsButton);

    // Assert: Success notification displays and generate API request was made
    expect(await screen.findByText("Generated MLOps Case Study successfully!")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/case-study/generate-typed"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          session_id: "project-session-3",
          case_type: "MLOps Case Study",
        }),
      })
    );
  });

  it("should render generated case studies in Documents page view", async () => {
    // Arrange: Mock history endpoint returning saved case studies
    setSession("project-session-4", "Dave Candidate", "dave@example.com");

    const mockDocs = [
      {
        id: 101,
        topic: "Agentic AI Case Study",
        content: "Detailed breakdown of agent task routing and memory management.",
        created_at: "2026-07-24T12:00:00Z",
      },
      {
        id: 102,
        topic: "RAG Case Study",
        content: "Hybrid dense-sparse retrieval architecture with Re-ranking.",
        created_at: "2026-07-24T13:00:00Z",
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/case-study/history")) {
        return Promise.resolve(
          new Response(JSON.stringify({ case_studies: mockDocs }), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render Documents page
    renderWithProviders(<Documents />);

    // Assert: Document list and statistics cards are populated
    expect(await screen.findByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Agentic AI Case Study")).toBeInTheDocument();
    expect(screen.getByText("RAG Case Study")).toBeInTheDocument();
    expect(screen.getByText("Total Documents")).toBeInTheDocument();
  });
});
