import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekStart(d: Date): Date {
  const result = new Date(d);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop" || !session.shopId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily";

    const now = new Date();
    const todayStr = toLocalDateStr(now);

    const sales = await prisma.dailySale.findMany({
      where: { shopId: session.shopId },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { date: "asc" },
    });

    const filteredSales = sales.filter((sale) => {
      const saleDateStr = toLocalDateStr(new Date(sale.date));
      if (type === "daily") {
        return saleDateStr === todayStr;
      } else if (type === "weekly") {
        const weekStart = getWeekStart(now);
        const weekStartStr = toLocalDateStr(weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = toLocalDateStr(weekEnd);
        return saleDateStr >= weekStartStr && saleDateStr < weekEndStr;
      } else {
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const monthEndStr = toLocalDateStr(nextMonth);
        return saleDateStr >= monthStart && saleDateStr < monthEndStr;
      }
    });

    let summary;
    if (type === "daily") {
      const grouped: Record<string, { revenue: number; sold: number }> = {};
      for (const sale of filteredSales) {
        const key = toLocalDateStr(new Date(sale.date));
        if (!grouped[key]) grouped[key] = { revenue: 0, sold: 0 };
        grouped[key].revenue += sale.totalRevenue;
        grouped[key].sold += sale.soldQuantity;
      }
      summary = Object.entries(grouped).map(([date, val]) => ({
        date,
        totalRevenue: val.revenue,
        totalSold: val.sold,
      }));
    } else if (type === "weekly") {
      const grouped: Record<string, { revenue: number; sold: number }> = {};
      for (const sale of filteredSales) {
        const d = new Date(sale.date);
        const ws = getWeekStart(d);
        const key = toLocalDateStr(ws);
        if (!grouped[key]) grouped[key] = { revenue: 0, sold: 0 };
        grouped[key].revenue += sale.totalRevenue;
        grouped[key].sold += sale.soldQuantity;
      }
      summary = Object.entries(grouped).map(([weekStart, val]) => ({
        weekStarting: weekStart,
        totalRevenue: val.revenue,
        totalSold: val.sold,
      }));
    } else {
      const grouped: Record<string, { revenue: number; sold: number }> = {};
      for (const sale of filteredSales) {
        const d = new Date(sale.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!grouped[key]) grouped[key] = { revenue: 0, sold: 0 };
        grouped[key].revenue += sale.totalRevenue;
        grouped[key].sold += sale.soldQuantity;
      }
      summary = Object.entries(grouped).map(([month, val]) => ({
        month,
        totalRevenue: val.revenue,
        totalSold: val.sold,
      }));
    }

    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalSold = filteredSales.reduce((sum, s) => sum + s.soldQuantity, 0);

    const productMap: Record<number, { name: string; sku: string; sold: number; revenue: number }> = {};
    for (const sale of filteredSales) {
      const pid = sale.productId;
      if (!productMap[pid]) {
        productMap[pid] = { name: sale.product.name, sku: sale.product.sku, sold: 0, revenue: 0 };
      }
      productMap[pid].sold += sale.soldQuantity;
      productMap[pid].revenue += sale.totalRevenue;
    }
    const productBreakdown = Object.values(productMap).sort((a, b) => b.sold - a.sold);

    return NextResponse.json({
      success: true,
      data: {
        type,
        summary,
        totals: { totalRevenue, totalSold, totalTransactions: filteredSales.length },
        productBreakdown,
      },
    });
  } catch (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
