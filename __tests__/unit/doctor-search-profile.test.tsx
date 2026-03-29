import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: vi.fn().mockReturnValue({ doctorId: "doc-1" }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), back: vi.fn() }),
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

import DoctorSearchPage from "@/app/doctors/search/page";
import DoctorProfilePage from "@/app/doctors/[doctorId]/page";

describe("Doctor Search Page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the header with engagement copy", async () => {
    // Mock fetch: specializations + search results (empty initial)
    vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/specializations")) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (urlStr.includes("/api/doctors/search")) {
        return {
          ok: true,
          json: async () => ({ doctors: [], total: 0, page: 1, limit: 12 }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    render(<DoctorSearchPage />);

    const header = screen.getByTestId("doctor-search-header");
    expect(header).toBeDefined();
    expect(within(header).getByText("Find Your Doctor")).toBeDefined();
    expect(
      within(header).getByText(
        "Browse our network of verified healthcare professionals"
      )
    ).toBeDefined();
  });

  it("specialization buttons have min-h-[44px] min-w-[44px] touch target classes", async () => {
    const mockSpecs = [
      { specialization: "Cardiology", doctorCount: 3 },
      { specialization: "Neurology", doctorCount: 5 },
    ];

    vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/specializations")) {
        return { ok: true, json: async () => mockSpecs } as Response;
      }
      if (urlStr.includes("/api/doctors/search")) {
        return {
          ok: true,
          json: async () => ({ doctors: [], total: 0, page: 1, limit: 12 }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    render(<DoctorSearchPage />);

    await waitFor(() => {
      expect(screen.getByText("Cardiology")).toBeDefined();
    });

    const cardiologyBtn = screen.getByText("Cardiology").closest("button");
    expect(cardiologyBtn?.className).toContain("min-h-[44px]");
    expect(cardiologyBtn?.className).toContain("min-w-[44px]");
  });

  it("shows EmptyStateIllustration in no-results state", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/specializations")) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (urlStr.includes("/api/doctors/search")) {
        return {
          ok: true,
          json: async () => ({ doctors: [], total: 0, page: 1, limit: 12 }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    render(<DoctorSearchPage />);

    await waitFor(() => {
      expect(screen.getByTestId("doctor-search-no-results")).toBeDefined();
    });

    const noResults = screen.getByTestId("doctor-search-no-results");
    // Should contain an SVG illustration (EmptyStateIllustration)
    const svg = noResults.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(within(noResults).getByText("No doctors found")).toBeDefined();
    expect(
      within(noResults).getByText(
        "Try adjusting your search or browse all specializations"
      )
    ).toBeDefined();
  });
});

describe("Doctor Profile Page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders trust indicators with Verified Professional badge", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/auth/get-session")) {
        return {
          ok: true,
          json: async () => ({ user: { id: "u1", role: "patient" } }),
        } as Response;
      }
      if (urlStr.includes("/api/doctors/doc-1")) {
        return {
          ok: true,
          json: async () => ({
            id: "doc-1",
            name: "Dr. Jane Smith",
            photoUrl: null,
            specialization: "Cardiology",
            qualifications: "MD, FACC",
            bio: "Experienced cardiologist",
            yearsOfExperience: 15,
            consultationFee: "200.00",
            averageRating: 4.5,
            reviewCount: 10,
            profileComplete: true,
          }),
        } as Response;
      }
      if (urlStr.includes("/api/reviews")) {
        return {
          ok: true,
          json: async () => [
            {
              id: "r1",
              rating: 5,
              reviewText: "Great doctor!",
              reviewerName: "John",
              createdAt: "2024-01-01T00:00:00Z",
            },
          ],
        } as Response;
      }
      return { ok: false } as Response;
    });

    render(<DoctorProfilePage />);

    await waitFor(() => {
      expect(screen.getByTestId("doctor-trust-indicators")).toBeDefined();
    });

    const trustSection = screen.getByTestId("doctor-trust-indicators");
    expect(within(trustSection).getByText("Verified Professional")).toBeDefined();
    expect(
      within(trustSection).getByText("15 years of experience")
    ).toBeDefined();
  });

  it("renders book button with min-h-[44px] min-w-[44px] for patients", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/auth/get-session")) {
        return {
          ok: true,
          json: async () => ({ user: { id: "u1", role: "patient" } }),
        } as Response;
      }
      if (urlStr.includes("/api/doctors/doc-1")) {
        return {
          ok: true,
          json: async () => ({
            id: "doc-1",
            name: "Dr. Jane Smith",
            photoUrl: null,
            specialization: "Cardiology",
            qualifications: null,
            bio: null,
            yearsOfExperience: 5,
            consultationFee: "100.00",
            averageRating: null,
            reviewCount: 0,
            profileComplete: true,
          }),
        } as Response;
      }
      if (urlStr.includes("/api/reviews")) {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: false } as Response;
    });

    render(<DoctorProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Book Appointment")).toBeDefined();
    });

    const bookBtn = screen.getByText("Book Appointment").closest("button");
    expect(bookBtn?.className).toContain("min-h-[44px]");
    expect(bookBtn?.className).toContain("min-w-[44px]");
  });

  it("shows EmptyStateIllustration and engagement copy when no reviews", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/auth/get-session")) {
        return { ok: false } as Response;
      }
      if (urlStr.includes("/api/doctors/doc-1")) {
        return {
          ok: true,
          json: async () => ({
            id: "doc-1",
            name: "Dr. Jane Smith",
            photoUrl: null,
            specialization: "Cardiology",
            qualifications: null,
            bio: null,
            yearsOfExperience: 3,
            consultationFee: "100.00",
            averageRating: null,
            reviewCount: 0,
            profileComplete: true,
          }),
        } as Response;
      }
      if (urlStr.includes("/api/reviews")) {
        return { ok: true, json: async () => [] } as Response;
      }
      return { ok: false } as Response;
    });

    render(<DoctorProfilePage />);

    await waitFor(() => {
      expect(screen.getByTestId("doctor-no-reviews")).toBeDefined();
    });

    const noReviews = screen.getByTestId("doctor-no-reviews");
    // Should contain an SVG illustration
    const svg = noReviews.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(
      within(noReviews).getByText("Be the first to share your experience")
    ).toBeDefined();
  });
});
