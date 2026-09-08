import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const transfers = await prisma.transfer.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true } },
        toShop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: transfers });
  } catch (error) {
    console.error("Admin transfers fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId, toShopId, quantity } = await request.json();

    if (!productId || !toShopId || !quantity) {
      return NextResponse.json(
        { success: false, error: "productId, toShopId, and quantity are required" },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: "quantity must be a positive number" },
        { status: 400 }
      );
    }

    const factoryInventory = await prisma.factoryInventory.findUnique({
      where: { productId },
    });

    if (!factoryInventory || factoryInventory.quantity < quantity) {
      return NextResponse.json(
        { success: false, error: "Insufficient factory stock" },
        { status: 400 }
      );
    }

    const [transfer] = await prisma.$transaction([
      prisma.transfer.create({
        data: {
          productId,
          toShopId,
          quantity,
          status: "pending",
          createdBy: session.id,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          toShop: { select: { id: true, name: true } },
        },
      }),
      prisma.factoryInventory.update({
        where: { productId },
        data: { quantity: { decrement: quantity } },
      }),
    ]);

    return NextResponse.json({ success: true, data: transfer });
  } catch (error) {
    console.error("Admin transfer create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
