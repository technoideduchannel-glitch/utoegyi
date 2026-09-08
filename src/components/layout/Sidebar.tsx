"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/inventory", label: "Factory Inventory", icon: "🏭" },
  { href: "/admin/transfers", label: "Transfers", icon: "🚚" },
  { href: "/admin/sales", label: "Sales", icon: "💰" },
  { href: "/admin/reports", label: "Reports", icon: "📈" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

const shopLinks = [
  { href: "/shop", label: "Dashboard", icon: "📊" },
  { href: "/shop/inventory", label: "Inventory", icon: "📦" },
  { href: "/shop/closing", label: "Daily Closing", icon: "📝" },
  { href: "/shop/transfers", label: "Transfers", icon: "🚚" },
  { href: "/shop/damage", label: "Damage/Loss", icon: "⚠️" },
  { href: "/shop/reports", label: "Reports", icon: "📈" },
];

export default function Sidebar({ role, userName }: { role: string; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = role === "admin" ? adminLinks : shopLinks;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-lg font-bold">U Toe Gyi</h1>
        <p className="text-xs text-gray-400 mt-1 capitalize">
          {role === "admin" ? "🏭 Main Factory" : "🏪 Branch Shop"}
        </p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
              pathname === link.href
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <div className="px-3 py-2 text-sm text-gray-400">{userName}</div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
