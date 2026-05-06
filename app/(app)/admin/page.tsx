"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthUser } from "@/hooks/use-auth-user";
import { USER_ROLE } from "@/lib/db-enums";

interface ActivityResponse {
  id: string;
  userId: string;
  action: string;
  details: string | null;
  timestamp: string;
  username?: string;
}

export default function AdminPage() {
  const user = useAuthUser();

  const { data: activityLogs = [], isLoading: logsLoading } = useQuery<
    ActivityResponse[]
  >({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      const response = await fetch("/api/activity-logs?limit=50");
      if (!response.ok) return [];
      return response.json();
    },
    enabled: user?.role === USER_ROLE.OWNER,
  });

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (user.role !== USER_ROLE.OWNER) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border border-destructive/25 bg-destructive/5 p-8 text-center shadow-sm">
        <ShieldAlert className="size-12 text-destructive" aria-hidden />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Access denied</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Only users with the Owner role can open the admin area.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Owner tools and recent activity across branches.
        </p>
      </div>

      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>User management</CardTitle>
            <CardDescription>
              Create accounts, set roles (including Owner), and assign branches. Access is
              restricted to Owners at the API layer.
            </CardDescription>
          </div>
          <Button asChild className="shrink-0 rounded-2xl gap-2 shadow-md">
            <Link href="/admin/users">
              Open users
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Activity logs</h2>
        <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/40 bg-white/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">User</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                      <th className="px-4 py-3 text-left font-medium">Details</th>
                      <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-white/20 transition-colors hover:bg-white/30"
                      >
                        <td className="px-4 py-2">{log.username || "Unknown"}</td>
                        <td className="px-4 py-2 font-medium">{log.action}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {log.details}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
