import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Body = {
  username?: string;
  password?: string;
  branchId?: string;
};

async function ensureDefaultOwnerAccount() {
  let mandalay = await prisma.branch.findFirst({
    where: { name: "Mandalay" },
    select: { id: true },
  });
  if (!mandalay) {
    mandalay = await prisma.branch.create({
      data: { name: "Mandalay", location: "Mandalay" },
      select: { id: true },
    });
  }

  const existingOwner = await prisma.user.findUnique({ where: { username: "owner" } });
  if (!existingOwner) {
    const passwordHash = await bcrypt.hash("owner123", 10);
    await prisma.user.create({
      data: {
        username: "owner",
        passwordHash,
        role: "OWNER",
        branchId: mandalay.id,
      },
    });
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";

  if (!username || !password || !branchId) {
    return NextResponse.json({ error: "Username, password, and branch are required." }, { status: 400 });
  }

  await ensureDefaultOwnerAccount();

  const user = await prisma.user.findUnique({
    where: { username },
    include: { branch: { select: { id: true, name: true } } },
  });

  const genericError = NextResponse.json(
    { error: "Invalid username, password, or branch." },
    { status: 401 }
  );

  if (!user || user.branchId !== branchId) {
    return genericError;
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return genericError;
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch.name,
    },
  });
}
