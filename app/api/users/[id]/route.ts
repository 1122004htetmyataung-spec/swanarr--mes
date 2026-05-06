import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { USER_ROLE } from "@/lib/db-enums";
import { requireOwner } from "@/lib/require-owner";

export const dynamic = "force-dynamic";

type UpdateData = {
  username?: string;
  passwordHash?: string;
  role?: string;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireOwner();
  if (!gate.ok) return gate.response;

  try {
    const { id } = params;
    const body = (await req.json()) as {
      username?: string;
      password?: string;
      role?: string;
    };

    const target = await prisma.user.findUnique({ where: { id } });

    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updateData: UpdateData = {};

    if (typeof body.username === "string" && body.username.trim()) {
      updateData.username = body.username.trim();
    }
    if (typeof body.password === "string" && body.password.length > 0) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }
    if (typeof body.role === "string" && body.role.trim()) {
      const validRoles = Object.values(USER_ROLE) as string[];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      updateData.role = body.role;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
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
      id: updated.id,
      username: updated.username,
      role: updated.role,
      branchId: updated.branchId,
      branchName: updated.branch.name,
      branchLocation: updated.branch.location,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error: unknown) {
    console.error("User update error:", error);
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
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireOwner();
  if (!gate.ok) return gate.response;

  try {
    const { id } = params;

    if (id === gate.userId) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role === USER_ROLE.OWNER) {
      const ownerCount = await prisma.user.count({
        where: { role: USER_ROLE.OWNER },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last owner account." },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("User deletion error:", error);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
