import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReconnectionOverlay } from "@/components/consultation/reconnection-overlay";

describe("ReconnectionOverlay", () => {
  const baseProps = {
    disconnectedAt: new Date(),
    reconnectAttempts: 0,
    isTimedOut: false,
    onRetry: vi.fn(),
  };

  it("renders 'Reconnecting...' when not timed out", () => {
    render(<ReconnectionOverlay {...baseProps} />);
    expect(screen.getByText("Reconnecting...")).toBeDefined();
  });

  it("displays elapsed time since disconnection", () => {
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    render(
      <ReconnectionOverlay {...baseProps} disconnectedAt={fiveSecondsAgo} />
    );
    expect(screen.getByText("Disconnected for 5s")).toBeDefined();
  });

  it("displays reconnection attempt count when attempts > 0", () => {
    render(<ReconnectionOverlay {...baseProps} reconnectAttempts={3} />);
    expect(screen.getByText("Attempt 3")).toBeDefined();
  });

  it("does not display attempt count when attempts is 0", () => {
    render(<ReconnectionOverlay {...baseProps} reconnectAttempts={0} />);
    expect(screen.queryByText(/Attempt/)).toBeNull();
  });

  it("renders 'Connection Lost' when timed out", () => {
    render(<ReconnectionOverlay {...baseProps} isTimedOut={true} />);
    expect(screen.getByText("Connection Lost")).toBeDefined();
  });

  it("shows 'Retry Connection' button when timed out", () => {
    render(<ReconnectionOverlay {...baseProps} isTimedOut={true} />);
    expect(screen.getByText("Retry Connection")).toBeDefined();
  });

  it("does not show 'Retry Connection' button when not timed out", () => {
    render(<ReconnectionOverlay {...baseProps} isTimedOut={false} />);
    expect(screen.queryByText("Retry Connection")).toBeNull();
  });

  it("calls onRetry when 'Retry Connection' button is clicked", () => {
    const onRetry = vi.fn();
    render(
      <ReconnectionOverlay {...baseProps} isTimedOut={true} onRetry={onRetry} />
    );
    fireEvent.click(screen.getByText("Retry Connection"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("updates elapsed time every second", () => {
    vi.useFakeTimers();
    const now = new Date();
    render(<ReconnectionOverlay {...baseProps} disconnectedAt={now} />);

    expect(screen.getByText("Disconnected for 0s")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Disconnected for 3s")).toBeDefined();

    vi.useRealTimers();
  });
});
