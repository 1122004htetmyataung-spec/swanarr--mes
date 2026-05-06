import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const logs = await prisma.activityLog.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      username: log.user?.username,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Activity logs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
