import { User, Stethoscope, Clock, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DoctorProfileCardProps {
  name: string;
  photoUrl?: string | null;
  specialization?: string | null;
  yearsOfExperience?: number | null;
  consultationFee?: string | number | null;
  profileComplete: boolean;
}

export function DoctorProfileCard({
  name,
  photoUrl,
  specialization,
  yearsOfExperience,
  consultationFee,
  profileComplete,
}: DoctorProfileCardProps) {
  return (
    <Card size="sm" className="w-full">
      <CardContent className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>

          {!profileComplete ? (
            <p className="text-sm text-muted-foreground">
              Profile not yet completed
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {specialization && (
                <span className="flex items-center gap-1">
                  <Stethoscope className="h-3.5 w-3.5" />
                  {specialization}
                </span>
              )}
              {yearsOfExperience != null && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {yearsOfExperience} yr{yearsOfExperience !== 1 ? "s" : ""}
                </span>
              )}
              {consultationFee != null && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {Number(consultationFee).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
