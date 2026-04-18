/**
 * Command palette tests.
 *
 * - Cmd+K / Ctrl+K opens the palette
 * - Header trigger opens the palette
 * - Escape closes
 * - Overlay click closes
 * - Commands are shown + filtered by search text
 */
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("Command palette", () => {
  it("is closed on initial render", () => {
    render(<App />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens when Cmd+K is pressed", async () => {
    render(<App />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("opens when Ctrl+K is pressed", async () => {
    render(<App />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("opens when the header trigger button is clicked", async () => {
    render(<App />);
    const trigger = screen.getByRole("button", { name: /search entire app/i });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    render(<App />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when overlay is clicked", async () => {
    render(<App />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const overlay = await screen.findByRole("dialog");

    fireEvent.click(overlay);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows navigation commands when open", async () => {
    render(<App />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const dialog = await screen.findByRole("dialog");
    const pal = within(dialog);

    expect(pal.getByText("Habits & Goals")).toBeInTheDocument();
    expect(pal.getByText("Climbing")).toBeInTheDocument();
  });

  it("filters commands by search text", async () => {
    render(<App />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const dialog = await screen.findByRole("dialog");
    const pal = within(dialog);

    const input = pal.getByPlaceholderText("Go to…");
    await userEvent.type(input, "climb");

    expect(pal.getByText("Climbing")).toBeInTheDocument();
    expect(pal.queryByText("Habits & Goals")).not.toBeInTheDocument();
  });

  it("shows Home in the navigation commands", async () => {
    render(<App />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const dialog = await screen.findByRole("dialog");
    const pal = within(dialog);

    const input = pal.getByPlaceholderText("Go to…");
    await userEvent.type(input, "home");

    expect(pal.getByText("Home")).toBeInTheDocument();
  });
});
