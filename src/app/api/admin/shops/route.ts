import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const shops = await prisma.shop.findMany({
      include: {
        inventories: {
          include: {
            product: { select: { id: true, name: true, sku: true, lowStockThreshold: true } },
          },
        },
        users: { select: { id: true, email: true, role: true } },
      },
      orderBy: { name: "asc" },
    });

    const data = shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      isActive: shop.isActive,
      users: shop.users,
      inventorySummary: {
        totalProducts: shop.inventories.length,
        totalQuantity: shop.inventories.reduce((sum, inv) => sum + inv.quantity, 0),
        lowStockCount: shop.inventories.filter(
          (inv) => inv.quantity < inv.product.lowStockThreshold
        ).length,
      },
      inventories: shop.inventories,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Admin shops fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, address, phone, email: customEmail, password: customPassword } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Shop name is required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";

    if (!customEmail && !cleanPhone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required to generate login email" },
        { status: 400 }
      );
    }

    const email = customEmail || `${cleanPhone}@utoegyi.com`;
    const defaultPassword = "shop123";
    const password = customPassword || defaultPassword;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `A user with email "${email}" already exists` },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const shop = await prisma.shop.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        users: {
          create: {
            name: `${name} Owner`,
            email,
            password: hashedPassword,
            role: "shop",
          },
        },
      },
      include: { users: { select: { id: true, email: true, role: true } } },
    });

    const products = await prisma.product.findMany({ where: { isActive: true } });
    for (const product of products) {
      await prisma.shopInventory.create({
        data: { shopId: shop.id, productId: product.id, quantity: 0 },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...shop,
        credentials: { email, password },
      },
    });
  } catch (error) {
    console.error("Admin shop create error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id, name, address, phone, isActive } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Shop id is required" },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address: address || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: shop });
  } catch (error) {
    console.error("Admin shop update error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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
        { success: false, error: "Shop id is required" },
        { status: 400 }
      );
    }

    const shop = await prisma.shop.findUnique({ where: { id } });
    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.damageLoss.deleteMany({ where: { shopId: id } }),
      prisma.dailySale.deleteMany({ where: { shopId: id } }),
      prisma.transfer.deleteMany({ where: { fromShopId: id } }),
      prisma.transfer.deleteMany({ where: { toShopId: id } }),
      prisma.shopInventory.deleteMany({ where: { shopId: id } }),
      prisma.user.deleteMany({ where: { shopId: id } }),
      prisma.shop.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, data: { message: "Shop deleted" } });
  } catch (error) {
    console.error("Admin shop delete error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
