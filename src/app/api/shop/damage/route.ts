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

    const records = await prisma.damageLoss.findMany({
      where: { shopId: session.shopId },
      include: {
        product: { select: { name: true, sku: true } },
        shop: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Damage fetch error:", error);
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

    const { productId, quantity, reason } = await request.json();

    if (!productId || !quantity || quantity <= 0 || !reason) {
      return NextResponse.json(
        { success: false, error: "productId, quantity, and reason are required" },
        { status: 400 }
      );
    }

    const inventory = await prisma.shopInventory.findUnique({
      where: { shopId_productId: { shopId: session.shopId, productId } },
    });
    if (!inventory || inventory.quantity < quantity) {
      return NextResponse.json(
        { success: false, error: "Insufficient stock" },
        { status: 400 }
      );
    }

    const [damage] = await prisma.$transaction([
      prisma.damageLoss.create({
        data: {
          shopId: session.shopId,
          productId,
          quantity,
          reason,
          reportedBy: session.id,
        },
      }),
      prisma.shopInventory.update({
        where: { shopId_productId: { shopId: session.shopId, productId } },
        data: { quantity: { decrement: quantity } },
      }),
    ]);

    return NextResponse.json({ success: true, data: damage });
  } catch (error) {
    console.error("Damage create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
