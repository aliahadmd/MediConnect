"use client";

import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, CalendarIcon, UserIcon } from "lucide-react";

export interface PrescriptionCardProps {
  id: string;
  doctorName: string;
  appointmentDate: string;
  medicationCount: number;
  createdAt: string;
  onClick?: () => void;
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function PrescriptionCard({
  doctorName,
  appointmentDate,
  medicationCount,
  createdAt,
  onClick,
}: PrescriptionCardProps) {
  return (
    <Card
      className={onClick ? "cursor-pointer transition-shadow hover:shadow-md" : undefined}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-4 text-muted-foreground" />
            Dr. {doctorName}
          </CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Pill className="size-3" />
            {medicationCount} {medicationCount === 1 ? "medication" : "medications"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarIcon className="size-4" />
          <span>{formatDate(appointmentDate)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Prescribed on {formatDate(createdAt)}
        </div>
      </CardContent>
    </Card>
  );
}
