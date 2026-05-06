"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Cpu, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

type BranchRow = { id: string; name: string; location: string };

async function fetchBranches(): Promise<BranchRow[]> {
  const res = await fetch("/api/branches");
  if (!res.ok) throw new Error("Failed to load branches");
  const data = (await res.json()) as { branches: BranchRow[] };
  return data.branches;
}

async function postLogin(payload: {
  username: string;
  password: string;
  branchId: string;
}): Promise<void> {
  const res = await signIn("credentials", {
    ...payload,
    redirect: false,
  });
  if (res?.error) {
    throw new Error("Invalid username, password, or branch.");
  }
}

export default function LoginPage() {
  const router = useRouter();
  const setCartBranch = useCartStore((s) => s.setBranchId);

  const [branchId, setBranchId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
  });

  useEffect(() => {
    if (branches.length && !branchId) {
      setBranchId(branches[0].id);
    }
  }, [branches, branchId]);

  const loginMutation = useMutation({
    mutationFn: postLogin,
    onSuccess: async (_, variables) => {
      setCartBranch(variables.branchId);
      router.push("/dashboard");
      router.refresh();
    },
  });

  const errorMessage =
    loginMutation.error instanceof Error
      ? loginMutation.error.message
      : loginMutation.isError
        ? "Login failed"
        : null;

  return (
    <div
      className={cn(
        "relative flex min-h-screen items-center justify-center overflow-hidden p-4",
        "bg-gradient-to-br from-slate-100 via-blue-50/60 to-slate-200"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(30,58,138,0.18),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(220,38,38,0.08),transparent_45%)]"
      />

      <Card
        className={cn(
          "relative z-10 w-full max-w-md animate-fade-in border-white/50 shadow-glass-lg",
          "rounded-3xl bg-white/80 backdrop-blur-md"
        )}
      >
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/30">
            <Cpu className="h-8 w-8" aria-hidden />
          </div>
          <CardTitle className="font-sans text-2xl font-bold tracking-tight text-foreground">
            SwanAar II Electronics
          </CardTitle>
          <CardDescription className="font-mm text-sm text-muted-foreground">
            စီမံခန့်ခွဲမှု နှင့် ဝန်ဆောင်မှု စနစ် · MES login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!branchId) return;
              loginMutation.mutate({ username, password, branchId });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="branch" className="text-sm font-medium">
                Branch / ဆိုင်ခွဲ
              </Label>
              <Select
                value={branchId}
                onValueChange={setBranchId}
                disabled={branchesLoading || branches.length === 0}
              >
                <SelectTrigger
                  id="branch"
                  className="h-11 rounded-2xl border-input bg-white/70 shadow-md backdrop-blur-sm"
                >
                  <SelectValue
                    placeholder={
                      branchesLoading ? "Loading branches…" : "Select branch"
                    }
                  />
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

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-2xl border-input bg-white/70 shadow-md backdrop-blur-sm"
                placeholder="owner"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-2xl border-input bg-white/70 shadow-md backdrop-blur-sm"
                placeholder="••••••••••••"
                required
              />
            </div>

            {errorMessage ? (
              <p
                className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl text-base shadow-lg"
              disabled={loginMutation.isPending || !branchId}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo: user <code className="rounded bg-muted px-1">owner</code> on{" "}
            <strong>Mandalay</strong> — password from seed (
            <code className="rounded bg-muted px-1">owner123</code>).
          </p>
        </CardContent>
      </Card>

      <Link
        href="/"
        className="absolute bottom-4 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
