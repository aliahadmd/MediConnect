"use client";

import { useCallback, useEffect, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlotForm } from "@/components/availability/slot-form";

interface AvailabilitySlot {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  createdAt: string;
}

interface CalendarViewProps {
  doctorId: string;
}

export function CalendarView({ doctorId }: CalendarViewProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [loading, setLoading] = useState(true);
  const [slotFormOpen, setSlotFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`/api/availability?doctorId=${doctorId}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch {
      // silently fail — slots will remain empty
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function handlePrevWeek() {
    setWeekStart((prev) => addDays(prev, -7));
  }

  function handleNextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
  }

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      setSelectedDate(date);
      setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
    }
  }

  async function handleDeleteSlot(slotId: string) {
    setDeletingId(slotId);
    try {
      const res = await fetch(`/api/availability/${slotId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchSlots();
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

  function getSlotsForDate(date: Date): AvailabilitySlot[] {
    return slots
      .filter((slot) => {
        const slotDate = parseISO(slot.date);
        return isSameDay(slotDate, date);
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function handleSlotCreated() {
    setSlotFormOpen(false);
    fetchSlots();
  }

  // Dates that have slots — used to highlight on the mini calendar
  const datesWithSlots = slots.map((s) => parseISO(s.date));

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar: mini calendar + add button */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              modifiers={{ hasSlots: datesWithSlots }}
              modifiersClassNames={{
                hasSlots: "bg-primary/10 font-semibold",
              }}
            />
          </CardContent>
        </Card>
        <Button className="w-full" onClick={() => setSlotFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Slot
        </Button>
      </div>

      {/* Main: weekly view */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            {format(weekStart, "MMM d")} –{" "}
            {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              Loading slots…
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const daySlots = getSlotsForDate(day);
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[120px] rounded-lg border p-2 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : isToday
                          ? "border-primary/40"
                          : "border-border"
                    }`}
                  >
                    <div className="mb-2 text-center">
                      <div className="text-xs text-muted-foreground">
                        {format(day, "EEE")}
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          isToday ? "text-primary" : ""
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`group relative rounded-md px-1.5 py-1 text-xs ${
                            slot.isBooked
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">
                              {slot.startTime.slice(0, 5)} –{" "}
                              {slot.endTime.slice(0, 5)}
                            </span>
                            {slot.isBooked ? (
                              <Badge
                                variant="secondary"
                                className="h-4 text-[10px]"
                              >
                                Booked
                              </Badge>
                            ) : (
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                disabled={deletingId === slot.id}
                                className="hidden shrink-0 rounded p-0.5 text-destructive hover:bg-destructive/10 group-hover:inline-flex"
                                aria-label={`Delete slot ${slot.startTime.slice(0, 5)} – ${slot.endTime.slice(0, 5)}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {daySlots.length === 0 && (
                        <div className="text-center text-[10px] text-muted-foreground">
                          No slots
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SlotForm
        open={slotFormOpen}
        onOpenChange={setSlotFormOpen}
        onSuccess={handleSlotCreated}
        defaultDate={selectedDate}
      />
    </div>
  );
}
