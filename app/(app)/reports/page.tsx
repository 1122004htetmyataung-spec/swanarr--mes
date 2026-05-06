"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMmk } from "@/lib/format-mmk";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useState } from "react";

type ReportResponse = {
  summary: { totalSales: number; totalProfit: number; saleCount: number };
  rows: Array<{ id: string; createdAt: string; paymentMethod: string; totalAmount: number; itemCount: number }>;
  categoryProfit: Array<{ category: string; profit: number }>;
};

export default function ReportsPage() {
  const user = useAuthUser();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["reports-sales", user?.branchId, from, to],
    queryFn: async () => {
      const res = await fetch(
        `/api/reports/sales?branchId=${encodeURIComponent(user?.branchId ?? "")}&from=${from}&to=${to}`
      );
      return (await res.json()) as ReportResponse;
    },
    enabled: Boolean(user?.branchId),
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader><CardTitle>Sales report</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">From</p>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">To</p>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="rounded-2xl border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Total sales</p>
            <p className="text-xl font-bold">{formatMmk(data?.summary.totalSales ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Profit: {formatMmk(data?.summary.totalProfit ?? 0)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader><CardTitle>Profit by category</CardTitle></CardHeader>
        <CardContent className="h-80">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading chart...</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categoryProfit ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value) => formatMmk(Number(value ?? 0))} />
                <Bar dataKey="profit" fill="#1E3A8A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader><CardTitle>Sales rows</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Payment</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{row.paymentMethod}</td>
                  <td className="px-3 py-2 text-right">{row.itemCount}</td>
                  <td className="px-3 py-2 text-right">{formatMmk(row.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
