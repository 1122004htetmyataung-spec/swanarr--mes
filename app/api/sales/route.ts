import { NextResponse } from "next/server";

import { SALE_STATUS, USER_ROLE } from "@/lib/db-enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SaleItemInput = {
  // For bulk items (InventoryItem)
  inventoryId?: string;
  productInstanceId?: string; // For tracked items
  qty: number;
  price: number;
};

type PaymentInput = {
  method: "CASH" | "KBZPAY" | "WAVEPAY" | "AYAPAY" | "BANK" | "CREDIT";
  amount: number;
  reference?: string;
};

type Body = {
  branchId?: string;
  userId?: string;
  customerId?: string | null;
  discount?: number;
  discountType?: "FIXED" | "PERCENTAGE";
  taxPercent?: number;
  items?: SaleItemInput[];
  payments?: PaymentInput[];
};

const VALID_PAYMENT_METHODS = new Set([
  "CASH",
  "KBZPAY",
  "WAVEPAY",
  "AYAPAY",
  "BANK",
  "CREDIT",
]);

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const branchId = typeof body.branchId === "string" ? body.branchId.trim() : "";
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const discount =
    typeof body.discount === "number" && Number.isFinite(body.discount)
      ? Math.max(0, body.discount)
      : 0;
  const discountType = body.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
  const taxPercent =
    typeof body.taxPercent === "number" && Number.isFinite(body.taxPercent)
      ? Math.max(0, body.taxPercent)
      : 0;
  const items = Array.isArray(body.items) ? body.items : [];
  const payments = Array.isArray(body.payments) ? body.payments : [];

  if (!branchId || !userId || items.length === 0) {
    return NextResponse.json(
      { error: "branchId, userId, and at least one line item are required." },
      { status: 400 }
    );
  }

  // Validate items
  for (const row of items) {
    if (
      (typeof row.inventoryId !== "string" && typeof row.productInstanceId !== "string") ||
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

  // Validate payments
  let totalPayments = 0;
  for (const payment of payments) {
    if (
      !VALID_PAYMENT_METHODS.has(payment.method) ||
      typeof payment.amount !== "number" ||
      payment.amount <= 0 ||
      !Number.isFinite(payment.amount)
    ) {
      return NextResponse.json({ error: "Invalid payment entry." }, { status: 400 });
    }
    totalPayments += payment.amount;
  }

  // Verify user and permissions
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

  // Calculate totals
  const subtotal = items.reduce((sum, row) => sum + row.price * row.qty, 0);
  const actualDiscount =
    discountType === "PERCENTAGE" ? (subtotal * discount) / 100 : discount;
  const afterDiscount = Math.max(0, subtotal - actualDiscount);
  const taxAmount = afterDiscount * (taxPercent / 100);
  const totalAmount = afterDiscount + taxAmount;

  // Verify total payments match sale total
  if (payments.length > 0 && Math.abs(totalPayments - totalAmount) > 0.01) {
    return NextResponse.json(
      {
        error: `Payment total (${totalPayments}) must equal sale total (${totalAmount})`,
      },
      { status: 400 }
    );
  }

  // Determine sale status based on payment method (if single payment)
  let saleStatus = SALE_STATUS.PAID;
  if (payments.length === 0) {
    saleStatus = SALE_STATUS.CREDIT;
  } else if (
    payments.length === 1 &&
    payments[0].method === "CREDIT"
  ) {
    saleStatus = SALE_STATUS.CREDIT;
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale
      const created = await tx.sale.create({
        data: {
          branchId,
          customerId,
          userId,
          totalAmount,
          discount: actualDiscount,
          tax: taxAmount,
          status: saleStatus,
        },
      });

      // Process sale items and update inventory/instances
      for (const item of items) {
        // Create sale item
        await tx.saleItem.create({
          data: {
            saleId: created.id,
            inventoryId: item.inventoryId || "",
            qty: item.qty,
            price: item.price,
          },
        });

        // Update bulk inventory stock
        if (item.inventoryId) {
          await tx.inventoryItem.update({
            where: { id: item.inventoryId },
            data: { stockQty: { decrement: item.qty } },
          });
        }

        // Update ProductInstance status to SOLD
        if (item.productInstanceId) {
          await tx.productInstance.update({
            where: { id: item.productInstanceId },
            data: { status: "SOLD" },
          });
        }
      }

      // Create payment entries for split payments
      for (const payment of payments) {
        await tx.payment.create({
          data: {
            saleId: created.id,
            method: payment.method,
            amount: payment.amount,
            reference: payment.reference || "",
          },
        });
      }

      // Log to activity log
      await tx.activityLog.create({
        data: {
          userId,
          branchId,
          action: "SALE_CREATED",
          details: JSON.stringify({
            saleId: created.id,
            itemCount: items.length,
            totalAmount,
            paymentCount: payments.length,
          }),
        },
      });

      // Create audit log for sale
      await tx.auditLog.create({
        data: {
          userId,
          branchId,
          action: "SALE_CREATED",
          entityType: "SALE",
          entityId: created.id,
          newValue: JSON.stringify({
            totalAmount,
            discount: actualDiscount,
            tax: taxAmount,
            itemCount: items.length,
          }),
          context: `Sale created for ${items.length} items totaling ₹${totalAmount}`,
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      sale: {
        id: sale.id,
        totalAmount: sale.totalAmount,
        discount: sale.discount,
        tax: sale.tax,
        status: sale.status,
        createdAt: sale.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Sale creation error:", error);
    return NextResponse.json({ error: "Could not save sale." }, { status: 500 });
  }
}
