import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Mock next/link to render a plain anchor
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

// Mock heavy child components in Header
vi.mock("@/components/layout/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock("@/components/layout/logout-button", () => ({
  LogoutButton: () => <button data-testid="logout-button">Logout</button>,
}));

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

describe("Sidebar", () => {
  it("renders an SVG logo via StethoscopeIllustration", () => {
    render(<Sidebar userName="Test User" userRole="patient" />);

    const logoArea = screen.getByTestId("sidebar-logo");
    const svg = logoArea.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("has gradient background class on the sidebar container", () => {
    render(<Sidebar userName="Test User" userRole="patient" />);

    const sidebar = screen.getByTestId("sidebar");
    // Tailwind v4 uses bg-linear-to-b; also accept bg-gradient-to-b
    const hasGradient =
      sidebar.className.includes("bg-linear-to-b") ||
      sidebar.className.includes("bg-gradient-to-b");
    expect(hasGradient).toBe(true);
  });

  it("nav links have min-h-[44px] for touch target sizing", () => {
    render(<Sidebar userName="Test User" userRole="patient" />);

    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.className).toContain("min-h-[44px]");
    }
  });

  it("nav links have enhanced hover transition classes", () => {
    render(<Sidebar userName="Test User" userRole="patient" />);

    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.className).toContain("hover:bg-accent/80");
      expect(link.className).toContain("transition-colors");
      expect(link.className).toContain("duration-200");
    }
  });
});

describe("Header", () => {
  it("has h-16 height class", () => {
    render(<Header userName="Dr. Smith" userRole="doctor" />);

    const header = screen.getByTestId("header");
    expect(header.className).toContain("h-16");
  });

  it("renders user name with bold/semibold styling", () => {
    render(<Header userName="Dr. Smith" userRole="doctor" />);

    const nameEl = screen.getByText("Dr. Smith");
    expect(
      nameEl.className.includes("font-semibold") ||
        nameEl.className.includes("font-bold")
    ).toBe(true);
  });

  it("renders role badge with prominent styling", () => {
    render(<Header userName="Dr. Smith" userRole="doctor" />);

    const badge = screen.getByText("doctor");
    expect(badge.className).toContain("font-semibold");
  });
});
