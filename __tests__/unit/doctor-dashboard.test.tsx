import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock @/lib/auth — doctor session
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "doc-1", name: "Dr. Smith", role: "doctor" },
      }),
    },
  },
}));

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock PatientProfileViewer to avoid heavy dependencies
vi.mock("@/components/profiles/patient-profile-viewer", () => ({
  PatientProfileViewer: () => <div data-testid="patient-profile-viewer" />,
}));

import DoctorAppointmentsPage from "@/app/(dashboard)/doctor/appointments/page";
import { DoctorAppointmentList } from "@/components/appointments/doctor-appointment-list";

async function renderDoctorPage() {
  const jsx = await DoctorAppointmentsPage();
  return render(jsx);
}

describe("Doctor Appointments Page (Task 8.1)", () => {
  it("renders header with SVG illustration and engagement copy", async () => {
    // Mock fetch for the child DoctorAppointmentList
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await renderDoctorPage();

    const header = screen.getByTestId("doctor-header");
    expect(header).toBeDefined();

    // Should contain an SVG illustration
    const svg = header.querySelector("svg");
    expect(svg).not.toBeNull();

    // Should contain engagement copy
    expect(screen.getByText("Your patients are counting on you")).toBeDefined();
    expect(screen.getByText("Manage your schedule with ease")).toBeDefined();
  });
});

describe("DoctorAppointmentList empty state (Task 8.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state with SVG illustration and engagement copy when no appointments", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<DoctorAppointmentList />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-doctor-appointments")).toBeDefined();
    });

    const emptyState = screen.getByTestId("empty-doctor-appointments");

    // Should contain an SVG illustration
    const svg = emptyState.querySelector("svg");
    expect(svg).not.toBeNull();

    // Should contain engagement copy
    expect(screen.getByText("No appointments yet")).toBeDefined();
    expect(
      screen.getByText("Set up your availability to start receiving patient bookings")
    ).toBeDefined();
  });
});
