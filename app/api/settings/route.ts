import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId")?.trim() ?? "";
  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }

  const setting = await prisma.appSetting.findUnique({ where: { branchId } });
  if (!setting) {
    const created = await prisma.appSetting.create({
      data: { branchId },
    });
    return NextResponse.json({ setting: created });
  }
  return NextResponse.json({ setting });
}

export async function PATCH(request: Request) {
  const form = await request.formData();
  const branchId = String(form.get("branchId") ?? "").trim();
  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }

  const shopName = String(form.get("shopName") ?? "").trim();
  const primaryColor = String(form.get("primaryColor") ?? "").trim();
  const logo = form.get("logo");

  let logoUrl: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/")) {
      return NextResponse.json({ error: "Logo must be an image." }, { status: 400 });
    }
    const ext = logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg";
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    const dirPath = path.join(process.cwd(), "public", "uploads", "branding", branchId);
    await mkdir(dirPath, { recursive: true });
    await writeFile(path.join(dirPath, fileName), Buffer.from(await logo.arrayBuffer()));
    logoUrl = `/uploads/branding/${branchId}/${fileName}`;
  }

  const setting = await prisma.appSetting.upsert({
    where: { branchId },
    update: {
      ...(shopName ? { shopName } : {}),
      ...(primaryColor ? { primaryColor } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    },
    create: {
      branchId,
      shopName: shopName || "SwanAar II Electronics",
      primaryColor: primaryColor || "#1E3A8A",
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  return NextResponse.json({ setting });
}
