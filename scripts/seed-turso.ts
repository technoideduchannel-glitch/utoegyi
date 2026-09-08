import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const client = createClient({
  url: process.env.DATABASE_URL_TURSO!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  console.log("Seeding Turso database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const shopPassword = await bcrypt.hash("shop123", 10);

  const shop1 = await client.execute(
    `INSERT INTO "shops" ("name", "address", "phone", "isActive", "createdAt", "updatedAt") VALUES ('Branch 1 - Downtown', '123 Main Street', '09123456', 1, datetime('now'), datetime('now'))`
  );
  const shop2 = await client.execute(
    `INSERT INTO "shops" ("name", "address", "phone", "isActive", "createdAt", "updatedAt") VALUES ('Branch 2 - Market', '456 Market Road', '09234567', 1, datetime('now'), datetime('now'))`
  );
  const shop3 = await client.execute(
    `INSERT INTO "shops" ("name", "address", "phone", "isActive", "createdAt", "updatedAt") VALUES ('Branch 3 - Riverside', '789 River Lane', '09345678', 1, datetime('now'), datetime('now'))`
  );

  const shopId1 = Number(shop1.lastInsertRowid);
  const shopId2 = Number(shop2.lastInsertRowid);
  const shopId3 = Number(shop3.lastInsertRowid);

  await client.execute(
    `INSERT INTO "users" ("name", "email", "password", "role", "createdAt", "updatedAt") VALUES ('Admin', 'admin@utoegyi.com', '${adminPassword}', 'admin', datetime('now'), datetime('now'))`
  );
  await client.execute(
    `INSERT INTO "users" ("name", "email", "password", "role", "shopId", "createdAt", "updatedAt") VALUES ('Shop 1 Manager', '09123456@utoegyi.com', '${shopPassword}', 'shop', ${shopId1}, datetime('now'), datetime('now'))`
  );
  await client.execute(
    `INSERT INTO "users" ("name", "email", "password", "role", "shopId", "createdAt", "updatedAt") VALUES ('Shop 2 Manager', '09234567@utoegyi.com', '${shopPassword}', 'shop', ${shopId2}, datetime('now'), datetime('now'))`
  );
  await client.execute(
    `INSERT INTO "users" ("name", "email", "password", "role", "shopId", "createdAt", "updatedAt") VALUES ('Shop 3 Manager', '09345678@utoegyi.com', '${shopPassword}', 'shop', ${shopId3}, datetime('now'), datetime('now'))`
  );

  console.log("Seed complete on Turso!");
  console.log("Login credentials:");
  console.log("  Admin: admin@utoegyi.com / admin123");
  console.log("  Shop1: 09123456@utoegyi.com / shop123");
  console.log("  Shop2: 09234567@utoegyi.com / shop123");
  console.log("  Shop3: 09345678@utoegyi.com / shop123");
}

main().catch(console.error).finally(() => client.close());
