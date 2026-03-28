"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { User, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";
const ACCEPTED_TYPES_SET = new Set(["image/jpeg", "image/png", "image/webp"]);

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
}

export function PhotoUpload({ currentPhotoUrl }: PhotoUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES_SET.has(file.type)) {
      toast.error("Invalid file type. Accepted: JPEG, PNG, WebP");
      resetFileInput();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 5MB limit");
      resetFileInput();
      return;
    }

    // Revoke previous preview URL to avoid memory leaks
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setSelectedFile(file);
  }

  function cancelPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    resetFileInput();
  }

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/profiles/photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to upload photo");
        return;
      }

      // Update displayed photo with the new URL from the server
      setPhotoUrl(data.url);
      toast.success("Profile photo updated successfully");

      // Clean up preview state
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setSelectedFile(null);
      resetFileInput();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = previewUrl ?? photoUrl;

  return (
    <div className="flex items-center gap-6">
      {/* Avatar display */}
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Profile photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Choose profile photo"
        />

        {!selectedFile ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Choose Photo
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={cancelPreview}
              disabled={uploading}
              aria-label="Cancel photo selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP. Max 5MB.
        </p>
      </div>
    </div>
  );
}
