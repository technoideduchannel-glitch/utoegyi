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

    const transfers = await prisma.transfer.findMany({
      where: {
        toShopId: session.shopId,
        status: "pending",
      },
      include: {
        product: { select: { name: true, sku: true } },
        fromShop: { select: { name: true } },
        toShop: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: transfers });
  } catch (error) {
    console.error("Transfers fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "shop" || !session.shopId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { transferId } = await request.json();

    if (!transferId) {
      return NextResponse.json(
        { success: false, error: "transferId is required" },
        { status: 400 }
      );
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      return NextResponse.json(
        { success: false, error: "Transfer not found" },
        { status: 404 }
      );
    }

    if (transfer.toShopId !== session.shopId) {
      return NextResponse.json(
        { success: false, error: "Transfer is not for this shop" },
        { status: 403 }
      );
    }

    if (transfer.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Transfer is not pending" },
        { status: 400 }
      );
    }

    const [updatedTransfer] = await prisma.$transaction([
      prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: "accepted",
          acceptedBy: session.id,
          acceptedAt: new Date(),
        },
      }),
      prisma.shopInventory.upsert({
        where: {
          shopId_productId: {
            shopId: session.shopId,
            productId: transfer.productId,
          },
        },
        create: {
          shopId: session.shopId,
          productId: transfer.productId,
          quantity: transfer.quantity,
        },
        update: {
          quantity: { increment: transfer.quantity },
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: updatedTransfer });
  } catch (error) {
    console.error("Transfer accept error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
