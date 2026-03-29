"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "./rating-stars";

export interface ReviewFormProps {
  appointmentId: string;
  doctorId: string;
  onSubmitted: () => void;
}

export function ReviewForm({
  appointmentId,
  doctorId,
  onSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          doctorId,
          rating,
          reviewText: reviewText.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setError("A review already exists for this appointment");
        } else if (res.status === 400) {
          setError(data.error || "Invalid review submission");
        } else {
          setError(data.error || "Failed to submit review");
        }
        return;
      }

      onSubmitted();
    } catch {
      setError("Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Rating</label>
        <RatingStars rating={rating} interactive onRate={setRating} size="lg" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="review-text" className="text-sm font-medium">
          Review (optional)
        </label>
        <Textarea
          id="review-text"
          placeholder="Share your experience..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          maxLength={2000}
          rows={4}
        />
        <span className="text-xs text-muted-foreground text-right">
          {reviewText.length}/2000
        </span>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading || rating === 0}>
        {loading ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
