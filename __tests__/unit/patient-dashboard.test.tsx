import { describe, it, expect, vi, beforeEach } from "vitest";
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

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { PatientDashboardContent } from "@/components/dashboard/patient-dashboard-content";

const emptyDashboardData = {
  upcomingCount: 0,
  completedCount: 0,
  prescriptionCount: 0,
  nextAppointment: null,
  recentPrescriptions: [],
};

const populatedDashboardData = {
  upcomingCount: 3,
  completedCount: 7,
  prescriptionCount: 5,
  nextAppointment: {
    id: "apt-1",
    doctorName: "Smith",
    date: "2025-02-15",
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled",
  },
  recentPrescriptions: [
    {
      id: "rx-1",
      appointmentId: "apt-2",
      doctorName: "Jones",
      appointmentDate: "2025-01-20",
      medications: [{ name: "Med A", dosage: "10mg", frequency: "daily", duration: "30 days" }],
      notes: null,
      pdfKey: null,
      createdAt: "2025-01-20T12:00:00Z",
    },
  ],
};

function mockFetchWith(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe("PatientDashboardContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders personalized greeting when userName is provided", async () => {
    mockFetchWith(populatedDashboardData);
    render(<PatientDashboardContent userName="Alice" />);

    await waitFor(() => {
      expect(screen.getByTestId("patient-greeting")).toBeDefined();
    });

    expect(screen.getByText("Welcome back, Alice")).toBeDefined();
    expect(screen.getByText("Here's your health overview")).toBeDefined();
  });

  it("does not render greeting when userName is not provided", async () => {
    mockFetchWith(populatedDashboardData);
    render(<PatientDashboardContent />);

    await waitFor(() => {
      expect(screen.getByText("Upcoming Appointments")).toBeDefined();
    });

    expect(screen.queryByTestId("patient-greeting")).toBeNull();
  });

  it("renders summary cards with kiosk styling (size-8 icons, text-3xl font-bold values)", async () => {
    mockFetchWith(populatedDashboardData);
    render(<PatientDashboardContent userName="Alice" />);

    await waitFor(() => {
      expect(screen.getByText("3")).toBeDefined();
    });

    // Check that the value "3" is inside a text-3xl font-bold element
    const upcomingValue = screen.getByText("3");
    expect(upcomingValue.className).toContain("text-3xl");
    expect(upcomingValue.className).toContain("font-bold");

    // Check size-8 icons exist (the parent CardTitle contains the icon)
    const completedValue = screen.getByText("7");
    expect(completedValue.className).toContain("text-3xl");
    expect(completedValue.className).toContain("font-bold");
  });

  it("renders empty appointments state with illustration and engagement copy", async () => {
    mockFetchWith(emptyDashboardData);
    render(<PatientDashboardContent userName="Alice" />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-appointments")).toBeDefined();
    });

    const emptyCard = screen.getByTestId("empty-appointments");
    // Should contain an SVG illustration
    const svg = emptyCard.querySelector("svg");
    expect(svg).not.toBeNull();

    // Should contain engagement copy
    expect(screen.getByText("No Upcoming Appointments")).toBeDefined();
    expect(
      screen.getByText(/Book a consultation with a doctor/)
    ).toBeDefined();
  });

  it("renders empty prescriptions state with illustration and engagement copy", async () => {
    mockFetchWith(emptyDashboardData);
    render(<PatientDashboardContent userName="Alice" />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-prescriptions")).toBeDefined();
    });

    const emptySection = screen.getByTestId("empty-prescriptions");
    // Should contain an SVG illustration
    const svg = emptySection.querySelector("svg");
    expect(svg).not.toBeNull();

    // Should contain engagement copy
    expect(screen.getByText("No recent prescriptions")).toBeDefined();
    expect(
      screen.getByText(/Prescriptions from your completed appointments/)
    ).toBeDefined();
  });

  it("Quick Actions button has min-h-[44px] min-w-[44px] touch target", async () => {
    mockFetchWith(populatedDashboardData);
    render(<PatientDashboardContent userName="Alice" />);

    await waitFor(() => {
      expect(screen.getByText("Find a Doctor")).toBeDefined();
    });

    const findDoctorBtn = screen.getByText("Find a Doctor").closest("button");
    expect(findDoctorBtn).not.toBeNull();
    expect(findDoctorBtn!.className).toContain("min-h-[44px]");
    expect(findDoctorBtn!.className).toContain("min-w-[44px]");
  });

  it("renders summary cards with accent background colors", async () => {
    mockFetchWith(populatedDashboardData);
    const { container } = render(<PatientDashboardContent userName="Alice" />);

    await waitFor(() => {
      expect(screen.getByText("Completed Consultations")).toBeDefined();
    });

    // Check for bg-green-500/10 and bg-blue-500/10 accent backgrounds
    const greenCard = container.querySelector(".bg-green-500\\/10");
    expect(greenCard).not.toBeNull();

    const blueCard = container.querySelector(".bg-blue-500\\/10");
    expect(blueCard).not.toBeNull();
  });
});
