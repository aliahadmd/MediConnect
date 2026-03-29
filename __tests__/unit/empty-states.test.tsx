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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { VisitHistory } from "@/components/appointments/visit-history";
import { PrescriptionList } from "@/components/prescriptions/prescription-list";
import { MedicalTimelineContent } from "@/components/timeline/medical-timeline-content";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { NotificationPreferences } from "@/components/settings/notification-preferences";

function mockFetchEmpty() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
  });
}

describe("Empty States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Visit History — Requirements 10.1
  // -----------------------------------------------------------------------
  describe("Visit History empty state", () => {
    it("renders EmptyStateIllustration SVG and engagement copy", async () => {
      mockFetchEmpty();
      const { container } = render(<VisitHistory />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-visit-history")).toBeDefined();
      });

      const emptyState = screen.getByTestId("empty-visit-history");
      const svg = emptyState.querySelector("svg");
      expect(svg).not.toBeNull();

      expect(screen.getByText("No visit history yet")).toBeDefined();
      expect(
        screen.getByText(
          "Your past consultations will appear here after you complete an appointment"
        )
      ).toBeDefined();
    });

    it("renders Book Appointment CTA linking to /patient/book", async () => {
      mockFetchEmpty();
      render(<VisitHistory />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-visit-history")).toBeDefined();
      });

      const cta = screen.getByText("Book Appointment");
      expect(cta).toBeDefined();
      const link = cta.closest("a");
      expect(link).not.toBeNull();
      expect(link!.getAttribute("href")).toBe("/patient/book");
    });
  });

  // -----------------------------------------------------------------------
  // Prescriptions — Requirements 10.2
  // -----------------------------------------------------------------------
  describe("Prescriptions empty state", () => {
    it("renders EmptyStateIllustration SVG and engagement copy", async () => {
      mockFetchEmpty();
      const { container } = render(<PrescriptionList />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-prescriptions-list")).toBeDefined();
      });

      const emptyState = screen.getByTestId("empty-prescriptions-list");
      const svg = emptyState.querySelector("svg");
      expect(svg).not.toBeNull();

      expect(screen.getByText("No prescriptions yet")).toBeDefined();
      expect(
        screen.getByText(
          "Prescriptions from your completed appointments will appear here"
        )
      ).toBeDefined();
    });

    it("renders View Appointments CTA linking to /patient/appointments", async () => {
      mockFetchEmpty();
      render(<PrescriptionList />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-prescriptions-list")).toBeDefined();
      });

      const cta = screen.getByText("View Appointments");
      expect(cta).toBeDefined();
      const link = cta.closest("a");
      expect(link).not.toBeNull();
      expect(link!.getAttribute("href")).toBe("/patient/appointments");
    });
  });

  // -----------------------------------------------------------------------
  // Timeline — Requirements 10.3
  // -----------------------------------------------------------------------
  describe("Timeline empty state", () => {
    it("renders EmptyStateIllustration SVG and engagement copy", async () => {
      mockFetchEmpty();
      const { container } = render(<MedicalTimelineContent />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-timeline")).toBeDefined();
      });

      const emptyState = screen.getByTestId("empty-timeline");
      const svg = emptyState.querySelector("svg");
      expect(svg).not.toBeNull();

      expect(screen.getByText("No timeline events yet")).toBeDefined();
      expect(
        screen.getByText(
          "Your healthcare journey will be recorded here as you use the platform"
        )
      ).toBeDefined();
    });

    it("renders Book Appointment CTA linking to /patient/book", async () => {
      mockFetchEmpty();
      render(<MedicalTimelineContent />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-timeline")).toBeDefined();
      });

      const cta = screen.getByText("Book Appointment");
      expect(cta).toBeDefined();
      const link = cta.closest("a");
      expect(link).not.toBeNull();
      expect(link!.getAttribute("href")).toBe("/patient/book");
    });
  });

  // -----------------------------------------------------------------------
  // Patient Appointments — Requirements 10.4
  // -----------------------------------------------------------------------
  describe("Patient Appointments empty state", () => {
    it("renders EmptyStateIllustration SVG and engagement copy", async () => {
      mockFetchEmpty();
      const { container } = render(<AppointmentList />);

      await waitFor(() => {
        expect(
          screen.getByTestId("empty-patient-appointments")
        ).toBeDefined();
      });

      const emptyState = screen.getByTestId("empty-patient-appointments");
      const svg = emptyState.querySelector("svg");
      expect(svg).not.toBeNull();

      expect(screen.getByText("No appointments yet")).toBeDefined();
      expect(
        screen.getByText("Book a consultation to get started")
      ).toBeDefined();
    });

    it("renders Book Appointment CTA", async () => {
      mockFetchEmpty();
      render(<AppointmentList />);

      await waitFor(() => {
        expect(
          screen.getByTestId("empty-patient-appointments")
        ).toBeDefined();
      });

      const cta = screen.getByText("Book Appointment");
      expect(cta).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Notification Preferences skeleton — Requirements 10.5
  // -----------------------------------------------------------------------
  describe("Notification Preferences loading skeleton", () => {
    it("renders skeleton loaders with animate-pulse styling while loading", () => {
      // Don't resolve fetch so loading state persists
      global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

      const { container } = render(<NotificationPreferences />);

      const skeleton = screen.getByTestId(
        "notification-preferences-skeleton"
      );
      expect(skeleton).toBeDefined();

      // Should have skeleton rows with animate-pulse
      const pulseElements = skeleton.querySelectorAll(".animate-pulse");
      expect(pulseElements.length).toBeGreaterThanOrEqual(4);

      // Should have bg-muted styling
      const mutedElements = skeleton.querySelectorAll(".bg-muted");
      expect(mutedElements.length).toBeGreaterThanOrEqual(4);

      // Should have rounded styling
      const roundedElements = skeleton.querySelectorAll(
        '[class*="rounded"]'
      );
      expect(roundedElements.length).toBeGreaterThanOrEqual(4);
    });
  });
});
