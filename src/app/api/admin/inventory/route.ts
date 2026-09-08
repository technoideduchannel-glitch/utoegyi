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

    const inventory = await prisma.factoryInventory.findMany({
      include: { product: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: inventory });
  } catch (error) {
    console.error("Admin inventory fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId, quantity } = await request.json();

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: "productId and quantity are required" },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity < 0) {
      return NextResponse.json(
        { success: false, error: "quantity must be a non-negative number" },
        { status: 400 }
      );
    }

    const updated = await prisma.factoryInventory.upsert({
      where: { productId },
      create: { productId, quantity },
      update: { quantity },
      include: { product: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin inventory update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
