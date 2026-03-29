import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock @/lib/auth — admin session
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "admin-1", name: "Admin User", role: "admin" },
      }),
    },
  },
}));

// Mock recharts to avoid rendering issues in jsdom
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AdminAnalyticsPage from "@/app/(dashboard)/admin/analytics/page";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { UserTable } from "@/components/admin/user-table";
import { AppointmentOversight } from "@/components/admin/appointment-oversight";
import { AvailabilityManager } from "@/components/admin/availability-manager";

async function renderAnalyticsPage() {
  const jsx = await AdminAnalyticsPage();
  return render(jsx);
}

describe("Admin Analytics Page (Task 9.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          totalConsultations: 150,
          totalRevenue: 7500,
          activeDoctors: 12,
          consultationTrend: [],
        }),
    });
  });

  it("renders header with AnalyticsIllustration and engagement copy", async () => {
    await renderAnalyticsPage();

    const header = screen.getByTestId("admin-analytics-header");
    expect(header).toBeDefined();

    // Should contain an SVG illustration
    const svg = header.querySelector("svg");
    expect(svg).not.toBeNull();

    // Should contain engagement copy
    expect(screen.getByText("Platform Analytics")).toBeDefined();
    expect(screen.getByText("Monitor your platform's health and growth")).toBeDefined();
  });
});

describe("Analytics Charts kiosk stat styling (Task 9.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          totalConsultations: 150,
          totalRevenue: 7500,
          activeDoctors: 12,
          consultationTrend: [],
        }),
    });
  });

  it("renders stat cards with kiosk typography and colored accent icons", async () => {
    render(<AnalyticsCharts />);

    await waitFor(() => {
      expect(screen.getByText("150")).toBeDefined();
    });

    const statCards = screen.getByTestId("admin-stat-cards");
    expect(statCards).toBeDefined();

    // Stat values should use text-3xl font-bold
    const statValues = statCards.querySelectorAll("p.text-3xl.font-bold");
    expect(statValues.length).toBe(3);

    // Should have size-8 accent icons
    const icons = statCards.querySelectorAll("svg.size-8");
    expect(icons.length).toBe(3);

    // Should have subtle background differentiation
    const cards = statCards.querySelectorAll("[class*='bg-kiosk']");
    expect(cards.length).toBe(3);
  });
});

describe("Admin list view empty states (Task 9.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UserTable renders empty state with illustration and engagement copy", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ users: [], total: 0, page: 1, limit: 20 }),
    });

    render(<UserTable />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-admin-users")).toBeDefined();
    });

    const emptyState = screen.getByTestId("empty-admin-users");
    const svg = emptyState.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(screen.getByText("No users found")).toBeDefined();
    expect(screen.getByText("Users will appear here as they register on the platform")).toBeDefined();
  });

  it("AppointmentOversight renders empty state with illustration and engagement copy", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ appointments: [], total: 0, page: 1, limit: 20 }),
    });

    render(<AppointmentOversight />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-admin-appointments")).toBeDefined();
    });

    const emptyState = screen.getByTestId("empty-admin-appointments");
    const svg = emptyState.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(screen.getByText("No appointments found")).toBeDefined();
    expect(
      screen.getByText("Appointments will appear here once patients start booking consultations")
    ).toBeDefined();
  });

  it("AvailabilityManager renders empty state with illustration and engagement copy", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ slots: [], total: 0, page: 1, limit: 20 }),
    });

    render(<AvailabilityManager />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-admin-availability")).toBeDefined();
    });

    const emptyState = screen.getByTestId("empty-admin-availability");
    const svg = emptyState.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(screen.getByText("No availability slots found")).toBeDefined();
    expect(
      screen.getByText("Availability slots will appear here once doctors set up their schedules")
    ).toBeDefined();
  });
});
