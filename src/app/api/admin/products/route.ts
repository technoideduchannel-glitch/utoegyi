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

    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Admin products fetch error:", error);
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

    const { name, sku, unitPrice, costPrice, description, lowStockThreshold, isActive } =
      await request.json();

    if (!name || !sku || unitPrice === undefined || costPrice === undefined) {
      return NextResponse.json(
        { success: false, error: "name, sku, unitPrice, and costPrice are required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        unitPrice: Number(unitPrice),
        costPrice: Number(costPrice),
        description: description ?? null,
        lowStockThreshold: Number(lowStockThreshold) || 50,
        isActive: isActive ?? true,
      },
    });

    await prisma.factoryInventory.create({
      data: { productId: product.id, quantity: 0 },
    });

    const shops = await prisma.shop.findMany({ where: { isActive: true } });
    for (const shop of shops) {
      await prisma.shopInventory.create({
        data: { shopId: shop.id, productId: product.id, quantity: 0 },
      });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Admin product create error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { success: false, error: "A product with this SKU already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: msg },
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

    const { id, name, sku, unitPrice, costPrice, description, lowStockThreshold, isActive } =
      await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(sku !== undefined && { sku }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(costPrice !== undefined && { costPrice }),
        ...(description !== undefined && { description }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Admin product update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Product id is required" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.damageLoss.deleteMany({ where: { productId: id } }),
      prisma.dailySale.deleteMany({ where: { productId: id } }),
      prisma.transfer.deleteMany({ where: { productId: id } }),
      prisma.shopInventory.deleteMany({ where: { productId: id } }),
      prisma.factoryInventory.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, data: { message: "Product deleted" } });
  } catch (error) {
    console.error("Admin product delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
