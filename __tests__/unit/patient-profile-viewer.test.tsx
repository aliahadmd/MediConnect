import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PatientProfileViewer } from "@/components/profiles/patient-profile-viewer";

const mockProfile = {
  name: "John Doe",
  dateOfBirth: "1990-05-15",
  gender: "Male",
  bloodType: "O+",
  allergies: "Penicillin",
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "+1234567890",
  medicalHistoryNotes: "Previous surgery in 2020",
  profileComplete: true,
};

describe("PatientProfileViewer", () => {
  const defaultProps = {
    patientId: "patient-1",
    appointmentId: "appt-1",
    open: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    defaultProps.onClose.mockClear();
  });

  it("fetches and displays patient profile when open", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    render(<PatientProfileViewer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeDefined();
    });
    expect(screen.getByText("Male")).toBeDefined();
    expect(screen.getByText("O+")).toBeDefined();
    expect(screen.getByText("Penicillin")).toBeDefined();
    expect(screen.getByText("Jane Doe")).toBeDefined();
    expect(screen.getByText("+1234567890")).toBeDefined();
    expect(screen.getByText("Previous surgery in 2020")).toBeDefined();
  });

  it("shows incomplete notice when profileComplete is false", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockProfile, profileComplete: false }),
    } as Response);

    render(<PatientProfileViewer {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Medical profile is incomplete. Some fields may be missing.")
      ).toBeDefined();
    });
  });

  it("does not show incomplete notice when profileComplete is true", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    render(<PatientProfileViewer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeDefined();
    });
    expect(
      screen.queryByText("Medical profile is incomplete. Some fields may be missing.")
    ).toBeNull();
  });

  it("shows error message on fetch failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Forbidden" }),
    } as Response);

    render(<PatientProfileViewer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Forbidden")).toBeDefined();
    });
  });

  it("does not fetch when dialog is closed", () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    render(<PatientProfileViewer {...defaultProps} open={false} />);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches with correct URL including patientId and appointmentId", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile,
    } as Response);

    render(<PatientProfileViewer {...defaultProps} />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/patients/patient-1/profile?appointmentId=appt-1"
      );
    });
  });

  it("shows fallback text for null profile fields", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockProfile,
        dateOfBirth: null,
        gender: null,
        bloodType: null,
        allergies: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        medicalHistoryNotes: null,
      }),
    } as Response);

    render(<PatientProfileViewer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeDefined();
    });
    expect(screen.getByText("None reported")).toBeDefined();
    expect(screen.getByText("No notes")).toBeDefined();
    // "Not specified" appears for multiple null fields
    const notSpecified = screen.getAllByText("Not specified");
    expect(notSpecified.length).toBeGreaterThanOrEqual(3);
  });
});
