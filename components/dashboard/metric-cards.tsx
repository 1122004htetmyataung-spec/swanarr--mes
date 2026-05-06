"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Loader2,
  Ticket,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMmk } from "@/lib/format-mmk";
import { useShellStrings } from "@/lib/hooks/use-shell-strings";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/hooks/use-auth-user";

type Metric = {
  key: "metric_sales" | "metric_tickets" | "metric_stock" | "metric_profit";
  icon: LucideIcon;
  value: string;
  accent: string;
};

const PLACEHOLDER_METRICS: Omit<Metric, "key">[] = [
  { icon: Banknote, value: "—", accent: "from-emerald-500/90 to-emerald-600/80" },
  { icon: Ticket, value: "—", accent: "from-sky-500/90 to-blue-600/80" },
  { icon: AlertTriangle, value: "—", accent: "from-amber-500/90 to-orange-600/80" },
  { icon: TrendingUp, value: "—", accent: "from-violet-500/90 to-indigo-600/80" },
];

type DashboardMetrics = {
  todaySales: number;
  activeTickets: number;
  lowStockSkus: number;
  todayProfit: number;
};

async function fetchMetrics(branchId: string): Promise<DashboardMetrics> {
  const res = await fetch(`/api/dashboard/metrics?branchId=${encodeURIComponent(branchId)}`);
  const data = (await res.json()) as {
    metrics?: DashboardMetrics;
    error?: string;
  };
  if (!res.ok || !data.metrics) {
    throw new Error(data.error ?? "Failed to load dashboard metrics.");
  }
  return data.metrics;
}

export function DashboardMetricCards() {
  const t = useShellStrings();
  const user = useAuthUser();
  const keys: Metric["key"][] = [
    "metric_sales",
    "metric_tickets",
    "metric_stock",
    "metric_profit",
  ];
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-metrics", user?.branchId],
    queryFn: () => fetchMetrics(user?.branchId ?? ""),
    enabled: Boolean(user?.branchId),
    refetchInterval: 20_000,
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {keys.map((key, i) => {
        const { icon: Icon, accent } = PLACEHOLDER_METRICS[i];
        const value = data
          ? key === "metric_sales"
            ? formatMmk(data.todaySales)
            : key === "metric_tickets"
              ? String(data.activeTickets)
              : key === "metric_stock"
                ? String(data.lowStockSkus)
                : formatMmk(data.todayProfit)
          : "—";
        return (
          <Card
            key={key}
            className={cn(
              "overflow-hidden rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-sm",
              "transition-all duration-200 hover:scale-[1.02] hover:shadow-glass-lg"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t[key]}
              </CardTitle>
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md",
                  accent
                )}
              >
                <Icon className="size-5" aria-hidden />
              </div>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                {value}
              </p>
              <p className="mt-1 font-mm text-xs text-muted-foreground">Live data</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
