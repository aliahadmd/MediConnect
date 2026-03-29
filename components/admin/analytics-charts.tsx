"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, DollarSign, Users } from "lucide-react";

interface AnalyticsData {
  totalConsultations: number;
  totalRevenue: number;
  activeDoctors: number;
  consultationTrend: Array<{ date: string; count: number }>;
}

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/admin/analytics?${params.toString()}`);
      if (res.ok) {
        const json: AnalyticsData = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const stats = [
    {
      title: "Total Consultations",
      value: data?.totalConsultations ?? 0,
      format: (v: number) => v.toLocaleString(),
      icon: Activity,
      bg: "bg-kiosk-primary/10",
      iconColor: "text-kiosk-primary",
    },
    {
      title: "Total Revenue",
      value: data?.totalRevenue ?? 0,
      format: (v: number) => `$${v.toLocaleString()}`,
      icon: DollarSign,
      bg: "bg-kiosk-success/10",
      iconColor: "text-kiosk-success",
    },
    {
      title: "Active Doctors",
      value: data?.activeDoctors ?? 0,
      format: (v: number) => v.toLocaleString(),
      icon: Users,
      bg: "bg-kiosk-info/10",
      iconColor: "text-kiosk-info",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="from-date">From</Label>
              <Input
                id="from-date"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to-date">To</Label>
              <Input
                id="to-date"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-3" data-testid="admin-stat-cards">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={stat.bg}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`size-8 ${stat.iconColor}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {loading ? "…" : stat.format(stat.value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Consultation trend bar chart */}
      <Card>
        <CardHeader>
          <CardTitle>Consultation Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Loading chart…
            </div>
          ) : !data?.consultationTrend.length ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No consultation data for the selected period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.consultationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Consultations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
