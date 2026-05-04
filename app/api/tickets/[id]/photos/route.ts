import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { PHOTO_TYPE } from "@/lib/db-enums";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_PHOTO_TYPES = new Set(Object.values(PHOTO_TYPE));

function extensionFromMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ticketId = params.id.trim();
  const form = await request.formData();
  const branchId = String(form.get("branchId") ?? "").trim();
  const photoType = String(form.get("photoType") ?? "").trim();
  const file = form.get("file");

  if (!ticketId || !branchId || !VALID_PHOTO_TYPES.has(photoType as (typeof PHOTO_TYPE)[keyof typeof PHOTO_TYPE])) {
    return NextResponse.json({ error: "ticket id, branchId, and valid photoType are required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be <= 5MB." }, { status: 400 });
  }

  const ticket = await prisma.serviceTicket.findFirst({
    where: { id: ticketId, branchId },
    select: { id: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = extensionFromMime(file.type);
  const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
  const relativeDir = path.posix.join("uploads", "tickets", ticketId);
  const relativePath = path.posix.join(relativeDir, fileName);
  const absoluteDir = path.join(process.cwd(), "public", "uploads", "tickets", ticketId);
  const absolutePath = path.join(absoluteDir, fileName);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, bytes);

  const created = await prisma.ticketPhoto.create({
    data: {
      ticketId,
      photoType,
      imagePath: `/${relativePath}`,
    },
  });

  return NextResponse.json({ photo: created }, { status: 201 });
}
