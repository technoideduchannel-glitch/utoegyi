import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? "SET (starts with: " + process.env.DATABASE_URL.substring(0, 10) + "...)" : "MISSING",
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? "SET" : "MISSING",
    JWT_SECRET: process.env.JWT_SECRET ? "SET" : "MISSING",
  });
}
