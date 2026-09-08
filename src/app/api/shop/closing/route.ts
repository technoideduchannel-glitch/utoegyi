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

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const sales = await prisma.dailySale.findMany({
      where: {
        shopId: session.shopId,
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: "desc" },
    });

    const todaySales = sales.filter((s) => {
      const d = new Date(s.date);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return ds === todayStr;
    });

    return NextResponse.json({ success: true, data: todaySales });
  } catch (error) {
    console.error("Closing fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop" || !session.shopId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId, soldQuantity } = await request.json();

    if (!productId || !soldQuantity || soldQuantity <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid productId or soldQuantity" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const inventory = await prisma.shopInventory.findUnique({
      where: { shopId_productId: { shopId: session.shopId, productId } },
    });
    if (!inventory || inventory.quantity < soldQuantity) {
      return NextResponse.json(
        { success: false, error: "Insufficient stock" },
        { status: 400 }
      );
    }

    const totalRevenue = soldQuantity * product.unitPrice;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayDate = new Date(todayStr + "T00:00:00");

    const existingSales = await prisma.dailySale.findMany({
      where: {
        shopId: session.shopId,
        productId,
      },
    });
    const existingSale = existingSales.find((s) => {
      const d = new Date(s.date);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return ds === todayStr;
    });

    let sale;
    if (existingSale) {
      const newQty = existingSale.soldQuantity + soldQuantity;
      const newRevenue = newQty * product.unitPrice;
      sale = await prisma.dailySale.update({
        where: { id: existingSale.id },
        data: { soldQuantity: newQty, totalRevenue: newRevenue },
      });
    } else {
      sale = await prisma.dailySale.create({
        data: {
          shopId: session.shopId,
          productId,
          date: todayDate,
          soldQuantity,
          unitPrice: product.unitPrice,
          totalRevenue,
          createdBy: session.id,
        },
      });
    }

    await prisma.shopInventory.update({
      where: { shopId_productId: { shopId: session.shopId, productId } },
      data: { quantity: { decrement: soldQuantity } },
    });

    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    console.error("Closing create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
