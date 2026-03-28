"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateDoctorProfileSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DoctorProfileData {
  specialization?: string | null;
  qualifications?: string | null;
  bio?: string | null;
  phone?: string | null;
  consultationFee?: string | number | null;
  yearsOfExperience?: number | null;
}

interface DoctorProfileFormProps {
  initialData?: DoctorProfileData | null;
}

interface ValidationError {
  field: string;
  message: string;
}

export function DoctorProfileForm({ initialData }: DoctorProfileFormProps) {
  const [specialization, setSpecialization] = useState(initialData?.specialization ?? "");
  const [qualifications, setQualifications] = useState(initialData?.qualifications ?? "");
  const [bio, setBio] = useState(initialData?.bio ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [consultationFee, setConsultationFee] = useState(
    initialData?.consultationFee != null ? String(initialData.consultationFee) : ""
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(
    initialData?.yearsOfExperience != null ? String(initialData.yearsOfExperience) : ""
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
      specialization,
      qualifications: qualifications || undefined,
      bio: bio || undefined,
      phone: phone || undefined,
      consultationFee: consultationFee !== "" ? Number(consultationFee) : undefined,
      yearsOfExperience: yearsOfExperience !== "" ? Number(yearsOfExperience) : undefined,
    };

    const parsed = updateDoctorProfileSchema.safeParse(payload);
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
      const res = await fetch("/api/profiles/doctor", {
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
        <Label htmlFor="specialization">Specialization *</Label>
        <Input
          id="specialization"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          placeholder="e.g. Cardiology"
        />
        {getFieldError("specialization") && (
          <p className="text-sm text-destructive">{getFieldError("specialization")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="qualifications">Qualifications</Label>
        <Textarea
          id="qualifications"
          value={qualifications}
          onChange={(e) => setQualifications(e.target.value)}
          placeholder="e.g. MBBS, MD, FACC"
          rows={3}
        />
        {getFieldError("qualifications") && (
          <p className="text-sm text-destructive">{getFieldError("qualifications")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell patients about yourself..."
          rows={4}
        />
        {getFieldError("bio") && (
          <p className="text-sm text-destructive">{getFieldError("bio")}</p>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="consultationFee">Consultation Fee ($) *</Label>
          <Input
            id="consultationFee"
            type="number"
            min="0"
            step="0.01"
            value={consultationFee}
            onChange={(e) => setConsultationFee(e.target.value)}
            placeholder="0.00"
          />
          {getFieldError("consultationFee") && (
            <p className="text-sm text-destructive">{getFieldError("consultationFee")}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
          <Input
            id="yearsOfExperience"
            type="number"
            min="0"
            step="1"
            value={yearsOfExperience}
            onChange={(e) => setYearsOfExperience(e.target.value)}
            placeholder="0"
          />
          {getFieldError("yearsOfExperience") && (
            <p className="text-sm text-destructive">{getFieldError("yearsOfExperience")}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}
