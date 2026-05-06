"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, Plus, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthUser } from "@/hooks/use-auth-user";
import { USER_ROLE } from "@/lib/db-enums";
import { cn } from "@/lib/utils";

type BranchRow = { id: string; name: string; location: string };

type UserRow = {
  id: string;
  username: string;
  role: string;
  branchId: string;
  branchName: string;
  branchLocation: string;
  isActive: boolean;
  createdAt: string;
};

const ROLE_OPTIONS = Object.values(USER_ROLE);

function roleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  if (role === USER_ROLE.OWNER) return "default";
  if (role === USER_ROLE.MANAGER) return "secondary";
  return "outline";
}

async function fetchBranches(): Promise<BranchRow[]> {
  const res = await fetch("/api/branches");
  if (!res.ok) throw new Error("Failed to load branches");
  const data = (await res.json()) as { branches: BranchRow[] };
  return data.branches;
}

async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch("/api/users");
  if (res.status === 401 || res.status === 403) {
    throw new Error("forbidden");
  }
  if (!res.ok) throw new Error("Failed to load users");
  return (await res.json()) as UserRow[];
}

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const viewer = useAuthUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: USER_ROLE.STAFF as string,
    branchId: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: viewer?.role === USER_ROLE.OWNER,
  });

  useEffect(() => {
    if (branches.length === 0) return;
    setForm((f) => (f.branchId ? f : { ...f, branchId: branches[0].id }));
  }, [branches]);

  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: viewer?.role === USER_ROLE.OWNER,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password,
          role: form.role,
          branchId: form.branchId,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Create failed");
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm({
        username: "",
        password: "",
        role: USER_ROLE.STAFF,
        branchId: form.branchId || branches[0]?.id || "",
      });
      setFormError(null);
      setCreateOpen(false);
    },
    onError: (e: Error) => {
      setFormError(e.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (!viewer) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (viewer.role !== USER_ROLE.OWNER) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border border-destructive/25 bg-destructive/5 p-8 text-center shadow-sm">
        <ShieldAlert className="size-12 text-destructive" aria-hidden />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Access denied</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Only users with the Owner role can open User Management.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const loading = branchesLoading || usersLoading;
  const loadFailed =
    usersError instanceof Error && usersError.message === "forbidden";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            User management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View all accounts, assign roles and branches, and create sign-ins. Passwords
            are hashed with bcrypt on the server.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <Link href="/admin" className="text-primary underline-offset-4 hover:underline">
              Activity logs
            </Link>
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 gap-2 rounded-2xl shadow-md" disabled={!branches.length}>
              <Plus className="size-4" aria-hidden />
              Create user
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl border-white/50 bg-white/95 sm:rounded-3xl">
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                Add a new staff member or manager. They will sign in with username,
                password, and branch on the login page.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="cu-username">Username</Label>
                <Input
                  id="cu-username"
                  autoComplete="off"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="rounded-2xl"
                  placeholder="staff01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cu-password">Password</Label>
                <Input
                  id="cu-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="rounded-2xl"
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(role) => setForm((f) => ({ ...f, role }))}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r} className="rounded-xl">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={form.branchId}
                  onValueChange={(branchId) => setForm((f) => ({ ...f, branchId }))}
                  disabled={!branches.length}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder={branchesLoading ? "Loading…" : "Select branch"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="rounded-xl">
                        {b.name} — {b.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl"
                onClick={() => {
                  setCreateOpen(false);
                  setFormError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-2xl"
                disabled={
                  createMutation.isPending ||
                  !form.username.trim() ||
                  !form.password ||
                  !form.branchId
                }
                onClick={() => {
                  setFormError(null);
                  createMutation.mutate();
                }}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-3xl border-white/50 bg-white/80 shadow-glass backdrop-blur-md">
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>
            Passwords are never shown again after creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loadFailed ? (
            <p className="px-6 pb-6 text-sm text-destructive">
              You don&apos;t have permission to load this list.
            </p>
          ) : loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/40 bg-white/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/40 hover:bg-transparent">
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No users yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id} className="border-white/30">
                        <TableCell className="font-medium">{u.username}</TableCell>
                        <TableCell>
                          <Badge
                            variant={roleBadgeVariant(u.role)}
                            className="rounded-lg text-[10px] uppercase tracking-wide"
                          >
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{u.branchName}</span>
                          <span className="hidden text-xs text-muted-foreground sm:block">
                            {u.branchLocation}
                          </span>
                        </TableCell>
                        <TableCell>
                          {u.isActive ? (
                            <span className="text-xs text-emerald-700">Active</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Inactive</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {new Date(u.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                            )}
                            disabled={
                              deleteMutation.isPending ||
                              u.id === viewer.id ||
                              (u.role === USER_ROLE.OWNER &&
                                users.filter((x) => x.role === USER_ROLE.OWNER).length <= 1)
                            }
                            title={
                              u.id === viewer.id
                                ? "You cannot delete yourself"
                                : u.role === USER_ROLE.OWNER &&
                                    users.filter((x) => x.role === USER_ROLE.OWNER)
                                      .length <= 1
                                  ? "Cannot delete the last owner"
                                  : "Delete user"
                            }
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Delete user "${u.username}"? This cannot be undone.`
                                )
                              ) {
                                return;
                              }
                              deleteMutation.mutate(u.id);
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
