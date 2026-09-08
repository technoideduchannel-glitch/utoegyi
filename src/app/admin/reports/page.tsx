"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";

interface ReportEntry {
  date?: string;
  weekStarting?: string;
  month?: string;
  totalRevenue: number;
  totalSold: number;
}

interface ProductBreakdown {
  name: string;
  sku: string;
  sold: number;
  revenue: number;
}

type ReportType = "daily" | "weekly" | "monthly";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>("daily");
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [productBreakdown, setProductBreakdown] = useState<ProductBreakdown[]>([]);
  const [totals, setTotals] = useState({ totalRevenue: 0, totalSold: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/reports?type=${activeTab}`);
        if (!res.ok) throw new Error("Failed to fetch reports");
        const json = await res.json();
        setReports(json.data?.summary ?? []);
        setProductBreakdown(json.data?.productBreakdown ?? []);
        setTotals(json.data?.totals ?? { totalRevenue: 0, totalSold: 0, totalTransactions: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [activeTab]);

  function getPeriodLabel(r: ReportEntry): string {
    return r.date || r.weekStarting || r.month || "Unknown";
  }

  const revenueChartData = reports.map((r) => ({
    name: getPeriodLabel(r),
    revenue: r.totalRevenue,
  }));

  const productChartData = productBreakdown.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "..." : p.name,
    fullName: p.name,
    sold: p.sold,
    revenue: p.revenue,
  }));

  function handleExportCSV() {
    const csvData = reports.map((report) => ({
      Period: getPeriodLabel(report),
      Revenue: report.totalRevenue,
      "Items Sold": report.totalSold,
    }));
    downloadCSV(csvData, `sales-report-${activeTab}`);
  }

  function handleExportProductCSV() {
    const csvData = productBreakdown.map((p) => ({
      Product: p.name,
      SKU: p.sku,
      "Qty Sold": p.sold,
      Revenue: p.revenue,
    }));
    downloadCSV(csvData, `product-sales-${activeTab}`);
  }

  const tabs: { key: ReportType; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading reports...</div>
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports & Export</h1>
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Export to CSV
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Revenue Trend ({activeTab})</h2>
        {revenueChartData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Product Sales Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sales by Product ({activeTab})</h2>
          <button
            onClick={handleExportProductCSV}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200"
          >
            Export Products
          </button>
        </div>
        {productChartData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No product sales data</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, productChartData.length * 50)}>
            <BarChart data={productChartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => [
                  name === "sold" ? `${formatNumber(Number(value))} units` : formatCurrency(Number(value)),
                  name === "sold" ? "Qty Sold" : "Revenue",
                ]}
                labelFormatter={(label) => {
                  const item = productChartData.find((p) => p.name === label);
                  return item?.fullName || label;
                }}
              />
              <Legend />
              <Bar dataKey="sold" fill="#2563eb" name="Qty Sold" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Product breakdown table */}
        {productBreakdown.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-4">Product</th>
                  <th className="text-left py-2 px-4">SKU</th>
                  <th className="text-right py-2 px-4">Qty Sold</th>
                  <th className="text-right py-2 px-4">Revenue</th>
                  <th className="text-right py-2 px-4">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {productBreakdown.map((p, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-4 font-medium">{p.name}</td>
                    <td className="py-2 px-4 text-gray-500">{p.sku}</td>
                    <td className="py-2 px-4 text-right">{formatNumber(p.sold)}</td>
                    <td className="py-2 px-4 text-right">{formatCurrency(p.revenue)}</td>
                    <td className="py-2 px-4 text-right">
                      {totals.totalSold > 0 ? `${((p.sold / totals.totalSold) * 100).toFixed(1)}%` : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Period Summary */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-lg font-semibold p-6 pb-0">Period Summary</h2>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4">Period</th>
              <th className="text-right py-3 px-4">Revenue</th>
              <th className="text-right py-3 px-4">Items Sold</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-500">
                  No report data available
                </td>
              </tr>
            ) : (
              reports.map((report, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4">{getPeriodLabel(report)}</td>
                  <td className="py-3 px-4 text-right text-green-600 font-medium">
                    {formatCurrency(report.totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right">{formatNumber(report.totalSold)}</td>
                </tr>
              ))
            )}
          </tbody>
          {reports.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="py-3 px-4">Total</td>
                <td className="py-3 px-4 text-right text-green-600">
                  {formatCurrency(totals.totalRevenue)}
                </td>
                <td className="py-3 px-4 text-right">{formatNumber(totals.totalSold)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
