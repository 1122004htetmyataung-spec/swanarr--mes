import { NextResponse } from "next/server";

import { TICKET_STATUS } from "@/lib/db-enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId")?.trim() ?? "";

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }

  const { start, end } = getTodayRange();

  const [todaySalesAgg, activeTickets, lowStockSkus, todaySaleItems] =
    await Promise.all([
      prisma.sale.aggregate({
        where: { branchId, createdAt: { gte: start, lt: end } },
        _sum: { totalAmount: true },
      }),
      prisma.serviceTicket.count({
        where: {
          branchId,
          status: { in: [TICKET_STATUS.PENDING, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.DONE] },
        },
      }),
      prisma.inventoryItem.count({
        where: { branchId, stockQty: { lte: 3 } },
      }),
      prisma.saleItem.findMany({
        where: {
          sale: { branchId, createdAt: { gte: start, lt: end } },
        },
        select: {
          qty: true,
          price: true,
          inventory: { select: { costPrice: true } },
        },
      }),
    ]);

  const todayProfit = todaySaleItems.reduce((sum, item) => {
    const margin = item.price - item.inventory.costPrice;
    return sum + margin * item.qty;
  }, 0);

  return NextResponse.json({
    metrics: {
      todaySales: todaySalesAgg._sum.totalAmount ?? 0,
      activeTickets,
      lowStockSkus,
      todayProfit,
    },
  });
}
