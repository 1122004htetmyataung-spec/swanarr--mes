import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { USER_ROLE } from "@/lib/db-enums";

type UserRoleValue = (typeof USER_ROLE)[keyof typeof USER_ROLE];

function normalizeRole(role: string): UserRoleValue {
  const validRoles = Object.values(USER_ROLE);
  if (validRoles.includes(role as UserRoleValue)) {
    return role as UserRoleValue;
  }
  throw new Error(`Invalid role: ${role}`);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { error: "branchId is required" },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: { branchId },
      select: {
        id: true,
        username: true,
        role: true,
        branchId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Users fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, role, branchId } = await req.json() as {
      username: string;
      password: string;
      role: string;
      branchId: string;
    };

    // Validate required fields
    if (!username || !password || !role || !branchId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate and normalize role
    let normalizedRole: UserRoleValue;
    try {
      normalizedRole = normalizeRole(role);
    } catch {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
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
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
