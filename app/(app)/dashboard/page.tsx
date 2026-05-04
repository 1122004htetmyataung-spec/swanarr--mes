"use client";

import Link from "next/link";
import { Plus, Sparkles, Wrench } from "lucide-react";

import { DashboardMetricCards } from "@/components/dashboard/metric-cards";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useShellStrings } from "@/lib/hooks/use-shell-strings";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const t = useShellStrings();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <Sparkles className="size-7 text-primary" aria-hidden />
            {t.dashboard_title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            {t.dashboard_sub} ·{" "}
            <span className="font-semibold text-foreground">{user.branchName}</span>
          </p>
          <p className="font-mm mt-1 text-sm text-muted-foreground">
            {user.username} · {user.role}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-2xl shadow-md">
            <Link href="/pos">
              <Plus className="size-4" aria-hidden />
              {t.quick_sale}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl border-primary/30 bg-white/70 shadow-md backdrop-blur-sm">
            <Link href="/tickets">
              <Wrench className="size-4" aria-hidden />
              {t.quick_ticket}
            </Link>
          </Button>
        </div>
      </div>

      <DashboardMetricCards />

      <Card
        className={cn(
          "rounded-3xl border-white/50 bg-white/75 shadow-glass backdrop-blur-md"
        )}
      >
        <CardHeader>
          <CardTitle className="text-lg font-bold tracking-tight">
            {t.recent_title}
          </CardTitle>
          <CardDescription className="font-mm">{t.recent_empty}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-center font-mm">
              —
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
