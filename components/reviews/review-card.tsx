"use client";

import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RatingStars } from "./rating-stars";

export interface ReviewCardProps {
  reviewerName: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function ReviewCard({
  reviewerName,
  rating,
  reviewText,
  createdAt,
}: ReviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{reviewerName}</CardTitle>
          <RatingStars rating={rating} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {reviewText && (
          <p className="text-sm text-foreground">{reviewText}</p>
        )}
        <time className="text-xs text-muted-foreground" dateTime={createdAt}>
          {formatDate(createdAt)}
        </time>
      </CardContent>
    </Card>
  );
}
