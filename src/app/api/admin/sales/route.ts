import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const sales = await prisma.dailySale.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    const filtered = sales.filter((sale) => {
      const saleDateStr = toLocalDateStr(new Date(sale.date));
      if (startDateParam && saleDateStr < startDateParam) return false;
      if (endDateParam && saleDateStr > endDateParam) return false;
      return true;
    });

    return NextResponse.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Admin sales fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
