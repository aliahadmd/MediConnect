import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RatingStars } from "@/components/reviews/rating-stars";

describe("RatingStars", () => {
  it("renders correct number of stars based on maxRating", () => {
    const { container } = render(<RatingStars rating={3} maxRating={5} />);
    const stars = container.querySelectorAll("svg");
    expect(stars.length).toBe(5);
  });

  it("renders filled stars matching the rounded rating", () => {
    const { container } = render(<RatingStars rating={3} maxRating={5} />);
    const stars = container.querySelectorAll("svg");
    // First 3 should be filled (fill="currentColor"), last 2 empty (fill="none")
    for (let i = 0; i < 3; i++) {
      expect(stars[i].getAttribute("fill")).toBe("currentColor");
    }
    for (let i = 3; i < 5; i++) {
      expect(stars[i].getAttribute("fill")).toBe("none");
    }
  });

  it("rounds half-star ratings to nearest integer", () => {
    const { container } = render(<RatingStars rating={3.6} />);
    const stars = container.querySelectorAll("svg");
    // 3.6 rounds to 4
    for (let i = 0; i < 4; i++) {
      expect(stars[i].getAttribute("fill")).toBe("currentColor");
    }
    expect(stars[4].getAttribute("fill")).toBe("none");
  });

  it("renders zero filled stars for rating 0", () => {
    const { container } = render(<RatingStars rating={0} />);
    const stars = container.querySelectorAll("svg");
    for (let i = 0; i < 5; i++) {
      expect(stars[i].getAttribute("fill")).toBe("none");
    }
  });

  it("uses correct icon sizes for sm/md/lg", () => {
    const { container: smContainer } = render(<RatingStars rating={1} size="sm" />);
    const { container: mdContainer } = render(<RatingStars rating={1} size="md" />);
    const { container: lgContainer } = render(<RatingStars rating={1} size="lg" />);

    const smStar = smContainer.querySelector("svg");
    const mdStar = mdContainer.querySelector("svg");
    const lgStar = lgContainer.querySelector("svg");

    expect(smStar?.getAttribute("width")).toBe("16");
    expect(mdStar?.getAttribute("width")).toBe("20");
    expect(lgStar?.getAttribute("width")).toBe("24");
  });

  it("renders non-interactive stars as a span with aria-label", () => {
    render(<RatingStars rating={4} maxRating={5} />);
    const span = screen.getByLabelText("4 out of 5 stars");
    expect(span).toBeDefined();
    expect(span.tagName.toLowerCase()).toBe("span");
  });

  it("renders interactive stars as buttons with aria-labels", () => {
    render(<RatingStars rating={2} maxRating={5} interactive onRate={() => {}} />);
    for (let i = 1; i <= 5; i++) {
      const btn = screen.getByLabelText(`Rate ${i} out of 5 stars`);
      expect(btn).toBeDefined();
      expect(btn.tagName.toLowerCase()).toBe("button");
    }
  });

  it("calls onRate with correct value when interactive star is clicked", () => {
    const onRate = vi.fn();
    render(<RatingStars rating={0} maxRating={5} interactive onRate={onRate} />);
    fireEvent.click(screen.getByLabelText("Rate 3 out of 5 stars"));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it("defaults maxRating to 5", () => {
    const { container } = render(<RatingStars rating={2} />);
    const stars = container.querySelectorAll("svg");
    expect(stars.length).toBe(5);
  });
});
