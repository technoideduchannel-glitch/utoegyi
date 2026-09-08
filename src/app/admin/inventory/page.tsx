"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface InventoryItem {
  id: number;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    sku: string;
    unitPrice: number;
    costPrice: number;
    lowStockThreshold: number;
  };
}

interface NewProduct {
  name: string;
  sku: string;
  unitPrice: number;
  costPrice: number;
  lowStockThreshold: number;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: "",
    sku: "",
    unitPrice: 0,
    costPrice: 0,
    lowStockThreshold: 50,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch("/api/admin/inventory");
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const json = await res.json();
      setInventory(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStock(productId: number) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: editQuantity }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      setEditingId(null);
      fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddProduct() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product");
      setShowAddModal(false);
      setNewProduct({ name: "", sku: "", unitPrice: 0, costPrice: 0, lowStockThreshold: 50 });
      fetchInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading inventory...</div>
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
        <h1 className="text-2xl font-bold">Factory Inventory</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4">Product Name</th>
              <th className="text-left py-3 px-4">SKU</th>
              <th className="text-right py-3 px-4">Quantity</th>
              <th className="text-right py-3 px-4">Low Stock Threshold</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => {
              const isLow = item.quantity < item.product.lowStockThreshold;
              return (
                <tr key={item.id} className={`border-t hover:bg-gray-50 ${isLow ? "bg-red-50" : ""}`}>
                  <td className="py-3 px-4">{item.product.name}</td>
                  <td className="py-3 px-4 text-gray-500">{item.product.sku}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatNumber(item.quantity)}</td>
                  <td className="py-3 px-4 text-right text-gray-500">{formatNumber(item.product.lowStockThreshold)}</td>
                  <td className="py-3 px-4 text-center">
                    {isLow ? (
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {editingId === item.productId ? (
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(Number(e.target.value))}
                          className="w-24 border rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => handleUpdateStock(item.productId)}
                          disabled={submitting}
                          className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.productId);
                          setEditQuantity(item.quantity);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Update Stock
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Product</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    value={newProduct.unitPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, unitPrice: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input
                    type="number"
                    value={newProduct.costPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, costPrice: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                <input
                  type="number"
                  value={newProduct.lowStockThreshold}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, lowStockThreshold: Number(e.target.value) })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Adding..." : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
