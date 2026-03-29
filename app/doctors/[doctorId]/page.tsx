"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoctorProfileCard } from "@/components/profiles/doctor-profile-card";
import { RatingStars } from "@/components/reviews/rating-stars";
import { ReviewCard } from "@/components/reviews/review-card";

interface DoctorProfile {
  id: string;
  name: string;
  photoUrl: string | null;
  specialization: string | null;
  qualifications: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  consultationFee: string | null;
  averageRating: number | null;
  reviewCount: number;
  profileComplete: boolean;
}

interface ReviewItem {
  id: string;
  rating: number;
  reviewText: string | null;
  reviewerName: string;
  createdAt: string;
}

interface SessionUser {
  id: string;
  role: string;
}

export default function DoctorProfilePage() {
  const params = useParams<{ doctorId: string }>();
  const doctorId = params.doctorId;

  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/get-session", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setSessionUser({ id: data.user.id, role: data.user.role });
          }
        }
      } catch {
        // Not authenticated — that's fine for a public page
      }
    }
    fetchSession();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [doctorRes, reviewsRes] = await Promise.all([
          fetch(`/api/doctors/${doctorId}`),
          fetch(`/api/reviews?doctorId=${doctorId}`),
        ]);

        if (!doctorRes.ok) {
          if (doctorRes.status === 404) {
            setError("Doctor not found");
          } else {
            setError("Failed to load doctor profile");
          }
          return;
        }

        const doctorData: DoctorProfile = await doctorRes.json();
        setDoctor(doctorData);

        if (reviewsRes.ok) {
          const reviewsData: ReviewItem[] = await reviewsRes.json();
          setReviews(reviewsData);
        }
      } catch {
        setError("Failed to load doctor profile");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [doctorId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">{error || "Doctor not found"}</p>
          <Link href="/doctors/search">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPatient = sessionUser?.role === "patient";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link
        href="/doctors/search"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Search
      </Link>

      <DoctorProfileCard
        name={doctor.name}
        photoUrl={doctor.photoUrl}
        specialization={doctor.specialization}
        yearsOfExperience={doctor.yearsOfExperience}
        consultationFee={doctor.consultationFee}
        profileComplete={doctor.profileComplete}
        averageRating={doctor.averageRating}
        reviewCount={doctor.reviewCount}
      />

      {!doctor.profileComplete && (
        <Card>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>This doctor has not yet completed their profile.</p>
          </CardContent>
        </Card>
      )}

      {doctor.profileComplete && (doctor.bio || doctor.qualifications) && (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doctor.bio && <p className="text-sm text-foreground">{doctor.bio}</p>}
            {doctor.qualifications && (
              <div>
                <p className="text-sm font-medium">Qualifications</p>
                <p className="text-sm text-muted-foreground">{doctor.qualifications}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isPatient && (
        <Link href="/patient/book">
          <Button className="w-full">Book Appointment</Button>
        </Link>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reviews</CardTitle>
            {doctor.averageRating != null && (
              <div className="flex items-center gap-2">
                <RatingStars rating={doctor.averageRating} size="sm" />
                <span className="text-sm text-muted-foreground">
                  {doctor.averageRating.toFixed(1)} ({doctor.reviewCount}{" "}
                  {doctor.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  reviewerName={review.reviewerName}
                  rating={review.rating}
                  reviewText={review.reviewText}
                  createdAt={review.createdAt}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
