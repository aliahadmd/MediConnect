"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Save, Loader2, Check } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface NotesPanelProps {
  appointmentId: string;
}

const AUTO_SAVE_INTERVAL = 15_000; // 15 seconds

export function NotesPanel({ appointmentId }: NotesPanelProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const lastSavedContentRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    immediatelyRender: false,
  });

  const saveNotes = useCallback(
    async (content: string) => {
      if (!isMountedRef.current) return;
      if (content === lastSavedContentRef.current) return;

      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/consultation/${appointmentId}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error("Save failed");
        lastSavedContentRef.current = content;
        if (isMountedRef.current) setSaveStatus("saved");
      } catch {
        if (isMountedRef.current) setSaveStatus("error");
      }
    },
    [appointmentId]
  );

  // Auto-save on interval
  useEffect(() => {
    if (!editor) return;

    saveTimerRef.current = setInterval(() => {
      const content = editor.getHTML();
      saveNotes(content);
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [editor, saveNotes]);

  // Persist final version on unmount (call end)
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (editor) {
        const content = editor.getHTML();
        if (content !== lastSavedContentRef.current) {
          // Fire-and-forget final save
          fetch(`/api/consultation/${appointmentId}/notes`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
            keepalive: true,
          }).catch(() => {});
        }
      }
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [editor, appointmentId]);

  const handleManualSave = () => {
    if (!editor) return;
    saveNotes(editor.getHTML());
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Consultation Notes
          </CardTitle>
          <SaveStatusIndicator status={saveStatus} />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="prose prose-sm max-w-none p-4 [&_.tiptap]:min-h-[200px] [&_.tiptap]:outline-none">
          <EditorContent editor={editor} />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSave}
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="mr-1 size-3 animate-spin" />
          ) : (
            <Save className="mr-1 size-3" />
          )}
          Save Notes
        </Button>
      </CardFooter>
    </Card>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Check className="size-3" />
        Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-xs text-destructive">Save failed</span>
    );
  }
  return null;
}
