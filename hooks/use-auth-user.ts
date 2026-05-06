"use client";

import { useSession } from "next-auth/react";

import type { AuthUser } from "@/lib/auth-types";

export function useAuthUser(): AuthUser | null {
  const { data: session, status } = useSession();

  if (status !== "authenticated" || !session?.user) return null;

  const u = session.user;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    branchId: u.branchId,
    branchName: u.branchName,
  };
}
