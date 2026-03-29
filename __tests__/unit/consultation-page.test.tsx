import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => <div {...filterMotionProps(props)}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

function filterMotionProps(props: Record<string, unknown>) {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (
      ![
        "variants",
        "initial",
        "animate",
        "exit",
        "whileHover",
        "whileTap",
        "transition",
      ].includes(key)
    ) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Mock illustrations
vi.mock("@/components/illustrations", () => ({
  VideoCallIllustration: ({
    size,
    className,
  }: {
    size?: number;
    className?: string;
  }) => (
    <svg
      data-testid="video-call-illustration"
      width={size}
      height={size}
      className={className}
    />
  ),
  ConsultationCompleteIllustration: ({
    size,
    className,
  }: {
    size?: number;
    className?: string;
  }) => (
    <svg
      data-testid="consultation-complete-illustration"
      width={size}
      height={size}
      className={className}
    />
  ),
  ConnectionErrorIllustration: ({
    size,
    className,
  }: {
    size?: number;
    className?: string;
  }) => (
    <svg
      data-testid="connection-error-illustration"
      width={size}
      height={size}
      className={className}
    />
  ),
}));

// Mock LiveKit components
vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="livekit-room">{children}</div>
  ),
  VideoConference: () => <div data-testid="video-conference" />,
  RoomAudioRenderer: () => null,
  useRoomContext: () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock("@livekit/components-styles", () => ({}));

vi.mock("livekit-client", () => ({
  RoomEvent: { ConnectionQualityChanged: "connectionQualityChanged" },
  ConnectionQuality: { Good: 0, Fair: 1, Poor: 2 },
}));

// Mock sub-components that aren't relevant to these tests
vi.mock("@/components/consultation/notes-panel", () => ({
  NotesPanel: () => <div data-testid="notes-panel" />,
}));
vi.mock("@/components/consultation/connection-state-indicator", () => ({
  ConnectionStateIndicator: () => <div data-testid="connection-state-indicator" />,
}));
vi.mock("@/components/consultation/reconnection-overlay", () => ({
  ReconnectionOverlay: () => <div data-testid="reconnection-overlay" />,
}));
vi.mock("@/components/consultation/call-quality-monitor", () => ({
  CallQualityMonitor: () => <div data-testid="call-quality-monitor" />,
}));

import { VideoRoom } from "@/components/consultation/video-room";

const defaultProps = {
  appointmentId: "apt-123",
  isDoctor: false,
  status: "confirmed",
  scheduledAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 min from now (within join window)
  slotDate: "2025-01-15",
  slotStartTime: "10:00",
  slotEndTime: "10:30",
};

describe("VideoRoom — Kiosk Styling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Idle state (pre-join)", () => {
    it("renders consultation-idle container with data-testid", () => {
      render(<VideoRoom {...defaultProps} />);
      expect(screen.getByTestId("consultation-idle")).toBeDefined();
    });

    it("renders VideoCallIllustration with size 120", () => {
      render(<VideoRoom {...defaultProps} />);
      const svg = screen.getByTestId("video-call-illustration");
      expect(svg).toBeDefined();
      expect(svg.getAttribute("width")).toBe("120");
      expect(svg.getAttribute("height")).toBe("120");
    });

    it("renders engagement copy — primary message", () => {
      render(<VideoRoom {...defaultProps} />);
      expect(
        screen.getByText("Ready for your consultation")
      ).toBeDefined();
    });

    it("renders engagement copy — secondary message", () => {
      render(<VideoRoom {...defaultProps} />);
      expect(
        screen.getByText(
          "Click below to join your video session with your doctor"
        )
      ).toBeDefined();
    });

    it("renders Join Consultation button with min-h-[44px] min-w-[44px]", () => {
      render(<VideoRoom {...defaultProps} />);
      const button = screen.getByRole("button", {
        name: /Join Consultation/,
      });
      expect(button).toBeDefined();
      expect(button.className).toContain("min-h-[44px]");
      expect(button.className).toContain("min-w-[44px]");
    });

    it("renders slot time information", () => {
      render(<VideoRoom {...defaultProps} />);
      expect(screen.getByText(/10:00 AM/)).toBeDefined();
      expect(screen.getByText(/10:30 AM/)).toBeDefined();
    });
  });

  describe("Disconnected state", () => {
    it("renders disconnected state after failed join attempt", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<VideoRoom {...defaultProps} />);

      // Click Join to trigger the flow
      const joinButton = screen.getByRole("button", {
        name: /Join Consultation/,
      });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByTestId("consultation-disconnected")).toBeDefined();
      });
    });

    it("renders ConnectionErrorIllustration with size 120", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<VideoRoom {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      await waitFor(() => {
        const svg = screen.getByTestId("connection-error-illustration");
        expect(svg).toBeDefined();
        expect(svg.getAttribute("width")).toBe("120");
      });
    });

    it("renders reassuring engagement copy — primary message", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<VideoRoom {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      await waitFor(() => {
        expect(screen.getByText("Connection lost")).toBeDefined();
      });
    });

    it("renders reassuring engagement copy — secondary message", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<VideoRoom {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            /Don't worry — this happens sometimes\. Try reconnecting or check your internet connection\./
          )
        ).toBeDefined();
      });
    });

    it("renders Retry Connection button", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      render(<VideoRoom {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Retry Connection/ })
        ).toBeDefined();
      });
    });
  });

  describe("Ended state", () => {
    it("renders ended state after successful join and end call", async () => {
      // First fetch succeeds (join), second fetch succeeds (end call)
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              token: "test-token",
              serverUrl: "wss://test.livekit.cloud",
            }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<VideoRoom {...defaultProps} />);

      // Join the consultation
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      // Wait for connected state (LiveKit room renders)
      await waitFor(() => {
        expect(screen.getByTestId("livekit-room")).toBeDefined();
      });

      // Click End Call
      const endButton = screen.getByRole("button", { name: /End Call/ });
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(screen.getByTestId("consultation-ended")).toBeDefined();
      });
    });

    it("renders ConsultationCompleteIllustration with size 120", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              token: "test-token",
              serverUrl: "wss://test.livekit.cloud",
            }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<VideoRoom {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      await waitFor(() => {
        expect(screen.getByTestId("livekit-room")).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /End Call/ }));

      await waitFor(() => {
        const svg = screen.getByTestId("consultation-complete-illustration");
        expect(svg).toBeDefined();
        expect(svg.getAttribute("width")).toBe("120");
      });
    });

    it("renders thank-you engagement copy — primary message", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              token: "test-token",
              serverUrl: "wss://test.livekit.cloud",
            }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<VideoRoom {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      await waitFor(() => {
        expect(screen.getByTestId("livekit-room")).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /End Call/ }));

      await waitFor(() => {
        expect(screen.getByText("Consultation complete")).toBeDefined();
      });
    });

    it("renders thank-you engagement copy — secondary message with next steps", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              token: "test-token",
              serverUrl: "wss://test.livekit.cloud",
            }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<VideoRoom {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      await waitFor(() => {
        expect(screen.getByTestId("livekit-room")).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /End Call/ }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "Thank you for your visit. Check your prescriptions or leave a review for your doctor."
          )
        ).toBeDefined();
      });
    });

    it("renders Back to Appointments link in ended state", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              token: "test-token",
              serverUrl: "wss://test.livekit.cloud",
            }),
        })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      render(<VideoRoom {...defaultProps} />);
      fireEvent.click(
        screen.getByRole("button", { name: /Join Consultation/ })
      );

      await waitFor(() => {
        expect(screen.getByTestId("livekit-room")).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /End Call/ }));

      await waitFor(() => {
        const link = screen.getByText("Back to Appointments");
        expect(link).toBeDefined();
        expect(link.closest("a")?.getAttribute("href")).toBe(
          "/patient/appointments"
        );
      });
    });
  });
});
