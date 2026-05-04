import { NextResponse } from "next/server";

import { TICKET_STATUS } from "@/lib/db-enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PatchBody = {
  branchId?: string;
  status?: string;
  technicianId?: string | null;
  estimatedCompletionDate?: string | null;
  internalNotes?: string;
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId")?.trim() ?? "";
  const id = params.id.trim();

  if (!branchId || !id) {
    return NextResponse.json({ error: "branchId and ticket id are required." }, { status: 400 });
  }

  const ticket = await prisma.serviceTicket.findFirst({
    where: { id, branchId },
    include: {
      customer: { select: { id: true, name: true, phone: true, address: true } },
      technician: { select: { id: true, username: true } },
      photos: { orderBy: { uploadedAt: "desc" } },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
  const id = params.id.trim();
  const validStatuses = new Set(Object.values(TICKET_STATUS));
  const nextStatus =
    typeof body.status === "string" && validStatuses.has(body.status as (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS])
      ? body.status
      : undefined;
  const technicianId =
    typeof body.technicianId === "string" && body.technicianId.trim()
      ? body.technicianId.trim()
      : body.technicianId === null
        ? null
        : undefined;
  const estimatedCompletionDate = parseDate(body.estimatedCompletionDate);
  const notes =
    typeof body.internalNotes === "string" ? body.internalNotes.trim() : undefined;

  if (!branchId || !id) {
    return NextResponse.json({ error: "branchId and ticket id are required." }, { status: 400 });
  }

  const existing = await prisma.serviceTicket.findFirst({
    where: { id, branchId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const updated = await prisma.serviceTicket.update({
    where: { id },
    data: {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(technicianId !== undefined ? { technicianId } : {}),
      ...(body.estimatedCompletionDate !== undefined
        ? { estimatedCompletionDate }
        : {}),
      ...(notes !== undefined ? { internalNotes: notes } : {}),
    },
  });

  return NextResponse.json({ ticket: updated });
}
