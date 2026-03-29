import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SpecializationBrowser } from "@/components/doctors/specialization-browser";

const mockSpecializations = [
  { specialization: "Cardiology", doctorCount: 3 },
  { specialization: "Dermatology", doctorCount: 0 },
  { specialization: "Neurology", doctorCount: 5 },
];

describe("SpecializationBrowser", () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onSelect.mockClear();
  });

  it("renders specialization cards after fetching", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpecializations,
    } as Response);

    render(
      <SpecializationBrowser
        onSelectSpecialization={onSelect}
        selectedSpecialization={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Cardiology")).toBeDefined();
    });
    expect(screen.getByText("Neurology")).toBeDefined();
    expect(screen.getByText("Dermatology")).toBeDefined();
  });

  it("displays doctor count for each specialization", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpecializations,
    } as Response);

    render(
      <SpecializationBrowser
        onSelectSpecialization={onSelect}
        selectedSpecialization={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("3 doctors")).toBeDefined();
    });
    expect(screen.getByText("0 doctors")).toBeDefined();
    expect(screen.getByText("5 doctors")).toBeDefined();
  });

  it("calls onSelectSpecialization when a card is clicked", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpecializations,
    } as Response);

    render(
      <SpecializationBrowser
        onSelectSpecialization={onSelect}
        selectedSpecialization={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Cardiology")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Cardiology"));
    expect(onSelect).toHaveBeenCalledWith("Cardiology");
  });

  it("applies muted style to categories with zero doctors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpecializations,
    } as Response);

    render(
      <SpecializationBrowser
        onSelectSpecialization={onSelect}
        selectedSpecialization={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Dermatology")).toBeDefined();
    });

    const dermatologyButton = screen.getByText("Dermatology").closest("button");
    expect(dermatologyButton?.className).toContain("opacity-50");
  });

  it("highlights the selected specialization", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockSpecializations,
    } as Response);

    render(
      <SpecializationBrowser
        onSelectSpecialization={onSelect}
        selectedSpecialization="Cardiology"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Cardiology")).toBeDefined();
    });

    const cardiologyButton = screen.getByText("Cardiology").closest("button");
    expect(cardiologyButton?.className).toContain("border-primary");
  });

  it("shows empty message when no specializations exist", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(
      <SpecializationBrowser
        onSelectSpecialization={onSelect}
        selectedSpecialization={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No specializations available.")).toBeDefined();
    });
  });

  it("shows error message on fetch failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
    } as Response);

    render(
      <SpecializationBrowser
        onSelectSpecialization={onSelect}
        selectedSpecialization={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch specializations")).toBeDefined();
    });
  });

  it("uses singular 'doctor' for count of 1", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => [{ specialization: "Pediatrics", doctorCount: 1 }],
    } as Response);

    render(
      <SpecializationBrowser
        onSelectSpecialization={onSelect}
        selectedSpecialization={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("1 doctor")).toBeDefined();
    });
  });
});
