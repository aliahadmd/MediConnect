import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionStateIndicator } from "@/components/consultation/connection-state-indicator";
import type { ConnectionState } from "@/lib/video-state-machine";

describe("ConnectionStateIndicator", () => {
  it("renders idle state with gray dot", () => {
    const { container } = render(<ConnectionStateIndicator state="idle" />);
    expect(screen.getByText("Idle")).toBeDefined();
    const dot = container.querySelector("span.bg-gray-400");
    expect(dot).not.toBeNull();
  });

  it("renders connecting state with pulsing gray dot", () => {
    const { container } = render(<ConnectionStateIndicator state="connecting" />);
    expect(screen.getByText("Connecting")).toBeDefined();
    const dot = container.querySelector("span.animate-pulse");
    expect(dot).not.toBeNull();
  });

  it("renders connected state with green dot", () => {
    const { container } = render(<ConnectionStateIndicator state="connected" />);
    expect(screen.getByText("Connected")).toBeDefined();
    const dot = container.querySelector("span.bg-green-500");
    expect(dot).not.toBeNull();
  });

  it("renders disconnected state with red dot", () => {
    const { container } = render(<ConnectionStateIndicator state="disconnected" />);
    expect(screen.getByText("Disconnected")).toBeDefined();
    const dot = container.querySelector("span.bg-red-500");
    expect(dot).not.toBeNull();
  });

  it("renders reconnecting state with pulsing red dot", () => {
    const { container } = render(<ConnectionStateIndicator state="reconnecting" />);
    expect(screen.getByText("Reconnecting")).toBeDefined();
    const dot = container.querySelector("span.bg-red-500.animate-pulse");
    expect(dot).not.toBeNull();
  });

  it("shows quality label when connected with quality", () => {
    render(<ConnectionStateIndicator state="connected" quality="good" />);
    expect(screen.getByText("Connected")).toBeDefined();
    expect(screen.getByText("· Good")).toBeDefined();
  });

  it("shows quality label when in poor_connection state", () => {
    render(<ConnectionStateIndicator state="poor_connection" quality="poor" />);
    expect(screen.getByText("Poor Connection")).toBeDefined();
    expect(screen.getByText("· Poor")).toBeDefined();
  });

  it("uses yellow dot for fair quality when connected", () => {
    const { container } = render(
      <ConnectionStateIndicator state="connected" quality="fair" />
    );
    expect(screen.getByText("· Fair")).toBeDefined();
    const dot = container.querySelector("span.bg-yellow-500");
    expect(dot).not.toBeNull();
  });

  it("does not show quality label for non-connected states", () => {
    render(<ConnectionStateIndicator state="idle" quality="good" />);
    expect(screen.getByText("Idle")).toBeDefined();
    expect(screen.queryByText("· Good")).toBeNull();
  });

  it("renders all valid states without errors", () => {
    const states: ConnectionState[] = [
      "idle", "connecting", "connected", "poor_connection",
      "reconnecting", "disconnected", "ended",
    ];
    for (const state of states) {
      const { unmount } = render(<ConnectionStateIndicator state={state} />);
      unmount();
    }
  });
});
