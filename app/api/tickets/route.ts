import { NextResponse } from "next/server";

import { PRICE_TYPE, TICKET_STATUS, USER_ROLE } from "@/lib/db-enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CreateBody = {
  branchId?: string;
  userId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  description?: string;
  deviceName?: string;
  deviceBrand?: string;
  deviceModel?: string;
  technicianId?: string | null;
  priceType?: string;
  serviceCharge?: number;
  partsCost?: number;
  warrantyTerms?: string;
  estimatedCompletionDate?: string | null;
  internalNotes?: string;
};

function sanitizeDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId")?.trim() ?? "";

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }

  const [tickets, technicians] = await Promise.all([
    prisma.serviceTicket.findMany({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        technician: { select: { id: true, username: true } },
        photos: { select: { id: true, photoType: true, imagePath: true } },
      },
    }),
    prisma.user.findMany({
      where: { branchId, role: USER_ROLE.TECHNICIAN },
      orderBy: { username: "asc" },
      select: { id: true, username: true },
    }),
  ]);

  return NextResponse.json({ tickets, technicians });
}

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const customerName =
    typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerPhone =
    typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const technicianId =
    typeof body.technicianId === "string" && body.technicianId.trim()
      ? body.technicianId.trim()
      : null;
  const priceType =
    body.priceType === PRICE_TYPE.FIXED ? PRICE_TYPE.FIXED : PRICE_TYPE.ESTIMATE;
  const serviceCharge =
    typeof body.serviceCharge === "number" && Number.isFinite(body.serviceCharge)
      ? Math.max(0, body.serviceCharge)
      : 0;
  const partsCost =
    typeof body.partsCost === "number" && Number.isFinite(body.partsCost)
      ? Math.max(0, body.partsCost)
      : 0;
  const estimatedCompletionDate = sanitizeDate(body.estimatedCompletionDate);

  if (!branchId || !userId || !customerName || !customerPhone || !description) {
    return NextResponse.json(
      { error: "branchId, userId, customerName, customerPhone, and description are required." },
      { status: 400 }
    );
  }

  const actor = await prisma.user.findUnique({ where: { id: userId } });
  if (!actor || actor.branchId !== branchId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  if (technicianId) {
    const tech = await prisma.user.findUnique({ where: { id: technicianId } });
    if (!tech || tech.branchId !== branchId || tech.role !== USER_ROLE.TECHNICIAN) {
      return NextResponse.json({ error: "Invalid technician." }, { status: 400 });
    }
  }

  const customer = await prisma.customer.upsert({
    where: { phone: customerPhone },
    update: {
      name: customerName,
      address:
        typeof body.customerAddress === "string" ? body.customerAddress.trim() : "",
    },
    create: {
      phone: customerPhone,
      name: customerName,
      address:
        typeof body.customerAddress === "string" ? body.customerAddress.trim() : "",
    },
  });

  const created = await prisma.serviceTicket.create({
    data: {
      branchId,
      customerId: customer.id,
      technicianId,
      status: TICKET_STATUS.PENDING,
      description,
      deviceName: typeof body.deviceName === "string" ? body.deviceName.trim() : "",
      deviceBrand:
        typeof body.deviceBrand === "string" ? body.deviceBrand.trim() : "",
      deviceModel:
        typeof body.deviceModel === "string" ? body.deviceModel.trim() : "",
      priceType,
      serviceCharge,
      partsCost,
      warrantyTerms:
        typeof body.warrantyTerms === "string" ? body.warrantyTerms.trim() : "",
      estimatedCompletionDate,
      internalNotes:
        typeof body.internalNotes === "string" ? body.internalNotes.trim() : "",
    },
  });

  return NextResponse.json({ ticket: created }, { status: 201 });
}
