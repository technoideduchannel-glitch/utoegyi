"use client";

import { useEffect, useState, useMemo } from "react";
import { formatDate, formatCurrency, formatNumber, toLocalDateStr } from "@/lib/utils";
import { downloadCSV } from "@/lib/export";

interface SaleRecord {
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

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function fetchSales() {
      try {
        const res = await fetch("/api/admin/sales");
        if (!res.ok) throw new Error("Failed to fetch sales");
        const json = await res.json();
        setSales(json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchSales();
  }, []);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDate = toLocalDateStr(sale.date);
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      return true;
    });
  }, [sales, startDate, endDate]);

  const totals = useMemo(() => {
    return filteredSales.reduce(
      (acc, sale) => ({
        quantity: acc.quantity + sale.soldQuantity,
        revenue: acc.revenue + sale.totalRevenue,
      }),
      { quantity: 0, revenue: 0 }
    );
  }, [filteredSales]);

  function handleExportCSV() {
    const csvData = filteredSales.map((sale) => ({
      Date: toLocalDateStr(sale.date),
      Branch: sale.shop.name,
      Product: sale.product.name,
      "Qty Sold": sale.soldQuantity,
      "Unit Price": sale.unitPrice,
      Revenue: sale.totalRevenue,
    }));

    downloadCSV(csvData, "sales-report");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading sales...</div>
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
        <h1 className="text-2xl font-bold">All Branch Sales</h1>
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="mt-5 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Branch</th>
              <th className="text-left py-3 px-4">Product</th>
              <th className="text-right py-3 px-4">Qty Sold</th>
              <th className="text-right py-3 px-4">Unit Price</th>
              <th className="text-right py-3 px-4">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No sales records found
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4">{formatDate(sale.date)}</td>
                  <td className="py-3 px-4">{sale.shop.name}</td>
                  <td className="py-3 px-4">{sale.product.name}</td>
                  <td className="py-3 px-4 text-right">{formatNumber(sale.soldQuantity)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(sale.unitPrice)}</td>
                  <td className="py-3 px-4 text-right text-green-600 font-medium">
                    {formatCurrency(sale.totalRevenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredSales.length > 0 && (
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td colSpan={3} className="py-3 px-4">
                  Total
                </td>
                <td className="py-3 px-4 text-right">{formatNumber(totals.quantity)}</td>
                <td className="py-3 px-4 text-right">-</td>
                <td className="py-3 px-4 text-right text-green-600">
                  {formatCurrency(totals.revenue)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
