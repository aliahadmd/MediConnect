import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewCard } from "@/components/reviews/review-card";

describe("ReviewCard", () => {
  const defaultProps = {
    reviewerName: "Jane Doe",
    rating: 4,
    reviewText: "Great doctor, very thorough.",
    createdAt: "2024-06-15T10:30:00Z",
  };

  it("renders reviewer name", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("Jane Doe")).toBeDefined();
  });

  it("renders rating stars with correct rating", () => {
    const { container } = render(<ReviewCard {...defaultProps} />);
    const stars = container.querySelectorAll("svg");
    expect(stars.length).toBe(5);
    // 4 filled, 1 empty
    for (let i = 0; i < 4; i++) {
      expect(stars[i].getAttribute("fill")).toBe("currentColor");
    }
    expect(stars[4].getAttribute("fill")).toBe("none");
  });

  it("renders review text when provided", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("Great doctor, very thorough.")).toBeDefined();
  });

  it("does not render review text when null", () => {
    render(<ReviewCard {...defaultProps} reviewText={null} />);
    expect(screen.queryByText("Great doctor, very thorough.")).toBeNull();
  });

  it("renders formatted date", () => {
    render(<ReviewCard {...defaultProps} />);
    expect(screen.getByText("June 15, 2024")).toBeDefined();
  });

  it("renders date with datetime attribute", () => {
    render(<ReviewCard {...defaultProps} />);
    const time = screen.getByText("June 15, 2024");
    expect(time.tagName.toLowerCase()).toBe("time");
    expect(time.getAttribute("datetime")).toBe("2024-06-15T10:30:00Z");
  });

  it("falls back to raw date string on invalid date", () => {
    render(<ReviewCard {...defaultProps} createdAt="not-a-date" />);
    expect(screen.getByText("not-a-date")).toBeDefined();
  });
});
