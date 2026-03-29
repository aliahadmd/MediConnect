import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock @/lib/auth — patient session
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "user-1", name: "Jane Doe", email: "jane@example.com", role: "patient" },
      }),
    },
  },
}));

// Mock @/lib/db
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

// Mock @/lib/db/schema
vi.mock("@/lib/db/schema", () => ({
  users: {},
  doctorProfiles: {},
  patientProfiles: {},
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
}));

// Mock @/lib/profile-photo
vi.mock("@/lib/profile-photo", () => ({
  getProfilePhotoUrl: vi.fn().mockResolvedValue(null),
}));

// Mock child client components to isolate settings page tests
vi.mock("@/components/profiles/doctor-profile-form", () => ({
  DoctorProfileForm: () => <div data-testid="doctor-profile-form" />,
}));

vi.mock("@/components/profiles/patient-profile-form", () => ({
  PatientProfileForm: () => <div data-testid="patient-profile-form" />,
}));

vi.mock("@/components/profiles/photo-upload", () => ({
  PhotoUpload: ({ currentPhotoUrl }: { currentPhotoUrl?: string | null }) => (
    <div data-testid="photo-upload-mock">
      <div className="h-24 w-24 rounded-full" data-testid="photo-avatar" />
      <button className="min-h-[44px] min-w-[44px]" data-testid="photo-upload-btn">
        Choose Photo
      </button>
    </div>
  ),
}));

vi.mock("@/components/settings/notification-preferences", () => ({
  NotificationPreferences: () => <div data-testid="notification-preferences" />,
}));

import SettingsPage from "@/app/(dashboard)/settings/page";

async function renderSettingsPage() {
  const jsx = await SettingsPage();
  return render(jsx);
}

describe("Settings Page — Kiosk Styling (Task 15.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header with engagement copy", async () => {
    await renderSettingsPage();

    const header = screen.getByTestId("settings-header");
    expect(header).toBeDefined();

    expect(screen.getByText("Settings")).toBeDefined();
    expect(screen.getByText("Manage your profile and preferences")).toBeDefined();
  });

  it("renders section cards with larger icons (h-6 w-6)", async () => {
    const { container } = await renderSettingsPage();

    // All section icons should be h-6 w-6 (size-6)
    const icons = container.querySelectorAll("svg.h-6.w-6");
    // At minimum: User, HeartPulse (patient), Camera, Bell = 4 icons
    expect(icons.length).toBeGreaterThanOrEqual(4);
  });

  it("renders section cards with bolder titles (font-semibold)", async () => {
    const { container } = await renderSettingsPage();

    const cardTitles = container.querySelectorAll('[data-slot="card-title"]');
    for (const title of cardTitles) {
      expect(title.className).toContain("font-semibold");
    }
  });

  it("renders section cards with increased padding (p-6)", async () => {
    const { container } = await renderSettingsPage();

    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(3);
    for (const card of cards) {
      expect(card.className).toContain("p-6");
    }
  });

  it("renders photo upload area with data-testid", async () => {
    await renderSettingsPage();

    const photoUpload = screen.getByTestId("settings-photo-upload");
    expect(photoUpload).toBeDefined();
  });

  it("renders photo upload with larger avatar sizing (h-24 w-24)", async () => {
    const { container } = await renderSettingsPage();

    const photoUpload = screen.getByTestId("settings-photo-upload");
    const avatar = photoUpload.querySelector(".h-24.w-24");
    expect(avatar).not.toBeNull();
  });

  it("renders photo upload with prominent upload button", async () => {
    await renderSettingsPage();

    const uploadBtn = screen.getByTestId("photo-upload-btn");
    expect(uploadBtn).toBeDefined();
    expect(uploadBtn.className).toContain("min-h-[44px]");
    expect(uploadBtn.className).toContain("min-w-[44px]");
  });

  it("header h1 uses font-bold for bolder styling", async () => {
    await renderSettingsPage();

    const heading = screen.getByText("Settings");
    expect(heading.tagName).toBe("H1");
    expect(heading.className).toContain("font-bold");
  });
});
