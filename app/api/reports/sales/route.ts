import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseDateInput(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId")?.trim() ?? "";
  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 6);
  defaultFrom.setHours(0, 0, 0, 0);
  const defaultTo = new Date(now);
  defaultTo.setHours(23, 59, 59, 999);

  const from = parseDateInput(searchParams.get("from"), defaultFrom);
  const to = parseDateInput(searchParams.get("to"), defaultTo);

  const sales = await prisma.sale.findMany({
    where: {
      branchId,
      createdAt: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { createdAt: "desc" },
    include: {
      saleItems: {
        include: {
          inventory: { select: { category: true, costPrice: true } },
        },
      },
    },
  });

  const byCategory = new Map<string, number>();
  let totalSales = 0;
  let totalProfit = 0;
  for (const sale of sales) {
    totalSales += sale.totalAmount;
    for (const row of sale.saleItems) {
      const profit = (row.price - row.inventory.costPrice) * row.qty;
      totalProfit += profit;
      const key = row.inventory.category;
      byCategory.set(key, (byCategory.get(key) ?? 0) + profit);
    }
  }

  const categoryProfit = Array.from(byCategory.entries())
    .map(([category, profit]) => ({ category, profit }))
    .sort((a, b) => b.profit - a.profit);

  const rows = sales.map((sale) => ({
    id: sale.id,
    createdAt: sale.createdAt.toISOString(),
    paymentMethod: sale.paymentMethod,
    status: sale.status,
    totalAmount: sale.totalAmount,
    itemCount: sale.saleItems.length,
  }));

  return NextResponse.json({
    summary: {
      totalSales,
      totalProfit,
      saleCount: sales.length,
    },
    rows,
    categoryProfit,
  });
}
