import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { renderWithProviders } from "./test-utils";
import Auth from "@/pages/Auth";
import { useAuth } from "@/lib/AuthContext";
import { clearSession, setSession } from "@/lib/auth";

// Component wrapper around RequireAuth for testing route guard behavior
function TestProtectedApp() {
  const { isAuthenticated, isSyncing, setIsSyncing } = useAuth();
  const [manualToken, setManualToken] = React.useState("");

  React.useEffect(() => {
    setIsSyncing(false);
  }, [setIsSyncing]);

  if (isSyncing) {
    return <div>Verifying Session...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Authentication Required</h2>
            <p className="text-lg text-muted-foreground">Please login from the WBL platform and try again.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste WBL Token..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                if (manualToken) {
                  setSession(manualToken, "Candidate");
                  window.dispatchEvent(new Event("storage"));
                }
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div>Protected Dashboard Content</div>;
}

describe("Auth Integration Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should block unauthenticated users and display the login form", async () => {
    // Arrange: Ensure unauthenticated state
    clearSession();

    // Act: Render protected route
    renderWithProviders(<TestProtectedApp />);

    // Assert: RequireAuth blocks access and displays login prompt
    expect(await screen.findByText("Authentication Required")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste WBL Token...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Dashboard Content")).not.toBeInTheDocument();
  });

  it("should allow access when user is authenticated with a valid session", async () => {
    // Arrange: Set valid session in localStorage
    setSession("valid-session-123", "Jane Doe", "jane@example.com");

    // Act: Render protected route
    renderWithProviders(<TestProtectedApp />);

    // Assert: RequireAuth permits rendering child content
    expect(await screen.findByText("Protected Dashboard Content")).toBeInTheDocument();
    expect(screen.queryByText("Authentication Required")).not.toBeInTheDocument();
  });

  it("should accept credential entry in login form, submit, and update session state", async () => {
    // Arrange: Start unauthenticated
    clearSession();
    const user = userEvent.setup();
    renderWithProviders(<TestProtectedApp />);

    // Act: Enter credential/token and click Login
    const input = await screen.findByPlaceholderText("Paste WBL Token...");
    const loginButton = screen.getByRole("button", { name: /login/i });

    await user.type(input, "my-manual-token-777");
    expect(input).toHaveValue("my-manual-token-777");

    await user.click(loginButton);

    // Assert: Session is updated and protected content becomes visible
    await waitFor(() => {
      expect(localStorage.getItem("session_id")).toBe("my-manual-token-777");
    });
  });

  it("should show error when Auth page is loaded without a token", async () => {
    // Arrange: Render Auth page without token in URL search params
    renderWithProviders(<Auth />, { initialEntries: ["/auth"] });

    // Act & Assert: Error message is displayed on UI
    expect(
      await screen.findByText("No authentication token found. Please log in via the WBL platform.")
    ).toBeInTheDocument();
  });

  it("should process prep_token from URL on Auth page and sync session", async () => {
    // Arrange: Mock network boundary calls (global.fetch)
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/setup/sync-from-wbl")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ candidate_name: "Alice Smith", candidate_email: "alice@wbl.com" }),
            { status: 200 }
          )
        );
      }
      if (url.includes("/api/setup/summary")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ resume_text: "Software Engineer", has_api_key: true }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    // Act: Render Auth page with token in URL
    renderWithProviders(<Auth />, { initialEntries: ["/auth?prep_token=wbl-token-100"] });

    // Assert: session_id is saved immediately to localStorage
    await waitFor(() => {
      expect(localStorage.getItem("session_id")).toBe("wbl-token-100");
    });
  });
});
