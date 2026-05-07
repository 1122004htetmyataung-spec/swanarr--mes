"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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

type BranchRow = { id: string; name: string; location: string };

async function fetchBranches(): Promise<BranchRow[]> {
  const res = await fetch("/api/branches");
  if (!res.ok) throw new Error("Failed to load branches");
  const data = (await res.json()) as { branches: BranchRow[] };
  return data.branches;
}

export default function LoginPage() {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    mutationFn: async () => {
      const result = await signIn("credentials", {
        redirect: false,
        username,
        password,
        branchId,
      });

      if (result?.error) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isUsernameValid = username.trim().length > 0;
    const isPasswordValid = password.length >= 8;

    setUsernameError(isUsernameValid ? null : "Please enter a username.");
    setPasswordError(
      isPasswordValid ? null : "Password must be at least 8 characters."
    );

    if (!isUsernameValid || !isPasswordValid || !branchId) {
      return;
    }

    loginMutation.mutate();
  };

  const errorMessage =
    loginMutation.error instanceof Error
      ? loginMutation.error.message
      : loginMutation.isError
      ? "Login failed. Check your credentials."
      : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1a1b2e] px-4 py-10 text-slate-50">
      {/* Background Abstract Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full bg-[#252644] opacity-50 blur-3xl" />
        <div className="absolute top-[20%] -right-[10%] h-[70%] w-[70%] rotate-12 rounded-[100px] bg-[#2a2b4d] opacity-40" />
        <div className="absolute -bottom-[20%] left-[20%] h-[50%] w-[80%] -rotate-12 rounded-[100px] bg-[#232441] opacity-30" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8">
        {/* Logo */}
        <div className="mb-4">
          <h1 className="text-5xl font-bold tracking-tight text-white">Swanarr2</h1>
        </div>

        {/* Login Card */}
        <div className="w-full rounded-2xl bg-[#252644]/80 p-8 shadow-2xl backdrop-blur-sm border border-white/5">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="branch" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                Branch
              </Label>
              <Select
                value={branchId}
                onValueChange={setBranchId}
                disabled={branchesLoading || branches.length === 0}
              >
                <SelectTrigger
                  id="branch"
                  className="h-14 rounded-xl border-none bg-[#34355a] text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-white/20"
                >
                  <SelectValue
                    placeholder={
                      branchesLoading ? "Loading branches…" : "Select branch"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="rounded-xl">
                      {b.name} — {b.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="owner"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-14 rounded-xl border-none bg-[#34355a] text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-white/20"
              />
              {usernameError ? <p className="text-xs text-rose-400 ml-1">{usernameError}</p > : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="PASSWORD"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-14 rounded-xl border-none bg-[#34355a] text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-white/20"
              />
              {passwordError ? <p className="text-xs text-rose-400 ml-1">{passwordError}</p > : null}
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-100">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex justify-center pt-2">
              <Button
                type="submit"
                className={cn(
                  "h-12 w-40 rounded-full bg-white px-6 text-sm font-bold uppercase tracking-widest text-[#1a1b2e] hover:bg-slate-200 transition-all duration-200",
                  loginMutation.isPending ? "cursor-wait opacity-80" : ""
                )}
                disabled={loginMutation.isPending || !branchId}
              >
                {loginMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Log In <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer Link */}
        <Link 
          href="#" 
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:text-white"
        >
          Forgot your password?
        </Link>
      </div>
    </div>
  );
}