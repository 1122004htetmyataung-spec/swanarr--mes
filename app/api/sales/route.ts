import { NextResponse } from "next/server";

import { PAYMENT_METHOD, SALE_STATUS, USER_ROLE } from "@/lib/db-enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SaleItemInput = {
  inventoryId: string;
  qty: number;
  price: number;
};

type Body = {
  branchId?: string;
  userId?: string;
  customerId?: string | null;
  paymentMethod?: string;
  discount?: number;
  taxPercent?: number;
  items?: SaleItemInput[];
};

const PAYMENT_VALUES = new Set(Object.values(PAYMENT_METHOD));

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const paymentMethod =
    typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "";
  const discount =
    typeof body.discount === "number" && Number.isFinite(body.discount)
      ? Math.max(0, body.discount)
      : 0;
  const taxPercent =
    typeof body.taxPercent === "number" && Number.isFinite(body.taxPercent)
      ? Math.max(0, body.taxPercent)
      : 0;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!branchId || !userId || !paymentMethod || items.length === 0) {
    return NextResponse.json(
      { error: "branchId, userId, paymentMethod, and at least one line item are required." },
      { status: 400 }
    );
  }

  if (!PAYMENT_VALUES.has(paymentMethod as (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD])) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  for (const row of items) {
    if (
      typeof row.inventoryId !== "string" ||
      typeof row.qty !== "number" ||
      typeof row.price !== "number" ||
      row.qty <= 0 ||
      row.price < 0 ||
      !Number.isFinite(row.qty) ||
      !Number.isFinite(row.price)
    ) {
      return NextResponse.json({ error: "Invalid line item." }, { status: 400 });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.branchId !== branchId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  if (user.role === USER_ROLE.TECHNICIAN) {
    return NextResponse.json({ error: "Technicians cannot record sales." }, { status: 403 });
  }

  const customerId =
    typeof body.customerId === "string" && body.customerId.trim().length > 0
      ? body.customerId.trim()
      : null;

  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 400 });
    }
  }

  const subtotal = items.reduce((sum, row) => sum + row.price * row.qty, 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxAmount = afterDiscount * (taxPercent / 100);
  const totalAmount = afterDiscount + taxAmount;

  const inventoryIds = Array.from(
    new Set(items.map((i) => i.inventoryId))
  );
  const stockRows = await prisma.inventoryItem.findMany({
    where: { id: { in: inventoryIds }, branchId },
    select: { id: true, stockQty: true },
  });
  const stockMap = new Map(stockRows.map((r) => [r.id, r.stockQty]));

  const qtyNeeded = new Map<string, number>();
  for (const row of items) {
    qtyNeeded.set(row.inventoryId, (qtyNeeded.get(row.inventoryId) ?? 0) + row.qty);
  }

  for (const [invId, need] of Array.from(qtyNeeded.entries())) {
    const available = stockMap.get(invId);
    if (available === undefined || available < need) {
      return NextResponse.json({ error: "Insufficient stock." }, { status: 409 });
    }
  }

  const saleStatus =
    paymentMethod === PAYMENT_METHOD.CREDIT ? SALE_STATUS.CREDIT : SALE_STATUS.PAID;

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          branchId,
          customerId,
          userId,
          totalAmount,
          discount,
          tax: taxAmount,
          paymentMethod,
          status: saleStatus,
          saleItems: {
            create: items.map((row) => ({
              inventoryId: row.inventoryId,
              qty: row.qty,
              price: row.price,
            })),
          },
        },
      });

      for (const [inventoryId, qty] of Array.from(qtyNeeded.entries())) {
        await tx.inventoryItem.update({
          where: { id: inventoryId },
          data: { stockQty: { decrement: qty } },
        });
      }

      return created;
    });

    return NextResponse.json({
      sale: {
        id: sale.id,
        totalAmount: sale.totalAmount,
        discount: sale.discount,
        tax: sale.tax,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not save sale." }, { status: 500 });
  }
}
