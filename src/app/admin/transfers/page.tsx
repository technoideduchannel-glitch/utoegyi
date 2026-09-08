"use client";

import { useEffect, useState } from "react";
import { formatDate, formatNumber } from "@/lib/utils";

interface Transfer {
  id: number;
  productId: number;
  product: { id: number; name: string; sku: string };
  toShopId: number;
  toShop: { id: number; name: string };
  quantity: number;
  status: string;
  createdAt: string;
}

interface Shop {
  id: number;
  name: string;
  inventorySummary: { totalProducts: number; totalQuantity: number; lowStockCount: number };
}

interface InventoryItem {
  id: number;
  productId: number;
  quantity: number;
  product: { id: number; name: string; sku: string };
}

interface TransferForm {
  productId: string;
  toShopId: string;
  quantity: number;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TransferForm>({
    productId: "",
    toShopId: "",
    quantity: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [transfersRes, shopsRes, inventoryRes] = await Promise.all([
          fetch("/api/admin/transfers"),
          fetch("/api/admin/shops"),
          fetch("/api/admin/inventory"),
        ]);

        const transfersJson = await transfersRes.json();
        const shopsJson = await shopsRes.json();
        const inventoryJson = await inventoryRes.json();

        setTransfers(transfersJson.data ?? []);
        setShops(shopsJson.data ?? []);
        setInventory(inventoryJson.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const selectedInvItem = inventory.find((i) => i.productId === Number(form.productId));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!form.productId || !form.toShopId || form.quantity <= 0) {
      setValidationError("Please fill all fields with valid values");
      return;
    }

    if (selectedInvItem && form.quantity > selectedInvItem.quantity) {
      setValidationError(
        `Insufficient stock. Available: ${formatNumber(selectedInvItem.quantity)}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: Number(form.productId), toShopId: Number(form.toShopId), quantity: form.quantity }),
      });
      if (!res.ok) throw new Error("Failed to create transfer");
      setForm({ productId: "", toShopId: "", quantity: 0 });
      const [invJson, transJson] = await Promise.all([
        fetch("/api/admin/inventory").then((r) => r.json()),
        fetch("/api/admin/transfers").then((r) => r.json()),
      ]);
      setInventory(invJson.data ?? []);
      setTransfers(transJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading transfers...</div>
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
      <h1 className="text-2xl font-bold mb-6">Stock Transfers</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">New Transfer</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select Product</option>
              {inventory.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.product.name} (Stock: {formatNumber(item.quantity)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select
              value={form.toShopId}
              onChange={(e) => setForm({ ...form, toShopId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select Branch</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={form.quantity || ""}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Transfer"}
            </button>
          </div>
        </form>
        {validationError && (
          <p className="mt-2 text-sm text-red-600">{validationError}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-lg font-semibold p-6 pb-0">Transfer History</h2>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Product</th>
              <th className="text-left py-3 px-4">To Branch</th>
              <th className="text-right py-3 px-4">Quantity</th>
              <th className="text-center py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No transfers found
                </td>
              </tr>
            ) : (
              transfers.map((transfer) => (
                <tr key={transfer.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4">{formatDate(transfer.createdAt)}</td>
                  <td className="py-3 px-4">{transfer.product.name}</td>
                  <td className="py-3 px-4">{transfer.toShop.name}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatNumber(transfer.quantity)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {transfer.status === "pending" ? (
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                        Pending
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        Accepted
                      </span>
                    )}
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
