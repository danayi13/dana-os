/**
 * HabitChecklist tests.
 *
 * - Renders loading state
 * - Renders empty state
 * - Renders habits from API
 * - Shows done state for logged habits
 * - Logs a binary habit on click
 * - Opens log modal for numeric habits
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HabitChecklist } from "./HabitChecklist";
import { createWrapper } from "@/test/test-utils";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ id: "log-1", habit_id: "h-1", date: "2026-04-22", value: 1 }),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockHabits = [
  {
    id: "h-1",
    name: "Morning meditation",
    description: "10 minutes",
    period_type: "daily",
    direction: "at_least",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "h-2",
    name: "Running",
    unit: "km",
    target: 5,
    period_type: "daily",
    direction: "at_least",
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("HabitChecklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a loading state initially", () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {})); // never resolves
    const Wrapper = createWrapper();
    render(<HabitChecklist />, { wrapper: Wrapper });

    expect(screen.getByText(/loading habits/i)).toBeInTheDocument();
  });

  it("renders empty state when no habits exist", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const Wrapper = createWrapper();
    render(<HabitChecklist />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/no habits yet/i)).toBeInTheDocument();
    });
  });

  it("renders habit names from the API", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === "/habits") return Promise.resolve(mockHabits);
      return Promise.resolve([]); // today's logs for each habit
    });

    const Wrapper = createWrapper();
    render(<HabitChecklist />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Morning meditation")).toBeInTheDocument();
      expect(screen.getByText("Running")).toBeInTheDocument();
    });
  });

  it("logs a binary habit immediately on click", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === "/habits") return Promise.resolve([mockHabits[0]]);
      return Promise.resolve([]); // no logs yet
    });
    vi.mocked(api.post).mockResolvedValue({
      id: "log-1",
      habit_id: "h-1",
      date: "2026-04-22",
      value: 1,
    });

    const Wrapper = createWrapper();
    render(<HabitChecklist />, { wrapper: Wrapper });

    const checkBtn = await screen.findByRole("button", { name: /mark as done/i });
    await userEvent.click(checkBtn);

    expect(api.post).toHaveBeenCalledWith(
      "/habits/h-1/logs",
      expect.objectContaining({ value: 1 })
    );
  });

  it("shows an inline input for numeric (unit-based) habits", async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === "/habits") return Promise.resolve([mockHabits[1]]); // Running
      return Promise.resolve([]);
    });

    const Wrapper = createWrapper();
    render(<HabitChecklist />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    // Numeric habits render an inline number input — no dialog needed
    await waitFor(() => {
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /log/i })).toBeInTheDocument();
  });

  it("renders compact mode with limit", async () => {
    const threeHabits = [
      ...mockHabits,
      { id: "h-3", name: "Reading", period_type: "daily", direction: "at_least", created_at: "2026-01-01T00:00:00Z" },
    ];
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === "/habits") return Promise.resolve(threeHabits);
      return Promise.resolve([]);
    });

    const Wrapper = createWrapper();
    render(<HabitChecklist compact limit={2} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Morning meditation")).toBeInTheDocument();
    });
    expect(screen.getByText(/\+1 more/i)).toBeInTheDocument();
  });
});
