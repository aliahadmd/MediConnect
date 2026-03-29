import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { BookingStepper } from "@/components/appointments/booking-stepper";

const mockDoctors = [
  {
    id: "doc-1",
    name: "Alice Smith",
    email: "alice@test.com",
    specialization: "Cardiology",
    profileComplete: true,
    yearsOfExperience: 10,
    consultationFee: "50.00",
  },
];

const mockSlots = [
  {
    id: "slot-1",
    doctorId: "doc-1",
    date: "2025-03-15",
    startTime: "09:00:00",
    endTime: "09:30:00",
    isBooked: false,
    createdAt: "2025-01-01T00:00:00Z",
  },
];

function mockFetchWith(responses: Record<string, unknown>) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/doctors")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses.doctors ?? []),
      });
    }
    if (url.includes("/api/availability")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses.slots ?? []),
      });
    }
    if (url.includes("/api/appointments")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            responses.appointment ?? {
              id: "apt-1",
              status: "pending_approval",
              scheduledAt: "2025-03-15T09:00:00Z",
            }
          ),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
}

describe("BookingStepper — Kiosk Styling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step indicators with h-10 w-10 sizing", async () => {
    mockFetchWith({ doctors: mockDoctors });
    const { container } = render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByTestId("booking-step-indicator")).toBeDefined();
    });

    const stepCircles = container.querySelectorAll(
      '[data-testid="booking-step-indicator"] .h-10.w-10'
    );
    expect(stepCircles.length).toBe(3);
  });

  it("renders connecting line between steps via border-t-2", async () => {
    mockFetchWith({ doctors: mockDoctors });
    const { container } = render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByTestId("booking-step-indicator")).toBeDefined();
    });

    const lines = container.querySelectorAll(
      '[data-testid="booking-step-indicator"] .border-t-2'
    );
    expect(lines.length).toBe(2); // 2 connecting lines between 3 steps
  });

  it("renders engagement copy for step 0 (Select Doctor)", async () => {
    mockFetchWith({ doctors: mockDoctors });
    render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByTestId("booking-engagement-copy")).toBeDefined();
    });

    expect(screen.getByTestId("booking-engagement-copy").textContent).toBe(
      "Choose a doctor you trust — browse specializations and reviews"
    );
  });

  it("renders engagement copy for step 1 (Select Slot) after selecting a doctor", async () => {
    mockFetchWith({ doctors: mockDoctors, slots: mockSlots });
    render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    // Click on the doctor card
    fireEvent.click(screen.getByText("Alice Smith"));

    await waitFor(() => {
      expect(screen.getByTestId("booking-engagement-copy").textContent).toBe(
        "Pick a time that works for you — all times shown in your local timezone"
      );
    });
  });

  it("renders engagement copy for step 2 (Confirm) after selecting a slot", async () => {
    mockFetchWith({ doctors: mockDoctors, slots: mockSlots });
    render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Alice Smith"));

    await waitFor(() => {
      expect(screen.getByText("09:00 – 09:30")).toBeDefined();
    });

    fireEvent.click(screen.getByText("09:00 – 09:30"));

    await waitFor(() => {
      expect(screen.getByTestId("booking-engagement-copy").textContent).toBe(
        "Review your booking details and confirm your appointment"
      );
    });
  });

  it("renders success state with CalendarIllustration and celebratory copy", async () => {
    mockFetchWith({ doctors: mockDoctors, slots: mockSlots });
    const { container } = render(<BookingStepper />);

    // Navigate to confirm step
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Alice Smith"));

    await waitFor(() => {
      expect(screen.getByText("09:00 – 09:30")).toBeDefined();
    });
    fireEvent.click(screen.getByText("09:00 – 09:30"));

    await waitFor(() => {
      expect(screen.getByText("Confirm Booking")).toBeDefined();
    });
    fireEvent.click(screen.getByText("Confirm Booking"));

    await waitFor(() => {
      expect(screen.getByTestId("booking-success")).toBeDefined();
    });

    const successEl = screen.getByTestId("booking-success");
    // Should contain an SVG illustration (CalendarIllustration)
    const svg = successEl.querySelector("svg");
    expect(svg).not.toBeNull();

    // Should contain celebratory copy
    expect(screen.getByText("Your appointment is confirmed!")).toBeDefined();
    expect(
      screen.getByText(
        "You'll receive a notification when your doctor is ready"
      )
    ).toBeDefined();
  });

  it("renders empty doctors state with illustration and guidance copy", async () => {
    mockFetchWith({ doctors: [] });
    const { container } = render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByTestId("booking-empty-doctors")).toBeDefined();
    });

    const emptyEl = screen.getByTestId("booking-empty-doctors");
    const svg = emptyEl.querySelector("svg");
    expect(svg).not.toBeNull();

    expect(screen.getByText("No doctors available yet")).toBeDefined();
    expect(
      screen.getByText(
        "Doctors will appear once they set up their availability"
      )
    ).toBeDefined();
  });

  it("renders empty slots state with illustration and guidance copy", async () => {
    mockFetchWith({ doctors: mockDoctors, slots: [] });
    render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Alice Smith"));

    await waitFor(() => {
      expect(screen.getByTestId("booking-empty-slots")).toBeDefined();
    });

    const emptyEl = screen.getByTestId("booking-empty-slots");
    const svg = emptyEl.querySelector("svg");
    expect(svg).not.toBeNull();

    expect(screen.getByText("No available slots")).toBeDefined();
    expect(
      screen.getByText(
        "Try selecting a different doctor or check back later"
      )
    ).toBeDefined();
  });

  it("doctor cards have min-h-[44px] touch target and hover styling", async () => {
    mockFetchWith({ doctors: mockDoctors });
    render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    const doctorButton = screen.getByText("Alice Smith").closest("button");
    expect(doctorButton).not.toBeNull();
    expect(doctorButton!.className).toContain("min-h-[44px]");
    expect(doctorButton!.className).toContain("hover:shadow-md");
    expect(doctorButton!.className).toContain("hover:-translate-y-0.5");
    expect(doctorButton!.className).toContain("transition-all");
  });

  it("time slot buttons have min-h-[44px] min-w-[44px] touch targets", async () => {
    mockFetchWith({ doctors: mockDoctors, slots: mockSlots });
    render(<BookingStepper />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Alice Smith"));

    await waitFor(() => {
      expect(screen.getByText("09:00 – 09:30")).toBeDefined();
    });

    const slotButton = screen.getByText("09:00 – 09:30").closest("button");
    expect(slotButton).not.toBeNull();
    expect(slotButton!.className).toContain("min-h-[44px]");
    expect(slotButton!.className).toContain("min-w-[44px]");
  });
});
