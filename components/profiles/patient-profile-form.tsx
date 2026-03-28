"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updatePatientProfileSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PatientProfileData {
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  medicalHistoryNotes?: string | null;
}

interface PatientProfileFormProps {
  initialData?: PatientProfileData | null;
}

interface ValidationError {
  field: string;
  message: string;
}

export function PatientProfileForm({ initialData }: PatientProfileFormProps) {
  const [dateOfBirth, setDateOfBirth] = useState(initialData?.dateOfBirth ?? "");
  const [gender, setGender] = useState(initialData?.gender ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    initialData?.emergencyContactName ?? ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initialData?.emergencyContactPhone ?? ""
  );
  const [bloodType, setBloodType] = useState(initialData?.bloodType ?? "");
  const [allergies, setAllergies] = useState(initialData?.allergies ?? "");
  const [medicalHistoryNotes, setMedicalHistoryNotes] = useState(
    initialData?.medicalHistoryNotes ?? ""
  );
  const [fieldErrors, setFieldErrors] = useState<ValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function getFieldError(field: string): string | undefined {
    return fieldErrors.find((e) => e.field === field)?.message;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors([]);

    const payload = {
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      phone: phone || undefined,
      address: address || undefined,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactPhone: emergencyContactPhone || undefined,
      bloodType: bloodType || undefined,
      allergies: allergies || undefined,
      medicalHistoryNotes: medicalHistoryNotes || undefined,
    };

    const parsed = updatePatientProfileSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        }))
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profiles/patient", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        } else {
          toast.error(data.error || "Failed to save profile.");
        }
        return;
      }

      toast.success("Profile saved successfully.");
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="dateOfBirth">Date of Birth</Label>
        <Input
          id="dateOfBirth"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
        {getFieldError("dateOfBirth") && (
          <p className="text-sm text-destructive">{getFieldError("dateOfBirth")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="gender">Gender</Label>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
        {getFieldError("gender") && (
          <p className="text-sm text-destructive">{getFieldError("gender")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 123-4567"
        />
        {getFieldError("phone") && (
          <p className="text-sm text-destructive">{getFieldError("phone")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, City, State"
        />
        {getFieldError("address") && (
          <p className="text-sm text-destructive">{getFieldError("address")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
          <Input
            id="emergencyContactName"
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
            placeholder="Contact name"
          />
          {getFieldError("emergencyContactName") && (
            <p className="text-sm text-destructive">{getFieldError("emergencyContactName")}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
          <Input
            id="emergencyContactPhone"
            value={emergencyContactPhone}
            onChange={(e) => setEmergencyContactPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
          {getFieldError("emergencyContactPhone") && (
            <p className="text-sm text-destructive">{getFieldError("emergencyContactPhone")}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bloodType">Blood Type</Label>
        <Select value={bloodType} onValueChange={setBloodType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select blood type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A+">A+</SelectItem>
            <SelectItem value="A-">A-</SelectItem>
            <SelectItem value="B+">B+</SelectItem>
            <SelectItem value="B-">B-</SelectItem>
            <SelectItem value="AB+">AB+</SelectItem>
            <SelectItem value="AB-">AB-</SelectItem>
            <SelectItem value="O+">O+</SelectItem>
            <SelectItem value="O-">O-</SelectItem>
          </SelectContent>
        </Select>
        {getFieldError("bloodType") && (
          <p className="text-sm text-destructive">{getFieldError("bloodType")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="allergies">Allergies</Label>
        <Textarea
          id="allergies"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="List any known allergies..."
          rows={3}
        />
        {getFieldError("allergies") && (
          <p className="text-sm text-destructive">{getFieldError("allergies")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="medicalHistoryNotes">Medical History Notes</Label>
        <Textarea
          id="medicalHistoryNotes"
          value={medicalHistoryNotes}
          onChange={(e) => setMedicalHistoryNotes(e.target.value)}
          placeholder="Any relevant medical history..."
          rows={4}
        />
        {getFieldError("medicalHistoryNotes") && (
          <p className="text-sm text-destructive">{getFieldError("medicalHistoryNotes")}</p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
