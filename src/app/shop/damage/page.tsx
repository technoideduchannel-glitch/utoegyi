"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

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

interface DamageRecord {
  id: number;
  productId: number;
  product: { name: string; sku: string };
  quantity: number;
  reason: string;
  createdAt: string;
}

export default function DamageReport() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [damageRecords, setDamageRecords] = useState<DamageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [reason, setReason] = useState("");

  async function fetchAll() {
    try {
      setLoading(true);
      const [inventoryRes, damageRes] = await Promise.all([
        fetch("/api/shop/inventory"),
        fetch("/api/shop/damage"),
      ]);

      const inventoryJson = await inventoryRes.json();
      const damageJson = await damageRes.json();

      setProducts(inventoryJson.data ?? []);
      setDamageRecords(damageJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const selectedProduct = products.find((p) => p.productId === Number(selectedProductId));
  const exceedsStock = quantity > (selectedProduct?.quantity || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0 || !reason.trim()) return;

    if (exceedsStock) {
      setError("Reported quantity exceeds available stock");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/shop/damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(selectedProductId),
          quantity,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to report damage");
      }

      setSuccess("Damage/loss reported successfully");
      setSelectedProductId("");
      setQuantity(0);
      setReason("");
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
      <h1 className="text-2xl font-bold text-gray-900">Damage / Loss Report</h1>

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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Damage / Loss</h2>
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
                setQuantity(0);
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
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              min={1}
              value={quantity || ""}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
            {selectedProduct && quantity > 0 && exceedsStock && (
              <p className="mt-1 text-sm text-red-500 font-semibold">
                Warning: Exceeds available stock ({selectedProduct.quantity})
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason
            </label>
            <input
              type="text"
              id="reason"
              placeholder='e.g. "Melted", "Damaged"'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedProductId || quantity <= 0 || !reason.trim() || exceedsStock}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Reporting..." : "Report"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Past Damage Reports</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {damageRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No damage reports found
                </td>
              </tr>
            ) : (
              damageRecords.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(record.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {record.product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.reason}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
