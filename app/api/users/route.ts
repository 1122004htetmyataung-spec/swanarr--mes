import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/lib/db-enums";
import { requireOwner } from "@/lib/require-owner";

export const dynamic = "force-dynamic";

type UserRoleValue = (typeof USER_ROLE)[keyof typeof USER_ROLE];

function normalizeRole(role: string): UserRoleValue {
  const validRoles = Object.values(USER_ROLE);
  if (validRoles.includes(role as UserRoleValue)) {
    return role as UserRoleValue;
  }
  throw new Error(`Invalid role: ${role}`);
}

/** List users (all branches, or filter by branchId). OWNER only. */
export async function GET(req: NextRequest) {
  const gate = await requireOwner();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    const users = await prisma.user.findMany({
      where: branchId ? { branchId } : undefined,
      orderBy: [{ branchId: "asc" }, { username: "asc" }],
      select: {
        id: true,
        username: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        branch: { select: { name: true, location: true } },
      },
    });

    const payload = users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      branchId: u.branchId,
      branchName: u.branch.name,
      branchLocation: u.branch.location,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}

/** Create user. OWNER only. Password hashed with bcrypt. */
export async function POST(req: NextRequest) {
  const gate = await requireOwner();
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as {
      username?: string;
      password?: string;
      role?: string;
      branchId?: string;
    };

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const roleRaw = typeof body.role === "string" ? body.role.trim() : "";
    const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";

    if (!username || !password || !roleRaw || !branchId) {
      return NextResponse.json(
        { error: "Username, password, role, and branch are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    let normalizedRole: UserRoleValue;
    try {
      normalizedRole = normalizeRole(roleRaw);
    } catch {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: normalizedRole,
        branchId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
        branch: { select: { name: true, location: true } },
      },
    });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch.name,
      branchLocation: user.branch.location,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error("User creation error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
