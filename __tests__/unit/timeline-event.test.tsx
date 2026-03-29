import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineEvent } from "@/components/timeline/timeline-event";
import { CalendarIcon } from "lucide-react";
import React from "react";

describe("TimelineEvent", () => {
  const defaultProps = {
    type: "appointment" as const,
    date: "2024-06-15T10:30:00Z",
    summary: "Consultation with Dr. Smith",
    detailUrl: "/patient/appointments/123",
    icon: React.createElement(CalendarIcon, { className: "h-4 w-4" }),
  };

  it("renders the summary text", () => {
    render(<TimelineEvent {...defaultProps} />);
    expect(screen.getByText("Consultation with Dr. Smith")).toBeDefined();
  });

  it("renders the formatted date", () => {
    render(<TimelineEvent {...defaultProps} />);
    expect(screen.getByText("June 15, 2024")).toBeDefined();
  });

  it("renders the type label for appointment", () => {
    render(<TimelineEvent {...defaultProps} type="appointment" />);
    expect(screen.getByText("Appointment")).toBeDefined();
  });

  it("renders the type label for prescription", () => {
    render(<TimelineEvent {...defaultProps} type="prescription" />);
    expect(screen.getByText("Prescription")).toBeDefined();
  });

  it("renders the type label for visit_note", () => {
    render(<TimelineEvent {...defaultProps} type="visit_note" />);
    expect(screen.getByText("Visit Note")).toBeDefined();
  });

  it("renders a link to the detail URL", () => {
    render(<TimelineEvent {...defaultProps} />);
    const link = screen.getByText("View details");
    expect(link.closest("a")?.getAttribute("href")).toBe("/patient/appointments/123");
  });

  it("renders the date with datetime attribute", () => {
    render(<TimelineEvent {...defaultProps} />);
    const time = screen.getByText("June 15, 2024");
    expect(time.tagName.toLowerCase()).toBe("time");
    expect(time.getAttribute("datetime")).toBe("2024-06-15T10:30:00Z");
  });

  it("falls back to raw date string on invalid date", () => {
    render(<TimelineEvent {...defaultProps} date="not-a-date" />);
    expect(screen.getByText("not-a-date")).toBeDefined();
  });
});
