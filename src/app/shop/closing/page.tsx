"use client";

import { useEffect, useState } from "react";
import { formatDate, getToday, toLocalDateStr } from "@/lib/utils";

interface ProductItem {
  id: number;
  productId: number;
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

export default function DailyClosing() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [closingRecords, setClosingRecords] = useState<ClosingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [soldQuantity, setSoldQuantity] = useState<number>(0);

  async function fetchAll() {
    try {
      setLoading(true);
      const [inventoryRes, closingRes] = await Promise.all([
        fetch("/api/shop/inventory"),
        fetch("/api/shop/closing"),
      ]);

      const inventoryJson = await inventoryRes.json();
      const closingJson = await closingRes.json();

      setProducts(inventoryJson.data ?? []);
      setClosingRecords(closingJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const today = getToday();
  const todayRecords = closingRecords.filter((r) => toLocalDateStr(r.date) === today);

  const selectedItem = products.find((p) => p.productId === Number(selectedProductId));
  const selectedProductStock = selectedItem?.quantity || 0;
  const remainingStock = selectedProductStock - soldQuantity;
  const exceedsStock = soldQuantity > selectedProductStock;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || soldQuantity <= 0) return;

    if (exceedsStock) {
      setError("Cannot sell more than available stock");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/shop/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: Number(selectedProductId), soldQuantity }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record sale");
      }

      setSuccess("Sale recorded successfully");
      setSelectedProductId("");
      setSoldQuantity(0);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Daily Closing</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Sales</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity Sold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {todayRecords.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                  No sales recorded today
                </td>
              </tr>
            ) : (
              todayRecords.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.soldQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.totalRevenue}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Record a Sale</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="product" className="block text-sm font-medium text-gray-700">
              Select Product
            </label>
            <select
              id="product"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSoldQuantity(0);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            >
              <option value="">-- Select a product --</option>
              {products.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.product.name} ({item.product.sku}) — Stock: {item.quantity}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Sold Quantity
            </label>
            <input
              type="number"
              id="quantity"
              min={1}
              value={soldQuantity || ""}
              onChange={(e) => setSoldQuantity(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
            {selectedItem && soldQuantity > 0 && (
              <p className={`mt-1 text-sm ${exceedsStock ? "text-red-500 font-semibold" : "text-gray-500"}`}>
                {exceedsStock
                  ? `Warning: Exceeds available stock (${selectedProductStock})`
                  : `Remaining stock: ${remainingStock}`}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedProductId || soldQuantity <= 0 || exceedsStock}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Recording..." : "Record Sale"}
          </button>
        </form>
      </div>
    </div>
  );
}
