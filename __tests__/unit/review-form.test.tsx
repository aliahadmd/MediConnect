import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewForm } from "@/components/reviews/review-form";

describe("ReviewForm", () => {
  const defaultProps = {
    appointmentId: "apt-123",
    doctorId: "doc-456",
    onSubmitted: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    defaultProps.onSubmitted = vi.fn();
  });

  it("renders rating stars, textarea, and submit button", () => {
    render(<ReviewForm {...defaultProps} />);
    expect(screen.getByText("Rating")).toBeDefined();
    expect(screen.getByPlaceholderText("Share your experience...")).toBeDefined();
    expect(screen.getByRole("button", { name: "Submit Review" })).toBeDefined();
  });

  it("submit button is disabled when no rating selected", () => {
    render(<ReviewForm {...defaultProps} />);
    const btn = screen.getByRole("button", { name: "Submit Review" });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("shows error when submitting without rating", async () => {
    render(<ReviewForm {...defaultProps} />);
    // Force submit via form (button is disabled, but test the validation path)
    const form = screen.getByRole("button", { name: "Submit Review" }).closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText("Please select a rating")).toBeDefined();
    });
  });

  it("enables submit button after selecting a rating", () => {
    render(<ReviewForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Rate 4 out of 5 stars"));
    const btn = screen.getByRole("button", { name: "Submit Review" });
    expect(btn.hasAttribute("disabled")).toBe(false);
  });

  it("shows character count for textarea", () => {
    render(<ReviewForm {...defaultProps} />);
    expect(screen.getByText("0/2000")).toBeDefined();
    const textarea = screen.getByPlaceholderText("Share your experience...");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    expect(screen.getByText("5/2000")).toBeDefined();
  });

  it("calls onSubmitted after successful submission", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "rev-1" }), { status: 201 })
    );

    render(<ReviewForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Rate 5 out of 5 stars"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(defaultProps.onSubmitted).toHaveBeenCalled();
    });
  });

  it("shows duplicate review error on 409 response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Duplicate" }), { status: 409 })
    );

    render(<ReviewForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Rate 3 out of 5 stars"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(screen.getByText("A review already exists for this appointment")).toBeDefined();
    });
  });

  it("shows server error message on 400 response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: "Reviews are only allowed for completed appointments" }),
        { status: 400 }
      )
    );

    render(<ReviewForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Rate 2 out of 5 stars"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(
        screen.getByText("Reviews are only allowed for completed appointments")
      ).toBeDefined();
    });
  });

  it("shows generic error on network failure", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

    render(<ReviewForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Rate 4 out of 5 stars"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to submit review. Please try again.")).toBeDefined();
    });
  });

  it("sends correct payload to API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "rev-1" }), { status: 201 })
    );

    render(<ReviewForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Rate 4 out of 5 stars"));
    const textarea = screen.getByPlaceholderText("Share your experience...");
    fireEvent.change(textarea, { target: { value: "Excellent care" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: "apt-123",
          doctorId: "doc-456",
          rating: 4,
          reviewText: "Excellent care",
        }),
      });
    });
  });
});
