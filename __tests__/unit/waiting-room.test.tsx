import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// Mock framer-motion to render plain divs
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
      !["variants", "initial", "animate", "exit", "whileHover", "whileTap", "transition"].includes(key)
    ) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Mock illustrations
vi.mock("@/components/illustrations", () => ({
  WaitingIllustration: ({ size, className }: { size?: number; className?: string }) => (
    <svg data-testid="waiting-illustration" width={size} height={size} className={className} />
  ),
}));

import { WaitingRoom } from "@/components/consultation/waiting-room";

function mockFetchStatus(data: { queuePosition: number; doctorReady: boolean }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe("WaitingRoom — Kiosk Styling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Waiting state (doctor not ready)", () => {
    it("renders waiting-state container with data-testid", async () => {
      mockFetchStatus({ queuePosition: 3, doctorReady: false });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("waiting-state")).toBeDefined();
      });
    });

    it("renders WaitingIllustration in waiting state", async () => {
      mockFetchStatus({ queuePosition: 3, doctorReady: false });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("waiting-illustration")).toBeDefined();
      });

      const svg = screen.getByTestId("waiting-illustration");
      expect(svg.getAttribute("width")).toBe("120");
    });

    it("renders calming engagement copy — primary message", async () => {
      mockFetchStatus({ queuePosition: 3, doctorReady: false });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByText("Your doctor will be with you shortly")).toBeDefined();
      });
    });

    it("renders calming engagement copy — secondary message", async () => {
      mockFetchStatus({ queuePosition: 3, doctorReady: false });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Relax and prepare for your consultation. You'll be notified when your doctor is ready."
          )
        ).toBeDefined();
      });
    });

    it("renders queue position with text-6xl font-black typography", async () => {
      mockFetchStatus({ queuePosition: 5, doctorReady: false });
      const { container } = render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByText("5")).toBeDefined();
      });

      const queueEl = screen.getByText("5");
      expect(queueEl.className).toContain("text-6xl");
      expect(queueEl.className).toContain("font-black");
    });

    it("does not render doctor-ready-state in waiting state", async () => {
      mockFetchStatus({ queuePosition: 3, doctorReady: false });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("waiting-state")).toBeDefined();
      });

      expect(screen.queryByTestId("doctor-ready-state")).toBeNull();
    });
  });

  describe("Doctor-ready state", () => {
    it("renders doctor-ready-state container with data-testid", async () => {
      mockFetchStatus({ queuePosition: 1, doctorReady: true });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("doctor-ready-state")).toBeDefined();
      });
    });

    it("renders engagement copy — doctor ready primary message", async () => {
      mockFetchStatus({ queuePosition: 1, doctorReady: true });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByText("Your doctor is ready to see you")).toBeDefined();
      });
    });

    it("renders engagement copy — doctor ready secondary message", async () => {
      mockFetchStatus({ queuePosition: 1, doctorReady: true });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(
          screen.getByText("Click the button below to join your consultation")
        ).toBeDefined();
      });
    });

    it("renders Join Now button with min-h-[44px] min-w-[44px] touch targets", async () => {
      mockFetchStatus({ queuePosition: 1, doctorReady: true });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Join Now/)).toBeDefined();
      });

      const joinLink = screen.getByText(/Join Now/).closest("a");
      expect(joinLink).not.toBeNull();
      expect(joinLink!.className).toContain("min-h-[44px]");
      expect(joinLink!.className).toContain("min-w-[44px]");
    });

    it("does not render waiting-state in doctor-ready state", async () => {
      mockFetchStatus({ queuePosition: 1, doctorReady: true });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByTestId("doctor-ready-state")).toBeDefined();
      });

      expect(screen.queryByTestId("waiting-state")).toBeNull();
    });

    it("renders queue position with text-6xl font-black in doctor-ready state", async () => {
      mockFetchStatus({ queuePosition: 1, doctorReady: true });
      render(<WaitingRoom appointmentId="apt-1" />);

      await waitFor(() => {
        expect(screen.getByText("1")).toBeDefined();
      });

      const queueEl = screen.getByText("1");
      expect(queueEl.className).toContain("text-6xl");
      expect(queueEl.className).toContain("font-black");
    });
  });
});
