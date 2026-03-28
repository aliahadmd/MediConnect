import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Droplets, AlertTriangle, FileText } from "lucide-react";

interface PatientProfilePanelProps {
  patientName: string;
  bloodType: string | null;
  allergies: string | null;
  medicalHistoryNotes: string | null;
}

export function PatientProfilePanel({
  patientName,
  bloodType,
  allergies,
  medicalHistoryNotes,
}: PatientProfilePanelProps) {
  const hasProfile = bloodType || allergies || medicalHistoryNotes;

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Patient Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Name</p>
          <p className="text-sm">{patientName}</p>
        </div>

        {!hasProfile ? (
          <p className="text-sm text-muted-foreground italic">
            No medical profile on file.
          </p>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                Blood Type
              </p>
              {bloodType ? (
                <Badge variant="secondary" className="mt-1">
                  {bloodType}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not specified</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Allergies
              </p>
              {allergies ? (
                <p className="text-sm mt-1 whitespace-pre-wrap">{allergies}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">None reported</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Medical History
              </p>
              {medicalHistoryNotes ? (
                <p className="text-sm mt-1 whitespace-pre-wrap">{medicalHistoryNotes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
