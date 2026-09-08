import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const shopPassword = await bcrypt.hash("shop123", 10);

  const shop1 = await prisma.shop.create({
    data: { name: "Branch 1 - Downtown", address: "123 Main Street", phone: "09123456" },
  });
  const shop2 = await prisma.shop.create({
    data: { name: "Branch 2 - Market", address: "456 Market Road", phone: "09234567" },
  });
  const shop3 = await prisma.shop.create({
    data: { name: "Branch 3 - Riverside", address: "789 River Lane", phone: "09345678" },
  });

  await prisma.user.createMany({
    data: [
      { name: "Admin", email: "admin@utoegyi.com", password: adminPassword, role: "admin" },
      { name: "Shop 1 Manager", email: "09123456@utoegyi.com", password: shopPassword, role: "shop", shopId: shop1.id },
      { name: "Shop 2 Manager", email: "09234567@utoegyi.com", password: shopPassword, role: "shop", shopId: shop2.id },
      { name: "Shop 3 Manager", email: "09345678@utoegyi.com", password: shopPassword, role: "shop", shopId: shop3.id },
    ],
  });

  console.log("Seed complete!");
  console.log("Login credentials:");
  console.log("  Admin: admin@utoegyi.com / admin123");
  console.log("  Shop1: 09123456@utoegyi.com / shop123");
  console.log("  Shop2: 09234567@utoegyi.com / shop123");
  console.log("  Shop3: 09345678@utoegyi.com / shop123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
