"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, formatDate, getDaysAgo, toLocalDateStr } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  product: {
    id: number;
    name: string;
    sku: string;
    unitPrice: number;
    lowStockThreshold: number;
  };
  lowStock: boolean;
}

interface ClosingRecord {
  id: number;
  productId: number;
  product: { name: string; sku: string };
  soldQuantity: number;
  unitPrice: number;
  totalRevenue: number;
  date: string;
}

interface ReportItem {
  date: string;
  totalRevenue: number;
  totalSold: number;
}

export default function ShopDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [closingRecords, setClosingRecords] = useState<ClosingRecord[]>([]);
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [inventoryRes, closingRes, reportsRes] = await Promise.all([
          fetch("/api/shop/inventory"),
          fetch("/api/shop/closing"),
          fetch("/api/shop/reports?type=daily"),
        ]);

        const inventoryJson = await inventoryRes.json();
        const closingJson = await closingRes.json();
        const reportsJson = await reportsRes.json();

        setProducts(inventoryJson.data ?? []);
        setClosingRecords(closingJson.data ?? []);
        setReportData(reportsJson.data?.summary ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const today = toLocalDateStr(new Date());
  const todayClosing = closingRecords.filter((r) => toLocalDateStr(r.date) === today);
  const totalRevenue = todayClosing.reduce((sum, r) => sum + r.totalRevenue, 0);
  const totalItemsSold = todayClosing.reduce((sum, r) => sum + r.soldQuantity, 0);
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);

  const chartData = reportData.slice(-7).map((r) => ({
    name: formatDate(r.date),
    revenue: r.totalRevenue,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Shop Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <p className="text-sm text-gray-500">Today&apos;s Revenue</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Today&apos;s Items Sold</p>
          <p className="text-2xl font-bold text-green-600">{totalItemsSold}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Remaining Stock</p>
          <p className="text-2xl font-bold text-purple-600">{totalStock}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Sales (Last 7 Days)</h2>
        {chartData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sales data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Stock Levels</h2>
        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No products found</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {products.map((item) => {
              const threshold = item.product.lowStockThreshold;
              const isLow = item.quantity < threshold;
              return (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-sm text-gray-500">{item.product.sku}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isLow ? "text-red-500" : "text-green-600"}`}>
                      {item.quantity}
                    </span>
                    <span className={`w-3 h-3 rounded-full ${isLow ? "bg-red-500" : "bg-green-500"}`} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
