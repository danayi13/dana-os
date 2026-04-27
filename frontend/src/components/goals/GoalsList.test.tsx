/**
 * GoalsList tests.
 *
 * - Renders loading state
 * - Renders binary and milestone goals
 * - Marks binary goal complete with confirmation dialog
 * - Progress bar renders for milestone goals
 * - Create goal dialog opens
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoalsList } from "./GoalsList";
import { createWrapper } from "@/test/test-utils";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
  },
}));

const mockGoals = [
  {
    id: "g-1",
    year: 2026,
    type: "binary",
    name: "Learn to cook 5 new recipes",
    direction: "at_least",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "g-2",
    year: 2026,
    type: "milestone",
    name: "Read 12 books",
    direction: "at_least",
    target_value: 12,
    current_value: 3,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("GoalsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state", () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    const Wrapper = createWrapper();
    render(<GoalsList />, { wrapper: Wrapper });
    expect(screen.getByText(/loading goals/i)).toBeInTheDocument();
  });

  it("renders binary and milestone goals", async () => {
    vi.mocked(api.get).mockResolvedValue(mockGoals);
    const Wrapper = createWrapper();
    render(<GoalsList />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Learn to cook 5 new recipes")).toBeInTheDocument();
      expect(screen.getByText("Read 12 books")).toBeInTheDocument();
    });

    expect(screen.getByText(/yes \/ no goals/i)).toBeInTheDocument();
    expect(screen.getByText(/milestone goals/i)).toBeInTheDocument();
  });

  it("shows a progress bar for milestone goals", async () => {
    vi.mocked(api.get).mockResolvedValue([mockGoals[1]]);
    const Wrapper = createWrapper();
    render(<GoalsList />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Read 12 books")).toBeInTheDocument();
    });

    // Shows current/target
    expect(screen.getByText("3 / 12")).toBeInTheDocument();
    // Shows percentage (3/12 = 25%)
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("requires confirmation before marking a binary goal complete", async () => {
    vi.mocked(api.get).mockResolvedValue([mockGoals[0]]);
    const Wrapper = createWrapper();
    render(<GoalsList />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Learn to cook 5 new recipes")).toBeInTheDocument();
    });

    // Click the circle checkbox
    const circleBtn = screen.getByRole("button", { name: /mark complete/i });
    await userEvent.click(circleBtn);

    // Confirmation dialog should appear, not call API yet
    expect(screen.getByText(/mark goal complete\?/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("calls API when user confirms goal completion", async () => {
    vi.mocked(api.get).mockResolvedValue([mockGoals[0]]);
    vi.mocked(api.post).mockResolvedValue({ ...mockGoals[0], status: "completed" });
    const Wrapper = createWrapper();
    render(<GoalsList />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Learn to cook 5 new recipes")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /mark complete/i }));
    await userEvent.click(screen.getByRole("button", { name: /mark complete ✓/i }));

    expect(api.post).toHaveBeenCalledWith("/goals/g-1/complete");
  });

  it("opens create goal dialog when New goal is clicked", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const Wrapper = createWrapper();
    render(<GoalsList />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /new goal/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /new goal/i }));
    // Both button and dialog title will say "New goal"; the form input confirms the dialog is open
    expect(screen.getByPlaceholderText(/e.g. Read 12 books/i)).toBeInTheDocument();
  });

  it("shows empty state when no goals for selected year", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    const Wrapper = createWrapper();
    render(<GoalsList />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/no goals for \d{4}/i)).toBeInTheDocument();
    });
  });
});
