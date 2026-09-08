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

export default function BranchReports() {
  const [activeTab, setActiveTab] = useState<ReportType>("daily");
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [productBreakdown, setProductBreakdown] = useState<ProductBreakdown[]>([]);
  const [totals, setTotals] = useState({ totalRevenue: 0, totalSold: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const res = await fetch(`/api/shop/reports?type=${activeTab}`);
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
    const csvData = reports.map((r) => ({
      Period: getPeriodLabel(r),
      Revenue: r.totalRevenue,
      "Items Sold": r.totalSold,
    }));
    downloadCSV(csvData, `shop_report_${activeTab}`);
  }

  function handleExportProductCSV() {
    const csvData = productBreakdown.map((p) => ({
      Product: p.name,
      SKU: p.sku,
      "Qty Sold": p.sold,
      Revenue: p.revenue,
    }));
    downloadCSV(csvData, `shop_product_sales_${activeTab}`);
  }

  const tabs: { key: ReportType; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Branch Reports</h1>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Export to CSV
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-500">Loading reports...</div>
        </div>
      ) : (
        <>
          {/* Revenue Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
            {revenueChartData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Product Sales Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sales by Product</h2>
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

            {productBreakdown.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productBreakdown.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                        <td className="px-4 py-2 text-gray-500">{p.sku}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(p.sold)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(p.revenue)}</td>
                        <td className="px-4 py-2 text-right">
                          {totals.totalSold > 0 ? `${((p.sold / totals.totalSold) * 100).toFixed(1)}%` : "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totals.totalRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Items Sold</p>
                <p className="text-xl font-bold text-green-600">{totals.totalSold}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-xl font-bold text-purple-600">{totals.totalTransactions}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Sold</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No report data available</td>
                    </tr>
                  ) : (
                    reports.map((report, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getPeriodLabel(report)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(report.totalRevenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.totalSold}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
