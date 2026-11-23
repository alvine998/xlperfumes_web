"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ClipboardList,
  Layers,
  LayoutDashboard,
  MapPin,
  Clipboard,
  Package,
  PackagePlus,
  QrCode,
  Warehouse,
  ShieldCheck,
  Store,
  Printer,
  Tags,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { getApi } from "@/lib/api";
import { isFeaturePermissions, type FeatureKey, type FeaturePermissions } from "@/lib/permissions";

const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; feature: FeatureKey; Icon: LucideIcon }[];
}[] = [
  {
    label: "RINGKASAN",
    items: [
      { href: "/main/dashboard", label: "Ringkasan", feature: "overview", Icon: LayoutDashboard },
    ],
  },
  {
    label: "INVENTARIS",
    items: [
      { href: "/main/store-stock", label: "Stok Toko", feature: "inventory", Icon: Package },
      { href: "/main/warehouse-stock", label: "Stok Gudang", feature: "inventory", Icon: Warehouse },
      { href: "/main/variants", label: "Daftar Varian", feature: "inventory", Icon: Tags },
      { href: "/main/products", label: "Daftar Produk", feature: "inventory", Icon: Clipboard },
      { href: "/main/products/generate", label: "Generate Produk", feature: "inventory", Icon: PackagePlus },
      { href: "/main/product-barcodes", label: "Cetak Barcode Produk", feature: "inventory", Icon: QrCode },
    ],
  },
  {
    label: "JARINGAN TOKO",
    items: [
      { href: "/main/branches", label: "Daftar Cabang", feature: "stores", Icon: MapPin },
      { href: "/main/zones", label: "Daftar Zona", feature: "stores", Icon: Layers },
      { href: "/main/stores", label: "Daftar Toko", feature: "stores", Icon: Store },
      { href: "/main/store-barcodes", label: "Cetak Barcode Toko", feature: "stores", Icon: Printer },
    ],
  },
  {
    label: "ADMINISTRASI",
    items: [
      { href: "/main/users", label: "Pengguna", feature: "users", Icon: UsersRound },
      { href: "/main/roles", label: "Akses Peran", feature: "users", Icon: ShieldCheck },
      { href: "/main/activity-logs", label: "Log Aktivitas", feature: "activity", Icon: ClipboardList },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function MainSidebar() {
  return (
    <Suspense fallback={<MainSidebarLoading />}>
      <MainSidebarContent />
    </Suspense>
  );
}

function MainSidebarContent() {
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
      <nav className="dashboard-nav" aria-label="Fitur">
        {permissions ? NAV_GROUPS.map(({ label: groupLabel, items }) => {
          const visibleItems = items.filter(({ feature }) => permissions[feature]);
          if (visibleItems.length === 0) return null;

          return (
            <div className="dashboard-nav-group" role="group" aria-label={groupLabel} key={groupLabel}>
              <span className="dashboard-nav-group-label" aria-hidden="true">{groupLabel}</span>
              {visibleItems.map(({ href, label, Icon }) => {
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
              })}
            </div>
          );
        }) : <SidebarLoadingStatus />}
      </nav>
    </aside>
  );
}

function MainSidebarLoading() {
  return (
    <aside className="dashboard-sidebar" aria-label="Navigasi utama">
      <Link className="dashboard-brand" href="/" aria-label="XL Perfumes beranda">
        <span className="dashboard-brand-mark">XL</span>
        <span>PERFUMES</span>
      </Link>
      <nav className="dashboard-nav" aria-label="Fitur">
        <SidebarLoadingStatus />
      </nav>
    </aside>
  );
}

function SidebarLoadingStatus() {
  return <span className="dashboard-nav-loading" role="status">Memuat akses…</span>;
}
