"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Package,
  ShieldCheck,
  Store,
  Tags,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { getApi } from "@/lib/api";
import { isFeaturePermissions, type FeatureKey, type FeaturePermissions } from "@/lib/permissions";

const NAV_ITEMS: { href: string; label: string; feature: FeatureKey; Icon: LucideIcon }[] = [
  { href: "/main/dashboard", label: "Ringkasan", feature: "overview", Icon: LayoutDashboard },
  { href: "/main/store-stock", label: "Stok Toko", feature: "inventory", Icon: Package },
  { href: "/main/variants", label: "Daftar Varian", feature: "inventory", Icon: Tags },
  { href: "/main/branches", label: "Daftar Cabang", feature: "stores", Icon: MapPin },
  { href: "/main/stores", label: "Daftar Toko", feature: "stores", Icon: Store },
  { href: "/main/users", label: "Pengguna", feature: "users", Icon: UsersRound },
  { href: "/main/roles", label: "Akses Peran", feature: "users", Icon: ShieldCheck },
  { href: "/main/activity-logs", label: "Log Aktivitas", feature: "activity", Icon: ClipboardList },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function MainSidebar() {
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<FeaturePermissions | null>(null);

  useEffect(() => {
    let active = true;
    getApi("/auth/me").then(({ data }) => {
      if (!active || !isRecord(data) || !isRecord(data.user)) return;
      if (isFeaturePermissions(data.user.permissions)) setPermissions(data.user.permissions);
    }).catch(() => {
      if (active) setPermissions(null);
    });
    return () => { active = false; };
  }, []);

  return (
    <aside className="dashboard-sidebar" aria-label="Navigasi utama">
      <Link className="dashboard-brand" href="/" aria-label="XL Perfumes beranda">
        <span className="dashboard-brand-mark">XL</span>
        <span>PERFUMES</span>
      </Link>
      <div className="sidebar-label">MANAJEMEN</div>
      <nav className="dashboard-nav" aria-label="Fitur">
        {permissions ? NAV_ITEMS.filter(({ feature }) => permissions[feature]).map(({ href, label, Icon }) => {
          const active = href === pathname;
          return (
            <Link
              className={`dashboard-nav-link${active ? " is-active" : ""}`}
              href={href}
              aria-current={active ? "page" : undefined}
              key={href}
            >
              <span className="nav-icon"><Icon aria-hidden="true" /></span>
              {label}
            </Link>
          );
        }) : <span className="dashboard-nav-loading" role="status">Memuat akses…</span>}
      </nav>
    </aside>
  );
}
