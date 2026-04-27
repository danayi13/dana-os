/**
 * HabitsPage tests — tab navigation and section rendering.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HabitsPage } from "./HabitsPage";
import { createWrapper } from "@/test/test-utils";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("HabitsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four tabs", () => {
    const Wrapper = createWrapper();
    render(<HabitsPage />, { wrapper: Wrapper });

    expect(screen.getByRole("tab", { name: "Manage" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Backfill" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Goals" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Charts" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Today" })).not.toBeInTheDocument();
  });

  it("defaults to the Charts tab", async () => {
    const Wrapper = createWrapper();
    render(<HabitsPage />, { wrapper: Wrapper });

    expect(screen.getByRole("tab", { name: "Charts" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches to Backfill tab on click", async () => {
    const Wrapper = createWrapper();
    render(<HabitsPage />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole("tab", { name: "Backfill" }));
    expect(screen.getByRole("tab", { name: "Backfill" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(screen.getByText(/show last/i)).toBeInTheDocument());
  });

  it("switches to Goals tab on click", async () => {
    const Wrapper = createWrapper();
    render(<HabitsPage />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole("tab", { name: "Goals" }));
    expect(screen.getByRole("tab", { name: "Goals" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /new goal/i })).toBeInTheDocument();
  });
});
