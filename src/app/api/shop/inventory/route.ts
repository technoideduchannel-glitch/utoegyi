import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop" || !session.shopId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const inventory = await prisma.shopInventory.findMany({
      where: { shopId: session.shopId },
      include: { product: true },
    });

    const data = inventory.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        unitPrice: item.product.unitPrice,
        costPrice: item.product.costPrice,
        description: item.product.description,
        lowStockThreshold: item.product.lowStockThreshold,
        isActive: item.product.isActive,
      },
      lowStock: item.quantity < item.product.lowStockThreshold,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
