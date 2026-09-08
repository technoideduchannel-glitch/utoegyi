"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, formatDate, getToday, getDaysAgo, formatNumber, toLocalDateStr } from "@/lib/utils";

interface SalesData {
  id: number;
  date: string;
  shopId: number;
  shop: { id: number; name: string };
  productId: number;
  product: { id: number; name: string; sku: string };
  soldQuantity: number;
  unitPrice: number;
  totalRevenue: number;
}

interface InventoryItem {
  id: number;
  productId: number;
  product: { id: number; name: string; sku: string };
  quantity: number;
}

interface Shop {
  id: number;
  name: string;
  inventorySummary: { totalProducts: number; totalQuantity: number; lowStockCount: number };
}

interface DailySales {
  date: string;
  revenue: number;
}

export default function AdminDashboard() {
  const [sales, setSales] = useState<SalesData[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [salesRes, inventoryRes, shopsRes] = await Promise.all([
          fetch("/api/admin/sales"),
          fetch("/api/admin/inventory"),
          fetch("/api/admin/shops"),
        ]);

        if (!salesRes.ok || !inventoryRes.ok || !shopsRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const salesJson = await salesRes.json();
        const inventoryJson = await inventoryRes.json();
        const shopsJson = await shopsRes.json();

        setSales(salesJson.data ?? []);
        setInventory(inventoryJson.data ?? []);
        setShops(shopsJson.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const today = getToday();

  const todaySales = sales.filter((s) => toLocalDateStr(s.date) === today);

  const totalRevenue = todaySales.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalItemsSold = todaySales.reduce((sum, s) => sum + s.soldQuantity, 0);
  const factoryItems = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const lowStockItems = inventory.filter((i) => i.quantity < 50).length;

  const last7Days: DailySales[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = getDaysAgo(i);
    const daySales = sales.filter((s) => toLocalDateStr(s.date) === day);
    const dayRevenue = daySales.reduce((sum, s) => sum + s.totalRevenue, 0);
    last7Days.push({
      date: day,
      revenue: dayRevenue,
    });
  }

  const branchSales = shops.map((shop) => {
    const shopTodaySales = todaySales.filter((s) => s.shopId === shop.id);
    return {
      shopName: shop.name,
      quantity: shopTodaySales.reduce((sum, s) => sum + s.soldQuantity, 0),
      revenue: shopTodaySales.reduce((sum, s) => sum + s.totalRevenue, 0),
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">Total Revenue (Today)</h3>
          <p className="text-2xl font-bold text-green-500">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h3 className="text-sm font-medium text-gray-500">Total Items Sold (Today)</h3>
          <p className="text-2xl font-bold text-blue-600">{formatNumber(totalItemsSold)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h3 className="text-sm font-medium text-gray-500">Factory Items</h3>
          <p className="text-2xl font-bold text-blue-600">{formatNumber(factoryItems)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-500">Low Stock Items</h3>
          <p className="text-2xl font-bold text-red-500">{lowStockItems}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Daily Sales (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={last7Days}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => formatDate(String(l))} />
            <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Branch Sales (Today)</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Branch</th>
              <th className="text-right py-3 px-4">Items Sold</th>
              <th className="text-right py-3 px-4">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {branchSales.map((branch) => (
              <tr key={branch.shopName} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{branch.shopName}</td>
                <td className="py-3 px-4 text-right">{formatNumber(branch.quantity)}</td>
                <td className="py-3 px-4 text-right text-green-600 font-medium">
                  {formatCurrency(branch.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
