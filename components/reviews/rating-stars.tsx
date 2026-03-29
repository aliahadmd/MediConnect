"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export function RatingStars({
  rating,
  maxRating = 5,
  interactive = false,
  onRate,
  size = "md",
}: RatingStarsProps) {
  const iconSize = sizeMap[size];
  const roundedRating = Math.round(rating);

  if (interactive) {
    return (
      <div className="inline-flex items-center gap-0.5" role="group" aria-label="Rating">
        {Array.from({ length: maxRating }, (_, i) => {
          const starValue = i + 1;
          const filled = starValue <= roundedRating;
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onRate?.(starValue)}
              aria-label={`Rate ${starValue} out of ${maxRating} stars`}
              className={cn(
                "cursor-pointer rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filled ? "text-yellow-500" : "text-muted-foreground/40"
              )}
            >
              <Star
                size={iconSize}
                fill={filled ? "currentColor" : "none"}
                strokeWidth={filled ? 0 : 1.5}
              />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${roundedRating} out of ${maxRating} stars`}
      role="img"
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i + 1 <= roundedRating;
        return (
          <Star
            key={i + 1}
            size={iconSize}
            className={filled ? "text-yellow-500" : "text-muted-foreground/40"}
            fill={filled ? "currentColor" : "none"}
            strokeWidth={filled ? 0 : 1.5}
          />
        );
      })}
    </span>
  );
}
