import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock @/lib/auth — unauthenticated user (session = null)
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import Home from "@/app/page";

async function renderHome() {
  const jsx = await Home();
  return render(jsx);
}

describe("Landing Page", () => {
  it("renders the nav bar with MediConnect text and login/register links", async () => {
    await renderHome();

    const nav = screen.getByTestId("nav-bar");
    expect(nav).toBeDefined();

    const navScope = within(nav);
    expect(navScope.getByText("MediConnect")).toBeDefined();
    expect(navScope.getByText("Log in")).toBeDefined();
    expect(navScope.getByText("Register")).toBeDefined();
  });

  it("renders the hero section with headline, subheadline, and 2 CTA buttons", async () => {
    await renderHome();

    const hero = screen.getByTestId("hero-section");
    expect(hero).toBeDefined();

    const heroScope = within(hero);
    // Headline
    expect(heroScope.getByText("Your Health, Connected")).toBeDefined();
    // Subheadline
    expect(heroScope.getByText(/Book appointments, consult with doctors/)).toBeDefined();

    // Two CTA buttons (Log in + Create Account)
    const loginCta = heroScope.getByText("Log in");
    const registerCta = heroScope.getByText("Create Account");
    expect(loginCta).toBeDefined();
    expect(registerCta).toBeDefined();
  });

  it("hero CTA buttons have proper touch target sizing classes (min-h-[44px] min-w-[44px])", async () => {
    await renderHome();

    const hero = screen.getByTestId("hero-section");
    const heroScope = within(hero);

    const loginCta = heroScope.getByText("Log in").closest("a")!;
    const registerCta = heroScope.getByText("Create Account").closest("a")!;

    expect(loginCta.className).toContain("min-h-[44px]");
    expect(loginCta.className).toContain("min-w-[44px]");
    expect(registerCta.className).toContain("min-h-[44px]");
    expect(registerCta.className).toContain("min-w-[44px]");
  });

  it("renders at least 3 feature cards (video consultations, prescriptions, booking)", async () => {
    await renderHome();

    const featureSection = screen.getByTestId("feature-cards");
    expect(featureSection).toBeDefined();

    const featureScope = within(featureSection);
    expect(featureScope.getByText("Video Consultations")).toBeDefined();
    expect(featureScope.getByText("Digital Prescriptions")).toBeDefined();
    expect(featureScope.getByText("Easy Booking")).toBeDefined();

    // At least 3 cards (each has a heading)
    const headings = featureScope.getAllByRole("heading", { level: 3 });
    expect(headings.length).toBeGreaterThanOrEqual(3);
  });

  it("renders at least 2 trust indicators", async () => {
    await renderHome();

    const trustSection = screen.getByTestId("trust-indicators");
    expect(trustSection).toBeDefined();

    const trustScope = within(trustSection);
    const headings = trustScope.getAllByRole("heading");
    expect(headings.length).toBeGreaterThanOrEqual(2);

    expect(trustScope.getByText("Your Data is Secure")).toBeDefined();
    expect(trustScope.getByText(/Trusted by Patients/)).toBeDefined();
  });

  it("renders the footer with MediConnect text and copyright", async () => {
    await renderHome();

    const footer = screen.getByTestId("footer");
    expect(footer).toBeDefined();

    const footerScope = within(footer);
    expect(footerScope.getByText("MediConnect")).toBeDefined();
    expect(footerScope.getByText(/All rights reserved/)).toBeDefined();
  });
});
