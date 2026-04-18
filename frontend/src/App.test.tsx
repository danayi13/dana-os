/**
 * Shell smoke test — verifies the app mounts without crashing and key
 * shell elements render. This catches broken imports or provider wiring
 * before any feature code is written.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("App shell", () => {
  it("renders the sidebar brand name", () => {
    render(<App />);
    expect(screen.getByText("Dana OS")).toBeInTheDocument();
  });

  it("renders the search trigger in the header", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /search entire app/i })).toBeInTheDocument();
  });

  it("renders the sidebar toggle button in the header", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it("hides the sidebar when toggle is clicked", () => {
    render(<App />);
    expect(screen.getByText("Habits & Goals")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /toggle sidebar/i }));
    expect(screen.queryByText("Habits & Goals")).not.toBeInTheDocument();
  });

  it("re-shows the sidebar on second toggle click", () => {
    render(<App />);
    const btn = screen.getByRole("button", { name: /toggle sidebar/i });

    fireEvent.click(btn);
    expect(screen.queryByText("Habits & Goals")).not.toBeInTheDocument();

    fireEvent.click(btn);
    expect(screen.getByText("Habits & Goals")).toBeInTheDocument();
  });

  it("toggles the sidebar with Ctrl+B", () => {
    render(<App />);
    expect(screen.getByText("Habits & Goals")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "b", ctrlKey: true });
    expect(screen.queryByText("Habits & Goals")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "b", ctrlKey: true });
    expect(screen.getByText("Habits & Goals")).toBeInTheDocument();
  });

  it("toggles the sidebar with Cmd+B", () => {
    render(<App />);
    expect(screen.getByText("Habits & Goals")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "b", metaKey: true });
    expect(screen.queryByText("Habits & Goals")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "b", metaKey: true });
    expect(screen.getByText("Habits & Goals")).toBeInTheDocument();
  });

  it("renders the Home nav link", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: /^home$/i })).toBeInTheDocument();
  });
});
