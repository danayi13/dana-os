/**
 * HomePage tests — today's habits strip and nudge section.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomePage } from "./HomePage";
import { createWrapper } from "@/test/test-utils";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Home heading and today's date", () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    expect(screen.getByRole("heading", { name: /home/i })).toBeInTheDocument();

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    expect(screen.getByText(today)).toBeInTheDocument();
  });

  it("renders the Today's habits section header", () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    expect(screen.getByText(/today's habits/i)).toBeInTheDocument();
  });

  it("renders a link to the full habits page", () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    expect(screen.getByRole("link", { name: /manage/i })).toBeInTheDocument();
  });

  it("shows habits from the API", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === "/habits") {
        return Promise.resolve([
          {
            id: "h-1",
            name: "Morning meditation",
            period_type: "daily",
            direction: "at_least",
            created_at: "2026-01-01T00:00:00Z",
          },
        ]);
      }
      return Promise.resolve([]); // logs + nudges
    });

    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Morning meditation")).toBeInTheDocument();
    });
  });

  it("does not show nudge strip when no stale habits", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const Wrapper = createWrapper();
    render(<HomePage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.queryByText(/nudges/i)).not.toBeInTheDocument();
    });
  });
});
