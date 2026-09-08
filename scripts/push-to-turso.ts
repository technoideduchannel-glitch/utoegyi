import { createClient } from "@libsql/client";
import "dotenv/config";

const client = createClient({
  url: process.env.DATABASE_URL_TURSO!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  console.log("Pushing schema to Turso...");

  const statements = [
    `CREATE TABLE IF NOT EXISTS "users" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'shop',
      "shopId" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "users_email_unique" UNIQUE ("email")
    )`,
    `CREATE TABLE IF NOT EXISTS "products" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "unitPrice" REAL NOT NULL,
      "costPrice" REAL NOT NULL,
      "description" TEXT,
      "lowStockThreshold" INTEGER NOT NULL DEFAULT 50,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "products_sku_unique" UNIQUE ("sku")
    )`,
    `CREATE TABLE IF NOT EXISTS "shops" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT NOT NULL,
      "address" TEXT,
      "phone" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "factory_inventory" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "productId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "factory_inventory_productId_unique" UNIQUE ("productId")
    )`,
    `CREATE TABLE IF NOT EXISTS "shop_inventory" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "shopId" INTEGER NOT NULL,
      "productId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "shop_inventory_shopId_productId_unique" UNIQUE ("shopId", "productId")
    )`,
    `CREATE TABLE IF NOT EXISTS "transfers" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "productId" INTEGER NOT NULL,
      "fromShopId" INTEGER,
      "toShopId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdBy" INTEGER NOT NULL,
      "acceptedBy" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "acceptedAt" DATETIME
    )`,
    `CREATE TABLE IF NOT EXISTS "daily_sales" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "shopId" INTEGER NOT NULL,
      "productId" INTEGER NOT NULL,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "soldQuantity" INTEGER NOT NULL,
      "unitPrice" REAL NOT NULL,
      "totalRevenue" REAL NOT NULL,
      "createdBy" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "daily_sales_shopId_productId_date_unique" UNIQUE ("shopId", "productId", "date")
    )`,
    `CREATE TABLE IF NOT EXISTS "damage_losses" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "shopId" INTEGER NOT NULL,
      "productId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL,
      "reason" TEXT NOT NULL,
      "reportedBy" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }

  console.log("All tables created on Turso!");
}

main().catch(console.error).finally(() => client.close());
