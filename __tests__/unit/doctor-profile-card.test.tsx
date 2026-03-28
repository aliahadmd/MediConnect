import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoctorProfileCard } from "@/components/profiles/doctor-profile-card";

describe("DoctorProfileCard", () => {
  it("renders doctor name", () => {
    render(
      <DoctorProfileCard name="Dr. Smith" profileComplete={false} />
    );
    expect(screen.getByText("Dr. Smith")).toBeDefined();
  });

  it("shows 'Profile not yet completed' when profileComplete is false", () => {
    render(
      <DoctorProfileCard name="Dr. Smith" profileComplete={false} />
    );
    expect(screen.getByText("Profile not yet completed")).toBeDefined();
  });

  it("shows specialization, years, and fee when profile is complete", () => {
    render(
      <DoctorProfileCard
        name="Dr. Smith"
        specialization="Cardiology"
        yearsOfExperience={10}
        consultationFee="150.00"
        profileComplete={true}
      />
    );
    expect(screen.getByText("Cardiology")).toBeDefined();
    expect(screen.getByText("10 yrs")).toBeDefined();
    expect(screen.getByText("150.00")).toBeDefined();
  });

  it("renders singular 'yr' for 1 year of experience", () => {
    render(
      <DoctorProfileCard
        name="Dr. New"
        specialization="Dermatology"
        yearsOfExperience={1}
        consultationFee={50}
        profileComplete={true}
      />
    );
    expect(screen.getByText("1 yr")).toBeDefined();
  });

  it("renders placeholder icon when no photoUrl is provided", () => {
    const { container } = render(
      <DoctorProfileCard name="Dr. Smith" profileComplete={false} />
    );
    // The User icon from lucide-react renders as an SVG
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("renders photo when photoUrl is provided", () => {
    render(
      <DoctorProfileCard
        name="Dr. Smith"
        photoUrl="https://example.com/photo.jpg"
        profileComplete={true}
        specialization="Neurology"
      />
    );
    const img = screen.getByAltText("Dr. Smith");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/photo.jpg");
  });

  it("does not show profile details when profileComplete is false even if data is passed", () => {
    render(
      <DoctorProfileCard
        name="Dr. Smith"
        specialization="Cardiology"
        yearsOfExperience={5}
        consultationFee={100}
        profileComplete={false}
      />
    );
    expect(screen.getByText("Profile not yet completed")).toBeDefined();
    expect(screen.queryByText("Cardiology")).toBeNull();
  });
});
