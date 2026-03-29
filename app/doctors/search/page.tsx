"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DoctorProfileCard } from "@/components/profiles/doctor-profile-card";
import { SpecializationBrowser } from "@/components/doctors/specialization-browser";
import { EmptyStateIllustration } from "@/components/illustrations";

interface DoctorSearchResult {
  id: string;
  name: string;
  photoUrl: string | null;
  specialization: string | null;
  qualifications: string | null;
  yearsOfExperience: number | null;
  consultationFee: string | null;
  averageRating: number | null;
  reviewCount: number;
}

interface SearchResponse {
  doctors: DoctorSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export default function DoctorSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [results, setResults] = useState<DoctorSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limit = 12;

  const fetchDoctors = useCallback(
    async (searchQuery: string, specialization: string | null, pageNum: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.length >= 2) {
          params.set("q", searchQuery);
        }
        if (specialization) {
          params.set("specialization", specialization);
        }
        params.set("page", String(pageNum));
        params.set("limit", String(limit));

        const res = await fetch(`/api/doctors/search?${params.toString()}`);
        if (res.ok) {
          const data: SearchResponse = await res.json();
          setResults(data.doctors);
          setTotal(data.total);
          setPage(data.page);
        }
      } catch {
        // Network error — keep existing results
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    },
    []
  );

  // Debounced text search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only trigger search if query is empty (show all) or >= 2 chars
    if (query.length === 0 || query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        setPage(1);
        fetchDoctors(query, selectedSpecialization, 1);
      }, 500);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, selectedSpecialization, fetchDoctors]);

  function handleSpecializationSelect(specialization: string) {
    if (selectedSpecialization === specialization) {
      setSelectedSpecialization(null);
    } else {
      setSelectedSpecialization(specialization);
    }
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchDoctors(query, selectedSpecialization, newPage);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div data-testid="doctor-search-header">
        <h1 className="text-3xl font-bold">Find Your Doctor</h1>
        <p className="text-muted-foreground mt-1">
          Browse our network of verified healthcare professionals
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search doctors by name or specialization..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Specializations</h2>
        <SpecializationBrowser
          onSelectSpecialization={handleSpecializationSelect}
          selectedSpecialization={selectedSpecialization}
        />
      </div>

      <div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div data-testid="doctor-search-no-results" className="flex flex-col items-center gap-4 py-12 text-center">
            <EmptyStateIllustration size={160} className="text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-lg font-medium">No doctors found</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try adjusting your search or browse all specializations
              </p>
            </div>
            {(query || selectedSpecialization) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setSelectedSpecialization(null);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {hasSearched && (
              <p className="mb-3 text-sm text-muted-foreground">
                {total} {total === 1 ? "doctor" : "doctors"} found
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((doc) => (
                <Link key={doc.id} href={`/doctors/${doc.id}`}>
                  <DoctorProfileCard
                    name={doc.name}
                    photoUrl={doc.photoUrl}
                    specialization={doc.specialization}
                    yearsOfExperience={doc.yearsOfExperience}
                    consultationFee={doc.consultationFee}
                    profileComplete={true}
                    averageRating={doc.averageRating}
                    reviewCount={doc.reviewCount}
                  />
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
