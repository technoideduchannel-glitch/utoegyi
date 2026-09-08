"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  sku: string;
  unitPrice: number;
  costPrice: number;
  lowStockThreshold: number;
}

interface Shop {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  inventorySummary: { totalProducts: number; totalQuantity: number; lowStockCount: number };
  users?: { id: number; email: string; role: string }[];
}

interface ProductForm {
  name: string;
  sku: string;
  unitPrice: number;
  costPrice: number;
  lowStockThreshold: number;
}

interface ShopForm {
  name: string;
  address: string;
  phone: string;
}

export default function SettingsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editProductForm, setEditProductForm] = useState<ProductForm>({
    name: "", sku: "", unitPrice: 0, costPrice: 0, lowStockThreshold: 50,
  });
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductForm>({
    name: "", sku: "", unitPrice: 0, costPrice: 0, lowStockThreshold: 50,
  });

  const [editingShopId, setEditingShopId] = useState<number | null>(null);
  const [editShopForm, setEditShopForm] = useState<ShopForm>({ name: "", address: "", phone: "" });
  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [newShop, setNewShop] = useState<ShopForm & { email: string; password: string }>({ name: "", address: "", phone: "", email: "", password: "" });

  const [submitting, setSubmitting] = useState(false);
  const [newShopCredentials, setNewShopCredentials] = useState<{ email: string; password: string } | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [productsRes, shopsRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/shops"),
      ]);
      const productsJson = await productsRes.json();
      const shopsJson = await shopsRes.json();
      setProducts(productsJson.data ?? []);
      setShops(shopsJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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
      if (!res.ok) throw new Error("Failed to add product");
      setShowAddProductModal(false);
      setNewProduct({ name: "", sku: "", unitPrice: 0, costPrice: 0, lowStockThreshold: 50 });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateProduct(id: number) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editProductForm }),
      });
      if (!res.ok) throw new Error("Failed to update product");
      setEditingProductId(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This will permanently remove all its inventory, sales, transfer, and damage records.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete product");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddShop() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newShop),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add shop");
      setShowAddShopModal(false);
      setNewShop({ name: "", address: "", phone: "", email: "", password: "" });
      setNewShopCredentials(data.data.credentials);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateShop(id: number) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editShopForm }),
      });
      if (!res.ok) throw new Error("Failed to update shop");
      setEditingShopId(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleShopActive(shop: Shop) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shop.id, isActive: !shop.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update shop");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(userId: number) {
    if (!newPassword.trim() || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shops/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setResetPasswordUserId(null);
      setNewPassword("");
      setError(null);
      alert("Password updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteShop(shop: Shop) {
    if (!confirm(`Are you sure you want to delete "${shop.name}"? This will permanently remove all its data including users, inventory, sales, transfers, and damage records.`)) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shop.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete shop");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading settings...</div>
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
      <h1 className="text-2xl font-bold mb-8">Manage Products & Shops</h1>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {newShopCredentials && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-green-800 mb-2">New Shop Created! Login Credentials:</h3>
              <p className="text-sm text-green-700">
                <span className="font-medium">Email:</span> {newShopCredentials.email}
              </p>
              <p className="text-sm text-green-700">
                <span className="font-medium">Password:</span> {newShopCredentials.password}
              </p>
              <p className="text-xs text-green-600 mt-2">Share these credentials with the shop owner. They can log in at /login</p>
            </div>
            <button onClick={() => setNewShopCredentials(null)} className="text-green-600 hover:text-green-800 text-sm font-medium">Dismiss</button>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Products</h2>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add New Product
          </button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">SKU</th>
                <th className="text-right py-3 px-4">Unit Price</th>
                <th className="text-right py-3 px-4">Cost Price</th>
                <th className="text-right py-3 px-4">Low Stock Threshold</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t hover:bg-gray-50">
                  {editingProductId === product.id ? (
                    <>
                      <td className="py-2 px-4">
                        <input type="text" value={editProductForm.name} onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="text" value={editProductForm.sku} onChange={(e) => setEditProductForm({ ...editProductForm, sku: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" value={editProductForm.unitPrice} onChange={(e) => setEditProductForm({ ...editProductForm, unitPrice: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" value={editProductForm.costPrice} onChange={(e) => setEditProductForm({ ...editProductForm, costPrice: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" value={editProductForm.lowStockThreshold} onChange={(e) => setEditProductForm({ ...editProductForm, lowStockThreshold: Number(e.target.value) })} className="w-full border rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleUpdateProduct(product.id)} disabled={submitting} className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50">Save</button>
                          <button onClick={() => setEditingProductId(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 font-medium">{product.name}</td>
                      <td className="py-3 px-4 text-gray-500">{product.sku}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(product.unitPrice)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(product.costPrice)}</td>
                      <td className="py-3 px-4 text-right">{product.lowStockThreshold}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setEditingProductId(product.id); setEditProductForm({ name: product.name, sku: product.sku, unitPrice: product.unitPrice, costPrice: product.costPrice, lowStockThreshold: product.lowStockThreshold }); }} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                          <button onClick={() => handleDeleteProduct(product)} disabled={submitting} className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50">Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shops Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Shops / Branches</h2>
          <button
            onClick={() => setShowAddShopModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add New Shop
          </button>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Address</th>
                <th className="text-left py-3 px-4">Phone</th>
                <th className="text-left py-3 px-4">Login Email</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Total Stock</th>
                <th className="text-right py-3 px-4">Low Stock</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((shop) => (
                <tr key={shop.id} className={`border-t hover:bg-gray-50 ${!shop.isActive ? "bg-gray-50 opacity-60" : ""}`}>
                  {editingShopId === shop.id ? (
                    <>
                      <td className="py-2 px-4">
                        <input type="text" value={editShopForm.name} onChange={(e) => setEditShopForm({ ...editShopForm, name: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="text" value={editShopForm.address} onChange={(e) => setEditShopForm({ ...editShopForm, address: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" placeholder="Optional" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="text" value={editShopForm.phone} onChange={(e) => setEditShopForm({ ...editShopForm, phone: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" placeholder="Optional" />
                      </td>
                      <td className="py-2 px-4 text-gray-500 text-sm">-</td>
                      <td className="py-2 px-4 text-center">-</td>
                      <td className="py-2 px-4 text-right">-</td>
                      <td className="py-2 px-4 text-right">-</td>
                      <td className="py-2 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleUpdateShop(shop.id)} disabled={submitting} className="text-sm bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50">Save</button>
                          <button onClick={() => setEditingShopId(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4 font-medium">{shop.name}</td>
                      <td className="py-3 px-4 text-gray-500">{shop.address || "-"}</td>
                      <td className="py-3 px-4 text-gray-500">{shop.phone || "-"}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{shop.users?.[0]?.email || "-"}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleShopActive(shop)}
                          disabled={submitting}
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${shop.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}
                        >
                          {shop.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">{shop.inventorySummary?.totalQuantity ?? 0}</td>
                      <td className="py-3 px-4 text-right">
                        {(shop.inventorySummary?.lowStockCount ?? 0) > 0 ? (
                          <span className="text-red-600 font-medium">{shop.inventorySummary.lowStockCount}</span>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setEditingShopId(shop.id); setEditShopForm({ name: shop.name, address: shop.address || "", phone: shop.phone || "" }); }} className="text-sm text-blue-600 hover:text-blue-800">Edit</button>
                          {shop.users?.[0] && (
                            <>
                              {resetPasswordUserId === shop.users[0].id ? (
                                <div className="flex items-center gap-1">
                                  <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-28 border rounded px-2 py-1 text-xs" />
                                  <button onClick={() => handleResetPassword(shop.users![0].id)} disabled={submitting} className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 disabled:opacity-50">Set</button>
                                  <button onClick={() => { setResetPasswordUserId(null); setNewPassword(""); }} className="text-xs text-gray-500 hover:text-gray-700">X</button>
                                </div>
                              ) : (
                                <button onClick={() => setResetPasswordUserId(shop.users![0].id)} className="text-xs text-orange-600 hover:text-orange-800">Reset Pwd</button>
                              )}
                            </>
                          )}
                          <button onClick={() => handleDeleteShop(shop)} disabled={submitting} className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50">Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Product</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <input type="text" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                  <input type="number" value={newProduct.unitPrice} onChange={(e) => setNewProduct({ ...newProduct, unitPrice: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input type="number" value={newProduct.costPrice} onChange={(e) => setNewProduct({ ...newProduct, costPrice: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                <input type="number" value={newProduct.lowStockThreshold} onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddProductModal(false)} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddProduct} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "Adding..." : "Add Product"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shop Modal */}
      {showAddShopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Shop</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
                <input type="text" value={newShop.name} onChange={(e) => setNewShop({ ...newShop, name: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Branch 4 - Downtown" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={newShop.address} onChange={(e) => setNewShop({ ...newShop, address: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="text" value={newShop.phone} onChange={(e) => setNewShop({ ...newShop, phone: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. 0967430023" />
                {newShop.phone && !newShop.email && (
                  <p className="text-xs text-blue-600 mt-1">Login email: {newShop.phone.replace(/[^0-9]/g, "")}@utoegyi.com</p>
                )}
              </div>
              <div className="border-t pt-4 mt-4">
                <p className="text-xs text-gray-500 mb-3">Login credentials (leave blank for defaults):</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Email</label>
                    <input type="email" value={newShop.email} onChange={(e) => setNewShop({ ...newShop, email: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="Uses phone if blank" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="text" value={newShop.password} onChange={(e) => setNewShop({ ...newShop, password: e.target.value })} className="w-full border rounded-lg px-3 py-2" placeholder="shop123" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddShopModal(false)} className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddShop} disabled={submitting || !newShop.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? "Adding..." : "Add Shop"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
