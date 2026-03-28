"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AvailabilitySlot {
  id: string;
  doctorId: string;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  createdAt: string;
}

interface SlotsResponse {
  slots: AvailabilitySlot[];
  total: number;
  page: number;
  limit: number;
}

const LIMIT = 20;

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

export function AvailabilityManager() {
  const [data, setData] = useState<SlotsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);

  // Filters
  const [doctorName, setDoctorName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (doctorName.trim()) params.set("doctorName", doctorName.trim());
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("page", String(page));
      params.set("limit", String(LIMIT));

      const res = await fetch(`/api/admin/availability?${params.toString()}`);
      if (res.ok) {
        const json: SlotsResponse = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [doctorName, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    if (selectedIds.size === data.slots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.slots.map((s) => s.id)));
    }
  }

  const selectedSlots = data?.slots.filter((s) => selectedIds.has(s.id)) ?? [];
  const bookedCount = selectedSlots.filter((s) => s.isBooked).length;

  async function handleDelete() {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/availability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setShowDeleteDialog(false);
        setSelectedIds(new Set());
        await fetchSlots();
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleFilterApply() {
    setPage(1);
    // fetchSlots will be triggered by the page change via useEffect
    // But if page is already 1, we need to trigger manually
    fetchSlots();
  }

  function handleFilterReset() {
    setDoctorName("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;
  const allSelected =
    data !== null && data.slots.length > 0 && selectedIds.size === data.slots.length;

  return (
    <div className="space-y-4">
      {/* Filter controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            Doctor Name
          </label>
          <Input
            placeholder="Search by doctor name…"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            className="w-[200px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            From
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">
            To
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleFilterApply}>
          Apply
        </Button>
        <Button variant="ghost" size="sm" onClick={handleFilterReset}>
          Reset
        </Button>
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="destructive"
          size="sm"
          disabled={selectedIds.size === 0}
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete Selected ({selectedIds.size})
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                  aria-label="Select all slots"
                />
              </TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time Range</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : data && data.slots.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No availability slots found.
                </TableCell>
              </TableRow>
            ) : (
              data?.slots.map((slot) => (
                <TableRow
                  key={slot.id}
                  data-state={selectedIds.has(slot.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(slot.id)}
                      onChange={() => toggleSelect(slot.id)}
                      className="h-4 w-4 rounded border-gray-300"
                      aria-label={`Select slot for ${slot.doctorName} on ${slot.date}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {slot.doctorName}
                  </TableCell>
                  <TableCell>{formatDate(slot.date)}</TableCell>
                  <TableCell>
                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={slot.isBooked ? "default" : "outline"}
                      className="capitalize"
                    >
                      {slot.isBooked ? "Booked" : "Available"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.total ?? 0} slots)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              {selectedSlots.length === 1
                ? "Are you sure you want to delete this availability slot?"
                : `Are you sure you want to delete ${selectedSlots.length} availability slots?`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {selectedSlots.length === 1 && selectedSlots[0] && (
              <div className="rounded-md border p-3 space-y-1">
                <p>
                  <span className="font-medium">Doctor:</span>{" "}
                  {selectedSlots[0].doctorName}
                </p>
                <p>
                  <span className="font-medium">Date:</span>{" "}
                  {formatDate(selectedSlots[0].date)}
                </p>
                <p>
                  <span className="font-medium">Time:</span>{" "}
                  {formatTime(selectedSlots[0].startTime)} –{" "}
                  {formatTime(selectedSlots[0].endTime)}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  {selectedSlots[0].isBooked ? "Booked" : "Available"}
                </p>
              </div>
            )}

            {selectedSlots.length > 1 && (
              <div className="rounded-md border p-3 space-y-1 max-h-[200px] overflow-y-auto">
                {selectedSlots.map((slot) => (
                  <p key={slot.id}>
                    {slot.doctorName} — {formatDate(slot.date)}{" "}
                    {formatTime(slot.startTime)}–{formatTime(slot.endTime)}{" "}
                    {slot.isBooked && (
                      <Badge variant="default" className="ml-1 text-[10px]">
                        Booked
                      </Badge>
                    )}
                  </p>
                ))}
              </div>
            )}

            {bookedCount > 0 && (
              <p className="text-destructive font-medium">
                ⚠ {bookedCount} booked{" "}
                {bookedCount === 1 ? "appointment" : "appointments"} will be
                cancelled.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
